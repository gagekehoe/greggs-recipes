import { describe, expect, it } from "vitest";
import { sanitizeTelemetryEvent } from "@/lib/seo/analytics";

describe("sanitizeTelemetryEvent", () => {
  it("drops magic-link verify pageviews that carry a live token", () => {
    expect(
      sanitizeTelemetryEvent({
        type: "pageview",
        url: "https://www.greggsrecipes.com/signin/verify?token=SECRET&email=cook%40example.com",
      })
    ).toBeNull();
  });

  it("drops Auth.js callback URLs", () => {
    expect(
      sanitizeTelemetryEvent({
        url: "https://www.greggsrecipes.com/api/auth/callback/nodemailer?token=SECRET&email=cook@example.com",
      })
    ).toBeNull();
  });

  it("drops the post-verify done page (session cookies + next path)", () => {
    expect(
      sanitizeTelemetryEvent({
        url: "https://www.greggsrecipes.com/signin/done?next=%2Fmy-recipes",
      })
    ).toBeNull();
  });

  it("keeps ordinary recipe pageviews unchanged", () => {
    const event = {
      type: "pageview" as const,
      url: "https://www.greggsrecipes.com/recipes/extra-saucy-late-night-cajun-tuna-bowl",
    };
    expect(sanitizeTelemetryEvent(event)).toEqual(event);
  });

  it("strips token/email if they appear on an otherwise tracked URL", () => {
    const result = sanitizeTelemetryEvent({
      url: "https://www.greggsrecipes.com/welcome?token=SECRET&email=cook@example.com&next=%2F",
    });
    expect(result).toEqual({
      url: "https://www.greggsrecipes.com/welcome?next=%2F",
    });
  });
});
