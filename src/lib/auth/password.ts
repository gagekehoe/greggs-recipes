import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Case-insensitive match for `user.email`.
 * Pass `normalizeEmail()` output. Login/register/reset always query the
 * lowercased form, but Auth.js/magic-link rows may store mixed-case emails;
 * a case-sensitive `eq` misses those accounts (lockout + duplicate signup).
 *
 * Callers that mutate or authenticate must handle **every** matching row:
 * `user.email` is unique only as stored, so mixed-case + lowercase duplicates
 * can both exist. `.limit(1)` is non-deterministic in that case.
 *
 * Password reset must **canonicalize** to one survivor (see
 * `pickCanonicalEmailSurvivor`) — never leave the same hash on every match.
 */
export function sqlEmailEqualsNormalized(
  emailColumn: object,
  normalizedEmail: string
) {
  return sql`lower(${emailColumn}) = ${normalizedEmail}`;
}

export type EmailCaseMatchRow = {
  id: string;
  email: string;
  passwordHash: string | null;
};

/**
 * Pick the single account that keeps (or receives) the password after a
 * multi-row case-variant reset.
 *
 * Rule: prefer any row that already has a `passwordHash` (the live password
 * account, not a leftover Auth.js/passwordless twin). Among that set — or
 * among all rows when none have a hash — choose the lexicographically
 * smallest `id` for a stable, deterministic survivor.
 */
export function pickCanonicalEmailSurvivor<T extends EmailCaseMatchRow>(
  rows: readonly T[]
): T {
  if (rows.length === 0) {
    throw new Error("pickCanonicalEmailSurvivor requires at least one row");
  }
  const withPassword = rows.filter((row) => row.passwordHash != null);
  const candidates = withPassword.length > 0 ? withPassword : [...rows];
  return [...candidates].sort((a, b) => a.id.localeCompare(b.id))[0]!;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) {
    return "Password is too long.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
