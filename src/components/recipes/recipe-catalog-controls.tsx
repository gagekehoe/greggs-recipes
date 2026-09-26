"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ChevronDownIcon,
  LayoutGridIcon,
  ListIcon,
  XIcon,
} from "lucide-react";
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
  CATALOG_VIEW_STORAGE_KEY,
  catalogHref,
  DEFAULT_CATALOG_VIEW,
  parseCatalogView,
  type CatalogQuery,
  type CatalogSort,
  type CatalogView,
} from "@/lib/recipes/catalog-query";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<CatalogSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  rating: "Highest rated",
  "title-asc": "Title A–Z",
  "title-desc": "Title Z–A",
};

const DEBOUNCE_MS = 300;

/**
 * Identical chrome for Search / Sort / Tags.
 * Important overrides beat Input (md:h-9, py-2) and SelectTrigger
 * (data-[size=default]:md:h-9, py-2) — plain utilities lose to those.
 */
const CONTROL_SURFACE = cn(
  "box-border h-10! max-h-10! min-h-10! shrink-0 rounded-none border border-[var(--line)] bg-[var(--paper)]",
  "px-3! py-0! text-sm! leading-none!"
);
const SELECT_CONTROL_SURFACE = cn(
  CONTROL_SURFACE,
  "data-[size=default]:h-10! data-[size=default]:max-h-10! data-[size=default]:min-h-10!",
  "data-[size=default]:md:h-10! data-[size=default]:py-0!"
);
/** Label + control: flex/gap so Base UI Select's hidden input can't add space-y margin. */
const FIELD = "flex min-w-0 flex-col gap-2";

type Props = {
  query: CatalogQuery;
  availableTags: string[];
  resultCount: number;
  totalCount: number;
  /** True when `?view=` was present in the request URL (vs defaulted). */
  viewFromUrl: boolean;
};

function tagsSummary(selected: readonly string[]): string {
  if (selected.length === 0) return "All tags";
  if (selected.length === 1) return selected[0]!;
  if (selected.length === 2) return `${selected[0]}, ${selected[1]}`;
  return `${selected[0]} +${selected.length - 1}`;
}

function readStoredView(): CatalogView | null {
  try {
    const raw = window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY);
    if (raw == null) return null;
    return parseCatalogView(raw);
  } catch {
    return null;
  }
}

function writeStoredView(view: CatalogView) {
  try {
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, view);
  } catch {
    // Private mode / quota — URL still carries the preference.
  }
}

export function RecipeCatalogControls({
  query,
  availableTags,
  resultCount,
  totalCount,
  viewFromUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tagsOpen, setTagsOpen] = useState(false);
  const queryRef = useRef(query);
  const debounceRef = useRef<number | null>(null);
  const hydratedViewRef = useRef(false);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  // Restore list preference from localStorage when the URL omitted `view`.
  useEffect(() => {
    if (hydratedViewRef.current) return;
    hydratedViewRef.current = true;
    if (viewFromUrl) {
      writeStoredView(query.view);
      return;
    }
    const stored = readStoredView();
    if (stored && stored !== DEFAULT_CATALOG_VIEW && stored !== query.view) {
      startTransition(() => {
        router.replace(catalogHref({ ...queryRef.current, view: stored }), {
          scroll: false,
        });
      });
    }
  }, [query.view, router, viewFromUrl]);

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
    navigate({ q: "", sort: "newest", tags: [], view: query.view });
  }

  function setView(view: CatalogView) {
    if (view === query.view) return;
    writeStoredView(view);
    navigate({ ...query, view });
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
        <div className={cn(FIELD, "flex-1")}>
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
              "w-full text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
            )}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:shrink-0 sm:gap-4">
          <div className={cn(FIELD, "sm:w-48")}>
            <Label
              htmlFor="recipe-catalog-sort"
              className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
            >
              Sort
            </Label>
            {/* Wrapper keeps Select's hidden input out of the label/control stack. */}
            <div className="h-10 w-full">
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
          </div>

          {availableTags.length > 0 ? (
            <div className={cn(FIELD, "sm:w-52")}>
              <Label
                htmlFor="recipe-catalog-tags"
                className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
              >
                Tags
              </Label>
              <div className="flex h-10 items-stretch gap-1">
                <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                  <PopoverTrigger
                    id="recipe-catalog-tags"
                    type="button"
                    className={cn(
                      CONTROL_SURFACE,
                      "flex min-w-0 flex-1 items-center justify-between gap-2 text-left text-[var(--ink)] transition-colors outline-none focus-visible:border-[var(--sage-deep)] focus-visible:ring-3 focus-visible:ring-[var(--sage-deep)]/30",
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
                      "inline-flex w-10 items-center justify-center text-[var(--ink-muted)] transition-colors hover:border-[var(--sage-deep)]/50 hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sage-deep)]"
                    )}
                    aria-label="Clear selected tags"
                  >
                    <XIcon className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className={cn(FIELD, "col-span-2 sm:w-auto")}>
            <Label
              id="recipe-catalog-view-label"
              className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
            >
              View
            </Label>
            <div
              role="group"
              aria-labelledby="recipe-catalog-view-label"
              className="flex h-10 w-full overflow-hidden border border-[var(--line)] bg-[var(--paper)] sm:w-auto"
            >
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={query.view === "grid"}
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center gap-1.5 px-3 text-sm transition-colors outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-[var(--sage-deep)]/30 sm:flex-none sm:px-3.5",
                  query.view === "grid"
                    ? "bg-[var(--sage)]/20 text-[var(--ink)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--sage)]/10 hover:text-[var(--ink)]"
                )}
                aria-label="Grid view"
              >
                <LayoutGridIcon className="size-4" aria-hidden />
                <span className="sm:sr-only">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={query.view === "list"}
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center gap-1.5 border-l border-[var(--line)] px-3 text-sm transition-colors outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-[var(--sage-deep)]/30 sm:flex-none sm:px-3.5",
                  query.view === "list"
                    ? "bg-[var(--sage)]/20 text-[var(--ink)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--sage)]/10 hover:text-[var(--ink)]"
                )}
                aria-label="List view"
              >
                <ListIcon className="size-4" aria-hidden />
                <span className="sm:sr-only">List</span>
              </button>
            </div>
          </div>
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
