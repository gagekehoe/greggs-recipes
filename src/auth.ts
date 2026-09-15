import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  type Role,
} from "@/lib/db/schema";
import { getAdminEmail, isAdminEmail } from "@/lib/auth/roles";

async function ensureAdminRole(userId: string, email: string | null | undefined) {
  if (!isAdminEmail(email)) return;
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
          <p>Sign in to Gregg's Recipes:</p>
          <p><a href="${url}">${url}</a></p>
          <p>This link expires soon. If you didn't request it, you can ignore this email.</p>
        `,
        text: `Sign in to Gregg's Recipes:\n${url}\n`,
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
  console.log(url);
  console.log("========================================\n");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Nodemailer({
      // Unused when sendVerificationRequest is custom; required by the provider type.
      server: process.env.EMAIL_SERVER || "smtp://127.0.0.1:1025",
      from: process.env.EMAIL_FROM || "Gregg's Recipes <noreply@greggsrecipes.local>",
      sendVerificationRequest: async ({ identifier, url, provider }) => {
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
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const role = ((user as { role?: Role }).role || "viewer") as Role;
        session.user.role = isAdminEmail(user.email) ? "admin" : role;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
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
