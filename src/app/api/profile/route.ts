import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  validateDisplayNameInput,
} from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { db, users } from "@/lib/db";

const updateSchema = z.object({
  name: z.string().min(DISPLAY_NAME_MIN).max(DISPLAY_NAME_MAX),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      image: row.image,
      needsSetup: !row.name || row.name.trim().length < DISPLAY_NAME_MIN,
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to update your profile." },
      { status: 401 }
    );
  }

  try {
    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      const checked = validateDisplayNameInput(json?.name);
      return NextResponse.json(
        {
          error: checked.ok ? "Invalid profile" : checked.error,
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const checked = validateDisplayNameInput(parsed.data.name);
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({ name: checked.name })
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        image: users.image,
      });

    if (!updated.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updated[0] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
