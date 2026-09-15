# Reviews & comments

Signed-in household members (viewer, cook, admin) can leave **one star review per recipe** (optional text + up to 4 photos) and post **comments**. Guests can read everything and see a clear sign-in CTA — **no anonymous posting**.

## Account / display name

- Magic-link sign-in **creates an account** on first use.
- After first sign-in, `/welcome` asks for a **display name** (stored on Auth.js `user.name` in SQLite).
- `/profile` lets signed-in users edit it later (header shows the name).
- Reviews and comments **prefer display name**; posting is blocked until a name is set (API `403` + UI prompt).

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

- Tables live in the same SQLite file as Auth.js: `data/auth.sqlite`
  - `recipe_review` (unique `recipeId` + `userId`)
  - `recipe_review_image`
  - `recipe_comment`
- Review photos (local/dev): `public/uploads/reviews/` (gitignored contents)

### Production note

Ephemeral serverless disks (e.g. Vercel) will not keep uploaded files. For production, point uploads at object storage (S3, R2, Vercel Blob) and set something like:

```bash
# Future — not required for local demos
# REVIEW_UPLOAD_DRIVER=local|s3
# REVIEW_UPLOAD_BUCKET=
# REVIEW_UPLOAD_PUBLIC_BASE_URL=
```

Until then, treat review images as **local/demo only**, same caveat as SQLite auth in `docs/hosting.md`.

## How to try it

1. `npm run dev` → open a recipe
2. As a guest: confirm reviews/comments are visible and CTAs link to `/signin`
3. Sign in (magic link in the terminal if email keys are unset)
4. Leave 1–5 stars, optional text, optional photos; edit/replace your one review
5. Post a comment; delete your own
6. As admin: delete someone else’s comment/review

```bash
npm test
npm run test:coverage
```

Coverage focuses on `src/lib`, API routes (authz + validation), and the review/comment/profile/sign-in client components. shadcn primitives and Auth.js wiring are excluded from the gate.

## Out of scope (next workstream)

Missing **recipe** photo fallbacks — not part of this feature.
