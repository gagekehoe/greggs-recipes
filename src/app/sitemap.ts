import type { MetadataRoute } from "next";
import { listRecipes } from "@/lib/recipes";
import { SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { recipes } = await listRecipes();
  const lastRecipeUpdate = recipes.reduce<Date | null>((latest, recipe) => {
    const next = new Date(recipe.updatedAt);
    if (Number.isNaN(next.getTime())) return latest;
    if (!latest || next > latest) return next;
    return latest;
  }, null);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: lastRecipeUpdate ?? new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...recipes.map((recipe) => ({
      url: `${SITE_URL}/recipes/${recipe.slug}`,
      lastModified: new Date(recipe.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  return entries;
}
