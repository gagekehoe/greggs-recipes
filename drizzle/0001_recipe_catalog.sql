-- Add durable recipe catalog + seed Cajun tuna bowl.
-- Safe to run on an existing Neon database that already applied 0000_neon_init.sql.

CREATE TABLE IF NOT EXISTS "recipe" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "ingredients" text DEFAULT '[]' NOT NULL,
  "steps" text DEFAULT '[]' NOT NULL,
  "tags" text DEFAULT '[]' NOT NULL,
  "prepMinutes" integer DEFAULT 0 NOT NULL,
  "cookMinutes" integer DEFAULT 0 NOT NULL,
  "servings" integer DEFAULT 1 NOT NULL,
  "imageUrl" text DEFAULT '' NOT NULL,
  "imageAlt" text DEFAULT '' NOT NULL,
  "authorId" text NOT NULL,
  "authorName" text NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

INSERT INTO "recipe" (
  "id", "slug", "title", "summary", "ingredients", "steps", "tags",
  "prepMinutes", "cookMinutes", "servings", "imageUrl", "imageAlt",
  "authorId", "authorName", "updatedAt"
) VALUES (
  'seed-extra-saucy-late-night-cajun-tuna-bowl',
  'extra-saucy-late-night-cajun-tuna-bowl',
  'Extra-Saucy Late-Night Cajun Tuna Bowl',
  'Cajun mayo tuna piled on Italian-dressed greens — jalapeño crunch, shredded cheese, and late-night bowl energy with no stove required.',
  '["1 can tuna (drained)","2 tbsp mayonnaise","2 tsp apple cider vinegar","1 1/2 tsp Cajun seasoning","1/4 tsp (plus a tiny pinch) garlic powder","2 tbsp Italian dressing (for the greens)","2 cups garden salad greens","2 tbsp shredded cheese","1 tbsp chopped jalapeños or pickles","Salt and black pepper (to taste)"]',
  '["Build the sauce: in a small bowl, vigorously mix the mayonnaise, apple cider vinegar, Cajun seasoning, and garlic powder until completely smooth.","Prep the tuna: flake the drained tuna directly into the sauce. Toss well until the fish is entirely coated.","Fold in crunch: stir the chopped jalapeños or diced pickles into the tuna mixture.","Dress the greens: in a separate large serving bowl, toss the garden salad greens with the Italian dressing so every leaf is thoroughly coated.","Assemble and garnish: scoop the extra-saucy Cajun tuna mixture on top of the dressed greens. Sprinkle shredded cheese over the bowl.","Season to taste: finish with a final pinch of salt and cracked black pepper. Toss gently and eat."]',
  '["bowl","quick","seafood","cajun","late-night"]',
  10, 0, 1,
  '/recipes/cajun-tuna-bowl.jpg',
  'Extra-saucy Cajun tuna bowl over dressed greens with cheese',
  'admin',
  'Gregg',
  '2026-09-14T20:00:00.000Z'
)
ON CONFLICT ("slug") DO NOTHING;
