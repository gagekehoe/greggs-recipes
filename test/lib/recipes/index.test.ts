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
const isDatabaseConfigured = vi.fn();
const listDbRecipes = vi.fn();
const getDbRecipe = vi.fn();
const getDbRecipeById = vi.fn();
const createDbRecipe = vi.fn();
const updateDbRecipe = vi.fn();
const deleteDbRecipe = vi.fn();

const listSharedRecipeIdsForViewer = vi.fn();

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: (...args: unknown[]) => isDatabaseConfigured(...args),
}));

vi.mock("@/lib/recipes/shares", () => ({
  listSharedRecipeIdsForViewer: (...args: unknown[]) =>
    listSharedRecipeIdsForViewer(...args),
}));

vi.mock("@/lib/recipes/db-store", () => ({
  listDbRecipes: (...args: unknown[]) => listDbRecipes(...args),
  getDbRecipe: (...args: unknown[]) => getDbRecipe(...args),
  getDbRecipeById: (...args: unknown[]) => getDbRecipeById(...args),
  createDbRecipe: (...args: unknown[]) => createDbRecipe(...args),
  updateDbRecipe: (...args: unknown[]) => updateDbRecipe(...args),
  deleteDbRecipe: (...args: unknown[]) => deleteDbRecipe(...args),
  ensureDbRecipeSeed: vi.fn(),
}));

