import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  canAssignRole,
  canManagePeople,
  hasKitchenStaffPowers,
  isRole,
} from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { db, users } from "@/lib/db";
import type { Role } from "@/lib/db/schema";

const updateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "cook", "viewer"]),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || !canManagePeople(user.role)) {
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
    .orderBy(users.email);

  return NextResponse.json({
    users: rows.map((row: { id: string; name: string | null; email: string; role: string; image: string | null }) => ({
      ...row,
      role: (isRole(row.role) ? row.role : "viewer") as Role,
    })),
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManagePeople(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, role } = parsed.data;

    const existing = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const target = existing[0] as { id: string; role: string } | undefined;
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const currentRole = (isRole(target.role) ? target.role : "viewer") as Role;

    if (!canAssignRole(user.role, role, currentRole)) {
      return NextResponse.json(
        {
          error:
            "Only the site owner can assign or change the Owner role.",
        },
        { status: 403 }
      );
    }

    if (
      userId === user.id &&
      hasKitchenStaffPowers(user.role) &&
      !hasKitchenStaffPowers(role)
    ) {
      return NextResponse.json(
        { error: "You can’t demote yourself from owner/admin." },
        { status: 400 }
      );
    }

    const updated = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!updated.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updated[0] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
