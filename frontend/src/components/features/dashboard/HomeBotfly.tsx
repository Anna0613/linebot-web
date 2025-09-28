import React, { useEffect, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Plus, Settings, FileText, Edit, Trash2, Eye } from "lucide-react";
import { useBotManagement } from "@/hooks/useBotManagement";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/UnifiedApiClient";
import { Bot as BotType } from "@/types/bot";
const DeleteConfirmDialog = lazy(() => import("@/components/Editbot/DeleteConfirmDialog"));
const EditOptionModal = lazy(() => import("@/components/Editbot/EditOptionModal"));
const BotEditModal = lazy(() => import("@/components/Editbot/BotEditModal"));
const BotDetailsModal = lazy(() => import("./BotDetailsModal"));
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface User {
  line_id?: string;
  display_name: string;
  picture_url?: string;
  username?: string;
  isLineUser?: boolean;
}

interface HomeBotflyProps {
  user: User | null;
}

const HomeBotfly: React.FC<HomeBotflyProps> = ({ user }) => {
  const { bots, isLoading, error, fetchBots } = useBotManagement();
  const { toast } = useToast();
  const _navigate = useNavigate();
  // apiClient 已經從 UnifiedApiClient 匯入

  // 刪除對話框狀態
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

  // 編輯選項模態框狀態
  const [editOptionModal, setEditOptionModal] = useState<{
    isOpen: boolean;
    botId: string;
  }>({
    isOpen: false,
    botId: "",
  });

  // 編輯模態框狀態
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    botId: string;
    editType: "name" | "token" | "secret" | "all";
  }>({
    isOpen: false,
    botId: "",
    editType: "all",
  });

  // 詳情模態框狀態
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    bot: BotType | null;
  }>({
    isOpen: false,
    bot: null,
  });

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  // 處理刪除點擊
  const handleDeleteClick = (botId: string, botName: string) => {
    setDeleteDialog({
      isOpen: true,
      botId,
      botName,
      isLoading: false,
    });
  };

  // 確認刪除
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

        // 重新載入Bot列表
        await fetchBots();

        // 如果刪除的Bot正在查看詳情，則關閉詳情模態框
        if (detailsModal.bot && detailsModal.bot.id === deleteDialog.botId) {
          setDetailsModal({ isOpen: false, bot: null });
        }
      }
    } catch (error) {
      console.error("Error occurred:", error);
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

  // 取消刪除
  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      botId: "",
      botName: "",
      isLoading: false,
    });
  };

  // 處理編輯點擊
  const handleEditClick = (botId: string) => {
    setEditOptionModal({
      isOpen: true,
      botId,
    });
  };

  // 關閉編輯選項模態框
  const handleEditOptionClose = () => {
    setEditOptionModal({
      isOpen: false,
      botId: "",
    });
  };

  // 處理編輯基本資訊
  const handleEditBasicInfo = () => {
    setEditModal({
      isOpen: true,
      botId: editOptionModal.botId,
      editType: "all",
    });
    setEditOptionModal({ isOpen: false, botId: "" });
  };

  // 關閉編輯模態框
  const handleEditModalClose = () => {
    setEditModal({
      isOpen: false,
      botId: "",
      editType: "all",
    });
  };

  // Bot更新後的回調
  const handleBotUpdated = () => {
    fetchBots(); // 重新載入Bot列表
    setEditModal({
      isOpen: false,
      botId: "",
      editType: "all",
    });
  };

  // 顯示Bot詳情
  const showBotDetails = (bot: BotType) => {
    setDetailsModal({
      isOpen: true,
      bot,
    });
  };

  // 關閉詳情模態框
  const closeDetailsModal = () => {
    setDetailsModal({
      isOpen: false,
      bot: null,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h1 className="web3-section-title mb-4">
          歡迎回來，{user?.display_name || user?.username || "用戶"}！
        </h1>
        <p className="text-lg text-muted-foreground">
          管理您的 LINE Bot，創建智能對話體驗
        </p>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold neon-text-cyan mb-3">快速操作</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="web3-dashboard-card p-6 web3-hover-glow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
            <h3 className="text-lg font-medium text-web3-cyan">創建新 Bot</h3>
            <Plus className="h-6 w-6 text-web3-cyan animate-neon-pulse" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              快速創建一個新的 LINE Bot 專案
            </p>
            <Button asChild className="web3-primary-button w-full">
              <Link to="/bots/create">開始創建</Link>
            </Button>
          </div>
        </div>

        <div className="web3-dashboard-card p-6 web3-hover-glow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
            <h3 className="text-lg font-medium text-web3-purple">Bot 編輯器</h3>
            <Bot className="h-6 w-6 text-web3-purple animate-web3-glow" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              設計和編輯您的 Bot 對話流程
            </p>
            <Button asChild className="web3-button w-full">
              <Link to="/bots/visual-editor">進入編輯器</Link>
            </Button>
          </div>
        </div>

        <div className="web3-dashboard-card p-6 web3-hover-glow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2 mb-4">
            <h3 className="text-lg font-medium text-web3-pink">管理 LINE Bot</h3>
            <Settings className="h-6 w-6 text-web3-pink animate-cosmic-flow" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              監控和控制您的 LINE Bot
            </p>
            <Button asChild className="web3-button w-full">
              <Link to="/bots/management">管理中心</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Bot List Section */}
      <div className="web3-glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold neon-text-gradient">我的 Bot</h2>
          <Button asChild size="sm" className="web3-primary-button">
            <Link to="/bots/create">
              <Plus className="h-4 w-4 mr-2" />
              新增 Bot
            </Link>
          </Button>
        </div>

        {error && (
          <div className="web3-glass-card p-4 mb-4 border border-web3-red">
            <p className="text-web3-red">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="web3-metric-card p-6 overflow-hidden">
                <div className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-2/3" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mt-2" />
                </div>
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : bots.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-web3-cyan mx-auto mb-4 animate-neon-pulse" />
            <p className="text-muted-foreground mb-4">還沒有任何 Bot</p>
            <Button asChild className="web3-primary-button">
              <Link to="/bots/create">創建第一個 Bot</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <div key={bot.id} className="web3-metric-card p-6 web3-hover-glow">
                <div className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-web3-cyan">{bot.name}</h3>
                    <div className="flex space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClick(bot.id)}
                              className="web3-button text-web3-purple hover:text-web3-purple border-web3-purple/30 hover:border-web3-purple"
                              aria-label="編輯 Bot"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>編輯</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteClick(bot.id, bot.name)}
                              className="web3-button text-web3-red hover:text-web3-red border-web3-red/30 hover:border-web3-red"
                              aria-label="刪除 Bot"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>刪除</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => showBotDetails(bot)}
                              className="web3-button text-web3-pink hover:text-web3-pink border-web3-pink/30 hover:border-web3-pink"
                              aria-label="查看詳情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>詳情</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  {bot.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {bot.description}
                    </p>
                  )}
                </div>
                <div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">狀態:</span>
                      <span className="font-medium text-web3-green">啟用</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">建立時間:</span>
                      <span className="text-foreground">
                        {new Date(bot.created_at).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                    {bot.channel_token && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">頻道已設定:</span>
                        <span className="text-web3-green font-medium">是</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 刪除確認對話框 */}
      <Suspense fallback={null}>
        <DeleteConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          botName={deleteDialog.botName}
          isLoading={deleteDialog.isLoading}
        />
      </Suspense>

      {/* 編輯選項模態框 */}
      <Suspense fallback={null}>
        <EditOptionModal
          isOpen={editOptionModal.isOpen}
          onClose={handleEditOptionClose}
          botId={editOptionModal.botId}
          onEditBasicInfo={handleEditBasicInfo}
        />
      </Suspense>

      {/* 編輯模態框 */}
      <Suspense fallback={null}>
        <BotEditModal
          isOpen={editModal.isOpen}
          onClose={handleEditModalClose}
          botId={editModal.botId}
          editType={editModal.editType}
          onBotUpdated={handleBotUpdated}
        />
      </Suspense>

      {/* Bot詳情模態框 */}
      <Suspense fallback={null}>
        <BotDetailsModal
          isOpen={detailsModal.isOpen}
          onClose={closeDetailsModal}
          bot={detailsModal.bot}
        />
      </Suspense>

      {/* Help Section */}
      <div className="mt-8 bg-secondary rounded-lg p-6 border border-border">
        <div className="flex items-center mb-4">
          <FileText className="h-6 w-6 text-foreground mr-2" />
          <h3 className="text-lg font-semibold text-foreground">需要幫助？</h3>
        </div>
        <p className="text-muted-foreground mb-4">
          查看我們的建立教學，了解如何快速開始您的 LINE Bot 開發之旅。
        </p>
        <Button
          asChild
          variant="outline"
          className="border-border text-foreground hover:bg-secondary"
        >
          <Link to="/how-to-establish">查看教學</Link>
        </Button>
      </div>
    </div>
  );
};

export default HomeBotfly;
