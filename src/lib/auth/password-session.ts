/**
 * Auth.js JWT session invalidation after password changes.
 *
 * JWTs cannot be revoked server-side by default. We stamp `pwdAt` on the token
 * at sign-in (ms from `user.passwordUpdatedAt`, or 0) and reject any JWT whose
 * stamp is older than the DB value — set on password reset (and register).
 */

/** Milliseconds stamp stored on the JWT at issue / refresh-from-login time. */
export function passwordStampFromUser(
  passwordUpdatedAt: Date | null | undefined
): number {
  return passwordUpdatedAt ? passwordUpdatedAt.getTime() : 0;
}

/**
 * True when the JWT was issued against an older password stamp and must be
 * rejected (e.g. after Forgot password / reset).
 */
export function isPasswordSessionStale(
  tokenPwdAt: number | undefined,
  passwordUpdatedAt: Date | null | undefined
): boolean {
  const current = passwordStampFromUser(passwordUpdatedAt);
  const issued = typeof tokenPwdAt === "number" && Number.isFinite(tokenPwdAt)
    ? tokenPwdAt
    : 0;
  return current > issued;
}
