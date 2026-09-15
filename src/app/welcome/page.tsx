import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { isDisplayNameSet, needsProfileSetup } from "@/lib/auth/profile";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = {
  title: "Welcome",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function WelcomePage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?callbackUrl=/welcome");
  }

  const params = await searchParams;
  const next = safeNextPath(params.next);

  if (!needsProfileSetup(user.name)) {
    redirect(next);
  }

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
        <h1 className="mt-6 font-display text-4xl text-[var(--ink)] md:text-5xl">
          Choose a display name
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--ink-muted)]">
          Your account is ready. Pick the name that shows on reviews and
          comments — you can change it later on your profile.
        </p>
        <div className="mt-8">
          <ProfileForm
            mode="welcome"
            initialName={isDisplayNameSet(user.name) ? user.name!.trim() : ""}
            email={user.email}
            nextHref={next}
          />
        </div>
        <p className="mt-8 text-sm text-[var(--ink-soft)]">
          <Link
            href="/signin"
            className="text-[var(--accent-deep)] underline-offset-4 hover:underline"
          >
            Use a different email
          </Link>
        </p>
      </div>
    </div>
  );
}
