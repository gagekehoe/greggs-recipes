import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeEmail,
  validatePassword,
  verifyPassword,
} from "@/lib/auth/password";

describe("password helpers", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  Cook@Example.COM ")).toBe("cook@example.com");
  });

  it("rejects short passwords", () => {
    expect(validatePassword("short")).toMatch(/at least 8/i);
    expect(validatePassword("longenough")).toBeNull();
  });

  it("hashes and verifies", async () => {
    const hash = await hashPassword("password123");
    expect(hash).not.toBe("password123");
    expect(await verifyPassword("password123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
