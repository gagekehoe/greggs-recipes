import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validatePassword,
} from "@/lib/auth/password";
import { isAdminEmail } from "@/lib/auth/roles";
import {
  migrateBootstrapAdminToOwner,
} from "@/lib/auth/owner-bootstrap";
import { db, isDatabaseConfigured, users } from "@/lib/db";
import type { Role } from "@/lib/db/schema";

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
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const row = existing[0] as
    | { id: string; passwordHash: string | null }
    | undefined;

  if (row?.passwordHash) {
    return NextResponse.json(
      { error: "That email already has an account. Sign in instead." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  if (row) {
    // Former magic-link account: attach a password so they can sign in.
    await db
      .update(users)
      .set({ passwordHash, emailVerified: new Date() })
      .where(eq(users.id, row.id));
  } else {
    await migrateBootstrapAdminToOwner();
    const role: Role = isAdminEmail(email) ? "owner" : "viewer";
    await db.insert(users).values({
      email,
      passwordHash,
      role,
      emailVerified: new Date(),
    });
  }

  return NextResponse.json({ ok: true });
}
