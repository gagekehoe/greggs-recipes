import type { AuthorPrivilege } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const LABELS: Record<Exclude<AuthorPrivilege, null>, string> = {
  owner: "Owner",
  authorized_cook: "Authorized cook",
};

/**
 * On-brand privilege chip next to a display name.
 * Owner = Gregg (site owner). Authorized cook = cook role from People.
 */
export function AuthorPrivilegeBadge({
  privilege,
  className,
}: {
  privilege: AuthorPrivilege;
  className?: string;
}) {
  if (!privilege) return null;

  const isOwner = privilege === "owner";
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        isOwner
          ? "border-[var(--accent-deep)]/40 bg-[var(--mist)] text-[var(--accent-deep)]"
          : "border-[var(--sage-deep)]/35 bg-[var(--sage)]/25 text-[var(--sage-deep)]",
        className
      )}
    >
      {LABELS[privilege]}
    </span>
  );
}
