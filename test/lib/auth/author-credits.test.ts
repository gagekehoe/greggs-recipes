import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("author credits", () => {
  beforeEach(async () => {
    const mod = (await import("@/lib/db")) as unknown as {
      __testSqlite: { exec: (sql: string) => void };
    };
    mod.__testSqlite.exec(`DELETE FROM user;`);
  });

  it("maps owner, admin, and cook roles to privilege badges", async () => {
    const { db } = await import("@/lib/db");
    const { users } = await import("@/lib/db/schema");
    await db.insert(users).values([
      {
        id: "u-owner",
        email: "owner@example.com",
        name: "Gage",
        role: "owner",
      },
      {
        id: "u-admin",
        email: "staff@example.com",
        name: "Pat",
        role: "admin",
      },
      {
        id: "u-cook",
        email: "mom@example.com",
        name: "Mom",
        role: "cook",
      },
      {
        id: "u-viewer",
        email: "v@example.com",
        name: "Sam",
        role: "viewer",
      },
    ]);

    const {
      getAuthorPrivilegesByUserIds,
      resolveRecipeAuthorCredit,
    } = await import("@/lib/auth/author-credits");

    const privileges = await getAuthorPrivilegesByUserIds([
      "u-owner",
      "u-admin",
      "u-cook",
      "u-viewer",
      "admin",
    ]);
    expect(privileges["u-owner"]).toBe("owner");
    expect(privileges["u-admin"]).toBe("admin");
    expect(privileges["u-cook"]).toBe("authorized_cook");
    expect(privileges["u-viewer"]).toBe(null);
    expect(privileges.admin).toBe("owner");

    expect(
      resolveRecipeAuthorCredit(
        { authorId: "u-owner", authorName: "Gage" },
        privileges
      )
    ).toEqual({ label: "Gregg", privilege: "owner" });
    expect(
      resolveRecipeAuthorCredit(
        { authorId: "u-admin", authorName: "Pat" },
        privileges
      )
    ).toEqual({ label: "Pat", privilege: "admin" });
    expect(
      resolveRecipeAuthorCredit(
        { authorId: "u-cook", authorName: "Mom" },
        privileges
      )
    ).toEqual({ label: "Mom", privilege: "authorized_cook" });
  });

  it("treats seed kitchen author ids as Owner when no user row exists", async () => {
    const { resolveRecipeAuthorCredit } = await import(
      "@/lib/auth/author-credits"
    );
    expect(
      resolveRecipeAuthorCredit(
        { authorId: "system", authorName: "Gregg" },
        {}
      )
    ).toEqual({ label: "Gregg", privilege: "owner" });
  });
});
