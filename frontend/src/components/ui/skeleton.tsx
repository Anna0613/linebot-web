import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--bc-rad-sm)] bg-[var(--bc-bg-2)]",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
