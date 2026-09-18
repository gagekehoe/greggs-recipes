/**
 * Auth.js / magic-link redirect allowlist.
 * Blocks open redirects that Safe Browsing treats as deceptive pages.
 */

const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

/**
 * Resolve a candidate against `siteOrigin` and allow only same-origin results.
 * Returns `pathname + search + hash`, or undefined when unsafe / unparsable.
 *
 * Rejects backslashes (WHATWG `/\\evil.example` → off-site), control chars,
 * and any value that does not resolve to the same origin as `siteOrigin`.
 */
export function sameOriginRelativeUrl(
  raw: string | null | undefined,
  siteOrigin: string
): string | undefined {
  if (!raw) return undefined;
  if (CONTROL_OR_BACKSLASH.test(raw)) return undefined;
  // Protocol-relative and other non-path schemes fail the origin check below;
  // reject `//` early for clarity.
  if (raw.startsWith("//")) return undefined;

  let allowed: URL;
  try {
    allowed = new URL(siteOrigin);
  } catch {
    return undefined;
  }

  try {
    const resolved = new URL(raw, allowed);
    if (resolved.origin !== allowed.origin) return undefined;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return undefined;
  }
}

/** Same-origin absolute URL, or same-site relative path. Else undefined. */
export function sanitizeAuthCallbackUrl(
  raw: string | null | undefined,
  allowedOrigin: string
): string | undefined {
  return sameOriginRelativeUrl(raw, allowedOrigin);
}

/** Auth.js `callbacks.redirect` — relative or same-origin only. */
export function safeAuthRedirect(url: string, baseUrl: string): string {
  const path = sameOriginRelativeUrl(url, baseUrl);
  if (!path) return baseUrl;
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

/** Canonical public origin for sanitizing callback URLs in emails / verify. */
export function authPublicOrigin(): string {
  // Production canonical host is www (apex redirects → www on Vercel).
  return process.env.AUTH_URL || "https://www.greggsrecipes.com";
}
