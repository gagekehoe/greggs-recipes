import { promises as fs } from "fs";
import path from "path";
import { SEED_RECIPES } from "./seed";
import type { Recipe, RecipeInput } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "recipes.json");

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureStore(): Promise<Recipe[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Recipe[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // file missing or invalid — seed it
  }
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(SEED_RECIPES, null, 2), "utf8");
  return structuredClone(SEED_RECIPES);
}

async function writeStore(recipes: Recipe[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(recipes, null, 2), "utf8");
}

export async function listLocalRecipes(): Promise<Recipe[]> {
  const recipes = await ensureStore();
  return recipes.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getLocalRecipe(slug: string): Promise<Recipe | null> {
  const recipes = await ensureStore();
  return recipes.find((r) => r.slug === slug) ?? null;
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
    imageUrl:
      input.imageUrl?.trim() ||
      "https://images.unsplash.com/photo-1495521821757-a1efb672935e?auto=format&fit=crop&w=1600&q=80",
    imageAlt: input.imageAlt?.trim() || `${input.title.trim()} plated`,
    source: "local",
    updatedAt: new Date().toISOString(),
  };

  recipes.unshift(recipe);
  await writeStore(recipes);
  return recipe;
}

export async function deleteLocalRecipe(id: string): Promise<boolean> {
  const recipes = await ensureStore();
  const next = recipes.filter((r) => r.id !== id);
  if (next.length === recipes.length) return false;
  await writeStore(next);
  return true;
}
