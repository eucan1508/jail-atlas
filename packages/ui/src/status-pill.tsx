import type { HTMLAttributes, ReactNode } from "react";

type StatusTone = "current" | "neutral" | "stale" | "error";

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: StatusTone;
}

export function StatusPill({
  children,
  className = "",
  tone = "neutral",
  ...props
}: StatusPillProps) {
  return (
    <span
      className={["ui-status", `ui-status--${tone}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      <span className="ui-status__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
