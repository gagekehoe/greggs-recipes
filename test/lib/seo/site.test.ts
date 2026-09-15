import { describe, expect, it } from "vitest";
import {
  absoluteImageUrl,
  absoluteUrl,
  DEFAULT_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/seo/site";

describe("seo site helpers", () => {
  it("uses www as the canonical production origin", () => {
    expect(SITE_URL).toBe("https://www.greggsrecipes.com");
  });

  it("builds absolute site URLs", () => {
    expect(absoluteUrl("/")).toBe("https://www.greggsrecipes.com/");
    expect(absoluteUrl("/recipes/soup")).toBe(
      "https://www.greggsrecipes.com/recipes/soup"
    );
  });

  it("resolves recipe images for Open Graph", () => {
    expect(absoluteImageUrl("/recipes/cajun-tuna-bowl.jpg")).toBe(
      "https://www.greggsrecipes.com/recipes/cajun-tuna-bowl.jpg"
    );
    expect(absoluteImageUrl("https://cdn.example/photo.jpg")).toBe(
      "https://cdn.example/photo.jpg"
    );
    expect(absoluteImageUrl(null)).toBe(
      `https://www.greggsrecipes.com${DEFAULT_OG_IMAGE_PATH}`
    );
  });
});
