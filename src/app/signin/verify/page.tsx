import { redirect } from "next/navigation";
import { authCallbackFromVerifyParams } from "@/lib/auth/friendly-magic-link";

export const metadata = {
  title: "Signing in",
};

type Props = {
  searchParams: Promise<{
    token?: string;
    email?: string;
    callbackUrl?: string;
  }>;
};

/**
 * Friendly landing page for magic-link emails.
 * Completes sign-in by redirecting to the Auth.js email callback with the
 * same token/email/callbackUrl Auth.js issued (never exposed in the email).
 */
export default async function SignInVerifyPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();
  const email = params.email?.trim();

  if (!token || !email) {
    redirect("/signin?error=Verification");
  }

  redirect(
    authCallbackFromVerifyParams({
      token,
      email,
      callbackUrl: params.callbackUrl,
    })
  );
}
