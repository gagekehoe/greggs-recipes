/** Same-origin relative path only — blocks open redirects. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

/** Post-auth destination: welcome gate, then optional next path. */
export function welcomeCallbackUrl(rawNext: string | null | undefined): string {
  return `/welcome?next=${encodeURIComponent(safeNextPath(rawNext))}`;
}

/** Magic-link tab lands here after Auth.js verifies the email. */
export function signInDoneUrl(rawNext: string | null | undefined): string {
  return `/signin/done?next=${encodeURIComponent(safeNextPath(rawNext))}`;
}
