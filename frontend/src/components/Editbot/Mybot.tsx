import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { apiClient } from "../../services/UnifiedApiClient";
import { Bot } from "../../types/bot";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import EditOptionModal from "./EditOptionModal";

type MybotProps = {
  onEdit: (id: string, editType: "name" | "token" | "secret" | "all") => void;
};

export interface MybotRef {
  refreshBots: () => void;
}

const Mybot = forwardRef<MybotRef, MybotProps>(({ onEdit }, ref) => {
  const [botList, setBotList] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    botId: string;
    botName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    botId: "",
    botName: "",
    isLoading: false,
  });

  const [editOptionModal, setEditOptionModal] = useState<{
    isOpen: boolean;
    botId: string;
  }>({
    isOpen: false,
    botId: "",
  });
  const { toast } = useToast();
  // apiClient 已經從 UnifiedApiClient 匯入

  const handleDeleteClick = (botId: string, botName: string) => {
    setDeleteDialog({
      isOpen: true,
      botId,
      botName,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await apiClient.deleteBot(deleteDialog.botId);

      if (response.error) {
        toast({
          variant: "destructive",
          title: "刪除失敗",
          description: response.error,
        });
      } else {
        toast({
          title: "刪除成功",
          description: `機器人「${deleteDialog.botName}」已成功刪除`,
        });

        // 刪除成功後重新載入Bot列表
        await fetchBots();

        // 如果刪除的Bot正在展開，則關閉展開狀態
        if (expandedBot === deleteDialog.botId) {
          setExpandedBot(null);
        }
      }
    } catch (_error) {
      console.error("Error occurred:", _error);
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: "刪除機器人時發生錯誤",
      });
    } finally {
      setDeleteDialog({
        isOpen: false,
        botId: "",
        botName: "",
        isLoading: false,
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      botId: "",
      botName: "",
      isLoading: false,
    });
  };

  const handleEditClick = (botId: string) => {
    setEditOptionModal({
      isOpen: true,
      botId,
    });
  };

  const handleEditOptionClose = () => {
    setEditOptionModal({
      isOpen: false,
      botId: "",
    });
  };

  const handleEditBasicInfo = () => {
    onEdit(editOptionModal.botId, "all");
  };

  const fetchBots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBots();

      if (response.error) {
        console.error("Error occurred:", _error);

        // 檢查是否為身份驗證錯誤
        if (response.status === 401 || response.status === 403) {
          toast({
            variant: "destructive",
            title: "身份驗證失敗",
            description: "請重新登入後再試",
          });
        } else {
          toast({
            variant: "destructive",
            title: "錯誤",
            description: response.error || "無法載入Bot列表",
          });
        }
        setBotList([]);
      } else {
        setBotList(response.data || []);
      }
    } catch (_error) {
      console.error("Error occurred:", _error);
      toast({
        variant: "destructive",
        title: "錯誤",
        description: "無法載入Bot列表",
      });
      setBotList([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const toggleExpanded = (botId: string) => {
    setExpandedBot((prev) => (prev === botId ? null : botId));
  };

  // 暴露刷新方法給父組件
  useImperativeHandle(ref, () => ({
    refreshBots: fetchBots,
  }));

  // 過濾 bot 列表
  const filteredBots = botList.filter((bot) =>
    bot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl mx-auto h-[400px] sm:h-[450px] md:h-[520px] rounded-[15px] sm:rounded-[20px] md:rounded-[25px] bg-card text-card-foreground border border-border shadow-[-8px_8px_0_hsl(var(--line-green))] sm:shadow-[-12px_12px_0_hsl(var(--line-green))] md:shadow-[-15px_15px_0_hsl(var(--line-green))] p-3 sm:p-4 md:p-5 flex-shrink-0 flex flex-col transition-all duration-300 dark:shadow-neon">
      <h2 className="text-center text-lg sm:text-xl md:text-[26px] font-bold text-foreground mb-3 sm:mb-4">
        我的LINE Bot
      </h2>

      <input
        type="text"
        placeholder="搜尋Bot名稱..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 sm:p-3 border border-border rounded-lg mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition text-sm sm:text-base bg-background text-foreground"
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-foreground text-base sm:text-lg">載入中...</div>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground text-center text-sm sm:text-base">
              {botList.length === 0 ? "尚無Bot資料" : "沒有找到符合的Bot"}
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredBots.map((bot, index) => (
              <div
                key={bot.id}
                className="border border-border rounded-lg overflow-hidden bg-gradient-to-r from-card to-[hsl(var(--line-green-soft))] hover:shadow-md transition-all duration-200"
              >
                {/* Bot 基本資訊 */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-base flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground text-sm sm:text-base md:text-lg truncate">
                          {bot.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          ID: {bot.id}
                        </p>
                      </div>
                    </div>

                    {/* 桌面版按鈕組 */}
                    <div className="hidden lg:flex items-center space-x-2">
                      <button
                        onClick={() => handleEditClick(bot.id)}
                        className="px-4 py-2 bg-[#82C29B] text-white rounded-lg hover:bg-[#6BAF88] transition-all duration-200 shadow-md text-sm font-bold"
                        title="編輯Bot"
                      >
                        編輯
                      </button>

                      <button
                        onClick={() => toggleExpanded(bot.id)}
                        className="px-3 py-2 bg-[#F0F0F0] text-[#383A45] rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-md text-sm font-bold"
                        title="更多選項"
                      >
                        {expandedBot === bot.id ? "收起" : "更多"}
                      </button>
                    </div>

                    {/* 手機版/平板版更多按鈕 */}
                    <div className="lg:hidden">
                      <button
                        onClick={() => toggleExpanded(bot.id)}
                        className="px-3 py-2 bg-[#F0F0F0] text-[#383A45] rounded-lg hover:bg-gray-300 transition-all duration-200 shadow-md text-xs sm:text-sm font-bold"
                        title="更多選項"
                      >
                        {expandedBot === bot.id ? "收起" : "選項"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 展開的詳細操作區域 */}
                {expandedBot === bot.id && (
                  <div className="border-t border-border bg-card p-3 sm:p-4 animate-slide-down">
                    {/* 手機版按鈕組 */}
                    <div className="lg:hidden mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <button
                          onClick={() => handleEditClick(bot.id)}
                          className="w-full px-3 py-2 bg-[hsl(var(--primary))] text-white rounded-lg hover:brightness-95 transition-all duration-200 shadow-md text-sm font-bold"
                        >
                          編輯
                        </button>

                        <button
                          onClick={() => handleDeleteClick(bot.id, bot.name)}
                          className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md text-sm font-bold"
                        >
                          刪除Bot
                        </button>
                      </div>
                    </div>

                    {/* 桌面版額外選項 */}
                    <div className="hidden lg:block">
                      <div className="flex justify-center">
                        <div className="space-y-3 w-full max-w-md">
                          <div className="flex justify-center space-x-4">
                            <button
                              onClick={() =>
                                handleDeleteClick(bot.id, bot.name)
                              }
                              className="px-4 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] rounded-lg hover:opacity-90 transition-all duration-200 shadow-sm text-sm font-bold"
                            >
                              刪除Bot
                            </button>
                          </div>

                          <div className="p-4 bg-secondary rounded-lg">
                            <h5 className="font-medium text-foreground text-sm mb-3 text-center">
                              Bot 資訊
                            </h5>
                            <div className="text-sm text-muted-foreground space-y-2">
                              <div className="flex justify-between">
                                <span className="font-medium">Bot ID:</span>
                                <span className="text-xs font-mono">
                                  {bot.id}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">使用者ID:</span>
                                <span className="text-xs font-mono">
                                  {bot.user_id}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">狀態:</span>
                                <span className="text-green-600 font-medium">
                                  正常
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 刪除確認對話框 */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        botName={deleteDialog.botName}
        isLoading={deleteDialog.isLoading}
      />

      {/* 編輯選項模態框 */}
      <EditOptionModal
        isOpen={editOptionModal.isOpen}
        onClose={handleEditOptionClose}
        botId={editOptionModal.botId}
        onEditBasicInfo={handleEditBasicInfo}
      />
    </div>
  );
});

Mybot.displayName = "Mybot";

export default Mybot;
