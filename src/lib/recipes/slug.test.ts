import { describe, expect, it } from "vitest";
import { totalMinutes } from "@/lib/recipes";
import { slugify } from "@/lib/recipes/slug";
import type { Recipe } from "@/lib/recipes/types";

function recipeStub(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: "local-1",
    slug: "test-dish",
    title: "Test Dish",
    summary: "",
    ingredients: [],
    steps: [],
    tags: [],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 2,
    imageUrl: "https://example.com/dish.jpg",
    imageAlt: "Test dish",
    source: "local",
    updatedAt: "2026-01-01T00:00:00.000Z",
    authorId: "user-1",
    authorName: "Cook",
    ...overrides,
  };
}

describe("slugify", () => {
  it("lowercases and hyphenates titles", () => {
    expect(slugify("Sunday Roast Chicken")).toBe("sunday-roast-chicken");
  });

  it("trims edges and strips leading/trailing hyphens", () => {
    expect(slugify("  ---Mac & Cheese!!!  ")).toBe("mac-cheese");
  });

  it("collapses non-alphanumeric runs into a single hyphen", () => {
    expect(slugify("Tomato---Basil___Soup")).toBe("tomato-basil-soup");
  });

  it("returns an empty string for punctuation-only titles", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });
});

describe("totalMinutes", () => {
  it("sums prep and cook time", () => {
    expect(totalMinutes(recipeStub({ prepMinutes: 15, cookMinutes: 45 }))).toBe(
      60
    );
  });

  it("handles zero prep or cook", () => {
    expect(totalMinutes(recipeStub({ prepMinutes: 0, cookMinutes: 12 }))).toBe(
      12
    );
    expect(totalMinutes(recipeStub({ prepMinutes: 8, cookMinutes: 0 }))).toBe(8);
  });
});
