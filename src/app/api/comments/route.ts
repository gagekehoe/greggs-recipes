import { NextResponse } from "next/server";
import { z } from "zod";
import { canViewRecipe } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { getRecipeById } from "@/lib/recipes";
import { getRecipeShareAccess } from "@/lib/recipes/shares";
import {
  canDeleteComment,
  canPostComment,
} from "@/lib/reviews/permissions";
import {
  createComment,
  deleteComment,
  getCommentById,
  listCommentsForRecipe,
} from "@/lib/reviews/store";

const createSchema = z.object({
  recipeId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

async function assertCanViewRecipeId(recipeId: string) {
  const recipe = await getRecipeById(recipeId);
  if (!recipe) {
    return {
      error: NextResponse.json({ error: "Recipe not found" }, { status: 404 }),
    } as const;
  }
  const user = await getSessionUser();
  const access =
    recipe.isPrivate && user
      ? await getRecipeShareAccess(recipe.id, user.id, user.role)
      : undefined;
  if (!canViewRecipe(recipe, user?.id, access)) {
    return {
      error: NextResponse.json({ error: "Recipe not found" }, { status: 404 }),
    } as const;
  }
  return { recipe, user } as const;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("recipeId");
  if (!recipeId) {
    return NextResponse.json({ error: "Missing recipeId" }, { status: 400 });
  }

  const gate = await assertCanViewRecipeId(recipeId);
  if ("error" in gate) return gate.error;

  const comments = await listCommentsForRecipe(recipeId);
  return NextResponse.json({
    comments,
    signedIn: Boolean(gate.user),
  });
}

export async function POST(request: Request) {
  // Hard requirement: no guest comments
  const user = await getSessionUser();
  if (!user || !canPostComment(user.role)) {
    return NextResponse.json(
      { error: "Sign in to leave a comment." },
      { status: 401 }
    );
  }

  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid comment", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const viewGate = await assertCanViewRecipeId(parsed.data.recipeId);
    if ("error" in viewGate) return viewGate.error;

    const comment = await createComment({
      recipeId: parsed.data.recipeId,
      userId: user.id,
      body: parsed.data.body,
    });
    const comments = await listCommentsForRecipe(parsed.data.recipeId);
    return NextResponse.json({ comment, comments }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not post comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to delete comments." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await getCommentById(id);
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (!canDeleteComment(user.role, existing.userId, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteComment(id);
    const comments = await listCommentsForRecipe(existing.recipeId);
    return NextResponse.json({ ok: true, comments });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not delete comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
