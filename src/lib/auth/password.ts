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
 */
export function sqlEmailEqualsNormalized(
  emailColumn: object,
  normalizedEmail: string
) {
  return sql`lower(${emailColumn}) = ${normalizedEmail}`;
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
