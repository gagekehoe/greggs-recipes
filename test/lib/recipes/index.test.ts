import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/recipes/types";

const listLocalRecipes = vi.fn();
const getLocalRecipe = vi.fn();
const getLocalRecipeById = vi.fn();
const createLocalRecipe = vi.fn();
const updateLocalRecipe = vi.fn();
const deleteLocalRecipe = vi.fn();
const isSanityConfigured = vi.fn();
const getSanityClient = vi.fn();

vi.mock("@/lib/recipes/local-store", () => ({
  listLocalRecipes: (...args: unknown[]) => listLocalRecipes(...args),
  getLocalRecipe: (...args: unknown[]) => getLocalRecipe(...args),
  getLocalRecipeById: (...args: unknown[]) => getLocalRecipeById(...args),
  createLocalRecipe: (...args: unknown[]) => createLocalRecipe(...args),
  updateLocalRecipe: (...args: unknown[]) => updateLocalRecipe(...args),
  deleteLocalRecipe: (...args: unknown[]) => deleteLocalRecipe(...args),
}));

vi.mock("@/lib/recipes/sanity", () => ({
  isSanityConfigured: (...args: unknown[]) => isSanityConfigured(...args),
  getSanityClient: (...args: unknown[]) => getSanityClient(...args),
}));

function recipe(partial: Partial<Recipe> = {}): Recipe {
  return {
    id: "local-1",
    slug: "soup",
    title: "Soup",
    summary: "Warm",
    ingredients: ["stock"],
    steps: ["simmer"],
    tags: ["dinner"],
    prepMinutes: 5,
    cookMinutes: 10,
    servings: 2,
    imageUrl: "https://example.com/s.jpg",
    imageAlt: "soup",
    source: "local",
    updatedAt: "2026-01-01T00:00:00.000Z",
    authorId: "u1",
    authorName: "Cook",
    ...partial,
  };
}

