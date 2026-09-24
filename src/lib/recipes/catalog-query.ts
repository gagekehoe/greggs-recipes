import type { Recipe } from "./types";

/** Shareable catalog sort values (`?sort=`). Default: newest. */
export type CatalogSort = "newest" | "title-asc" | "title-desc";

/** Browse layout: grid cards (default) or compact list rows. */
export type CatalogView = "grid" | "list";

export const DEFAULT_CATALOG_SORT: CatalogSort = "newest";
export const DEFAULT_CATALOG_VIEW: CatalogView = "grid";

/** localStorage key for persisting Browse view when URL omits `view`. */
export const CATALOG_VIEW_STORAGE_KEY = "greggs-recipes:catalog-view";

export type CatalogQuery = {
  q: string;
  sort: CatalogSort;
  /** Normalized lowercase tags (multi-select). */
  tags: string[];
  view: CatalogView;
};

const SORT_VALUES = new Set<CatalogSort>([
  "newest",
  "title-asc",
  "title-desc",
]);

const VIEW_VALUES = new Set<CatalogView>(["grid", "list"]);

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Accept repeated `tag` params and/or a single comma-separated `tag` value.
 * Ignores empty segments.
 */
export function parseCatalogTags(
  tagParam: string | string[] | undefined | null
): string[] {
  if (tagParam == null) return [];
  const parts = Array.isArray(tagParam) ? tagParam : [tagParam];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    for (const segment of String(part).split(",")) {
      const tag = normalizeTag(segment);
      if (!tag || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

export function parseCatalogSort(
  sortParam: string | string[] | undefined | null
): CatalogSort {
  const raw = Array.isArray(sortParam) ? sortParam[0] : sortParam;
  if (typeof raw === "string" && SORT_VALUES.has(raw as CatalogSort)) {
    return raw as CatalogSort;
  }
  return DEFAULT_CATALOG_SORT;
}

export function parseCatalogView(
  viewParam: string | string[] | undefined | null
): CatalogView {
  const raw = Array.isArray(viewParam) ? viewParam[0] : viewParam;
  if (typeof raw === "string" && VIEW_VALUES.has(raw as CatalogView)) {
    return raw as CatalogView;
  }
  return DEFAULT_CATALOG_VIEW;
}

export function parseCatalogQuery(params: {
  q?: string | string[] | undefined | null;
  sort?: string | string[] | undefined | null;
  tag?: string | string[] | undefined | null;
  view?: string | string[] | undefined | null;
}): CatalogQuery {
  const qRaw = Array.isArray(params.q) ? params.q[0] : params.q;
  const q =
    typeof qRaw === "string" ? qRaw.trim().replace(/\s+/g, " ") : "";
  return {
    q,
    sort: parseCatalogSort(params.sort),
    tags: parseCatalogTags(params.tag),
    view: parseCatalogView(params.view),
  };
}

export function catalogQueryIsActive(query: CatalogQuery): boolean {
  return (
    query.q.length > 0 ||
    query.tags.length > 0 ||
    query.sort !== DEFAULT_CATALOG_SORT
  );
}

/** Unique tags from the visible catalog, A–Z. */
export function collectCatalogTags(recipes: readonly Recipe[]): string[] {
  const seen = new Set<string>();
  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      const normalized = normalizeTag(tag);
      if (normalized) seen.add(normalized);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function matchesSearch(recipe: Recipe, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (recipe.title.toLowerCase().includes(needle)) return true;
  if (recipe.summary.toLowerCase().includes(needle)) return true;
  return recipe.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function matchesTags(recipe: Recipe, tags: readonly string[]): boolean {
  if (tags.length === 0) return true;
  const recipeTags = new Set(recipe.tags.map(normalizeTag));
  return tags.every((tag) => recipeTags.has(tag));
}

export function filterRecipesByCatalogQuery(
  recipes: readonly Recipe[],
  query: CatalogQuery
): Recipe[] {
  return recipes.filter(
    (recipe) => matchesSearch(recipe, query.q) && matchesTags(recipe, query.tags)
  );
}

export function sortRecipesByCatalog(
  recipes: readonly Recipe[],
  sort: CatalogSort
): Recipe[] {
  const copy = [...recipes];
  if (sort === "title-asc") {
    copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    return copy;
  }
  if (sort === "title-desc") {
    copy.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));
    return copy;
  }
  // newest — updatedAt descending (stable store default)
  copy.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return copy;
}

export function applyCatalogQuery(
  recipes: readonly Recipe[],
  query: CatalogQuery
): Recipe[] {
  return sortRecipesByCatalog(
    filterRecipesByCatalogQuery(recipes, query),
    query.sort
  );
}

/**
 * Build a shareable query string for the home catalog.
 * Omits defaults (`sort=newest`, `view=grid`, empty q/tags).
 */
export function buildCatalogSearchParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sort !== DEFAULT_CATALOG_SORT) params.set("sort", query.sort);
  for (const tag of query.tags) {
    params.append("tag", tag);
  }
  if (query.view !== DEFAULT_CATALOG_VIEW) params.set("view", query.view);
  return params;
}

export function catalogHref(query: CatalogQuery, hash = "recipes"): string {
  const params = buildCatalogSearchParams(query);
  const qs = params.toString();
  const path = qs ? `/?${qs}` : "/";
  return hash ? `${path}#${hash}` : path;
}
