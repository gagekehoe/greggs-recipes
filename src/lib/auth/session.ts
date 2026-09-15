import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { isDisplayNameSet } from "@/lib/auth/profile";
import { db, isDatabaseConfigured, users } from "@/lib/db";
import type { Role } from "@/lib/db/schema";

export type SessionUser = {
  id: string;
  email: string | null | undefined;
  name: string | null | undefined;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role || "viewer",
    };
  } catch (error) {
    // Let Next.js static analysis / dynamic rendering signals propagate.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }
    console.error("[auth] getSessionUser failed:", error);
    return null;
  }
}

/** Fresh display name from the active DB (session cache can lag right after profile save). */
export async function getUserDisplayName(
  userId: string
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const rows = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const name = rows[0]?.name ?? null;
  return isDisplayNameSet(name) ? name!.trim() : null;
}
