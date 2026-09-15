import Link from "next/link";
import { redirect } from "next/navigation";
import { PeopleManager } from "@/components/auth/people-manager";
import { canManagePeople, isRole } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { db, users } from "@/lib/db";
import type { Role } from "@/lib/db/schema";

export const metadata = {
  title: "People",
};

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?callbackUrl=/people");
  }
  if (!canManagePeople(user.role)) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-28 md:px-8 md:py-32">
        <h1 className="font-display text-4xl text-[var(--ink)]">People</h1>
        <p className="mt-4 text-[var(--ink-muted)]">
          Only admins can manage roles.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
        >
          Back home
        </Link>
      </div>
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

  return (
    <div className="mx-auto max-w-3xl px-5 py-28 md:px-8 md:py-32">
      <PeopleManager
        currentUserId={user.id}
        initialUsers={rows.map((row: { id: string; name: string | null; email: string; role: string }) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: (isRole(row.role) ? row.role : "viewer") as Role,
        }))}
      />
    </div>
  );
}
