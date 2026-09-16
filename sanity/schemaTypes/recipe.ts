import { defineType, defineField } from "sanity";

export const recipeType = defineType({
  name: "recipe",
  title: "Recipe",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "ingredients",
      title: "Ingredients",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      of: [{ type: "text" }],
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "prepMinutes",
      title: "Prep minutes",
      type: "number",
    }),
    defineField({
      name: "cookMinutes",
      title: "Cook minutes",
      type: "number",
    }),
    defineField({
      name: "servings",
      title: "Servings",
      type: "number",
    }),
    defineField({
      name: "imageUrl",
      title: "Image URL",
      type: "url",
      description: "Use a direct image URL (Unsplash, Sanity CDN, etc.)",
    }),
    defineField({
      name: "imageAlt",
      title: "Image alt text",
      type: "string",
    }),
    defineField({
      name: "authorId",
      title: "Author ID",
      type: "string",
      description: "Auth user id of the cook who published this recipe",
    }),
    defineField({
      name: "authorName",
      title: "Author name",
      type: "string",
    }),
    defineField({
      name: "isPrivate",
      title: "Private (only author)",
      type: "boolean",
      initialValue: false,
      description:
        "When true, only the author can see this recipe on Gregg's Recipes",
    }),
    defineField({
      name: "inspiredBy",
      title: "Inspired by",
      type: "string",
      description:
        "Optional credit shown on the recipe page (not on browse cards)",
    }),
    defineField({
      name: "inspiredByUrl",
      title: "Inspired by URL",
      type: "url",
      description: "Optional link for the Inspired by credit",
    }),
  ],
});
