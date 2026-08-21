import type { HTMLAttributes, ReactNode } from "react";

type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  heading?: string;
  children: ReactNode;
  tone?: AlertTone;
}

export function Alert({ children, className = "", heading, tone = "info", ...props }: AlertProps) {
  return (
    <div
      className={["ui-alert", `ui-alert--${tone}`, className].filter(Boolean).join(" ")}
      role={tone === "danger" ? "alert" : "status"}
      {...props}
    >
      <span className="ui-alert__mark" aria-hidden="true" />
      <div>
        {heading ? <p className="ui-alert__heading">{heading}</p> : null}
        <div className="ui-alert__body">{children}</div>
      </div>
    </div>
  );
}
