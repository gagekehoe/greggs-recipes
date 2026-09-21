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
  rightsAttested: true as const,
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
    expect(listRecipes).toHaveBeenCalledWith();

    getSessionUser.mockResolvedValue(null);
    expect(
      (await GET(new Request("http://x/api/recipes?mine=1"))).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "cook", name: "Maya" });
    listRecipes.mockResolvedValue({
      recipes: [
        { id: "local-1", authorId: "u1", title: "Mine", isPrivate: true },
        { id: "local-2", authorId: "other", title: "Theirs", isPrivate: false },
      ],
      mode: "local",
    });
    const mine = await GET(new Request("http://x/api/recipes?mine=1"));
    expect(listRecipes).toHaveBeenCalledWith({
      includePrivateForUserId: "u1",
      viewerRole: "cook",
    });
    expect((await mine.json()).recipes).toHaveLength(1);
  });

  it("POST stores isPrivate from the payload", async () => {
    const { POST } = await import("@/app/api/recipes/route");
    getSessionUser.mockResolvedValue({
      id: "u1",
      role: "cook",
      name: "Maya",
      email: "m@example.com",
    });
    createRecipe.mockResolvedValue({
      recipe: { id: "local-priv", ...validRecipe, isPrivate: true },
      mode: "local",
    });
    const created = await POST(
      new Request("http://x/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validRecipe, isPrivate: true }),
      })
    );
    expect(created.status).toBe(201);
    expect(createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        isPrivate: true,
        authorId: "u1",
        authorName: "Maya",
      })
    );
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
    const invalidBody = await invalid.json();
    expect(invalidBody.error).not.toBe("Invalid recipe");
    expect(invalidBody.error).toMatch(/Title|Summary|Ingredients|Steps/i);
    expect(invalidBody.details?.fieldErrors).toBeTruthy();

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

    const longSummary =
      "This grilled chicken thigh recipe brings together a perfectly balanced sweet and savory rub—blending brown sugar, garlic, onion, paprika, and cracked black pepper-that caramelizes over the flame into a deeply flavorful, subtly charred crust. Using naturally tender boneless, skinless thighs makes the dish remarkably juicy and forgiving, while the option to marinate in as little as 10 minutes (or up to overnight) keeps preparation flexible. With a total grill time under 20 minutes, it delivers rich, high-impact barbecue flavor with minimum hassle, making it an ideal choice for both quick weeknight dinners and relaxed weekend gatherings.";
    createRecipe.mockResolvedValue({
      recipe: {
        id: "local-11",
        ...validRecipe,
        title: "Grilled Chicken Thighs",
        summary: longSummary,
        imageUrl:
          "https://abc.public.blob.vercel-storage.com/recipes/uuid.jpg",
      },
      mode: "local",
    });
    const longOk = await POST(
      new Request("http://x/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validRecipe,
          title: "Grilled Chicken Thighs",
          summary: longSummary,
          ingredients: ["1 ½ teaspoons onion powder", "2 tablespoon oil"],
          steps: ["Grill until 180°F."],
          tags: ["grill", "chicken"],
          prepMinutes: 30,
          cookMinutes: 20,
          servings: 6,
          imageUrl:
            "https://abc.public.blob.vercel-storage.com/recipes/uuid.jpg",
          imageAlt: "Grilled Chicken Thighs plated",
        }),
      })
    );
    expect(longOk.status).toBe(201);

    createRecipe.mockResolvedValue({
      recipe: { id: "local-10", ...validRecipe, imageUrl: "/uploads/recipes/a.jpg" },
      mode: "local",
    });
    const withRelative = await POST(
      new Request("http://x/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validRecipe,
          imageUrl: "/uploads/recipes/a.jpg",
        }),
      })
    );
    expect(withRelative.status).toBe(201);
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

    getRecipeById.mockResolvedValue({
      id: "local-1",
      authorId: "u1",
      isPrivate: true,
    });
    updateRecipe.mockResolvedValue({
      recipe: { id: "local-1", isPrivate: true },
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
    expect(updateRecipe).toHaveBeenCalledWith(
      "local-1",
      expect.objectContaining({
        title: validRecipe.title,
      })
    );
    expect(updateRecipe.mock.calls.at(-1)?.[1]).not.toHaveProperty(
      "isPrivate",
      false
    );
    expect(updateRecipe.mock.calls.at(-1)?.[1].isPrivate).toBeUndefined();

    updateRecipe.mockClear();
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: "local-1",
              ...validRecipe,
              isPrivate: false,
            }),
          })
        )
      ).status
    ).toBe(200);
    expect(updateRecipe.mock.calls.at(-1)?.[1].isPrivate).toBe(false);

    updateRecipe.mockClear();
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: "local-1",
              imageUrl: "/uploads/recipes/new.jpg",
              rightsAttested: true,
            }),
          })
        )
      ).status
    ).toBe(200);
    expect(updateRecipe.mock.calls.at(-1)?.[1]).toEqual({
      imageUrl: "/uploads/recipes/new.jpg",
    });

    updateRecipe.mockClear();
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: "local-1",
              isPrivate: true,
              rightsAttested: true,
            }),
          })
        )
      ).status
    ).toBe(200);
    expect(updateRecipe.mock.calls.at(-1)?.[1]).toEqual({
      isPrivate: true,
    });

    getRecipeById.mockResolvedValue({
      id: "local-priv",
      authorId: "other",
      isPrivate: true,
    });
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: "local-priv",
              ...validRecipe,
              isPrivate: false,
            }),
          })
        )
      ).status
    ).toBe(403);

    getSessionUser.mockResolvedValue({ id: "admin", role: "admin", name: "Gregg" });
    expect(
      (
        await PATCH(
          new Request("http://x/api/recipes", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: "local-priv",
              ...validRecipe,
              isPrivate: false,
            }),
          })
        )
      ).status
    ).toBe(403);

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
