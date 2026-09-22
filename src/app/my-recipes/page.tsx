import Link from "next/link";
import { redirect } from "next/navigation";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { canWriteRecipes, hasKitchenStaffPowers } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { getContentMode, listRecipes } from "@/lib/recipes";

export const metadata = {
  title: "My recipes",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function MyRecipesPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?callbackUrl=/my-recipes");
  }

  if (!canWriteRecipes(user.role)) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-28 md:px-8 md:py-32">
        <h1 className="font-display text-4xl text-[var(--ink)]">My recipes</h1>
        <p className="mt-4 text-[var(--ink-muted)] leading-relaxed">
          You&apos;re signed in as a <strong>viewer</strong>. You can browse every
          recipe; ask an admin to promote you to <strong>cook</strong> if you want
          to publish.
        </p>
        <Link
          href="/#recipes"
          className="mt-8 inline-block text-sm font-medium text-[var(--accent-deep)] underline-offset-4 hover:underline"
        >
          Browse recipes
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const initialEditId =
    typeof params.edit === "string" && params.edit.trim()
      ? params.edit.trim()
      : null;

  const { recipes } = await listRecipes({
    includePrivateForUserId: user.id,
    viewerRole: user.role,
  });
  // My recipes is a management surface: cooks see their own dishes only.
  // Shared-with-me private recipes appear on Browse / detail, not here.
  const visible =
    hasKitchenStaffPowers(user.role)
      ? recipes.filter(
          (r) => !r.isPrivate || r.authorId === user.id
        )
      : recipes.filter((r) => r.authorId === user.id);

  return (
    <div className="mx-auto max-w-4xl px-5 py-28 md:px-8 md:py-32">
      <RecipeEditor
        contentMode={getContentMode()}
        recipes={visible}
        canManageAll={hasKitchenStaffPowers(user.role)}
        currentUserId={user.id}
        initialEditId={initialEditId}
      />
    </div>
  );
}
