# Recipe photo uploads

See the project Agent Store doc for Gage’s Vercel Blob steps:

`docs/recipe-photo-upload.md` in the Gregg's Recipes project store.

In-repo: set `BLOB_READ_WRITE_TOKEN` (see `.env.example` and [hosting.md](./hosting.md)). Local/dev writes to `public/uploads/recipes/`. Recipe photos accept JPEG/PNG/WebP/GIF up to **8MB**.

Owners can upload from **My recipes** (list-row or edit form) or from recipe detail via **Upload Photo** beside **Edit recipe** — both use `POST /api/recipes/images` then a photo-only `PATCH /api/recipes`. See [recipe-detail-upload-photo.md](./recipe-detail-upload-photo.md).
