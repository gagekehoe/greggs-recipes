/** Soft caps for recipe / review photo uploads (shared by API + browser). */
export const IMAGE_UPLOAD_LIMITS = {
  maxBytesPerFile: 8 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ] as const,
} as const;
