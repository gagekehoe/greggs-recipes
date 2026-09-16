import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const getRecipeById = vi.fn();
const listSharesForRecipe = vi.fn();
const addUserShare = vi.fn();
const addRoleShare = vi.fn();
const removeShare = vi.fn();
const isDatabaseConfigured = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: (...a: unknown[]) => isDatabaseConfigured(...a),
}));

vi.mock("@/lib/recipes", () => ({
  getRecipeById: (...a: unknown[]) => getRecipeById(...a),
}));

vi.mock("@/lib/recipes/shares", () => ({
  listSharesForRecipe: (...a: unknown[]) => listSharesForRecipe(...a),
  addUserShare: (...a: unknown[]) => addUserShare(...a),
  addRoleShare: (...a: unknown[]) => addRoleShare(...a),
  removeShare: (...a: unknown[]) => removeShare(...a),
  isShareableRole: (v: unknown) =>
    typeof v === "string" &&
    ["owner", "admin", "cook", "viewer"].includes(v),
  SHAREABLE_ROLES: ["owner", "admin", "cook", "viewer"],
}));

const privateRecipe = {
  id: "r1",
  slug: "secret",
  title: "Secret",
  isPrivate: true,
  authorId: "author-1",
  authorName: "Cook",
};

describe("POST/GET /api/recipes/shares", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionUser.mockReset();
    getRecipeById.mockReset();
    listSharesForRecipe.mockReset();
    addUserShare.mockReset();
    addRoleShare.mockReset();
    removeShare.mockReset();
    isDatabaseConfigured.mockReset();
    isDatabaseConfigured.mockReturnValue(true);
  });

  it("rejects unauthenticated callers", async () => {
    getSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/recipes/shares/route");
    const res = await GET(
      new Request("http://localhost/api/recipes/shares?recipeId=r1")
    );
    expect(res.status).toBe(401);
  });

  it("lets the author list and add user/role shares", async () => {
    getSessionUser.mockResolvedValue({
      id: "author-1",
      role: "cook",
      email: "cook@example.com",
      name: "Cook",
    });
    getRecipeById.mockResolvedValue(privateRecipe);
    listSharesForRecipe.mockResolvedValue([]);
    addUserShare.mockResolvedValue({
      id: "s1",
      recipeId: "r1",
      userId: "friend",
      role: null,
      createdAt: new Date().toISOString(),
      userName: "Friend",
      userEmail: "friend@example.com",
    });
    addRoleShare.mockResolvedValue({
      id: "s2",
      recipeId: "r1",
      userId: null,
      role: "admin",
      createdAt: new Date().toISOString(),
      userName: null,
      userEmail: null,
    });

    const { GET, POST } = await import("@/app/api/recipes/shares/route");
    const list = await GET(
      new Request("http://localhost/api/recipes/shares?recipeId=r1")
    );
    expect(list.status).toBe(200);

    const userShare = await POST(
      new Request("http://localhost/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", userId: "friend" }),
      })
    );
    expect(userShare.status).toBe(201);
    expect(addUserShare).toHaveBeenCalledWith("r1", "friend");

    const roleShare = await POST(
      new Request("http://localhost/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", role: "admin" }),
      })
    );
    expect(roleShare.status).toBe(201);
    expect(addRoleShare).toHaveBeenCalledWith("r1", "admin");
  });

  it("rejects sharing a public recipe and dual user+role payloads", async () => {
    getSessionUser.mockResolvedValue({
      id: "author-1",
      role: "cook",
      email: "cook@example.com",
      name: "Cook",
    });
    getRecipeById.mockResolvedValue({ ...privateRecipe, isPrivate: false });

    const { POST } = await import("@/app/api/recipes/shares/route");
    const publicRes = await POST(
      new Request("http://localhost/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", userId: "friend" }),
      })
    );
    expect(publicRes.status).toBe(400);

    getRecipeById.mockResolvedValue(privateRecipe);
    const both = await POST(
      new Request("http://localhost/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: "r1",
          userId: "friend",
          role: "admin",
        }),
      })
    );
    expect(both.status).toBe(400);
  });

  it("forbids non-authors from managing shares on others’ private recipes", async () => {
    getSessionUser.mockResolvedValue({
      id: "other",
      role: "admin",
      email: "admin@example.com",
      name: "Admin",
    });
    getRecipeById.mockResolvedValue(privateRecipe);

    const { POST } = await import("@/app/api/recipes/shares/route");
    const res = await POST(
      new Request("http://localhost/api/recipes/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: "r1", role: "cook" }),
      })
    );
    expect(res.status).toBe(403);
  });
});
