import type { Role } from "@/lib/db/schema";
import { ROLES } from "@/lib/db/schema";

export { ROLES, type Role };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Owner and admin share elevated kitchen powers: People, any public recipe,
 * moderate reviews/comments. Owner is the site identity (Gregg); admin is staff.
 */
export function hasKitchenStaffPowers(role: Role | undefined | null): boolean {
  return role === "owner" || role === "admin";
}

export function canWriteRecipes(role: Role | undefined | null): boolean {
  return role === "owner" || role === "admin" || role === "cook";
}

export function canManagePeople(role: Role | undefined | null): boolean {
  return hasKitchenStaffPowers(role);
}

/**
 * Who may assign a role on People.
 * Only an existing **owner** may grant or change the `owner` role.
 * Admins may assign viewer / cook / admin.
 */
export function canAssignRole(
  actorRole: Role | undefined | null,
  nextRole: Role,
  currentTargetRole?: Role | null
): boolean {
  if (!actorRole || !canManagePeople(actorRole)) return false;
  if (nextRole === "owner" || currentTargetRole === "owner") {
    return actorRole === "owner";
  }
  return true;
}

export function canEditRecipe(
  role: Role | undefined | null,
  authorId: string | undefined | null,
  userId: string | undefined | null
): boolean {
  if (!role || !userId) return false;
  if (hasKitchenStaffPowers(role)) return true;
  if (role === "cook" && authorId && authorId === userId) return true;
  return false;
}

/**
 * Optional share context for private recipes.
 * User grants set `sharedWithUser`; role grants match `viewerRole` against `sharedRoles`.
 * There is no “everyone” grant — public visibility remains the only global option.
 */
export type RecipeViewAccess = {
  sharedWithUser?: boolean;
  viewerRole?: Role | null;
  sharedRoles?: readonly Role[];
};

/**
 * Public recipes are visible to everyone.
 * Private recipes are visible to the author and selective share recipients
 * (named users and/or roles). Staff do not get an automatic private override.
 */
export function canViewRecipe(
  recipe: { isPrivate?: boolean; authorId: string },
  userId: string | undefined | null,
  access?: RecipeViewAccess
): boolean {
  if (!recipe.isPrivate) return true;
  if (userId && recipe.authorId === userId) return true;
  if (!userId) return false;
  if (access?.sharedWithUser) return true;
  if (
    access?.viewerRole &&
    access.sharedRoles?.includes(access.viewerRole)
  ) {
    return true;
  }
  return false;
}

/**
 * Edit/delete: staff may manage public recipes from anyone, but private recipes
 * stay author-only (same identity as My recipes ownership).
 */
export function canManageRecipe(
  role: Role | undefined | null,
  recipe: { isPrivate?: boolean; authorId: string },
  userId: string | undefined | null
): boolean {
  if (recipe.isPrivate) {
    return Boolean(
      userId &&
        recipe.authorId === userId &&
        canWriteRecipes(role)
    );
  }
  return canEditRecipe(role, recipe.authorId, userId);
}

/** Bootstrap email for the site owner (Gregg). Env name kept as ADMIN_EMAIL. */
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "gagekehoe17@gmail.com").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}

/**
 * ADMIN_EMAIL may become Owner only after the inbox is proven (`emailVerified`).
 * Existing `owner` rows stay owner. Unverified ADMIN_EMAIL keeps the stored role
 * (register always inserts `viewer`).
 */
export function roleWithVerifiedOwnerBootstrap(
  email: string | null | undefined,
  role: Role,
  emailVerified: Date | null | undefined
): Role {
  if (role === "owner") return "owner";
  if (isAdminEmail(email) && emailVerified) return "owner";
  return role;
}

/** Site owner role (Gregg). Badge and public name — not email heuristics. */
export function isSiteOwner(user: { role?: string | null }): boolean {
  return user.role === "owner";
}

/**
 * Public privilege badge from **role** (not email).
 * - owner → Owner (Gregg)
 * - admin → Admin
 * - cook → Authorized cook
 * - viewer → none
 */
export type AuthorPrivilege = "owner" | "admin" | "authorized_cook" | null;

export function authorPrivilege(user: {
  role?: string | null;
}): AuthorPrivilege {
  if (user.role === "owner") return "owner";
  if (user.role === "admin") return "admin";
  if (user.role === "cook") return "authorized_cook";
  return null;
}
