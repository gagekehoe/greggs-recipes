import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { createRecipe, listRecipes, removeRecipe } from "@/lib/recipes";

const recipeSchema = z.object({
  title: z.string().min(2).max(120),
  summary: z.string().min(10).max(500),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string()).default([]),
  prepMinutes: z.number().int().min(0).max(600),
  cookMinutes: z.number().int().min(0).max(600),
  servings: z.number().int().min(1).max(50),
  imageUrl: z.string().url().optional().or(z.literal("")),
  imageAlt: z.string().max(200).optional(),
});

export async function GET() {
  const { recipes, mode, error } = await listRecipes();
  return NextResponse.json({ recipes, mode, error });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = recipeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recipe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { recipe, mode } = await createRecipe({
      ...data,
      imageUrl: data.imageUrl || undefined,
      tags: data.tags,
    });

    return NextResponse.json({ recipe, mode }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const ok = await removeRecipe(id);
    if (!ok) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not delete recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
