import { inArray } from "drizzle-orm";
import { publicAuthorLabel, recipeAuthorLabel } from "@/lib/auth/profile";
import {
  authorPrivilege,
  type AuthorPrivilege,
} from "@/lib/auth/roles";
import { db, isDatabaseConfigured, users } from "@/lib/db";

/**
 * Seed / local kitchen recipes use synthetic author ids before a real Auth.js
 * user exists. Treat those as Gregg (Owner) so Browse still shows the badge.
 */
function seedKitchenOwnerPrivilege(authorId: string): AuthorPrivilege {
  if (authorId === "admin" || authorId === "system") return "owner";
  return null;
}

/** Batch-resolve privilege badges for recipe authors (by Auth.js user id). */
export async function getAuthorPrivilegesByUserIds(
  userIds: string[]
): Promise<Record<string, AuthorPrivilege>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const result: Record<string, AuthorPrivilege> = {};
  for (const id of unique) {
    result[id] = seedKitchenOwnerPrivilege(id);
  }
  if (unique.length === 0 || !isDatabaseConfigured()) return result;

  try {
    const rows = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, unique));

    for (const row of rows as {
      id: string;
      role: string | null;
      email: string | null;
    }[]) {
      result[row.id] = authorPrivilege({
        role: row.role,
        email: row.email,
      });
    }
    return result;
  } catch (error) {
    console.error("[auth] getAuthorPrivilegesByUserIds failed:", error);
    return result;
  }
}

export type RecipeAuthorCredit = {
  label: string;
  privilege: AuthorPrivilege;
};

/** Public “By …” label + privilege for a recipe author snapshot. */
export function resolveRecipeAuthorCredit(
  recipe: { authorId: string; authorName: string },
  privilegeByUserId: Record<string, AuthorPrivilege>
): RecipeAuthorCredit {
  const privilege =
    privilegeByUserId[recipe.authorId] ??
    seedKitchenOwnerPrivilege(recipe.authorId);
  const label =
    privilege === "owner"
      ? publicAuthorLabel(recipe.authorName, undefined, { isSiteOwner: true })
      : recipeAuthorLabel(recipe.authorName);
  return { label, privilege };
}
