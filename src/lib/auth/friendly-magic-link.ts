import { sanitizeAuthCallbackUrl } from "@/lib/auth/safe-auth-redirect";

/** Auth.js email provider id used in callback paths. */
export const EMAIL_PROVIDER_ID = "nodemailer";

/**
 * Rewrite an Auth.js email callback URL into a friendlier app page URL
 * so emails don't expose `/api/auth/callback/...` (Chrome Safe Browsing).
 *
 * Keeps token, email, and same-origin callbackUrl for the verify page.
 */
export function toFriendlyMagicLinkUrl(authCallbackUrl: string): string {
  let url: URL;
  try {
    url = new URL(authCallbackUrl);
  } catch {
    return authCallbackUrl;
  }

  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
  const callbackUrl = sanitizeAuthCallbackUrl(
    url.searchParams.get("callbackUrl"),
    url.origin
  );

  if (!token || !email) {
    return authCallbackUrl;
  }

  const friendly = new URL("/signin/verify", url.origin);
  friendly.searchParams.set("token", token);
  friendly.searchParams.set("email", email);
  if (callbackUrl) {
    friendly.searchParams.set("callbackUrl", callbackUrl);
  }
  return friendly.toString();
}

/**
 * Rebuild the Auth.js email callback path from `/signin/verify` query params.
 * External callbackUrl values are dropped (open-redirect / phishing signal).
 */
export function authCallbackFromVerifyParams(params: {
  token: string;
  email: string;
  callbackUrl?: string | null;
  allowedOrigin?: string;
}): string {
  const origin = params.allowedOrigin || "https://greggsrecipes.com";
  const callbackUrl = sanitizeAuthCallbackUrl(params.callbackUrl, origin);
  const search = new URLSearchParams({
    token: params.token,
    email: params.email,
  });
  if (callbackUrl) {
    search.set("callbackUrl", callbackUrl);
  }
  return `/api/auth/callback/${EMAIL_PROVIDER_ID}?${search.toString()}`;
}
