import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeEmail,
  pickCanonicalEmailSurvivor,
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

  it("picks the password-bearing row as the canonical survivor", () => {
    expect(
      pickCanonicalEmailSurvivor([
        { id: "u-aaa", email: "A@x.com", passwordHash: null },
        { id: "u-zzz", email: "a@x.com", passwordHash: "hash" },
      ]).id
    ).toBe("u-zzz");
  });

  it("breaks ties among password-bearing rows by smallest id", () => {
    expect(
      pickCanonicalEmailSurvivor([
        { id: "u-b", email: "B@x.com", passwordHash: "h1" },
        { id: "u-a", email: "b@x.com", passwordHash: "h2" },
        { id: "u-c", email: "B@X.com", passwordHash: null },
      ]).id
    ).toBe("u-a");
  });

  it("falls back to smallest id when no row has a password", () => {
    expect(
      pickCanonicalEmailSurvivor([
        { id: "u-z", email: "Z@x.com", passwordHash: null },
        { id: "u-m", email: "z@x.com", passwordHash: null },
      ]).id
    ).toBe("u-m");
  });
});
