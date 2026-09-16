import { describe, expect, it } from "vitest";
import {
  isDisplayNameSet,
  needsProfileSetup,
  normalizeDisplayName,
  publicAuthorLabel,
  validateDisplayNameInput,
  DISPLAY_NAME_MAX,
} from "@/lib/auth/profile";

describe("normalizeDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeDisplayName("  Gregg   K  ")).toBe("Gregg K");
  });

  it("rejects too-short or empty values", () => {
    expect(normalizeDisplayName("")).toBeNull();
    expect(normalizeDisplayName(" ")).toBeNull();
    expect(normalizeDisplayName("A")).toBeNull();
    expect(normalizeDisplayName(null)).toBeNull();
    expect(normalizeDisplayName(12)).toBeNull();
  });

  it("rejects names over the max length", () => {
    expect(normalizeDisplayName("x".repeat(DISPLAY_NAME_MAX + 1))).toBeNull();
    expect(normalizeDisplayName("x".repeat(DISPLAY_NAME_MAX))).toBe(
      "x".repeat(DISPLAY_NAME_MAX)
    );
  });
});

describe("isDisplayNameSet / needsProfileSetup", () => {
  it("treats a valid name as complete", () => {
    expect(isDisplayNameSet("Gregg")).toBe(true);
    expect(needsProfileSetup("Gregg")).toBe(false);
  });

  it("flags missing names for first-time setup", () => {
    expect(isDisplayNameSet(null)).toBe(false);
    expect(needsProfileSetup(undefined)).toBe(true);
    expect(needsProfileSetup("x")).toBe(true);
  });
});

describe("publicAuthorLabel", () => {
  it("prefers display name over email", () => {
    expect(publicAuthorLabel("Gregg", "gregg@example.com")).toBe("Gregg");
  });

  it("falls back to Cook when display name is unset (never email local-part)", () => {
    expect(publicAuthorLabel(null, "cook@example.com")).toBe("Cook");
    expect(publicAuthorLabel("", "  ")).toBe("Cook");
    expect(publicAuthorLabel(null, "gagekehoe17@gmail.com")).toBe("Cook");
  });

  it("uses Cook when nothing is available", () => {
    expect(publicAuthorLabel(null, null)).toBe("Cook");
  });

  it("never shows an email-shaped display name", () => {
    expect(publicAuthorLabel("gage@example.com")).toBe("Cook");
  });

  it("forces Gregg for the site owner", () => {
    expect(
      publicAuthorLabel("Gage", "gage@example.com", { isSiteOwner: true })
    ).toBe("Gregg");
  });
});

describe("recipeAuthorLabel", () => {
  it("returns a safe public credit", async () => {
    const { recipeAuthorLabel } = await import("@/lib/auth/profile");
    expect(recipeAuthorLabel("Mom")).toBe("Mom");
    expect(recipeAuthorLabel("secret@example.com")).toBe("Cook");
  });
});

describe("validateDisplayNameInput", () => {
  it("accepts a good name", () => {
    expect(validateDisplayNameInput("  Maya  ")).toEqual({
      ok: true,
      name: "Maya",
    });
  });

  it("returns a clear error when empty", () => {
    expect(validateDisplayNameInput("")).toEqual({
      ok: false,
      error: "Display name is required.",
    });
    expect(validateDisplayNameInput(null)).toEqual({
      ok: false,
      error: "Display name is required.",
    });
  });

  it("returns length guidance for short names", () => {
    expect(validateDisplayNameInput("A")).toMatchObject({ ok: false });
  });
});
