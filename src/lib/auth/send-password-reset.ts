/**
 * Send a password-reset (or first-time set-password) email via Resend.
 * Without AUTH_RESEND_KEY / RESEND_API_KEY, logs the link for local demos.
 */
export async function sendPasswordResetEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}): Promise<void> {
  const from =
    process.env.EMAIL_FROM || "Gregg's Recipes <onboarding@resend.dev>";
  const resendKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Reset your Gregg's Recipes password",
        html: `
          <p>Reset (or set) your password for <strong>Gregg's Recipes</strong>
          (<a href="https://greggsrecipes.com">greggsrecipes.com</a>).</p>
          <p><a href="${url}">Choose a new password</a></p>
          <p style="color:#555;font-size:14px;">Or paste this URL into your browser:<br/>${url}</p>
          <p>This link expires soon. If you didn't ask for a password reset, you can ignore this email.</p>
        `,
        text: `Reset your Gregg's Recipes password (greggsrecipes.com)\n\nChoose a new password: ${url}\n\nIf you didn't ask for this, ignore this email.\n`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return;
  }

  console.log("\n========================================");
  console.log(`[auth] Password reset link for ${email}`);
  console.log(url);
  console.log("========================================\n");
}
