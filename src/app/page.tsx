import { HeroCtas } from "@/components/layout/hero-ctas";
import { RecipeGrid } from "@/components/recipes/recipe-card";
import { RecipePhoto } from "@/components/recipes/recipe-photo";
import { getSessionUser } from "@/lib/auth/session";
import { listRecipes } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ recipes, mode, error }, user] = await Promise.all([
    listRecipes(),
    getSessionUser(),
  ]);
  const featured = recipes[0];

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          {featured ? (
            <RecipePhoto
              title={featured.title}
              imageUrl={featured.imageUrl}
              imageAlt={featured.imageAlt}
              variant="hero"
              priority
              sizes="100vw"
              className="absolute inset-0"
              imageClassName="hero-image-motion"
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
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(28,46,36,0.82)_0%,rgba(28,46,36,0.55)_42%,rgba(28,46,36,0.22)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(184,137,45,0.18),transparent_45%)]" />
          {/* Extra bottom scrim on phones — hero copy sits at the bottom over food photos */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(28,46,36,0.9)_0%,rgba(28,46,36,0.62)_38%,rgba(28,46,36,0.2)_58%,transparent_72%)] md:hidden"
          />
        </div>

        <div className="relative z-10 flex min-h-[100svh] items-end px-5 pb-16 pt-28 md:items-center md:px-8 md:pb-24">
          <div className="hero-copy mx-auto w-full max-w-6xl">
            <p className="font-display text-4xl text-[#f3f0e8] drop-shadow-sm sm:text-5xl md:text-7xl lg:text-8xl">
              Gregg&apos;s Recipes
            </p>
            <h1 className="mt-5 max-w-xl text-xl font-medium leading-snug text-[#f3f0e8] md:text-2xl">
              Cook what&apos;s written down — weeknight plates and Sunday roasts
              worth making again.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#e8ebe3] md:text-base">
              Browse anytime. Sign in to cook along, leave reviews and comments.
              Cooks add recipes to Gregg&apos;s shared collection — no redeploy
              needed.
            </p>
            <HeroCtas user={user} />
          </div>
        </div>
      </section>

      <section id="recipes" className="scroll-mt-8 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
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
