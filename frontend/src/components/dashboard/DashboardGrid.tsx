import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
  responsive?: boolean;
}

interface GridItemProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | "full";
  spanMd?: 1 | 2 | 3 | 4 | 5 | 6 | "full";
  spanLg?: 1 | 2 | 3 | 4 | 5 | 6 | "full";
  spanXl?: 1 | 2 | 3 | 4 | 5 | 6 | "full";
}

const getColsClass = (cols: number) => {
  const colsMap: { [key: number]: string } = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6"
  };
  return colsMap[cols] || "grid-cols-4";
};

const getGapClass = (gap: string) => {
  const gapMap: { [key: string]: string } = {
    sm: "gap-3",
    md: "gap-6",
    lg: "gap-8"
  };
  return gapMap[gap] || "gap-6";
};

const getSpanClass = (span: number | string, prefix = "") => {
  const spanMap: { [key: string]: string } = {
    1: `${prefix}col-span-1`,
    2: `${prefix}col-span-2`,
    3: `${prefix}col-span-3`,
    4: `${prefix}col-span-4`,
    5: `${prefix}col-span-5`,
    6: `${prefix}col-span-6`,
    full: `${prefix}col-span-full`
  };
  return spanMap[span.toString()] || "";
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  className,
  cols = 4,
  gap = "md",
  responsive = true
}) => {
  const responsiveClasses = responsive
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : getColsClass(cols);

  return (
    <div
      className={cn(
        "grid",
        responsiveClasses,
        getGapClass(gap),
        "animate-in fade-in duration-500",
        className
      )}
    >
      {children}
    </div>
  );
};

export const GridItem: React.FC<GridItemProps> = ({
  children,
  className,
  span = 1,
  spanMd,
  spanLg,
  spanXl
}) => {
  return (
    <div
      className={cn(
        getSpanClass(span),
        spanMd && getSpanClass(spanMd, "md:"),
        spanLg && getSpanClass(spanLg, "lg:"),
        spanXl && getSpanClass(spanXl, "xl:"),
        "animate-in slide-in-from-bottom-3 duration-300",
        className
      )}
    >
      {children}
    </div>
  );
};

// 預設導出
export default DashboardGrid;