import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyRecipes } from "@/components/recipes/empty-recipes";
import { RecipePhoto } from "@/components/recipes/recipe-photo";
import { getSessionUser } from "@/lib/auth/session";
import { totalMinutes, type Recipe } from "@/lib/recipes";
import type { RatingSummary } from "@/lib/reviews/rating";
import { getRatingSummaries } from "@/lib/reviews/store";

export function RecipeCard({
  recipe,
  index = 0,
  rating,
}: {
  recipe: Recipe;
  index?: number;
  rating?: RatingSummary;
}) {
  const minutes = totalMinutes(recipe);
  return (
    <article
      className="group recipe-reveal"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <Link href={`/recipes/${recipe.slug}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sage-deep)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--sage-deep)]">
          <RecipePhoto
            title={recipe.title}
            imageUrl={recipe.imageUrl}
            imageAlt={recipe.imageAlt}
            variant="card"
            sizes="(max-width: 768px) 100vw, 33vw"
            imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--ink)]/55 via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
            {recipe.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="border-0 bg-[var(--paper)]/90 text-[var(--ink)] backdrop-blur-sm"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="pt-4">
          <h3 className="font-display text-2xl leading-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent-deep)]">
            {recipe.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--ink-muted)]">
            {recipe.summary}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            {minutes} min · serves {recipe.servings}
            {rating && rating.count > 0
              ? ` · ${rating.average}★ (${rating.count})`
              : ""}
          </p>
        </div>
      </Link>
    </article>
  );
}

export async function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  if (recipes.length === 0) {
    const user = await getSessionUser();
    return <EmptyRecipes user={user} />;
  }

  const ratings = await getRatingSummaries(recipes.map((r) => r.id));

  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe, index) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          index={index}
          rating={ratings[recipe.id]}
        />
      ))}
    </div>
  );
}

export function RecipeSkeletonGrid() {
  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/3] bg-[var(--sage)]/40" />
          <div className="mt-4 h-7 w-3/4 bg-[var(--sage)]/35" />
          <div className="mt-3 h-4 w-full bg-[var(--sage)]/25" />
          <div className="mt-2 h-4 w-2/3 bg-[var(--sage)]/25" />
        </div>
      ))}
    </div>
  );
}
