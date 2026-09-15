# Recipe photo fallbacks

Recipes often ship without a plated photo. Cards, detail heroes, and the home hero use a branded sage/mustard placeholder (initials + “Photo soon”) instead of a broken `<img>` or a gray void.

## Behavior

- **Real photo:** `imageUrl` is a non-empty URL → Next.js `<Image>` as before.
- **No photo:** empty / missing `imageUrl` → CSS placeholder (`RecipePhoto`), no stock Unsplash default.
- Helpers live in `src/lib/recipes/image.ts` (`hasRecipeImage`, `resolveRecipeImageUrl`, `recipeImageInitials`).
- Seed samples without photos: Weeknight Carbonara, Citrus Olive Oil Cake, Smoky Black Bean Chili.
- Cooks/admins can set or clear a recipe photo URL on `/my-recipes` (create form + per-recipe “Save photo”). Review photo uploads are unchanged.

## Tests

`test/lib/recipes/image.test.ts` covers fallback vs real URL selection.
