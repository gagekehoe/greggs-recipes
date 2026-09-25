import {
  DEFAULT_CATALOG_SORT,
  parseCatalogSort,
  sortRecipesByCatalog,
  type CatalogSort,
} from "./catalog-query";
import { hasRecipeImage } from "./image";
import type { Recipe } from "./types";

/** Photo filter for My recipes (`?photo=`). Default: all. */
export type MyRecipesPhotoFilter = "all" | "has" | "none";

export const DEFAULT_MY_RECIPES_PHOTO: MyRecipesPhotoFilter = "all";

export type MyRecipesQuery = {
  sort: CatalogSort;
  photo: MyRecipesPhotoFilter;
};

const PHOTO_VALUES = new Set<MyRecipesPhotoFilter>(["all", "has", "none"]);

export function parseMyRecipesPhoto(
  photoParam: string | string[] | undefined | null
): MyRecipesPhotoFilter {
  const raw = Array.isArray(photoParam) ? photoParam[0] : photoParam;
  if (typeof raw === "string" && PHOTO_VALUES.has(raw as MyRecipesPhotoFilter)) {
    return raw as MyRecipesPhotoFilter;
  }
  return DEFAULT_MY_RECIPES_PHOTO;
}

export function parseMyRecipesQuery(params: {
  sort?: string | string[] | undefined | null;
  photo?: string | string[] | undefined | null;
}): MyRecipesQuery {
  return {
    sort: parseCatalogSort(params.sort),
    photo: parseMyRecipesPhoto(params.photo),
  };
}

export function myRecipesQueryIsActive(query: MyRecipesQuery): boolean {
  return (
    query.sort !== DEFAULT_CATALOG_SORT ||
    query.photo !== DEFAULT_MY_RECIPES_PHOTO
  );
}

export function filterRecipesByPhoto(
  recipes: readonly Recipe[],
  photo: MyRecipesPhotoFilter
): Recipe[] {
  if (photo === "all") return [...recipes];
  if (photo === "has") {
    return recipes.filter((recipe) => hasRecipeImage(recipe.imageUrl));
  }
  return recipes.filter((recipe) => !hasRecipeImage(recipe.imageUrl));
}

export function applyMyRecipesQuery(
  recipes: readonly Recipe[],
  query: MyRecipesQuery
): Recipe[] {
  return sortRecipesByCatalog(
    filterRecipesByPhoto(recipes, query.photo),
    query.sort
  );
}

/**
 * Build shareable query params for `/my-recipes`.
 * Omits defaults (`sort=newest`, `photo=all`). Preserves `edit` when set.
 */
export function buildMyRecipesSearchParams(
  query: MyRecipesQuery,
  editId?: string | null
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.sort !== DEFAULT_CATALOG_SORT) params.set("sort", query.sort);
  if (query.photo !== DEFAULT_MY_RECIPES_PHOTO) params.set("photo", query.photo);
  if (editId && editId.trim()) params.set("edit", editId.trim());
  return params;
}

export function myRecipesHref(
  query: MyRecipesQuery,
  editId?: string | null
): string {
  const params = buildMyRecipesSearchParams(query, editId);
  const qs = params.toString();
  return qs ? `/my-recipes?${qs}` : "/my-recipes";
}
