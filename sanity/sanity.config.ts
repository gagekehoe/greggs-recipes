import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { recipeType } from "./schemaTypes/recipe";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "placeholder";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export default defineConfig({
  name: "greggs-recipes",
  title: "Gregg's Recipes",
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: {
    types: [recipeType],
  },
});
