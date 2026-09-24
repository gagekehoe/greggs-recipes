import { beforeEach, describe, expect, it, vi } from "vitest";

const selectLimit = vi.fn();
const insertValues = vi.fn();
const updateSet = vi.fn();
const migrateBootstrapAdminToOwner = vi.fn();
let databaseConfigured = true;

vi.mock("@/lib/auth/owner-bootstrap", () => ({
  migrateBootstrapAdminToOwner: (...a: unknown[]) =>
    migrateBootstrapAdminToOwner(...a),
}));

vi.mock("@/lib/db", async () => {
  const schema = await import("@/lib/db/schema");
  return {
    isDatabaseConfigured: () => databaseConfigured,
    users: schema.users,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: (...a: unknown[]) => selectLimit(...a),
          }),
        }),
      }),
      insert: () => ({
        values: (...a: unknown[]) => insertValues(...a),
      }),
      update: () => ({
        set: (values: unknown) => {
          updateSet(values);
          return {
            where: () => Promise.resolve(),
          };
        },
      }),
    },
  };
});

function post(body: unknown) {
  return new Request("http://x/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseConfigured = true;
    process.env.ADMIN_EMAIL = "owner@example.com";
    insertValues.mockResolvedValue(undefined);
    updateSet.mockClear();
  });

  it("returns 503 when the database is unavailable", async () => {
    databaseConfigured = false;
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(post({ email: "a@b.co", password: "password123" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "Sign-up is temporarily unavailable.",
    });
  });

  it("rejects invalid JSON and weak passwords", async () => {
    const { POST } = await import("@/app/api/auth/register/route");

    expect((await POST(new Request("http://x/api/auth/register", {
      method: "POST",
      body: "{",
    }))).status).toBe(400);

    const zodFail = await POST(post({ email: "not-an-email", password: "short" }));
    expect(zodFail.status).toBe(400);
    expect((await zodFail.json()).error).toMatch(/valid email/i);

    selectLimit.mockResolvedValue([]);
    const short = await POST(
      post({ email: "cook@example.com", password: "short" })
    );
    // zod min(8) catches before validatePassword when password is "short"
    expect(short.status).toBe(400);

    const tooLong = await POST(
      post({ email: "cook@example.com", password: "x".repeat(201) })
    );
    expect(tooLong.status).toBe(400);
  });

  it("creates a new account for a valid signup", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    selectLimit.mockResolvedValue([]);

    const res = await POST(
      post({ email: "new@example.com", password: "password123" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(migrateBootstrapAdminToOwner).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        role: "viewer",
        passwordHash: expect.any(String),
        passwordUpdatedAt: expect.any(Date),
      })
    );
    const inserted = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.emailVerified).toBeUndefined();
  });

  it("rejects a duplicate email that already has a password", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    selectLimit.mockResolvedValue([
      { id: "u1", passwordHash: "$2a$12$alreadyhashed" },
    ]);

    const res = await POST(
      post({ email: "cook@example.com", password: "password123" })
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "That email already has an account. Sign in instead.",
    });
    expect(insertValues).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("rejects a legacy magic-link account instead of attaching a password", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    selectLimit.mockResolvedValue([{ id: "u-legacy", passwordHash: null }]);

    const res = await POST(
      post({ email: "legacy@example.com", password: "password123" })
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "That email already has an account. Sign in instead.",
    });
    expect(insertValues).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("registers ADMIN_EMAIL as viewer without emailVerified or Owner", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    selectLimit.mockResolvedValue([]);

    const res = await POST(
      post({ email: "owner@example.com", password: "password123" })
    );
    expect(res.status).toBe(200);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@example.com",
        role: "viewer",
        passwordHash: expect.any(String),
      })
    );
    const inserted = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.emailVerified).toBeUndefined();
    expect(inserted.role).not.toBe("owner");
  });
});
