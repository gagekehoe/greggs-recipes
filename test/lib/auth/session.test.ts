import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const selectLimitMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: (...args: unknown[]) => selectLimitMock(...args),
        }),
      }),
    }),
  },
}));

describe("getSessionUser / getUserDisplayName", () => {
  beforeEach(() => {
    authMock.mockReset();
    selectLimitMock.mockReset();
  });

  it("returns null when auth has no user id", async () => {
    authMock.mockResolvedValue(null);
    const { getSessionUser } = await import("@/lib/auth/session");
    expect(await getSessionUser()).toBeNull();

    authMock.mockResolvedValue({ user: { email: "a@b.com" } });
    expect(await getSessionUser()).toBeNull();
  });

  it("maps session user fields with viewer default role", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "Ada", role: undefined },
    });
    const { getSessionUser } = await import("@/lib/auth/session");
    expect(await getSessionUser()).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "Ada",
      role: "viewer",
    });
  });

  it("preserves an explicit role from the session", async () => {
    authMock.mockResolvedValue({
      user: { id: "u2", email: "c@d.com", name: "Bo", role: "admin" },
    });
    const { getSessionUser } = await import("@/lib/auth/session");
    expect(await getSessionUser()).toMatchObject({ role: "admin" });
  });

  it("returns a trimmed display name when set in SQLite", async () => {
    selectLimitMock.mockResolvedValue([{ name: "  Maya  " }]);
    const { getUserDisplayName } = await import("@/lib/auth/session");
    expect(await getUserDisplayName("u1")).toBe("Maya");
  });

  it("returns null when display name is missing or too short", async () => {
    selectLimitMock.mockResolvedValue([{ name: "x" }]);
    const { getUserDisplayName } = await import("@/lib/auth/session");
    expect(await getUserDisplayName("u1")).toBeNull();

    selectLimitMock.mockResolvedValue([]);
    expect(await getUserDisplayName("missing")).toBeNull();
  });
});
