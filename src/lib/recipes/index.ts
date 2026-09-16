import { isDatabaseConfigured } from "@/lib/db";
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
import { slugify } from "./slug";
import type { Recipe, RecipeInput } from "./types";

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
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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

export type { Recipe, RecipeInput } from "./types";
export { slugify } from "./slug";
export {
  hasRecipeImage,
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
  _updatedAt?: string;
};

const RECIPE_QUERY = `*[_type == "recipe"] | order(_updatedAt desc) {
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
    updatedAt: doc._updatedAt || new Date().toISOString(),
    authorId: doc.authorId || "system",
    authorName: doc.authorName || "Gregg",
    isPrivate: Boolean(doc.isPrivate),
  };
}

/** Public recipes, plus the viewer's own private recipes when viewerId is set. */
export function filterRecipesForViewer(
  recipes: Recipe[],
  viewerId?: string | null
): Recipe[] {
  return recipes.filter(
    (recipe) => !recipe.isPrivate || recipe.authorId === viewerId
  );
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
   * Include private recipes owned by this user id.
   * Omit for public catalog (home, sitemap, GET /api/recipes).
   */
  includePrivateForUserId?: string | null;
};

export async function listRecipes(options?: ListRecipesOptions): Promise<{
  recipes: Recipe[];
  mode: ContentMode;
  error?: string;
}> {
  const mode = getContentMode();
  const viewerId = options?.includePrivateForUserId ?? null;

  const finalize = (recipes: Recipe[], resolvedMode: ContentMode, error?: string) => ({
    recipes: filterRecipesForViewer(recipes, viewerId),
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
          authorId, authorName, isPrivate, _updatedAt
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
  input: Omit<RecipeInput, "authorId" | "authorName">
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
      await client
        .patch(id)
        .set({
          title: input.title.trim(),
          summary: input.summary.trim(),
          ingredients: input.ingredients.map((i) => i.trim()).filter(Boolean),
          steps: input.steps.map((s) => s.trim()).filter(Boolean),
          tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
          prepMinutes: input.prepMinutes,
          cookMinutes: input.cookMinutes,
          servings: input.servings,
          imageUrl:
            input.imageUrl !== undefined
              ? input.imageUrl.trim() || ""
              : undefined,
          imageAlt:
            input.imageAlt !== undefined
              ? input.imageAlt.trim() || ""
              : undefined,
          isPrivate:
            input.isPrivate !== undefined ? Boolean(input.isPrivate) : undefined,
        })
        .commit();
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
