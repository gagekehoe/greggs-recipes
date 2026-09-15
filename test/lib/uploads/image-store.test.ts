import { beforeEach, describe, expect, it, vi } from "vitest";

const put = vi.fn();
const del = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...a: unknown[]) => put(...a),
  del: (...a: unknown[]) => del(...a),
}));

describe("image-store uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("writes recipe photos under public/uploads/recipes locally", async () => {
    const { saveUploadedImage, usesVercelBlob } = await import(
      "@/lib/uploads/image-store"
    );
    expect(usesVercelBlob()).toBe(false);

    const file = new File([Uint8Array.from([1, 2, 3, 4])], "bowl.jpg", {
      type: "image/jpeg",
    });
    const url = await saveUploadedImage(file, "recipes");
    expect(url).toMatch(/^\/uploads\/recipes\/.+\.jpg$/);
    expect(put).not.toHaveBeenCalled();
  });

  it("uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    put.mockResolvedValue({
      url: "https://abc.public.blob.vercel-storage.com/recipes/x.jpg",
    });

    const { saveUploadedImage, usesVercelBlob } = await import(
      "@/lib/uploads/image-store"
    );
    expect(usesVercelBlob()).toBe(true);

    const file = new File([Uint8Array.from([9, 9])], "dish.png", {
      type: "image/png",
    });
    const url = await saveUploadedImage(file, "recipes");
    expect(url).toContain("blob.vercel-storage.com");
    expect(put).toHaveBeenCalledOnce();
  });

  it("rejects unsupported mime types", async () => {
    const { saveUploadedImage } = await import("@/lib/uploads/image-store");
    const file = new File(["not-an-image"], "x.txt", { type: "text/plain" });
    await expect(saveUploadedImage(file, "recipes")).rejects.toThrow(
      /Unsupported image type/
    );
  });
});
