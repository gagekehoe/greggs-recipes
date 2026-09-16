import { beforeEach, describe, expect, it, vi } from "vitest";

const selectLimit = vi.fn();
const updateSet = vi.fn();
const consumePasswordResetToken = vi.fn();
let databaseConfigured = true;

vi.mock("@/lib/auth/password-reset", () => ({
  consumePasswordResetToken: (...a: unknown[]) =>
    consumePasswordResetToken(...a),
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
  return new Request("http://x/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseConfigured = true;
    consumePasswordResetToken.mockResolvedValue(true);
    selectLimit.mockResolvedValue([{ id: "u1" }]);
  });

  it("returns 503 when the database is unavailable", async () => {
    databaseConfigured = false;
    const { POST } = await import("@/app/api/auth/reset-password/route");
    const res = await POST(
      post({
        email: "cook@example.com",
        token: "tok",
        password: "password123",
      })
    );
    expect(res.status).toBe(503);
  });

  it("rejects invalid payloads and weak passwords", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");

    expect(
      (
        await POST(
          new Request("http://x/api/auth/reset-password", {
            method: "POST",
            body: "{",
          })
        )
      ).status
    ).toBe(400);

    const missingToken = await POST(
      post({ email: "cook@example.com", token: "", password: "password123" })
    );
    expect(missingToken.status).toBe(400);

    const tooLong = await POST(
      post({
        email: "cook@example.com",
        token: "tok",
        password: "x".repeat(201),
      })
    );
    expect(tooLong.status).toBe(400);
  });

  it("rejects invalid or expired tokens", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    consumePasswordResetToken.mockResolvedValue(false);

    const res = await POST(
      post({
        email: "cook@example.com",
        token: "bad-or-expired",
        password: "password123",
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error:
        "This reset link is invalid or expired. Request a new one from Forgot password.",
    });
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("returns 404 when the token is valid but the user is gone", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    consumePasswordResetToken.mockResolvedValue(true);
    selectLimit.mockResolvedValue([]);

    const res = await POST(
      post({
        email: "ghost@example.com",
        token: "tok",
        password: "password123",
      })
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "No account found for that email.",
    });
  });

  it("sets a new password with a valid token", async () => {
    const { POST } = await import("@/app/api/auth/reset-password/route");
    consumePasswordResetToken.mockResolvedValue(true);
    selectLimit.mockResolvedValue([{ id: "u1" }]);

    const res = await POST(
      post({
        email: "Cook@Example.COM",
        token: "good-token",
        password: "new-password-99",
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(consumePasswordResetToken).toHaveBeenCalledWith(
      "cook@example.com",
      "good-token"
    );
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: expect.any(String),
        emailVerified: expect.any(Date),
      })
    );
  });
});
