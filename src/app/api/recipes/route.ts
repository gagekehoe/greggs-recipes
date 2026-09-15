import { NextResponse } from "next/server";
import { z } from "zod";
import {
  canEditRecipe,
  canWriteRecipes,
} from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import {
  createRecipe,
  getRecipeById,
  listRecipes,
  removeRecipe,
  updateRecipe,
} from "@/lib/recipes";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const { recipes, mode, error } = await listRecipes();

  if (!mine) {
    return NextResponse.json({ recipes, mode, error });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filtered =
    user.role === "admin"
      ? recipes
      : recipes.filter((r) => r.authorId === user.id);

  return NextResponse.json({ recipes: filtered, mode, error });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canWriteRecipes(user.role)) {
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
      authorId: user.id,
      authorName: user.name || user.email || "Cook",
    });

    return NextResponse.json({ recipe, mode }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || !canWriteRecipes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const id = typeof json.id === "string" ? json.id : null;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await getRecipeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    if (!canEditRecipe(user.role, existing.authorId, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = recipeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recipe", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const result = await updateRecipe(id, {
      ...data,
      imageUrl: data.imageUrl || undefined,
      tags: data.tags,
    });
    if (!result) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update recipe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user || !canWriteRecipes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await getRecipeById(id);
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }
    if (!canEditRecipe(user.role, existing.authorId, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
