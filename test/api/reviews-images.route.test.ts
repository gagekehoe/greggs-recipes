import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const getReviewById = vi.fn();
const countReviewImages = vi.fn();
const addReviewImages = vi.fn();
const listReviewsForRecipe = vi.fn();
const deleteReviewImage = vi.fn();
const saveReviewImageFile = vi.fn();
const selectLimit = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));
vi.mock("@/lib/reviews/store", () => ({
  getReviewById: (...a: unknown[]) => getReviewById(...a),
  countReviewImages: (...a: unknown[]) => countReviewImages(...a),
  addReviewImages: (...a: unknown[]) => addReviewImages(...a),
  listReviewsForRecipe: (...a: unknown[]) => listReviewsForRecipe(...a),
  deleteReviewImage: (...a: unknown[]) => deleteReviewImage(...a),
}));
vi.mock("@/lib/reviews/uploads", () => ({
  saveReviewImageFile: (...a: unknown[]) => saveReviewImageFile(...a),
}));
vi.mock("@/lib/db", async () => {
  const schema = await import("@/lib/db/schema");
  return {
    isDatabaseConfigured: () => true,
    recipeReviewImages: schema.recipeReviewImages,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: (...a: unknown[]) => selectLimit(...a),
          }),
        }),
      }),
    },
  };
});

describe("/api/reviews/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST requires auth, ownership, and images", async () => {
    const { POST } = await import("@/app/api/reviews/images/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (
        await POST(
          new Request("http://x/api/reviews/images", {
            method: "POST",
            body: new FormData(),
          })
        )
      ).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    const form = new FormData();
    const missingId = await POST(
      new Request("http://x/api/reviews/images", {
        method: "POST",
        body: form,
      })
    );
    expect(missingId.status).toBe(400);

    form.set("reviewId", "rev1");
    getReviewById.mockResolvedValue(null);
    expect(
      (
        await POST(
          new Request("http://x/api/reviews/images", {
            method: "POST",
            body: form,
          })
        )
      ).status
    ).toBe(404);

    getReviewById.mockResolvedValue({
      id: "rev1",
      userId: "other",
      recipeId: "r1",
    });
    expect(
      (
        await POST(
          new Request("http://x/api/reviews/images", {
            method: "POST",
            body: form,
          })
        )
      ).status
    ).toBe(403);

    getReviewById.mockResolvedValue({
      id: "rev1",
      userId: "u1",
      recipeId: "r1",
    });
    const noFiles = await POST(
      new Request("http://x/api/reviews/images", {
        method: "POST",
        body: form,
      })
    );
    expect(noFiles.status).toBe(400);

    const withFile = new FormData();
    withFile.set("reviewId", "rev1");
    withFile.append(
      "images",
      new File([new Uint8Array([1])], "a.png", { type: "image/png" })
    );
    countReviewImages.mockResolvedValue(4);
    expect(
      (
        await POST(
          new Request("http://x/api/reviews/images", {
            method: "POST",
            body: withFile,
          })
        )
      ).status
    ).toBe(400);

    countReviewImages.mockResolvedValue(0);
    saveReviewImageFile.mockResolvedValue("/uploads/reviews/a.png");
    addReviewImages.mockResolvedValue([]);
    listReviewsForRecipe.mockResolvedValue([{ id: "rev1", images: [] }]);
    const ok = await POST(
      new Request("http://x/api/reviews/images", {
        method: "POST",
        body: withFile,
      })
    );
    expect(ok.status).toBe(201);
  });

  it("DELETE enforces authz", async () => {
    const { DELETE } = await import("@/app/api/reviews/images/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (await DELETE(new Request("http://x/api/reviews/images?id=i1"))).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    expect(
      (await DELETE(new Request("http://x/api/reviews/images"))).status
    ).toBe(400);

    selectLimit.mockResolvedValue([]);
    expect(
      (await DELETE(new Request("http://x/api/reviews/images?id=missing")))
        .status
    ).toBe(404);

    selectLimit.mockResolvedValue([{ id: "i1", reviewId: "rev1" }]);
    getReviewById.mockResolvedValue({ id: "rev1", userId: "other", recipeId: "r1" });
    expect(
      (await DELETE(new Request("http://x/api/reviews/images?id=i1"))).status
    ).toBe(403);

    getReviewById.mockResolvedValue({ id: "rev1", userId: "u1", recipeId: "r1" });
    deleteReviewImage.mockResolvedValue({ url: "/x", reviewId: "rev1" });
    listReviewsForRecipe.mockResolvedValue([]);
    expect(
      (await DELETE(new Request("http://x/api/reviews/images?id=i1"))).status
    ).toBe(200);
  });
});
