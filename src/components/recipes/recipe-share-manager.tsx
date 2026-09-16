"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/db/schema";
import type { RecipeShareGrant } from "@/lib/recipes/shares";

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  cook: "Authorized cook",
  admin: "Admin",
  owner: "Owner (Gregg)",
};

type DirectoryUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

type Props = {
  recipeId: string;
  recipeTitle: string;
  /** Author is never listed as a share target. */
  authorId: string;
  /** Compact layout for list rows vs full panel on detail/edit. */
  compact?: boolean;
};

function shareLabel(share: RecipeShareGrant): string {
  if (share.role) {
    return `Everyone with role: ${ROLE_LABELS[share.role]}`;
  }
  const name = share.userName?.trim();
  if (name) {
    return share.userEmail ? `${name} (${share.userEmail})` : name;
  }
  return share.userEmail ?? "Shared person";
}

export function RecipeShareManager({
  recipeId,
  recipeTitle,
  authorId,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(!compact);
  const [shares, setShares] = useState<RecipeShareGrant[]>([]);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<Role | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sharesRes, dirRes] = await Promise.all([
        fetch(`/api/recipes/shares?recipeId=${encodeURIComponent(recipeId)}`),
        fetch("/api/users/directory"),
      ]);
      const sharesData = await sharesRes.json().catch(() => ({}));
      const dirData = await dirRes.json().catch(() => ({}));

      if (!sharesRes.ok) {
        throw new Error(
          typeof sharesData.error === "string"
            ? sharesData.error
            : "Could not load shares"
        );
      }
      if (!dirRes.ok) {
        throw new Error(
          typeof dirData.error === "string"
            ? dirData.error
            : "Could not load people"
        );
      }

      setShares(
        Array.isArray(sharesData.shares)
          ? (sharesData.shares as RecipeShareGrant[])
          : []
      );
      setDirectory(
        Array.isArray(dirData.users) ? (dirData.users as DirectoryUser[]) : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shares");
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [recipeId]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  const sharedUserIds = new Set(
    shares.map((s) => s.userId).filter((id): id is string => Boolean(id))
  );
  const sharedRoles = new Set(
    shares.map((s) => s.role).filter((r): r is Role => Boolean(r))
  );

  const availableUsers = directory.filter(
    (u) => u.id !== authorId && !sharedUserIds.has(u.id)
  );
  const availableRoles = (
    ["viewer", "cook", "admin", "owner"] as Role[]
  ).filter((role) => !sharedRoles.has(role));

  async function addUserShare() {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, userId: selectedUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not share"
        );
      }
      setSelectedUserId("");
      setStatus("Shared with that person.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share");
    } finally {
      setSaving(false);
    }
  }

  async function addRoleShare() {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, role: selectedRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not share"
        );
      }
      setSelectedRole("");
      setStatus(`Shared with ${ROLE_LABELS[selectedRole]} role.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share");
    } finally {
      setSaving(false);
    }
  }

  async function remove(shareId: string) {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(
        `/api/recipes/shares?recipeId=${encodeURIComponent(recipeId)}&shareId=${encodeURIComponent(shareId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not remove share"
        );
      }
      setStatus("Share removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove share");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3"
          : "rounded-xl border border-[var(--line)] bg-[var(--mist)]/40 p-4 md:p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--ink)]">
            Share “{recipeTitle}”
          </h3>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Private on Gregg&apos;s Recipes — grant view access to specific
            people or roles. This is not a public listing.
          </p>
        </div>
        {compact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Manage shares"}
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--ink-muted)]">Loading shares…</p>
          ) : (
            <>
              {shares.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  Not shared with anyone yet. Only you can open this recipe
                  until you add people or roles below.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--paper)]">
                  {shares.map((share) => (
                    <li
                      key={share.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <span className="text-sm text-[var(--ink)]">
                        {shareLabel(share)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => remove(share.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`share-user-${recipeId}`}>Add a person</Label>
                  {availableUsers.length === 0 ? (
                    <p className="text-xs text-[var(--ink-soft)]">
                      {directory.length === 0
                        ? "No other people to share with yet."
                        : "Everyone available is already shared."}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Select
                        value={selectedUserId || undefined}
                        onValueChange={(value) =>
                          setSelectedUserId(value ?? "")
                        }
                      >
                        <SelectTrigger
                          id={`share-user-${recipeId}`}
                          className="w-full min-w-0 flex-1"
                        >
                          <SelectValue placeholder="Choose a person" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name?.trim()
                                ? `${person.name.trim()} (${person.email})`
                                : person.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || !selectedUserId}
                        onClick={() => void addUserShare()}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`share-role-${recipeId}`}>Add a role</Label>
                  {availableRoles.length === 0 ? (
                    <p className="text-xs text-[var(--ink-soft)]">
                      All roles already have access.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Select
                        value={selectedRole || undefined}
                        onValueChange={(value) =>
                          setSelectedRole((value as Role | null) ?? "")
                        }
                      >
                        <SelectTrigger
                          id={`share-role-${recipeId}`}
                          className="w-full min-w-0 flex-1"
                        >
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || !selectedRole}
                        onClick={() => void addRoleShare()}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p
              className="text-sm text-[var(--accent-deep)]"
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
