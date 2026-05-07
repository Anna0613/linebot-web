import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BotCraftMarkProps {
  className?: string;
  inverted?: boolean;
}

export const BotCraftMark = ({ className, inverted = false }: BotCraftMarkProps) => (
  <span className={cn("bc-brand-mark", inverted && "bc-brand-mark-inverted", className)} aria-hidden="true">
    <span className="bc-brand-tail" />
  </span>
);

interface BotCraftBrandProps {
  to?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  compact?: boolean;
  inverted?: boolean;
}

const BotCraftBrand = ({
  to = "/",
  className,
  markClassName,
  textClassName,
  compact = false,
  inverted = false,
}: BotCraftBrandProps) => (
  <Link to={to} className={cn("bc-brand", inverted && "bc-brand-inverted", className)} aria-label="BotCraft">
    <BotCraftMark className={markClassName} inverted={inverted} />
    <span className={cn("bc-brand-word", compact && "bc-brand-word-compact", textClassName)}>
      <span className={compact ? "hidden sm:inline" : undefined}>BotCraft</span>
      {compact && <span className="sm:hidden">BC</span>}
    </span>
  </Link>
);

export default BotCraftBrand;
