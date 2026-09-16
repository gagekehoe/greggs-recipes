import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("db recipe store", () => {
  let tmpDir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "greggs-db-recipes-"));
    process.chdir(tmpDir);
    vi.resetModules();
    vi.unstubAllEnvs();
    const g = globalThis as {
      __greggsDbBundle?: unknown;
      __greggsDbResolved?: boolean;
    };
    delete g.__greggsDbBundle;
    delete g.__greggsDbResolved;
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tmpDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.resetModules();
    const g = globalThis as {
      __greggsDbBundle?: unknown;
      __greggsDbResolved?: boolean;
    };
    delete g.__greggsDbBundle;
    delete g.__greggsDbResolved;
  });

  it("seeds the Cajun tuna bowl and supports CRUD", async () => {
    const store = await import("@/lib/recipes/db-store");
    const listed = await store.listDbRecipes();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.slug).toBe("extra-saucy-late-night-cajun-tuna-bowl");
    expect(listed[0]?.authorName).toBe("Gregg");
    expect(listed[0]?.source).toBe("db");
    expect(listed[0]?.imageUrl).toBe("/recipes/cajun-tuna-bowl.jpg");

    const created = await store.createDbRecipe({
      title: "Desk Chili",
      summary: "A test bowl that should land in SQLite for local CRUD.",
      ingredients: ["beans"],
      steps: ["simmer"],
      tags: ["Test"],
      prepMinutes: 5,
      cookMinutes: 20,
      servings: 2,
      authorId: "cook-1",
      authorName: "Gregg",
    });
    expect(created.source).toBe("db");
    expect(created.slug).toBe("desk-chili");
    expect(created.isPrivate).toBe(false);

    const privateRecipe = await store.createDbRecipe({
      title: "Secret Chili",
      summary: "A private test bowl that should stay author-only in SQLite.",
      ingredients: ["beans"],
      steps: ["simmer"],
      tags: ["test"],
      prepMinutes: 5,
      cookMinutes: 20,
      servings: 2,
      authorId: "cook-1",
      authorName: "Gregg",
      isPrivate: true,
    });
    expect(privateRecipe.isPrivate).toBe(true);

    const updated = await store.updateDbRecipe(created.id, {
      title: "Desk Chili Hot",
      summary: "A hotter test bowl that should land in SQLite for local CRUD.",
      ingredients: ["beans", "chili"],
      steps: ["simmer longer"],
      tags: ["dinner"],
      prepMinutes: 6,
      cookMinutes: 25,
      servings: 3,
      isPrivate: true,
    });
    expect(updated?.title).toBe("Desk Chili Hot");
    expect(updated?.servings).toBe(3);
    expect(updated?.isPrivate).toBe(true);

    expect(await store.getDbRecipe("desk-chili")).toMatchObject({
      id: created.id,
      title: "Desk Chili Hot",
    });
    expect(await store.deleteDbRecipe(created.id)).toBe(true);
    expect(await store.getDbRecipeById(created.id)).toBeNull();

    const after = await store.listDbRecipes();
    expect(
      after.some((r) => r.slug === "extra-saucy-late-night-cajun-tuna-bowl")
    ).toBe(true);
  });
});
