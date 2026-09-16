# Production recipes (Neon)

Recipes for greggsrecipes.com persist in Neon Postgres when `DATABASE_URL` is set. Sample/filler dishes are removed — the only shipped seed is **Extra-Saucy Late-Night Cajun Tuna Bowl** (author **Gregg**, photo at `/recipes/cajun-tuna-bowl.jpg`).

## After merge (Gage)

If Neon already has Auth.js / review tables from the earlier init, apply the recipe catalog migration once:

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
npm run db:push
```

Or paste `drizzle/0001_recipe_catalog.sql` into the Neon SQL Editor (creates `recipe` + inserts the Cajun tuna bowl if missing).

For author-only drafts, also apply `drizzle/0002_recipe_privacy.sql` (adds `isPrivate`, default public). Details: [private-recipes.md](./private-recipes.md).

Confirm Vercel already has `DATABASE_URL` (same Neon DB used for auth/reviews). Redeploy after merge; no Sanity setup is required.

## Behavior

| Environment | Recipe storage |
|-------------|----------------|
| Vercel + `DATABASE_URL` | Neon `recipe` table (My recipes writes here) |
| Local, no `DATABASE_URL` | SQLite `data/auth.sqlite` `recipe` table |
| Vercel without DB | In-memory seed (Cajun tuna bowl only) |

The homepage no longer shows a “Content source: local” banner when the DB catalog loads successfully.
