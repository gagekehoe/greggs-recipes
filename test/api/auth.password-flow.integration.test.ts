import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

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
    sessions: testDb.schema.sessions,
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
    mod.__testSqlite.exec(
      `DELETE FROM verificationToken; DELETE FROM session; DELETE FROM user;`
    );
  });

  it("registers, signs in, resets password, then signs in with the new password", async () => {
    const { POST: register } = await import("@/app/api/auth/register/route");
    const { POST: forgot } = await import(
      "@/app/api/auth/forgot-password/route"
    );
    const { POST: reset } = await import("@/app/api/auth/reset-password/route");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    const { db, users } = await import("@/lib/db");
    const { isPasswordSessionStale, passwordStampFromUser } = await import(
      "@/lib/auth/password-session"
    );

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

    const beforeReset = await authorizeCredentials({
      email: "cook@example.com",
      password: "first-pass-1",
    });
    expect(beforeReset?.passwordUpdatedAt).toBeTruthy();
    const attackerJwtPwdAt = passwordStampFromUser(
      beforeReset!.passwordUpdatedAt
    );

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

    const afterResetRows = await db
      .select({ passwordUpdatedAt: users.passwordUpdatedAt })
      .from(users)
      .where(eq(users.email, "cook@example.com"))
      .limit(1);
    expect(afterResetRows[0]?.passwordUpdatedAt).toBeTruthy();
    expect(
      isPasswordSessionStale(
        attackerJwtPwdAt,
        afterResetRows[0]!.passwordUpdatedAt
      )
    ).toBe(true);

    await expect(
      authorizeCredentials({
        email: "cook@example.com",
        password: "first-pass-1",
      })
    ).resolves.toBeNull();

    const freshLogin = await authorizeCredentials({
      email: "cook@example.com",
      password: "second-pass-2",
    });
    expect(freshLogin).toMatchObject({ email: "cook@example.com" });
    expect(
      isPasswordSessionStale(
        passwordStampFromUser(freshLogin!.passwordUpdatedAt),
        afterResetRows[0]!.passwordUpdatedAt
      )
    ).toBe(false);

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
  });

  it("does not let register take over a passwordless legacy account", async () => {
    const { db, users } = await import("@/lib/db");
    const { POST: register } = await import("@/app/api/auth/register/route");
    const { POST: forgot } = await import(
      "@/app/api/auth/forgot-password/route"
    );
    const { POST: reset } = await import("@/app/api/auth/reset-password/route");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");

    await db.insert(users).values({
      id: "u-legacy",
      email: "legacy@example.com",
      name: "Legacy Cook",
      role: "cook",
      passwordHash: null,
    });

    const takeover = await register(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "legacy@example.com",
          password: "attacker-pass",
        }),
      })
    );
    expect(takeover.status).toBe(409);
    await expect(
      authorizeCredentials({
        email: "legacy@example.com",
        password: "attacker-pass",
      })
    ).resolves.toBeNull();

    const forgotRes = await forgot(
      new Request("http://x/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "legacy@example.com" }),
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
          email: "legacy@example.com",
          token: rawToken,
          password: "owner-pass-9",
        }),
      })
    );
    expect(resetRes.status).toBe(200);

    await expect(
      authorizeCredentials({
        email: "legacy@example.com",
        password: "owner-pass-9",
      })
    ).resolves.toMatchObject({ email: "legacy@example.com", role: "cook" });

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

  it("registers ADMIN_EMAIL as viewer until reset proves the inbox", async () => {
    const { db, users } = await import("@/lib/db");
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
          email: "owner@example.com",
          password: "first-pass-1",
        }),
      })
    );
    expect(registerRes.status).toBe(200);

    const rows = await db
      .select({
        role: users.role,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, "owner@example.com"))
      .limit(1);
    expect(rows[0]).toMatchObject({
      role: "viewer",
      emailVerified: null,
    });

    await expect(
      authorizeCredentials({
        email: "owner@example.com",
        password: "first-pass-1",
      })
    ).resolves.toMatchObject({ role: "viewer" });

    const forgotRes = await forgot(
      new Request("http://x/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "owner@example.com" }),
      })
    );
    expect(forgotRes.status).toBe(200);
    const rawToken = new URL(
      (sendPasswordResetEmail.mock.calls[0][0] as { url: string }).url
    ).searchParams.get("token")!;

    const resetRes = await reset(
      new Request("http://x/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          token: rawToken,
          password: "verified-pass-2",
        }),
      })
    );
    expect(resetRes.status).toBe(200);

    const after = await db
      .select({
        role: users.role,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, "owner@example.com"))
      .limit(1);
    expect(after[0]?.emailVerified).toBeTruthy();
    expect(after[0]?.role).toBe("owner");

    await expect(
      authorizeCredentials({
        email: "owner@example.com",
        password: "verified-pass-2",
      })
    ).resolves.toMatchObject({ role: "owner" });
  });

  it("invalidates prior JWT stamps and deletes adapter sessions on reset", async () => {
    const { db, users, sessions } = await import("@/lib/db");
    const { POST: register } = await import("@/app/api/auth/register/route");
    const { POST: forgot } = await import(
      "@/app/api/auth/forgot-password/route"
    );
    const { POST: reset } = await import("@/app/api/auth/reset-password/route");
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    const { isPasswordSessionStale, passwordStampFromUser } = await import(
      "@/lib/auth/password-session"
    );

    await register(
      new Request("http://x/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "victim@example.com",
          password: "attacker-pass-1",
        }),
      })
    );

    const attackerSession = await authorizeCredentials({
      email: "victim@example.com",
      password: "attacker-pass-1",
    });
    expect(attackerSession).toBeTruthy();
    const oldPwdAt = passwordStampFromUser(attackerSession!.passwordUpdatedAt);

    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "victim@example.com"))
      .limit(1);
    const userId = userRows[0]!.id;

    await db.insert(sessions).values({
      sessionToken: "adapter-session-before-reset",
      userId,
      expires: new Date(Date.now() + 86_400_000),
    });

    await forgot(
      new Request("http://x/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "victim@example.com" }),
      })
    );
    const rawToken = new URL(
      (sendPasswordResetEmail.mock.calls[0][0] as { url: string }).url
    ).searchParams.get("token")!;

    const resetRes = await reset(
      new Request("http://x/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "victim@example.com",
          token: rawToken,
          password: "victim-new-pass-9",
        }),
      })
    );
    expect(resetRes.status).toBe(200);

    const after = await db
      .select({ passwordUpdatedAt: users.passwordUpdatedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    expect(after[0]?.passwordUpdatedAt).toBeTruthy();
    expect(isPasswordSessionStale(oldPwdAt, after[0]!.passwordUpdatedAt)).toBe(
      true
    );

    expect(await db.select().from(sessions)).toHaveLength(0);

    await expect(
      authorizeCredentials({
        email: "victim@example.com",
        password: "attacker-pass-1",
      })
    ).resolves.toBeNull();

    const victimLogin = await authorizeCredentials({
      email: "victim@example.com",
      password: "victim-new-pass-9",
    });
    expect(victimLogin).toMatchObject({ email: "victim@example.com" });
    expect(
      isPasswordSessionStale(
        passwordStampFromUser(victimLogin!.passwordUpdatedAt),
        after[0]!.passwordUpdatedAt
      )
    ).toBe(false);
  });
});
