import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { isDisplayNameSet, needsProfileSetup } from "@/lib/auth/profile";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = {
  title: "Your profile",
};

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?callbackUrl=/profile");
  }

  if (needsProfileSetup(user.name)) {
    redirect("/welcome?next=/profile");
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(159,179,154,0.35),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-lg px-5 py-28 md:px-8 md:py-32">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">
          Account
        </p>
        <h1 className="mt-3 font-display text-4xl text-[var(--ink)] md:text-5xl">
          Your profile
        </h1>
        <p className="mt-3 leading-relaxed text-[var(--ink-muted)]">
          Update how your name appears on reviews and comments.
        </p>
        <div className="mt-10">
          <ProfileForm
            mode="profile"
            initialName={
              isDisplayNameSet(user.name) ? user.name!.trim() : ""
            }
            email={user.email}
          />
        </div>
        <p className="mt-10 text-sm text-[var(--ink-muted)]">
          Role:{" "}
          <span className="font-medium text-[var(--ink)]">{user.role}</span>
          {" · "}
          <Link
            href="/"
            className="text-[var(--accent-deep)] underline-offset-4 hover:underline"
          >
            Back to recipes
          </Link>
        </p>
      </div>
    </div>
  );
}
