"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hasRecipeImage } from "@/lib/recipes/image";
import type { Recipe } from "@/lib/recipes/types";

type Props = {
  contentMode: "sanity" | "local";
  recipes: Recipe[];
  canManageAll: boolean;
};

export function RecipeEditor({ contentMode, recipes, canManageAll }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, string>>({});
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tags, setTags] = useState("");
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [cookMinutes, setCookMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [imageUrl, setImageUrl] = useState("");

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          ingredients: ingredients
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          steps: steps
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          tags: tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          prepMinutes: Number(prepMinutes),
          cookMinutes: Number(cookMinutes),
          servings: Number(servings),
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save recipe");
        return;
      }
      setStatus(`Published “${data.recipe.title}” (${data.mode}).`);
      setTitle("");
      setSummary("");
      setIngredients("");
      setSteps("");
      setTags("");
      setImageUrl("");
      router.refresh();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipePhoto(recipe: Recipe) {
    const nextUrl = (photoDrafts[recipe.id] ?? recipe.imageUrl ?? "").trim();
    setSavingPhotoId(recipe.id);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recipe.id,
          title: recipe.title,
          summary: recipe.summary,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          tags: recipe.tags,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          servings: recipe.servings,
          imageUrl: nextUrl,
          imageAlt: nextUrl ? `${recipe.title} plated` : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update photo");
        return;
      }
      setStatus(
        nextUrl
          ? `Updated photo for “${recipe.title}”.`
          : `Cleared photo for “${recipe.title}” — placeholder will show.`
      );
      setPhotoDrafts((prev) => {
        const next = { ...prev };
        delete next[recipe.id];
        return next;
      });
      router.refresh();
    } catch {
      setError("Network error while updating photo.");
    } finally {
      setSavingPhotoId(null);
    }
  }

  async function deleteRecipe(id: string, recipeTitle: string) {
    if (!confirm(`Delete “${recipeTitle}”?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not delete");
        return;
      }
      setStatus(`Deleted “${recipeTitle}”.`);
      router.refresh();
    } catch {
      setError("Network error while deleting.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-4xl text-[var(--ink)] md:text-5xl">
          My recipes
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
          {canManageAll
            ? "You’re an admin — add dishes and manage any recipe on the site."
            : "Add and manage recipes you published. Viewers can browse; only cooks and admins can write."}{" "}
          Saving to{" "}
          <span className="font-medium text-[var(--ink)]">
            {contentMode === "sanity" ? "Sanity CMS" : "local store"}
          </span>
          .
        </p>
      </div>

      <form onSubmit={saveRecipe} className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Roasted tomato soup"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={3}
              placeholder="What makes this dish worth cooking?"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredients">Ingredients (one per line)</Label>
          <Textarea
            id="ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            required
            rows={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="steps">Steps (one per line)</Label>
          <Textarea
            id="steps"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            required
            rows={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="soup, weeknight"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Recipe photo URL (optional)</Label>
          <Input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className="text-xs text-[var(--ink-soft)]">
            Leave blank for a sage kitchen placeholder with the dish initials.
            Review photos are separate and stay on the recipe page.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="prep">Prep min</Label>
            <Input
              id="prep"
              type="number"
              min={0}
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cook">Cook min</Label>
            <Input
              id="cook"
              type="number"
              min={0}
              value={cookMinutes}
              onChange={(e) => setCookMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-red-700 md:col-span-2">{error}</p> : null}
        {status ? (
          <p className="text-sm text-[var(--accent-deep)] md:col-span-2">{status}</p>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={saving} className="min-w-40">
            {saving ? "Publishing…" : "Publish recipe"}
          </Button>
        </div>
      </form>

      <section className="space-y-4 border-t border-[var(--line)] pt-10">
        <h2 className="font-display text-3xl text-[var(--ink)]">
          {canManageAll ? "All recipes" : "Yours"}
        </h2>
        {recipes.length === 0 ? (
          <p className="text-[var(--ink-muted)]">No recipes to manage yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {recipes.map((recipe) => {
              const draft = photoDrafts[recipe.id] ?? recipe.imageUrl ?? "";
              const hasPhoto = hasRecipeImage(recipe.imageUrl);
              return (
                <li key={recipe.id} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--ink)]">
                        {recipe.title}
                      </p>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {recipe.authorName} · {recipe.source}
                        {hasPhoto ? " · photo set" : " · using placeholder"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/recipes/${recipe.slug}`}
                        className="inline-flex h-7 items-center rounded-lg border border-[var(--line)] px-2.5 text-[0.8rem] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--mist)]"
                      >
                        View
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === recipe.id}
                        onClick={() => deleteRecipe(recipe.id, recipe.title)}
                      >
                        {deletingId === recipe.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label
                        htmlFor={`photo-${recipe.id}`}
                        className="text-xs text-[var(--ink-soft)]"
                      >
                        Recipe photo URL
                      </Label>
                      <Input
                        id={`photo-${recipe.id}`}
                        type="url"
                        value={draft}
                        onChange={(e) =>
                          setPhotoDrafts((prev) => ({
                            ...prev,
                            [recipe.id]: e.target.value,
                          }))
                        }
                        placeholder="https://… (optional)"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={savingPhotoId === recipe.id}
                      onClick={() => saveRecipePhoto(recipe)}
                      className="shrink-0"
                    >
                      {savingPhotoId === recipe.id ? "Saving…" : "Save photo"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
