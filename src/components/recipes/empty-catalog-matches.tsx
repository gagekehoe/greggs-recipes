import Link from "next/link";

type Props = {
  clearHref: string;
};

/**
 * Browse empty state when the catalog has dishes but search/filters match none.
 */
export function EmptyCatalogMatches({ clearHref }: Props) {
  return (
    <div className="rounded-none border border-dashed border-[var(--line)] bg-[var(--paper)]/60 px-6 py-16 text-center">
      <p className="font-display text-2xl text-[var(--ink)]">
        No recipes match
      </p>
      <p className="mx-auto mt-3 max-w-md text-[var(--ink-muted)]">
        Try a different search or tag — or clear filters to see everything in
        Gregg&apos;s collection.
      </p>
      <Link
        href={clearHref}
        className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)]"
      >
        Clear search & filters
      </Link>
    </div>
  );
}
