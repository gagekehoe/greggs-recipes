import { describe, expect, it, vi, afterEach } from "vitest";
import {
  assertRecipePhotoReady,
  uploadRecipePhoto,
} from "@/lib/uploads/recipe-photo-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recipe-photo-client", () => {
  it("rejects oversized files before upload", () => {
    const big = new File([new Uint8Array(9 * 1024 * 1024)], "huge.jpg", {
      type: "image/jpeg",
    });
    expect(() => assertRecipePhotoReady(big)).toThrow(/too large/i);
  });

  it("rejects unsupported mime types", () => {
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    expect(() => assertRecipePhotoReady(file)).toThrow(/unsupported/i);
  });

  it("returns the Blob URL from /api/recipes/images", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          url: "https://abc.public.blob.vercel-storage.com/stew.jpg",
        }),
      }))
    );
    const file = new File(["x"], "stew.jpg", { type: "image/jpeg" });
    await expect(uploadRecipePhoto(file)).resolves.toBe(
      "https://abc.public.blob.vercel-storage.com/stew.jpg"
    );
  });
});
