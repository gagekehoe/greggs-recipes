export type RecipeSource = "db" | "local" | "sanity";

export type Recipe = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  imageUrl: string;
  imageAlt: string;
  source: RecipeSource;
  updatedAt: string;
  authorId: string;
  authorName: string;
  /** Author-only when true; defaults false (public). */
  isPrivate: boolean;
  /** Optional credit for a source that inspired the dish (detail page only). */
  inspiredBy: string;
  /** Optional link for the Inspired by credit. */
  inspiredByUrl: string;
};

export type RecipeInput = {
  title: string;
  summary: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  imageUrl?: string;
  imageAlt?: string;
  authorId: string;
  authorName: string;
  /** Author-only when true; omit or false = public. */
  isPrivate?: boolean;
  inspiredBy?: string;
  inspiredByUrl?: string;
};

/** PATCH body: omitted keys keep the stored value (list-row shortcuts must not clobber). */
export type RecipePatchInput = Partial<
  Omit<RecipeInput, "authorId" | "authorName">
>;
