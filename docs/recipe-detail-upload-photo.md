# Recipe detail Upload Photo

Branch: `cursor/recipe-upload-photo-805ed1`

## Behavior
- On recipe detail (`/recipes/[slug]`), **Upload Photo** sits beside **Edit recipe**.
- Visibility matches Edit: `canManageRecipe` only (recipe author/owner, or admin/owner staff). Other cooks do not see either control.
- Clicking **Upload Photo** opens a dialog that reuses the My recipes upload path:
  1. `POST /api/recipes/images` (Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set)
  2. Photo-only `PATCH /api/recipes` (same payload as list-row upload)
- Empty state: “No file selected yet.” Upload stays disabled until a file is chosen.
- Error state: API / validation / network failures show an alert in the dialog.
- Success refreshes the detail page so the hero photo updates.
- Public identity remains **Gregg**.

## Code
- Shared client helpers: `src/lib/uploads/recipe-photo-client.ts`
- Detail actions: `src/components/recipes/recipe-owner-actions.tsx`
- Detail page wires actions behind existing `canEdit`
- My recipes editor imports the shared upload helpers (no second backend)
- Tests: `test/components/recipe-owner-actions.test.tsx`, `test/lib/uploads/recipe-photo-client.test.ts`
