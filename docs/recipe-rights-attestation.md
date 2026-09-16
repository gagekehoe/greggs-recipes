# Recipe rights attestation & Inspired by

Practical copyright safeguard on **My recipes** publish/edit — not a legal clearance claim.

## Rights checkbox (required)

On create and edit, cooks must check:

> I wrote this recipe or have the right to share it — it is not copied verbatim from another site.

- Submit stays disabled until checked.
- The form also shows a short helper: cooks are responsible for what they post on Gregg’s Recipes.
- The API requires `rightsAttested: true` on POST/PATCH; the flag is **not** stored on the recipe row.
- There is **no** paste heuristic / soft paste warning.

## Inspired by (optional)

| Field | Purpose |
|-------|---------|
| `inspiredBy` | Credit text (cook, book, site) |
| `inspiredByUrl` | Optional `http(s)` link |

- Shown on the **recipe detail** page when `inspiredBy` is non-empty.
- **Not** shown on browse / recipe cards.
- Persisted on Neon/SQLite (`drizzle/0004_recipe_inspired_by.sql`).

## After merge — Neon

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
npm run db:push
```

Or run `drizzle/0004_recipe_inspired_by.sql` in the Neon SQL Editor. Local SQLite adds the columns on next process start via `ALTER TABLE` in `src/lib/db/index.ts`.
