import { beforeEach, describe, expect, it, vi } from "vitest";

const sendPasswordResetEmail = vi.fn();

vi.mock("@/lib/auth/send-password-reset", () => ({
  sendPasswordResetEmail: (...a: unknown[]) => sendPasswordResetEmail(...a),
}));

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../helpers/test-db");
  const testDb = createTestDb();
  return {
    db: testDb.db,
    schema: testDb.schema,
    users: testDb.schema.users,
    verificationTokens: testDb.schema.verificationTokens,
    isDatabaseConfigured: () => true,
    getDbDialect: () => "sqlite" as const,
    __testSqlite: testDb.sqlite,
  };
});

/**
 * End-to-end auth path using in-memory SQLite + mocked email:
 * register → login → forgot → reset → login with new password.
 */
describe("auth password flow (integration)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.AUTH_RESEND_KEY;
    delete process.env.RESEND_API_KEY;
    process.env.AUTH_URL = "http://127.0.0.1:43127";
    process.env.ADMIN_EMAIL = "owner@example.com";
    const mod = (await import("@/lib/db")) as unknown as {
      __testSqlite: { exec: (sql: string) => void };
    };
    mod.__testSqlite.exec(`DELETE FROM verificationToken; DELETE FROM user;`);
  });

  it("registers, signs in, resets password, then signs in with the new password", async () => {
    const { POST: register } = await import("@/app/api/auth/register/route");
    const { POST: forgot } = await import(
      "@/app/api/auth/forgot-password/route"
    );
    const { POST: reset } = await import("@/app/api/auth/reset-password/route");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");

    const registerRes = await register(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "cook@example.com",
          password: "first-pass-1",
        }),
      })
    );
    expect(registerRes.status).toBe(200);

    await expect(
      authorizeCredentials({
        email: "cook@example.com",
        password: "first-pass-1",
      })
    ).resolves.toMatchObject({ email: "cook@example.com" });

    await expect(
      authorizeCredentials({
        email: "cook@example.com",
        password: "wrong",
      })
    ).resolves.toBeNull();

    const forgotRes = await forgot(
      new Request("http://x/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "cook@example.com" }),
      })
    );
    expect(forgotRes.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const rawToken = new URL(
      (sendPasswordResetEmail.mock.calls[0][0] as { url: string }).url
    ).searchParams.get("token")!;

    const resetRes = await reset(
      new Request("http://x/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "cook@example.com",
          token: rawToken,
          password: "second-pass-2",
        }),
      })
    );
    expect(resetRes.status).toBe(200);

    await expect(
      authorizeCredentials({
        email: "cook@example.com",
        password: "first-pass-1",
      })
    ).resolves.toBeNull();

    await expect(
      authorizeCredentials({
        email: "cook@example.com",
        password: "second-pass-2",
      })
    ).resolves.toMatchObject({ email: "cook@example.com" });

    // Token is one-shot
    const reuse = await reset(
      new Request("http://x/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "cook@example.com",
          token: rawToken,
          password: "third-pass-3",
        }),
      })
    );
    expect(reuse.status).toBe(400);

    // Duplicate register rejected
    const dup = await register(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "cook@example.com",
          password: "another-pass",
        }),
      })
    );
    expect(dup.status).toBe(409);

    // Unknown email still gets generic forgot success
    const unknown = await forgot(
      new Request("http://x/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "nobody@example.com" }),
      })
    );
    expect(unknown.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });
});
