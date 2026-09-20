import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("local recipe store", () => {
  let tmpDir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "greggs-local-"));
    await mkdir(path.join(tmpDir, "data"), { recursive: true });
    process.chdir(tmpDir);
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tmpDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("seeds from SEED_RECIPES when recipes.json is missing", async () => {
    const { listLocalRecipes } = await import("@/lib/recipes/local-store");
    const recipes = await listLocalRecipes();
    expect(recipes).toHaveLength(1);
    expect(recipes[0]?.slug).toBe("extra-saucy-late-night-cajun-tuna-bowl");
    expect(recipes[0]?.authorName).toBe("Gregg");
    const raw = await readFile(path.join(tmpDir, "data", "recipes.json"), "utf8");
    expect(JSON.parse(raw).length).toBe(1);
  });

  it("uses in-memory seeds on Vercel without opening recipes.json", async () => {
    vi.stubEnv("VERCEL", "1");
    const { listLocalRecipes, isLocalRecipeStoreWritable } = await import(
      "@/lib/recipes/local-store"
    );
    expect(isLocalRecipeStoreWritable()).toBe(false);

    const recipes = await listLocalRecipes();
    expect(recipes.length).toBeGreaterThan(0);
    expect(
      recipes.some((r) => r.slug === "extra-saucy-late-night-cajun-tuna-bowl")
    ).toBe(true);

    // Must not create/write the JSON file on serverless.
    await expect(
      readFile(path.join(tmpDir, "data", "recipes.json"), "utf8")
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses local mutations on serverless", async () => {
    vi.stubEnv("VERCEL", "1");
    const store = await import("@/lib/recipes/local-store");
    await expect(
      store.createLocalRecipe({
        title: "Should Fail",
        summary: "Serverless must not write recipes.json on Vercel.",
        ingredients: ["x"],
        steps: ["y"],
        tags: [],
        prepMinutes: 1,
        cookMinutes: 1,
        servings: 1,
        authorId: "u",
        authorName: "Gregg",
      })
    ).rejects.toThrow(/read-only on serverless/i);
  });

  it("creates, updates, and deletes a local recipe", async () => {
    const store = await import("@/lib/recipes/local-store");
    const created = await store.createLocalRecipe({
      title: "Test Soup",
      summary: "A warm bowl for rainy evenings at home.",
      ingredients: ["stock", " onion "],
      steps: [" simmer "],
      tags: ["Soup", ""],
      prepMinutes: 5,
      cookMinutes: 20,
      servings: 2,
      authorId: "user-1",
      authorName: "Maya",
    });

    expect(created.slug).toBe("test-soup");
    expect(created.ingredients).toEqual(["stock", "onion"]);
    expect(created.tags).toEqual(["soup"]);
    expect(created.authorId).toBe("user-1");
    expect(created.imageUrl).toBe("");
    expect(created.isPrivate).toBe(false);

    const bySlug = await store.getLocalRecipe("test-soup");
    expect(bySlug?.id).toBe(created.id);
    const byId = await store.getLocalRecipeById(created.id);
    expect(byId?.title).toBe("Test Soup");

    const privateRecipe = await store.createLocalRecipe({
      title: "Hidden Chili",
      summary: "A private bowl that should stay off the public catalog.",
      ingredients: ["beans"],
      steps: ["simmer"],
      tags: [],
      prepMinutes: 5,
      cookMinutes: 20,
      servings: 2,
      authorId: "user-1",
      authorName: "Maya",
      isPrivate: true,
    });
    expect(privateRecipe.isPrivate).toBe(true);
    expect(privateRecipe.id).not.toBe(created.id);

    const updated = await store.updateLocalRecipe(created.id, {
      title: "Test Soup Updated",
      summary: "Still a warm bowl for rainy evenings at home.",
      ingredients: ["stock", "carrot"],
      steps: ["simmer gently"],
      tags: ["dinner"],
      prepMinutes: 6,
      cookMinutes: 25,
      servings: 3,
      isPrivate: true,
    });
    expect(updated?.isPrivate).toBe(true);
    expect(updated?.title).toBe("Test Soup Updated");
    expect(updated?.servings).toBe(3);

    const photoOnly = await store.updateLocalRecipe(created.id, {
      title: updated!.title,
      summary: updated!.summary,
      ingredients: updated!.ingredients,
      steps: updated!.steps,
      tags: updated!.tags,
      prepMinutes: updated!.prepMinutes,
      cookMinutes: updated!.cookMinutes,
      servings: updated!.servings,
      imageUrl: "/uploads/recipes/hidden.jpg",
    });
    expect(photoOnly?.isPrivate).toBe(true);
    expect(photoOnly?.imageUrl).toBe("/uploads/recipes/hidden.jpg");

    expect(await store.updateLocalRecipe("missing", {
      title: "Nope",
      summary: "This should not update anything in the store.",
      ingredients: ["x"],
      steps: ["y"],
      tags: [],
      prepMinutes: 0,
      cookMinutes: 0,
      servings: 1,
    })).toBeNull();

    expect(await store.deleteLocalRecipe(created.id)).toBe(true);
    expect(await store.getLocalRecipeById(created.id)).toBeNull();
    expect(await store.deleteLocalRecipe(created.id)).toBe(false);
  });

  it("dedupes slug collisions and filters smoke-test leftovers", async () => {
    await writeFile(
      path.join(tmpDir, "data", "recipes.json"),
      JSON.stringify([
        {
          id: "local-keep",
          slug: "keep-me",
          title: "Keep Me",
          summary: "real",
          ingredients: ["a"],
          steps: ["b"],
          tags: [],
          prepMinutes: 1,
          cookMinutes: 1,
          servings: 1,
          imageUrl: "https://example.com/a.jpg",
          imageAlt: "a",
          source: "local",
          updatedAt: "2026-01-01T00:00:00.000Z",
          authorId: "system",
          authorName: "Gregg's Kitchen",
        },
        {
          id: "local-junk",
          slug: "kitchen-desk-1",
          title: "Kitchen Desk Fix Check",
        },
      ]),
      "utf8"
    );

    const store = await import("@/lib/recipes/local-store");
    const listed = await store.listLocalRecipes();
    expect(listed.map((r) => r.slug)).toEqual(["keep-me"]);

    const first = await store.createLocalRecipe({
      title: "Keep Me",
      summary: "Another keep-me title that needs a unique slug.",
      ingredients: ["a"],
      steps: ["b"],
      tags: [],
      prepMinutes: 1,
      cookMinutes: 1,
      servings: 1,
      authorId: "u",
      authorName: "U",
    });
    expect(first.slug.startsWith("keep-me-")).toBe(true);
  });
});
