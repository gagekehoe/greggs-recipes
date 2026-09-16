"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canAssignRole } from "@/lib/auth/roles";
import type { Role } from "@/lib/db/schema";

export type PeopleRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  cook: "Authorized cook",
  admin: "Admin",
  owner: "Owner (Gregg)",
};

const ASSIGNABLE: Role[] = ["viewer", "cook", "admin", "owner"];

export function PeopleManager({
  initialUsers,
  currentUserId,
  currentUserRole,
}: {
  initialUsers: PeopleRow[];
  currentUserId: string;
  currentUserRole: Role;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function setRole(userId: string, role: Role) {
    setSavingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update role");
        return;
      }
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u))
      );
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          People
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
          Roles drive badges and permissions.{" "}
          <strong>Authorized cook</strong> can publish. <strong>Admin</strong>{" "}
          can manage people and public recipes. <strong>Owner</strong> is Gregg
          (same powers as admin, Owner badge) — only an existing owner can
          assign Owner.{" "}
          <code className="text-[var(--ink)]">ADMIN_EMAIL</code> bootstraps to
          Owner on sign-in.
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-[var(--ink-muted)]">
          No signed-in users yet. After someone creates an account, they appear
          here.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {rows.map((person) => {
            const options = ASSIGNABLE.filter((role) =>
              canAssignRole(currentUserRole, role, person.role)
            );
            // Always show current role even if actor can't re-assign it (e.g. admin viewing owner)
            const selectOptions =
              options.includes(person.role) || options.length === 0
                ? options.length
                  ? options
                  : [person.role]
                : [person.role, ...options];
            const locked =
              person.role === "owner" && currentUserRole !== "owner";

            return (
              <li
                key={person.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">
                    {person.name || person.email}
                    {person.id === currentUserId ? (
                      <span className="ml-2 text-xs uppercase tracking-wider text-[var(--ink-soft)]">
                        you
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {person.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={person.role}
                    disabled={savingId === person.id || locked}
                    onValueChange={(value) => {
                      if (value) setRole(person.id, value as Role);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue>{ROLE_LABELS[person.role]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {selectOptions.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {savingId === person.id ? (
                    <span className="text-xs text-[var(--ink-soft)]">
                      Saving…
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="invisible"
                      tabIndex={-1}
                    >
                      —
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
