import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { totalMinutes, type Recipe } from "@/lib/recipes";

export function RecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const minutes = totalMinutes(recipe);
  return (
    <article
      className="group recipe-reveal"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <Link href={`/recipes/${recipe.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--sage-deep)]">
          <Image
            src={recipe.imageUrl}
            alt={recipe.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/55 via-transparent to-transparent opacity-80" />
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
          </p>
        </div>
      </Link>
    </article>
  );
}

export function RecipeGrid({ recipes }: { recipes: Recipe[] }) {
  if (recipes.length === 0) {
    return (
      <div className="rounded-none border border-dashed border-[var(--line)] bg-[var(--paper)]/60 px-6 py-16 text-center">
        <p className="font-display text-2xl text-[var(--ink)]">No recipes yet</p>
        <p className="mx-auto mt-3 max-w-md text-[var(--ink-muted)]">
          The pantry is empty. Sign in as a cook or admin to publish the first
          dish — no redeploy needed.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe, index) => (
        <RecipeCard key={recipe.id} recipe={recipe} index={index} />
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
