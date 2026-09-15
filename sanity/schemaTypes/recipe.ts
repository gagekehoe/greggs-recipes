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
  ],
});
