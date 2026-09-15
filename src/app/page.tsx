import Image from "next/image";
import Link from "next/link";
import { RecipeGrid } from "@/components/recipes/recipe-card";
import { listRecipes } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { recipes, mode, error } = await listRecipes();
  const featured = recipes[0];

  return (
    <>
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={
              featured?.imageUrl ||
              "https://images.unsplash.com/photo-1495521821757-a1efb672935e?auto=format&fit=crop&w=2000&q=80"
            }
            alt={featured?.imageAlt || "Fresh ingredients on a kitchen counter"}
            fill
            priority
            className="hero-image-motion object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(28,46,36,0.82)_0%,rgba(28,46,36,0.55)_42%,rgba(28,46,36,0.22)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(184,137,45,0.18),transparent_45%)]" />
        </div>

        <div className="relative z-10 flex min-h-[100svh] items-end px-5 pb-16 pt-28 md:items-center md:px-8 md:pb-24">
          <div className="hero-copy mx-auto w-full max-w-6xl">
            <p className="font-display text-4xl text-[#f3f0e8] drop-shadow-sm sm:text-5xl md:text-7xl lg:text-8xl">
              Gregg&apos;s Recipes
            </p>
            <h1 className="mt-5 max-w-xl text-xl font-medium leading-snug text-[#e8ebe3] md:text-2xl">
              Cook what&apos;s written down — weeknight plates and Sunday roasts
              from one kitchen.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#c5d0c2] md:text-base">
              Browse the collection anytime. Cooks and admins can sign in to add
              dishes — no redeploy required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/#recipes"
                className="inline-flex h-9 items-center rounded-lg bg-[#f3f0e8] px-4 text-sm font-medium text-[var(--ink)] transition-colors hover:bg-white"
              >
                Browse recipes
              </Link>
              <Link
                href="/signin"
                className="inline-flex h-9 items-center rounded-lg border border-[#f3f0e8]/40 px-4 text-sm font-medium text-[#f3f0e8] transition-colors hover:bg-[#f3f0e8]/10 hover:text-white"
              >
                Sign in
              </Link>
            </div>
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
              A handful of dishes worth repeating — ingredients, steps, and
              timing included.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              Content source: {mode}
              {error ? " · using local fallback" : ""}
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-8 border border-amber-700/30 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              Couldn&apos;t reach the CMS ({error}). Showing local recipes
              instead.
            </div>
          ) : null}

          <RecipeGrid recipes={recipes} />
        </div>
      </section>
    </>
  );
}
