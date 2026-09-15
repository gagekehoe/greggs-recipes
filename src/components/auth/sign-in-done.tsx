"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSession } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { notifyAuthSessionReady } from "@/lib/auth/cross-tab-session";
import { welcomeCallbackUrl } from "@/lib/auth/safe-next";
import { cn } from "cn";

type Props = {
  nextPath: string;
};

export function SignInDone({ nextPath }: Props) {
  const [sessionOk, setSessionOk] = useState(false);
  const [closedAttempted, setClosedAttempted] = useState(false);
  const continueHref = welcomeCallbackUrl(nextPath);
  const notified = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const session = await getSession();
      if (cancelled) return;

      if (!session?.user) {
        window.location.replace("/signin");
        return;
      }

      setSessionOk(true);

      if (!notified.current) {
        notified.current = true;
        notifyAuthSessionReady();
      }

      // Browsers only allow close() for script-opened windows; still try.
      try {
        window.close();
      } catch {
        // ignore
      }
      setClosedAttempted(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
        {sessionOk ? "You’re signed in" : "Finishing sign-in…"}
      </h1>
      {sessionOk ? (
        <>
          <p className="text-[var(--ink-muted)] leading-relaxed">
            You can close this tab and return to the one where you requested the
            link — it should continue automatically.
          </p>
          {closedAttempted ? (
            <p className="text-sm text-[var(--ink-soft)]">
              If this tab didn’t close on its own, close it manually.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="button" onClick={() => window.close()}>
              Close this tab
            </Button>
            <Link
              href={continueHref}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Continue here instead
            </Link>
          </div>
        </>
      ) : (
        <p className="text-[var(--ink-muted)] leading-relaxed">
          Confirming your session…
        </p>
      )}
    </div>
  );
}
