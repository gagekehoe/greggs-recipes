import { SignInVerifyConfirm } from "@/components/auth/sign-in-verify-confirm";
import { authCallbackFromVerifyParams } from "@/lib/auth/friendly-magic-link";
import {
  authPublicOrigin,
  sanitizeAuthCallbackUrl,
} from "@/lib/auth/safe-auth-redirect";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
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
 * Shows a branded confirm step, then continues to Auth.js with the same
 * token/email/callbackUrl (callbackUrl allowlisted to this site only).
 */
export default async function SignInVerifyPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();
  const email = params.email?.trim();

  if (!token || !email) {
    redirect("/signin?error=Verification");
  }

  const callbackUrl = sanitizeAuthCallbackUrl(
    params.callbackUrl,
    authPublicOrigin()
  );

  const href = authCallbackFromVerifyParams({
    token,
    email,
    callbackUrl,
  });

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(159,179,154,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(184,137,45,0.16),transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-[80svh] max-w-lg flex-col justify-center px-5 py-28 md:px-8 md:py-32">
        <p className="font-display text-2xl text-[var(--ink)]">
          Gregg&apos;s Recipes
        </p>
        <div className="mt-8">
          <SignInVerifyConfirm href={href} email={email} />
        </div>
      </div>
    </div>
  );
}
