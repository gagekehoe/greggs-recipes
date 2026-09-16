# Private recipes

Cooks and admins can mark a recipe **Private (only me)** on My recipes. Public remains the default. Existing Neon/SQLite rows stay public (`isPrivate = false`).

## Behavior

| Surface | Private recipe |
|---------|----------------|
| Home / Browse (“On the table”) | **Visible to the signed-in author** (mixed into the grid) with a **Private** label; hidden for guests and other users |
| `GET /api/recipes` (no `mine`) | Hidden (public catalog only) |
| Sitemap | Hidden |
| `/recipes/[slug]` + OG metadata | **404** for anyone except the author (`authorId === session.user.id`) |
| My recipes + `GET /api/recipes?mine=1` | Visible to the author; admins see public recipes from everyone plus their own private ones |
| Make public / Make private | Author (or cook owning the recipe) can toggle later |

Identity matches My recipes ownership: **Auth.js user id** on `recipe.authorId` (not email).

Home calls `listRecipes({ includePrivateForUserId: session.user.id })` when signed in. Sitemap and the public API still call `listRecipes()` with no viewer id.

Public UI copy still uses **Gregg** as the site identity; private drafts are personal to the signed-in cook.

## After merge (Gage) — Neon

Apply the privacy column once on the production Neon database:

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
npm run db:push
```

Or paste `drizzle/0002_recipe_privacy.sql` into the Neon SQL Editor:

```sql
ALTER TABLE "recipe"
  ADD COLUMN IF NOT EXISTS "isPrivate" boolean DEFAULT false NOT NULL;
```

Local SQLite picks up the column on next process start (`ALTER TABLE` in `src/lib/db/index.ts`). Redeploy Vercel after merge; no env var changes.
