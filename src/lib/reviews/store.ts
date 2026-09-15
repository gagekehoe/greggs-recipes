import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { publicAuthorLabel } from "@/lib/auth/profile";
import {
  db,
  isDatabaseConfigured,
  recipeComments,
  recipeReviewImages,
  recipeReviews,
  users,
} from "@/lib/db";
import { summarizeRatings, type RatingSummary } from "@/lib/reviews/rating";
import { deleteReviewImageFile } from "@/lib/reviews/uploads";

export type ReviewImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type ReviewWithAuthor = {
  id: string;
  recipeId: string;
  userId: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  authorEmail: string | null;
  images: ReviewImage[];
};

export type CommentWithAuthor = {
  id: string;
  recipeId: string;
  userId: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string | null;
};

export async function getRatingSummary(
  recipeId: string
): Promise<RatingSummary> {
  if (!isDatabaseConfigured()) return { average: 0, count: 0 };
  try {
    const rows = await db
      .select({ rating: recipeReviews.rating })
      .from(recipeReviews)
      .where(eq(recipeReviews.recipeId, recipeId));
    return summarizeRatings(rows.map((r: { rating: number }) => r.rating));
  } catch (error) {
    console.error("[reviews] getRatingSummary failed:", error);
    return { average: 0, count: 0 };
  }
}

export async function getRatingSummaries(
  recipeIds: string[]
): Promise<Record<string, RatingSummary>> {
  const result: Record<string, RatingSummary> = {};
  for (const id of recipeIds) {
    result[id] = { average: 0, count: 0 };
  }
  if (recipeIds.length === 0) return result;
  if (!isDatabaseConfigured()) return result;

  try {
    const rows = await db
      .select({
        recipeId: recipeReviews.recipeId,
        rating: recipeReviews.rating,
      })
      .from(recipeReviews)
      .where(inArray(recipeReviews.recipeId, recipeIds));

    const byRecipe = new Map<string, number[]>();
    for (const row of rows) {
      const list = byRecipe.get(row.recipeId) ?? [];
      list.push(row.rating);
      byRecipe.set(row.recipeId, list);
    }
    for (const [id, ratings] of byRecipe) {
      result[id] = summarizeRatings(ratings);
    }
    return result;
  } catch (error) {
    console.error("[reviews] getRatingSummaries failed:", error);
    return result;
  }
}

export async function listReviewsForRecipe(
  recipeId: string
): Promise<ReviewWithAuthor[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await db
      .select({
        id: recipeReviews.id,
        recipeId: recipeReviews.recipeId,
        userId: recipeReviews.userId,
        rating: recipeReviews.rating,
        body: recipeReviews.body,
        createdAt: recipeReviews.createdAt,
        updatedAt: recipeReviews.updatedAt,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(recipeReviews)
      .leftJoin(users, eq(recipeReviews.userId, users.id))
      .where(eq(recipeReviews.recipeId, recipeId))
      .orderBy(desc(recipeReviews.updatedAt));

    if (rows.length === 0) return [];

    const reviewIds = rows.map((r: { id: string }) => r.id);
    const images = await db
      .select()
      .from(recipeReviewImages)
      .where(inArray(recipeReviewImages.reviewId, reviewIds))
      .orderBy(asc(recipeReviewImages.sortOrder));

    const imagesByReview = new Map<string, ReviewImage[]>();
    for (const img of images) {
      const list = imagesByReview.get(img.reviewId) ?? [];
      list.push({ id: img.id, url: img.url, sortOrder: img.sortOrder });
      imagesByReview.set(img.reviewId, list);
    }

    return rows.map(
      (row: {
        id: string;
        recipeId: string;
        userId: string;
        rating: number;
        body: string | null;
        createdAt: Date;
        updatedAt: Date;
        authorName: string | null;
        authorEmail: string | null;
      }) => ({
      id: row.id,
      recipeId: row.recipeId,
      userId: row.userId,
      rating: row.rating,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorName: publicAuthorLabel(row.authorName, row.authorEmail),
      authorEmail: row.authorEmail,
      images: imagesByReview.get(row.id) ?? [],
    })
    );
  } catch (error) {
    console.error("[reviews] listReviewsForRecipe failed:", error);
    return [];
  }
}

export async function getUserReviewForRecipe(
  recipeId: string,
  userId: string
): Promise<ReviewWithAuthor | null> {
  const reviews = await listReviewsForRecipe(recipeId);
  return reviews.find((r) => r.userId === userId) ?? null;
}

export async function upsertReview(input: {
  recipeId: string;
  userId: string;
  rating: number;
  body: string | null;
}): Promise<ReviewWithAuthor> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }
  const now = new Date();
  const existing = await db
    .select()
    .from(recipeReviews)
    .where(
      and(
        eq(recipeReviews.recipeId, input.recipeId),
        eq(recipeReviews.userId, input.userId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(recipeReviews)
      .set({
        rating: input.rating,
        body: input.body,
        updatedAt: now,
      })
      .where(eq(recipeReviews.id, existing[0].id));
  } else {
    await db.insert(recipeReviews).values({
      recipeId: input.recipeId,
      userId: input.userId,
      rating: input.rating,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    });
  }

  const review = await getUserReviewForRecipe(input.recipeId, input.userId);
  if (!review) {
    throw new Error("Review save failed");
  }
  return review;
}

export async function getReviewById(id: string) {
  const rows = await db
    .select()
    .from(recipeReviews)
    .where(eq(recipeReviews.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteReview(id: string): Promise<boolean> {
  const images = await db
    .select()
    .from(recipeReviewImages)
    .where(eq(recipeReviewImages.reviewId, id));

  for (const img of images) {
    await deleteReviewImageFile(img.url);
  }

  const removed = await db
    .delete(recipeReviews)
    .where(eq(recipeReviews.id, id))
    .returning({ id: recipeReviews.id });
  return removed.length > 0;
}

export async function addReviewImages(
  reviewId: string,
  urls: string[]
): Promise<ReviewImage[]> {
  const existing = await db
    .select()
    .from(recipeReviewImages)
    .where(eq(recipeReviewImages.reviewId, reviewId));
  const start = existing.length;
  const now = new Date();
  const inserted: ReviewImage[] = [];

  for (let i = 0; i < urls.length; i++) {
    const id = crypto.randomUUID();
    const sortOrder = start + i;
    await db.insert(recipeReviewImages).values({
      id,
      reviewId,
      url: urls[i],
      sortOrder,
      createdAt: now,
    });
    inserted.push({ id, url: urls[i], sortOrder });
  }
  return inserted;
}

export async function countReviewImages(reviewId: string): Promise<number> {
  const rows = await db
    .select({ id: recipeReviewImages.id })
    .from(recipeReviewImages)
    .where(eq(recipeReviewImages.reviewId, reviewId));
  return rows.length;
}

export async function deleteReviewImage(
  imageId: string
): Promise<{ url: string; reviewId: string } | null> {
  const rows = await db
    .select()
    .from(recipeReviewImages)
    .where(eq(recipeReviewImages.id, imageId))
    .limit(1);
  const img = rows[0];
  if (!img) return null;
  await db
    .delete(recipeReviewImages)
    .where(eq(recipeReviewImages.id, imageId));
  await deleteReviewImageFile(img.url);
  return { url: img.url, reviewId: img.reviewId };
}

export async function listCommentsForRecipe(
  recipeId: string
): Promise<CommentWithAuthor[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await db
      .select({
        id: recipeComments.id,
        recipeId: recipeComments.recipeId,
        userId: recipeComments.userId,
        body: recipeComments.body,
        createdAt: recipeComments.createdAt,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(recipeComments)
      .leftJoin(users, eq(recipeComments.userId, users.id))
      .where(eq(recipeComments.recipeId, recipeId))
      .orderBy(asc(recipeComments.createdAt));

    return rows.map(
      (row: {
        id: string;
        recipeId: string;
        userId: string;
        body: string;
        createdAt: Date;
        authorName: string | null;
        authorEmail: string | null;
      }) => ({
      id: row.id,
      recipeId: row.recipeId,
      userId: row.userId,
      body: row.body,
      createdAt: row.createdAt,
      authorName: publicAuthorLabel(row.authorName, row.authorEmail),
      authorEmail: row.authorEmail,
    })
    );
  } catch (error) {
    console.error("[reviews] listCommentsForRecipe failed:", error);
    return [];
  }
}

export async function createComment(input: {
  recipeId: string;
  userId: string;
  body: string;
}): Promise<CommentWithAuthor> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(recipeComments).values({
    id,
    recipeId: input.recipeId,
    userId: input.userId,
    body: input.body,
    createdAt: now,
  });

  const comments = await listCommentsForRecipe(input.recipeId);
  const created = comments.find((c) => c.id === id);
  if (!created) throw new Error("Comment create failed");
  return created;
}

export async function getCommentById(id: string) {
  const rows = await db
    .select()
    .from(recipeComments)
    .where(eq(recipeComments.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteComment(id: string): Promise<boolean> {
  const removed = await db
    .delete(recipeComments)
    .where(eq(recipeComments.id, id))
    .returning({ id: recipeComments.id });
  return removed.length > 0;
}
