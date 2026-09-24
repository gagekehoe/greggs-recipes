import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth/password";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { ensureOwnerRole } from "@/lib/auth/owner-bootstrap";
import { db, isDatabaseConfigured, sessions, users } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable." },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Enter a valid reset link and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const passwordError = validatePassword(parsed.data.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const valid = await consumePasswordResetToken(email, parsed.data.token);
  if (!valid) {
    return NextResponse.json(
      {
        error:
          "This reset link is invalid or expired. Request a new one from Forgot password.",
      },
      { status: 400 }
    );
  }

  const existing = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing[0]) {
    return NextResponse.json(
      { error: "No account found for that email." },
      { status: 404 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const passwordUpdatedAt = new Date();
  await db
    .update(users)
    .set({ passwordHash, emailVerified: passwordUpdatedAt, passwordUpdatedAt })
    .where(eq(users.id, existing[0].id));

  // Defense in depth: drop any adapter DB sessions (JWT strategy is primary).
  await db.delete(sessions).where(eq(sessions.userId, existing[0].id));

  // Inbox proven via reset token — promote ADMIN_EMAIL to Owner if applicable.
  await ensureOwnerRole(existing[0].id, existing[0].email);

  return NextResponse.json({ ok: true });
}
