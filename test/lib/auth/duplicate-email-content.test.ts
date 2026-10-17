import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../../helpers/test-db");
  const testDb = createTestDb();
  return {
    db: testDb.db,
    users: testDb.schema.users,
    accounts: testDb.schema.accounts,
    recipes: testDb.schema.recipes,
    recipeReviews: testDb.schema.recipeReviews,
    recipeComments: testDb.schema.recipeComments,
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
    summary: "A leftover recipe that must follow the survivor after reset.",
    ingredients: '["salt"]',
    steps: '["cook"]',
    tags: "[]",
    prepMinutes: 5,
    cookMinutes: 10,
    servings: 2,
    imageUrl: "",
    imageAlt: "",
    authorId,
    authorName: "Legacy Cook",
    isPrivate: false,
    inspiredBy: "",
    inspiredByUrl: "",
    createdAt: now,
    updatedAt: now,
  };
}

describe("duplicate email content merge", () => {
  beforeEach(async () => {
    const { db, users, recipes, recipeReviews, recipeComments, recipeShares, accounts } =
      await import("@/lib/db");
    await db.delete(recipeShares);
    await db.delete(recipeReviews);
    await db.delete(recipeComments);
    await db.delete(recipes);
    await db.delete(accounts);
    await db.delete(users);
  });

  it("picks the stronger kitchen role", async () => {
    const { strongerRole } = await import("@/lib/auth/duplicate-email-content");
    expect(strongerRole("viewer", "cook")).toBe("cook");
    expect(strongerRole("cook", "viewer")).toBe("cook");
    expect(strongerRole("admin", "cook")).toBe("admin");
    expect(strongerRole("owner", "admin")).toBe("owner");
  });

  it("moves recipes, reviews, comments, and shares onto the survivor", async () => {
    const { db, users, recipes, recipeReviews, recipeComments, recipeShares } =
      await import("@/lib/db");
    const { mergeDuplicateEmailAccounts } = await import(
      "@/lib/auth/duplicate-email-content"
    );

    await db.insert(users).values([
      {
        id: "u-survivor",
        email: "cook@example.com",
        name: null,
        role: "viewer",
        passwordHash: "hash",
      },
      {
        id: "u-legacy",
        email: "Cook@Example.COM",
        name: "Legacy Cook",
        role: "cook",
        passwordHash: null,
      },
    ]);

    await db.insert(recipes).values(recipeRow("r-secret", "u-legacy"));

    const now = new Date();
    await db.insert(recipeReviews).values({
      id: "rev-1",
      recipeId: "r-secret",
      userId: "u-legacy",
      rating: 5,
      body: "Still my stew",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(recipeComments).values({
      id: "c-1",
      recipeId: "r-secret",
      userId: "u-legacy",
      body: "Note from the original account",
      createdAt: now,
    });
    await db.insert(recipeShares).values({
      id: "s-1",
      recipeId: "r-secret",
      userId: "u-legacy",
      role: null,
      createdAt: now,
    });

    await mergeDuplicateEmailAccounts(
      {
        id: "u-survivor",
        email: "cook@example.com",
        role: "viewer",
        name: null,
        image: null,
      },
      [
        {
          id: "u-legacy",
          email: "Cook@Example.COM",
          role: "cook",
          name: "Legacy Cook",
          image: null,
        },
      ]
    );

    const movedRecipe = await db
      .select({ authorId: recipes.authorId })
      .from(recipes)
      .where(eq(recipes.id, "r-secret"));
    expect(movedRecipe[0]?.authorId).toBe("u-survivor");

    const movedReview = await db
      .select({ userId: recipeReviews.userId })
      .from(recipeReviews)
      .where(eq(recipeReviews.id, "rev-1"));
    expect(movedReview[0]?.userId).toBe("u-survivor");

    const movedComment = await db
      .select({ userId: recipeComments.userId })
      .from(recipeComments)
      .where(eq(recipeComments.id, "c-1"));
    expect(movedComment[0]?.userId).toBe("u-survivor");

    const movedShare = await db
      .select({ userId: recipeShares.userId })
      .from(recipeShares)
      .where(eq(recipeShares.id, "s-1"));
    expect(movedShare[0]?.userId).toBe("u-survivor");

    const survivor = await db
      .select({ role: users.role, name: users.name })
      .from(users)
      .where(eq(users.id, "u-survivor"));
    expect(survivor[0]).toMatchObject({
      role: "cook",
      name: "Legacy Cook",
    });
  });

  it("keeps the survivor review when both rows reviewed the same recipe", async () => {
    const { db, users, recipes, recipeReviews } = await import("@/lib/db");
    const { reassignOwnedContent } = await import(
      "@/lib/auth/duplicate-email-content"
    );

    await db.insert(users).values([
      { id: "u-survivor", email: "cook@example.com", role: "cook" },
      { id: "u-legacy", email: "Cook@Example.COM", role: "cook" },
    ]);
    await db.insert(recipes).values(recipeRow("r-shared", "u-survivor"));

    const now = new Date();
    await db.insert(recipeReviews).values([
      {
        id: "rev-survivor",
        recipeId: "r-shared",
        userId: "u-survivor",
        rating: 4,
        body: "Survivor review",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "rev-legacy",
        recipeId: "r-shared",
        userId: "u-legacy",
        rating: 2,
        body: "Legacy review",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await reassignOwnedContent("u-legacy", "u-survivor");

    const remaining = await db.select().from(recipeReviews);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({
      id: "rev-survivor",
      userId: "u-survivor",
      body: "Survivor review",
    });
  });
});
