import { eq } from "drizzle-orm";
import { db, isDatabaseConfigured, users } from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import { roleWithVerifiedOwnerBootstrap } from "@/lib/auth/roles";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";

export type CredentialsUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  /** Captured into the JWT as `pwdAt` so resets can invalidate older sessions. */
  passwordUpdatedAt: Date | null;
};

/**
 * Auth.js Credentials `authorize` implementation.
 * Returns null for unknown email / wrong password / legacy no-password accounts
 * (same safe failure so callers never distinguish those cases).
 */
export async function authorizeCredentials(
  credentials:
    | Partial<Record<"email" | "password", unknown>>
    | undefined
): Promise<CredentialsUser | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("Sign-in is temporarily unavailable.");
  }

  const emailRaw =
    typeof credentials?.email === "string" ? credentials.email : "";
  const password =
    typeof credentials?.password === "string" ? credentials.password : "";
  const email = normalizeEmail(emailRaw);

  if (!email || !password) {
    return null;
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      passwordHash: users.passwordHash,
      passwordUpdatedAt: users.passwordUpdatedAt,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const row = rows[0] as
    | {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        role: Role;
        passwordHash: string | null;
        passwordUpdatedAt: Date | null;
        emailVerified: Date | null;
      }
    | undefined;

  if (!row?.passwordHash) {
    // No account, or legacy magic-link account without a password yet.
    return null;
  }

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;

  const role: Role = roleWithVerifiedOwnerBootstrap(
    row.email,
    row.role,
    row.emailVerified
  );
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role,
    passwordUpdatedAt: row.passwordUpdatedAt ?? null,
  };
}
