import { describe, expect, it } from "vitest";
import {
  applyCatalogQuery,
  buildCatalogSearchParams,
  catalogHref,
  catalogQueryIsActive,
  collectCatalogTags,
  DEFAULT_CATALOG_SORT,
  DEFAULT_CATALOG_VIEW,
  filterRecipesByCatalogQuery,
  parseCatalogQuery,
  parseCatalogTags,
  parseCatalogView,
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

const baseQuery = {
  q: "",
  sort: DEFAULT_CATALOG_SORT,
  tags: [] as string[],
  view: DEFAULT_CATALOG_VIEW,
};

describe("parseCatalogQuery", () => {
  it("defaults to empty search, newest sort, grid view, no tags", () => {
    expect(parseCatalogQuery({})).toEqual(baseQuery);
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

  it("accepts grid/list view and falls back otherwise", () => {
    expect(parseCatalogView("list")).toBe("list");
    expect(parseCatalogView("grid")).toBe("grid");
    expect(parseCatalogQuery({ view: "list" }).view).toBe("list");
    expect(parseCatalogQuery({ view: "cards" }).view).toBe("grid");
    expect(parseCatalogQuery({ view: ["list", "grid"] }).view).toBe("list");
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
        ...baseQuery,
        q: "zucchini",
      }).map((r) => r.id)
    ).toEqual(["a"]);
    expect(
      filterRecipesByCatalogQuery(recipes, {
        ...baseQuery,
        q: "sunday",
      }).map((r) => r.id)
    ).toEqual(["b"]);
    expect(
      filterRecipesByCatalogQuery(recipes, {
        ...baseQuery,
        q: "soup",
      }).map((r) => r.id)
    ).toEqual(["c"]);
  });

  it("requires all selected tags (AND)", () => {
    expect(
      filterRecipesByCatalogQuery(recipes, {
        ...baseQuery,
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
        ...baseQuery,
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
    expect(buildCatalogSearchParams(baseQuery).toString()).toBe("");
    expect(
      buildCatalogSearchParams({
        q: "stew",
        sort: "title-asc",
        tags: ["dinner", "beef"],
        view: "grid",
      }).toString()
    ).toBe("q=stew&sort=title-asc&tag=dinner&tag=beef");
    expect(
      buildCatalogSearchParams({
        ...baseQuery,
        view: "list",
      }).toString()
    ).toBe("view=list");
    expect(catalogHref({ ...baseQuery, q: "stew" })).toBe("/?q=stew#recipes");
    expect(catalogHref({ ...baseQuery, view: "list" })).toBe(
      "/?view=list#recipes"
    );
    expect(catalogHref(baseQuery)).toBe("/#recipes");
  });

  it("detects active query state ignoring view", () => {
    expect(catalogQueryIsActive(baseQuery)).toBe(false);
    expect(catalogQueryIsActive({ ...baseQuery, view: "list" })).toBe(false);
    expect(catalogQueryIsActive({ ...baseQuery, q: "x" })).toBe(true);
    expect(
      catalogQueryIsActive({ ...baseQuery, sort: "title-asc" })
    ).toBe(true);
    expect(catalogQueryIsActive({ ...baseQuery, tags: ["soup"] })).toBe(true);
  });
});
