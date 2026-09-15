import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const getRecipeById = vi.fn();
const listCommentsForRecipe = vi.fn();
const createComment = vi.fn();
const getCommentById = vi.fn();
const deleteComment = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));
vi.mock("@/lib/recipes", () => ({
  getRecipeById: (...a: unknown[]) => getRecipeById(...a),
}));
vi.mock("@/lib/reviews/store", () => ({
  listCommentsForRecipe: (...a: unknown[]) => listCommentsForRecipe(...a),
  createComment: (...a: unknown[]) => createComment(...a),
  getCommentById: (...a: unknown[]) => getCommentById(...a),
  deleteComment: (...a: unknown[]) => deleteComment(...a),
}));

describe("/api/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCommentsForRecipe.mockResolvedValue([]);
  });

  it("GET requires recipeId", async () => {
    const { GET } = await import("@/app/api/comments/route");
    expect((await GET(new Request("http://x/api/comments"))).status).toBe(400);
    getSessionUser.mockResolvedValue(null);
    const ok = await GET(new Request("http://x/api/comments?recipeId=r1"));
    expect(ok.status).toBe(200);
    expect((await ok.json()).signedIn).toBe(false);
  });

  it("POST requires sign-in and valid body", async () => {
    const { POST } = await import("@/app/api/comments/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (
        await POST(
          new Request("http://x/api/comments", {
            method: "POST",
            body: "{}",
          })
        )
      ).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    const invalid = await POST(
      new Request("http://x/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", body: "" }),
      })
    );
    expect(invalid.status).toBe(400);

    getRecipeById.mockResolvedValue(null);
    const missing = await POST(
      new Request("http://x/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", body: "Hi" }),
      })
    );
    expect(missing.status).toBe(404);

    getRecipeById.mockResolvedValue({ id: "r1" });
    createComment.mockResolvedValue({ id: "c1", body: "Hi" });
    listCommentsForRecipe.mockResolvedValue([{ id: "c1", body: "Hi" }]);
    const created = await POST(
      new Request("http://x/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", body: "Hi" }),
      })
    );
    expect(created.status).toBe(201);
  });

  it("DELETE enforces ownership or admin", async () => {
    const { DELETE } = await import("@/app/api/comments/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (await DELETE(new Request("http://x/api/comments?id=c1"))).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    expect((await DELETE(new Request("http://x/api/comments"))).status).toBe(
      400
    );

    getCommentById.mockResolvedValue(null);
    expect(
      (await DELETE(new Request("http://x/api/comments?id=missing"))).status
    ).toBe(404);

    getCommentById.mockResolvedValue({
      id: "c1",
      userId: "other",
      recipeId: "r1",
    });
    expect(
      (await DELETE(new Request("http://x/api/comments?id=c1"))).status
    ).toBe(403);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    getCommentById.mockResolvedValue({
      id: "c1",
      userId: "u1",
      recipeId: "r1",
    });
    deleteComment.mockResolvedValue(true);
    listCommentsForRecipe.mockResolvedValue([]);
    expect(
      (await DELETE(new Request("http://x/api/comments?id=c1"))).status
    ).toBe(200);
  });
});
