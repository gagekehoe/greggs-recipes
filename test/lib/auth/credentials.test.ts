import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/auth/password";

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../../helpers/test-db");
  const testDb = createTestDb();
  return {
    db: testDb.db,
    schema: testDb.schema,
    users: testDb.schema.users,
    isDatabaseConfigured: () => true,
    getDbDialect: () => "sqlite" as const,
    __testSqlite: testDb.sqlite,
  };
});

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    process.env.ADMIN_EMAIL = "owner@example.com";
    const mod = (await import("@/lib/db")) as unknown as {
      __testSqlite: { exec: (sql: string) => void };
    };
    mod.__testSqlite.exec(`DELETE FROM user;`);
  });

  it("returns the user for correct credentials", async () => {
    const { db, users } = await import("@/lib/db");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    const passwordHash = await hashPassword("password123");

    await db.insert(users).values({
      id: "u1",
      email: "cook@example.com",
      name: "Cook",
      role: "cook",
      passwordHash,
    });

    await expect(
      authorizeCredentials({
        email: "  Cook@Example.COM ",
        password: "password123",
      })
    ).resolves.toMatchObject({
      id: "u1",
      email: "cook@example.com",
      name: "Cook",
      role: "cook",
    });
  });

  it("returns null for wrong password and unknown email (safe failure)", async () => {
    const { db, users } = await import("@/lib/db");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    const passwordHash = await hashPassword("password123");

    await db.insert(users).values({
      id: "u1",
      email: "cook@example.com",
      name: "Cook",
      role: "viewer",
      passwordHash,
    });

    await expect(
      authorizeCredentials({
        email: "cook@example.com",
        password: "wrong-password",
      })
    ).resolves.toBeNull();

    await expect(
      authorizeCredentials({
        email: "nobody@example.com",
        password: "password123",
      })
    ).resolves.toBeNull();
  });

  it("returns null for legacy accounts without a password hash", async () => {
    const { db, users } = await import("@/lib/db");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");

    await db.insert(users).values({
      id: "u-legacy",
      email: "legacy@example.com",
      name: "Legacy",
      role: "viewer",
      passwordHash: null,
    });

    await expect(
      authorizeCredentials({
        email: "legacy@example.com",
        password: "password123",
      })
    ).resolves.toBeNull();
  });

  it("returns null when email or password is missing", async () => {
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    await expect(
      authorizeCredentials({ email: "cook@example.com", password: "" })
    ).resolves.toBeNull();
    await expect(
      authorizeCredentials({ email: "", password: "password123" })
    ).resolves.toBeNull();
    await expect(authorizeCredentials(undefined)).resolves.toBeNull();
  });

  it("promotes the bootstrap admin email to owner on success", async () => {
    const { db, users } = await import("@/lib/db");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    const passwordHash = await hashPassword("password123");

    await db.insert(users).values({
      id: "u-owner",
      email: "owner@example.com",
      name: "Gage",
      role: "viewer",
      passwordHash,
    });

    await expect(
      authorizeCredentials({
        email: "owner@example.com",
        password: "password123",
      })
    ).resolves.toMatchObject({
      id: "u-owner",
      role: "owner",
    });
  });
});
