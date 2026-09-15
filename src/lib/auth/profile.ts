/**
 * Display names live on Auth.js `user.name` in SQLite.
 * Required (strongly) so reviews/comments show a chosen name, not an email.
 */

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 60;

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < DISPLAY_NAME_MIN) return null;
  if (trimmed.length > DISPLAY_NAME_MAX) return null;
  return trimmed;
}

export function isDisplayNameSet(name: string | null | undefined): boolean {
  return normalizeDisplayName(name) !== null;
}

/** True when a signed-in user still needs first-time profile setup. */
export function needsProfileSetup(name: string | null | undefined): boolean {
  return !isDisplayNameSet(name);
}

/**
 * Safe public label for reviews/comments.
 * Prefers display name; never invents a fake name from thin air when unset.
 */
export function publicAuthorLabel(
  name: string | null | undefined,
  email?: string | null | undefined
): string {
  const display = normalizeDisplayName(name);
  if (display) return display;
  if (email?.trim()) {
    const local = email.trim().split("@")[0];
    if (local) return local;
  }
  return "Cook";
}

export function validateDisplayNameInput(value: unknown): {
  ok: true;
  name: string;
} | {
  ok: false;
  error: string;
} {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Display name is required." };
  }
  const name = normalizeDisplayName(value);
  if (!name) {
    return {
      ok: false,
      error: `Use ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters.`,
    };
  }
  return { ok: true, name };
}
