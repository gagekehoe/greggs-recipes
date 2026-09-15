"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscribeAuthSessionReady } from "@/lib/auth/cross-tab-session";
import { safeNextPath, signInDoneUrl, welcomeCallbackUrl } from "@/lib/auth/safe-next";

type Props = {
  sent?: boolean;
  error?: string | null;
};

const POLL_MS = 2000;

export function SignInForm({ sent, error }: Props) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [waitingCopy, setWaitingCopy] = useState("Waiting for you to open the link…");
  const navigating = useRef(false);

  const continueAfterSession = useCallback(() => {
    if (navigating.current) return;
    navigating.current = true;
    setWaitingCopy("Signed in — continuing…");
    window.location.href = welcomeCallbackUrl(callbackUrl);
  }, [callbackUrl]);

  const checkSession = useCallback(async () => {
    const session = await getSession();
    if (session?.user) continueAfterSession();
  }, [continueAfterSession]);

  useEffect(() => {
    if (!sent) return;

    void checkSession();

    const unsubscribe = subscribeAuthSessionReady(() => {
      void checkSession();
    });

    const timer = window.setInterval(() => {
      void checkSession();
    }, POLL_MS);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [sent, checkSession]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setLocalError(null);
    try {
      const magicLinkCallback = signInDoneUrl(safeNextPath(callbackUrl));
      const result = await signIn("nodemailer", {
        email: email.trim(),
        callbackUrl: magicLinkCallback,
        redirect: false,
      });
      if (result?.error) {
        setLocalError("Could not send the sign-in link. Try again.");
        setPending(false);
        return;
      }
      const sentParams = new URLSearchParams({ sent: "1" });
      if (callbackUrl) {
        sentParams.set("callbackUrl", safeNextPath(callbackUrl));
      }
      window.location.href = `/signin?${sentParams.toString()}`;
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
          Check your email for a sign-in link. If you don&apos;t see it, look in
          spam or request another link.
        </p>
        <p className="text-sm text-[var(--ink-soft)]" role="status" aria-live="polite">
          {waitingCopy} Keep this tab open.
        </p>
        <p className="text-sm text-[var(--ink-soft)]">
          New here? The same link creates your account. You&apos;ll choose a
          display name on first sign-in.
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
          Email a one-time link — no password. Browse recipes anytime without an
          account; sign in to leave reviews and comments. First visit creates
          your account (cooks can publish after an admin promotes them).
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
