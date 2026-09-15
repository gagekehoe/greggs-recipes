import { describe, expect, it } from "vitest";
import {
  extensionForMime,
  isAllowedReviewImageMime,
  isValidRating,
  REVIEW_IMAGE_LIMITS,
  summarizeRatings,
} from "@/lib/reviews/rating";

describe("summarizeRatings", () => {
  it("returns zeros for an empty list", () => {
    expect(summarizeRatings([])).toEqual({ average: 0, count: 0 });
  });

  it("averages valid 1–5 ratings to one decimal", () => {
    expect(summarizeRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
    expect(summarizeRatings([5, 5, 5, 5])).toEqual({ average: 5, count: 4 });
    expect(summarizeRatings([1, 2])).toEqual({ average: 1.5, count: 2 });
  });

  it("ignores out-of-range values", () => {
    expect(summarizeRatings([5, 0, 6, Number.NaN, 3])).toEqual({
      average: 4,
      count: 2,
    });
  });
});

describe("isValidRating", () => {
  it("accepts integers 1–5 only", () => {
    expect(isValidRating(1)).toBe(true);
    expect(isValidRating(5)).toBe(true);
    expect(isValidRating(3.5)).toBe(false);
    expect(isValidRating(0)).toBe(false);
    expect(isValidRating(6)).toBe(false);
    expect(isValidRating("5")).toBe(false);
  });
});

describe("review image helpers", () => {
  it("exposes a small per-review photo cap", () => {
    expect(REVIEW_IMAGE_LIMITS.maxFilesPerReview).toBe(4);
  });

  it("allows common image mime types", () => {
    expect(isAllowedReviewImageMime("image/jpeg")).toBe(true);
    expect(isAllowedReviewImageMime("image/png")).toBe(true);
    expect(isAllowedReviewImageMime("image/webp")).toBe(true);
    expect(isAllowedReviewImageMime("image/gif")).toBe(true);
    expect(isAllowedReviewImageMime("application/pdf")).toBe(false);
  });

  it("maps mime types to extensions", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("text/plain")).toBeNull();
  });
});
