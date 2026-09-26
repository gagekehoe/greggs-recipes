# Browse catalog sort

## Behavior
- Home Browse default sort is **Newest** (`?sort=` omitted or `sort=newest`).
- **Newest** orders by `createdAt` descending — when the recipe was **added** to the site.
- **Oldest** (`sort=oldest`) is the opposite: `createdAt` ascending.
- Editing a recipe updates `updatedAt` only; it does **not** change Newest / Oldest order.
- **Highest rated** (`sort=rating`) uses the average of review star ratings (1–5) from `getRatingSummaries`:
  - Highest average first
  - Recipes with **no ratings** sort **after** all rated recipes (never above a rated dish)
  - Ties: more reviews, then newer `createdAt`, then title A–Z
- Other sorts: Title A–Z / Title Z–A.
- Shareable URL: `/?sort=oldest` or `/?sort=rating` (with existing `q`, `tag`, `view`).
- Public identity remains **Gregg**.

## Schema
- `recipe.createdAt` (timestamptz / integer ms) — set on insert; preserved on PATCH.
- Neon: apply `drizzle/0008_recipe_created_at.sql` (backfills existing rows from `updatedAt`).
- Rating sort needs **no** new Neon columns — averages come from existing `recipe_review` rows.

## Code
- Sort helper: `src/lib/recipes/catalog-query.ts` (`sortRecipesByCatalog`)
- Rating aggregate: `src/lib/reviews/rating.ts` + `getRatingSummaries` in `src/lib/reviews/store.ts`
- Stores: `db-store.ts`, `local-store.ts` (create sets both timestamps; update keeps `createdAt`)
- Tests: `test/lib/recipes/catalog-query.test.ts`, `test/lib/recipes/db-store.test.ts`
