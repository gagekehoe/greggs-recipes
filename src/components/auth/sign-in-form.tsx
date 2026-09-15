"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  sent?: boolean;
  error?: string | null;
};

export function SignInForm({ sent, error }: Props) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setLocalError(null);
    try {
      const result = await signIn("nodemailer", {
        email: email.trim(),
        callbackUrl: "/my-recipes",
        redirect: false,
      });
      if (result?.error) {
        setLocalError("Could not send the sign-in link. Try again.");
        setPending(false);
        return;
      }
      window.location.href = "/signin?sent=1";
    } catch {
      setLocalError("Network error. Try again.");
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Check your inbox
        </h1>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          We sent a magic link if that email can receive mail. Locally, with no
          email provider configured, open the terminal running{" "}
          <code className="text-[var(--ink)]">npm run dev</code> — the link is
          printed there.
        </p>
        <Button variant="outline" onClick={() => (window.location.href = "/signin")}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Sign in
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          Email a one-time link — no password. New accounts start as viewers;
          cooks and admins can publish recipes.
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

      {error || localError ? (
        <p className="text-sm text-red-700">{localError || decodeError(error)}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending link…" : "Email me a link"}
      </Button>
    </form>
  );
}

function decodeError(code: string | null | undefined): string {
  if (!code) return "Something went wrong.";
  if (code === "Configuration") {
    return "Auth isn’t configured yet. Set AUTH_SECRET in .env.local.";
  }
  return "Couldn’t sign in. Request a new link.";
}
