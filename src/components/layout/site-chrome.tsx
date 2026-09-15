import Link from "next/link";
import { AuthNav } from "@/components/auth/auth-nav";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-[var(--ink)] transition-opacity hover:opacity-80 md:text-2xl"
        >
          Gregg&apos;s Recipes
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-[var(--ink-muted)]">
          <Link href="/#recipes" className="transition-colors hover:text-[var(--ink)]">
            Recipes
          </Link>
          <AuthNav />
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
        <p>Home cooking, written down so you can make it again.</p>
      </div>
    </footer>
  );
}
