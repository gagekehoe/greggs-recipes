import { isDatabaseConfigured } from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import {
  createDbRecipe,
  deleteDbRecipe,
  getDbRecipe,
  getDbRecipeById,
  listDbRecipes,
  updateDbRecipe,
} from "./db-store";
import {
  createLocalRecipe,
  deleteLocalRecipe,
  getLocalRecipe,
  getLocalRecipeById,
  getSeedRecipes,
  listLocalRecipes,
  updateLocalRecipe,
} from "./local-store";
import { getSanityClient, isSanityConfigured } from "./sanity";
import { listSharedRecipeIdsForViewer } from "./shares";
import { slugify } from "./slug";
import type { Recipe, RecipeInput, RecipePatchInput } from "./types";

/** Never ship an empty pantry when seed dishes exist. */
async function localRecipesOrSeed(): Promise<Recipe[]> {
  try {
    const local = await listLocalRecipes();
    if (local.length > 0) return local;
  } catch {
    // fall through to in-memory seeds
  }
  return getSeedRecipes().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function localRecipeOrSeedBySlug(slug: string): Promise<Recipe | null> {
  try {
    const local = await getLocalRecipe(slug);
    if (local) return local;
  } catch {
    // fall through
  }
  return getSeedRecipes().find((r) => r.slug === slug) ?? null;
}

async function localRecipeOrSeedById(id: string): Promise<Recipe | null> {
  try {
    const local = await getLocalRecipeById(id);
    if (local) return local;
  } catch {
    // fall through
  }
  return getSeedRecipes().find((r) => r.id === id) ?? null;
}

export type { Recipe, RecipeInput, RecipePatchInput } from "./types";
export { slugify } from "./slug";
export {
  hasRealRecipePhoto,
  hasRecipeImage,
  pickHomeBannerRecipe,
  recipeImageInitials,
  recipePlaceholderTone,
  resolveRecipeImageUrl,
} from "./image";

type SanityRecipeDoc = {
  _id: string;
  title: string;
  slug?: { current?: string };
  summary?: string;
  ingredients?: string[];
  steps?: string[];
  tags?: string[];
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  imageUrl?: string;
  imageAlt?: string;
  authorId?: string;
  authorName?: string;
  isPrivate?: boolean;
  inspiredBy?: string;
  inspiredByUrl?: string;
  _createdAt?: string;
  _updatedAt?: string;
};

const RECIPE_QUERY = `*[_type == "recipe"] | order(_createdAt desc) {
  _id,
  title,
  slug,
  summary,
  ingredients,
  steps,
  tags,
  prepMinutes,
  cookMinutes,
  servings,
  imageUrl,
  imageAlt,
  authorId,
  authorName,
  isPrivate,
  inspiredBy,
  inspiredByUrl,
  _createdAt,
  _updatedAt
}`;

const RECIPE_BY_SLUG_QUERY = `*[_type == "recipe" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  summary,
  ingredients,
  steps,
  tags,
  prepMinutes,
  cookMinutes,
  servings,
  imageUrl,
  imageAlt,
  authorId,
  authorName,
  isPrivate,
  inspiredBy,
  inspiredByUrl,
  _createdAt,
  _updatedAt
}`;

function mapSanityRecipe(doc: SanityRecipeDoc): Recipe {
  const slug =
    doc.slug?.current ||
    doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: doc._id,
    slug,
    title: doc.title,
    summary: doc.summary || "",
    ingredients: doc.ingredients || [],
    steps: doc.steps || [],
    tags: doc.tags || [],
    prepMinutes: doc.prepMinutes ?? 0,
    cookMinutes: doc.cookMinutes ?? 0,
    servings: doc.servings ?? 1,
    imageUrl: doc.imageUrl?.trim() || "",
    imageAlt:
      doc.imageAlt ||
      (doc.imageUrl?.trim() ? `${doc.title} plated` : ""),
    source: "sanity",
    createdAt: doc._createdAt || doc._updatedAt || new Date().toISOString(),
    updatedAt: doc._updatedAt || new Date().toISOString(),
    authorId: doc.authorId || "system",
    authorName: doc.authorName || "Gregg",
    isPrivate: Boolean(doc.isPrivate),
    inspiredBy: doc.inspiredBy?.trim() || "",
    inspiredByUrl: doc.inspiredByUrl?.trim() || "",
  };
}

/**
 * Public recipes, plus the viewer's own private recipes and any private
 * recipes shared with them (by user id or role) when those ids are provided.
 */
export function filterRecipesForViewer(
  recipes: Recipe[],
  viewerId?: string | null,
  sharedRecipeIds?: ReadonlySet<string>
): Recipe[] {
  return recipes.filter((recipe) => {
    if (!recipe.isPrivate) return true;
    if (viewerId && recipe.authorId === viewerId) return true;
    if (viewerId && sharedRecipeIds?.has(recipe.id)) return true;
    return false;
  });
}

