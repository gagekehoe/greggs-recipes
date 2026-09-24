import { describe, expect, it } from "vitest";
import {
  applyCatalogQuery,
  buildCatalogSearchParams,
  catalogHref,
  catalogQueryIsActive,
  collectCatalogTags,
  DEFAULT_CATALOG_SORT,
  filterRecipesByCatalogQuery,
  parseCatalogQuery,
  parseCatalogTags,
  sortRecipesByCatalog,
} from "@/lib/recipes/catalog-query";
import type { Recipe } from "@/lib/recipes/types";

function recipe(partial: Partial<Recipe> = {}): Recipe {
  return {
    id: "r1",
    slug: "soup",
    title: "Tomato Soup",
    summary: "Warm bowl for a cold night",
    ingredients: ["tomato"],
    steps: ["simmer"],
    tags: ["soup", "dinner"],
    prepMinutes: 5,
    cookMinutes: 20,
    servings: 2,
    imageUrl: "",
    imageAlt: "",
    source: "local",
    updatedAt: "2026-01-02T00:00:00.000Z",
    authorId: "u1",
    authorName: "Gregg",
    isPrivate: false,
    inspiredBy: "",
    inspiredByUrl: "",
    ...partial,
  };
}

describe("parseCatalogQuery", () => {
  it("defaults to empty search, newest sort, no tags", () => {
    expect(parseCatalogQuery({})).toEqual({
      q: "",
      sort: DEFAULT_CATALOG_SORT,
      tags: [],
    });
  });

  it("trims and collapses search whitespace", () => {
    expect(parseCatalogQuery({ q: "  tomato   soup  " }).q).toBe("tomato soup");
  });

  it("accepts known sorts and falls back otherwise", () => {
    expect(parseCatalogQuery({ sort: "title-asc" }).sort).toBe("title-asc");
    expect(parseCatalogQuery({ sort: "title-desc" }).sort).toBe("title-desc");
    expect(parseCatalogQuery({ sort: "newest" }).sort).toBe("newest");
    expect(parseCatalogQuery({ sort: "popular" }).sort).toBe("newest");
  });

  it("parses repeated and comma-separated tags", () => {
    expect(parseCatalogTags(["Dinner", "soup"])).toEqual(["dinner", "soup"]);
    expect(parseCatalogTags("dinner,soup,soup")).toEqual(["dinner", "soup"]);
    expect(parseCatalogQuery({ tag: ["bowl", "quick,spicy"] }).tags).toEqual([
      "bowl",
      "quick",
      "spicy",
    ]);
  });
});

describe("filter and sort", () => {
  const recipes = [
    recipe({
      id: "a",
      title: "Zucchini Pasta",
      summary: "Light weeknight",
      tags: ["pasta", "vegetarian"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    recipe({
      id: "b",
      title: "Beef Stew",
      summary: "Slow Sunday pot",
      tags: ["beef", "dinner"],
      updatedAt: "2026-01-03T00:00:00.000Z",
    }),
    recipe({
      id: "c",
      title: "Tomato Soup",
      summary: "Warm bowl",
      tags: ["soup", "dinner"],
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
  ];

  it("searches title, summary, and tags", () => {
    expect(
      filterRecipesByCatalogQuery(recipes, {
        q: "zucchini",
        sort: "newest",
        tags: [],
      }).map((r) => r.id)
    ).toEqual(["a"]);
    expect(
      filterRecipesByCatalogQuery(recipes, {
        q: "sunday",
        sort: "newest",
        tags: [],
      }).map((r) => r.id)
    ).toEqual(["b"]);
    expect(
      filterRecipesByCatalogQuery(recipes, {
        q: "soup",
        sort: "newest",
        tags: [],
      }).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("requires all selected tags (AND)", () => {
    expect(
      filterRecipesByCatalogQuery(recipes, {
        q: "",
        sort: "newest",
        tags: ["dinner", "soup"],
      }).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("sorts newest, title A–Z, and Z–A", () => {
    expect(sortRecipesByCatalog(recipes, "newest").map((r) => r.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortRecipesByCatalog(recipes, "title-asc").map((r) => r.title)).toEqual([
      "Beef Stew",
      "Tomato Soup",
      "Zucchini Pasta",
    ]);
    expect(sortRecipesByCatalog(recipes, "title-desc").map((r) => r.title)).toEqual([
      "Zucchini Pasta",
      "Tomato Soup",
      "Beef Stew",
    ]);
  });

  it("applies filter then sort", () => {
    expect(
      applyCatalogQuery(recipes, {
        q: "",
        sort: "title-asc",
        tags: ["dinner"],
      }).map((r) => r.title)
    ).toEqual(["Beef Stew", "Tomato Soup"]);
  });
});

describe("collectCatalogTags and URL helpers", () => {
  it("collects unique sorted tags", () => {
    expect(
      collectCatalogTags([
        recipe({ tags: ["Dinner", "soup"] }),
        recipe({ tags: ["soup", "bowl"] }),
      ])
    ).toEqual(["bowl", "dinner", "soup"]);
  });

  it("builds shareable params omitting defaults", () => {
    expect(buildCatalogSearchParams({ q: "", sort: "newest", tags: [] }).toString()).toBe(
      ""
    );
    expect(
      buildCatalogSearchParams({
        q: "stew",
        sort: "title-asc",
        tags: ["dinner", "beef"],
      }).toString()
    ).toBe("q=stew&sort=title-asc&tag=dinner&tag=beef");
    expect(catalogHref({ q: "stew", sort: "newest", tags: [] })).toBe(
      "/?q=stew#recipes"
    );
    expect(catalogHref({ q: "", sort: "newest", tags: [] })).toBe("/#recipes");
  });

  it("detects active query state", () => {
    expect(catalogQueryIsActive({ q: "", sort: "newest", tags: [] })).toBe(false);
    expect(catalogQueryIsActive({ q: "x", sort: "newest", tags: [] })).toBe(true);
    expect(
      catalogQueryIsActive({ q: "", sort: "title-asc", tags: [] })
    ).toBe(true);
    expect(catalogQueryIsActive({ q: "", sort: "newest", tags: ["soup"] })).toBe(
      true
    );
  });
});
