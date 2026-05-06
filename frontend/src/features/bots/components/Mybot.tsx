import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { apiClient } from "@/services/UnifiedApiClient";
import { Bot } from "@/types/bot";
import { Loader } from "@/components/ui/loader";
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
        description: "無法載入 Bot 列表",
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
    <div className="app-panel mx-auto flex h-[400px] w-full max-w-4xl flex-shrink-0 flex-col p-3 transition-all duration-200 sm:h-[450px] sm:p-4 md:h-[520px] md:p-5">
      <h2 className="mb-3 text-center text-lg font-semibold text-slate-950 sm:mb-4 sm:text-xl md:text-[26px]">
        我的 LINE Bot
      </h2>

      <input
        type="text"
        placeholder="搜尋 Bot 名稱..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="app-input mb-3 w-full sm:mb-4"
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader text="載入中..." />
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground text-center text-sm sm:text-base">
              {botList.length === 0 ? "尚無 Bot 資料" : "沒有找到符合的 Bot"}
            </div>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredBots.map((bot, index) => (
              <div
                key={bot.id}
                className="overflow-hidden rounded-[16px] border border-slate-200 bg-white transition-all duration-200 hover:border-emerald-200"
              >
                {/* Bot 基本資訊 */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#06C755] text-sm font-semibold text-white sm:h-10 sm:w-10 sm:text-base">
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
                        className="rounded-[12px] bg-[#06C755] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#05b04a]"
                        title="編輯Bot"
                      >
                        編輯
                      </button>

                      <button
                        onClick={() => toggleExpanded(bot.id)}
                        className="rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        title="更多選項"
                      >
                        {expandedBot === bot.id ? "收起" : "更多"}
                      </button>
                    </div>

                    {/* 手機版/平板版更多按鈕 */}
                    <div className="lg:hidden">
                      <button
                        onClick={() => toggleExpanded(bot.id)}
                        className="rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:text-sm"
                        title="更多選項"
                      >
                        {expandedBot === bot.id ? "收起" : "選項"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 展開的詳細操作區域 */}
                {expandedBot === bot.id && (
                  <div className="animate-slide-down border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                    {/* 手機版按鈕組 */}
                    <div className="lg:hidden mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <button
                          onClick={() => handleEditClick(bot.id)}
                          className="w-full rounded-[12px] bg-[#06C755] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#05b04a]"
                        >
                          編輯
                        </button>

                        <button
                          onClick={() => handleDeleteClick(bot.id, bot.name)}
                          className="w-full rounded-[12px] bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                        >
                          刪除 Bot
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
                              className="rounded-[12px] bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                            >
                              刪除 Bot
                            </button>
                          </div>

                          <div className="rounded-[14px] border border-slate-200 bg-white p-4">
                            <h5 className="font-medium text-foreground text-sm mb-3 text-center">
                              Bot 資訊
                            </h5>
                            <div className="space-y-2 text-sm text-slate-500">
                              <div className="flex justify-between">
                                <span className="font-medium">Bot ID:</span>
                                <span className="text-xs font-mono">
                                  {bot.id}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">帳號 ID:</span>
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
