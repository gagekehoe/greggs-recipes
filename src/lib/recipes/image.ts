/**
 * Recipe photo helpers — real URL vs branded CSS fallback (no stock Unsplash default).
 */

export function hasRecipeImage(imageUrl?: string | null): boolean {
  if (typeof imageUrl !== "string") return false;
  return imageUrl.trim().length > 0;
}

/** Public URL when a real photo exists; otherwise null (UI shows placeholder). */
export function resolveRecipeImageUrl(
  imageUrl?: string | null
): string | null {
  if (!hasRecipeImage(imageUrl)) return null;
  return imageUrl!.trim();
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
