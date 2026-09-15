import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type Props = {
  href: string;
  email: string;
};

/**
 * Human confirm step before hitting Auth.js `/api/auth/callback/...`.
 * Avoids a silent HTTP redirect chain that Safe Browsing often flags.
 */
export function SignInVerifyConfirm({ href, email }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          Continue signing in
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          You&apos;re signing in to Gregg&apos;s Recipes
          {email ? (
            <>
              {" "}
              as <span className="text-[var(--ink)]">{email}</span>
            </>
          ) : null}
          . This is a personal home-cooking recipe site — no password, no
          downloads.
        </p>
      </div>
      <a
        href={href}
        rel="nofollow"
        className={cn(buttonVariants(), "w-full sm:w-auto")}
      >
        Continue to Gregg&apos;s Recipes
      </a>
      <p className="text-sm text-[var(--ink-soft)]">
        Didn&apos;t request this? Close the tab — the link expires soon.
      </p>
    </div>
  );
}
