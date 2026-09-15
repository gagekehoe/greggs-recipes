import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = {
  title: "Sign in",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(159,179,154,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(184,137,45,0.16),transparent_50%)]"
      />
      <div className="relative mx-auto flex min-h-[80svh] max-w-lg flex-col justify-center px-5 py-28 md:px-8 md:py-32">
        <p className="font-display text-2xl text-[var(--ink)]">Gregg&apos;s Recipes</p>
        <div className="mt-8">
          <SignInForm sent={params.sent === "1"} error={params.error || null} />
        </div>
      </div>
    </div>
  );
}
