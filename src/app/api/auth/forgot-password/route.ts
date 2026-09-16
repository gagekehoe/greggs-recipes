import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/password";
import { issuePasswordReset } from "@/lib/auth/password-reset";
import { db, isDatabaseConfigured, users } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Always returns a generic success message so we don't reveal whether an email
 * is registered. Issues a reset when the account exists.
 */
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
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    try {
      await issuePasswordReset(email);
    } catch (error) {
      console.error("[auth] password reset email failed:", error);
      return NextResponse.json(
        { error: "Could not send the reset email. Try again shortly." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "If that email is on Gregg's Recipes, you'll get a reset link shortly.",
  });
}
