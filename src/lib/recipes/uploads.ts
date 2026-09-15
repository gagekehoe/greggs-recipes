import {
  deleteUploadedImage,
  saveUploadedImage,
} from "@/lib/uploads/image-store";

/**
 * Saves a recipe hero photo and returns a public URL
 * (Vercel Blob in prod, /uploads/recipes/ locally).
 */
export async function saveRecipeImageFile(file: File): Promise<string> {
  return saveUploadedImage(file, "recipes");
}

export async function deleteRecipeImageFile(publicUrl: string) {
  await deleteUploadedImage(publicUrl);
}
