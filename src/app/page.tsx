import { RecipeGrid } from "@/components/recipes/recipe-card";
import { RecipePhoto } from "@/components/recipes/recipe-photo";
import { getSessionUser } from "@/lib/auth/session";
import { listRecipes } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  const { recipes, mode, error } = await listRecipes({
    includePrivateForUserId: user?.id ?? null,
    viewerRole: user?.role ?? null,
  });
  const featured = recipes.find((r) => !r.isPrivate) ?? recipes[0];

  return (
    <>
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {featured ? (
            <RecipePhoto
              title={featured.title}
              imageUrl={featured.imageUrl}
              imageAlt={featured.imageAlt}
              variant="hero"
              priority
              sizes="100vw"
              className="absolute inset-0"
              imageClassName="hero-image-motion object-[center_40%]"
            />
          ) : (
            <div
              className="recipe-photo-fallback recipe-photo-fallback--tone-a absolute inset-0"
              aria-hidden
            >
              <div className="recipe-photo-fallback__pattern" />
              <div className="recipe-photo-fallback__glow" />
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(28,46,36,0.84)_0%,rgba(28,46,36,0.62)_48%,rgba(28,46,36,0.4)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(184,137,45,0.2),transparent_48%)]" />
        </div>

        <div className="relative z-10 px-5 pb-9 pt-48 md:px-8 md:pb-10 md:pt-28">
          <div className="hero-copy mx-auto w-full max-w-6xl">
            <p className="font-display text-[2rem] leading-snug text-[#f3f0e8] drop-shadow-sm sm:text-5xl sm:leading-tight md:text-6xl">
              Gregg&apos;s Recipes
            </p>
            <h1 className="mt-3 max-w-2xl text-base font-medium leading-snug text-[#e8ebe3] md:mt-4 md:text-lg">
              Cook what&apos;s written down — weeknight plates and Sunday roasts
              worth making again.
            </h1>
          </div>
        </div>
      </section>

      <section id="recipes" className="scroll-mt-8 px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl md:mb-10">
            <h2 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
              On the table
            </h2>
            <p className="mt-3 text-[var(--ink-muted)]">
              {recipes.length === 0
                ? "Dishes will show up here as cooks publish — open to everyone who wants to cook from Gregg’s kitchen."
                : "Dishes worth repeating — ingredients, steps, and timing included."}
            </p>
            {mode !== "db" || error ? (
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                {error
                  ? "Showing kitchen fallback while the live catalog reconnects"
                  : mode === "sanity"
                    ? "Content source: Sanity"
                    : "Content source: local"}
              </p>
            ) : null}
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-8 border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              Couldn&apos;t reach the live recipe catalog ({error}). Showing
              Gregg&apos;s kitchen recipes instead.
            </div>
          ) : null}

          <RecipeGrid recipes={recipes} />
        </div>
      </section>
    </>
  );
}
