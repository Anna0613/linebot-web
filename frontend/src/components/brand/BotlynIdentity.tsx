import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BotlynMarkProps {
  className?: string;
  inverted?: boolean;
}

export const BotlynMark = ({ className, inverted = false }: BotlynMarkProps) => (
  <span className={cn("bc-brand-mark", inverted && "bc-brand-mark-inverted", className)} aria-hidden="true">
    <img src="/assets/brand/botlyn-logo.png" alt="" />
  </span>
);

interface BotlynBrandProps {
  to?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  compact?: boolean;
  inverted?: boolean;
}

const BotlynBrand = ({
  to = "/",
  className,
  markClassName,
  textClassName,
  compact = false,
  inverted = false,
}: BotlynBrandProps) => (
  <Link to={to} className={cn("bc-brand", inverted && "bc-brand-inverted", className)} aria-label="Botlyn">
    <BotlynMark className={markClassName} inverted={inverted} />
    <span className={cn("bc-brand-word", compact && "bc-brand-word-compact", textClassName)}>
      <span className={compact ? "hidden sm:inline" : undefined}>Botlyn</span>
      {compact && <span className="sm:hidden">BL</span>}
    </span>
  </Link>
);

export default BotlynBrand;
