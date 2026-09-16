import Link from "next/link";
import { canWriteRecipes } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";

type Props = {
  user: SessionUser | null;
};

/**
 * Home catalog empty state — signed-out guests get join framing,
 * not a dead “pantry empty” kitchen message.
 */
export function EmptyRecipes({ user }: Props) {
  const canWrite = canWriteRecipes(user?.role);

  if (!user) {
    return (
      <div className="rounded-none border border-dashed border-[var(--line)] bg-[var(--paper)]/60 px-6 py-16 text-center">
        <p className="font-display text-2xl text-[var(--ink)]">
          Recipes are on the way
        </p>
        <p className="mx-auto mt-3 max-w-md text-[var(--ink-muted)]">
          Browse anytime once dishes land. Sign in to leave reviews and
          comments — cooks publish to Gregg&apos;s shared collection.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)]"
        >
          Sign in to join
        </Link>
      </div>
    );
  }

  if (canWrite) {
    return (
      <div className="rounded-none border border-dashed border-[var(--line)] bg-[var(--paper)]/60 px-6 py-16 text-center">
        <p className="font-display text-2xl text-[var(--ink)]">
          Nothing published yet
        </p>
        <p className="mx-auto mt-3 max-w-md text-[var(--ink-muted)]">
          Be the first — publish a dish from My recipes. It goes live for
          everyone without a redeploy.
        </p>
        <Link
          href="/my-recipes"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)]"
        >
          My recipes
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-none border border-dashed border-[var(--line)] bg-[var(--paper)]/60 px-6 py-16 text-center">
      <p className="font-display text-2xl text-[var(--ink)]">
        Nothing published yet
      </p>
      <p className="mx-auto mt-3 max-w-md text-[var(--ink-muted)]">
        Cooks, admins, and the owner add dishes to this shared site. You can
        browse, review, and comment as soon as recipes land.
      </p>
      <Link
        href="/profile"
        className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)]"
      >
        Your profile
      </Link>
    </div>
  );
}
