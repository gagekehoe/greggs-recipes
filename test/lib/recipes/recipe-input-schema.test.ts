import { describe, expect, it } from "vitest";
import {
  formatRecipeValidationError,
  recipeInputSchema,
  RECIPE_FIELD_LIMITS,
} from "@/lib/recipes/recipe-input-schema";
import { recipeApiErrorMessage } from "@/lib/recipes/api-error";

const grilledSummary =
  "This grilled chicken thigh recipe brings together a perfectly balanced sweet and savory rub—blending brown sugar, garlic, onion, paprika, and cracked black pepper-that caramelizes over the flame into a deeply flavorful, subtly charred crust. Using naturally tender boneless, skinless thighs makes the dish remarkably juicy and forgiving, while the option to marinate in as little as 10 minutes (or up to overnight) keeps preparation flexible. With a total grill time under 20 minutes, it delivers rich, high-impact barbecue flavor with minimum hassle, making it an ideal choice for both quick weeknight dinners and relaxed weekend gatherings.";

const grilledBase = {
  title: "Grilled Chicken Thighs",
  summary: grilledSummary,
  ingredients: [
    "3 pounds boneless, skinless chicken thighs",
    "1 tablespoon brown sugar",
    "1 ½ teaspoons onion powder",
    "2 tablespoon extra-virgin olive oil",
  ],
  steps: [
    "In a large plastic zip-top bag, combine the rub and oil. Add the chicken and massage until coated. Marinate 10–15 minutes or up to 12 hours.",
    "Preheat the grill on medium-high.",
    "Grill until lightly charred and the internal temperature reads 180°F. Rest at least 5 minutes.",
  ],
  tags: ["grill", "chicken"],
  prepMinutes: 30,
  cookMinutes: 20,
  servings: 6,
  rightsAttested: true as const,
};

describe("recipeInputSchema", () => {
  it("accepts Gage’s grilled chicken payload (long summary, unicode fractions, blob URL)", () => {
    expect(grilledSummary.length).toBeGreaterThan(500);
    expect(grilledSummary.length).toBeLessThanOrEqual(
      RECIPE_FIELD_LIMITS.summaryMax
    );

    const parsed = recipeInputSchema.safeParse({
      ...grilledBase,
      imageUrl:
        "https://abc.public.blob.vercel-storage.com/recipes/uuid.jpg",
      imageAlt: "Grilled Chicken Thighs plated",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts publish without a photo and with empty imageUrl", () => {
    expect(recipeInputSchema.safeParse(grilledBase).success).toBe(true);
    expect(
      recipeInputSchema.safeParse({ ...grilledBase, imageUrl: "" }).success
    ).toBe(true);
  });

  it("rejects publish/save without rights attestation", () => {
    const { rightsAttested: _omit, ...without } = grilledBase;
    const missing = recipeInputSchema.safeParse(without);
    expect(missing.success).toBe(false);
    if (missing.success) return;
    expect(formatRecipeValidationError(missing.error.flatten())).toMatch(
      /Rights confirmation/
    );

    const falsey = recipeInputSchema.safeParse({
      ...grilledBase,
      rightsAttested: false,
    });
    expect(falsey.success).toBe(false);
  });

  it("accepts optional Inspired by credit and https link", () => {
    const parsed = recipeInputSchema.safeParse({
      ...grilledBase,
      inspiredBy: "Mom’s weeknight chicken",
      inspiredByUrl: "https://example.com/chicken",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.inspiredBy).toBe("Mom’s weeknight chicken");
    expect(parsed.data.inspiredByUrl).toBe("https://example.com/chicken");
  });

  it("rejects non-http Inspired by links", () => {
    const parsed = recipeInputSchema.safeParse({
      ...grilledBase,
      inspiredBy: "A blog",
      inspiredByUrl: "ftp://example.com/recipe",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(formatRecipeValidationError(parsed.error.flatten())).toMatch(
      /Inspired by link/
    );
  });

  it("rejects oversized summaries with a specific field message", () => {
    const parsed = recipeInputSchema.safeParse({
      ...grilledBase,
      summary: "x".repeat(RECIPE_FIELD_LIMITS.summaryMax + 1),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const details = parsed.error.flatten();
    expect(details.fieldErrors.summary?.[0]).toMatch(/2000/);
    expect(formatRecipeValidationError(details)).toMatch(/^Summary:/);
  });

  it("rejects browser blob: photo URLs", () => {
    const parsed = recipeInputSchema.safeParse({
      ...grilledBase,
      imageUrl: "blob:https://www.greggsrecipes.com/abc-123",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(formatRecipeValidationError(parsed.error.flatten())).toMatch(
      /Recipe photo/
    );
  });
});

describe("recipeApiErrorMessage", () => {
  it("prefers field details over the generic Invalid recipe label", () => {
    expect(
      recipeApiErrorMessage({
        error: "Invalid recipe",
        details: {
          formErrors: [],
          fieldErrors: {
            summary: ["must be 2000 characters or fewer"],
          },
        },
      })
    ).toBe("Summary: must be 2000 characters or fewer");
  });

  it("falls back to error string when details are absent", () => {
    expect(recipeApiErrorMessage({ error: "Unauthorized" })).toBe(
      "Unauthorized"
    );
  });
});