/**
 * Production prefers Neon/SQLite (`db`) when a database is configured.
 * Sanity remains an optional legacy CMS path. Local JSON/seeds are the
 * last-resort fallback (and the only option on Vercel without DATABASE_URL).
 */
export type ContentMode = "db" | "sanity" | "local";

export function getContentMode(): ContentMode {
  if (isDatabaseConfigured()) return "db";
  if (isSanityConfigured()) return "sanity";
  return "local";
}

export type ListRecipesOptions = {
  /**
   * Include private recipes owned by this user id, and private recipes
   * shared with them (when a database is configured).
   * Home passes the signed-in user so authors and sharees see those dishes in Browse.
   * Omit for the public catalog (sitemap, GET /api/recipes without mine).
   */
  includePrivateForUserId?: string | null;
  /** Viewer role — enables role-based share grants in the catalog. */
  viewerRole?: Role | null;
};

export async function listRecipes(options?: ListRecipesOptions): Promise<{
  recipes: Recipe[];
  mode: ContentMode;
  error?: string;
}> {
  const mode = getContentMode();
  const viewerId = options?.includePrivateForUserId ?? null;
  const sharedRecipeIds =
    viewerId != null
      ? await listSharedRecipeIdsForViewer(viewerId, options?.viewerRole)
      : new Set<string>();

  const finalize = (recipes: Recipe[], resolvedMode: ContentMode, error?: string) => ({
    recipes: filterRecipesForViewer(recipes, viewerId, sharedRecipeIds),
    mode: resolvedMode,
    ...(error ? { error } : {}),
  });

  if (mode === "db") {
    try {
      const recipes = await listDbRecipes();
      return finalize(recipes, mode);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recipes from database";
      const local = await localRecipesOrSeed();
      return finalize(local, "local", message);
    }
  }

  if (mode === "sanity") {
    try {
      const client = getSanityClient();
      if (!client) throw new Error("Sanity client unavailable");
      const docs = await client.fetch<SanityRecipeDoc[]>(RECIPE_QUERY);
      if (!docs?.length) {
        const local = await localRecipesOrSeed();
        return finalize(local, "local");
      }
      return finalize(docs.map(mapSanityRecipe), mode);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recipes from Sanity";
      const local = await localRecipesOrSeed();
      return finalize(local, "local", message);
    }
  }

  try {
    const recipes = await localRecipesOrSeed();
    return finalize(recipes, mode);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load local recipes";
    return finalize(getSeedRecipes(), mode, message);
  }
}