describe("recipes facade", () => {
  beforeEach(() => {
    vi.resetModules();
    listLocalRecipes.mockReset();
    getLocalRecipe.mockReset();
    getLocalRecipeById.mockReset();
    createLocalRecipe.mockReset();
    updateLocalRecipe.mockReset();
    deleteLocalRecipe.mockReset();
    isSanityConfigured.mockReset();
    getSanityClient.mockReset();
    delete process.env.SANITY_API_WRITE_TOKEN;
  });

  it("lists local recipes when Sanity is off", async () => {
    isSanityConfigured.mockReturnValue(false);
    listLocalRecipes.mockResolvedValue([recipe()]);
    const { listRecipes, getContentMode, totalMinutes } = await import(
      "@/lib/recipes"
    );
    expect(getContentMode()).toBe("local");
    await expect(listRecipes()).resolves.toEqual({
      recipes: [recipe()],
      mode: "local",
    });
    expect(totalMinutes(recipe({ prepMinutes: 2, cookMinutes: 3 }))).toBe(5);
  });

  it("falls back to local when Sanity returns empty or errors", async () => {
    isSanityConfigured.mockReturnValue(true);
    const fetch = vi.fn();
    getSanityClient.mockReturnValue({ fetch });
    listLocalRecipes.mockResolvedValue([recipe()]);

    fetch.mockResolvedValue([]);
    const mod = await import("@/lib/recipes");
    expect(await mod.listRecipes()).toMatchObject({ mode: "local" });

    fetch.mockRejectedValue(new Error("boom"));
    expect(await mod.listRecipes()).toMatchObject({
      mode: "local",
      error: "boom",
    });
  });

  it("maps Sanity docs when present", async () => {
    isSanityConfigured.mockReturnValue(true);
    const fetch = vi.fn().mockResolvedValue([
      {
        _id: "s1",
        title: "Sanity Stew",
        slug: { current: "sanity-stew" },
        summary: "Hearty",
        ingredients: ["beef"],
        steps: ["braise"],
        tags: ["dinner"],
        prepMinutes: 15,
        cookMinutes: 90,
        servings: 4,
        authorId: "a1",
        authorName: "Ada",
        _updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ]);
    getSanityClient.mockReturnValue({ fetch });
    const { listRecipes } = await import("@/lib/recipes");
    const result = await listRecipes();
    expect(result.mode).toBe("sanity");
    expect(result.recipes[0]).toMatchObject({
      id: "s1",
      slug: "sanity-stew",
      title: "Sanity Stew",
      source: "sanity",
    });
  });

  it("gets recipes by slug in local mode and handles errors", async () => {
    isSanityConfigured.mockReturnValue(false);
    getLocalRecipe.mockResolvedValue(recipe());
    const { getRecipe } = await import("@/lib/recipes");
    expect(await getRecipe("soup")).toEqual({
      recipe: recipe(),
      mode: "local",
    });

    getLocalRecipe.mockRejectedValue(new Error("disk"));
    expect(await getRecipe("soup")).toEqual({
      recipe: null,
      mode: "local",
      error: "disk",
    });
  });

  it("creates locally when Sanity write token is missing", async () => {
    isSanityConfigured.mockReturnValue(true);
    getSanityClient.mockReturnValue({ create: vi.fn() });
    createLocalRecipe.mockResolvedValue(recipe({ title: "New" }));
    const { createRecipe } = await import("@/lib/recipes");
    const result = await createRecipe({
      title: "New",
      summary: "Brand new dish for the table tonight.",
      ingredients: ["a"],
      steps: ["b"],
      tags: [],
      prepMinutes: 1,
      cookMinutes: 1,
      servings: 1,
      authorId: "u1",
      authorName: "Cook",
    });
    expect(result.mode).toBe("local");
    expect(createLocalRecipe).toHaveBeenCalled();
  });

  it("updates and removes local recipes", async () => {
    isSanityConfigured.mockReturnValue(false);
    updateLocalRecipe.mockResolvedValue(recipe({ title: "Edited" }));
    deleteLocalRecipe.mockResolvedValue(true);
    getLocalRecipeById.mockResolvedValue(recipe());
    const { updateRecipe, removeRecipe, getRecipeById } = await import(
      "@/lib/recipes"
    );
    expect(
      await updateRecipe("local-1", {
        title: "Edited",
        summary: "Edited summary that stays long enough.",
        ingredients: ["a"],
        steps: ["b"],
        tags: [],
        prepMinutes: 1,
        cookMinutes: 1,
        servings: 1,
      })
    ).toMatchObject({ mode: "local", recipe: { title: "Edited" } });
    expect(await removeRecipe("local-1")).toBe(true);
    expect(await getRecipeById("local-1")).toEqual(recipe());
    expect(await getRecipeById("seed-1")).toEqual(recipe());
  });

  it("creates via Sanity when write token is present", async () => {
    isSanityConfigured.mockReturnValue(true);
    process.env.SANITY_API_WRITE_TOKEN = "token";
    const create = vi.fn().mockResolvedValue({
      _id: "s-new",
      _updatedAt: "2026-03-01T00:00:00.000Z",
    });
    getSanityClient.mockReturnValue({ create });
    const { createRecipe } = await import("@/lib/recipes");
    const result = await createRecipe({
      title: "Sanity Pie",
      summary: "A pie worth shipping to the CMS.",
      ingredients: ["flour"],
      steps: ["bake"],
      tags: ["Dessert"],
      prepMinutes: 20,
      cookMinutes: 40,
      servings: 8,
      authorId: "u1",
      authorName: "Cook",
    });
    expect(result.mode).toBe("sanity");
    expect(result.recipe.id).toBe("s-new");
    expect(create).toHaveBeenCalled();
  });

  it("gets a recipe by slug from Sanity with local fallback", async () => {
    isSanityConfigured.mockReturnValue(true);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        _id: "s1",
        title: "From Sanity",
        slug: { current: "from-sanity" },
      })
      .mockResolvedValueOnce(null);
    getSanityClient.mockReturnValue({ fetch });
    getLocalRecipe.mockResolvedValue(recipe({ slug: "local-fallback" }));

    const { getRecipe } = await import("@/lib/recipes");
    expect(await getRecipe("from-sanity")).toMatchObject({
      mode: "sanity",
      recipe: { slug: "from-sanity" },
    });
    expect(await getRecipe("missing")).toMatchObject({
      mode: "local",
      recipe: { slug: "local-fallback" },
    });
  });
});
