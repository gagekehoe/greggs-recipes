import { NextResponse } from "next/server";
import { canWriteRecipes, isRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { db, isDatabaseConfigured, users } from "@/lib/db";
import type { Role } from "@/lib/db/schema";

/**
 * Lightweight people directory for cooks managing private-recipe shares.
 * Staff People admin (`/api/users`) stays separate — this does not allow role edits.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !canWriteRecipes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Directory needs a database. Configure DATABASE_URL (Neon) to look up people.",
        users: [],
      },
      { status: 503 }
    );
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .orderBy(users.email);

  return NextResponse.json({
    users: (
      rows as Array<{
        id: string;
        name: string | null;
        email: string;
        role: string;
      }>
    ).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: (isRole(row.role) ? row.role : "viewer") as Role,
    })),
  });
}
