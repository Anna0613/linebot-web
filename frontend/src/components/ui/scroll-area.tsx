import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  ScrollAreaProps
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative overflow-auto dashboard-scroll",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };