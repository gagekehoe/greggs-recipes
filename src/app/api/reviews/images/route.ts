import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { recipeReviewImages } from "@/lib/db/schema";
import { canManageReviewImages } from "@/lib/reviews/permissions";
import { REVIEW_IMAGE_LIMITS } from "@/lib/reviews/rating";
import {
  addReviewImages,
  countReviewImages,
  deleteReviewImage,
  getReviewById,
  listReviewsForRecipe,
} from "@/lib/reviews/store";
import { saveReviewImageFile } from "@/lib/reviews/uploads";

/** Attach more photos to an existing review (signed-in owner/admin only). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to upload review photos." },
      { status: 401 }
    );
  }

  try {
    const form = await request.formData();
    const reviewId = String(form.get("reviewId") || "");
    if (!reviewId) {
      return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });
    }

    const existing = await getReviewById(reviewId);
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (!canManageReviewImages(user.role, existing.userId, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const files = form
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const currentCount = await countReviewImages(reviewId);
    const room = REVIEW_IMAGE_LIMITS.maxFilesPerReview - currentCount;
    if (room <= 0 || files.length > room) {
      return NextResponse.json(
        {
          error: `You can attach up to ${REVIEW_IMAGE_LIMITS.maxFilesPerReview} photos per review.`,
        },
        { status: 400 }
      );
    }

    const urls: string[] = [];
    for (const file of files) {
      urls.push(await saveReviewImageFile(file));
    }
    await addReviewImages(reviewId, urls);

    const reviews = await listReviewsForRecipe(existing.recipeId);
    const review = reviews.find((r) => r.id === reviewId) ?? null;
    return NextResponse.json({ review, reviews }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not upload images";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to manage review photos." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("id");
    if (!imageId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(recipeReviewImages)
      .where(eq(recipeReviewImages.id, imageId))
      .limit(1);
    const img = rows[0];
    if (!img) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const review = await getReviewById(img.reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (!canManageReviewImages(user.role, review.userId, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteReviewImage(imageId);
    const reviews = await listReviewsForRecipe(review.recipeId);
    return NextResponse.json({ ok: true, reviews });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not delete image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
