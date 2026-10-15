/**
 * Auth.js / magic-link redirect allowlist.
 * Blocks open redirects that Safe Browsing treats as deceptive pages.
 */

const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

/** Pathname is a same-origin path, not a protocol-relative `//host`. */
function isSingleSlashPathname(pathname: string): boolean {
  return pathname.startsWith("/") && !pathname.startsWith("//");
}

/**
 * Resolve a candidate against `siteOrigin` and allow only same-origin results.
 * Returns `pathname + search + hash`, or undefined when unsafe / unparsable.
 *
 * Rejects backslashes (WHATWG `/\\evil.example` → off-site), control chars,
 * protocol-relative values, and same-origin URLs whose pathname is `//host`
 * (`https://site.example//evil.example` → pathname `//evil.example`, which
 * browsers and `new URL(path, origin)` treat as `https://evil.example/`).
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
    if (!isSingleSlashPathname(resolved.pathname)) return undefined;
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
    // Rebuild from origin + path. Never `new URL(path, base)` — a `//host`
    // pathname is protocol-relative and would resolve off-site.
    const base = new URL(baseUrl);
    return `${base.origin}${path}`;
  } catch {
    return baseUrl;
  }
}

/** Canonical public origin for sanitizing callback URLs in emails / verify. */
export function authPublicOrigin(): string {
  // Production canonical host is www (apex redirects → www on Vercel).
  return process.env.AUTH_URL || "https://www.greggsrecipes.com";
}
