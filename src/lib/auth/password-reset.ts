import { createHash, randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, verificationTokens } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth/password";
import { sendPasswordResetEmail } from "@/lib/auth/send-password-reset";

const RESET_PREFIX = "password-reset:";
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function resetIdentifier(email: string): string {
  return `${RESET_PREFIX}${normalizeEmail(email)}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function siteBaseUrl(): string {
  const raw =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://127.0.0.1:43127";
  return raw.replace(/\/$/, "");
}

/** Create a one-time reset token and email the link (or print it locally). */
export async function issuePasswordReset(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const identifier = resetIdentifier(normalized);

  // Drop any prior unused tokens for this email.
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, identifier));

  const rawToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + RESET_TTL_MS);

  await db.insert(verificationTokens).values({
    identifier,
    token: hashToken(rawToken),
    expires,
  });

  const url = `${siteBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(normalized)}`;
  await sendPasswordResetEmail({ email: normalized, url });
}

export async function consumePasswordResetToken(
  email: string,
  rawToken: string
): Promise<boolean> {
  const identifier = resetIdentifier(email);
  const hashed = hashToken(rawToken);
  const now = new Date();

  const rows = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, hashed),
        gt(verificationTokens.expires, now)
      )
    )
    .limit(1);

  if (!rows[0]) return false;

  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, hashed)
      )
    );

  return true;
}
