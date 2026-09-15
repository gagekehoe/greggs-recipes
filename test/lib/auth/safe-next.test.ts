import { describe, expect, it } from "vitest";
import {
  safeNextPath,
  signInDoneUrl,
  welcomeCallbackUrl,
} from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/recipes/soup")).toBe("/recipes/soup");
    expect(safeNextPath("/")).toBe("/");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});

describe("auth callback helpers", () => {
  it("builds welcome and done URLs", () => {
    expect(welcomeCallbackUrl("/recipes/soup")).toBe(
      "/welcome?next=%2Frecipes%2Fsoup"
    );
    expect(signInDoneUrl("/recipes/soup")).toBe(
      "/signin/done?next=%2Frecipes%2Fsoup"
    );
    expect(signInDoneUrl("//evil")).toBe("/signin/done?next=%2F");
  });
});
