export type RatingSummary = {
  average: number;
  count: number;
};

/**
 * Average of 1–5 star ratings. Returns 0 average when empty.
 * Average is rounded to one decimal place for display.
 */
export function summarizeRatings(ratings: number[]): RatingSummary {
  const valid = ratings.filter(
    (r) => Number.isFinite(r) && r >= 1 && r <= 5
  );
  if (valid.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = valid.reduce((acc, r) => acc + r, 0);
  const average = Math.round((sum / valid.length) * 10) / 10;
  return { average, count: valid.length };
}

export function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

/** Soft caps for review photo uploads (aligned with shared image upload limits). */
export const REVIEW_IMAGE_LIMITS = {
  maxFilesPerReview: 4,
  maxBytesPerFile: 8 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,
} as const;

export function isAllowedReviewImageMime(mime: string): boolean {
  return (REVIEW_IMAGE_LIMITS.allowedMimeTypes as readonly string[]).includes(
    mime
  );
}

export function extensionForMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}