export async function getRecipe(slug: string): Promise<{
  recipe: Recipe | null;
  mode: ContentMode;
  error?: string;
}> {
  const mode = getContentMode();

  if (mode === "db") {
    try {
      const recipe = await getDbRecipe(slug);
      return { recipe, mode };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recipe from database";
      const local = await localRecipeOrSeedBySlug(slug);
      return { recipe: local, mode: "local", error: message };
    }
  }

  if (mode === "sanity") {
    try {
      const client = getSanityClient();
      if (!client) throw new Error("Sanity client unavailable");
      const doc = await client.fetch<SanityRecipeDoc | null>(
        RECIPE_BY_SLUG_QUERY,
        { slug }
      );
      if (doc) return { recipe: mapSanityRecipe(doc), mode };
      const local = await localRecipeOrSeedBySlug(slug);
      return { recipe: local, mode: local ? "local" : mode };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recipe from Sanity";
      const local = await localRecipeOrSeedBySlug(slug);
      return { recipe: local, mode: "local", error: message };
    }
  }

  try {
    const recipe = await localRecipeOrSeedBySlug(slug);
    return { recipe, mode };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load recipe";
    return {
      recipe: getSeedRecipes().find((r) => r.slug === slug) ?? null,
      mode,
      error: message,
    };
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  if (isDatabaseConfigured()) {
    try {
      const fromDb = await getDbRecipeById(id);
      if (fromDb) return fromDb;
    } catch {
      // fall through
    }
  }

  if (id.startsWith("local-") || id.startsWith("seed-")) {
    return localRecipeOrSeedById(id);
  }

  const client = getSanityClient();
  if (client) {
    try {
      const doc = await client.fetch<SanityRecipeDoc | null>(
        `*[_type == "recipe" && _id == $id][0]{
          _id, title, slug, summary, ingredients, steps, tags,
          prepMinutes, cookMinutes, servings, imageUrl, imageAlt,
          authorId, authorName, isPrivate, inspiredBy, inspiredByUrl, _createdAt, _updatedAt
        }`,
        { id }
      );
      if (doc) return mapSanityRecipe(doc);
    } catch {
      // fall through
    }
  }
  return localRecipeOrSeedById(id);
}

export async function createRecipe(input: RecipeInput): Promise<{
  recipe: Recipe;
  mode: ContentMode;
}> {
  const mode = getContentMode();

  if (mode === "db") {
    const recipe = await createDbRecipe(input);
    return { recipe, mode };
  }

  if (mode === "sanity") {
    const client = getSanityClient(true);
    if (!client || !process.env.SANITY_API_WRITE_TOKEN) {
      const recipe = await createLocalRecipe(input);
      return { recipe, mode: "local" };
    }
    const slug = slugify(input.title) || `recipe-${Date.now()}`;
    const doc = await client.create({
      _type: "recipe",
      title: input.title.trim(),
      slug: { _type: "slug", current: slug },
      summary: input.summary.trim(),
      ingredients: input.ingredients.map((i) => i.trim()).filter(Boolean),
      steps: input.steps.map((s) => s.trim()).filter(Boolean),
      tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      servings: input.servings,
      imageUrl: input.imageUrl?.trim() || "",
      imageAlt:
        input.imageAlt?.trim() ||
        (input.imageUrl?.trim() ? `${input.title.trim()} plated` : ""),
      authorId: input.authorId,
      authorName: input.authorName,
      isPrivate: Boolean(input.isPrivate),
      inspiredBy: input.inspiredBy?.trim() || "",
      inspiredByUrl: input.inspiredByUrl?.trim() || "",
    });
    return {
      recipe: mapSanityRecipe({
        _id: doc._id,
        title: input.title.trim(),
        slug: { current: slug },
        summary: input.summary.trim(),
        ingredients: input.ingredients,
        steps: input.steps,
        tags: input.tags,
        prepMinutes: input.prepMinutes,
        cookMinutes: input.cookMinutes,
        servings: input.servings,
        imageUrl: input.imageUrl,
        imageAlt: input.imageAlt,
        authorId: input.authorId,
        authorName: input.authorName,
        isPrivate: Boolean(input.isPrivate),
        inspiredBy: input.inspiredBy?.trim() || "",
        inspiredByUrl: input.inspiredByUrl?.trim() || "",
        _createdAt: doc._createdAt,
        _updatedAt: doc._updatedAt,
      }),
      mode,
    };
  }

  const recipe = await createLocalRecipe(input);
  return { recipe, mode };
}

export async function updateRecipe(
  id: string,
  input: RecipePatchInput
): Promise<{ recipe: Recipe; mode: ContentMode } | null> {
  const mode = getContentMode();

  if (mode === "db") {
    const recipe = await updateDbRecipe(id, input);
    if (!recipe) return null;
    return { recipe, mode };
  }

  if (
    !id.startsWith("local-") &&
    !id.startsWith("seed-") &&
    mode === "sanity"
  ) {
    const client = getSanityClient(true);
    if (client && process.env.SANITY_API_WRITE_TOKEN) {
      const sanitySet: Record<string, unknown> = {};
      if (input.title !== undefined) sanitySet.title = input.title.trim();
      if (input.summary !== undefined) sanitySet.summary = input.summary.trim();
      if (input.ingredients !== undefined) {
        sanitySet.ingredients = input.ingredients
          .map((i) => i.trim())
          .filter(Boolean);
      }
      if (input.steps !== undefined) {
        sanitySet.steps = input.steps.map((s) => s.trim()).filter(Boolean);
      }
      if (input.tags !== undefined) {
        sanitySet.tags = input.tags
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
      }
      if (input.prepMinutes !== undefined) {
        sanitySet.prepMinutes = input.prepMinutes;
      }
      if (input.cookMinutes !== undefined) {
        sanitySet.cookMinutes = input.cookMinutes;
      }
      if (input.servings !== undefined) sanitySet.servings = input.servings;
      if (input.imageUrl !== undefined) {
        sanitySet.imageUrl = input.imageUrl.trim() || "";
      }
      if (input.imageAlt !== undefined) {
        sanitySet.imageAlt = input.imageAlt.trim() || "";
      }
      if (input.isPrivate !== undefined) {
        sanitySet.isPrivate = Boolean(input.isPrivate);
      }
      if (input.inspiredBy !== undefined) {
        sanitySet.inspiredBy = input.inspiredBy.trim() || "";
      }
      if (input.inspiredByUrl !== undefined) {
        sanitySet.inspiredByUrl = input.inspiredByUrl.trim() || "";
      }
      if (Object.keys(sanitySet).length > 0) {
        await client.patch(id).set(sanitySet).commit();
      }
      const recipe = await getRecipeById(id);
      if (!recipe) return null;
      return { recipe, mode };
    }
  }

  const recipe = await updateLocalRecipe(id, input);
  if (!recipe) return null;
  return { recipe, mode: "local" };
}

export async function removeRecipe(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) {
    try {
      const deleted = await deleteDbRecipe(id);
      if (deleted) return true;
    } catch {
      // fall through to other stores
    }
  }

  if (id.startsWith("drafts.") || (!id.startsWith("local-") && !id.startsWith("seed-"))) {
    const client = getSanityClient(true);
    if (client && process.env.SANITY_API_WRITE_TOKEN) {
      await client.delete(id);
      return true;
    }
  }
  return deleteLocalRecipe(id);
}

export function totalMinutes(recipe: Recipe): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}
