import { z } from "zod";

/** Soft caps for cook-written recipe fields (API + My recipes form). */
export const RECIPE_FIELD_LIMITS = {
  titleMax: 120,
  summaryMin: 10,
  summaryMax: 2000,
  imageUrlMax: 2000,
  imageAltMax: 200,
  inspiredByMax: 160,
  inspiredByUrlMax: 2000,
  prepMax: 600,
  cookMax: 600,
  servingsMax: 50,
} as const;

/** Absolute http(s) URL, site-relative path (/recipes/…, /uploads/…), or empty. */
export const imageUrlSchema = z
  .string()
  .max(RECIPE_FIELD_LIMITS.imageUrlMax)
  .refine(
    (v) =>
      v === "" ||
      /^https?:\/\//i.test(v) ||
      /^\/[A-Za-z0-9._~\-\/]+$/.test(v),
    {
      message:
        "Photo URL must be an https link, a site path like /uploads/…, or blank",
    }
  )
  .optional();

/** Absolute http(s) attribution link, or empty. */
export const inspiredByUrlSchema = z
  .string()
  .max(RECIPE_FIELD_LIMITS.inspiredByUrlMax)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), {
    message: "Inspired by link must be an http(s) URL or blank",
  })
  .optional();

export const recipeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "needs at least 2 characters")
    .max(
      RECIPE_FIELD_LIMITS.titleMax,
      `must be ${RECIPE_FIELD_LIMITS.titleMax} characters or fewer`
    ),
  summary: z
    .string()
    .trim()
    .min(
      RECIPE_FIELD_LIMITS.summaryMin,
      `needs at least ${RECIPE_FIELD_LIMITS.summaryMin} characters`
    )
    .max(
      RECIPE_FIELD_LIMITS.summaryMax,
      `must be ${RECIPE_FIELD_LIMITS.summaryMax} characters or fewer`
    ),
  ingredients: z
    .array(z.string().min(1))
    .min(1, "add at least one ingredient (one per line)"),
  steps: z
    .array(z.string().min(1))
    .min(1, "add at least one step (one per line)"),
  tags: z.array(z.string()).default([]),
  prepMinutes: z
    .number()
    .int("must be a whole number")
    .min(0, "cannot be negative")
    .max(
      RECIPE_FIELD_LIMITS.prepMax,
      `must be ${RECIPE_FIELD_LIMITS.prepMax} or fewer`
    ),
  cookMinutes: z
    .number()
    .int("must be a whole number")
    .min(0, "cannot be negative")
    .max(
      RECIPE_FIELD_LIMITS.cookMax,
      `must be ${RECIPE_FIELD_LIMITS.cookMax} or fewer`
    ),
  servings: z
    .number()
    .int("must be a whole number")
    .min(1, "must be at least 1")
    .max(
      RECIPE_FIELD_LIMITS.servingsMax,
      `must be ${RECIPE_FIELD_LIMITS.servingsMax} or fewer`
    ),
  imageUrl: imageUrlSchema,
  imageAlt: z
    .string()
    .max(
      RECIPE_FIELD_LIMITS.imageAltMax,
      `must be ${RECIPE_FIELD_LIMITS.imageAltMax} characters or fewer`
    )
    .optional(),
  isPrivate: z.boolean().optional().default(false),
  inspiredBy: z
    .string()
    .trim()
    .max(
      RECIPE_FIELD_LIMITS.inspiredByMax,
      `must be ${RECIPE_FIELD_LIMITS.inspiredByMax} characters or fewer`
    )
    .optional()
    .default(""),
  inspiredByUrl: inspiredByUrlSchema,
  /** Ephemeral attestation — required to publish/save; never stored on the recipe. */
  rightsAttested: z.literal(true, {
    errorMap: () => ({
      message:
        "Confirm you wrote this recipe or have the right to share it",
    }),
  }),
});

export type RecipeInputPayload = z.infer<typeof recipeInputSchema>;

const FIELD_LABELS: Record<string, string> = {
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
  isPrivate: "Visibility",
  inspiredBy: "Inspired by",
  inspiredByUrl: "Inspired by link",
  rightsAttested: "Rights confirmation",
};

type FlattenedRecipeErrors = {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
};

/** Turn Zod flatten() into a single cook-facing error line. */
export function formatRecipeValidationError(
  flattened: FlattenedRecipeErrors
): string {
  const parts: string[] = [];

  for (const message of flattened.formErrors) {
    if (message) parts.push(message);
  }

  for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
    if (!messages?.length) continue;
    const label = FIELD_LABELS[key] ?? key;
    parts.push(`${label}: ${messages[0]}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Invalid recipe";
}
