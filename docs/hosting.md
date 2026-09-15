# Hosting Gregg's Recipes

How to put the site on a dedicated URL with Vercel and (optionally) a custom domain.

## 1. Prerequisites

- This repo on GitHub: `https://github.com/gagekehoe/greggs-recipes`
- A [Vercel](https://vercel.com) account (Hobby/free is enough)
- Optional for production content: a free [Sanity](https://www.sanity.io/) project
- Optional: a domain you control

## 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `gagekehoe/greggs-recipes`.
2. Framework preset should detect **Next.js**. Leave build settings as defaults (`npm run build`, output handled by Next).
3. Add environment variables before the first production deploy:

| Variable | Required | Notes |
|----------|----------|--------|
| `ADMIN_PASSWORD` | Yes (production) | Kitchen desk login — do not use the local default |
| `ADMIN_SESSION_SECRET` | Yes (production) | Long random string for signed cookies |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | For CMS | From Sanity project settings |
| `NEXT_PUBLIC_SANITY_DATASET` | For CMS | Usually `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Optional | e.g. `2025-01-01` |
| `SANITY_API_READ_TOKEN` | If dataset is private | Viewer token |
| `SANITY_API_WRITE_TOKEN` | For kitchen desk → Sanity | Editor token with create permissions |

4. Click **Deploy**. Vercel gives you a URL like `https://greggs-recipes-….vercel.app`.

Without Sanity env vars, the site still boots using seeded local recipes. On Vercel, new recipes saved via `/admin` may not persist across serverless instances — connect Sanity for durable publishing.

## 3. Connect a custom domain

1. In Vercel: **Project → Settings → Domains → Add**.
2. Enter your domain (e.g. `greggsrecipes.com` or `www.greggsrecipes.com`).
3. Follow Vercel’s DNS instructions for your registrar, typically:
   - **Apex domain:** `A` record to `76.76.21.21` (confirm the current value in the Vercel UI)
   - **Subdomain (www):** `CNAME` to `cname.vercel-dns.com`
4. Wait for DNS propagation (often minutes, sometimes up to 48 hours). Vercel issues HTTPS automatically via Let’s Encrypt.

## 4. Content after go-live

**Recommended production path**

1. Create a Sanity project and deploy the `recipe` schema from `sanity/schemaTypes/recipe.ts`.
2. Set the Sanity env vars on Vercel and redeploy.
3. Add recipes either:
   - In Sanity Studio (browser CMS), or
   - Via the site’s `/admin` kitchen desk when `SANITY_API_WRITE_TOKEN` is set

Publishing through Sanity or the kitchen desk (with Sanity write token) does **not** require a code redeploy.

## 5. Git workflow (Gage’s rule)

- All changes go through pull requests.
- Never push commits directly to `main`.
- Work on a feature branch → push to GitHub → open a draft PR into `main` → merge only when asked.

## 6. Local check before deploy

```bash
npm install
npm run build
npm run start
```

App listens on port **43127** in this project’s npm scripts.
