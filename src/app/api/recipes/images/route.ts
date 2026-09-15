import { NextResponse } from "next/server";
import { canWriteRecipes } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { saveRecipeImageFile } from "@/lib/recipes/uploads";
import { usesVercelBlob } from "@/lib/uploads/image-store";

/** Upload a recipe photo (cook/admin). Returns { url, driver }. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canWriteRecipes(user.role)) {
    return NextResponse.json(
      { error: "Sign in as a cook or admin to upload recipe photos." },
      { status: 401 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const url = await saveRecipeImageFile(file);
    return NextResponse.json(
      {
        url,
        driver: usesVercelBlob() ? "vercel-blob" : "local",
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not upload recipe photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
