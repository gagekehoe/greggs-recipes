import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendPasswordResetEmail = vi.fn();

vi.mock("@/lib/auth/send-password-reset", () => ({
  sendPasswordResetEmail: (...a: unknown[]) => sendPasswordResetEmail(...a),
}));

vi.mock("@/lib/db", async () => {
  const { createTestDb } = await import("../../helpers/test-db");
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

async function clearAuthTables() {
  const mod = (await import("@/lib/db")) as unknown as {
    __testSqlite: { exec: (sql: string) => void };
  };
  mod.__testSqlite.exec(`DELETE FROM verificationToken; DELETE FROM user;`);
}

describe("password-reset tokens", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.AUTH_RESEND_KEY;
    delete process.env.RESEND_API_KEY;
    process.env.AUTH_URL = "http://127.0.0.1:43127";
    await clearAuthTables();
  });

  it("issues a hashed one-time token and emails a reset link", async () => {
    const { issuePasswordReset, consumePasswordResetToken } = await import(
      "@/lib/auth/password-reset"
    );
    const { db, verificationTokens } = await import("@/lib/db");

    await issuePasswordReset("  Cook@Example.COM ");

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const sent = sendPasswordResetEmail.mock.calls[0][0] as {
      email: string;
      url: string;
    };
    expect(sent.email).toBe("cook@example.com");
    expect(sent.url).toMatch(
      /^http:\/\/127\.0\.0\.1:43127\/reset-password\?token=.+&email=cook%40example\.com$/
    );

    const rawToken = new URL(sent.url).searchParams.get("token")!;
    expect(rawToken.length).toBeGreaterThan(20);

    const rows = await db.select().from(verificationTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0].identifier).toBe("password-reset:cook@example.com");
    expect(rows[0].token).not.toBe(rawToken);
    expect(rows[0].token).toBe(
      createHash("sha256").update(rawToken).digest("hex")
    );
    expect(rows[0].expires.getTime()).toBeGreaterThan(Date.now());

    expect(await consumePasswordResetToken("cook@example.com", rawToken)).toBe(
      true
    );
    expect(await db.select().from(verificationTokens)).toHaveLength(0);
    expect(await consumePasswordResetToken("cook@example.com", rawToken)).toBe(
      false
    );
  });

  it("replaces prior unused tokens for the same email", async () => {
    const { issuePasswordReset, consumePasswordResetToken } = await import(
      "@/lib/auth/password-reset"
    );
    const { db, verificationTokens } = await import("@/lib/db");

    await issuePasswordReset("cook@example.com");
    const firstToken = new URL(
      (sendPasswordResetEmail.mock.calls[0][0] as { url: string }).url
    ).searchParams.get("token")!;

    await issuePasswordReset("cook@example.com");
    const secondToken = new URL(
      (sendPasswordResetEmail.mock.calls[1][0] as { url: string }).url
    ).searchParams.get("token")!;

    expect(await db.select().from(verificationTokens)).toHaveLength(1);
    expect(await consumePasswordResetToken("cook@example.com", firstToken)).toBe(
      false
    );
    expect(
      await consumePasswordResetToken("cook@example.com", secondToken)
    ).toBe(true);
  });

  it("rejects invalid and expired tokens", async () => {
    const { issuePasswordReset, consumePasswordResetToken } = await import(
      "@/lib/auth/password-reset"
    );
    const { db, verificationTokens } = await import("@/lib/db");

    await issuePasswordReset("cook@example.com");
    const rawToken = new URL(
      (sendPasswordResetEmail.mock.calls[0][0] as { url: string }).url
    ).searchParams.get("token")!;

    expect(await consumePasswordResetToken("other@example.com", rawToken)).toBe(
      false
    );
    expect(await consumePasswordResetToken("cook@example.com", "nope")).toBe(
      false
    );

    await db
      .update(verificationTokens)
      .set({ expires: new Date(Date.now() - 60_000) })
      .where(
        eq(verificationTokens.identifier, "password-reset:cook@example.com")
      );

    expect(await consumePasswordResetToken("cook@example.com", rawToken)).toBe(
      false
    );
  });

  it("allows login with the new password after a full reset flow", async () => {
    const { users, db } = await import("@/lib/db");
    const { issuePasswordReset, consumePasswordResetToken } = await import(
      "@/lib/auth/password-reset"
    );
    const { authorizeCredentials } = await import("@/lib/auth/credentials");
    const { hashPassword, verifyPassword } = await import(
      "@/lib/auth/password"
    );

    const oldHash = await hashPassword("old-password");
    await db.insert(users).values({
      id: "u1",
      email: "cook@example.com",
      name: "Cook",
      role: "viewer",
      passwordHash: oldHash,
    });

    await issuePasswordReset("cook@example.com");
    const rawToken = new URL(
      (sendPasswordResetEmail.mock.calls[0][0] as { url: string }).url
    ).searchParams.get("token")!;

    expect(await consumePasswordResetToken("cook@example.com", rawToken)).toBe(
      true
    );
    const newHash = await hashPassword("new-password-99");
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.email, "cook@example.com"));

    expect(await verifyPassword("old-password", newHash)).toBe(false);
    expect(
      await authorizeCredentials({
        email: "cook@example.com",
        password: "old-password",
      })
    ).toBeNull();
    expect(
      await authorizeCredentials({
        email: "cook@example.com",
        password: "new-password-99",
      })
    ).toMatchObject({
      id: "u1",
      email: "cook@example.com",
    });
  });
});
