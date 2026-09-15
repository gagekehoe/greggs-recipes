import { describe, expect, it } from "vitest";
import {
  hasRecipeImage,
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

  it("returns trimmed real image URLs", () => {
    const url = "https://cdn.example.com/dish.jpg";
    expect(hasRecipeImage(url)).toBe(true);
    expect(hasRecipeImage(`  ${url}  `)).toBe(true);
    expect(resolveRecipeImageUrl(`  ${url}  `)).toBe(url);
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
