import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-32 text-center md:px-8">
      <p className="font-display text-5xl text-[var(--ink)]">Gregg&apos;s Recipes</p>
      <h1 className="mt-6 text-2xl font-medium text-[var(--ink)]">
        That recipe isn&apos;t here
      </h1>
      <p className="mt-3 text-[var(--ink-muted)]">
        It may have been renamed, or it isn&apos;t in the collection yet.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)]"
      >
        Back to recipes
      </Link>
    </div>
  );
}
