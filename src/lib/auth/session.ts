import { auth } from "@/auth";
import type { Role } from "@/lib/db/schema";

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
