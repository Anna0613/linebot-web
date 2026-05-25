import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot as BotIcon, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { cn } from "@/lib/utils";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";

const NO_BOTS_VALUE = "__no_bots__";

const switcherCopy = {
  en: {
    label: "Current bot",
    loading: "Loading bots",
    placeholder: "Select bot",
    noBots: "No bots yet",
    createBot: "Create Bot",
  },
  zh: {
    label: "目前 Bot",
    loading: "載入 Bot",
    placeholder: "選擇 Bot",
    noBots: "尚無 Bot",
    createBot: "建立 Bot",
  },
};

type GlobalBotSwitcherProps = {
  className?: string;
  triggerClassName?: string;
  showLabel?: boolean;
  showCreateButton?: boolean;
};

const GlobalBotSwitcher = ({
  className,
  triggerClassName,
  showLabel = true,
  showCreateButton = true,
}: GlobalBotSwitcherProps) => {
  const navigate = useNavigate();
  const { language } = useLanguagePreference();
  const copy = switcherCopy[language];
  const {
    bots,
    selectedBotId,
    isLoading,
    hasLoaded,
    selectBot,
    refreshBots,
  } = useSelectedBot();

  useEffect(() => {
    if (!hasLoaded && !isLoading) {
      void refreshBots();
    }
  }, [hasLoaded, isLoading, refreshBots]);

  const hasBots = bots.length > 0;
  const selectedBotExists = bots.some((bot) => bot.id === selectedBotId);
  const selectValue = selectedBotExists ? selectedBotId : NO_BOTS_VALUE;

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border border-emerald-100 bg-emerald-50 text-[#16a34a]">
        {isLoading ? (
          <Loader size="sm" />
        ) : (
          <BotIcon className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        {showLabel && (
          <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-normal text-slate-500">
            {copy.label}
          </p>
        )}
        <Select
          value={selectValue}
          onValueChange={(value) => {
            if (value !== NO_BOTS_VALUE) {
              selectBot(value);
            }
          }}
          disabled={isLoading || !hasBots}
        >
          <SelectTrigger
            className={cn(
              "h-10 w-full min-w-0 rounded-[14px] border-white/70 bg-white/75 px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-white",
              triggerClassName
            )}
          >
            <SelectValue
              placeholder={isLoading ? copy.loading : copy.placeholder}
            />
          </SelectTrigger>
          <SelectContent>
            {bots.map((bot) => (
              <SelectItem key={bot.id} value={bot.id}>
                {bot.name}
              </SelectItem>
            ))}
            {!selectedBotExists && (
              <SelectItem value={NO_BOTS_VALUE} disabled>
                {isLoading
                  ? copy.loading
                  : hasBots
                    ? copy.placeholder
                    : copy.noBots}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {!hasBots && !isLoading && showCreateButton && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-[14px] border-white/70 bg-white/75 text-slate-600 shadow-sm hover:bg-white"
          onClick={() => navigate("/dashboard?createBot=1")}
          aria-label={copy.createBot}
          title={copy.createBot}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default GlobalBotSwitcher;
