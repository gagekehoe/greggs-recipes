import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

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

describe("ensureOwnerRole", () => {
  beforeEach(async () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    const mod = (await import("@/lib/db")) as unknown as {
      __testSqlite: { exec: (sql: string) => void };
    };
    mod.__testSqlite.exec(`DELETE FROM user;`);
  });

  it("does not promote ADMIN_EMAIL without emailVerified", async () => {
    const { db, users } = await import("@/lib/db");
    const { ensureOwnerRole } = await import("@/lib/auth/owner-bootstrap");

    await db.insert(users).values({
      id: "u1",
      email: "owner@example.com",
      role: "viewer",
      emailVerified: null,
    });

    await ensureOwnerRole("u1", "owner@example.com");

    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, "u1"))
      .limit(1);
    expect(rows[0]?.role).toBe("viewer");
  });

  it("promotes verified ADMIN_EMAIL to owner", async () => {
    const { db, users } = await import("@/lib/db");
    const { ensureOwnerRole } = await import("@/lib/auth/owner-bootstrap");

    await db.insert(users).values({
      id: "u1",
      email: "owner@example.com",
      role: "viewer",
      emailVerified: new Date(),
    });

    await ensureOwnerRole("u1", "owner@example.com");

    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, "u1"))
      .limit(1);
    expect(rows[0]?.role).toBe("owner");
  });

  it("ignores non-admin emails even when verified", async () => {
    const { db, users } = await import("@/lib/db");
    const { ensureOwnerRole } = await import("@/lib/auth/owner-bootstrap");

    await db.insert(users).values({
      id: "u2",
      email: "cook@example.com",
      role: "cook",
      emailVerified: new Date(),
    });

    await ensureOwnerRole("u2", "cook@example.com");

    const rows = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, "u2"))
      .limit(1);
    expect(rows[0]?.role).toBe("cook");
  });
});
