import { NextResponse } from "next/server";
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
import {
  formatRecipeValidationError,
  recipeInputSchema,
} from "@/lib/recipes/recipe-input-schema";

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
    const parsed = recipeInputSchema.safeParse(json);
    if (!parsed.success) {
      const details = parsed.error.flatten();
      return NextResponse.json(
        {
          error: formatRecipeValidationError(details),
          details,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { recipe, mode } = await createRecipe({
      ...data,
      imageUrl:
        typeof data.imageUrl === "string" ? data.imageUrl.trim() : undefined,
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

    const parsed = recipeInputSchema.safeParse(json);
    if (!parsed.success) {
      const details = parsed.error.flatten();
      return NextResponse.json(
        {
          error: formatRecipeValidationError(details),
          details,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const result = await updateRecipe(id, {
      ...data,
      imageUrl:
        typeof data.imageUrl === "string" ? data.imageUrl.trim() : undefined,
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
