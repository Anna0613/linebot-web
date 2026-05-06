import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BotcraftMarkProps {
  className?: string;
  inverted?: boolean;
}

export const BotcraftMark = ({ className, inverted = false }: BotcraftMarkProps) => (
  <span className={cn("bc-brand-mark", inverted && "bc-brand-mark-inverted", className)} aria-hidden="true">
    <span className="bc-brand-tail" />
  </span>
);

interface BotcraftBrandProps {
  to?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  compact?: boolean;
  inverted?: boolean;
}

const BotcraftBrand = ({
  to = "/",
  className,
  markClassName,
  textClassName,
  compact = false,
  inverted = false,
}: BotcraftBrandProps) => (
  <Link to={to} className={cn("bc-brand", inverted && "bc-brand-inverted", className)} aria-label="Botcraft">
    <BotcraftMark className={markClassName} inverted={inverted} />
    <span className={cn("bc-brand-word", compact && "bc-brand-word-compact", textClassName)}>
      <span className={compact ? "hidden sm:inline" : undefined}>Botcraft</span>
      {compact && <span className="sm:hidden">BC</span>}
    </span>
  </Link>
);

export default BotcraftBrand;
