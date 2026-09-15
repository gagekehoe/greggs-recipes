import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";

const primaryClassName =
  "inline-flex h-9 items-center rounded-lg bg-[#f3f0e8] px-4 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white";

const secondaryClassName =
  "inline-flex h-9 items-center rounded-lg border border-[#f3f0e8]/40 px-4 text-sm font-medium text-[#f3f0e8] transition-colors hover:bg-[#f3f0e8]/10 hover:text-white";

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
