# Gregg's Recipes

A brand-first cooking site for home recipes — browse polished dishes publicly, then sign in with email to publish when you have cook or admin access.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Auth.js (email magic link) · SQLite (local auth) · optional [Sanity](https://www.sanity.io/) CMS

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

| Path | What it is |
|------|------------|
| `/` | Home + recipe index (public) |
| `/recipes/[slug]` | Recipe detail — reviews, photos, comments (public read; sign-in to post) |
| `/signin` | Email magic-link sign-in (creates account on first use) |
| `/welcome` | First-time display name setup |
| `/profile` | Edit display name |
| `/my-recipes` | Create/manage recipes (cook + admin) |
| `/people` | Promote/demote roles (admin only) |

### Auth without email keys

Leave `AUTH_RESEND_KEY` unset. Request a magic link on `/signin`, then copy the URL printed in the terminal running `npm run dev`.

### Admin bootstrap

`ADMIN_EMAIL` (default in `.env.example`: `gagekehoe17@gmail.com`) is promoted to **admin** on sign-in. Gage can change it in `.env.local` / Vercel env if needed.

### Roles

| Role | Can do |
|------|--------|
| `viewer` | Default for new signups — browse; leave reviews & comments |
| `cook` | Add / edit / delete **own** recipes; reviews & comments |
| `admin` | Manage **any** recipe + `/people` roles; moderate reviews/comments |

Reviews & comments details: [docs/reviews-comments.md](./docs/reviews-comments.md). Testing notes: [docs/testing.md](./docs/testing.md). Recipe photo placeholders: [docs/recipe-photo-fallbacks.md](./docs/recipe-photo-fallbacks.md).

## How content works

### Local mode (default — no CMS keys needed)

- Recipes live in `data/recipes.json` (seeded dishes attributed to `system` / Gregg's Kitchen).
- Auth users + sessions live in `data/auth.sqlite`.
- Cooks/admins publish via `/my-recipes`.

### Sanity mode (recommended for production content)

1. Create a free project at [sanity.io](https://www.sanity.io/).
2. Set Sanity env vars (see `.env.example`).
3. Deploy the schema in `sanity/schemaTypes/recipe.ts` (includes `authorId` / `authorName`).
4. Redeploy the Next app. Writes go to Sanity when `SANITY_API_WRITE_TOKEN` is set.

If Sanity is configured but empty or unreachable, the app falls back to the local seed so the site never goes blank.

## Hosting overview

Recommended: **Vercel + custom domain**. Auth sessions should use a durable database in production (Postgres/Neon). See:

- [docs/hosting.md](./docs/hosting.md)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on port **43127** |
| `npm run build` | Production build |
| `npm run start` | Serve production build on **43127** |
| `npm run lint` | ESLint |
| `npm test` | Unit/integration tests (Vitest, one-shot) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with V8 coverage report |

### Unit & integration tests

Vitest specs live under `test/` (not next to `src/`). Path aliases (`@/`) are wired in `vitest.config.ts`.

Coverage includes `src/lib/**`, API route handlers, and key client components (review/comment forms, sign-in, profile). Generated shadcn UI primitives and Auth.js bootstrap are excluded from the coverage gate.

```bash
npm test
npm run test:coverage
```

HTML report: `coverage/index.html`.