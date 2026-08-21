import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={["ui-button", `ui-button--${variant}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
}

export function LinkButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <a
      className={["ui-button", `ui-button--${variant}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </a>
  );
}
