import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getRecipe, totalMinutes } from "@/lib/recipes";

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

  return (
    <article>
      <div className="relative h-[48vh] min-h-[320px] w-full overflow-hidden md:h-[58vh]">
        <Image
          src={recipe.imageUrl}
          alt={recipe.imageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/75 via-[var(--ink)]/25 to-[var(--ink)]/20" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-10 md:px-8 md:pb-14">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <Badge
                  key={tag}
                  className="border-0 bg-[var(--paper)]/90 text-[var(--ink)]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="mt-4 font-display text-4xl text-[#f3f0e8] md:text-6xl">
              {recipe.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[#dfe8dc] md:text-lg">
              {recipe.summary}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#c5d0c2]">
              {recipe.prepMinutes} prep · {recipe.cookMinutes} cook · {minutes}{" "}
              total · serves {recipe.servings}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl gap-12 px-5 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-20">
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

      <div className="mx-auto max-w-4xl px-5 pb-20 md:px-8">
        <Link
          href="/#recipes"
          className="text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
        >
          ← All recipes
        </Link>
      </div>
    </article>
  );
}
