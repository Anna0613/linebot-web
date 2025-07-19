import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ApiClient } from "../../services/api";
import { Bot, BotUpdateData } from "../../types/bot";
import { useToast } from "@/hooks/use-toast";

interface BotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  botId: string;
  editType: "name" | "token" | "secret" | "all";
  onBotUpdated: () => void;
}

const BotEditModal: React.FC<BotEditModalProps> = ({
  isOpen,
  onClose,
  botId,
  editType,
  onBotUpdated,
}) => {
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    channel_token: "",
    channel_secret: "",
  });

  // 保存原始資料供比較使用
  const [originalData, setOriginalData] = useState({
    name: "",
    channel_token: "",
    channel_secret: "",
  });

  const { toast } = useToast();
  const apiClient = ApiClient.getInstance();

  // 檢查資料是否有變化
  const hasDataChanged = useMemo(() => {
    switch (editType) {
      case "name":
        return formData.name.trim() !== originalData.name.trim();
      case "token":
        return (
          formData.channel_token.trim() !== originalData.channel_token.trim()
        );
      case "secret":
        return (
          formData.channel_secret.trim() !== originalData.channel_secret.trim()
        );
      case "all":
        return (
          formData.name.trim() !== originalData.name.trim() ||
          formData.channel_token.trim() !== originalData.channel_token.trim() ||
          formData.channel_secret.trim() !== originalData.channel_secret.trim()
        );
      default:
        return false;
    }
  }, [formData, originalData, editType]);

  const fetchBotData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBot(botId);

      if (response.error) {
        toast({
          variant: "destructive",
          title: "錯誤",
          description: response.error,
        });
        onClose();
        return;
      }

      const botData = response.data;
      setBot(botData);

      const initialData = {
        name: botData.name || "",
        channel_token: botData.channel_token || "",
        channel_secret: botData.channel_secret || "",
      };

      setFormData(initialData);
      setOriginalData(initialData); // 保存原始資料
    } catch (error) {
      console.error("獲取Bot資料失敗:", error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無法載入Bot資料",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [botId, apiClient, toast, onClose]);

  useEffect(() => {
    if (isOpen && botId) {
      fetchBotData();
    }
  }, [isOpen, botId, fetchBotData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bot) return;

    // 檢查資料是否有變化
    if (!hasDataChanged) {
      toast({
        variant: "default",
        title: "提示",
        description: "資料沒有任何變化，無需更新",
      });
      return;
    }

    try {
      setLoading(true);

      // 根據編輯類型準備更新資料
      const updateData: BotUpdateData = {};

      switch (editType) {
        case "name":
          if (!formData.name.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "Bot名稱不能為空",
            });
            return;
          }
          updateData.name = formData.name.trim();
          break;
        case "token":
          if (!formData.channel_token.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "Channel Token不能為空",
            });
            return;
          }
          updateData.channel_token = formData.channel_token.trim();
          break;
        case "secret":
          if (!formData.channel_secret.trim()) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "Channel Secret不能為空",
            });
            return;
          }
          updateData.channel_secret = formData.channel_secret.trim();
          break;
        case "all":
          if (
            !formData.name.trim() ||
            !formData.channel_token.trim() ||
            !formData.channel_secret.trim()
          ) {
            toast({
              variant: "destructive",
              title: "錯誤",
              description: "所有欄位都必須填寫",
            });
            return;
          }
          updateData.name = formData.name.trim();
          updateData.channel_token = formData.channel_token.trim();
          updateData.channel_secret = formData.channel_secret.trim();
          break;
      }

      const response = await apiClient.updateBot(botId, updateData);

      if (response.error) {
        toast({
          variant: "destructive",
          title: "錯誤",
          description: response.error,
        });
        return;
      }

      toast({
        title: "成功",
        description: "Bot資料已成功更新",
      });

      onBotUpdated();
      onClose();
    } catch (error) {
      console.error("更新Bot失敗:", error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "更新Bot失敗",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (editType) {
      case "name":
        return "修改Bot名稱";
      case "token":
        return "修改Channel Token";
      case "secret":
        return "修改Channel Secret";
      case "all":
        return "編輯Bot資料";
      default:
        return "修改Bot";
    }
  };

  // 重置表單到原始值
  const handleReset = () => {
    setFormData(originalData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-[15px] p-6 w-full max-w-md mx-4 shadow-[-8px_8px_0_#819780] animate-scale-in border border-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#383A45]">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#E74C3C] text-white rounded-md text-sm font-bold hover:bg-[#C0392B] transition"
          >
            關閉
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-[#5A2C1D] loading-pulse">載入中...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {(editType === "name" || editType === "all") && (
              <div>
                <label className="block text-sm font-medium text-[#5A2C1D] mb-1">
                  Bot名稱
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#819780] transition-all duration-200"
                  placeholder="請輸入Bot名稱"
                  required
                />
              </div>
            )}

            {(editType === "token" || editType === "all") && (
              <div>
                <label className="block text-sm font-medium text-[#5A2C1D] mb-1">
                  Channel Token
                </label>
                <input
                  type="text"
                  value={formData.channel_token}
                  onChange={(e) =>
                    setFormData({ ...formData, channel_token: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#819780] transition-all duration-200"
                  placeholder="請輸入Channel Token"
                  required
                />
              </div>
            )}

            {(editType === "secret" || editType === "all") && (
              <div>
                <label className="block text-sm font-medium text-[#5A2C1D] mb-1">
                  Channel Secret
                </label>
                <input
                  type="text"
                  value={formData.channel_secret}
                  onChange={(e) =>
                    setFormData({ ...formData, channel_secret: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#819780] transition-all duration-200"
                  placeholder="請輸入Channel Secret"
                  required
                />
              </div>
            )}

            {/* 資料變化狀態指示器 */}
            <div className="pt-2">
              {hasDataChanged ? (
                <div className="flex items-center text-xs text-[#8ECAE6] font-medium">
                  <div className="w-2 h-2 bg-[#8ECAE6] rounded-full mr-2 animate-pulse"></div>
                  檢測到資料變化
                </div>
              ) : (
                <div className="flex items-center text-xs text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                  資料無變化
                </div>
              )}
            </div>

            <div className="flex justify-between space-x-3 pt-4">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#E74C3C] text-white rounded-md font-bold hover:bg-[#C0392B] transition-all duration-200"
                  disabled={loading}
                >
                  取消
                </button>
                {hasDataChanged && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-[#FFD59E] text-[#5A2C1D] rounded-md font-bold hover:brightness-90 transition-all duration-200"
                    disabled={loading}
                  >
                    重置
                  </button>
                )}
              </div>
              <button
                type="submit"
                className={`px-4 py-2 rounded-md font-bold transition-all duration-200 ${
                  hasDataChanged
                    ? "bg-[#A0D6B4] text-white hover:brightness-90"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                disabled={loading || !hasDataChanged}
              >
                {loading ? "更新中..." : "確認更新"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BotEditModal;
