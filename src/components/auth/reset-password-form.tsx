"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { PasswordField } from "@/components/auth/password-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { welcomeCallbackUrl } from "@/lib/auth/safe-next";
import { cn } from "cn";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const callbackUrl = searchParams.get("callbackUrl");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingLink = !emailParam || !token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (password !== confirm) {
      setError("Passwords don’t match.");
      setPending(false);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailParam,
          token,
          password,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error || "Could not update your password.");
        setPending(false);
        return;
      }

      const result = await signIn("credentials", {
        email: emailParam,
        password,
        redirect: false,
      });
      if (result?.error) {
        window.location.href = "/signin";
        return;
      }
      window.location.href = welcomeCallbackUrl(callbackUrl);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  if (missingLink) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Reset link needed
        </h1>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          Open the link from your email, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Forgot password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Set a new password
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          Choose a password for <span className="text-[var(--ink)]">{emailParam}</span>{" "}
          on Gregg&apos;s Recipes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordField
          id="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          toggleLabel="new password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <PasswordField
          id="confirm"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          toggleLabel="confirm password"
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save password and sign in"}
      </Button>
    </form>
  );
}
