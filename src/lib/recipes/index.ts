import {
  createLocalRecipe,
  deleteLocalRecipe,
  getLocalRecipe,
  getLocalRecipeById,
  listLocalRecipes,
  updateLocalRecipe,
} from "./local-store";
import { getSanityClient, isSanityConfigured } from "./sanity";
import { slugify } from "./slug";
import type { Recipe, RecipeInput } from "./types";

export type { Recipe, RecipeInput } from "./types";
export { slugify } from "./slug";

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
    imageUrl:
      doc.imageUrl ||
      "https://images.unsplash.com/photo-1495521821757-a1efb672935e?auto=format&fit=crop&w=1600&q=80",
    imageAlt: doc.imageAlt || `${doc.title} plated`,
    source: "sanity",
    updatedAt: doc._updatedAt || new Date().toISOString(),
    authorId: doc.authorId || "system",
    authorName: doc.authorName || "Gregg's Kitchen",
  };
}

export type ContentMode = "sanity" | "local";

export function getContentMode(): ContentMode {
  return isSanityConfigured() ? "sanity" : "local";
}

export async function listRecipes(): Promise<{
  recipes: Recipe[];
  mode: ContentMode;
  error?: string;
}> {
  const mode = getContentMode();

  if (mode === "sanity") {
    try {
      const client = getSanityClient();
      if (!client) throw new Error("Sanity client unavailable");
      const docs = await client.fetch<SanityRecipeDoc[]>(RECIPE_QUERY);
      if (!docs?.length) {
        const local = await listLocalRecipes();
        return { recipes: local, mode: "local" };
      }
      return { recipes: docs.map(mapSanityRecipe), mode };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recipes from Sanity";
      const local = await listLocalRecipes();
      return { recipes: local, mode: "local", error: message };
    }
  }

  try {
    const recipes = await listLocalRecipes();
    return { recipes, mode };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load local recipes";
    return { recipes: [], mode, error: message };
  }
}

export async function getRecipe(slug: string): Promise<{
  recipe: Recipe | null;
  mode: ContentMode;
  error?: string;
}> {
  const mode = getContentMode();

  if (mode === "sanity") {
    try {
      const client = getSanityClient();
      if (!client) throw new Error("Sanity client unavailable");
      const doc = await client.fetch<SanityRecipeDoc | null>(
        RECIPE_BY_SLUG_QUERY,
        { slug }
      );
      if (doc) return { recipe: mapSanityRecipe(doc), mode };
      const local = await getLocalRecipe(slug);
      return { recipe: local, mode: local ? "local" : mode };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load recipe from Sanity";
      const local = await getLocalRecipe(slug);
      return { recipe: local, mode: "local", error: message };
    }
  }

  try {
    const recipe = await getLocalRecipe(slug);
    return { recipe, mode };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load recipe";
    return { recipe: null, mode, error: message };
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  if (id.startsWith("local-") || id.startsWith("seed-")) {
    return getLocalRecipeById(id);
  }
  const client = getSanityClient();
  if (client) {
    try {
      const doc = await client.fetch<SanityRecipeDoc | null>(
        `*[_type == "recipe" && _id == $id][0]{
          _id, title, slug, summary, ingredients, steps, tags,
          prepMinutes, cookMinutes, servings, imageUrl, imageAlt,
          authorId, authorName, _updatedAt
        }`,
        { id }
      );
      if (doc) return mapSanityRecipe(doc);
    } catch {
      // fall through
    }
  }
  return getLocalRecipeById(id);
}

export async function createRecipe(input: RecipeInput): Promise<{
  recipe: Recipe;
  mode: ContentMode;
}> {
  const mode = getContentMode();

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
      imageUrl:
        input.imageUrl?.trim() ||
        "https://images.unsplash.com/photo-1495521821757-a1efb672935e?auto=format&fit=crop&w=1600&q=80",
      imageAlt: input.imageAlt?.trim() || `${input.title.trim()} plated`,
      authorId: input.authorId,
      authorName: input.authorName,
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
          imageUrl: input.imageUrl?.trim() || undefined,
          imageAlt: input.imageAlt?.trim() || undefined,
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
