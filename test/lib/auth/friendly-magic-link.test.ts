import { describe, expect, it } from "vitest";
import {
  authCallbackFromVerifyParams,
  toFriendlyMagicLinkUrl,
} from "@/lib/auth/friendly-magic-link";

describe("toFriendlyMagicLinkUrl", () => {
  it("rewrites Auth.js nodemailer callbacks to /signin/verify", () => {
    const authUrl =
      "https://greggsrecipes.com/api/auth/callback/nodemailer?callbackUrl=https%3A%2F%2Fgreggsrecipes.com%2Fsignin%2Fdone%3Fnext%3D%252Frecipes%252Fsoup&token=abc123&email=cook%40example.com";

    const friendly = toFriendlyMagicLinkUrl(authUrl);
    const parsed = new URL(friendly);

    expect(parsed.origin).toBe("https://greggsrecipes.com");
    expect(parsed.pathname).toBe("/signin/verify");
    expect(parsed.searchParams.get("token")).toBe("abc123");
    expect(parsed.searchParams.get("email")).toBe("gage@example.com");
    expect(parsed.searchParams.get("callbackUrl")).toBe(
      "https://greggsrecipes.com/signin/done?next=%2Frecipes%2Fsoup"
    );
    expect(friendly).not.toContain("/api/auth/callback");
  });

  it("preserves localhost origins for local demos", () => {
    const authUrl =
      "http://127.0.0.1:43127/api/auth/callback/nodemailer?token=tok&email=a%40b.co&callbackUrl=http%3A%2F%2F127.0.0.1%3A43127%2Fsignin%2Fdone%3Fnext%3D%252F";

    const friendly = toFriendlyMagicLinkUrl(authUrl);
    expect(friendly.startsWith("http://127.0.0.1:43127/signin/verify?")).toBe(
      true
    );
    expect(new URL(friendly).searchParams.get("token")).toBe("tok");
  });

  it("returns the original URL when token or email is missing", () => {
    const broken =
      "https://greggsrecipes.com/api/auth/callback/nodemailer?email=only@example.com";
    expect(toFriendlyMagicLinkUrl(broken)).toBe(broken);
  });

  it("returns the original string when it is not a valid URL", () => {
    expect(toFriendlyMagicLinkUrl("not-a-url")).toBe("not-a-url");
  });
});

describe("authCallbackFromVerifyParams", () => {
  it("rebuilds the Auth.js callback path", () => {
    expect(
      authCallbackFromVerifyParams({
        token: "abc123",
        email: "gage@example.com",
        callbackUrl: "https://greggsrecipes.com/signin/done?next=%2F",
      })
    ).toBe(
      "/api/auth/callback/nodemailer?token=abc123&email=cook%40example.com&callbackUrl=https%3A%2F%2Fgreggsrecipes.com%2Fsignin%2Fdone%3Fnext%3D%252F"
    );
  });

  it("omits callbackUrl when absent", () => {
    expect(
      authCallbackFromVerifyParams({
        token: "t",
        email: "a@b.co",
      })
    ).toBe("/api/auth/callback/nodemailer?token=t&email=a%40b.co");
  });

  it("round-trips with toFriendlyMagicLinkUrl", () => {
    const authUrl =
      "https://greggsrecipes.com/api/auth/callback/nodemailer?callbackUrl=https%3A%2F%2Fgreggsrecipes.com%2Fsignin%2Fdone%3Fnext%3D%252F&token=xyz&email=u%40ex.com";
    const friendly = new URL(toFriendlyMagicLinkUrl(authUrl));
    const rebuilt = authCallbackFromVerifyParams({
      token: friendly.searchParams.get("token")!,
      email: friendly.searchParams.get("email")!,
      callbackUrl: friendly.searchParams.get("callbackUrl"),
    });
    const rebuiltUrl = new URL(rebuilt, "https://greggsrecipes.com");
    const original = new URL(authUrl);

    expect(rebuiltUrl.pathname).toBe(original.pathname);
    expect(rebuiltUrl.searchParams.get("token")).toBe(
      original.searchParams.get("token")
    );
    expect(rebuiltUrl.searchParams.get("email")).toBe(
      original.searchParams.get("email")
    );
    expect(rebuiltUrl.searchParams.get("callbackUrl")).toBe(
      original.searchParams.get("callbackUrl")
    );
  });
});
