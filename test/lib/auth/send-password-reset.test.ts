import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete process.env.AUTH_RESEND_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("logs the reset link locally when Resend is unset", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { sendPasswordResetEmail } = await import(
      "@/lib/auth/send-password-reset"
    );

    await sendPasswordResetEmail({
      email: "cook@example.com",
      url: "http://127.0.0.1:43127/reset-password?token=abc&email=cook%40example.com",
    });

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("[auth] Password reset link for cook@example.com")
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("/reset-password?token=abc")
    );
  });

  it("posts to Resend when AUTH_RESEND_KEY is set", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Gregg's Recipes <hello@greggsrecipes.com>");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { sendPasswordResetEmail } = await import(
      "@/lib/auth/send-password-reset"
    );
    await sendPasswordResetEmail({
      email: "cook@example.com",
      url: "https://greggsrecipes.com/reset-password?token=tok&email=cook%40example.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Content-Type": "application/json",
        }),
      })
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body
    ) as {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(body.from).toBe("Gregg's Recipes <hello@greggsrecipes.com>");
    expect(body.to).toBe("cook@example.com");
    expect(body.subject).toBe("Reset your Gregg's Recipes password");
    expect(body.html).toContain("Gregg's Recipes");
    expect(body.html).toContain("token=tok");
    expect(body.text).toContain("token=tok");
  });

  it("throws when Resend returns a non-OK response", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_alt_key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "boom",
      })
    );

    const { sendPasswordResetEmail } = await import(
      "@/lib/auth/send-password-reset"
    );
    await expect(
      sendPasswordResetEmail({
        email: "cook@example.com",
        url: "https://example.com/reset",
      })
    ).rejects.toThrow(/Resend failed: 500 boom/);
  });
});
