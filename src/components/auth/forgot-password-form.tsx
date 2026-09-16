"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/auth/safe-next";
import { cn } from "cn";

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not send the reset email.");
        setPending(false);
        return;
      }
      setSent(true);
      setPending(false);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  const signInHref = (() => {
    const params = new URLSearchParams();
    if (callbackUrl) params.set("callbackUrl", safeNextPath(callbackUrl));
    const q = params.toString();
    return q ? `/signin?${q}` : "/signin";
  })();

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Check your inbox
        </h1>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          If that email is on Gregg&apos;s Recipes, you&apos;ll get a link to
          set a new password. Locally, with Resend unset, the link is printed in
          the <code className="text-sm">npm run dev</code> terminal.
        </p>
        <Link
          href={signInHref}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Forgot password
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          Enter your email and we&apos;ll send a link to set a new password —
          handy if you&apos;re new to passwords on this site.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Email reset link"}
        </Button>
        <Link
          href={signInHref}
          className="text-sm text-[var(--ink-muted)] underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
