import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(159,179,154,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(184,137,45,0.16),transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-[80svh] max-w-lg flex-col justify-center px-5 py-28 md:px-8 md:py-32">
        <p className="font-display text-2xl text-[var(--ink)]">Gregg&apos;s Recipes</p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-[var(--ink-muted)]">Loading…</p>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
