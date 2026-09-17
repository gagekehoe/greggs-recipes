/**
 * Recipe photo helpers — real URL vs branded CSS fallback (no stock Unsplash default).
 *
 * `next/image` throws during render when `src` is a remote URL whose host is
 * not in `images.remotePatterns` (see next.config.ts). That 500s every page
 * that shows the photo, including home. Keep this allowlist in sync with
 * that config. Site-relative paths are always safe.
 */
const ALLOWED_REMOTE_HOSTS = new Set([
  "images.unsplash.com",
  "cdn.sanity.io",
]);

function isAllowedVercelBlobHost(hostname: string): boolean {
  return /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(hostname);
}

/** True when Next/Image can render this src without throwing. */
export function isAllowedNextImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return false;
    return (
      ALLOWED_REMOTE_HOSTS.has(url.hostname) ||
      isAllowedVercelBlobHost(url.hostname)
    );
  } catch {
    return false;
  }
}

export function hasRecipeImage(imageUrl?: string | null): boolean {
  if (typeof imageUrl !== "string") return false;
  return imageUrl.trim().length > 0;
}

/** Public URL when a real, Next-safe photo exists; otherwise null (placeholder). */
export function resolveRecipeImageUrl(
  imageUrl?: string | null
): string | null {
  if (!hasRecipeImage(imageUrl)) return null;
  const trimmed = imageUrl!.trim();
  return isAllowedNextImageSrc(trimmed) ? trimmed : null;
}

/** One or two letters from the title for the placeholder monogram. */
export function recipeImageInitials(title: string): string {
  const words = title
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

  if (words.length === 0) return "G";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Stable accent shift so adjacent cards without photos don’t look identical. */
export function recipePlaceholderTone(seed: string): 0 | 1 | 2 {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 3) as 0 | 1 | 2;
}
