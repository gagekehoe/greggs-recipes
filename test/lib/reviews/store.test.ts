import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteReviewImageFile = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/reviews/uploads", () => ({
  deleteReviewImageFile: (...args: unknown[]) => deleteReviewImageFile(...args),
  saveReviewImageFile: vi.fn(),
  ensureReviewUploadDir: vi.fn(),
}));

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../../helpers/test-db");
  const testDb = createTestDb();
  return {
    db: testDb.db,
    schema: testDb.schema,
    users: testDb.schema.users,
    accounts: testDb.schema.accounts,
    sessions: testDb.schema.sessions,
    verificationTokens: testDb.schema.verificationTokens,
    recipeReviews: testDb.schema.recipeReviews,
    recipeReviewImages: testDb.schema.recipeReviewImages,
    recipeComments: testDb.schema.recipeComments,
    isDatabaseConfigured: () => true,
    getDbDialect: () => "sqlite" as const,
    __testSqlite: testDb.sqlite,
  };
});

describe("reviews store", () => {
  beforeEach(async () => {
    deleteReviewImageFile.mockClear();
    const mod = (await import("@/lib/db")) as unknown as {
      __testSqlite: { exec: (sql: string) => void };
    };
    mod.__testSqlite.exec(`
      DELETE FROM recipe_review_image;
      DELETE FROM recipe_review;
      DELETE FROM recipe_comment;
      DELETE FROM user;
    `);
  });

  async function seedUser(
    id = "user-1",
    name = "Maya",
    role: "viewer" | "cook" | "admin" = "viewer",
    email = `${id}@example.com`
  ) {
    const { db } = await import("@/lib/db");
    const { users } = await import("@/lib/db/schema");
    await db.insert(users).values({
      id,
      email,
      name,
      role,
    });
  }

  it("upserts a review, attaches images, and summarizes ratings", async () => {
    await seedUser();
    const store = await import("@/lib/reviews/store");

    const created = await store.upsertReview({
      recipeId: "recipe-1",
      userId: "user-1",
      rating: 5,
      body: "Great",
    });
    expect(created.rating).toBe(5);
    expect(created.authorName).toBe("Maya");

    const updated = await store.upsertReview({
      recipeId: "recipe-1",
      userId: "user-1",
      rating: 4,
      body: "Still great",
    });
    expect(updated.rating).toBe(4);
    expect(updated.id).toBe(created.id);

    const images = await store.addReviewImages(created.id, [
      "/uploads/reviews/a.jpg",
      "/uploads/reviews/b.jpg",
    ]);
    expect(images).toHaveLength(2);
    expect(await store.countReviewImages(created.id)).toBe(2);

    await seedUser("user-2", "Bo");
    await store.upsertReview({
      recipeId: "recipe-1",
      userId: "user-2",
      rating: 2,
      body: null,
    });

    expect(await store.getRatingSummary("recipe-1")).toEqual({
      average: 3,
      count: 2,
    });
    const summaries = await store.getRatingSummaries(["recipe-1", "recipe-2"]);
    expect(summaries["recipe-1"].count).toBe(2);
    expect(summaries["recipe-2"]).toEqual({ average: 0, count: 0 });

    const listed = await store.listReviewsForRecipe("recipe-1");
    expect(listed[0].images.length + listed[1].images.length).toBe(2);
    for (const review of listed) {
      expect(review).not.toHaveProperty("authorEmail");
      expect(JSON.stringify(review)).not.toMatch(/@example\.com/);
    }
    expect(
      await store.getUserReviewForRecipe("recipe-1", "user-1")
    ).toMatchObject({ rating: 4 });
    expect(await store.getReviewById(created.id)).toMatchObject({
      id: created.id,
    });
  });

  it("omits authorEmail from public review and comment DTOs", async () => {
    await seedUser("user-1", "Maya");
    const store = await import("@/lib/reviews/store");

    const review = await store.upsertReview({
      recipeId: "recipe-email",
      userId: "user-1",
      rating: 5,
      body: "Secret sauce",
    });
    expect(review).not.toHaveProperty("authorEmail");
    expect(review.authorName).toBe("Maya");
    expect(JSON.stringify(review)).not.toContain("user-1@example.com");

    const listed = await store.listReviewsForRecipe("recipe-email");
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty("authorEmail");
    expect(JSON.stringify(listed)).not.toContain("@example.com");

    const comment = await store.createComment({
      recipeId: "recipe-email",
      userId: "user-1",
      body: "Also yum",
    });
    expect(comment).not.toHaveProperty("authorEmail");
    expect(comment.authorName).toBe("Maya");
    expect(JSON.stringify(comment)).not.toContain("user-1@example.com");

    const comments = await store.listCommentsForRecipe("recipe-email");
    expect(comments).toHaveLength(1);
    expect(comments[0]).not.toHaveProperty("authorEmail");
    expect(JSON.stringify(comments)).not.toContain("@example.com");
  });

  it("attaches owner and authorized cook privilege badges", async () => {
    process.env.ADMIN_EMAIL = "admin-user@example.com";
    await seedUser("cook-1", "Mom", "cook");
    await seedUser("admin-1", "Gage", "admin", "admin-user@example.com");

    const store = await import("@/lib/reviews/store");
    await store.upsertReview({
      recipeId: "badge-recipe",
      userId: "cook-1",
      rating: 5,
      body: "Family favorite",
    });
    await store.upsertReview({
      recipeId: "badge-recipe",
      userId: "admin-1",
      rating: 4,
      body: "Approved",
    });
    await store.createComment({
      recipeId: "badge-recipe",
      userId: "cook-1",
      body: "Tip from Mom",
    });
    await store.createComment({
      recipeId: "badge-recipe",
      userId: "admin-1",
      body: "From the kitchen",
    });

    const reviews = await store.listReviewsForRecipe("badge-recipe");
    const cookReview = reviews.find((r) => r.userId === "cook-1");
    const ownerReview = reviews.find((r) => r.userId === "admin-1");
    expect(cookReview).toMatchObject({
      authorName: "Mom",
      authorPrivilege: "authorized_cook",
    });
    expect(ownerReview).toMatchObject({
      authorName: "Gregg",
      authorPrivilege: "owner",
    });
    expect(JSON.stringify(reviews)).not.toMatch(/Gage|admin-user@/);

    const comments = await store.listCommentsForRecipe("badge-recipe");
    expect(comments.find((c) => c.userId === "cook-1")).toMatchObject({
      authorPrivilege: "authorized_cook",
    });
    expect(comments.find((c) => c.userId === "admin-1")).toMatchObject({
      authorName: "Gregg",
      authorPrivilege: "owner",
    });
  });

  it("deletes reviews, images, and comments", async () => {
    await seedUser();
    const store = await import("@/lib/reviews/store");
    const review = await store.upsertReview({
      recipeId: "r1",
      userId: "user-1",
      rating: 5,
      body: null,
    });
    const [img] = await store.addReviewImages(review.id, [
      "/uploads/reviews/x.jpg",
    ]);

    expect(await store.deleteReviewImage(img.id)).toEqual({
      url: "/uploads/reviews/x.jpg",
      reviewId: review.id,
    });
    expect(deleteReviewImageFile).toHaveBeenCalledWith(
      "/uploads/reviews/x.jpg"
    );
    expect(await store.deleteReviewImage("missing")).toBeNull();

    await store.addReviewImages(review.id, ["/uploads/reviews/y.jpg"]);
    expect(await store.deleteReview(review.id)).toBe(true);
    expect(deleteReviewImageFile).toHaveBeenCalled();
    expect(await store.deleteReview(review.id)).toBe(false);

    const comment = await store.createComment({
      recipeId: "r1",
      userId: "user-1",
      body: "Hello",
    });
    expect(comment.authorName).toBe("Maya");
    const comments = await store.listCommentsForRecipe("r1");
    expect(comments).toHaveLength(1);
    expect(await store.getCommentById(comment.id)).toMatchObject({
      body: "Hello",
    });
    expect(await store.deleteComment(comment.id)).toBe(true);
    expect(await store.deleteComment(comment.id)).toBe(false);
  });
});
