import { describe, expect, it } from "vitest";
import {
  hasRecipeImage,
  isAllowedNextImageSrc,
  recipeImageInitials,
  recipePlaceholderTone,
  resolveRecipeImageUrl,
} from "@/lib/recipes/image";

describe("recipe image helpers", () => {
  it("treats missing or blank URLs as no image (use fallback)", () => {
    expect(hasRecipeImage(undefined)).toBe(false);
    expect(hasRecipeImage(null)).toBe(false);
    expect(hasRecipeImage("")).toBe(false);
    expect(hasRecipeImage("   ")).toBe(false);
    expect(resolveRecipeImageUrl("")).toBeNull();
    expect(resolveRecipeImageUrl("  ")).toBeNull();
  });

  it("returns trimmed Next-safe image URLs and drops hosts that would 500", () => {
    const blob =
      "https://abc123.public.blob.vercel-storage.com/recipes/uuid.jpg";
    expect(hasRecipeImage(blob)).toBe(true);
    expect(resolveRecipeImageUrl(`  ${blob}  `)).toBe(blob);
    expect(resolveRecipeImageUrl("/uploads/recipes/bowl.jpg")).toBe(
      "/uploads/recipes/bowl.jpg"
    );
    expect(
      resolveRecipeImageUrl("https://images.unsplash.com/photo-1")
    ).toBe("https://images.unsplash.com/photo-1");
    expect(resolveRecipeImageUrl("https://cdn.sanity.io/images/x.jpg")).toBe(
      "https://cdn.sanity.io/images/x.jpg"
    );

    // Stored from the old free-text photo URL field — next/image throws
    // on unconfigured hosts and would 500 home / recipe pages.
    expect(resolveRecipeImageUrl("https://cdn.example.com/dish.jpg")).toBeNull();
    expect(resolveRecipeImageUrl("https://i.imgur.com/abc.jpg")).toBeNull();
    expect(resolveRecipeImageUrl("http://images.unsplash.com/x")).toBeNull();
    expect(resolveRecipeImageUrl("//cdn.sanity.io/x.jpg")).toBeNull();
    expect(isAllowedNextImageSrc("/recipes/cajun-tuna-bowl.jpg")).toBe(true);
    expect(isAllowedNextImageSrc("https://i.imgur.com/abc.jpg")).toBe(false);
  });

  it("builds monogram initials from the title", () => {
    expect(recipeImageInitials("Herb Roast Chicken")).toBe("HR");
    expect(recipeImageInitials("Carbonara")).toBe("CA");
    expect(recipeImageInitials("  ")).toBe("G");
    expect(recipeImageInitials("Smoky Black Bean Chili")).toBe("SB");
  });

  it("picks a stable placeholder tone from the title seed", () => {
    expect(recipePlaceholderTone("Weeknight Carbonara")).toBe(
      recipePlaceholderTone("Weeknight Carbonara")
    );
    const tones = new Set([
      recipePlaceholderTone("A"),
      recipePlaceholderTone("B"),
      recipePlaceholderTone("Citrus Olive Oil Cake"),
      recipePlaceholderTone("Miso Butter Salmon"),
      recipePlaceholderTone("Herb Roast Chicken"),
    ]);
    expect([...tones].every((t) => t === 0 || t === 1 || t === 2)).toBe(true);
    expect(tones.size).toBeGreaterThan(1);
  });
});
