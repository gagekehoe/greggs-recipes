# Hosting Gregg's Recipes

How to put the site on a dedicated URL with Vercel and (optionally) a custom domain.

## 1. Prerequisites

- This repo on GitHub: `https://github.com/gagekehoe/greggs-recipes`
- A [Vercel](https://vercel.com) account (Hobby/free is enough)
- A free [Neon](https://neon.tech) Postgres project (**required for production auth / reviews**)
- Optional for production content: a free [Sanity](https://www.sanity.io/) project
- Optional: a domain you control
- Email delivery for magic links in production: [Resend](https://resend.com) (or SMTP)

## 2. Neon database (production Auth.js + reviews)

Local dev keeps using SQLite (`data/auth.sqlite`) when `DATABASE_URL` is unset. Vercel must use Neon.

1. Create a free project at [console.neon.tech](https://console.neon.tech).
2. Copy the connection string (include `?sslmode=require`).
3. Push the schema (pick one):
   - **Preferred:** from your laptop:
     ```bash
     export DATABASE_URL="postgresql://..."
     npm run db:push
     ```
   - **Or** paste / run `drizzle/0000_neon_init.sql` in the Neon SQL Editor.
4. Set `DATABASE_URL` on Vercel (see env table below) and redeploy.

Schema source for Postgres: `src/lib/db/schema.pg.ts` (Drizzle). Local SQLite schema remains in `src/lib/db/schema.ts`.

If `DATABASE_URL` is missing on Vercel, **public recipe pages still load** (JSON/Sanity). Sign-in, reviews, and comments stay degraded until Neon is wired.

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `gagekehoe/greggs-recipes`.
2. Framework preset should detect **Next.js**. Leave build settings as defaults.
3. Add environment variables before the first production deploy:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes (prod auth)** | Neon Postgres URL (`postgresql://…?sslmode=require`) |
| `AUTH_SECRET` | Yes | Long random string (`openssl rand -base64 32`) |
| `AUTH_URL` | Yes (prod) | Canonical site URL — for this deploy: `https://greggs-recipes.vercel.app` |
| `ADMIN_EMAIL` | Yes | Bootstrap admin — `gagekehoe17@gmail.com` |
| `AUTH_RESEND_KEY` | Prod email | Resend API key so magic links are emailed |
| `EMAIL_FROM` | With Resend | Verified sender, e.g. `Gregg's Recipes <noreply@yourdomain.com>` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | For CMS | From Sanity project settings |
| `NEXT_PUBLIC_SANITY_DATASET` | For CMS | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Optional | e.g. `2025-01-01` |
| `SANITY_API_READ_TOKEN` | If private | Viewer token |
| `SANITY_API_WRITE_TOKEN` | For writes → Sanity | Editor token |

4. Click **Deploy**. Current production URL: `https://greggs-recipes.vercel.app`.

### Exact Vercel env vars for this site

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://greggs-recipes.vercel.app
ADMIN_EMAIL=gagekehoe17@gmail.com
# Optional but recommended for real email delivery:
AUTH_RESEND_KEY=re_...
EMAIL_FROM=Gregg's Recipes <onboarding@resend.dev>
```

### Auth storage notes

- **Local:** Auth.js uses SQLite at `data/auth.sqlite` (gitignored) when `DATABASE_URL` is unset.
- **Vercel:** Set `DATABASE_URL` to Neon. The app uses `drizzle-orm/neon-http` (no `better-sqlite3` on serverless).

Without Sanity env vars, the site boots from in-memory seed recipes on Vercel (never opens or writes `data/recipes.json` — that path is local/dev only and would hit EROFS on the serverless filesystem). Connect Sanity for durable publishing. Neon (`DATABASE_URL`) remains for Auth.js, reviews, and comments — not the recipe catalog.

Review photos are written under `public/uploads/reviews/` locally. That path is not durable on serverless — plan object storage before relying on review images in production (see [reviews-comments.md](./reviews-comments.md)).

## 4. Connect a custom domain

1. In Vercel: **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `greggsrecipes.com` or `www.greggsrecipes.com`).
3. Follow Vercel’s DNS instructions for your registrar, typically:
   - **Apex domain:** `A` record to `76.76.21.21` (confirm the current value in the Vercel UI)
   - **Subdomain (www):** `CNAME` to `cname.vercel-dns.com`
4. Wait for DNS propagation. Vercel issues HTTPS automatically. Set `AUTH_URL` to the final HTTPS URL and redeploy.

## 5. Content after go-live

**Recommended production path**

1. Create a Sanity project and deploy the `recipe` schema from `sanity/schemaTypes/recipe.ts`.
2. Set the Sanity env vars on Vercel and redeploy.
3. Add recipes via `/my-recipes` (cook/admin) when write token is set, or in Sanity Studio.

## 6. Git workflow

- All changes go through pull requests.
- Never push commits directly to `main`.
- Work on a feature branch → push to GitHub → open a draft PR into `main` → merge only when asked.

## 7. Local check before deploy

```bash
npm install
cp .env.example .env.local
npm run build
npm run start
```

App listens on port **43127** in this project’s npm scripts.
