import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
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
import { getAdminEmail, roleWithVerifiedOwnerBootstrap } from "@/lib/auth/roles";
import {
  ensureOwnerRole,
  migrateBootstrapAdminToOwner,
} from "@/lib/auth/owner-bootstrap";
import { authorizeCredentials } from "@/lib/auth/credentials";
import {
  isPasswordSessionStale,
  passwordStampFromUser,
} from "@/lib/auth/password-session";
import { safeAuthRedirect } from "@/lib/auth/safe-auth-redirect";

const databaseReady = isDatabaseConfigured();

if (!databaseReady) {
  console.error(
    "[auth] Database unavailable — sign-in is disabled. Browse recipes still works. Set DATABASE_URL on Vercel (Neon). See docs/hosting.md."
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: databaseReady
    ? DrizzleAdapter(db, {
        usersTable: users as never,
        accountsTable: accounts as never,
        sessionsTable: sessions as never,
        verificationTokensTable: verificationTokens as never,
      })
    : undefined,
  // Credentials requires JWT sessions (Auth.js). Role/name stay fresh via DB lookup below.
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authorizeCredentials(credentials);
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as { role?: Role }).role || "viewer";
        token.email = user.email;
        token.name = user.name;
        token.pwdAt = passwordStampFromUser(
          (user as { passwordUpdatedAt?: Date | null }).passwordUpdatedAt
        );
        return token;
      }

      // Reject JWTs issued before a password reset (or other password change).
      if (token.sub && isDatabaseConfigured()) {
        try {
          const rows = await db
            .select({ passwordUpdatedAt: users.passwordUpdatedAt })
            .from(users)
            .where(eq(users.id, token.sub))
            .limit(1);
          const row = rows[0] as
            | { passwordUpdatedAt: Date | null }
            | undefined;
          if (
            !row ||
            isPasswordSessionStale(token.pwdAt, row.passwordUpdatedAt)
          ) {
            return {};
          }
        } catch (error) {
          console.error("[auth] jwt password-session check failed:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;

      const id = (token.sub as string | undefined) || undefined;
      // Empty token after password reset / deleted user → no session.
      if (!id) {
        return { ...session, user: undefined as never };
      }
      session.user.id = id;

      if (id && isDatabaseConfigured()) {
        try {
          const rows = await db
            .select({
              name: users.name,
              email: users.email,
              role: users.role,
              image: users.image,
              emailVerified: users.emailVerified,
              passwordUpdatedAt: users.passwordUpdatedAt,
            })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
          const row = rows[0] as
            | {
                name: string | null;
                email: string;
                role: Role;
                image: string | null;
                emailVerified: Date | null;
                passwordUpdatedAt: Date | null;
              }
            | undefined;
          if (
            !row ||
            isPasswordSessionStale(token.pwdAt, row.passwordUpdatedAt)
          ) {
            return { ...session, user: undefined as never };
          }
          session.user.name = row.name;
          session.user.email = row.email;
          session.user.image = row.image;
          session.user.role = roleWithVerifiedOwnerBootstrap(
            row.email,
            row.role,
            row.emailVerified
          );
          return session;
        } catch (error) {
          console.error("[auth] session DB refresh failed:", error);
        }
      }

      // Fallback without a fresh DB row: trust token role only (never email alone).
      const role = (token.role as Role | undefined) || "viewer";
      session.user.role = role;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!isDatabaseConfigured()) return;
      await migrateBootstrapAdminToOwner();
      if (user.id) {
        await ensureOwnerRole(user.id, user.email);
      }
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || "greggs-dev-auth-secret-change-me",
});

export { getAdminEmail };
