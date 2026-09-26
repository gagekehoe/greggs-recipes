"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogSort } from "@/lib/recipes/catalog-query";
import {
  myRecipesHref,
  type MyRecipesPhotoFilter,
  type MyRecipesQuery,
} from "@/lib/recipes/my-recipes-query";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<CatalogSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  rating: "Highest rated",
  "title-asc": "Title A–Z",
  "title-desc": "Title Z–A",
};

const PHOTO_LABELS: Record<MyRecipesPhotoFilter, string> = {
  all: "All",
  has: "Has photo",
  none: "No photo",
};

/**
 * Identical chrome to Browse catalog controls (PR #48 alignment).
 * Important overrides beat SelectTrigger md:h-9 / py-2 defaults.
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
  query: MyRecipesQuery;
  resultCount: number;
  totalCount: number;
  /** Preserve `?edit=` while changing sort/photo. */
  editId?: string | null;
};

export function MyRecipesControls({
  query,
  resultCount,
  totalCount,
  editId = null,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(next: MyRecipesQuery) {
    startTransition(() => {
      router.replace(myRecipesHref(next, editId), { scroll: false });
    });
  }

  function clearAll() {
    navigate({ sort: "newest", photo: "all" });
  }

  const hasFilters =
    query.sort !== "newest" || query.photo !== "all";

  return (
    <div
      className={cn(
        "mb-8 space-y-4 border-b border-[var(--line)] pb-8 md:mb-10",
        isPending && "opacity-80"
      )}
      aria-busy={isPending}
    >
      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:gap-4">
        <div className={cn(FIELD, "sm:w-48")}>
          <Label
            htmlFor="my-recipes-sort"
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
                id="my-recipes-sort"
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

        <div className={cn(FIELD, "sm:w-44")}>
          <Label
            htmlFor="my-recipes-photo"
            className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]"
          >
            Photo
          </Label>
          <div className="h-10 w-full">
            <Select
              value={query.photo}
              onValueChange={(value) => {
                if (!value) return;
                navigate({
                  ...query,
                  photo: value as MyRecipesPhotoFilter,
                });
              }}
            >
              <SelectTrigger
                id="my-recipes-photo"
                className={cn(SELECT_CONTROL_SURFACE, "w-full")}
              >
                <SelectValue>{PHOTO_LABELS[query.photo]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PHOTO_LABELS) as MyRecipesPhotoFilter[]).map(
                  (photo) => (
                    <SelectItem key={photo} value={photo}>
                      {PHOTO_LABELS[photo]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
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
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
