# Private recipes

Cooks and admins can mark a recipe **Private** on My recipes. Public remains the default. Existing Neon/SQLite rows stay public (`isPrivate = false`).

Private recipes support **selective sharing**: the author (or a cook who can manage the recipe) can grant view access to **named users** and/or **roles** (for example Admin). There is no “share with everyone” control — use **Public** for that.

## Behavior

| Surface | Private recipe |
|---------|----------------|
| Home / Browse (“On the table”) | Visible to the signed-in **author** and anyone with a **user or role share**; hidden for guests and non-recipients |
| `GET /api/recipes` (no `mine`) | Hidden (public catalog only) |
| Sitemap | Hidden |
| `/recipes/[slug]` + OG metadata | **404** unless author or share recipient |
| My recipes + `GET /api/recipes?mine=1` | Management list: author (and staff’s own private dishes). Shared-with-me dishes appear on Browse/detail, not as editable “mine” rows |
| Share UI | My recipes (private rows + edit form) and recipe detail when you can manage the recipe |
| Make public / Make private | Author (or cook owning the recipe) can toggle later |

Identity matches My recipes ownership: **Auth.js user id** on `recipe.authorId` (not email). Share grants store `recipe_share.userId` and/or `recipe_share.role`.

Home calls `listRecipes({ includePrivateForUserId, viewerRole })` when signed in. Sitemap and the public API still call `listRecipes()` with no viewer id.

Staff do **not** automatically see others’ private recipes (same as before). A role share for `admin` / `owner` is the selective way to grant that.

Public UI copy still uses **Gregg** as the site identity.

## After merge (Gage) — Neon

Apply the share table once on the production Neon database:

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
npm run db:push
```

Or paste `drizzle/0006_recipe_shares.sql` into the Neon SQL Editor.

Local SQLite creates `recipe_share` on next process start (`CREATE TABLE IF NOT EXISTS` in `src/lib/db/index.ts`). Redeploy Vercel after merge; no env var changes.
