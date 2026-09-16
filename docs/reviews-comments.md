# Reviews & comments

Signed-in members (viewer, cook, admin, owner) can leave **one star review per recipe** (optional text + up to 4 photos) and post **comments**. Guests can read everything and see a clear sign-in CTA — **no anonymous posting**.

## Account / display name

- Magic-link sign-in **creates an account** on first use.
- After first sign-in, `/welcome` asks for a **display name** (stored on Auth.js `user.name` in SQLite).
- `/profile` lets signed-in users edit it later (header shows the name).
- Reviews and comments **prefer display name**; posting is blocked until a name is set (API `403` + UI prompt).
- Public labels never fall back to email. Site **owner** role posts as **Gregg**.
- Recipe cards and detail show the same privilege chips next to **By {name}** (from `user.role` via `authorId`), because display names are not unique.

## Privilege badges (role-based)

| Badge | Role | How |
|-------|------|-----|
| **Owner** | `owner` | Bootstrap via `ADMIN_EMAIL` on sign-in; only an existing owner can assign Owner on `/people`. Public name forced to Gregg. |
| **Admin** | `admin` | Grant on `/people` (owner or admin). Same kitchen powers as owner except assigning Owner. |
| **Authorized cook** | `cook` | Grant/revoke on `/people`. |

Viewers have no privilege badge. Badges appear on reviews, comments, and recipe author credits. Email is never shown in the badge.

## Auth rules

| Action | Who |
|--------|-----|
| View reviews / comments | Anyone |
| Create / edit own review (+ upload photos) | Signed-in only |
| Delete own review | Owner (or admin) |
| Post comment | Signed-in only |
| Delete comment | Author, or **admin** (any) |

APIs return **401** when create/edit/upload is attempted without a session. Guests never write.

## Storage

- Tables live in the same database as Auth.js:
  - **Local:** SQLite `data/auth.sqlite` when `DATABASE_URL` is unset
  - **Production:** Neon/Postgres when `DATABASE_URL` is set (see [hosting.md](./hosting.md))
  - `recipe_review` (unique `recipeId` + `userId`)
  - `recipe_review_image`
  - `recipe_comment`
- Review photos:
  - **Local/dev** (no `BLOB_READ_WRITE_TOKEN`): `public/uploads/reviews/` (gitignored contents)
  - **Production**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) when `BLOB_READ_WRITE_TOKEN` is set (same store as recipe hero photos)

### Production note

Set `BLOB_READ_WRITE_TOKEN` on Vercel so recipe and review uploads survive serverless deploys. Without it, local disk writes under `public/uploads/` are **ephemeral** on Vercel.

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

See [hosting.md](./hosting.md) for the full env table.

## How to try it

1. `npm run dev` → open a recipe
2. As a guest: confirm reviews/comments are visible and CTAs link to `/signin`
3. Sign in with email + password (create an account on `/signin` if needed)
4. Leave 1–5 stars, optional text, optional photos; edit/replace your one review
5. Post a comment; delete your own
6. As admin: delete someone else’s comment/review
7. As admin on `/people`: promote a cook and confirm the Authorized cook badge on their posts

```bash
npm test
npm run test:coverage
```

Coverage focuses on `src/lib`, API routes (authz + validation), and the review/comment/profile/sign-in client components. shadcn primitives and Auth.js wiring are excluded from the gate.
