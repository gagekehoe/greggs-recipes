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

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "gagekehoe17@gmail.com").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}
