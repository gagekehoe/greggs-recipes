import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const isDatabaseConfigured = vi.fn();
const select = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...a: unknown[]) => getSessionUser(...a),
}));

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: (...a: unknown[]) => isDatabaseConfigured(...a),
  db: {
    select: (...a: unknown[]) => select(...a),
  },
  users: {
    id: "id",
    name: "name",
    email: "email",
    role: "role",
  },
}));

describe("GET /api/users/directory", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionUser.mockReset();
    isDatabaseConfigured.mockReset();
    select.mockReset();
    isDatabaseConfigured.mockReturnValue(true);
  });

  it("allows cooks to list people for share pickers", async () => {
    getSessionUser.mockResolvedValue({
      id: "c1",
      role: "cook",
      email: "cook@example.com",
      name: "Cook",
    });
    const orderBy = vi.fn().mockResolvedValue([
      {
        id: "u2",
        name: "Mom",
        email: "mom@example.com",
        role: "viewer",
      },
    ]);
    const from = vi.fn().mockReturnValue({ orderBy });
    select.mockReturnValue({ from });

    const { GET } = await import("@/app/api/users/directory/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toEqual([
      {
        id: "u2",
        name: "Mom",
        email: "mom@example.com",
        role: "viewer",
      },
    ]);
  });

  it("rejects viewers", async () => {
    getSessionUser.mockResolvedValue({
      id: "v1",
      role: "viewer",
      email: "v@example.com",
      name: "Viewer",
    });
    const { GET } = await import("@/app/api/users/directory/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
