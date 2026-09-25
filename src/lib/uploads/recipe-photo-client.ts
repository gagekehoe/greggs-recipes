import { recipeApiErrorMessage } from "@/lib/recipes/api-error";
import { IMAGE_UPLOAD_LIMITS } from "@/lib/uploads/limits";

export const RECIPE_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const RECIPE_PHOTO_MAX_MB =
  IMAGE_UPLOAD_LIMITS.maxBytesPerFile / (1024 * 1024);

export const recipePhotoFileInputClassName =
  "block w-full text-sm text-[var(--ink-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mist)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--ink)]";

/** Shared outline control style used for Edit recipe / Upload Photo on detail. */
export const recipeOwnerActionClassName =
  "inline-flex min-h-11 items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[var(--mist)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)] disabled:pointer-events-none disabled:opacity-50";

export function assertRecipePhotoReady(file: File) {
  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytesPerFile) {
    throw new Error(
      `Photo is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Use a JPEG/PNG/WebP under ${RECIPE_PHOTO_MAX_MB}MB, or compress it before uploading.`
    );
  }
  if (
    file.type &&
    !(IMAGE_UPLOAD_LIMITS.allowedMimeTypes as readonly string[]).includes(
      file.type
    )
  ) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }
}

/** Upload via existing `/api/recipes/images` (Vercel Blob or local fallback). */
export async function uploadRecipePhoto(file: File): Promise<string> {
  assertRecipePhotoReady(file);
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/recipes/images", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not upload photo"
    );
  }
  if (typeof data.url !== "string" || !data.url) {
    throw new Error("Upload did not return a photo URL");
  }
  return data.url;
}

/** Photo-only PATCH — same payload as My recipes list-row upload. */
export async function saveRecipePhotoOnly(opts: {
  recipeId: string;
  title: string;
  imageUrl: string;
}): Promise<void> {
  const res = await fetch("/api/recipes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: opts.recipeId,
      imageUrl: opts.imageUrl,
      imageAlt: opts.imageUrl ? `${opts.title} plated` : "",
      rightsAttested: true as const,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(recipeApiErrorMessage(data, "Could not update photo"));
  }
}
