/**
 * Canonical public site identity for metadata, sitemap, and robots.
 * Production host is www (apex 308s → www on Vercel).
 */
export const SITE_URL = "https://www.greggsrecipes.com";
export const SITE_NAME = "Gregg's Recipes";
export const SITE_DESCRIPTION =
  "Gregg's Recipes is a shared place to cook from — realistic dishes you can make tonight. Browse the collection anytime; sign in to join and publish when you're a cook or admin.";

/** Default social preview under public/ (absolute via metadataBase). */
export const DEFAULT_OG_IMAGE_PATH = "/og-default.png";

export function absoluteUrl(path = "/"): string {
  const base = SITE_URL.replace(/\/$/, "");
  if (!path || path === "/") return `${base}/`;
  return path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Resolve a recipe image for OG — absolute http(s) or site-relative. */
export function absoluteImageUrl(imageUrl?: string | null): string {
  if (typeof imageUrl === "string" && imageUrl.trim()) {
    const trimmed = imageUrl.trim();
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      return absoluteUrl(trimmed);
    }
  }
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
}
