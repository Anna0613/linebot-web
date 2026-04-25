import React from "react";
import { Button } from "@/components/ui/button";
import { Bot } from "@/types/bot";
import {
  X,
  Bot as BotIcon,
  Calendar,
  Settings,
  Key,
  Shield,
} from "lucide-react";

interface BotDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: Bot | null;
}

const BotDetailsModal: React.FC<BotDetailsModalProps> = ({
  isOpen,
  onClose,
  bot,
}) => {
  if (!isOpen || !bot) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 標題區域 */}
        <div className="sticky top-0 bg-card px-6 py-4 border-b border-border rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <BotIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Bot 詳細資訊
                </h3>
                <p className="text-sm text-muted-foreground">{bot.name}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>基本資訊</span>
            </div>

            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">
                  Bot 名稱:
                </span>
                <span className="text-sm text-foreground text-right">
                  {bot.name}
                </span>
              </div>

              {bot.description && (
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    描述:
                  </span>
                  <span className="text-sm text-foreground text-right max-w-[200px]">
                    {bot.description}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">狀態:</span>
                <span className="text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                  啟用
                </span>
              </div>
            </div>
          </div>

          {/* 技術資訊 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
              <Key className="w-4 h-4 text-muted-foreground" />
              <span>技術資訊</span>
            </div>

            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">
                  Bot ID:
                </span>
                <span className="text-xs font-mono text-foreground bg-card px-2 py-1 rounded border break-all">
                  {bot.id}
                </span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">
                  使用者 ID:
                </span>
                <span className="text-xs font-mono text-foreground bg-card px-2 py-1 rounded border">
                  {bot.user_id}
                </span>
              </div>
            </div>
          </div>

          {/* 設定狀態 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span>設定狀態</span>
            </div>

            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Channel Access Token:
                </span>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-full ${
                    bot.channel_token
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {bot.channel_token ? "已設定" : "未設定"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Channel Secret:
                </span>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-full ${
                    bot.channel_secret
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {bot.channel_secret ? "已設定" : "未設定"}
                </span>
              </div>
            </div>
          </div>

          {/* 時間資訊 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>時間資訊</span>
            </div>

            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">
                  建立時間:
                </span>
                <span className="text-sm text-foreground text-right">
                  {new Date(bot.created_at).toLocaleString("zh-TW", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>

              {bot.updated_at && (
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    更新時間:
                  </span>
                  <span className="text-sm text-foreground text-right">
                    {new Date(bot.updated_at).toLocaleString("zh-TW", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="sticky bottom-0 bg-card px-6 py-4 border-t border-border rounded-b-lg">
          <Button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            關閉
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BotDetailsModal;
