import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth/password";
import { migrateBootstrapAdminToOwner } from "@/lib/auth/owner-bootstrap";
import { db, isDatabaseConfigured, users } from "@/lib/db";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Sign-up is temporarily unavailable." },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Enter a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const passwordError = validatePassword(parsed.data.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Any existing row is already an account — including legacy magic-link users
  // with a null passwordHash. Claiming those via register is account takeover;
  // they must prove inbox access through Forgot password.
  if (existing[0]) {
    return NextResponse.json(
      { error: "That email already has an account. Sign in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await migrateBootstrapAdminToOwner();
  // Never grant Owner at signup, and never mark emailVerified until the inbox
  // is proven (forgot/reset). ADMIN_EMAIL is promoted only after verification.
  await db.insert(users).values({
    email,
    passwordHash,
    role: "viewer",
  });

  return NextResponse.json({ ok: true });
}
