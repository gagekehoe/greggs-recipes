import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../../helpers/test-db");
  const testDb = createTestDb();
  return {
    db: testDb.db,
    users: testDb.schema.users,
    recipes: testDb.schema.recipes,
    recipeShares: testDb.schema.recipeShares,
    isDatabaseConfigured: () => true,
  };
});

function recipeRow(id: string, authorId: string) {
  const now = new Date();
  return {
    id,
    slug: `slug-${id}`,
    title: `Dish ${id}`,
    summary: "Private dish whose leftover shares must drop on demotion.",
    ingredients: '["salt"]',
    steps: '["cook"]',
    tags: "[]",
    prepMinutes: 5,
    cookMinutes: 10,
    servings: 2,
    imageUrl: "",
    imageAlt: "",
    authorId,
    authorName: "Cook",
    isPrivate: true,
    inspiredBy: "",
    inspiredByUrl: "",
    createdAt: now,
    updatedAt: now,
  };
}

describe("clearSharesForAuthorRecipes", () => {
  beforeEach(async () => {
    const { db, users, recipes, recipeShares } = await import("@/lib/db");
    await db.delete(recipeShares);
    await db.delete(recipes);
    await db.delete(users);
  });

  it("drops user and role grants on the author's recipes only", async () => {
    const { db, users, recipes, recipeShares } = await import("@/lib/db");
    const { clearSharesForAuthorRecipes } = await import(
      "@/lib/recipes/shares"
    );

    await db.insert(users).values([
      { id: "u-cook", email: "cook@example.com", role: "cook" },
      { id: "u-other", email: "other@example.com", role: "cook" },
      { id: "u-sharee", email: "viewer@example.com", role: "viewer" },
    ]);
    await db.insert(recipes).values([
      recipeRow("r-mine", "u-cook"),
      recipeRow("r-theirs", "u-other"),
    ]);

    const now = new Date();
    await db.insert(recipeShares).values([
      {
        id: "s-user",
        recipeId: "r-mine",
        userId: "u-sharee",
        role: null,
        createdAt: now,
      },
      {
        id: "s-role",
        recipeId: "r-mine",
        userId: null,
        role: "viewer",
        createdAt: now,
      },
      {
        id: "s-keep",
        recipeId: "r-theirs",
        userId: "u-sharee",
        role: null,
        createdAt: now,
      },
    ]);

    await clearSharesForAuthorRecipes("u-cook");

    const remaining = await db
      .select({ id: recipeShares.id, recipeId: recipeShares.recipeId })
      .from(recipeShares);
    expect(remaining).toEqual([{ id: "s-keep", recipeId: "r-theirs" }]);

    const stillPrivate = await db
      .select({ isPrivate: recipes.isPrivate })
      .from(recipes)
      .where(eq(recipes.id, "r-mine"));
    expect(stillPrivate[0]?.isPrivate).toBe(true);
  });
});
