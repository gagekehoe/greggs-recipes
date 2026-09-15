import { promises as fs } from "fs";
import path from "path";
import { SEED_RECIPES } from "./seed";
import { slugify } from "./slug";
import type { Recipe, RecipeInput } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "recipes.json");

const SYSTEM_AUTHOR = {
  authorId: "system",
  authorName: "Gregg",
};

const READ_ONLY_STORE_MESSAGE =
  "Local recipe JSON is read-only on serverless. Set DATABASE_URL (Neon) for durable recipes, or edit recipes locally.";

/**
 * Writable `data/recipes.json` is for local/dev fallback only.
 * On Vercel/Lambda the filesystem is read-only — never open or write that path.
 * Production durable writes go through Neon (`recipe` table) when DATABASE_URL is set.
 */
export function isLocalRecipeStoreWritable(): boolean {
  return !(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

function normalizeRecipe(raw: Partial<Recipe> & Pick<Recipe, "id" | "slug" | "title">): Recipe {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title,
    summary: raw.summary || "",
    ingredients: raw.ingredients || [],
    steps: raw.steps || [],
    tags: raw.tags || [],
    prepMinutes: raw.prepMinutes ?? 0,
    cookMinutes: raw.cookMinutes ?? 0,
    servings: raw.servings ?? 1,
    imageUrl: raw.imageUrl?.trim() || "",
    imageAlt: raw.imageAlt || (raw.imageUrl?.trim() ? `${raw.title} plated` : ""),
    source: raw.source || "local",
    updatedAt: raw.updatedAt || new Date().toISOString(),
    authorId: raw.authorId || SYSTEM_AUTHOR.authorId,
    authorName: raw.authorName || SYSTEM_AUTHOR.authorName,
  };
}

/** In-memory seed catalog — safe on serverless (no filesystem). */
export function getSeedRecipes(): Recipe[] {
  return SEED_RECIPES.map((r) => normalizeRecipe(r));
}

function sortByUpdatedAt(recipes: Recipe[]): Recipe[] {
  return recipes.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function isSmokeTestRecipe(r: Partial<Recipe>): boolean {
  const slug = r.slug || "";
  return (
    slug.startsWith("kitchen-desk") ||
    slug.startsWith("test-mac") ||
    r.title === "Kitchen Desk Fix Check" ||
    r.title === "Test Mac Soup"
  );
}

async function ensureStore(): Promise<Recipe[]> {
  // Serverless: never touch recipes.json (EROFS). Use compiled-in seeds.
  if (!isLocalRecipeStoreWritable()) {
    return getSeedRecipes();
  }

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Recipe>[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed
        .filter((r) => !isSmokeTestRecipe(r))
        .map((r) => normalizeRecipe(r as Recipe));
      if (cleaned.length > 0) {
        // Persist cleanup only when junk was removed; avoid needless writes.
        if (cleaned.length !== parsed.length) {
          await writeStore(cleaned);
        }
        return cleaned;
      }
    }
  } catch {
    // file missing or invalid — seed it
  }

  const seeded = getSeedRecipes();
  await writeStore(seeded);
  return structuredClone(seeded);
}

async function writeStore(recipes: Recipe[]): Promise<void> {
  if (!isLocalRecipeStoreWritable()) {
    throw new Error(READ_ONLY_STORE_MESSAGE);
  }
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(recipes, null, 2), "utf8");
}

export async function listLocalRecipes(): Promise<Recipe[]> {
  const recipes = await ensureStore();
  return sortByUpdatedAt(recipes);
}

export async function getLocalRecipe(slug: string): Promise<Recipe | null> {
  const recipes = await ensureStore();
  return recipes.find((r) => r.slug === slug) ?? null;
}

export async function getLocalRecipeById(id: string): Promise<Recipe | null> {
  const recipes = await ensureStore();
  return recipes.find((r) => r.id === id) ?? null;
}

export async function createLocalRecipe(input: RecipeInput): Promise<Recipe> {
  const recipes = await ensureStore();
  let slug = slugify(input.title) || `recipe-${Date.now()}`;
  const existing = new Set(recipes.map((r) => r.slug));
  if (existing.has(slug)) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const recipe: Recipe = {
    id: `local-${Date.now()}`,
    slug,
    title: input.title.trim(),
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
    source: "local",
    updatedAt: new Date().toISOString(),
    authorId: input.authorId,
    authorName: input.authorName,
  };

  recipes.unshift(recipe);
  await writeStore(recipes);
  return recipe;
}

export async function updateLocalRecipe(
  id: string,
  input: Omit<RecipeInput, "authorId" | "authorName">
): Promise<Recipe | null> {
  const recipes = await ensureStore();
  const index = recipes.findIndex((r) => r.id === id);
  if (index < 0) return null;

  const current = recipes[index];
  const updated: Recipe = {
    ...current,
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
        ? input.imageUrl.trim()
        : current.imageUrl,
    imageAlt:
      input.imageAlt?.trim() ||
      current.imageAlt ||
      (input.imageUrl?.trim() || current.imageUrl
        ? `${input.title.trim()} plated`
        : ""),
    updatedAt: new Date().toISOString(),
  };

  recipes[index] = updated;
  await writeStore(recipes);
  return updated;
}

export async function deleteLocalRecipe(id: string): Promise<boolean> {
  const recipes = await ensureStore();
  const next = recipes.filter((r) => r.id !== id);
  if (next.length === recipes.length) return false;
  await writeStore(next);
  return true;
}
