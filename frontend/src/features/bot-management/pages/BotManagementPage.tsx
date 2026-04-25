import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, BarChart3, Users, Settings, Zap } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import DashboardNavbar from "@/components/layout/DashboardNavbar";
import DashboardFooter from "@/components/layout/DashboardFooter";
import { apiClient } from "@/services/UnifiedApiClient";
import { Bot as BotType, LogicTemplate } from "@/types/bot";
import { getWebhookUrl } from "@/config/apiConfig";
import UserDetailsModal from "../components/users/UserDetailsModal";

// 導入配額管理相關元件
import { useQuotaStatus } from "@/hooks/useQuotaStatus";
import AnalyticsTabContent from "@/features/bot-management/components/AnalyticsTabContent";
import BotSelectorCard from "@/features/bot-management/components/BotSelectorCard";
import ControlTabContent from "@/features/bot-management/components/ControlTabContent";
import LogicTabContent from "@/features/bot-management/components/LogicTabContent";
import UsersTabContent from "@/features/bot-management/components/UsersTabContent";
import {
  ActivityItem,
  BotAnalytics,
  GetBotUsersResponse,
  GetUserInteractionsResponse,
  LineUser,
  MessageStats,
  PaginationInfo,
  UsageData,
  UserActivity,
  UserInteraction,
  WebhookStatus,
} from "@/features/bot-management/types/botManagement";
import {
  addUsageColors,
  convertBackendDataToActivityItem,
  extractActivityData,
  getDaysFromTimeRange,
  getGranularityFromTimeRange,
} from "@/features/bot-management/utils/botManagementTransforms";

const BotManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // 狀態管理
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [bots, setBots] = useState<BotType[]>([]);
  const [logicTemplates, setLogicTemplates] = useState<LogicTemplate[]>([]);
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);
  const [messageStats, setMessageStats] = useState<MessageStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [logicLoading, setLogicLoading] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(
    null
  );
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("week");
  const [_refreshing, setRefreshing] = useState(false);
  const [botHealth, setBotHealth] = useState<"online" | "offline" | "error">(
    "online"
  );
  const [_lastRenderTime, setLastRenderTime] = useState(
    new Date().toISOString()
  );

  // 用戶管理相關狀態
  const [users, setUsers] = useState<LineUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    offset: 0,
    has_next: false,
    has_prev: false,
  });
  const [selectedUser, setSelectedUser] = useState<LineUser | null>(null);
  const [_userInteractions, _setUserInteractions] = useState<UserInteraction[]>(
    []
  );
  const [usersLoading, setUsersLoading] = useState(false);
  const [_interactionsLoading, _setInteractionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [currentChatUser, setCurrentChatUser] = useState<LineUser | null>(null);
  const [selectiveBroadcastLoading, setSelectiveBroadcastLoading] =
    useState(false);
  const [_mediaUrls, _setMediaUrls] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("analytics");

  // WebSocket 即時連接 - 在選擇 Bot 後立即連接，由 useWebSocket 內部處理延遲
  const { isConnected, connectionError, lastMessage } = useWebSocket({
    botId: selectedBotId || undefined,
    autoReconnect: true,
    // 只要選中了 Bot 就啟用 WebSocket，連接時序由 hook 內部處理
    enabled: !!selectedBotId,
  });

  // 創建穩定的 WebSocket 連接檢查函數，避免每次渲染都創建新函數
  const checkWebSocketConnection = useCallback(
    () => isConnected,
    [isConnected]
  );

  // 配額狀態查詢 - 每 5 分鐘自動刷新一次
  const {
    quotaStatus,
    isLoading: quotaLoading,
    error: quotaError,
    refetch: refetchQuota,
  } = useQuotaStatus({
    botId: selectedBotId,
    enabled: !!selectedBotId && activeTab === "control", // 只在控制頁籤時啟用
    refreshInterval: 5 * 60 * 1000, // 5 分鐘
  });

  // 獲取用戶的 Bot 列表 - 修復循環依賴
  const fetchBots = useCallback(async () => {
    try {
      const response = await apiClient.getBots();
      if (response.data && Array.isArray(response.data)) {
        setBots(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("獲取 Bot 列表失敗:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: "無法載入 Bot 列表",
      });
      return [];
    }
  }, [toast]); // 移除 selectedBotId 依賴

  // 獲取邏輯模板
  const fetchLogicTemplates = useCallback(async (botId: string) => {
    setLogicLoading(true);
    try {
      const response = await apiClient.getBotLogicTemplates(botId);
      if (response.data && Array.isArray(response.data)) {
        setLogicTemplates(response.data);
      }
    } catch (error) {
      console.error("獲取邏輯模板失敗:", error);
    } finally {
      setLogicLoading(false);
    }
  }, []);

  // 獲取分析數據 - 使用真實API，改善錯誤處理
  const fetchAnalytics = useCallback(
    async (botId: string, abortSignal?: AbortSignal, isInitialLoad = false) => {
      setAnalyticsLoading(true);
      let hasError = false;
      let errorCount = 0;

      try {
        // 檢查是否已被中止
        if (abortSignal?.aborted) {
          return;
        }

        const queryDays = getDaysFromTimeRange(timeRange);
        const granularity = getGranularityFromTimeRange(timeRange);

        // 使用 apiClient 調用真實的後端API端點
        const [
          analyticsRes,
          messageStatsRes,
          userActivityRes,
          usageStatsRes,
          activitiesRes,
        ] = await Promise.all([
          apiClient.getBotAnalytics(botId, timeRange),
          apiClient.getBotMessageStats(botId, queryDays, granularity), // 根據時間範圍動態調整天數和粒度
          apiClient.getBotUserActivity(botId),
          apiClient.getBotUsageStats(botId),
          apiClient.getBotActivities(botId, 20, 0),
        ]);

        // 處理分析數據響應
        if (analyticsRes.data && !analyticsRes.error) {
          setAnalytics(analyticsRes.data as BotAnalytics);
          setBotHealth("online");
        } else {
          errorCount++;
          if (!String(analyticsRes.error).includes("AbortError")) {
            console.warn("Analytics API 響應錯誤:", analyticsRes.error);
            hasError = true;
          }
        }

        // 處理訊息統計數據
        if (messageStatsRes.data && !messageStatsRes.error) {
          setMessageStats(
            Array.isArray(messageStatsRes.data)
              ? (messageStatsRes.data as MessageStats[])
              : []
          );
        } else {
          errorCount++;
          if (!String(messageStatsRes.error).includes("AbortError")) {
            console.warn("Message stats API 響應錯誤:", messageStatsRes.error);
            hasError = true;
          }
          setMessageStats([]);
        }

        // 處理用戶活躍度數據
        if (userActivityRes.data && !userActivityRes.error) {
          setUserActivity(
            Array.isArray(userActivityRes.data)
              ? (userActivityRes.data as UserActivity[])
              : []
          );
        } else {
          errorCount++;
          if (!String(userActivityRes.error).includes("AbortError")) {
            console.warn("User activity API 響應錯誤:", userActivityRes.error);
            hasError = true;
          }
          setUserActivity([]);
        }

        // 處理使用統計數據
        if (usageStatsRes.data && !usageStatsRes.error) {
          setUsageData(addUsageColors(usageStatsRes.data));
        } else {
          errorCount++;
          if (!String(usageStatsRes.error).includes("AbortError")) {
            console.warn("Usage stats API 響應錯誤:", usageStatsRes.error);
            hasError = true;
          }
          setUsageData([]);
        }

        // 處理活動記錄
        if (activitiesRes.data && !activitiesRes.error) {
          console.log("Activities API 原始響應:", activitiesRes.data);
          const activitiesData = extractActivityData(activitiesRes.data);
          console.log("提取後的活動數據:", activitiesData);
          const convertedActivities =
            convertBackendDataToActivityItem(activitiesData);
          console.log("轉換後的活動數據:", convertedActivities);

          setActivities(convertedActivities);
          console.log("成功設置活動數據，數量:", convertedActivities.length);
        } else {
          errorCount++;
          if (!String(activitiesRes.error).includes("AbortError")) {
            console.warn("Activities API 響應錯誤:", activitiesRes.error);
            console.warn("Activities API 完整響應:", activitiesRes);
            hasError = true;
          }
          setActivities([]);
        }

        // 根據錯誤情況設置 Bot 健康狀態
        if (errorCount >= 3) {
          setBotHealth("error");
        } else if (errorCount >= 1) {
          setBotHealth("offline");
        }

        // 只有在首次載入且有錯誤時才顯示錯誤提示
        if (isInitialLoad && hasError) {
          console.warn(`數據載入警告: ${errorCount}/5 個 API 端點返回錯誤`);
          // 不顯示 toast，避免影響用戶體驗，數據會在後續的刷新或 WebSocket 更新中修復
        }
      } catch (error: unknown) {
        // 如果是中止錯誤，不顯示錯誤訊息
        if ((error as Error)?.name === "AbortError" || abortSignal?.aborted) {
          console.log("分析數據請求被中止");
          return;
        }

        console.error("獲取分析數據失敗:", error);

        // 設置為離線狀態
        setBotHealth("error");

        // 只有在首次載入失敗時才顯示錯誤提示
        if (isInitialLoad) {
          toast({
            title: "數據載入失敗",
            description: "首次載入時發生錯誤，請刷新頁面或檢查網路連線",
            variant: "destructive",
            duration: 5000,
          });
        }

        // 只在初始加載時設置空數據，避免覆蓋現有數據
        if (isInitialLoad) {
          setAnalytics(null);
          setMessageStats([]);
          setUserActivity([]);
          setUsageData([]);
          setActivities([]);
        }
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [toast, timeRange]
  );

  // 切換邏輯模板狀態
  const toggleLogicTemplate = async (templateId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await apiClient.activateLogicTemplate(templateId);
      } else {
        await apiClient.deactivateLogicTemplate(templateId);
      }

      if (selectedBotId) {
        await fetchLogicTemplates(selectedBotId);
      }

      toast({
        title: isActive ? "啟用成功" : "停用成功",
        description: `邏輯模板已${isActive ? "啟用" : "停用"}`,
      });
    } catch (error) {
      console.error("切換邏輯模板狀態失敗:", error);
      toast({
        variant: "destructive",
        title: "操作失敗",
        description: "無法切換邏輯模板狀態",
      });
    }
  };

  // 用戶管理相關函數
  // 獲取用戶列表
  const fetchUsers = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      if (!selectedBotId) return;

      setUsersLoading(true);
      try {
        const response = await apiClient.getBotUsers(
          selectedBotId,
          limit,
          offset
        );

        if (response.data) {
          const data = response.data as Partial<GetBotUsersResponse>;
          const users = (data.users as LineUser[] | undefined) || [];
          setUsers(users);
          setTotalCount((data.total_count as number | undefined) || 0);
          setPagination(
            (data.pagination as PaginationInfo | undefined) || {
              limit,
              offset,
              has_next: false,
              has_prev: false,
            }
          );
        }
      } catch (error) {
        console.error("獲取用戶列表失敗:", error);
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: "無法載入用戶列表",
        });
      } finally {
        setUsersLoading(false);
      }
    },
    [selectedBotId, toast]
  );

  // 靜默更新用戶列表（WebSocket 更新時使用，不顯示 loading）
  const fetchUsersSilently = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      if (!selectedBotId) return;

      try {
        const response = await apiClient.getBotUsers(
          selectedBotId,
          limit,
          offset
        );

        if (response.data && !response.error) {
          // 使用函數式更新，保持其他狀態不變
          const data = response.data as Partial<GetBotUsersResponse>;
          setUsers((data.users as LineUser[] | undefined) || []);
          setTotalCount((data.total_count as number | undefined) || 0);
          setPagination((prev) => ({
            ...prev,
            ...(data.pagination as PaginationInfo | undefined),
            limit,
            offset,
          }));
        }
      } catch (error) {
        console.error("靜默更新用戶列表失敗:", error);
        // 靜默處理錯誤，不顯示通知
      }
    },
    [selectedBotId]
  );

  // 獲取用戶互動歷史
  const fetchUserInteractions = useCallback(
    async (lineUserId: string) => {
      if (!selectedBotId) return;

      _setInteractionsLoading(true);
      try {
        const response = await apiClient.getUserInteractions(
          selectedBotId,
          lineUserId
        );

        if (response.data) {
          const data = response.data as Partial<GetUserInteractionsResponse>;
          const interactions =
            (data.interactions as UserInteraction[] | undefined) || [];
          _setUserInteractions(interactions);
        }
      } catch (error) {
        console.error("獲取用戶互動失敗:", error);
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: "無法載入用戶互動歷史",
        });
      } finally {
        _setInteractionsLoading(false);
      }
    },
    [selectedBotId, toast]
  );

  // 靜默更新用戶互動記錄（WebSocket 更新時使用，不顯示 loading）
  const fetchUserInteractionsSilently = useCallback(
    async (lineUserId: string) => {
      if (!selectedBotId) return;

      try {
        const response = await apiClient.getUserInteractions(
          selectedBotId,
          lineUserId
        );

        if (response.data && !response.error) {
          const d = response.data as Partial<{
            interactions: UserInteraction[];
          }>;
          _setUserInteractions(
            (d.interactions as UserInteraction[] | undefined) || []
          );
        }
      } catch (error) {
        console.error("靜默更新用戶互動記錄失敗:", error);
        // 靜默處理錯誤，不顯示通知
      }
    },
    [selectedBotId]
  );

  // 廣播訊息
  const handleBroadcast = async () => {
    if (!selectedBotId || !broadcastMessage.trim()) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請填寫廣播訊息內容",
      });
      return;
    }

    setBroadcastLoading(true);
    try {
      await apiClient.broadcastMessage(selectedBotId, {
        message: broadcastMessage,
      });

      toast({
        title: "廣播成功",
        description: "訊息已發送給所有關注者",
      });

      setBroadcastMessage("");
    } catch (error) {
      console.error("廣播失敗:", error);
      toast({
        variant: "destructive",
        title: "廣播失敗",
        description: "無法發送廣播訊息",
      });
    } finally {
      setBroadcastLoading(false);
    }
  };

  // 處理分頁
  const handlePageChange = (newOffset: number) => {
    fetchUsers(pagination.limit, newOffset);
  };

  // 處理用戶選擇
  const handleUserSelect = (user: LineUser) => {
    setSelectedUser(user);
    fetchUserInteractions(user.line_user_id);
  };

  // 處理用戶多選
  const handleUserCheck = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  // 全選/取消全選
  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(
        new Set(filteredUsers.map((user) => user.line_user_id))
      );
    }
  };

  // 開始聊天
  const handleStartChat = (user: LineUser) => {
    setCurrentChatUser(user);
    setShowChatPanel(true);
  };

  // 查看用戶詳情
  const handleViewUserDetails = (user: LineUser) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  // 選擇性廣播
  const handleSelectiveBroadcast = async () => {
    if (
      !selectedBotId ||
      !broadcastMessage.trim() ||
      selectedUserIds.size === 0
    ) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請選擇用戶並填寫廣播訊息內容",
      });
      return;
    }

    setSelectiveBroadcastLoading(true);
    try {
      await apiClient.selectiveBroadcastMessage(selectedBotId, {
        message: broadcastMessage,
        user_ids: Array.from(selectedUserIds),
      });

      toast({
        title: "廣播成功",
        description: `訊息已發送給 ${selectedUserIds.size} 個選中的用戶`,
      });

      setBroadcastMessage("");
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error("選擇性廣播失敗:", error);
      toast({
        variant: "destructive",
        title: "廣播失敗",
        description: "無法發送選擇性廣播訊息",
      });
    } finally {
      setSelectiveBroadcastLoading(false);
    }
  };

  // 過濾用戶列表
  const filteredUsers = users.filter(
    (user) =>
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.line_user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 複製 Webhook URL
  const handleCopyWebhookUrl = async () => {
    if (!selectedBotId) return;

    try {
      const webhookUrl = getWebhookUrl(selectedBotId);
      await navigator.clipboard.writeText(webhookUrl);

      setCopiedWebhookUrl(true);
      toast({
        title: "複製成功",
        description: "Webhook URL 已複製到剪貼簿",
      });

      // 2秒後重置圖標狀態
      setTimeout(() => {
        setCopiedWebhookUrl(false);
      }, 2000);
    } catch (error) {
      console.error("複製 Webhook URL 失敗:", error);
      toast({
        variant: "destructive",
        title: "複製失敗",
        description: "無法複製 Webhook URL",
      });
    }
  };

  // 獲取 Webhook 狀態
  const fetchWebhookStatus = useCallback(async (botId: string) => {
    if (!botId) return;

    setWebhookStatusLoading(true);
    try {
      const response = await apiClient.getWebhookStatus(botId);
      if (response.data && !response.error) {
        const statusData = response.data as WebhookStatus;
        setWebhookStatus(statusData);

        // 根據 Webhook 狀態設置 Bot 健康狀態
        if (statusData.status === "active") {
          setBotHealth("online");
        } else if (statusData.status === "not_configured") {
          setBotHealth("error");
        } else if (statusData.status === "configuration_error") {
          setBotHealth("error");
        } else {
          setBotHealth("offline");
        }
      } else {
        setWebhookStatus(null);
        setBotHealth("error");
      }
    } catch (error) {
      console.error("獲取 Webhook 狀態失敗:", error);
      setWebhookStatus(null);
      setBotHealth("error");
    } finally {
      setWebhookStatusLoading(false);
    }
  }, []);

  // 檢查 Webhook 狀態
  const handleCheckWebhookStatus = async () => {
    if (!selectedBotId) return;
    await fetchWebhookStatus(selectedBotId);
  };

  // 處理時間範圍變更
  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    if (selectedBotId) {
      // 時間範圍變更不算作初始載入，可以顯示錯誤提示
      fetchAnalytics(selectedBotId, undefined, false);
    }
  };

  // 手動刷新數據
  const handleRefreshData = async () => {
    if (!selectedBotId) return;
    setRefreshing(true);
    try {
      // 使用統一的 fetchAnalytics 函數來刷新所有數據
      await fetchAnalytics(selectedBotId, undefined, false);
      toast({
        title: "刷新完成",
        description: "數據已更新",
      });
    } catch (_error) {
      toast({
        title: "刷新失敗",
        description: "無法獲取最新數據",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 單獨刷新活動數據
  const handleRefreshActivities = async () => {
    if (!selectedBotId) return;
    console.log("手動刷新活動數據...");

    try {
      const response = await apiClient.getBotActivities(selectedBotId, 20, 0);
      console.log("手動刷新活動 API 響應:", response);

      if (response.data && !response.error) {
        console.log("手動刷新 - 原始響應數據:", response.data);
        const activitiesData = extractActivityData(response.data);
        console.log("手動刷新 - 提取後的活動數據:", activitiesData);

        const convertedActivities =
          convertBackendDataToActivityItem(activitiesData);
        console.log("手動刷新 - 轉換後的活動數據:", convertedActivities);

        setActivities(convertedActivities);
        toast({
          title: "活動數據已刷新",
          description: `載入了 ${convertedActivities.length} 條活動記錄`,
        });
      } else {
        toast({
          title: "刷新活動失敗",
          description: response.error || "無法獲取活動數據",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("手動刷新活動錯誤:", error);
      toast({
        title: "刷新活動失敗",
        description: "網路錯誤或服務器不可用",
        variant: "destructive",
      });
    }
  };

  // 處理Bot健康檢查
  const handleCheckBotHealth = async () => {
    if (!selectedBotId) return;

    setControlLoading(true);

    try {
      // 使用 webhook status API 來檢查 Bot 狀態
      const response = await apiClient.getWebhookStatus(selectedBotId);

      if (response.data && !response.error) {
        const statusData = response.data as WebhookStatus;

        // 根據 Bot 的配置和 LINE API 連接狀態設定健康狀態
        if (statusData.status === "active") {
          setBotHealth("online");
          toast({
            title: "狀態檢查",
            description: "Bot 運作正常，Webhook 已綁定",
          });
        } else if (statusData.status === "not_configured") {
          setBotHealth("error");
          toast({
            title: "狀態檢查",
            description: "Bot 尚未配置 Channel Token 或 Channel Secret",
            variant: "destructive",
          });
        } else if (statusData.status === "configuration_error") {
          setBotHealth("error");
          toast({
            title: "狀態檢查",
            description: "Bot 配置錯誤，無法連接 LINE API",
            variant: "destructive",
          });
        } else {
          setBotHealth("offline");
          toast({
            title: "狀態檢查",
            description: "Bot 已配置但 Webhook 未綁定",
            variant: "destructive",
          });
        }
      } else {
        setBotHealth("error");
        toast({
          variant: "destructive",
          title: "檢查失敗",
          description: response.error || "無法獲取 Bot 狀態",
        });
      }
    } catch (_error) {
      setBotHealth("error");
      toast({
        variant: "destructive",
        title: "檢查失敗",
        description: "網路錯誤，無法檢查 Bot 狀態",
      });
    } finally {
      setControlLoading(false);
    }
  };

  // 初始化數據 - 修復循環依賴
  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const botList = await fetchBots();

        // 只在初始化時設置第一個 Bot，避免循環依賴
        if (botList.length > 0 && !selectedBotId) {
          setSelectedBotId(botList[0].id);
        }
      } catch (error) {
        console.error("初始化數據失敗:", error);
        toast({
          variant: "destructive",
          title: "初始化失敗",
          description: "載入頁面資料時發生錯誤，請刷新頁面重試",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, fetchBots, selectedBotId, toast]); // 加入缺少的依賴項

  // 當選擇的 Bot 變化時清空舊資料並獲取新資料
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    const isInitialLoad = true;

    const fetchBotData = async () => {
      if (selectedBotId && isMounted) {
        // 清空前一個 Bot 的所有相關資料
        setUsers([]);
        setTotalCount(0);
        setPagination({
          limit: 20,
          offset: 0,
          has_next: false,
          has_prev: false,
        });
        setSelectedUser(null);
        setShowChatPanel(false);
        setShowUserDetails(false);
        setCurrentChatUser(null);
        setSelectedUserIds(new Set());
        setSearchTerm("");
        setBroadcastMessage("");
        setLogicTemplates([]);
        setWebhookStatus(null);

        try {
          // 順序載入，避免並發問題
          // 1. 先載入邏輯模板和 Webhook 狀態（較快的 API）
          await Promise.all([
            fetchLogicTemplates(selectedBotId),
            fetchWebhookStatus(selectedBotId),
          ]);

          // 2. 檢查是否還在載入中且未被取消
          if (isMounted && !abortController.signal.aborted) {
            // 延遲載入分析數據，給其他 API 更多時間完成
            await new Promise((resolve) => setTimeout(resolve, 100));
            await fetchAnalytics(
              selectedBotId,
              abortController.signal,
              isInitialLoad
            );
          }
        } catch (error: unknown) {
          if (isMounted && (error as Error).name !== "AbortError") {
            console.error("獲取 Bot 數據失敗:", error);
          }
        }
      }
    };

    fetchBotData();

    // 清理函數 - 延遲中止避免影響正在進行的關鍵請求
    return () => {
      isMounted = false;
      // 延遲中止，給正在進行的關鍵請求一些時間完成
      setTimeout(() => {
        if (!abortController.signal.aborted) {
          abortController.abort("Bot changed or component unmounting");
        }
      }, 500);
    };
  }, [
    selectedBotId,
    fetchLogicTemplates,
    fetchAnalytics,
    fetchWebhookStatus,
    toast,
  ]);

  // 當切換到用戶管理 Tab 時載入用戶數據
  useEffect(() => {
    if (activeTab === "users" && selectedBotId) {
      // 移除 users.length === 0 的條件，確保每次切換 Bot 或進入用戶 Tab 時都會重新載入
      fetchUsers();
    }
  }, [activeTab, selectedBotId, fetchUsers]);

  // 處理 WebSocket 即時更新消息
  useEffect(() => {
    if (!lastMessage || !selectedBotId) return;

    // 確保消息是針對當前選中的 Bot
    if (lastMessage.bot_id !== selectedBotId) {
      return;
    }

    switch (lastMessage.type) {
      case "analytics_update": {
        console.log("🔄 收到 analytics_update WebSocket 事件，開始更新數據...");

        const queryDays = getDaysFromTimeRange(timeRange);
        const granularity = getGranularityFromTimeRange(timeRange);
        console.log(
          `📊 當前時間範圍: ${timeRange}, 查詢天數: ${queryDays}, 粒度: ${granularity}`
        );

        // 靜默更新所有分析相關數據，保持其他數據不變
        Promise.all([
          apiClient.getBotAnalytics(selectedBotId, timeRange),
          apiClient.getBotMessageStats(selectedBotId, queryDays, granularity), // 根據時間範圍動態調整天數和粒度
          apiClient.getBotUserActivity(selectedBotId),
          apiClient.getBotUsageStats(selectedBotId),
        ])
          .then(
            ([
              analyticsRes,
              messageStatsRes,
              userActivityRes,
              usageStatsRes,
            ]) => {
              console.log("📈 WebSocket 觸發的 API 響應:", {
                analytics: analyticsRes.data ? "✅" : "❌",
                messageStats: messageStatsRes.data ? "✅" : "❌",
                userActivity: userActivityRes.data ? "✅" : "❌",
                usageStats: usageStatsRes.data ? "✅" : "❌",
              });

              // 更新分析數據
              if (analyticsRes.data && !analyticsRes.error) {
                const analyticsData = analyticsRes.data as BotAnalytics;
                setAnalytics(
                  (prev) =>
                    ({
                      ...prev,
                      totalMessages:
                        analyticsData.totalMessages || prev?.totalMessages || 0,
                      activeUsers:
                        analyticsData.activeUsers || prev?.activeUsers || 0,
                      responseTime:
                        analyticsData.responseTime || prev?.responseTime || 0,
                      successRate:
                        analyticsData.successRate || prev?.successRate || 0,
                      todayMessages:
                        analyticsData.todayMessages || prev?.todayMessages || 0,
                      weekMessages:
                        analyticsData.weekMessages || prev?.weekMessages || 0,
                      monthMessages:
                        analyticsData.monthMessages || prev?.monthMessages || 0,
                    }) as BotAnalytics
                );
                console.log("✅ Analytics 數據已更新");
              }

              // 更新訊息統計圖表數據
              if (messageStatsRes.data && !messageStatsRes.error) {
                const newMessageStats = Array.isArray(messageStatsRes.data)
                  ? (messageStatsRes.data as MessageStats[])
                  : [];
                setMessageStats(newMessageStats);
                console.log("📊 MessageStats 數據已更新:", {
                  數據長度: newMessageStats.length,
                  第一個: newMessageStats[0],
                  最後一個: newMessageStats[newMessageStats.length - 1],
                });
              }

              // 更新用戶活躍度數據
              if (userActivityRes.data && !userActivityRes.error) {
                setUserActivity(
                  Array.isArray(userActivityRes.data)
                    ? (userActivityRes.data as UserActivity[])
                    : []
                );
              }

              // 更新使用統計數據
              if (usageStatsRes.data && !usageStatsRes.error) {
                setUsageData(addUsageColors(usageStatsRes.data));
              }
            }
          )
          .catch(() => {
            // 靜默處理錯誤，不影響用戶體驗
          });
        break;
      }

      case "activity_update": {
        if (lastMessage.data) {
          console.log("收到 WebSocket 活動更新:", lastMessage.data);
          // 靜默更新活動數據，保持其他數據不變
          apiClient
            .getBotActivities(selectedBotId, 20, 0)
            .then((response) => {
              console.log("WebSocket 觸發的活動 API 響應:", response);
              if (response.data && !response.error) {
                console.log("WebSocket - 原始響應數據:", response.data);

                const activitiesData = extractActivityData(response.data);
                console.log("WebSocket - 提取後的活動數據:", activitiesData);

                const convertedActivities =
                  convertBackendDataToActivityItem(activitiesData);
                console.log(
                  "WebSocket - 轉換後的活動數據:",
                  convertedActivities
                );

                setActivities(convertedActivities);
                console.log(
                  "WebSocket 成功更新活動數據，數量:",
                  convertedActivities.length
                );

                toast({
                  title: "新活動",
                  description: "檢測到新的 Bot 活動",
                  duration: 3000,
                });
              } else {
                console.error("WebSocket 活動 API 調用失敗:", response.error);
              }
            })
            .catch((error) => {
              console.error("WebSocket 活動更新錯誤:", error);
            });

          // 如果在用戶管理 Tab，也更新用戶列表
          if (activeTab === "users") {
            fetchUsersSilently(pagination.limit, pagination.offset);
            // 如果有選中的用戶，靜默更新其互動記錄
            if (selectedUser) {
              fetchUserInteractionsSilently(selectedUser.line_user_id);
            }
          }
        }
        break;
      }

      case "new_user_message": {
        // 收到新用戶訊息時更新用戶列表和對話記錄
        if (lastMessage?.data) {
          const lm = lastMessage as unknown;
          const lineUserId =
            lm &&
            typeof lm === "object" &&
            "line_user_id" in (lm as Record<string, unknown>)
              ? String((lm as { line_user_id?: string }).line_user_id)
              : undefined;
          if (lineUserId && activeTab === "users") {
            // 靜默更新用戶列表以更新互動次數和最後互動時間
            fetchUsersSilently(pagination.limit, pagination.offset);

            // 如果當前選中的用戶就是發送訊息的用戶，更新其互動記錄
            if (selectedUser && selectedUser.line_user_id === lineUserId) {
              fetchUserInteractionsSilently(selectedUser.line_user_id);
            }

            // 顯示新訊息通知
            toast({
              title: "收到新訊息",
              description: "用戶發送了新訊息",
              duration: 2000,
            });
          }
        }
        break;
      }

      case "webhook_status_update":
        setWebhookStatusLoading(true);
        apiClient
          .getWebhookStatus(selectedBotId)
          .then((response) => {
            if (response.data) {
              setWebhookStatus(response.data as WebhookStatus);
            }
          })
          .catch(() => {
            // 靜默處理錯誤
          })
          .finally(() => {
            setWebhookStatusLoading(false);
          });
        break;

      case "pong":
        setBotHealth("online");
        break;

      default:
      // 未處理的消息類型
    }
  }, [
    lastMessage,
    selectedBotId,
    timeRange,
    toast,
    activeTab,
    pagination.limit,
    pagination.offset,
    selectedUser,
    fetchUsersSilently,
    fetchUserInteractionsSilently,
  ]);

  // 更新渲染時間
  useEffect(() => {
    const renderTime = new Date().toISOString();
    setLastRenderTime(renderTime);

    // 更新文檔標題
    if (analytics) {
      document.title = `Bot Management - ${analytics.totalMessages || 0} messages`;
    }
  }, [analytics]);

  // 處理加載狀態 - 改善載入體驗
  if (authLoading) {
    return <Loader fullPage={true} />;
  }

  // 如果用戶已認證但仍在載入 Bot 列表，顯示載入器
  if (loading && bots.length === 0) {
    return <Loader fullPage={true} />;
  }

  const selectedBot = bots.find((bot) => bot.id === selectedBotId);

  return (
    <div className="min-h-screen flex flex-col bg-transparent dark:bg-background">
      <DashboardNavbar user={user} />

      <div className="flex-1 mt-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 頁面標題 */}
          <div className="mb-6">
            <h1 className="web3-section-title mb-1">LINE Bot 管理中心</h1>
            <p className="text-muted-foreground">
              監控與控制您的 LINE Bot，管理邏輯與分析數據
            </p>
          </div>

          <BotSelectorCard
            bots={bots}
            selectedBot={selectedBot}
            selectedBotId={selectedBotId}
            isConnected={isConnected}
            connectionError={connectionError}
            onSelectBot={setSelectedBotId}
          />

          {bots.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-10">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  先建立第一個 LINE Bot
                </h2>
                <p className="text-muted-foreground mb-6">
                  建立完成後即可在同一條流程中管理 Webhook、邏輯模板、Rich Menu、AI 知識庫與用戶互動。
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate("/bots/create")}
                    className="web3-primary-button"
                  >
                    建立第一個 Bot
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/how-to-establish")}
                  >
                    查看建立教學
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {bots.length > 0 && (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-4 rounded-lg bg-muted p-1">
                <TabsTrigger
                  value="analytics"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  數據分析
                </TabsTrigger>
                <TabsTrigger
                  value="control"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Bot 控制
                </TabsTrigger>
                <TabsTrigger
                  value="logic"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  邏輯管理
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  用戶管理
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsTabContent
                  selectedBotId={selectedBotId}
                  analyticsLoading={analyticsLoading}
                  analytics={analytics}
                  messageStats={messageStats}
                  userActivity={userActivity}
                  activities={activities}
                  usageData={usageData}
                  timeRange={timeRange}
                  onRefreshData={handleRefreshData}
                  onRefreshActivities={handleRefreshActivities}
                  onTimeRangeChange={handleTimeRangeChange}
                  isWebSocketConnected={checkWebSocketConnection}
                />
              </TabsContent>

              <TabsContent value="control" className="space-y-6">
                <ControlTabContent
                  selectedBotId={selectedBotId}
                  selectedBot={selectedBot}
                  botHealth={botHealth}
                  isConnected={isConnected}
                  quotaStatus={quotaStatus}
                  quotaLoading={quotaLoading}
                  quotaError={quotaError}
                  webhookStatus={webhookStatus}
                  webhookStatusLoading={webhookStatusLoading}
                  copiedWebhookUrl={copiedWebhookUrl}
                  controlLoading={controlLoading}
                  onRefreshQuota={refetchQuota}
                  onCheckBotHealth={handleCheckBotHealth}
                  onCopyWebhookUrl={handleCopyWebhookUrl}
                  onCheckWebhookStatus={handleCheckWebhookStatus}
                />
              </TabsContent>

              <TabsContent value="logic" className="space-y-6">
                <LogicTabContent
                  selectedBotId={selectedBotId}
                  logicLoading={logicLoading}
                  logicTemplates={logicTemplates}
                  onToggleLogicTemplate={toggleLogicTemplate}
                />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <UsersTabContent
                  selectedBotId={selectedBotId}
                  broadcastMessage={broadcastMessage}
                  totalCount={totalCount}
                  selectedUserIds={selectedUserIds}
                  filteredUsers={filteredUsers}
                  usersLoading={usersLoading}
                  selectedUser={selectedUser}
                  pagination={pagination}
                  broadcastLoading={broadcastLoading}
                  selectiveBroadcastLoading={selectiveBroadcastLoading}
                  searchTerm={searchTerm}
                  showChatPanel={showChatPanel}
                  currentChatUser={currentChatUser}
                  onBroadcastMessageChange={setBroadcastMessage}
                  onSearchTermChange={setSearchTerm}
                  onBroadcast={handleBroadcast}
                  onSelectiveBroadcast={handleSelectiveBroadcast}
                  onSelectAll={handleSelectAll}
                  onUserCheck={handleUserCheck}
                  onUserSelect={handleUserSelect}
                  onViewUserDetails={handleViewUserDetails}
                  onStartChat={handleStartChat}
                  onPageChange={handlePageChange}
                  onCloseChatPanel={() => setShowChatPanel(false)}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <DashboardFooter />

      {/* 用戶詳細資訊彈窗 */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={showUserDetails}
        onClose={() => setShowUserDetails(false)}
      />
    </div>
  );
};

export default BotManagementPage;
