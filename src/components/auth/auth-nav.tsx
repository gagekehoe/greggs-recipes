"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

const defaultHeaderLinkClassName =
  "inline-flex min-h-11 items-center px-2.5 text-sm font-medium transition-colors md:min-h-9 md:px-3";

export function AuthNav({
  variant = "header",
  linkClassName,
}: {
  variant?: "header" | "hero";
  linkClassName?: string;
}) {
  const { data, status } = useSession();
  const muted =
    variant === "hero"
      ? "text-[#e8ebe3] hover:text-white"
      : "text-[var(--ink-muted)] hover:text-[var(--ink)]";
  const linkClass =
    linkClassName ??
    `${defaultHeaderLinkClassName} ${muted}`;

  if (status === "loading") {
    return (
      <span
        className={`inline-flex min-h-11 items-center px-2.5 text-sm md:min-h-9 ${muted}`}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Checking sign-in status</span>
        <span aria-hidden>…</span>
      </span>
    );
  }

  if (!data?.user) {
    return (
      <Link
        href="/signin"
        className={
          linkClassName
            ? `${linkClassName} ${muted}`
            : linkClass
        }
      >
        Sign in
      </Link>
    );
  }

  const role = data.user.role;
  const canWrite = role === "admin" || role === "cook";
  const label = data.user.name?.trim() || "Profile";
  const signedInLinkClass = linkClassName
    ? `${linkClassName} ${muted}`
    : linkClass;

  return (
    <>
      {canWrite ? (
        <Link href="/my-recipes" className={signedInLinkClass}>
          My recipes
        </Link>
      ) : null}
      {role === "admin" ? (
        <Link href="/people" className={signedInLinkClass}>
          People
        </Link>
      ) : null}
      <Link href="/profile" className={signedInLinkClass} title="Your profile">
        {label}
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={
          variant === "hero"
            ? "h-11 px-2.5 text-[#e8ebe3] hover:bg-transparent hover:text-white md:h-9 md:px-3"
            : "h-11 px-2.5 text-[var(--ink-muted)] hover:bg-transparent hover:text-[var(--ink)] md:h-9 md:px-3"
        }
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </Button>
    </>
  );
}
