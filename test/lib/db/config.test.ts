import { afterEach, describe, expect, it, vi } from "vitest";

describe("db dialect selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    // Clear cached drizzle client between env scenarios.
    const g = globalThis as {
      __greggsDbBundle?: unknown;
      __greggsDbResolved?: boolean;
    };
    delete g.__greggsDbBundle;
    delete g.__greggsDbResolved;
  });

  it("uses sqlite locally when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    const mod = await import("@/lib/db");
    expect(mod.isDatabaseConfigured()).toBe(true);
    expect(mod.getDbDialect()).toBe("sqlite");
  });

  it("reports unavailable on Vercel without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("VERCEL", "1");
    const mod = await import("@/lib/db");
    expect(mod.isDatabaseConfigured()).toBe(false);
    expect(mod.getDbDialect()).toBe("none");
  });
});