vi.mock("@/lib/recipes/local-store", () => ({
  listLocalRecipes: (...args: unknown[]) => listLocalRecipes(...args),
  getLocalRecipe: (...args: unknown[]) => getLocalRecipe(...args),
  getLocalRecipeById: (...args: unknown[]) => getLocalRecipeById(...args),
  createLocalRecipe: (...args: unknown[]) => createLocalRecipe(...args),
  updateLocalRecipe: (...args: unknown[]) => updateLocalRecipe(...args),
  deleteLocalRecipe: (...args: unknown[]) => deleteLocalRecipe(...args),
  getSeedRecipes: () => [
    {
      id: "seed-extra-saucy-late-night-cajun-tuna-bowl",
      slug: "extra-saucy-late-night-cajun-tuna-bowl",
      title: "Extra-Saucy Late-Night Cajun Tuna Bowl",
      summary: "Late-night bowl",
      ingredients: ["tuna"],
      steps: ["mix"],
      tags: ["bowl"],
      prepMinutes: 10,
      cookMinutes: 0,
      servings: 1,
      imageUrl: "/recipes/cajun-tuna-bowl.jpg",
      imageAlt: "bowl",
      source: "local",
      createdAt: "2026-09-14T20:00:00.000Z",
      updatedAt: "2026-09-14T20:00:00.000Z",
      authorId: "admin",
      authorName: "Gregg",
      isPrivate: false,
      inspiredBy: "",
      inspiredByUrl: "",
    },
  ],
  isLocalRecipeStoreWritable: () => true,
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    authorId: "u1",
    authorName: "Cook",
    isPrivate: false,
    inspiredBy: "",
    inspiredByUrl: "",
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
    isDatabaseConfigured.mockReset();
    listDbRecipes.mockReset();
    getDbRecipe.mockReset();
    getDbRecipeById.mockReset();
    createDbRecipe.mockReset();
    updateDbRecipe.mockReset();
    deleteDbRecipe.mockReset();
    listSharedRecipeIdsForViewer.mockReset();
    listSharedRecipeIdsForViewer.mockResolvedValue(new Set());
    delete process.env.SANITY_API_WRITE_TOKEN;
    isDatabaseConfigured.mockReturnValue(false);
  });

  it("lists db recipes when the database is configured", async () => {
    isDatabaseConfigured.mockReturnValue(true);
    isSanityConfigured.mockReturnValue(false);
    listDbRecipes.mockResolvedValue([recipe({ source: "db", id: "db-1" })]);
    const { listRecipes, getContentMode } = await import("@/lib/recipes");
    expect(getContentMode()).toBe("db");
    await expect(listRecipes()).resolves.toEqual({
      recipes: [recipe({ source: "db", id: "db-1" })],
      mode: "db",
    });
  });

  it("hides private recipes from the public catalog and shows them to the author", async () => {
    isSanityConfigured.mockReturnValue(false);
    listLocalRecipes.mockResolvedValue([
      recipe({ id: "pub", title: "Public soup" }),
      recipe({
        id: "priv",
        title: "Secret stew",
        isPrivate: true,
        authorId: "u1",
      }),
      recipe({
        id: "other-priv",
        title: "Someone else",
        isPrivate: true,
        authorId: "other",
      }),
    ]);
    const { listRecipes } = await import("@/lib/recipes");

    const publicList = await listRecipes();
    expect(publicList.recipes.map((r) => r.id)).toEqual(["pub"]);

    const mine = await listRecipes({ includePrivateForUserId: "u1" });
    expect(mine.recipes.map((r) => r.id).sort()).toEqual(["priv", "pub"]);
  });

  it("includes private recipes shared with the viewer", async () => {
    isSanityConfigured.mockReturnValue(false);
    listLocalRecipes.mockResolvedValue([
      recipe({ id: "pub", title: "Public soup" }),
      recipe({
        id: "shared",
        title: "Shared private",
        isPrivate: true,
        authorId: "author",
      }),
    ]);
    listSharedRecipeIdsForViewer.mockResolvedValue(new Set(["shared"]));
    const { listRecipes } = await import("@/lib/recipes");

    const listed = await listRecipes({
      includePrivateForUserId: "friend",
      viewerRole: "cook",
    });
    expect(listSharedRecipeIdsForViewer).toHaveBeenCalledWith("friend", "cook");
    expect(listed.recipes.map((r) => r.id).sort()).toEqual(["pub", "shared"]);
  });

  it("lists local recipes when DB and Sanity are off", async () => {
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

  it("maps Sanity docs when present and DB is off", async () => {
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
        _createdAt: "2026-01-15T00:00:00.000Z",
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
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  });

  it("prefers the database over Sanity when both are available", async () => {
    isDatabaseConfigured.mockReturnValue(true);
    isSanityConfigured.mockReturnValue(true);
    listDbRecipes.mockResolvedValue([recipe({ source: "db" })]);
    const { getContentMode, listRecipes } = await import("@/lib/recipes");
    expect(getContentMode()).toBe("db");
    expect(await listRecipes()).toMatchObject({ mode: "db" });
    expect(getSanityClient).not.toHaveBeenCalled();
  });

  it("gets recipes by slug in local mode and falls back to seeds on errors", async () => {
    isSanityConfigured.mockReturnValue(false);
    getLocalRecipe.mockResolvedValue(recipe());
    const { getRecipe } = await import("@/lib/recipes");
    expect(await getRecipe("soup")).toEqual({
      recipe: recipe(),
      mode: "local",
    });

    getLocalRecipe.mockRejectedValue(new Error("disk"));
    const failed = await getRecipe("extra-saucy-late-night-cajun-tuna-bowl");
    expect(failed.mode).toBe("local");
    expect(failed.error).toBeUndefined();
    expect(failed.recipe?.slug).toBe("extra-saucy-late-night-cajun-tuna-bowl");
  });

  it("never returns an empty list when local store fails", async () => {
    isSanityConfigured.mockReturnValue(false);
    listLocalRecipes.mockRejectedValue(new Error("EROFS: read-only file system"));
    const { listRecipes } = await import("@/lib/recipes");
    const result = await listRecipes();
    expect(result.recipes.length).toBeGreaterThan(0);
    expect(
      result.recipes.some(
        (r) => r.slug === "extra-saucy-late-night-cajun-tuna-bowl"
      )
    ).toBe(true);
  });

  it("creates in the database when configured", async () => {
    isDatabaseConfigured.mockReturnValue(true);
    createDbRecipe.mockResolvedValue(recipe({ source: "db", title: "New" }));
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
    expect(result.mode).toBe("db");
    expect(createDbRecipe).toHaveBeenCalled();
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
