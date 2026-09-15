# Gregg's Recipes

A brand-first cooking site for home recipes — browse polished dishes, then add new ones from a password-protected **kitchen desk** without changing code or redeploying.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · optional [Sanity](https://www.sanity.io/) CMS

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — defaults work out of the box
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

| Path | What it is |
|------|------------|
| `/` | Home + recipe index |
| `/recipes/[slug]` | Recipe detail |
| `/admin` | Kitchen desk (add recipes) |

Default admin password: `greggskitchen` (override with `ADMIN_PASSWORD`).

## How content works

### Local mode (default — no CMS keys needed)

- Recipes live in `data/recipes.json` (seeded with five realistic dishes).
- The kitchen desk at `/admin` writes new recipes into that file.
- Great for local demos and development. On serverless hosts (Vercel), filesystem writes are ephemeral — use Sanity for production persistence.

### Sanity mode (recommended for production)

1. Create a free project at [sanity.io](https://www.sanity.io/).
2. Set env vars (see `.env.example`):
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - `NEXT_PUBLIC_SANITY_DATASET` (usually `production`)
   - `SANITY_API_READ_TOKEN` (optional for private datasets)
   - `SANITY_API_WRITE_TOKEN` (Editor token — required for kitchen desk → Sanity)
3. Deploy the schema in `sanity/schemaTypes/recipe.ts` (Sanity CLI or Studio).
4. Redeploy the Next app with those env vars. The site reads from Sanity; the kitchen desk creates documents there when a write token is present.

If Sanity is configured but empty or unreachable, the app falls back to the local seed so the site never goes blank.

## Hosting overview

Recommended: **Vercel + custom domain**. See the full guide:

- In this repo: summary below
- Project store (when available): `docs/hosting.md`

### Quick path to a dedicated URL

1. Push this repo to GitHub.
2. Import the project in [vercel.com/new](https://vercel.com/new).
3. Add env vars (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and Sanity vars if using CMS).
4. Deploy — you get a `*.vercel.app` URL immediately.
5. In Vercel → Project → Settings → Domains, add your domain and follow DNS instructions (usually an `A` record or CNAME).

## Scripts

- `npm run dev` — development server on port **43127**
- `npm run build` — production build
- `npm run start` — serve production build on **43127**
- `npm run lint` — ESLint
