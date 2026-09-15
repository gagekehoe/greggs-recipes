import type { Recipe } from "./types";

/** Canonical production seed — the only dish shipped with a fresh deploy. */
export const CAJUN_TUNA_BOWL_SEED: Recipe = {
  id: "seed-extra-saucy-late-night-cajun-tuna-bowl",
  slug: "extra-saucy-late-night-cajun-tuna-bowl",
  title: "Extra-Saucy Late-Night Cajun Tuna Bowl",
  summary:
    "Cajun mayo tuna piled on Italian-dressed greens — jalapeño crunch, shredded cheese, and late-night bowl energy with no stove required.",
  ingredients: [
    "1 can tuna (drained)",
    "2 tbsp mayonnaise",
    "2 tsp apple cider vinegar",
    "1 1/2 tsp Cajun seasoning",
    "1/4 tsp (plus a tiny pinch) garlic powder",
    "2 tbsp Italian dressing (for the greens)",
    "2 cups garden salad greens",
    "2 tbsp shredded cheese",
    "1 tbsp chopped jalapeños or pickles",
    "Salt and black pepper (to taste)",
  ],
  steps: [
    "Build the sauce: in a small bowl, vigorously mix the mayonnaise, apple cider vinegar, Cajun seasoning, and garlic powder until completely smooth.",
    "Prep the tuna: flake the drained tuna directly into the sauce. Toss well until the fish is entirely coated.",
    "Fold in crunch: stir the chopped jalapeños or diced pickles into the tuna mixture.",
    "Dress the greens: in a separate large serving bowl, toss the garden salad greens with the Italian dressing so every leaf is thoroughly coated.",
    "Assemble and garnish: scoop the extra-saucy Cajun tuna mixture on top of the dressed greens. Sprinkle shredded cheese over the bowl.",
    "Season to taste: finish with a final pinch of salt and cracked black pepper. Toss gently and eat.",
  ],
  tags: ["bowl", "quick", "seafood", "cajun", "late-night"],
  prepMinutes: 10,
  cookMinutes: 0,
  servings: 1,
  imageUrl: "/recipes/cajun-tuna-bowl.jpg",
  imageAlt: "Extra-saucy Cajun tuna bowl over dressed greens with cheese",
  authorId: "admin",
  authorName: "Gregg",
  source: "local",
  updatedAt: "2026-09-14T20:00:00.000Z",
};

/** In-memory / JSON fallback catalog (no sample fillers). */
export const SEED_RECIPES: Recipe[] = [CAJUN_TUNA_BOWL_SEED];
