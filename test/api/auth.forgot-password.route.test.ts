import { beforeEach, describe, expect, it, vi } from "vitest";

const selectLimit = vi.fn();
const issuePasswordReset = vi.fn();
let databaseConfigured = true;

vi.mock("@/lib/auth/password-reset", () => ({
  issuePasswordReset: (...a: unknown[]) => issuePasswordReset(...a),
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
    },
  };
});

function post(body: unknown) {
  return new Request("http://x/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const GENERIC_MESSAGE =
  "If that email is on Gregg's Recipes, you'll get a reset link shortly.";

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    databaseConfigured = true;
    issuePasswordReset.mockResolvedValue(undefined);
  });

  it("returns 503 when the database is unavailable", async () => {
    databaseConfigured = false;
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(post({ email: "cook@example.com" }));
    expect(res.status).toBe(503);
  });

  it("rejects invalid requests", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    expect(
      (
        await POST(
          new Request("http://x/api/auth/forgot-password", {
            method: "POST",
            body: "{",
          })
        )
      ).status
    ).toBe(400);

    const badEmail = await POST(post({ email: "nope" }));
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).error).toMatch(/valid email/i);
  });

  it("returns a generic success for unknown email without issuing a reset", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    selectLimit.mockResolvedValue([]);

    const res = await POST(post({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      message: GENERIC_MESSAGE,
    });
    expect(issuePasswordReset).not.toHaveBeenCalled();
  });

  it("issues a reset for a known email and keeps the same success message", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    selectLimit.mockResolvedValue([{ id: "u1" }]);

    const res = await POST(post({ email: "Cook@Example.COM" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      message: GENERIC_MESSAGE,
    });
    expect(issuePasswordReset).toHaveBeenCalledWith("cook@example.com");
  });

  it("returns 502 when sending the reset email fails", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    selectLimit.mockResolvedValue([{ id: "u1" }]);
    issuePasswordReset.mockRejectedValue(new Error("Resend failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(post({ email: "cook@example.com" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Could not send the reset email. Try again shortly.",
    });
  });
});
