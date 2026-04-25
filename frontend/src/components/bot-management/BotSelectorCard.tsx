import React from "react";
import { Activity, Bot as BotIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot } from "@/types/bot";

interface BotSelectorCardProps {
  bots: Bot[];
  selectedBot: Bot | undefined;
  selectedBotId: string;
  isConnected: boolean;
  connectionError: string | null;
  onSelectBot: (botId: string) => void;
}

const BotSelectorCard: React.FC<BotSelectorCardProps> = ({
  bots,
  selectedBot,
  selectedBotId,
  isConnected,
  connectionError,
  onSelectBot,
}) => {
  return (
    <div className="mb-6 sticky top-20 z-20">
      <div className="web3-glass-card p-6 web3-hover-glow">
        <div className="mb-4">
          <h3 className="neon-text-gradient text-lg font-semibold flex items-center gap-2">
            <BotIcon className="h-5 w-5" />
            選擇 Bot
          </h3>
        </div>
        <div>
          <div className="flex items-center gap-4">
            <Select value={selectedBotId} onValueChange={onSelectBot}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="選擇要管理的 Bot" />
              </SelectTrigger>
              <SelectContent>
                {bots.map((bot) => (
                  <SelectItem key={bot.id} value={bot.id}>
                    {bot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBot && (
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  啟用中
                </Badge>

                <div className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${isConnected ? "bg-web3-green" : "bg-web3-red"}`}
                  />
                  <span
                    className={
                      isConnected ? "text-web3-green" : "text-web3-red"
                    }
                  >
                    {isConnected ? "即時連接" : "離線模式"}
                  </span>
                  {connectionError && (
                    <span className="text-web3-red text-xs">
                      ({connectionError})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotSelectorCard;
