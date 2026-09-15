import {
  deleteUploadedImage,
  saveUploadedImage,
} from "@/lib/uploads/image-store";

/**
 * Saves a review image and returns a public URL.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set; otherwise local
 * public/uploads/reviews/ (dev only — ephemeral on Vercel without Blob).
 */
export async function saveReviewImageFile(file: File): Promise<string> {
  return saveUploadedImage(file, "reviews");
}

export async function deleteReviewImageFile(publicUrl: string) {
  await deleteUploadedImage(publicUrl);
}

/** @deprecated Prefer saveReviewImageFile; kept for callers that mkdir'd first. */
export async function ensureReviewUploadDir() {
  // no-op — saveUploadedImage creates the local dir when needed
}
