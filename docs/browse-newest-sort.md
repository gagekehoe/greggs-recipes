# Browse “Newest” sort

## Behavior
- Home Browse default sort is **Newest** (`?sort=` omitted or `sort=newest`).
- **Newest** orders by `createdAt` descending — when the recipe was **added** to the site.
- Editing a recipe updates `updatedAt` only; it does **not** change Newest order.
- Other sorts: Title A–Z / Title Z–A (unchanged).
- Public identity remains **Gregg**.

## Schema
- `recipe.createdAt` (timestamptz / integer ms) — set on insert; preserved on PATCH.
- Neon: apply `drizzle/0008_recipe_created_at.sql` (backfills existing rows from `updatedAt`).

## Code
- Sort helper: `src/lib/recipes/catalog-query.ts` (`sortRecipesByCatalog`)
- Stores: `db-store.ts`, `local-store.ts` (create sets both timestamps; update keeps `createdAt`)
- Tests: `test/lib/recipes/catalog-query.test.ts`, `test/lib/recipes/db-store.test.ts`
