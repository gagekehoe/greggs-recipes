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
};
