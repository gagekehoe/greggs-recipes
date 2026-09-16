import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageRecipe, canWriteRecipes } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";
import { getRecipeById } from "@/lib/recipes";
import {
  addRoleShare,
  addUserShare,
  isShareableRole,
  listSharesForRecipe,
  removeShare,
  SHAREABLE_ROLES,
} from "@/lib/recipes/shares";

const createSchema = z
  .object({
    recipeId: z.string().min(1),
    userId: z.string().min(1).optional(),
    role: z.enum(["owner", "admin", "cook", "viewer"]).optional(),
  })
  .superRefine((value, ctx) => {
    const hasUser = Boolean(value.userId);
    const hasRole = Boolean(value.role);
    if (hasUser === hasRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of userId or role.",
      });
    }
  });

const deleteSchema = z.object({
  recipeId: z.string().min(1),
  shareId: z.string().min(1),
});

async function requireShareManager(recipeId: string) {
  const user = await getSessionUser();
  if (!user || !canWriteRecipes(user.role)) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  if (!isDatabaseConfigured()) {
    return {
      error: NextResponse.json(
        {
          error:
            "Sharing needs a database. Configure DATABASE_URL (Neon) to manage shares.",
        },
        { status: 503 }
      ),
    } as const;
  }

  const recipe = await getRecipeById(recipeId);
  if (!recipe) {
    return {
      error: NextResponse.json({ error: "Recipe not found" }, { status: 404 }),
    } as const;
  }

  if (!canManageRecipe(user.role, recipe, user.id)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  if (!recipe.isPrivate) {
    return {
      error: NextResponse.json(
        {
          error:
            "Only private recipes can be shared selectively. Make the recipe private first.",
        },
        { status: 400 }
      ),
    } as const;
  }

  return { user, recipe } as const;
}

/** List share grants for a private recipe the caller can manage. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("recipeId");
  if (!recipeId) {
    return NextResponse.json({ error: "Missing recipeId" }, { status: 400 });
  }

  const gate = await requireShareManager(recipeId);
  if ("error" in gate) return gate.error;

  const shares = await listSharesForRecipe(recipeId);
  return NextResponse.json({
    shares,
    shareableRoles: SHAREABLE_ROLES,
  });
}

/** Add a user or role share (exactly one). No “share with everyone”. */
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recipeId, userId, role } = parsed.data;
    const gate = await requireShareManager(recipeId);
    if ("error" in gate) return gate.error;

    if (userId) {
      if (userId === gate.recipe.authorId) {
        return NextResponse.json(
          { error: "The author already has access to this recipe." },
          { status: 400 }
        );
      }
      try {
        const share = await addUserShare(recipeId, userId);
        return NextResponse.json({ share }, { status: 201 });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not share";
        if (message === "User not found") {
          return NextResponse.json({ error: message }, { status: 404 });
        }
        // Unique constraint → already shared
        if (/unique|constraint|duplicate/i.test(message)) {
          return NextResponse.json(
            { error: "That person already has access." },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    if (!role || !isShareableRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    try {
      const share = await addRoleShare(recipeId, role);
      return NextResponse.json({ share }, { status: 201 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not share";
      if (/unique|constraint|duplicate/i.test(message)) {
        return NextResponse.json(
          { error: "That role already has access." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not update shares";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Remove one share grant. */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body =
      request.headers.get("content-type")?.includes("application/json")
        ? await request.json().catch(() => ({}))
        : {};
    const parsed = deleteSchema.safeParse({
      recipeId: searchParams.get("recipeId") ?? body.recipeId,
      shareId: searchParams.get("shareId") ?? body.shareId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { recipeId, shareId } = parsed.data;
    const gate = await requireShareManager(recipeId);
    if ("error" in gate) return gate.error;

    const removed = await removeShare(shareId, recipeId);
    if (!removed) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not remove share";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
