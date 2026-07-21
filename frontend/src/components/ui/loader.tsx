import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface LoaderProps extends HTMLAttributes<HTMLElement> {
  fullPage?: boolean;
  text?: string;
  web3Style?: boolean;
  size?: "sm" | "md" | "lg";
}

const spinnerSizeClass = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
};

export function Loader({
  fullPage = false,
  text,
  web3Style: _web3Style,
  size = "md",
  className,
  ...props
}: LoaderProps) {
  const accessibleText = text || "載入中";
  const spinner = (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-[var(--bc-line-2)] border-t-[var(--bc-ink)]",
        spinnerSizeClass[size]
      )}
    />
  );

  if (fullPage) {
    return (
      <div
        className={cn("flex min-h-screen w-full items-center justify-center", className)}
        role="status"
        aria-live="polite"
        {...props}
      >
        <div className="flex flex-col items-center gap-3">
          {spinner}
          {text && (
            <span className="text-sm font-medium text-[var(--bc-ink-2)]">{text}</span>
          )}
          <span className="sr-only">{accessibleText}</span>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center gap-2", text && "flex-col", className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      {spinner}
      {text && <span className="text-sm font-medium text-[var(--bc-ink-2)]">{text}</span>}
      <span className="sr-only">{accessibleText}</span>
    </span>
  );
}
