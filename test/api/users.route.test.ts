import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const selectAll = vi.fn();
const selectLimit = vi.fn();
const updateReturning = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));

vi.mock("@/lib/db", async () => {
  const schema = await import("@/lib/db/schema");
  return {
    isDatabaseConfigured: () => true,
    users: schema.users,
    db: {
      select: () => ({
        from: () => ({
          orderBy: (...a: unknown[]) => selectAll(...a),
          where: () => ({
            limit: (...a: unknown[]) => selectLimit(...a),
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: (...a: unknown[]) => updateReturning(...a),
          }),
        }),
      }),
    },
  };
});

describe("/api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires owner/admin for GET/PATCH", async () => {
    const { GET, PATCH } = await import("@/app/api/users/route");
    getSessionUser.mockResolvedValue({ id: "u1", role: "cook" });
    expect((await GET()).status).toBe(401);
    expect(
      (
        await PATCH(
          new Request("http://x/api/users", {
            method: "PATCH",
            body: "{}",
          })
        )
      ).status
    ).toBe(401);
  });

  it("lists users and updates roles with owner assignment guards", async () => {
    const { GET, PATCH } = await import("@/app/api/users/route");
    getSessionUser.mockResolvedValue({ id: "owner", role: "owner" });
    selectAll.mockResolvedValue([
      { id: "owner", email: "a@x.com", role: "owner", name: "A", image: null },
      { id: "u2", email: "b@x.com", role: "weird", name: "B", image: null },
    ]);
    const listed = await GET();
    expect(listed.status).toBe(200);
    const body = await listed.json();
    expect(body.users[1].role).toBe("viewer");

    const invalid = await PATCH(
      new Request("http://x/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "u2" }),
      })
    );
    expect(invalid.status).toBe(400);

    selectLimit.mockResolvedValue([{ id: "owner", role: "owner" }]);
    const demoteSelf = await PATCH(
      new Request("http://x/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "owner", role: "viewer" }),
      })
    );
    expect(demoteSelf.status).toBe(400);

    selectLimit.mockResolvedValue([]);
    const missing = await PATCH(
      new Request("http://x/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "ghost", role: "cook" }),
      })
    );
    expect(missing.status).toBe(404);

    selectLimit.mockResolvedValue([{ id: "u2", role: "viewer" }]);
    updateReturning.mockResolvedValue([
      { id: "u2", email: "b@x.com", role: "cook", name: "B" },
    ]);
    const ok = await PATCH(
      new Request("http://x/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "u2", role: "cook" }),
      })
    );
    expect(ok.status).toBe(200);

    getSessionUser.mockResolvedValue({ id: "staff", role: "admin" });
    selectLimit.mockResolvedValue([{ id: "u2", role: "cook" }]);
    const forbiddenOwner = await PATCH(
      new Request("http://x/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "u2", role: "owner" }),
      })
    );
    expect(forbiddenOwner.status).toBe(403);
  });
});
