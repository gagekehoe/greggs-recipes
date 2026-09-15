"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RatingSummary } from "@/lib/reviews/rating";
import { REVIEW_IMAGE_LIMITS } from "@/lib/reviews/rating";
import type { ReviewWithAuthor } from "@/lib/reviews/store";

type Props = {
  recipeId: string;
  initialReviews: ReviewWithAuthor[];
  initialSummary: RatingSummary;
  signedIn: boolean;
  hasDisplayName: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  signInHref: string;
  profileHref: string;
};

function StarRow({
  value,
  onChange,
  interactive,
  size = "md",
}: {
  value: number;
  onChange?: (n: number) => void;
  interactive?: boolean;
  size?: "sm" | "md";
}) {
  const cls = size === "sm" ? "text-base" : "text-2xl";
  return (
    <div
      className={`flex gap-1 ${cls}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        if (!interactive || !onChange) {
          return (
            <span
              key={n}
              className={filled ? "text-[var(--accent-deep)]" : "text-[var(--line)]"}
              aria-hidden
            >
              ★
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`leading-none transition-colors ${
              filled ? "text-[var(--accent-deep)]" : "text-[var(--line)]"
            } hover:text-[var(--accent-deep)]`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function formatWhen(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RecipeReviewsSection({
  recipeId,
  initialReviews,
  initialSummary,
  signedIn,
  hasDisplayName,
  currentUserId,
  isAdmin,
  signInHref,
  profileHref,
}: Props) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const mine = useMemo(
    () =>
      currentUserId
        ? reviews.find((r) => r.userId === currentUserId) ?? null
        : null,
    [reviews, currentUserId]
  );

  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? "");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshFromPayload(payload: {
    reviews?: ReviewWithAuthor[];
    summary?: RatingSummary;
  }) {
    if (payload.reviews) setReviews(payload.reviews);
    if (payload.summary) setSummary(payload.summary);
    router.refresh();
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!signedIn) {
      setError("Sign in to leave a review.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Pick a star rating from 1 to 5.");
      return;
    }

    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("recipeId", recipeId);
        form.set("rating", String(rating));
        if (body.trim()) form.set("body", body.trim());
        if (files) {
          const remaining =
            REVIEW_IMAGE_LIMITS.maxFilesPerReview - (mine?.images.length ?? 0);
          const list = Array.from(files).slice(0, Math.max(0, remaining));
          for (const file of list) {
            form.append("images", file);
          }
        }

        const res = await fetch("/api/reviews", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not save review");
          return;
        }
        refreshFromPayload(data);
        setFiles(null);
        if (data.review) {
          setRating(data.review.rating);
          setBody(data.review.body ?? "");
        }
      } catch {
        setError("Could not save review");
      }
    });
  }

  async function removeReview(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete review");
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== id));
      if (data.summary) setSummary(data.summary);
      setRating(0);
      setBody("");
      router.refresh();
    });
  }

  const roomForPhotos =
    REVIEW_IMAGE_LIMITS.maxFilesPerReview - (mine?.images.length ?? 0);

  return (
    <section className="border-t border-[var(--line)]/80 pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-[var(--ink)]">Reviews</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {summary.count === 0
              ? "No ratings yet — be the first after you sign in."
              : `${summary.average} average · ${summary.count} review${
                  summary.count === 1 ? "" : "s"
                }`}
          </p>
        </div>
        {summary.count > 0 ? (
          <StarRow value={Math.round(summary.average)} size="sm" />
        ) : null}
      </div>

      {!signedIn ? (
        <div className="mt-8 border border-[var(--line)] bg-[var(--paper)]/70 px-5 py-6">
          <p className="text-[var(--ink)]">
            Sign in to leave a star rating, a short note, and optional photos.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Guests can read reviews; posting requires an account.
          </p>
          <Link
            href={signInHref}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--ink)] px-4 text-sm font-medium text-[#f7f4ec] transition-colors hover:bg-[var(--sage-deep)]"
          >
            Sign in to review
          </Link>
        </div>
      ) : !hasDisplayName ? (
        <div className="mt-8 border border-[var(--line)] bg-[var(--paper)]/70 px-5 py-6">
          <p className="text-[var(--ink)]">
            Choose a display name before you post a review.
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Reviews show your name — not your email.
          </p>
          <Link
            href={profileHref}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--ink)] px-4 text-sm font-medium text-[#f7f4ec] transition-colors hover:bg-[var(--sage-deep)]"
          >
            Set display name
          </Link>
        </div>
      ) : (
        <form onSubmit={submitReview} className="mt-8 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--ink)]">
              {mine ? "Update your review" : "Your review"}
            </p>
            <StarRow value={rating} onChange={setRating} interactive />
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Optional — how did it turn out?"
            maxLength={1000}
            rows={3}
            className="rounded-none border-[var(--line)] bg-[var(--paper)]/50"
          />
          {roomForPhotos > 0 ? (
            <div>
              <label className="block text-sm text-[var(--ink-muted)]">
                Photos (up to {REVIEW_IMAGE_LIMITS.maxFilesPerReview} total,
                JPEG/PNG/WebP/GIF)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="mt-2 block w-full text-sm text-[var(--ink-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mist)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--ink)]"
                onChange={(e) => setFiles(e.target.files)}
              />
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {mine ? "Save review" : "Post review"}
            </Button>
            {mine ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => removeReview(mine.id)}
              >
                Remove my review
              </Button>
            ) : null}
          </div>
        </form>
      )}

      <ul className="mt-10 space-y-8">
        {reviews.length === 0 ? (
          <li className="text-sm text-[var(--ink-soft)]">No reviews yet.</li>
        ) : (
          reviews.map((review) => (
            <li
              key={review.id}
              className="border-b border-[var(--line)]/60 pb-8 last:border-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--ink)]">
                    {review.authorName || "Cook"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                    {formatWhen(review.updatedAt)}
                  </p>
                </div>
                <StarRow value={review.rating} size="sm" />
              </div>
              {review.body ? (
                <p className="mt-3 leading-relaxed text-[var(--ink-muted)]">
                  {review.body}
                </p>
              ) : null}
              {review.images.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {review.images.map((img) => (
                    <div
                      key={img.id}
                      className="relative h-24 w-32 overflow-hidden bg-[var(--sage)]/30"
                    >
                      <Image
                        src={img.url}
                        alt={`Photo from ${review.authorName || "a cook"}`}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {isAdmin && currentUserId !== review.userId ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
                  onClick={() => removeReview(review.id)}
                >
                  Delete review (admin)
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
