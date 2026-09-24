"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  catalogHref,
  type CatalogQuery,
  type CatalogSort,
} from "@/lib/recipes/catalog-query";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<CatalogSort, string> = {
  newest: "Newest",
  "title-asc": "Title A–Z",
  "title-desc": "Title Z–A",
};

const DEBOUNCE_MS = 300;

type Props = {
  query: CatalogQuery;
  availableTags: string[];
  resultCount: number;
  totalCount: number;
};

export function RecipeCatalogControls({
  query,
  availableTags,
  resultCount,
  totalCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const queryRef = useRef(query);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  function navigate(next: CatalogQuery) {
    startTransition(() => {
      router.replace(catalogHref(next), { scroll: false });
    });
  }

  function scheduleSearch(raw: string) {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const trimmed = raw.trim().replace(/\s+/g, " ");
      if (trimmed === queryRef.current.q) return;
      navigate({ ...queryRef.current, q: trimmed });
    }, DEBOUNCE_MS);
  }

  function commitSearch(raw: string) {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (trimmed === queryRef.current.q) return;
    navigate({ ...queryRef.current, q: trimmed });
  }

  function toggleTag(tag: string) {
    const selected = new Set(query.tags);
    if (selected.has(tag)) selected.delete(tag);
    else selected.add(tag);
    navigate({
      ...query,
      tags: [...selected].sort((a, b) => a.localeCompare(b)),
    });
  }

  function clearAll() {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    navigate({ q: "", sort: "newest", tags: [] });
  }

  const hasFilters =
    query.q.length > 0 ||
    query.tags.length > 0 ||
    query.sort !== "newest";

  return (
    <div
      className={cn(
        "mb-8 space-y-5 border-b border-[var(--line)] pb-8 md:mb-10",
        isPending && "opacity-80"
      )}
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <Label
            htmlFor="recipe-catalog-search"
            className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
          >
            Search
          </Label>
          {/* key remounts when URL q changes (clear / back) without a sync effect */}
          <Input
            key={query.q}
            id="recipe-catalog-search"
            type="search"
            name="q"
            defaultValue={query.q}
            onChange={(e) => scheduleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSearch(e.currentTarget.value);
              }
            }}
            placeholder="Search by title, summary, or tag"
            className="h-11 rounded-none border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] md:h-11"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
        <div className="w-full space-y-2 sm:w-48 sm:shrink-0">
          <Label
            htmlFor="recipe-catalog-sort"
            className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
          >
            Sort
          </Label>
          <Select
            value={query.sort}
            onValueChange={(value) => {
              if (!value) return;
              navigate({ ...query, sort: value as CatalogSort });
            }}
          >
            <SelectTrigger
              id="recipe-catalog-sort"
              className="h-11 w-full rounded-none border-[var(--line)] bg-[var(--paper)] md:h-11"
            >
              <SelectValue>{SORT_LABELS[query.sort]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as CatalogSort[]).map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {availableTags.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            Tags
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by tag"
          >
            {availableTags.map((tag) => {
              const active = query.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex min-h-11 items-center border px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)] md:min-h-9",
                    active
                      ? "border-[var(--sage-deep)] bg-[var(--sage-deep)] text-[#f3f0e8]"
                      : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:border-[var(--sage-deep)]/50 hover:text-[var(--ink)]"
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-muted)]" aria-live="polite">
          {isPending
            ? "Updating…"
            : hasFilters
              ? `${resultCount} of ${totalCount} ${totalCount === 1 ? "recipe" : "recipes"}`
              : `${totalCount} ${totalCount === 1 ? "recipe" : "recipes"}`}
        </p>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-[var(--accent-deep)]"
          >
            Clear search & filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
