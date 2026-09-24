import { describe, expect, it } from "vitest";
import {
  isPasswordSessionStale,
  passwordStampFromUser,
} from "@/lib/auth/password-session";

describe("password-session stamps", () => {
  it("maps null/undefined passwordUpdatedAt to stamp 0", () => {
    expect(passwordStampFromUser(null)).toBe(0);
    expect(passwordStampFromUser(undefined)).toBe(0);
  });

  it("maps a Date to its millisecond timestamp", () => {
    const at = new Date("2026-09-24T18:00:00.000Z");
    expect(passwordStampFromUser(at)).toBe(at.getTime());
  });

  it("treats equal stamps as still valid (new login after reset)", () => {
    const at = new Date("2026-09-24T18:00:00.000Z");
    expect(isPasswordSessionStale(at.getTime(), at)).toBe(false);
  });

  it("rejects JWTs stamped before a password reset", () => {
    const loginAt = new Date("2026-09-24T17:00:00.000Z");
    const resetAt = new Date("2026-09-24T18:00:00.000Z");
    expect(isPasswordSessionStale(loginAt.getTime(), resetAt)).toBe(true);
  });

  it("keeps JWTs valid when the password has never been stamped", () => {
    expect(isPasswordSessionStale(0, null)).toBe(false);
    expect(isPasswordSessionStale(undefined, null)).toBe(false);
    expect(isPasswordSessionStale(1_700_000_000_000, null)).toBe(false);
  });

  it("rejects a pre-reset JWT (pwdAt 0) once passwordUpdatedAt is set", () => {
    const resetAt = new Date("2026-09-24T18:00:00.000Z");
    expect(isPasswordSessionStale(0, resetAt)).toBe(true);
    expect(isPasswordSessionStale(undefined, resetAt)).toBe(true);
  });
});
