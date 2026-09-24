# Recipe photo fallbacks

Recipes often ship without a plated photo. Cards and detail heroes use a branded sage/mustard placeholder (initials + “Photo soon”) instead of a broken `<img>` or a gray void.

The **home banner** is different: it only uses a recipe that has a real photo URL. If none do, it shows the atmospheric kitchen backdrop (gradient + pattern) — never the “Photo soon” placeholder graphic.

## Behavior

- **Real photo:** `imageUrl` is a non-empty Blob/http (or allowed site) URL → Next.js `<Image>` as before.
- **No photo (cards/detail):** empty / missing `imageUrl` → CSS placeholder (`RecipePhoto`), no stock Unsplash default.
- **Home banner:** `pickHomeBannerRecipe` prefers a public recipe with `resolveRecipeImageUrl` truthy; otherwise any recipe with a real photo; otherwise the non-placeholder atmospheric plane.
- Known branding paths such as `/og-default.png` are not treated as recipe photos.
- Helpers live in `src/lib/recipes/image.ts` (`hasRecipeImage`, `hasRealRecipePhoto`, `resolveRecipeImageUrl`, `pickHomeBannerRecipe`, `recipeImageInitials`).
- Seed samples without photos: Weeknight Carbonara, Citrus Olive Oil Cake, Smoky Black Bean Chili.
- Cooks/admins can set or clear a recipe photo URL on `/my-recipes` (create form + per-recipe “Save photo”). Review photo uploads are unchanged.

## Tests

`test/lib/recipes/image.test.ts` covers fallback vs real URL selection and home banner picks.
