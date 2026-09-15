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
  source: "local" | "sanity";
  updatedAt: string;
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
};
