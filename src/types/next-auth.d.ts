import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    /** `passwordUpdatedAt` ms stamp captured at sign-in; see password-session.ts */
    pwdAt?: number;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role?: Role;
    passwordHash?: string | null;
  }
}
