import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const getUserDisplayName = vi.fn();
const getRecipeById = vi.fn();
const listReviewsForRecipe = vi.fn();
const getRatingSummary = vi.fn();
const upsertReview = vi.fn();
const getReviewById = vi.fn();
const deleteReview = vi.fn();
const addReviewImages = vi.fn();
const countReviewImages = vi.fn();
const saveReviewImageFile = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
  getUserDisplayName: (...a: unknown[]) => getUserDisplayName(...a),
}));
vi.mock("@/lib/recipes", () => ({
  getRecipeById: (...a: unknown[]) => getRecipeById(...a),
}));
vi.mock("@/lib/reviews/store", () => ({
  listReviewsForRecipe: (...a: unknown[]) => listReviewsForRecipe(...a),
  getRatingSummary: (...a: unknown[]) => getRatingSummary(...a),
  upsertReview: (...a: unknown[]) => upsertReview(...a),
  getReviewById: (...a: unknown[]) => getReviewById(...a),
  deleteReview: (...a: unknown[]) => deleteReview(...a),
  addReviewImages: (...a: unknown[]) => addReviewImages(...a),
  countReviewImages: (...a: unknown[]) => countReviewImages(...a),
}));
vi.mock("@/lib/reviews/uploads", () => ({
  saveReviewImageFile: (...a: unknown[]) => saveReviewImageFile(...a),
}));

describe("GET/POST/DELETE /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRatingSummary.mockResolvedValue({ average: 0, count: 0 });
    listReviewsForRecipe.mockResolvedValue([]);
  });

  it("GET requires recipeId and returns reviews", async () => {
    const { GET } = await import("@/app/api/reviews/route");
    const missing = await GET(new Request("http://localhost/api/reviews"));
    expect(missing.status).toBe(400);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    listReviewsForRecipe.mockResolvedValue([
      {
        id: "r1",
        userId: "u1",
        rating: 5,
        authorName: "Maya",
        body: null,
        images: [],
      },
    ]);
    getRatingSummary.mockResolvedValue({ average: 5, count: 1 });
    const ok = await GET(
      new Request("http://localhost/api/reviews?recipeId=recipe-1")
    );
    expect(ok?.status).toBe(200);
    const body = await ok!.json();
    expect(body.mine?.userId).toBe("u1");
    expect(body.signedIn).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/authorEmail/);
    for (const review of body.reviews) {
      expect(review).not.toHaveProperty("authorEmail");
    }
    expect(body.mine).not.toHaveProperty("authorEmail");
  });

  it("POST rejects guests and users without display names", async () => {
    const { POST } = await import("@/app/api/reviews/route");
    getSessionUser.mockResolvedValue(null);
    const guest = await POST(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        body: "{}",
      })
    );
    expect(guest?.status).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    getUserDisplayName.mockResolvedValue(null);
    const noDisplayName = await POST(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", rating: 5 }),
      })
    );
    expect(noDisplayName?.status).toBe(403);
  });

  it("POST validates JSON and creates a review", async () => {
    const { POST } = await import("@/app/api/reviews/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    getUserDisplayName.mockResolvedValue("Maya");
    getRecipeById.mockResolvedValue(null);

    const notFound = await POST(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "missing", rating: 5 }),
      })
    );
    expect(notFound?.status).toBe(404);

    const invalid = await POST(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", rating: 9 }),
      })
    );
    expect(invalid?.status).toBe(400);

    getRecipeById.mockResolvedValue({ id: "r1" });
    upsertReview.mockResolvedValue({ id: "rev1", rating: 4 });
    listReviewsForRecipe.mockResolvedValue([{ id: "rev1", userId: "u1" }]);
    getRatingSummary.mockResolvedValue({ average: 4, count: 1 });

    const created = await POST(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", rating: 4, body: " yum " }),
      })
    );
    expect(created?.status).toBe(201);
    expect(upsertReview).toHaveBeenCalledWith({
      recipeId: "r1",
      userId: "u1",
      rating: 4,
      body: "yum",
    });
  });

  it("POST accepts multipart review + photos", async () => {
    const { POST } = await import("@/app/api/reviews/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    getUserDisplayName.mockResolvedValue("Maya");
    getRecipeById.mockResolvedValue({ id: "r1" });
    upsertReview.mockResolvedValue({ id: "rev1", userId: "u1", rating: 5 });
    countReviewImages.mockResolvedValue(0);
    saveReviewImageFile.mockResolvedValue("/uploads/reviews/a.png");
    addReviewImages.mockResolvedValue([]);
    listReviewsForRecipe.mockResolvedValue([
      { id: "rev1", userId: "u1", rating: 5 },
    ]);
    getRatingSummary.mockResolvedValue({ average: 5, count: 1 });

    const form = new FormData();
    form.set("recipeId", "r1");
    form.set("rating", "5");
    form.set("body", "  crispy  ");
    form.append(
      "images",
      new File([new Uint8Array([1])], "a.png", { type: "image/png" })
    );

    const created = await POST(
      new Request("http://localhost/api/reviews", {
        method: "POST",
        body: form,
      })
    );
    expect(created?.status).toBe(201);
    expect(saveReviewImageFile).toHaveBeenCalled();
    expect(upsertReview).toHaveBeenCalledWith({
      recipeId: "r1",
      userId: "u1",
      rating: 5,
      body: "crispy",
    });
  });

  it("DELETE enforces authz", async () => {
    const { DELETE } = await import("@/app/api/reviews/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (await DELETE(new Request("http://localhost/api/reviews?id=x"))).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    expect(
      (await DELETE(new Request("http://localhost/api/reviews"))).status
    ).toBe(400);

    getReviewById.mockResolvedValue(null);
    expect(
      (await DELETE(new Request("http://localhost/api/reviews?id=missing")))
        .status
    ).toBe(404);

    getReviewById.mockResolvedValue({
      id: "rev1",
      userId: "other",
      recipeId: "r1",
    });
    expect(
      (await DELETE(new Request("http://localhost/api/reviews?id=rev1"))).status
    ).toBe(403);

    getSessionUser.mockResolvedValue({ id: "admin", role: "admin" });
    deleteReview.mockResolvedValue(true);
    getRatingSummary.mockResolvedValue({ average: 0, count: 0 });
    const ok = await DELETE(
      new Request("http://localhost/api/reviews?id=rev1")
    );
    expect(ok.status).toBe(200);
  });
});
