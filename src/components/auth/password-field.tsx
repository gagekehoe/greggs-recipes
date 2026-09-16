"use client";

import * as React from "react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

type PasswordFieldProps = Omit<
  React.ComponentProps<"input">,
  "type" | "size"
> & {
  /** Accessible name for the toggle when the field has no visible nearby label context. */
  toggleLabel?: string;
};

/**
 * Password input with an accessible View / Hide control so cooks can confirm
 * what they typed on phone or desktop.
 */
export function PasswordField({
  className,
  id,
  toggleLabel = "password",
  disabled,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const reactId = useId();
  const inputId = id ?? `password-${reactId}`;
  const toggleId = `${inputId}-visibility`;

  const action = visible ? "Hide" : "View";
  const ariaLabel = `${action} ${toggleLabel}`;

  return (
    <div className="relative">
      <Input
        id={inputId}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-[4.25rem]", className)}
        {...props}
      />
      <button
        id={toggleId}
        type="button"
        disabled={disabled}
        aria-pressed={visible}
        aria-controls={inputId}
        aria-label={ariaLabel}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex min-w-[3.25rem] items-center justify-center px-2.5 text-sm font-medium text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {action}
      </button>
    </div>
  );
}
