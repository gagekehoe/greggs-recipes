import { mkdtemp, rm, mkdir, access, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("review uploads", () => {
  let tmpDir: string;
  let previousCwd: string;

  beforeEach(async () => {
    previousCwd = process.cwd();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "greggs-uploads-"));
    process.chdir(tmpDir);
    vi.resetModules();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("saves allowed images and rejects bad mime/size", async () => {
    const uploads = await import("@/lib/reviews/uploads");
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", {
      type: "image/png",
    });
    const url = await uploads.saveReviewImageFile(file);
    expect(url.startsWith("/uploads/reviews/")).toBe(true);
    expect(url.endsWith(".png")).toBe(true);
    await access(path.join(tmpDir, "public", url.replace(/^\//, "")));

    await expect(
      uploads.saveReviewImageFile(
        new File([new Uint8Array([1])], "x.pdf", { type: "application/pdf" })
      )
    ).rejects.toThrow(/Unsupported image type/);

    const big = new File(
      [new Uint8Array(4 * 1024 * 1024 + 1)],
      "big.jpg",
      { type: "image/jpeg" }
    );
    await expect(uploads.saveReviewImageFile(big)).rejects.toThrow(/too large/i);
  });

  it("deletes known review upload paths and ignores others", async () => {
    const uploads = await import("@/lib/reviews/uploads");
    const dir = path.join(tmpDir, "public", "uploads", "reviews");
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, "gone.jpg");
    await writeFile(filePath, "x");

    await uploads.deleteReviewImageFile("/uploads/reviews/gone.jpg");
    await expect(access(filePath)).rejects.toThrow();

    await uploads.deleteReviewImageFile("/elsewhere/file.jpg");
    await uploads.deleteReviewImageFile("/uploads/reviews/missing.jpg");
  });
});
