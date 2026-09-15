/**
 * Strip magic-link secrets from Vercel Analytics / Speed Insights payloads.
 * `/signin/verify` puts the unused Auth.js token (and email) in the query string;
 * without this, pageviews would exfiltrate a live sign-in credential.
 */

const DROP_PATHS = ["/signin/verify", "/signin/done"];
const DROP_PREFIXES = ["/api/auth/"];
const REDACT_PARAMS = ["token", "email"] as const;

function pathnameOf(url: URL): string {
  return url.pathname.replace(/\/+$/, "") || "/";
}

function shouldDropPath(pathname: string): boolean {
  if (DROP_PATHS.includes(pathname)) return true;
  return DROP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function parseEventUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(raw, "https://www.greggsrecipes.com");
    } catch {
      return null;
    }
  }
}

/** Shared `beforeSend` for Analytics and Speed Insights. */
export function sanitizeTelemetryEvent<T extends { url: string }>(
  event: T
): T | null {
  const parsed = parseEventUrl(event.url);
  if (!parsed) return null;

  if (shouldDropPath(pathnameOf(parsed))) {
    return null;
  }

  let redacted = false;
  for (const key of REDACT_PARAMS) {
    if (parsed.searchParams.has(key)) {
      parsed.searchParams.delete(key);
      redacted = true;
    }
  }

  if (!redacted) return event;
  return { ...event, url: parsed.toString() };
}
