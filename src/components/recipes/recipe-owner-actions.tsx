"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { hasRecipeImage } from "@/lib/recipes/image";
import {
  RECIPE_PHOTO_ACCEPT,
  RECIPE_PHOTO_MAX_MB,
  recipeOwnerActionClassName,
  recipePhotoFileInputClassName,
  saveRecipePhotoOnly,
  uploadRecipePhoto,
} from "@/lib/uploads/recipe-photo-client";

type Props = {
  recipeId: string;
  recipeTitle: string;
  imageUrl?: string | null;
  /** When true, also show Clear for dishes that already have a real photo. */
  showClear?: boolean;
};

/**
 * Owner/admin actions for recipe detail: Edit recipe + Upload Photo.
 * Upload reuses `/api/recipes/images` + photo-only PATCH (same as My recipes).
 */
export function RecipeOwnerActions({
  recipeId,
  recipeTitle,
  imageUrl,
  showClear = true,
}: Props) {
  const router = useRouter();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasPhoto = hasRecipeImage(imageUrl);

  function resetPicker() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      setStatus(null);
      resetPicker();
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a photo file first.");
      setStatus(null);
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const url = await uploadRecipePhoto(file);
      await saveRecipePhotoOnly({
        recipeId,
        title: recipeTitle,
        imageUrl: url,
      });
      setStatus(`Updated photo for “${recipeTitle}”.`);
      resetPicker();
      router.refresh();
      // Brief success, then close so the detail hero can show the new image.
      window.setTimeout(() => handleOpenChange(false), 600);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not upload recipe photo"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await saveRecipePhotoOnly({
        recipeId,
        title: recipeTitle,
        imageUrl: "",
      });
      setStatus(
        `Cleared photo for “${recipeTitle}” — placeholder will show.`
      );
      resetPicker();
      router.refresh();
      window.setTimeout(() => handleOpenChange(false), 600);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not clear recipe photo"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/my-recipes?edit=${encodeURIComponent(recipeId)}`}
        className={recipeOwnerActionClassName}
      >
        Edit recipe
      </Link>

      <button
        type="button"
        className={recipeOwnerActionClassName}
        onClick={() => handleOpenChange(true)}
      >
        Upload Photo
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {hasPhoto ? "Replace recipe photo" : "Upload recipe photo"}
            </DialogTitle>
            <DialogDescription>
              Same upload as My recipes — JPEG, PNG, WebP, or GIF up to{" "}
              {RECIPE_PHOTO_MAX_MB}MB. Stored on Vercel Blob when configured.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={inputId} className="text-xs text-[var(--ink-soft)]">
              Choose a photo
            </Label>
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept={RECIPE_PHOTO_ACCEPT}
              className={recipePhotoFileInputClassName}
              disabled={saving}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
                setStatus(null);
              }}
            />
            {file ? (
              <p className="text-xs text-[var(--ink-muted)]">
                Selected: {file.name}
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-soft)]">
                No file selected yet.
              </p>
            )}
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}
            {status ? (
              <p
                role="status"
                className="rounded-lg border border-[var(--line)] bg-[var(--mist)] px-3 py-2 text-sm text-[var(--ink)]"
              >
                {status}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {showClear && hasPhoto ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void handleClear()}
              >
                {saving ? "Working…" : "Clear photo"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !file}
                onClick={() => void handleUpload()}
              >
                {saving ? "Saving…" : "Upload photo"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
