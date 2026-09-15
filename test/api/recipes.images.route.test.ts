import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const saveRecipeImageFile = vi.fn();
const usesVercelBlob = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));
vi.mock("@/lib/recipes/uploads", () => ({
  saveRecipeImageFile: (...a: unknown[]) => saveRecipeImageFile(...a),
}));
vi.mock("@/lib/uploads/image-store", () => ({
  usesVercelBlob: (...a: unknown[]) => usesVercelBlob(...a),
}));

describe("/api/recipes/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usesVercelBlob.mockReturnValue(false);
  });

  it("requires cook/admin", async () => {
    const { POST } = await import("@/app/api/recipes/images/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (await POST(new Request("http://x/api/recipes/images", { method: "POST" })))
        .status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    expect(
      (await POST(new Request("http://x/api/recipes/images", { method: "POST" })))
        .status
    ).toBe(401);
  });

  it("uploads a file and returns url", async () => {
    const { POST } = await import("@/app/api/recipes/images/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "cook", name: "Maya" });
    saveRecipeImageFile.mockResolvedValue("/uploads/recipes/abc.jpg");

    const form = new FormData();
    form.set(
      "file",
      new File([Uint8Array.from([1, 2, 3])], "bowl.jpg", { type: "image/jpeg" })
    );

    const res = await POST(
      new Request("http://x/api/recipes/images", { method: "POST", body: form })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toBe("/uploads/recipes/abc.jpg");
    expect(body.driver).toBe("local");
  });

  it("rejects empty multipart", async () => {
    const { POST } = await import("@/app/api/recipes/images/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "admin" });
    const res = await POST(
      new Request("http://x/api/recipes/images", {
        method: "POST",
        body: new FormData(),
      })
    );
    expect(res.status).toBe(400);
  });
});
