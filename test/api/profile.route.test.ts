import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
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

describe("/api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET requires auth and returns profile", async () => {
    const { GET } = await import("@/app/api/profile/route");
    getSessionUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    selectLimit.mockResolvedValue([]);
    expect((await GET()).status).toBe(404);

    selectLimit.mockResolvedValue([
      {
        id: "u1",
        name: "Maya",
        email: "m@example.com",
        role: "viewer",
        image: null,
      },
    ]);
    const ok = await GET();
    expect(ok.status).toBe(200);
    expect((await ok.json()).user.needsSetup).toBe(false);
  });

  it("PATCH validates and updates name", async () => {
    const { PATCH } = await import("@/app/api/profile/route");
    getSessionUser.mockResolvedValue(null);
    expect(
      (
        await PATCH(
          new Request("http://x/api/profile", {
            method: "PATCH",
            body: "{}",
          })
        )
      ).status
    ).toBe(401);

    getSessionUser.mockResolvedValue({ id: "u1", role: "viewer" });
    const invalid = await PATCH(
      new Request("http://x/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "A" }),
      })
    );
    expect(invalid.status).toBe(400);

    updateReturning.mockResolvedValue([
      {
        id: "u1",
        name: "Maya",
        email: "m@example.com",
        role: "viewer",
        image: null,
      },
    ]);
    const ok = await PATCH(
      new Request("http://x/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "  Maya  " }),
      })
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).user.name).toBe("Maya");
  });
});
