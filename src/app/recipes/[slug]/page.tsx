import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { RecipeCommentsSection } from "@/components/recipes/recipe-comments";
import { RecipePhoto } from "@/components/recipes/recipe-photo";
import { RecipeReviewsSection } from "@/components/recipes/recipe-reviews";
import { isDisplayNameSet } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";
import { getRecipe, totalMinutes } from "@/lib/recipes";
import {
  getRatingSummary,
  listCommentsForRecipe,
  listReviewsForRecipe,
} from "@/lib/reviews/store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { recipe } = await getRecipe(slug);
  if (!recipe) return { title: "Recipe not found" };
  return {
    title: recipe.title,
    description: recipe.summary,
  };
}

export default async function RecipePage({ params }: Props) {
  const { slug } = await params;
  const { recipe, error } = await getRecipe(slug);

  if (!recipe) {
    if (error) {
      return (
        <div className="mx-auto max-w-2xl px-5 py-32 text-center md:px-8">
          <h1 className="font-display text-4xl text-[var(--ink)]">
            Couldn&apos;t load this recipe
          </h1>
          <p className="mt-3 text-[var(--ink-muted)]">{error}</p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
          >
            Back to recipes
          </Link>
        </div>
      );
    }
    notFound();
  }

  const minutes = totalMinutes(recipe);
  const user = await getSessionUser();
  const [reviews, summary, comments] = await Promise.all([
    listReviewsForRecipe(recipe.id),
    getRatingSummary(recipe.id),
    listCommentsForRecipe(recipe.id),
  ]);
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(`/recipes/${recipe.slug}`)}`;
  const profileHref = `/welcome?next=${encodeURIComponent(`/recipes/${recipe.slug}`)}`;
  const hasDisplayName = isDisplayNameSet(user?.name);

  return (
    <article>
      <div className="relative h-[48vh] min-h-[320px] w-full overflow-hidden md:h-[58vh]">
        <RecipePhoto
          title={recipe.title}
          imageUrl={recipe.imageUrl}
          imageAlt={recipe.imageAlt}
          variant="detail"
          priority
          sizes="100vw"
          className="absolute inset-0"
        />
      </div>

      <div className="mx-auto max-w-4xl px-5 pt-10 md:px-8 md:pt-14">
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="border-0 bg-[var(--mist)] text-[var(--ink)]"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="mt-4 font-display text-4xl text-[var(--ink)] md:text-6xl">
          {recipe.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--ink-muted)] md:text-lg">
          {recipe.summary}
        </p>
        <p className="mt-5 flex flex-wrap gap-x-3 gap-y-2 text-sm leading-relaxed text-[var(--ink-soft)] md:mt-4 md:gap-x-4 md:text-xs md:uppercase md:tracking-[0.14em]">
          <span>{recipe.prepMinutes} prep</span>
          <span aria-hidden className="text-[var(--line)]">
            ·
          </span>
          <span>{recipe.cookMinutes} cook</span>
          <span aria-hidden className="text-[var(--line)]">
            ·
          </span>
          <span>{minutes} total</span>
          <span aria-hidden className="text-[var(--line)]">
            ·
          </span>
          <span>serves {recipe.servings}</span>
          {summary.count > 0 ? (
            <>
              <span aria-hidden className="text-[var(--line)]">
                ·
              </span>
              <span>
                {summary.average}★ ({summary.count})
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-12 px-5 py-12 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-16">
        <section>
          <h2 className="font-display text-3xl text-[var(--ink)]">Ingredients</h2>
          <ul className="mt-6 space-y-3 text-[var(--ink-muted)]">
            {recipe.ingredients.map((item) => (
              <li
                key={item}
                className="border-b border-[var(--line)]/70 pb-3 leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-display text-3xl text-[var(--ink)]">Method</h2>
          <ol className="mt-6 space-y-6">
            {recipe.steps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="font-display text-2xl text-[var(--accent-deep)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="pt-1 leading-relaxed text-[var(--ink-muted)]">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="mx-auto max-w-4xl space-y-4 px-5 pb-20 md:px-8">
        <RecipeReviewsSection
          recipeId={recipe.id}
          initialReviews={reviews}
          initialSummary={summary}
          signedIn={Boolean(user)}
          hasDisplayName={hasDisplayName}
          currentUserId={user?.id ?? null}
          isAdmin={user?.role === "admin"}
          signInHref={signInHref}
          profileHref={profileHref}
        />
        <RecipeCommentsSection
          recipeId={recipe.id}
          initialComments={comments}
          signedIn={Boolean(user)}
          hasDisplayName={hasDisplayName}
          currentUserId={user?.id ?? null}
          isAdmin={user?.role === "admin"}
          signInHref={signInHref}
          profileHref={profileHref}
        />
        <Link
          href="/#recipes"
          className="mt-10 inline-block text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
        >
          ← All recipes
        </Link>
      </div>
    </article>
  );
}
