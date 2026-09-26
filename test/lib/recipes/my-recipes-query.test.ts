import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATALOG_SORT,
} from "@/lib/recipes/catalog-query";
import {
  applyMyRecipesQuery,
  buildMyRecipesSearchParams,
  DEFAULT_MY_RECIPES_PHOTO,
  filterRecipesByPhoto,
  myRecipesHref,
  myRecipesQueryIsActive,
  parseMyRecipesPhoto,
  parseMyRecipesQuery,
} from "@/lib/recipes/my-recipes-query";
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
    createdAt: "2026-01-02T00:00:00.000Z",
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
  sort: DEFAULT_CATALOG_SORT,
  photo: DEFAULT_MY_RECIPES_PHOTO,
};

describe("parseMyRecipesQuery", () => {
  it("defaults to newest sort and all photos", () => {
    expect(parseMyRecipesQuery({})).toEqual(baseQuery);
    expect(DEFAULT_MY_RECIPES_PHOTO).toBe("all");
  });

  it("accepts known sorts and photo filters; falls back otherwise", () => {
    expect(parseMyRecipesQuery({ sort: "title-asc" }).sort).toBe("title-asc");
    expect(parseMyRecipesQuery({ sort: "title-desc" }).sort).toBe("title-desc");
    expect(parseMyRecipesQuery({ sort: "oldest" }).sort).toBe("oldest");
    expect(parseMyRecipesQuery({ sort: "rating" }).sort).toBe("rating");
    expect(parseMyRecipesQuery({ sort: "bogus" }).sort).toBe("newest");
    expect(parseMyRecipesPhoto("has")).toBe("has");
    expect(parseMyRecipesPhoto("none")).toBe("none");
    expect(parseMyRecipesPhoto("all")).toBe("all");
    expect(parseMyRecipesPhoto("maybe")).toBe("all");
    expect(parseMyRecipesQuery({ photo: ["has", "none"] }).photo).toBe("has");
  });
});

describe("filter and sort", () => {
  const recipes = [
    recipe({
      id: "a",
      title: "Zucchini Pasta",
      imageUrl: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    }),
    recipe({
      id: "b",
      title: "Beef Stew",
      imageUrl: "https://abc.public.blob.vercel-storage.com/stew.jpg",
      createdAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    }),
    recipe({
      id: "c",
      title: "Tomato Soup",
      imageUrl: "   ",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-09T00:00:00.000Z",
    }),
  ];

  it("filters has photo vs no photo (blank URL = no photo)", () => {
    expect(filterRecipesByPhoto(recipes, "has").map((r) => r.id)).toEqual([
      "b",
    ]);
    expect(filterRecipesByPhoto(recipes, "none").map((r) => r.id)).toEqual([
      "a",
      "c",
    ]);
    expect(filterRecipesByPhoto(recipes, "all").map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("applies photo filter then Newest by createdAt", () => {
    expect(
      applyMyRecipesQuery(recipes, { sort: "newest", photo: "none" }).map(
        (r) => r.id
      )
    ).toEqual(["c", "a"]);
    expect(
      applyMyRecipesQuery(recipes, { sort: "title-asc", photo: "all" }).map(
        (r) => r.title
      )
    ).toEqual(["Beef Stew", "Tomato Soup", "Zucchini Pasta"]);
    expect(
      applyMyRecipesQuery(recipes, {
        sort: "title-desc",
        photo: "has",
      }).map((r) => r.id)
    ).toEqual(["b"]);
  });

  it("applies oldest and rating sorts with photo filter", () => {
    expect(
      applyMyRecipesQuery(recipes, { sort: "oldest", photo: "all" }).map(
        (r) => r.id
      )
    ).toEqual(["a", "c", "b"]);
    expect(
      applyMyRecipesQuery(
        recipes,
        { sort: "rating", photo: "none" },
        {
          a: { average: 5, count: 1 },
          c: { average: 0, count: 0 },
        }
      ).map((r) => r.id)
    ).toEqual(["a", "c"]);
    expect(
      buildMyRecipesSearchParams({ sort: "oldest", photo: "all" }).toString()
    ).toBe("sort=oldest");
    expect(
      buildMyRecipesSearchParams({ sort: "rating", photo: "has" }).toString()
    ).toBe("sort=rating&photo=has");
  });
});

describe("URL helpers", () => {
  it("omits defaults and preserves edit", () => {
    expect(buildMyRecipesSearchParams(baseQuery).toString()).toBe("");
    expect(
      buildMyRecipesSearchParams({
        sort: "title-asc",
        photo: "has",
      }).toString()
    ).toBe("sort=title-asc&photo=has");
    expect(
      buildMyRecipesSearchParams(baseQuery, "recipe-123").toString()
    ).toBe("edit=recipe-123");
    expect(myRecipesHref(baseQuery)).toBe("/my-recipes");
    expect(myRecipesHref({ sort: "title-desc", photo: "none" })).toBe(
      "/my-recipes?sort=title-desc&photo=none"
    );
    expect(
      myRecipesHref({ sort: "newest", photo: "has" }, "abc")
    ).toBe("/my-recipes?photo=has&edit=abc");
  });

  it("detects active query state", () => {
    expect(myRecipesQueryIsActive(baseQuery)).toBe(false);
    expect(
      myRecipesQueryIsActive({ ...baseQuery, sort: "title-asc" })
    ).toBe(true);
    expect(myRecipesQueryIsActive({ ...baseQuery, photo: "has" })).toBe(true);
  });
});
