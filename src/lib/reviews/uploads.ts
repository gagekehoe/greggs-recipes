import fs from "fs/promises";
import path from "path";
import {
  extensionForMime,
  isAllowedReviewImageMime,
  REVIEW_IMAGE_LIMITS,
} from "@/lib/reviews/rating";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reviews");

export async function ensureReviewUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Saves a review image under public/uploads/reviews/ and returns the public URL path.
 * Local/dev storage only — production should use object storage (see docs/reviews-comments.md).
 */
export async function saveReviewImageFile(file: File): Promise<string> {
  if (!isAllowedReviewImageMime(file.type)) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }
  if (file.size > REVIEW_IMAGE_LIMITS.maxBytesPerFile) {
    throw new Error(
      `Image too large (max ${REVIEW_IMAGE_LIMITS.maxBytesPerFile / (1024 * 1024)}MB).`
    );
  }

  const ext = extensionForMime(file.type);
  if (!ext) {
    throw new Error("Unsupported image type.");
  }

  await ensureReviewUploadDir();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dest = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);
  return `/uploads/reviews/${filename}`;
}

export async function deleteReviewImageFile(publicUrl: string) {
  if (!publicUrl.startsWith("/uploads/reviews/")) return;
  const name = path.basename(publicUrl);
  if (!name || name.includes("..")) return;
  const dest = path.join(UPLOAD_DIR, name);
  try {
    await fs.unlink(dest);
  } catch {
    // File may already be gone
  }
}
