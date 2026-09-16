import type { AuthorPrivilege } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const LABELS: Record<Exclude<AuthorPrivilege, null>, string> = {
  owner: "Owner",
  admin: "Admin",
  authorized_cook: "Authorized cook",
};

/**
 * On-brand privilege chip next to a display name.
 * Owner = Gregg · Admin = kitchen staff · Authorized cook = cook role.
 */
export function AuthorPrivilegeBadge({
  privilege,
  className,
}: {
  privilege: AuthorPrivilege;
  className?: string;
}) {
  if (!privilege) return null;

  const tone =
    privilege === "owner"
      ? "border-[var(--accent-deep)]/40 bg-[var(--mist)] text-[var(--accent-deep)]"
      : privilege === "admin"
        ? "border-[var(--ink)]/25 bg-[var(--paper)] text-[var(--ink-muted)]"
        : "border-[var(--sage-deep)]/35 bg-[var(--sage)]/25 text-[var(--sage-deep)]";

  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        tone,
        className
      )}
    >
      {LABELS[privilege]}
    </span>
  );
}
