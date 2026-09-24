"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

/** Shared control height — Input is h-11; Select defaults to md:h-9 via data-size. */
const CONTROL_SURFACE =
  "h-11 rounded-none border-[var(--line)] bg-[var(--paper)] md:h-11";
const SELECT_CONTROL_SURFACE = cn(
  CONTROL_SURFACE,
  // Beat SelectTrigger's data-[size=default]:md:h-9 (higher specificity than md:h-11).
  "data-[size=default]:h-11 data-[size=default]:md:h-11"
);

type Props = {
  query: CatalogQuery;
  availableTags: string[];
  resultCount: number;
  totalCount: number;
};

function tagsSummary(selected: readonly string[]): string {
  if (selected.length === 0) return "All tags";
  if (selected.length === 1) return selected[0]!;
  if (selected.length === 2) return `${selected[0]}, ${selected[1]}`;
  return `${selected[0]} +${selected.length - 1}`;
}

export function RecipeCatalogControls({
  query,
  availableTags,
  resultCount,
  totalCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tagsOpen, setTagsOpen] = useState(false);
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

  function clearTags() {
    if (query.tags.length === 0) return;
    navigate({ ...query, tags: [] });
  }

  function clearAll() {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    setTagsOpen(false);
    navigate({ q: "", sort: "newest", tags: [] });
  }

  const hasFilters =
    query.q.length > 0 ||
    query.tags.length > 0 ||
    query.sort !== "newest";

  return (
    <div
      className={cn(
        "mb-8 space-y-4 border-b border-[var(--line)] pb-8 md:mb-10",
        isPending && "opacity-80"
      )}
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
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
            className={cn(
              CONTROL_SURFACE,
              "text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
            )}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0 sm:items-end sm:gap-4">
          <div className="min-w-0 space-y-2 sm:w-44">
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
                className={cn(SELECT_CONTROL_SURFACE, "w-full")}
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

          {availableTags.length > 0 ? (
            <div className="min-w-0 space-y-2 sm:w-52">
              <Label
                htmlFor="recipe-catalog-tags"
                className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
              >
                Tags
              </Label>
              <div className="flex h-11 items-stretch gap-1 md:h-11">
                <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                  <PopoverTrigger
                    id="recipe-catalog-tags"
                    type="button"
                    className={cn(
                      CONTROL_SURFACE,
                      "flex min-w-0 flex-1 items-center justify-between gap-2 border px-3 text-left text-sm text-[var(--ink)] transition-colors outline-none focus-visible:border-[var(--sage-deep)] focus-visible:ring-3 focus-visible:ring-[var(--sage-deep)]/30",
                      query.tags.length > 0 && "border-[var(--sage-deep)]/60"
                    )}
                    aria-label={
                      query.tags.length > 0
                        ? `Tags, ${query.tags.length} selected`
                        : "Filter by tags"
                    }
                  >
                    <span className="truncate">
                      {query.tags.length > 0
                        ? tagsSummary(query.tags)
                        : "All tags"}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[var(--ink-soft)]">
                      {query.tags.length > 0 ? (
                        <span className="tabular-nums text-xs text-[var(--sage-deep)]">
                          {query.tags.length}
                        </span>
                      ) : null}
                      <ChevronDownIcon className="size-4" aria-hidden />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-[min(18rem,calc(100vw-2.5rem))] rounded-none border border-[var(--line)] bg-[var(--paper)] p-0 text-[var(--ink)] shadow-md ring-0"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                        {query.tags.length > 0
                          ? `${query.tags.length} selected`
                          : "Select tags"}
                      </p>
                      {query.tags.length > 0 ? (
                        <button
                          type="button"
                          onClick={clearTags}
                          className="text-xs text-[var(--accent-deep)] underline-offset-2 hover:underline"
                        >
                          Clear tags
                        </button>
                      ) : null}
                    </div>
                    <ul
                      className="max-h-56 overflow-y-auto py-1"
                      role="listbox"
                      aria-multiselectable="true"
                      aria-label="Recipe tags"
                    >
                      {availableTags.map((tag) => {
                        const active = query.tags.includes(tag);
                        const checkboxId = `recipe-catalog-tag-${tag}`;
                        return (
                          <li key={tag} role="option" aria-selected={active}>
                            <label
                              htmlFor={checkboxId}
                              className={cn(
                                "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[var(--sage)]/10",
                                active && "bg-[var(--sage)]/15"
                              )}
                            >
                              <Checkbox
                                id={checkboxId}
                                checked={active}
                                onCheckedChange={() => toggleTag(tag)}
                                className="rounded-none border-[var(--line)] data-checked:border-[var(--sage-deep)] data-checked:bg-[var(--sage-deep)]"
                              />
                              <span className="min-w-0 flex-1 truncate capitalize">
                                {tag}
                              </span>
                              {active ? (
                                <CheckIcon
                                  className="size-3.5 shrink-0 text-[var(--sage-deep)]"
                                  aria-hidden
                                />
                              ) : null}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </PopoverContent>
                </Popover>
                {query.tags.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearTags}
                    className={cn(
                      CONTROL_SURFACE,
                      "inline-flex w-11 shrink-0 items-center justify-center border text-[var(--ink-muted)] transition-colors hover:border-[var(--sage-deep)]/50 hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sage-deep)]"
                    )}
                    aria-label="Clear selected tags"
                  >
                    <XIcon className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
