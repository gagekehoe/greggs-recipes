import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { eq } from "drizzle-orm";
import {
  accounts,
  db,
  isDatabaseConfigured,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db";
import type { Role } from "@/lib/db/schema";
import { getAdminEmail, isAdminEmail } from "@/lib/auth/roles";
import { toFriendlyMagicLinkUrl } from "@/lib/auth/friendly-magic-link";
import { safeAuthRedirect } from "@/lib/auth/safe-auth-redirect";

async function ensureAdminRole(userId: string, email: string | null | undefined) {
  if (!isAdminEmail(email)) return;
  if (!isDatabaseConfigured()) return;
  await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
}

async function sendMagicLink({
  identifier,
  url,
}: {
  identifier: string;
  url: string;
  provider: { from?: string };
}) {
  // Prefer /signin/verify in email so Safe Browsing doesn't see the Auth.js API path.
  const magicLink = toFriendlyMagicLinkUrl(url);
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
        to: identifier,
        subject: "Sign in to Gregg's Recipes",
        html: `
          <p>This is your sign-in link for <strong>Gregg's Recipes</strong>
          (<a href="https://greggsrecipes.com">greggsrecipes.com</a>) —
          a personal home-cooking recipe site.</p>
          <p><a href="${magicLink}">Continue signing in to Gregg's Recipes</a></p>
          <p style="color:#555;font-size:14px;">Or paste this URL into your browser:<br/>${magicLink}</p>
          <p>No password. Nothing to download. The link expires soon.
          If you didn't request this, you can ignore this email.</p>
        `,
        text: `Sign in to Gregg's Recipes (greggsrecipes.com)\n\nContinue: ${magicLink}\n\nNo password. Nothing to download. If you didn't request this, ignore this email.\n`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return;
  }

  // Local / no provider: print the magic link so demos still work.
  console.log("\n========================================");
  console.log(`[auth] Magic link for ${identifier}`);
  console.log(magicLink);
  console.log("========================================\n");
}

const databaseReady = isDatabaseConfigured();

if (!databaseReady) {
  console.error(
    "[auth] Database unavailable — sign-in is disabled. Browse recipes still works. Set DATABASE_URL on Vercel (Neon). See docs/hosting.md."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: databaseReady
    ? DrizzleAdapter(db, {
        // Active dialect tables (SQLite locally, Postgres when DATABASE_URL is set).
        usersTable: users as never,
        accountsTable: accounts as never,
        sessionsTable: sessions as never,
        verificationTokensTable: verificationTokens as never,
      })
    : undefined,
  session: {
    // Database sessions when Drizzle/Neon (or local SQLite) is available.
    // JWT avoids crashing /api/auth/session on Vercel before DATABASE_URL is set.
    strategy: databaseReady ? "database" : "jwt",
  },
  providers: [
    Nodemailer({
      // Unused when sendVerificationRequest is custom; required by the provider type.
      server: process.env.EMAIL_SERVER || "smtp://127.0.0.1:1025",
      from: process.env.EMAIL_FROM || "Gregg's Recipes <noreply@greggsrecipes.local>",
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        if (!isDatabaseConfigured()) {
          console.error(
            `[auth] Refusing magic link for ${identifier}: DATABASE_URL is not configured.`
          );
          throw new Error(
            "Sign-in is temporarily unavailable. The site database is not configured."
          );
        }
        await sendMagicLink({ identifier, url, provider });
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin?sent=1",
    error: "/signin",
  },
  callbacks: {
    // Required for Safe Browsing / GSC "deceptive pages": never open-redirect
    // off-site via callbackUrl after magic-link or OAuth-style flows.
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
    async session({ session, user, token }) {
      if (session.user) {
        const id = user?.id || (token?.sub as string | undefined);
        if (id) session.user.id = id;
        const role = ((user as { role?: Role } | undefined)?.role ||
          (token?.role as Role | undefined) ||
          "viewer") as Role;
        const email = user?.email ?? session.user.email;
        session.user.role = isAdminEmail(email) ? "admin" : role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !isDatabaseConfigured()) return;
      const role: Role = isAdminEmail(user.email) ? "admin" : "viewer";
      await db.update(users).set({ role }).where(eq(users.id, user.id));
    },
    async signIn({ user }) {
      if (user.id) {
        await ensureAdminRole(user.id, user.email);
      }
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || "greggs-dev-auth-secret-change-me",
});

export { getAdminEmail };
