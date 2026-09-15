/**
 * Auth.js / magic-link redirect allowlist.
 * Blocks open redirects that Safe Browsing treats as deceptive pages.
 */

/** Same-origin absolute URL, or same-site relative path. Else undefined. */
export function sanitizeAuthCallbackUrl(
  raw: string | null | undefined,
  allowedOrigin: string
): string | undefined {
  if (!raw) return undefined;

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }

  let allowed: URL;
  try {
    allowed = new URL(allowedOrigin);
  } catch {
    return undefined;
  }

  try {
    const url = new URL(raw);
    if (url.origin !== allowed.origin) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Auth.js `callbacks.redirect` — relative or same-origin only. */
export function safeAuthRedirect(url: string, baseUrl: string): string {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return `${baseUrl}${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.origin === new URL(baseUrl).origin) return url;
  } catch {
    // fall through
  }
  return baseUrl;
}

/** Canonical public origin for sanitizing callback URLs in emails / verify. */
export function authPublicOrigin(): string {
  // Production canonical host is www (apex redirects → www on Vercel).
  return process.env.AUTH_URL || "https://www.greggsrecipes.com";
}
