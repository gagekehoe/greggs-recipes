import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const listRecipes = vi.fn();
const createRecipe = vi.fn();
const getRecipeById = vi.fn();
const updateRecipe = vi.fn();
const removeRecipe = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));
vi.mock("@/lib/recipes", () => ({
  listRecipes: (...a: unknown[]) => listRecipes(...a),
  createRecipe: (...a: unknown[]) => createRecipe(...a),
  getRecipeById: (...a: unknown[]) => getRecipeById(...a),
  updateRecipe: (...a: unknown[]) => updateRecipe(...a),
  removeRecipe: (...a: unknown[]) => removeRecipe(...a),
}));

const validRecipe = {
  title: "Tomato Soup",
  summary: "A simple tomato soup for weeknights.",
  ingredients: ["tomatoes"],
  steps: ["simmer"],
  tags: ["soup"],
  prepMinutes: 10,
  cookMinutes: 20,
  servings: 4,
};

describe("/api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecipes.mockResolvedValue({
      recipes: [
        { id: "local-1", authorId: "u1", title: "Mine" },
        { id: "local-2", authorId: "other", title: "Theirs" },
      ],
      mode: "local",
    });
  });

  it("GET lists all or mine with auth", async () => {
    const { GET } = await import("@/app/api/recipes/route");
    const all = await GET(new Request("http://x/api/recipes"));
    expect(all.status).toBe(200);
    expect((await all.json()).recipes).toHaveLength(2);

    getSessionUser.mockResolvedValue(null);
    expect(
      (await GET(new Request("http://x/api/recipes?mine=1"))).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "cook", name: "Maya" });
    const mine = await GET(new Request("http://x/api/recipes?mine=1"));
    expect((await mine.json()).recipes).toHaveLength(1);
  });

  it("POST requires cook/admin and validates", async () => {
    const { POST } = await import("@/app/api/recipes/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    expect(
      (
        await POST(
          new Request("http://x/api/recipes", {
            method: "POST",
            body: "{}",
          })
        )
      ).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({
      id: "u1",
      role: "cook",
      name: "Maya",
      email: "m@example.com",
    });
    const invalid = await POST(
      new Request("http://x/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      })
    );
    expect(invalid.status).toBe(400);

    createRecipe.mockResolvedValue({
      recipe: { id: "local-9", ...validRecipe },
      mode: "local",
    });
    const created = await POST(
      new Request("http://x/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validRecipe),
      })
    );
    expect(created.status).toBe(201);
  });

  it("PATCH/DELETE enforce ownership", async () => {
    const { PATCH, DELETE } = await import("@/app/api/recipes/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "cook", name: "Maya" });

    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(validRecipe),
          })
        )
      ).status
    ).toBe(400);

    getRecipeById.mockResolvedValue({ id: "local-2", authorId: "other" });
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: "local-2", ...validRecipe }),
          })
        )
      ).status
    ).toBe(403);

    getRecipeById.mockResolvedValue({ id: "local-1", authorId: "u1" });
    updateRecipe.mockResolvedValue({
      recipe: { id: "local-1" },
      mode: "local",
    });
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: "local-1", ...validRecipe }),
          })
        )
      ).status
    ).toBe(200);

    expect(
      (await DELETE(new Request("http://x/api/recipes"))).status
    ).toBe(400);
    getRecipeById.mockResolvedValue({ id: "local-1", authorId: "u1" });
    removeRecipe.mockResolvedValue(true);
    expect(
      (await DELETE(new Request("http://x/api/recipes?id=local-1"))).status
    ).toBe(200);
  });
});
