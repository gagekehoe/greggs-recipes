# Hosting Gregg's Recipes

How to put the site on a dedicated URL with Vercel and (optionally) a custom domain.

## 1. Prerequisites

- This repo on GitHub: `https://github.com/gagekehoe/greggs-recipes`
- A [Vercel](https://vercel.com) account (Hobby/free is enough)
- A free [Neon](https://neon.tech) Postgres project (**required for production auth / reviews / recipes**)
- Optional / legacy CMS: a free [Sanity](https://www.sanity.io/) project (Neon is preferred for the recipe catalog)
- Optional: a domain you control
- Email delivery for magic links in production: [Resend](https://resend.com) (or SMTP)

## 2. Neon database (production Auth.js + reviews + recipes)

Local dev keeps using SQLite (`data/auth.sqlite`) when `DATABASE_URL` is unset. Vercel must use Neon.

1. Create a free project at [console.neon.tech](https://console.neon.tech).
2. Copy the connection string (include `?sslmode=require`).
3. Push the schema (pick one):
   - **Preferred:** from your laptop:
     ```bash
     export DATABASE_URL="postgresql://..."
     npm run db:push
     ```
   - **Or** paste / run `drizzle/0000_neon_init.sql` in the Neon SQL Editor (full init).
   - **Existing Neon DB** (auth already applied): run `drizzle/0001_recipe_catalog.sql` to add the `recipe` table + Cajun tuna bowl seed.
4. Set `DATABASE_URL` on Vercel (see env table below) and redeploy.

Schema source for Postgres: `src/lib/db/schema.pg.ts` (Drizzle). Local SQLite schema remains in `src/lib/db/schema.ts`.

If `DATABASE_URL` is missing on Vercel, **public recipe pages still load** from the in-memory seed (Cajun tuna bowl). Sign-in, reviews, comments, and durable recipe writes stay degraded until Neon is wired.

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `gagekehoe/greggs-recipes`.
2. Framework preset should detect **Next.js**. Leave build settings as defaults.
3. Add environment variables before the first production deploy:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes (prod)** | Neon Postgres URL (`postgresql://…?sslmode=require`) — auth, reviews, **and recipe catalog** |
| `AUTH_SECRET` | Yes | Long random string (`openssl rand -base64 32`) |
| `AUTH_URL` | Yes (prod) | Canonical site URL: `https://www.greggsrecipes.com` (must match Production host) |
| `ADMIN_EMAIL` | Yes | Bootstrap admin — `gagekehoe17@gmail.com` |
| `AUTH_RESEND_KEY` | Prod email | Resend API key so magic links are emailed |
| `EMAIL_FROM` | With Resend | Prefer a verified sender on your domain, e.g. `Gregg's Recipes <noreply@greggsrecipes.com>` (avoid bare `onboarding@resend.dev` in production — mismatched From/link domains look phishing-like) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | For CMS | From Sanity project settings |
| `NEXT_PUBLIC_SANITY_DATASET` | For CMS | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Optional | e.g. `2025-01-01` |
| `SANITY_API_READ_TOKEN` | If private | Viewer token |
| `SANITY_API_WRITE_TOKEN` | For writes → Sanity | Editor token |
| `BLOB_READ_WRITE_TOKEN` | **Yes for durable recipe/review photo uploads** | Vercel Blob store token (Storage → Blob) |

4. Click **Deploy**. Production custom domain: `https://www.greggsrecipes.com` (apex redirects → www).

### Exact Vercel env vars for this site

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://www.greggsrecipes.com
ADMIN_EMAIL=gagekehoe17@gmail.com
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
# Optional but recommended for real email delivery:
AUTH_RESEND_KEY=re_...
EMAIL_FROM=Gregg's Recipes <noreply@greggsrecipes.com>
```

Verify in Vercel that `AUTH_URL` is **`https://www.greggsrecipes.com`** — that is
the Production host. Apex `greggsrecipes.com` should 308 → www (do not flip
primary to apex). Magic links and Auth.js callbacks must match www. Blob uploads
are host-agnostic (`*.blob.vercel-storage.com`); a blank External API target in
logs usually means Blob was called with a missing/empty token URL rather than a
www/apex mismatch.

SEO metadata, sitemap absolute URLs, and `robots` host also use www — see the
project store doc `docs/seo-and-domains.md`.

### Exact Vercel env vars for this site (legacy preview URL)

If you still use a Vercel preview hostname before DNS is ready:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://YOUR-PROJECT.vercel.app
ADMIN_EMAIL=gagekehoe17@gmail.com
AUTH_RESEND_KEY=re_...
EMAIL_FROM=Gregg's Recipes <onboarding@resend.dev>
```

Switch `AUTH_URL` to `https://www.greggsrecipes.com` and `EMAIL_FROM` to a verified `greggsrecipes.com` sender as soon as the custom domain is live.

### Auth storage notes

- **Local:** Auth.js uses SQLite at `data/auth.sqlite` (gitignored) when `DATABASE_URL` is unset.
- **Vercel:** Set `DATABASE_URL` to Neon. The app uses `drizzle-orm/neon-http` (no `better-sqlite3` on serverless).

Without Sanity env vars, recipes still persist in Neon when `DATABASE_URL` is set (the intended production path). Local JSON under `data/recipes.json` is never opened on Vercel (EROFS). Neon powers Auth.js, reviews, comments, **and** the recipe catalog. Sanity remains optional/legacy — see [production-recipes.md](./production-recipes.md).

Review photos are written under `public/uploads/reviews/` locally. That path is not durable on serverless — plan object storage before relying on review images in production (see [reviews-comments.md](./reviews-comments.md)).

## 4. Connect a custom domain

**Current production setup (keep this):**

| Domain | Role |
|--------|------|
| `www.greggsrecipes.com` | **Production** (canonical) |
| `greggsrecipes.com` | **308 redirect → www** |

Do **not** make apex primary. Metadata / sitemap / `AUTH_URL` all use www.

1. In Vercel: **Project → Settings → Domains**.
2. Confirm both hosts are listed with the roles above.
3. DNS (typical):
   - **www:** `CNAME` to `cname.vercel-dns.com`
   - **Apex:** `A` record to `76.76.21.21` (confirm in the Vercel UI)
4. Wait for DNS propagation. Vercel issues HTTPS automatically.
5. Set `AUTH_URL=https://www.greggsrecipes.com` and redeploy so magic links match Production.

## 5. Content after go-live

**Recommended production path**

1. Ensure `DATABASE_URL` is set and the `recipe` table exists (`npm run db:push` or `drizzle/0001_recipe_catalog.sql`).
2. Confirm Browse Recipes shows the Cajun tuna bowl from Neon.
3. Add more dishes via `/my-recipes` (cook/admin) — writes go to Neon, no redeploy.

## 6. Analytics (Vercel)

The app ships `@vercel/analytics` and `@vercel/speed-insights` in the root layout. After merge/deploy:

1. Open the project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Go to **Analytics** → enable Web Analytics for Production (one-time toggle if prompted).
3. Optionally open **Speed Insights** and enable it the same way.
4. Visit `https://www.greggsrecipes.com` once; traffic appears in the dashboard within a few minutes.

No extra env vars are required for Analytics or Speed Insights on Vercel.

## 7. Git workflow

- All changes go through pull requests.
- Never push commits directly to `main`.
- Work on a feature branch → push to GitHub → open a draft PR into `main` → merge only when asked.

## 8. Local check before deploy

```bash
npm install
cp .env.example .env.local
npm run build
npm run start
```

App listens on port **43127** in this project’s npm scripts.
