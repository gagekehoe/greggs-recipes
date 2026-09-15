import { describe, expect, it } from "vitest";
import {
  canDeleteComment,
  canEditOwnReview,
  canLeaveReview,
  canManageReviewImages,
  canPostComment,
} from "@/lib/reviews/permissions";

describe("canLeaveReview / canPostComment", () => {
  it("allows signed-in viewer, cook, and admin", () => {
    expect(canLeaveReview("viewer")).toBe(true);
    expect(canLeaveReview("cook")).toBe(true);
    expect(canLeaveReview("admin")).toBe(true);
    expect(canPostComment("viewer")).toBe(true);
  });

  it("rejects guests (no role)", () => {
    expect(canLeaveReview(null)).toBe(false);
    expect(canLeaveReview(undefined)).toBe(false);
    expect(canPostComment(null)).toBe(false);
    expect(canPostComment(undefined)).toBe(false);
  });
});

describe("canEditOwnReview", () => {
  it("lets the author edit their review when signed in", () => {
    expect(canEditOwnReview("viewer", "u1", "u1")).toBe(true);
    expect(canEditOwnReview("cook", "u1", "u1")).toBe(true);
  });

  it("blocks other users and guests", () => {
    expect(canEditOwnReview("viewer", "u1", "u2")).toBe(false);
    expect(canEditOwnReview("admin", "u1", "u2")).toBe(false);
    expect(canEditOwnReview("viewer", "u1", null)).toBe(false);
    expect(canEditOwnReview(null, "u1", "u1")).toBe(false);
  });
});

describe("canDeleteComment", () => {
  it("lets authors delete their own comments", () => {
    expect(canDeleteComment("viewer", "u1", "u1")).toBe(true);
    expect(canDeleteComment("cook", "u1", "u1")).toBe(true);
  });

  it("lets admin delete any comment", () => {
    expect(canDeleteComment("admin", "u1", "admin-id")).toBe(true);
  });

  it("blocks other non-admins and guests", () => {
    expect(canDeleteComment("viewer", "u1", "u2")).toBe(false);
    expect(canDeleteComment("cook", "u1", "u2")).toBe(false);
    expect(canDeleteComment(null, "u1", "u1")).toBe(false);
    expect(canDeleteComment("viewer", "u1", null)).toBe(false);
  });
});

describe("canManageReviewImages", () => {
  it("allows owner or admin only — never guests", () => {
    expect(canManageReviewImages("viewer", "u1", "u1")).toBe(true);
    expect(canManageReviewImages("admin", "u1", "admin")).toBe(true);
    expect(canManageReviewImages("cook", "u1", "u2")).toBe(false);
    expect(canManageReviewImages(null, "u1", "u1")).toBe(false);
  });
});
