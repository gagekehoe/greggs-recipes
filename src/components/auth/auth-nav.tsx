"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthNav({ variant = "header" }: { variant?: "header" | "hero" }) {
  const { data, status } = useSession();
  const muted =
    variant === "hero"
      ? "text-[#e8ebe3] hover:text-white"
      : "text-[var(--ink-muted)] hover:text-[var(--ink)]";

  if (status === "loading") {
    return <span className={`text-sm ${muted}`}>…</span>;
  }

  if (!data?.user) {
    return (
      <Link href="/signin" className={`text-sm font-medium transition-colors ${muted}`}>
        Sign in
      </Link>
    );
  }

  const role = data.user.role;
  const canWrite = role === "admin" || role === "cook";

  return (
    <div className="flex items-center gap-4 text-sm font-medium">
      {canWrite ? (
        <Link href="/my-recipes" className={`transition-colors ${muted}`}>
          My recipes
        </Link>
      ) : null}
      {role === "admin" ? (
        <Link href="/people" className={`transition-colors ${muted}`}>
          People
        </Link>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={
          variant === "hero"
            ? "h-auto px-0 text-[#e8ebe3] hover:bg-transparent hover:text-white"
            : "h-auto px-0 text-[var(--ink-muted)] hover:bg-transparent hover:text-[var(--ink)]"
        }
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </Button>
    </div>
  );
}
