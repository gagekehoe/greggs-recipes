# Gregg's Recipes

A shared recipe site for cooks — browse dishes publicly, then sign in with email and password to join, cook from the collection, and publish when you have cook or admin access.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Auth.js (email + password) · SQLite (local) / Neon Postgres (Vercel) · optional [Sanity](https://www.sanity.io/) CMS

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
| `/signin` | Email + password sign-in / create account |
| `/forgot-password` | Email a password-reset link (Resend in prod) |
| `/reset-password` | Set a new password from a reset link |
| `/welcome` | First-time display name setup |
| `/profile` | Edit display name |
| `/my-recipes` | Create/manage recipes (cook + admin + owner) |
| `/people` | Promote/demote roles (admin + owner) |

### Auth without email keys

Leave `AUTH_RESEND_KEY` unset. Sign in and register work with email + password locally. Forgot-password / first-time set-password links print in the terminal running `npm run dev`.

### Admin bootstrap

`ADMIN_EMAIL` (default in `.env.example`: `gagekehoe17@gmail.com`) is promoted to **owner** on sign-in (Gregg). You can change it in `.env.local` / Vercel env if needed.

### Roles

| Role | Can do |
|------|--------|
| `viewer` | Default for new signups — browse; leave reviews & comments |
| `cook` | Add / edit / delete **own** recipes; **Authorized cook** badge |
| `admin` | Manage public recipes + People (not Owner); **Admin** badge |
| `owner` | Same powers as admin; **Owner** badge (Gregg); only an owner can assign Owner |

Recipe cards and detail show **By {display name}** plus the role badge when relevant (never email). Private recipes appear in Browse for the signed-in author only, with a Private label.

Reviews & comments details: [docs/reviews-comments.md](./docs/reviews-comments.md). Testing notes: [docs/testing.md](./docs/testing.md). Recipe photo placeholders: [docs/recipe-photo-fallbacks.md](./docs/recipe-photo-fallbacks.md). Recipe photo uploads (Vercel Blob): see `.env.example` (`BLOB_READ_WRITE_TOKEN`). Private recipes (author-only): [docs/private-recipes.md](./docs/private-recipes.md).

## How content works

### Production path (Neon / SQLite)

When a database is configured (`DATABASE_URL` on Vercel, or local SQLite), recipes live in the `recipe` table. Browse Recipes and `/api/recipes` read from the DB. Cooks/admins publish via `/my-recipes` without a redeploy. Recipes marked **Private (only me)** stay off the public API and sitemap; the signed-in author still sees them on home Browse with a Private label, and everyone else gets 404 on the direct URL.

A fresh database is seeded with **Extra-Saucy Late-Night Cajun Tuna Bowl** (photo + author Gregg). See [docs/production-recipes.md](./docs/production-recipes.md).

### Local JSON fallback

If the database is unavailable (e.g. Vercel without `DATABASE_URL`), the app serves the in-memory / JSON seed catalog — currently just the Cajun tuna bowl. Writable `data/recipes.json` is local/dev only (read-only on serverless).

### Sanity (optional / legacy)

Sanity remains wired for optional CMS use, but **Neon is the intended production catalog**. When both are configured, the app prefers the database.

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
| `npm run db:push` | Push Postgres schema to Neon (`DATABASE_URL` required) |
| `npm run db:generate` | Generate Drizzle migrations from `schema.pg.ts` |

### Unit & integration tests

Vitest specs live under `test/` (not next to `src/`). Path aliases (`@/`) are wired in `vitest.config.ts`.

Coverage includes `src/lib/**`, API route handlers, and key client components (review/comment forms, sign-in, profile). Generated shadcn UI primitives and Auth.js bootstrap are excluded from the coverage gate.

```bash
npm test
npm run test:coverage
```

HTML report: `coverage/index.html`.