import { NextResponse } from "next/server";
import { z } from "zod";
import { hasKitchenStaffPowers } from "@/lib/auth/roles";
import { getSessionUser, getUserDisplayName } from "@/lib/auth/session";
import { getRecipeById } from "@/lib/recipes";
import {
  canEditOwnReview,
  canLeaveReview,
} from "@/lib/reviews/permissions";
import { isValidRating, REVIEW_IMAGE_LIMITS } from "@/lib/reviews/rating";
import {
  addReviewImages,
  countReviewImages,
  deleteReview,
  getRatingSummary,
  getReviewById,
  listReviewsForRecipe,
  upsertReview,
} from "@/lib/reviews/store";
import { saveReviewImageFile } from "@/lib/reviews/uploads";

const jsonUpsertSchema = z.object({
  recipeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional().nullable(),
});

async function requirePoster() {
  const user = await getSessionUser();
  if (!user || !canLeaveReview(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Sign in to leave a review." },
        { status: 401 }
      ),
    } as const;
  }
  const displayName = await getUserDisplayName(user.id);
  if (!displayName) {
    return {
      error: NextResponse.json(
        {
          error: "Set a display name on your profile before reviewing.",
          code: "PROFILE_REQUIRED",
        },
        { status: 403 }
      ),
    } as const;
  }
  return { user } as const;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("recipeId");
  if (!recipeId) {
    return NextResponse.json({ error: "Missing recipeId" }, { status: 400 });
  }

  const [reviews, summary] = await Promise.all([
    listReviewsForRecipe(recipeId),
    getRatingSummary(recipeId),
  ]);

  const user = await getSessionUser();
  const mine = user
    ? reviews.find((r) => r.userId === user.id) ?? null
    : null;

  return NextResponse.json({
    reviews,
    summary,
    mine,
    signedIn: Boolean(user),
  });
}

export async function POST(request: Request) {
  // Hard requirement: no guest reviews; display name required
  const gate = await requirePoster();
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const recipeId = String(form.get("recipeId") || "");
      const ratingRaw = Number(form.get("rating"));
      const bodyRaw = form.get("body");
      const body =
        typeof bodyRaw === "string" && bodyRaw.trim()
          ? bodyRaw.trim().slice(0, 1000)
          : null;

      if (!recipeId || !isValidRating(ratingRaw)) {
        return NextResponse.json(
          { error: "recipeId and a 1–5 rating are required." },
          { status: 400 }
        );
      }

      const recipe = await getRecipeById(recipeId);
      if (!recipe) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }

      const review = await upsertReview({
        recipeId,
        userId: user.id,
        rating: ratingRaw,
        body,
      });

      const files = form
        .getAll("images")
        .filter((f): f is File => f instanceof File && f.size > 0);

      if (files.length > 0) {
        const currentCount = await countReviewImages(review.id);
        const room = REVIEW_IMAGE_LIMITS.maxFilesPerReview - currentCount;
        if (room <= 0 || files.length > room) {
          return NextResponse.json(
            {
              error: `You can attach up to ${REVIEW_IMAGE_LIMITS.maxFilesPerReview} photos per review.`,
              review,
            },
            { status: 400 }
          );
        }

        const urls: string[] = [];
        for (const file of files) {
          urls.push(await saveReviewImageFile(file));
        }
        await addReviewImages(review.id, urls);
      }

      const [reviews, summary] = await Promise.all([
        listReviewsForRecipe(recipeId),
        getRatingSummary(recipeId),
      ]);
      const mine = reviews.find((r) => r.userId === user.id) ?? null;
      return NextResponse.json(
        { review: mine, reviews, summary },
        { status: 201 }
      );
    }

    const json = await request.json();
    const parsed = jsonUpsertSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const recipe = await getRecipeById(parsed.data.recipeId);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body =
      parsed.data.body && parsed.data.body.trim()
        ? parsed.data.body.trim()
        : null;

    const review = await upsertReview({
      recipeId: parsed.data.recipeId,
      userId: user.id,
      rating: parsed.data.rating,
      body,
    });

    const [reviews, summary] = await Promise.all([
      listReviewsForRecipe(parsed.data.recipeId),
      getRatingSummary(parsed.data.recipeId),
    ]);

    return NextResponse.json({ review, reviews, summary }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to manage reviews." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await getReviewById(id);
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const isReviewAuthor = canEditOwnReview(user.role, existing.userId, user.id);
    if (!isReviewAuthor && !hasKitchenStaffPowers(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteReview(id);
    const summary = await getRatingSummary(existing.recipeId);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not delete review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
