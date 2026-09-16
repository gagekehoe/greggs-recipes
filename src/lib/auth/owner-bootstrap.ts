import { and, eq, sql } from "drizzle-orm";
import { getAdminEmail, isAdminEmail } from "@/lib/auth/roles";
import { db, isDatabaseConfigured, users } from "@/lib/db";

/**
 * Promote the ADMIN_EMAIL account from legacy `admin` → `owner`.
 * Safe to call repeatedly (idempotent). Other admins are left as `admin`.
 */
export async function migrateBootstrapAdminToOwner(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const email = getAdminEmail();
  try {
    await db
      .update(users)
      .set({ role: "owner" })
      .where(
        and(
          sql`lower(${users.email}) = ${email}`,
          eq(users.role, "admin")
        )
      );
  } catch (error) {
    console.error("[auth] migrateBootstrapAdminToOwner failed:", error);
  }
}

/** Ensure ADMIN_EMAIL always holds the owner role (bootstrap + sign-in). */
export async function ensureOwnerRole(
  userId: string,
  email: string | null | undefined
): Promise<void> {
  if (!isAdminEmail(email) || !isDatabaseConfigured()) return;
  try {
    await db.update(users).set({ role: "owner" }).where(eq(users.id, userId));
  } catch (error) {
    console.error("[auth] ensureOwnerRole failed:", error);
  }
}
