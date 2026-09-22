import { NextResponse } from "next/server";
import { publicAuthorLabel } from "@/lib/auth/profile";
import {
  canChangeRecipeVisibility,
  canManageRecipe,
  canWriteRecipes,
  hasKitchenStaffPowers,
  isSiteOwner,
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
  compactDefined,
  formatRecipeValidationError,
  recipeInputSchema,
  recipePatchSchema,
} from "@/lib/recipes/recipe-input-schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";

  if (!mine) {
    const { recipes, mode, error } = await listRecipes();
    return NextResponse.json({ recipes, mode, error });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recipes, mode, error } = await listRecipes({
    includePrivateForUserId: user.id,
    viewerRole: user.role,
  });

  const filtered =
    hasKitchenStaffPowers(user.role)
      ? recipes.filter((r) => !r.isPrivate || r.authorId === user.id)
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

    const { rightsAttested: _rightsAttested, ...data } = parsed.data;
    const { recipe, mode } = await createRecipe({
      ...data,
      imageUrl:
        typeof data.imageUrl === "string" ? data.imageUrl.trim() : undefined,
      tags: data.tags,
      isPrivate: Boolean(data.isPrivate),
      inspiredBy: data.inspiredBy?.trim() || "",
      inspiredByUrl:
        typeof data.inspiredByUrl === "string"
          ? data.inspiredByUrl.trim()
          : "",
      authorId: user.id,
      authorName: publicAuthorLabel(user.name, user.email, {
        isSiteOwner: isSiteOwner(user),
      }),
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
    if (!canManageRecipe(user.role, existing, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = recipePatchSchema.safeParse(json);
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

    const { rightsAttested: _rightsAttested, ...data } = parsed.data;
    if (
      data.isPrivate !== undefined &&
      Boolean(data.isPrivate) !== Boolean(existing.isPrivate) &&
      !canChangeRecipeVisibility(user.role, existing, user.id)
    ) {
      return NextResponse.json(
        {
          error: "Only the author can change who can see this recipe.",
        },
        { status: 403 }
      );
    }

    const result = await updateRecipe(
      id,
      compactDefined({
        ...data,
        imageUrl:
          typeof data.imageUrl === "string" ? data.imageUrl.trim() : undefined,
        inspiredBy:
          typeof data.inspiredBy === "string"
            ? data.inspiredBy.trim()
            : undefined,
        inspiredByUrl:
          typeof data.inspiredByUrl === "string"
            ? data.inspiredByUrl.trim()
            : undefined,
      })
    );
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
    if (!canManageRecipe(user.role, existing, user.id)) {
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
