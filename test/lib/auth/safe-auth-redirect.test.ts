import { describe, expect, it } from "vitest";
import {
  authPublicOrigin,
  safeAuthRedirect,
  sameOriginRelativeUrl,
  sanitizeAuthCallbackUrl,
} from "@/lib/auth/safe-auth-redirect";

describe("sameOriginRelativeUrl", () => {
  const origin = "https://greggsrecipes.com";

  it("allows same-origin paths with query and hash", () => {
    expect(sameOriginRelativeUrl("/recipes", origin)).toBe("/recipes");
    expect(sameOriginRelativeUrl("/recipes?x=1", origin)).toBe("/recipes?x=1");
    expect(sameOriginRelativeUrl("/recipes#top", origin)).toBe("/recipes#top");
  });

  it("rejects backslash, protocol-relative, absolute external, and controls", () => {
    expect(sameOriginRelativeUrl("/\\evil.example", origin)).toBeUndefined();
    expect(sameOriginRelativeUrl("//evil.example", origin)).toBeUndefined();
    expect(sameOriginRelativeUrl("https://evil.example", origin)).toBeUndefined();
    expect(sameOriginRelativeUrl("/\tevil", origin)).toBeUndefined();
    expect(sameOriginRelativeUrl("/foo\u0001bar", origin)).toBeUndefined();
  });
});

describe("sanitizeAuthCallbackUrl", () => {
  const origin = "https://greggsrecipes.com";

  it("allows relative same-site paths", () => {
    expect(sanitizeAuthCallbackUrl("/signin/done?next=%2F", origin)).toBe(
      "/signin/done?next=%2F"
    );
    expect(sanitizeAuthCallbackUrl("/recipes", origin)).toBe("/recipes");
    expect(sanitizeAuthCallbackUrl("/recipes?x=1", origin)).toBe(
      "/recipes?x=1"
    );
  });

  it("allows absolute same-origin URLs as pathname+search+hash", () => {
    expect(
      sanitizeAuthCallbackUrl(
        "https://greggsrecipes.com/signin/done?next=%2F",
        origin
      )
    ).toBe("/signin/done?next=%2F");
  });

  it("rejects external, protocol-relative, backslash, and control chars", () => {
    expect(sanitizeAuthCallbackUrl("https://evil.example/phish", origin)).toBe(
      undefined
    );
    expect(sanitizeAuthCallbackUrl("//evil.example/phish", origin)).toBe(
      undefined
    );
    expect(sanitizeAuthCallbackUrl("https://evil.example", origin)).toBe(
      undefined
    );
    expect(sanitizeAuthCallbackUrl("/\\evil.example", origin)).toBeUndefined();
    expect(sanitizeAuthCallbackUrl("/\tevil", origin)).toBeUndefined();
    expect(sanitizeAuthCallbackUrl("/\u007fx", origin)).toBeUndefined();
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
    expect(safeAuthRedirect("/recipes?x=1", base)).toBe(
      "https://greggsrecipes.com/recipes?x=1"
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
    expect(safeAuthRedirect("/\\evil.example", base)).toBe(base);
    expect(safeAuthRedirect("/\tevil", base)).toBe(base);
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
