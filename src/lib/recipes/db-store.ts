import { desc, eq } from "drizzle-orm";
import {
  db,
  isDatabaseConfigured,
  recipes as recipesTable,
  type DbRecipe,
} from "@/lib/db";
import { CAJUN_TUNA_BOWL_SEED } from "./seed";
import { slugify } from "./slug";
import type { Recipe, RecipeInput } from "./types";

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(Boolean);
  } catch {
    return [];
  }
}

function toIso(value: Date | number | string): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime())
    ? new Date().toISOString()
    : asDate.toISOString();
}

function mapRow(row: DbRecipe): Recipe {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary || "",
    ingredients: parseStringArray(row.ingredients),
    steps: parseStringArray(row.steps),
    tags: parseStringArray(row.tags),
    prepMinutes: row.prepMinutes ?? 0,
    cookMinutes: row.cookMinutes ?? 0,
    servings: row.servings ?? 1,
    imageUrl: row.imageUrl?.trim() || "",
    imageAlt:
      row.imageAlt ||
      (row.imageUrl?.trim() ? `${row.title} plated` : ""),
    source: "db",
    updatedAt: toIso(row.updatedAt),
    authorId: row.authorId,
    authorName: row.authorName,
    isPrivate: Boolean(row.isPrivate),
  };
}

function rowValuesFromRecipe(recipe: Recipe) {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    summary: recipe.summary,
    ingredients: JSON.stringify(recipe.ingredients),
    steps: JSON.stringify(recipe.steps),
    tags: JSON.stringify(recipe.tags),
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    servings: recipe.servings,
    imageUrl: recipe.imageUrl,
    imageAlt: recipe.imageAlt,
    authorId: recipe.authorId,
    authorName: recipe.authorName,
    isPrivate: recipe.isPrivate ?? false,
    updatedAt: new Date(recipe.updatedAt),
  };
}

let ensureSeedPromise: Promise<void> | null = null;

/**
 * Idempotently insert the Cajun tuna bowl when the catalog is empty or the
 * canonical slug is missing. Safe to call on every request path.
 */
export async function ensureDbRecipeSeed(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!ensureSeedPromise) {
    ensureSeedPromise = (async () => {
      try {
        const existing = await db
          .select({ id: recipesTable.id })
          .from(recipesTable)
          .where(eq(recipesTable.slug, CAJUN_TUNA_BOWL_SEED.slug))
          .limit(1);
        if (existing.length > 0) return;

        await db
          .insert(recipesTable)
          .values(rowValuesFromRecipe({ ...CAJUN_TUNA_BOWL_SEED, source: "db" }));
      } catch (error) {
        console.error("[recipes] ensureDbRecipeSeed failed:", error);
        // Allow a retry on the next request.
        ensureSeedPromise = null;
      }
    })();
  }
  await ensureSeedPromise;
}

export async function listDbRecipes(): Promise<Recipe[]> {
  await ensureDbRecipeSeed();
  const rows = await db
    .select()
    .from(recipesTable)
    .orderBy(desc(recipesTable.updatedAt));
  return rows.map(mapRow);
}

export async function getDbRecipe(slug: string): Promise<Recipe | null> {
  await ensureDbRecipeSeed();
  const rows = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.slug, slug))
    .limit(1);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getDbRecipeById(id: string): Promise<Recipe | null> {
  await ensureDbRecipeSeed();
  const rows = await db
    .select()
    .from(recipesTable)
    .where(eq(recipesTable.id, id))
    .limit(1);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createDbRecipe(input: RecipeInput): Promise<Recipe> {
  await ensureDbRecipeSeed();
  let slug = slugify(input.title) || `recipe-${Date.now()}`;
  const clash = await db
    .select({ id: recipesTable.id })
    .from(recipesTable)
    .where(eq(recipesTable.slug, slug))
    .limit(1);
  if (clash.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const recipe: Recipe = {
    id: crypto.randomUUID(),
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
    source: "db",
    updatedAt: new Date().toISOString(),
    authorId: input.authorId,
    authorName: input.authorName,
    isPrivate: Boolean(input.isPrivate),
  };

  await db.insert(recipesTable).values(rowValuesFromRecipe(recipe));
  return recipe;
}

export async function updateDbRecipe(
  id: string,
  input: Omit<RecipeInput, "authorId" | "authorName">
): Promise<Recipe | null> {
  await ensureDbRecipeSeed();
  const current = await getDbRecipeById(id);
  if (!current) return null;

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
    isPrivate:
      input.isPrivate !== undefined
        ? Boolean(input.isPrivate)
        : current.isPrivate,
    source: "db",
    updatedAt: new Date().toISOString(),
  };

  await db
    .update(recipesTable)
    .set(rowValuesFromRecipe(updated))
    .where(eq(recipesTable.id, id));
  return updated;
}

export async function deleteDbRecipe(id: string): Promise<boolean> {
  const result = await db
    .delete(recipesTable)
    .where(eq(recipesTable.id, id))
    .returning({ id: recipesTable.id });
  return result.length > 0;
}
