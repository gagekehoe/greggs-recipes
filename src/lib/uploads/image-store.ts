import { del, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";
import { IMAGE_UPLOAD_LIMITS } from "@/lib/uploads/limits";

export type UploadKind = "recipes" | "reviews";

export { IMAGE_UPLOAD_LIMITS } from "@/lib/uploads/limits";

export function isAllowedImageMime(mime: string): boolean {
  return (IMAGE_UPLOAD_LIMITS.allowedMimeTypes as readonly string[]).includes(
    mime
  );
}

export function extensionForMime(mime: string): string | null {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}

export function usesVercelBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function localUploadDir(kind: UploadKind) {
  return path.join(process.cwd(), "public", "uploads", kind);
}

function assertValidImageFile(file: File) {
  if (!isAllowedImageMime(file.type)) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }
  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytesPerFile) {
    throw new Error(
      `Image too large (max ${IMAGE_UPLOAD_LIMITS.maxBytesPerFile / (1024 * 1024)}MB).`
    );
  }
  const ext = extensionForMime(file.type);
  if (!ext) {
    throw new Error("Unsupported image type.");
  }
  return ext;
}

/**
 * Persist an image:
 * - Production (BLOB_READ_WRITE_TOKEN set): Vercel Blob (durable on Vercel)
 * - Local/dev: public/uploads/{kind}/
 */
export async function saveUploadedImage(
  file: File,
  kind: UploadKind
): Promise<string> {
  const ext = assertValidImageFile(file);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const pathname = `${kind}/${filename}`;

  if (usesVercelBlob()) {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  const dir = localUploadDir(kind);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);
  return `/uploads/${kind}/${filename}`;
}

/** Best-effort delete for local paths or Vercel Blob URLs we own. */
export async function deleteUploadedImage(publicUrl: string) {
  const url = publicUrl.trim();
  if (!url) return;

  if (url.startsWith("/uploads/")) {
    const parts = url.split("/").filter(Boolean);
    // uploads / {kind} / {filename}
    if (parts.length !== 3 || parts[0] !== "uploads") return;
    const kind = parts[1];
    const name = parts[2];
    if (!kind || !name || name.includes("..")) return;
    if (kind !== "recipes" && kind !== "reviews") return;
    try {
      await fs.unlink(path.join(localUploadDir(kind), name));
    } catch {
      // already gone
    }
    return;
  }

  if (
    usesVercelBlob() &&
    (url.includes("blob.vercel-storage.com") ||
      url.includes("vercel-storage.com"))
  ) {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch {
      // ignore missing / unauthorized blobs
    }
  }
}
