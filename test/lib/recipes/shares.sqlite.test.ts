import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../helpers/test-db";

describe("recipe_share table (sqlite)", () => {
  beforeEach(() => {
    // each test gets a fresh in-memory db via createTestDb
  });

  it("stores user and role grants with uniqueness", () => {
    const { sqlite } = createTestDb();
    sqlite
      .prepare(
        `INSERT INTO user (id, email, role) VALUES ('u1', 'a@example.com', 'cook'),
         ('u2', 'b@example.com', 'viewer')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO recipe (id, slug, title, authorId, authorName, createdAt, updatedAt)
         VALUES ('r1', 'soup', 'Soup', 'u1', 'Cook', 1, 1)`
      )
      .run();

    sqlite
      .prepare(
        `INSERT INTO recipe_share (id, recipeId, userId, role, createdAt)
         VALUES ('s1', 'r1', 'u2', NULL, 1)`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO recipe_share (id, recipeId, userId, role, createdAt)
         VALUES ('s2', 'r1', NULL, 'admin', 1)`
      )
      .run();

    const rows = sqlite
      .prepare(`SELECT id, userId, role FROM recipe_share ORDER BY id`)
      .all() as Array<{ id: string; userId: string | null; role: string | null }>;
    expect(rows).toEqual([
      { id: "s1", userId: "u2", role: null },
      { id: "s2", userId: null, role: "admin" },
    ]);

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO recipe_share (id, recipeId, userId, role, createdAt)
           VALUES ('s3', 'r1', 'u2', NULL, 1)`
        )
        .run()
    ).toThrow();
  });
});
