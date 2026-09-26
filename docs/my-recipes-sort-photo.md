# My recipes sort and photo filter

Branch: `cursor/my-recipes-sort-photo-c473`

## Behavior
- `/my-recipes` gains **Sort** (Newest / Oldest by `createdAt`, Highest rated, Title A–Z / Z–A) and **Photo** (All / Has photo / No photo).
- URL: `?sort=&photo=` (plus existing `edit`). Defaults omitted (`newest`, `all`).
- Rating sort matches Browse: average stars desc; unrated last; ties by review count, then newest, then title.
- No tag filters on My recipes (Browse keeps its own tag wall).
- Empty list when filters match nothing; create form stays available.
- Auth unchanged: signed-in cook’s own recipes (staff still see public + own private).
- Public identity remains **Gregg**.

## Code
- Helpers: `src/lib/recipes/my-recipes-query.ts` (reuses `sortRecipesByCatalog`)
- Controls: `src/components/recipes/my-recipes-controls.tsx`
- Empty: `src/components/recipes/empty-my-recipes-matches.tsx`
- Page: `src/app/my-recipes/page.tsx`
- Editor preserves `sort`/`photo` while toggling `edit`
- Tests: `test/lib/recipes/my-recipes-query.test.ts`, `test/components/empty-my-recipes-matches.test.tsx`
