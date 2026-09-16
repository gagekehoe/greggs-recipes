import { and, eq, isNotNull, or } from "drizzle-orm";
import type { RecipeViewAccess } from "@/lib/auth/roles";
import { isRole } from "@/lib/auth/roles";
import {
  db,
  isDatabaseConfigured,
  recipeShares,
  users,
} from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import { ROLES } from "@/lib/db/schema";

export type RecipeShareGrant = {
  id: string;
  recipeId: string;
  userId: string | null;
  role: Role | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function mapShareRow(row: {
  id: string;
  recipeId: string;
  userId: string | null;
  role: string | null;
  createdAt: unknown;
  userName?: string | null;
  userEmail?: string | null;
}): RecipeShareGrant {
  return {
    id: row.id,
    recipeId: row.recipeId,
    userId: row.userId,
    role: row.role && isRole(row.role) ? row.role : null,
    createdAt: toIso(row.createdAt),
    userName: row.userName ?? null,
    userEmail: row.userEmail ?? null,
  };
}

/** Roles that may be granted a private-recipe share (never a synthetic “everyone”). */
export const SHAREABLE_ROLES: readonly Role[] = ROLES;

export function isShareableRole(value: unknown): value is Role {
  return isRole(value);
}

export async function listSharesForRecipe(
  recipeId: string
): Promise<RecipeShareGrant[]> {
  if (!isDatabaseConfigured()) return [];

  const rows = await db
    .select({
      id: recipeShares.id,
      recipeId: recipeShares.recipeId,
      userId: recipeShares.userId,
      role: recipeShares.role,
      createdAt: recipeShares.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(recipeShares)
    .leftJoin(users, eq(recipeShares.userId, users.id))
    .where(eq(recipeShares.recipeId, recipeId));

  return (rows as Array<{
    id: string;
    recipeId: string;
    userId: string | null;
    role: string | null;
    createdAt: unknown;
    userName: string | null;
    userEmail: string | null;
  }>).map(mapShareRow);
}

export async function getRecipeShareAccess(
  recipeId: string,
  userId: string,
  viewerRole?: Role | null
): Promise<RecipeViewAccess> {
  if (!isDatabaseConfigured()) {
    return {
      sharedWithUser: false,
      viewerRole: viewerRole ?? null,
      sharedRoles: [],
    };
  }

  const rows = await db
    .select({
      userId: recipeShares.userId,
      role: recipeShares.role,
    })
    .from(recipeShares)
    .where(eq(recipeShares.recipeId, recipeId));

  let sharedWithUser = false;
  const sharedRoles: Role[] = [];
  for (const row of rows as Array<{ userId: string | null; role: string | null }>) {
    if (row.userId && row.userId === userId) {
      sharedWithUser = true;
    }
    if (row.role && isRole(row.role) && !sharedRoles.includes(row.role)) {
      sharedRoles.push(row.role);
    }
  }

  return {
    sharedWithUser,
    viewerRole: viewerRole ?? null,
    sharedRoles,
  };
}

/**
 * Recipe ids the viewer can open via user or role share grants.
 * Used by Browse / My recipes listing filters.
 */
export async function listSharedRecipeIdsForViewer(
  userId: string,
  viewerRole?: Role | null
): Promise<Set<string>> {
  if (!isDatabaseConfigured()) return new Set();

  const roleClause =
    viewerRole && isRole(viewerRole)
      ? eq(recipeShares.role, viewerRole)
      : undefined;

  const rows = await db
    .select({ recipeId: recipeShares.recipeId })
    .from(recipeShares)
    .where(
      roleClause
        ? or(eq(recipeShares.userId, userId), roleClause)
        : eq(recipeShares.userId, userId)
    );

  return new Set(
    (rows as Array<{ recipeId: string }>).map((row) => row.recipeId)
  );
}

export async function addUserShare(
  recipeId: string,
  userId: string
): Promise<RecipeShareGrant> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured.");
  }

  const existingUser = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const target = existingUser[0] as
    | { id: string; name: string | null; email: string }
    | undefined;
  if (!target) {
    throw new Error("User not found");
  }

  const inserted = await db
    .insert(recipeShares)
    .values({
      recipeId,
      userId,
      role: null,
    })
    .returning({
      id: recipeShares.id,
      recipeId: recipeShares.recipeId,
      userId: recipeShares.userId,
      role: recipeShares.role,
      createdAt: recipeShares.createdAt,
    });

  const row = inserted[0] as {
    id: string;
    recipeId: string;
    userId: string | null;
    role: string | null;
    createdAt: unknown;
  };

  return mapShareRow({
    ...row,
    userName: target.name,
    userEmail: target.email,
  });
}

export async function addRoleShare(
  recipeId: string,
  role: Role
): Promise<RecipeShareGrant> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured.");
  }
  if (!isShareableRole(role)) {
    throw new Error("Invalid role");
  }

  const inserted = await db
    .insert(recipeShares)
    .values({
      recipeId,
      userId: null,
      role,
    })
    .returning({
      id: recipeShares.id,
      recipeId: recipeShares.recipeId,
      userId: recipeShares.userId,
      role: recipeShares.role,
      createdAt: recipeShares.createdAt,
    });

  const row = inserted[0] as {
    id: string;
    recipeId: string;
    userId: string | null;
    role: string | null;
    createdAt: unknown;
  };

  return mapShareRow(row);
}

export async function removeShare(
  shareId: string,
  recipeId?: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const deleted = recipeId
    ? await db
        .delete(recipeShares)
        .where(
          and(eq(recipeShares.id, shareId), eq(recipeShares.recipeId, recipeId))
        )
        .returning({ id: recipeShares.id })
    : await db
        .delete(recipeShares)
        .where(eq(recipeShares.id, shareId))
        .returning({ id: recipeShares.id });

  return (deleted as Array<{ id: string }>).length > 0;
}

/** Drop all shares for a recipe (e.g. after delete — cascade usually handles this). */
export async function clearSharesForRecipe(recipeId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await db.delete(recipeShares).where(eq(recipeShares.recipeId, recipeId));
}

/** True when any role-based share rows exist (for diagnostics / tests). */
export async function countRoleShares(recipeId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const rows = await db
    .select({ id: recipeShares.id })
    .from(recipeShares)
    .where(
      and(eq(recipeShares.recipeId, recipeId), isNotNull(recipeShares.role))
    );
  return (rows as Array<{ id: string }>).length;
}
