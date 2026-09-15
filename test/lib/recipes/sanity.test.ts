import { afterEach, describe, expect, it } from "vitest";
import { getSanityClient, isSanityConfigured } from "@/lib/recipes/sanity";

describe("sanity helpers", () => {
  const previous = {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    read: process.env.SANITY_API_READ_TOKEN,
    write: process.env.SANITY_API_WRITE_TOKEN,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries({
      NEXT_PUBLIC_SANITY_PROJECT_ID: previous.projectId,
      NEXT_PUBLIC_SANITY_DATASET: previous.dataset,
      SANITY_API_READ_TOKEN: previous.read,
      SANITY_API_WRITE_TOKEN: previous.write,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("treats missing or placeholder project ids as unconfigured", () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    expect(isSanityConfigured()).toBe(false);
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "your-project-id";
    expect(isSanityConfigured()).toBe(false);
  });

  it("returns a client when configured", () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "abc123";
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
    expect(isSanityConfigured()).toBe(true);
    expect(getSanityClient()).not.toBeNull();
    expect(getSanityClient(true)).not.toBeNull();
  });

  it("returns null when not configured", () => {
    delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    expect(getSanityClient()).toBeNull();
  });
});
