"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recipeApiErrorMessage } from "@/lib/recipes/api-error";
import { hasRecipeImage } from "@/lib/recipes/image";
import { RECIPE_FIELD_LIMITS } from "@/lib/recipes/recipe-input-schema";
import type { Recipe } from "@/lib/recipes/types";
import { IMAGE_UPLOAD_LIMITS } from "@/lib/uploads/limits";

type Props = {
  contentMode: "db" | "sanity" | "local";
  recipes: Recipe[];
  canManageAll: boolean;
};

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const PHOTO_MAX_MB = IMAGE_UPLOAD_LIMITS.maxBytesPerFile / (1024 * 1024);

const fileInputClassName =
  "block w-full text-sm text-[var(--ink-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mist)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--ink)]";

function assertPhotoReady(file: File) {
  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytesPerFile) {
    throw new Error(
      `Photo is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Use a JPEG/PNG/WebP under ${PHOTO_MAX_MB}MB, or compress it before uploading.`
    );
  }
  if (
    file.type &&
    !(IMAGE_UPLOAD_LIMITS.allowedMimeTypes as readonly string[]).includes(
      file.type
    )
  ) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
  }
}

async function uploadRecipePhoto(file: File): Promise<string> {
  assertPhotoReady(file);
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/recipes/images", {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Could not upload photo"
    );
  }
  if (typeof data.url !== "string" || !data.url) {
    throw new Error("Upload did not return a photo URL");
  }
  return data.url;
}

export function RecipeEditor({ contentMode, recipes, canManageAll }: Props) {
  const router = useRouter();
  const createPhotoRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({});
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tags, setTags] = useState("");
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [cookMinutes, setCookMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      let imageUrl: string | undefined;
      if (createPhotoFile) {
        imageUrl = await uploadRecipePhoto(createPhotoFile);
      }

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
          imageUrl,
          imageAlt: imageUrl ? `${title.trim()} plated` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(recipeApiErrorMessage(data, "Could not save recipe"));
        return;
      }
      setStatus(`Published “${data.recipe.title}” (${data.mode}).`);
      setTitle("");
      setSummary("");
      setIngredients("");
      setSteps("");
      setTags("");
      setCreatePhotoFile(null);
      if (createPhotoRef.current) createPhotoRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error while saving."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipePhoto(recipe: Recipe, nextUrl: string) {
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
        setError(recipeApiErrorMessage(data, "Could not update photo"));
        return;
      }
      setStatus(
        nextUrl
          ? `Updated photo for “${recipe.title}”.`
          : `Cleared photo for “${recipe.title}” — placeholder will show.`
      );
      setPhotoFiles((prev) => {
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

  async function uploadAndSavePhoto(recipe: Recipe) {
    const file = photoFiles[recipe.id];
    if (!file) {
      setError("Choose a photo file first.");
      return;
    }
    setSavingPhotoId(recipe.id);
    setError(null);
    setStatus(null);
    try {
      const url = await uploadRecipePhoto(file);
      await saveRecipePhoto(recipe, url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not upload recipe photo"
      );
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
            {contentMode === "db"
              ? "the kitchen database"
              : contentMode === "sanity"
                ? "Sanity CMS"
                : "local store"}
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
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="summary">Summary</Label>
              <p
                className="text-xs tabular-nums text-[var(--ink-soft)]"
                aria-live="polite"
              >
                {summary.length}/{RECIPE_FIELD_LIMITS.summaryMax}
              </p>
            </div>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              rows={3}
              maxLength={RECIPE_FIELD_LIMITS.summaryMax}
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
          <Label htmlFor="recipePhoto">Recipe photo (optional)</Label>
          <input
            ref={createPhotoRef}
            id="recipePhoto"
            type="file"
            accept={PHOTO_ACCEPT}
            className={fileInputClassName}
            onChange={(e) => setCreatePhotoFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-[var(--ink-soft)]">
            JPEG, PNG, WebP, or GIF up to {PHOTO_MAX_MB}MB. Phone photos over the
            limit need a quick compress first. Leave blank for a sage kitchen
            placeholder with the dish initials. Review photos are separate and
            stay on the recipe page.
          </p>
          {createPhotoFile ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Selected: {createPhotoFile.name}
            </p>
          ) : null}
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
              const pendingFile = photoFiles[recipe.id];
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
                        Replace recipe photo
                      </Label>
                      <input
                        id={`photo-${recipe.id}`}
                        type="file"
                        accept={PHOTO_ACCEPT}
                        className={fileInputClassName}
                        onChange={(e) =>
                          setPhotoFiles((prev) => ({
                            ...prev,
                            [recipe.id]: e.target.files?.[0] ?? null,
                          }))
                        }
                      />
                      {pendingFile ? (
                        <p className="text-xs text-[var(--ink-muted)]">
                          Selected: {pendingFile.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={
                          savingPhotoId === recipe.id || !pendingFile
                        }
                        onClick={() => uploadAndSavePhoto(recipe)}
                      >
                        {savingPhotoId === recipe.id
                          ? "Saving…"
                          : "Upload photo"}
                      </Button>
                      {hasPhoto ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={savingPhotoId === recipe.id}
                          onClick={() => saveRecipePhoto(recipe, "")}
                        >
                          Clear
                        </Button>
                      ) : null}
                    </div>
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
