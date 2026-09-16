"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { safeNextPath, welcomeCallbackUrl } from "@/lib/auth/safe-next";

type Mode = "signin" | "register";

type Props = {
  error?: string | null;
  initialMode?: Mode;
};

export function SignInForm({ error, initialMode = "signin" }: Props) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const nextAfterAuth = welcomeCallbackUrl(callbackUrl);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function signInWithPassword() {
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    if (result?.error) {
      setLocalError(
        "Email or password doesn’t match. If you used email links before, set a password with Forgot password."
      );
      setPending(false);
      return;
    }
    window.location.href = nextAfterAuth;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setLocalError(null);

    try {
      if (mode === "register") {
        if (password !== confirm) {
          setLocalError("Passwords don’t match.");
          setPending(false);
          return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
          setLocalError(
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
          );
          setPending(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setLocalError(body.error || "Could not create your account.");
          setPending(false);
          return;
        }
      }

      await signInWithPassword();
    } catch {
      setLocalError("Network error. Try again.");
      setPending(false);
    }
  }

  const forgotHref = (() => {
    const params = new URLSearchParams();
    if (email.trim()) params.set("email", email.trim());
    if (callbackUrl) params.set("callbackUrl", safeNextPath(callbackUrl));
    const q = params.toString();
    return q ? `/forgot-password?${q}` : "/forgot-password";
  })();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          {mode === "signin" ? "Sign in" : "Join the kitchen"}
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          {mode === "signin"
            ? "Sign in with your email and password. Browse recipes anytime without an account; sign in to leave reviews and comments."
            : "Create an account with email and password. Cooks can publish after an admin promotes them on People."}
        </p>
      </div>

      <div className="flex gap-2 text-sm" role="tablist" aria-label="Account">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={
            mode === "signin"
              ? "font-medium text-[var(--ink)] underline-offset-4 underline"
              : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
          }
          onClick={() => {
            setMode("signin");
            setLocalError(null);
          }}
        >
          Have an account
        </button>
        <span className="text-[var(--ink-soft)]" aria-hidden>
          ·
        </span>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={
            mode === "register"
              ? "font-medium text-[var(--ink)] underline-offset-4 underline"
              : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
          }
          onClick={() => {
            setMode("register");
            setLocalError(null);
          }}
        >
          New here
        </button>
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

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        />
      </div>

      {mode === "register" ? (
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      ) : null}

      {error || localError ? (
        <p className="text-sm text-red-700">{localError || decodeError(error)}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
        {mode === "signin" ? (
          <Link
            href={forgotHref}
            className="text-sm text-[var(--ink-muted)] underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        ) : null}
      </div>

      {mode === "signin" ? (
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          Used email sign-in links before? Use{" "}
          <Link href={forgotHref} className="underline underline-offset-4">
            Forgot password
          </Link>{" "}
          once to choose a password for this site.
        </p>
      ) : null}
    </form>
  );
}

function decodeError(code: string | null | undefined): string {
  if (!code) return "Something went wrong.";
  if (code === "Configuration") {
    return "Auth isn’t configured yet. Set AUTH_SECRET in .env.local.";
  }
  if (code === "CredentialsSignin") {
    return "Email or password doesn’t match.";
  }
  return "Couldn’t sign in. Try again.";
}
