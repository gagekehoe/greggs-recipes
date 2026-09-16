"use client";

import { useEffect, useRef, useState } from "react";
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
  /** Prefill the form for this recipe id (from `/my-recipes?edit=`). */
  initialEditId?: string | null;
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

export function RecipeEditor({
  contentMode,
  recipes,
  canManageAll,
  initialEditId = null,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const createPhotoRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({});
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [tags, setTags] = useState("");
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [cookMinutes, setCookMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(
    null
  );

  const editingRecipe = editingId
    ? recipes.find((r) => r.id === editingId) ?? null
    : null;
  const isEditing = Boolean(editingId);

  function resetCreateForm() {
    setEditingId(null);
    setExistingImageUrl("");
    setTitle("");
    setSummary("");
    setIngredients("");
    setSteps("");
    setTags("");
    setPrepMinutes(15);
    setCookMinutes(30);
    setServings(4);
    setIsPrivate(false);
    setCreatePhotoFile(null);
    if (createPhotoRef.current) createPhotoRef.current.value = "";
  }

  function loadRecipeIntoForm(recipe: Recipe, syncUrl = true) {
    setEditingId(recipe.id);
    setExistingImageUrl(recipe.imageUrl || "");
    setTitle(recipe.title);
    setSummary(recipe.summary);
    setIngredients(recipe.ingredients.join("\n"));
    setSteps(recipe.steps.join("\n"));
    setTags(recipe.tags.join(", "));
    setPrepMinutes(recipe.prepMinutes);
    setCookMinutes(recipe.cookMinutes);
    setServings(recipe.servings);
    setIsPrivate(Boolean(recipe.isPrivate));
    setCreatePhotoFile(null);
    if (createPhotoRef.current) createPhotoRef.current.value = "";
    setError(null);
    setStatus(null);
    if (syncUrl) {
      router.replace(`/my-recipes?edit=${encodeURIComponent(recipe.id)}`, {
        scroll: false,
      });
    }
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function cancelEdit() {
    resetCreateForm();
    router.replace("/my-recipes", { scroll: false });
  }

  useEffect(() => {
    if (!initialEditId) return;
    const recipe = recipes.find((r) => r.id === initialEditId);
    if (!recipe) {
      setError("That recipe isn’t in your list — it may have been deleted.");
      return;
    }
    loadRecipeIntoForm(recipe, false);
    // Prefill once from the URL; later Edit clicks call loadRecipeIntoForm directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount/URL hydrate
  }, [initialEditId]);

  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      let imageUrl: string | undefined;
      if (createPhotoFile) {
        imageUrl = await uploadRecipePhoto(createPhotoFile);
      } else if (isEditing) {
        imageUrl = existingImageUrl;
      }

      const payload = {
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
        imageAlt: imageUrl ? `${title.trim()} plated` : "",
        isPrivate,
      };

      const res = await fetch("/api/recipes", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing ? { id: editingId, ...payload } : payload
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          recipeApiErrorMessage(
            data,
            isEditing ? "Could not update recipe" : "Could not save recipe"
          )
        );
        return;
      }
      const saved = data.recipe as Recipe;
      setStatus(
        isEditing
          ? saved.isPrivate
            ? `Updated “${saved.title}” (still private).`
            : `Updated “${saved.title}”.`
          : saved.isPrivate
            ? `Saved “${saved.title}” as private (${data.mode}) — only you can see it.`
            : `Published “${saved.title}” (${data.mode}).`
      );
      resetCreateForm();
      router.replace("/my-recipes", { scroll: false });
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
          isPrivate: recipe.isPrivate,
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

  async function setRecipeVisibility(recipe: Recipe, nextPrivate: boolean) {
    setVisibilitySavingId(recipe.id);
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
          imageUrl: recipe.imageUrl,
          imageAlt: recipe.imageAlt,
          isPrivate: nextPrivate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(recipeApiErrorMessage(data, "Could not update visibility"));
        return;
      }
      setStatus(
        nextPrivate
          ? `“${recipe.title}” is now private — only you can see it.`
          : `“${recipe.title}” is now public on Gregg’s Recipes.`
      );
      router.refresh();
    } catch {
      setError("Network error while updating visibility.");
    } finally {
      setVisibilitySavingId(null);
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
      if (editingId === id) {
        resetCreateForm();
        router.replace("/my-recipes", { scroll: false });
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
            ? "You’re an admin — add dishes, edit any public recipe, and manage the kitchen."
            : "Add, edit, and manage recipes you published. Viewers can browse; only cooks and admins can write."}{" "}
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

      <form
        ref={formRef}
        id="recipe-form"
        onSubmit={saveRecipe}
        className="grid scroll-mt-28 gap-6 md:grid-cols-2"
      >
        <div className="space-y-2 md:col-span-2">
          <h2 className="font-display text-3xl text-[var(--ink)]">
            {isEditing ? "Edit recipe" : "Add a recipe"}
          </h2>
          {isEditing && editingRecipe ? (
            <p className="text-sm text-[var(--ink-muted)]">
              Updating{" "}
              <span className="font-medium text-[var(--ink)]">
                {editingRecipe.title}
              </span>
              . Save keeps the same URL slug.
            </p>
          ) : null}
        </div>

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
          <Label htmlFor="recipePhoto">
            {isEditing ? "Recipe photo" : "Recipe photo (optional)"}
          </Label>
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
            limit need a quick compress first.
            {isEditing
              ? hasRecipeImage(existingImageUrl)
                ? " Leave blank to keep the current photo."
                : " Leave blank to keep the sage placeholder."
              : " Leave blank for a sage kitchen placeholder with the dish initials."}{" "}
            Review photos are separate and stay on the recipe page.
          </p>
          {isEditing && hasRecipeImage(existingImageUrl) && !createPhotoFile ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Current photo is set
              {existingImageUrl.startsWith("http") ||
              existingImageUrl.startsWith("/")
                ? " — choose a file only if you want to replace it."
                : "."}
            </p>
          ) : null}
          {createPhotoFile ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Selected: {createPhotoFile.name}
            </p>
          ) : null}
          {isEditing && hasRecipeImage(existingImageUrl) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => {
                setExistingImageUrl("");
                setCreatePhotoFile(null);
                if (createPhotoRef.current) createPhotoRef.current.value = "";
              }}
            >
              Clear photo
            </Button>
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

        <div className="space-y-2 md:col-span-2">
          <Label id="visibility-label">Visibility</Label>
          <div
            role="radiogroup"
            aria-labelledby="visibility-label"
            className="flex flex-col gap-2 sm:flex-row sm:gap-4"
          >
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--line)] px-3 py-2.5 has-[:checked]:border-[var(--sage-deep)] has-[:checked]:bg-[var(--mist)]">
              <input
                type="radio"
                name="visibility"
                className="mt-1"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
              />
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">
                  Public
                </span>
                <span className="block text-xs text-[var(--ink-soft)]">
                  Listed on Gregg&apos;s Recipes for everyone
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--line)] px-3 py-2.5 has-[:checked]:border-[var(--sage-deep)] has-[:checked]:bg-[var(--mist)]">
              <input
                type="radio"
                name="visibility"
                className="mt-1"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
              />
              <span>
                <span className="block text-sm font-medium text-[var(--ink)]">
                  Private (only me)
                </span>
                <span className="block text-xs text-[var(--ink-soft)]">
                  Hidden from Browse Recipes and direct links for others
                </span>
              </span>
            </label>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-700 md:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        {status ? (
          <p
            className="text-sm text-[var(--accent-deep)] md:col-span-2"
            role="status"
            aria-live="polite"
          >
            {status}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <Button type="submit" disabled={saving} className="min-w-40">
            {saving
              ? isEditing
                ? "Saving…"
                : isPrivate
                  ? "Saving…"
                  : "Publishing…"
              : isEditing
                ? "Save changes"
                : isPrivate
                  ? "Save private recipe"
                  : "Publish recipe"}
          </Button>
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={cancelEdit}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <section className="space-y-4 border-t border-[var(--line)] pt-10">
        <h2 className="font-display text-3xl text-[var(--ink)]">
          {canManageAll ? "All recipes" : "Yours"}
        </h2>
        {recipes.length === 0 ? (
          <p className="text-[var(--ink-muted)]">
            You haven&apos;t published anything yet. Use the form above to add
            the first dish to Gregg&apos;s shared collection.
          </p>
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
                        {recipe.isPrivate ? (
                          <span className="ml-2 text-xs font-normal text-[var(--ink-soft)]">
                            · Private
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {recipe.authorName} · {recipe.source}
                        {hasPhoto ? " · photo set" : " · using placeholder"}
                        {recipe.isPrivate
                          ? " · only you can open this"
                          : " · public"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/recipes/${recipe.slug}`}
                        className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] px-3 text-[0.8rem] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--mist)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--sage-deep)] md:h-7 md:px-2.5"
                      >
                        View
                      </Link>
                      <Button
                        variant={
                          editingId === recipe.id ? "secondary" : "outline"
                        }
                        size="sm"
                        onClick={() => loadRecipeIntoForm(recipe)}
                      >
                        {editingId === recipe.id ? "Editing…" : "Edit"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={visibilitySavingId === recipe.id}
                        onClick={() =>
                          setRecipeVisibility(recipe, !recipe.isPrivate)
                        }
                      >
                        {visibilitySavingId === recipe.id
                          ? "Updating…"
                          : recipe.isPrivate
                            ? "Make public"
                            : "Make private"}
                      </Button>
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
