import Link from "next/link";
import { AuthNav } from "@/components/auth/auth-nav";

const headerFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)]";

const headerNavLinkClassName =
  `inline-flex min-h-11 items-center px-2.5 text-sm font-medium transition-colors hover:text-[var(--ink)] md:min-h-9 md:px-3 ${headerFocus}`;

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 border-b border-[var(--line)]/70 bg-[var(--paper)]/95 shadow-[0_1px_0_rgba(28,46,36,0.04)] backdrop-blur-md">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 md:px-8 md:py-4">
        <Link
          href="/"
          className={`inline-flex min-h-11 items-center font-display text-xl tracking-tight text-[var(--ink)] transition-opacity hover:opacity-80 md:min-h-9 md:text-2xl ${headerFocus}`}
        >
          Gregg&apos;s Recipes
        </Link>
        <nav
          aria-label="Primary"
          className="flex max-w-full flex-wrap items-center justify-end gap-x-0.5 gap-y-1 text-[var(--ink-muted)]"
        >
          <Link href="/#recipes" className={headerNavLinkClassName}>
            Recipes
          </Link>
          <AuthNav linkClassName={headerNavLinkClassName} />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--paper)]/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-[var(--ink-muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <p className="font-display text-lg text-[var(--ink)]">Gregg&apos;s Recipes</p>
        <p>Recipes worth sharing — written down so you can cook them again.</p>
      </div>
    </footer>
  );
}
