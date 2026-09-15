import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { isDisplayNameSet } from "@/lib/auth/profile";
import { db } from "@/lib/db";
import { users, type Role } from "@/lib/db/schema";

export type SessionUser = {
  id: string;
  email: string | null | undefined;
  name: string | null | undefined;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role || "viewer",
  };
}

/** Fresh display name from SQLite (session cache can lag right after profile save). */
export async function getUserDisplayName(
  userId: string
): Promise<string | null> {
  const rows = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const name = rows[0]?.name ?? null;
  return isDisplayNameSet(name) ? name!.trim() : null;
}
