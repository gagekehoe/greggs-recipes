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

  it("rejects short and overly long passwords", () => {
    expect(validatePassword("short")).toBe(
      "Password must be at least 8 characters."
    );
    expect(validatePassword("x".repeat(201))).toBe("Password is too long.");
    expect(validatePassword("longenough")).toBeNull();
    expect(validatePassword("x".repeat(200))).toBeNull();
  });

  it("hashes and verifies", async () => {
    const hash = await hashPassword("password123");
    expect(hash).not.toBe("password123");
    expect(await verifyPassword("password123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
