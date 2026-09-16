import type { ReactNode } from "react";
import { AuthorPrivilegeBadge } from "@/components/auth/author-privilege-badge";
import type { AuthorPrivilege } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

/** “By {name}” plus Owner / Authorized cook chip when the uploader is privileged. */
export function RecipeAuthorCredit({
  label,
  privilege,
  className,
  trailing,
}: {
  label: string;
  privilege: AuthorPrivilege;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]",
        className
      )}
    >
      <span>By {label}</span>
      <AuthorPrivilegeBadge privilege={privilege} />
      {trailing}
    </p>
  );
}
