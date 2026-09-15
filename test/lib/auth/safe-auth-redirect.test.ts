import { describe, expect, it } from "vitest";
import {
  authPublicOrigin,
  safeAuthRedirect,
  sanitizeAuthCallbackUrl,
} from "@/lib/auth/safe-auth-redirect";

describe("sanitizeAuthCallbackUrl", () => {
  const origin = "https://greggsrecipes.com";

  it("allows relative same-site paths", () => {
    expect(sanitizeAuthCallbackUrl("/signin/done?next=%2F", origin)).toBe(
      "/signin/done?next=%2F"
    );
  });

  it("allows absolute same-origin URLs", () => {
    expect(
      sanitizeAuthCallbackUrl(
        "https://greggsrecipes.com/signin/done?next=%2F",
        origin
      )
    ).toBe("https://greggsrecipes.com/signin/done?next=%2F");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(sanitizeAuthCallbackUrl("https://evil.example/phish", origin)).toBe(
      undefined
    );
    expect(sanitizeAuthCallbackUrl("//evil.example/phish", origin)).toBe(
      undefined
    );
    expect(sanitizeAuthCallbackUrl("https://evil.example", origin)).toBe(
      undefined
    );
  });

  it("returns undefined for empty values", () => {
    expect(sanitizeAuthCallbackUrl(null, origin)).toBeUndefined();
    expect(sanitizeAuthCallbackUrl(undefined, origin)).toBeUndefined();
    expect(sanitizeAuthCallbackUrl("", origin)).toBeUndefined();
  });
});

describe("safeAuthRedirect", () => {
  const base = "https://greggsrecipes.com";

  it("prefixes relative paths", () => {
    expect(safeAuthRedirect("/welcome", base)).toBe(
      "https://greggsrecipes.com/welcome"
    );
  });

  it("keeps same-origin absolute URLs", () => {
    expect(safeAuthRedirect("https://greggsrecipes.com/profile", base)).toBe(
      "https://greggsrecipes.com/profile"
    );
  });

  it("falls back to baseUrl for open redirects", () => {
    expect(safeAuthRedirect("https://evil.example/", base)).toBe(base);
    expect(safeAuthRedirect("//evil.example", base)).toBe(base);
  });
});

describe("authPublicOrigin", () => {
  it("defaults to the production www host when AUTH_URL is unset", () => {
    const prev = process.env.AUTH_URL;
    delete process.env.AUTH_URL;
    expect(authPublicOrigin()).toBe("https://www.greggsrecipes.com");
    if (prev !== undefined) process.env.AUTH_URL = prev;
  });
});
