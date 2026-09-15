/** Prefer a specific validation message from a failed /api/recipes response. */
export function recipeApiErrorMessage(
  data: unknown,
  fallback = "Could not save recipe"
): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as {
    error?: unknown;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    };
  };

  const details = record.details;
  if (details && typeof details === "object") {
    const parts: string[] = [];
    for (const message of details.formErrors ?? []) {
      if (typeof message === "string" && message) parts.push(message);
    }
    const labels: Record<string, string> = {
      title: "Title",
      summary: "Summary",
      ingredients: "Ingredients",
      steps: "Steps",
      tags: "Tags",
      prepMinutes: "Prep minutes",
      cookMinutes: "Cook minutes",
      servings: "Servings",
      imageUrl: "Recipe photo",
      imageAlt: "Photo description",
    };
    for (const [key, messages] of Object.entries(details.fieldErrors ?? {})) {
      const first = messages?.[0];
      if (!first) continue;
      parts.push(`${labels[key] ?? key}: ${first}`);
    }
    if (parts.length > 0) return parts.join(" · ");
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error;
  }
  return fallback;
}
