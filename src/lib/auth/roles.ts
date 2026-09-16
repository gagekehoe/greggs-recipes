import type { Role } from "@/lib/db/schema";
import { ROLES } from "@/lib/db/schema";

export { ROLES, type Role };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function canWriteRecipes(role: Role | undefined | null): boolean {
  return role === "admin" || role === "cook";
}

export function canManagePeople(role: Role | undefined | null): boolean {
  return role === "admin";
}

export function canEditRecipe(
  role: Role | undefined | null,
  authorId: string | undefined | null,
  userId: string | undefined | null
): boolean {
  if (!role || !userId) return false;
  if (role === "admin") return true;
  if (role === "cook" && authorId && authorId === userId) return true;
  return false;
}

/** Public recipes are visible to everyone; private ones only to the author (by user id). */
export function canViewRecipe(
  recipe: { isPrivate?: boolean; authorId: string },
  userId: string | undefined | null
): boolean {
  if (!recipe.isPrivate) return true;
  return Boolean(userId && recipe.authorId === userId);
}

/**
 * Edit/delete: admins may manage public recipes from anyone, but private recipes
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

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "gagekehoe17@gmail.com").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}

/** Site owner (Gregg): admin role and/or ADMIN_EMAIL. Never expose the real account name. */
export function isSiteOwner(user: {
  role?: string | null;
  email?: string | null;
}): boolean {
  return user.role === "admin" || isAdminEmail(user.email);
}

/**
 * Public privilege badge for reviews/comments.
 * - owner → Gregg (ADMIN_EMAIL / admin role)
 * - authorized_cook → cook role (granted on People)
 * Email is used only server-side for matching; never sent to clients.
 */
export type AuthorPrivilege = "owner" | "authorized_cook" | null;

export function authorPrivilege(user: {
  role?: string | null;
  email?: string | null;
}): AuthorPrivilege {
  if (isSiteOwner(user)) return "owner";
  if (user.role === "cook") return "authorized_cook";
  return null;
}
