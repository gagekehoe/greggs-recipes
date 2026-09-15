# Hosting Gregg's Recipes

How to put the site on a dedicated URL with Vercel and (optionally) a custom domain.

## 1. Prerequisites

- This repo on GitHub: `https://github.com/gagekehoe/greggs-recipes`
- A [Vercel](https://vercel.com) account (Hobby/free is enough)
- Optional for production content: a free [Sanity](https://www.sanity.io/) project
- Optional: a domain you control
- Email delivery for magic links in production: [Resend](https://resend.com) (or SMTP)

## 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `gagekehoe/greggs-recipes`.
2. Framework preset should detect **Next.js**. Leave build settings as defaults.
3. Add environment variables before the first production deploy:

| Variable | Required | Notes |
|----------|----------|--------|
| `AUTH_SECRET` | Yes | Long random string (`openssl rand -base64 32`) |
| `AUTH_URL` | Yes (prod) | Canonical site URL, e.g. `https://your-domain.com` |
| `ADMIN_EMAIL` | Yes | Bootstrap admin — `gagekehoe17@gmail.com` |
| `AUTH_RESEND_KEY` | Prod email | Resend API key so magic links are emailed |
| `EMAIL_FROM` | With Resend | Verified sender, e.g. `Gregg's Recipes <noreply@yourdomain.com>` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | For CMS | From Sanity project settings |
| `NEXT_PUBLIC_SANITY_DATASET` | For CMS | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Optional | e.g. `2025-01-01` |
| `SANITY_API_READ_TOKEN` | If private | Viewer token |
| `SANITY_API_WRITE_TOKEN` | For writes → Sanity | Editor token |

4. Click **Deploy**. Vercel gives you a URL like `https://greggs-recipes-….vercel.app`.

### Auth storage notes

- **Local:** Auth.js uses SQLite at `data/auth.sqlite` (gitignored). Fine for demos.
- **Vercel:** The serverless filesystem is ephemeral. For durable sessions/users, move Auth.js to **Postgres (Neon)** before relying on production sign-in across instances. Until then, treat auth as demo-only on serverless, or attach a Neon `DATABASE_URL` in a follow-up.

Without Sanity env vars, the site still boots using seeded local recipes. On Vercel, recipe JSON writes may not persist — connect Sanity for durable publishing.

Review photos are written under `public/uploads/reviews/` locally. That path is not durable on serverless — plan object storage before relying on review images in production (see [reviews-comments.md](./reviews-comments.md)).

## 3. Connect a custom domain

1. In Vercel: **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `greggsrecipes.com` or `www.greggsrecipes.com`).
3. Follow Vercel’s DNS instructions for your registrar, typically:
   - **Apex domain:** `A` record to `76.76.21.21` (confirm the current value in the Vercel UI)
   - **Subdomain (www):** `CNAME` to `cname.vercel-dns.com`
4. Wait for DNS propagation. Vercel issues HTTPS automatically. Set `AUTH_URL` to the final HTTPS URL and redeploy.

## 4. Content after go-live

**Recommended production path**

1. Create a Sanity project and deploy the `recipe` schema from `sanity/schemaTypes/recipe.ts`.
2. Set the Sanity env vars on Vercel and redeploy.
3. Add recipes via `/my-recipes` (cook/admin) when write token is set, or in Sanity Studio.

## 5. Git workflow (Gage’s rule)

- All changes go through pull requests.
- Never push commits directly to `main`.
- Work on a feature branch → push to GitHub → open a draft PR into `main` → merge only when asked.

## 6. Local check before deploy

```bash
npm install
cp .env.example .env.local
npm run build
npm run start
```

App listens on port **43127** in this project’s npm scripts.
