import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f3f0e8]";

const primaryClassName =
  `inline-flex h-11 items-center rounded-lg bg-[#f3f0e8] px-5 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white md:h-10 md:px-4 ${focusRing}`;

const secondaryClassName =
  `inline-flex h-11 items-center rounded-lg border border-[#f3f0e8]/55 px-5 text-sm font-medium text-[#f3f0e8] transition-colors hover:bg-[#f3f0e8]/10 hover:text-white md:h-10 md:px-4 ${focusRing}`;

export function HeroCtas({ user }: { user: SessionUser | null }) {
  const canWrite = user?.role === "admin" || user?.role === "cook";

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link href="/#recipes" className={primaryClassName}>
        Browse recipes
      </Link>
      {user ? (
        canWrite ? (
          <Link href="/my-recipes" className={secondaryClassName}>
            My recipes
          </Link>
        ) : (
          <Link href="/profile" className={secondaryClassName}>
            Profile
          </Link>
        )
      ) : (
        <Link href="/signin" className={secondaryClassName}>
          Sign in
        </Link>
      )}
    </div>
  );
}
