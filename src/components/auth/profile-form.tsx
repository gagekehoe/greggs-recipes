"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
} from "@/lib/auth/profile";

type Props = {
  initialName: string;
  email: string | null | undefined;
  mode: "welcome" | "profile";
  nextHref?: string;
};

export function ProfileForm({
  initialName,
  email,
  mode,
  nextHref = "/",
}: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not save profile");
          return;
        }
        await update({ name: data.user?.name });
        if (mode === "welcome") {
          router.replace(nextHref);
          router.refresh();
          return;
        }
        setSaved(true);
        setName(data.user?.name || name);
        router.refresh();
      } catch {
        setError("Could not save profile");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {email ? (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Signed in as
          </p>
          <p className="text-sm text-[var(--ink-muted)]">{email}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          name="name"
          autoComplete="nickname"
          required
          minLength={DISPLAY_NAME_MIN}
          maxLength={DISPLAY_NAME_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gregg"
          className="rounded-none border-[var(--line)] bg-[var(--paper)]/50"
        />
        <p className="text-xs text-[var(--ink-soft)]">
          Shown on your reviews and comments ({DISPLAY_NAME_MIN}–
          {DISPLAY_NAME_MAX} characters).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-[var(--sage-deep)]" role="status">
          Profile saved.
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "welcome"
            ? "Save and continue"
            : "Save profile"}
      </Button>
    </form>
  );
}
