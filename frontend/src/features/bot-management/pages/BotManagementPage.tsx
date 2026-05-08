import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Bot as BotIcon,
  CheckCircle2,
  Radio,
  Wifi,
  Zap,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";
import { apiClient } from "@/services/UnifiedApiClient";
import { LogicTemplate } from "@/types/bot";

import AnalyticsTabContent from "@/features/bot-management/components/AnalyticsTabContent";
import LogicTabContent from "@/features/bot-management/components/LogicTabContent";
import {
  ActivityItem,
  BotAnalytics,
  MessageStats,
  UsageData,
  UserActivity,
  WebhookStatus,
} from "@/features/bot-management/types/botManagement";
import {
  addUsageColors,
  convertBackendDataToActivityItem,
  extractActivityData,
  getDaysFromTimeRange,
  getGranularityFromTimeRange,
} from "@/features/bot-management/utils/botManagementTransforms";

const managementCopy = {
  en: {
    sidebarSubtitle: "Workspace",
    botHealthTitle: "Bot is ready",
    botHealthBody: "Check connection, messages, and friends from here.",
    topbarKicker: "Interactions",
    welcome: "Welcome back",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    notifications: "Notifications",
    heroBadge: "Recent interactions",
    dateRange: "Last 7 days",
    title: "Interactions",
    subtitle:
      "Check messages, friends, connection status, and recent events for this LINE Bot.",
    channelStatus: "Channel status",
    webSocket: "WebSocket",
    botHealth: "Bot status",
    active: "Active",
    inactive: "Inactive",
    connected: "Connected",
    reconnecting: "Reconnecting",
    botSelector: "Bot Selector",
    selectBot: "Select bot",
    updated: "Updated",
    status: {
      active: "active",
      inactive: "inactive",
      connected: "connected",
      reconnecting: "reconnecting",
      running: "running",
      error: "error",
      idle: "idle",
    },
    noBotsTitle: "Create your first LINE Bot",
    noBotsBody:
      "After creation, you can design replies, set rich menus, and check interactions in one place.",
    createFirstBot: "Create first Bot",
    viewSetupGuide: "View setup guide",
    tabs: {
      analytics: "Overview",
      logic: "Reply settings",
    },
    documentTitle: "Bot Management",
  },
  zh: {
    sidebarSubtitle: "工作台",
    botHealthTitle: "Bot 目前正常",
    botHealthBody: "查看連線、訊息與好友互動。",
    topbarKicker: "互動紀錄",
    welcome: "歡迎回來",
    openNavigation: "開啟導覽",
    closeNavigation: "關閉導覽",
    notifications: "通知",
    heroBadge: "最近互動",
    dateRange: "最近 7 天",
    title: "互動紀錄",
    subtitle:
      "查看這個 Bot 的訊息、好友與連線狀態，需要調整回覆時也能快速進入。",
    channelStatus: "Channel 狀態",
    webSocket: "WebSocket",
    botHealth: "Bot 狀態",
    active: "啟用",
    inactive: "停用",
    connected: "已連線",
    reconnecting: "重新連線中",
    botSelector: "選擇 Bot",
    selectBot: "選擇 Bot",
    updated: "更新於",
    status: {
      active: "啟用",
      inactive: "停用",
      connected: "已連線",
      reconnecting: "重新連線中",
      running: "運行中",
      error: "異常",
      idle: "閒置",
    },
    noBotsTitle: "先建立第一個 LINE Bot",
    noBotsBody:
      "建立完成後，就能在這裡設計回覆、設定圖文選單，並查看最近互動。",
    createFirstBot: "建立第一個 Bot",
    viewSetupGuide: "查看建立教學",
    tabs: {
      analytics: "總覽",
      logic: "回覆設定",
    },
    documentTitle: "互動紀錄",
  },
};

const ManagementLoadingPanel = () => (
  <section
    className="rounded-[16px] border border-white/70 bg-white/75 p-10 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl"
    aria-busy="true"
  >
    <Loader text="載入互動紀錄..." />
  </section>
);

const BotManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguagePreference();
  const copy = managementCopy[language];
  const {
    bots,
    selectedBotId,
    selectedBot,
    isLoading: botsLoading,
    refreshBots,
  } = useSelectedBot();

  // 狀態管理
  const [logicTemplates, setLogicTemplates] = useState<LogicTemplate[]>([]);
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);
  const [messageStats, setMessageStats] = useState<MessageStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [logicLoading, setLogicLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("week");
  const [_refreshing, setRefreshing] = useState(false);
  const [botHealth, setBotHealth] = useState<"online" | "offline" | "error">(
    "online"
  );
  const [_lastRenderTime, setLastRenderTime] = useState(
    new Date().toISOString()
  );

  const [activeTab, setActiveTab] = useState("analytics");

  // WebSocket 即時連接 - 在選擇 Bot 後立即連接，由 useWebSocket 內部處理延遲
  const { isConnected, lastMessage } = useWebSocket({
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
    async (
      botId: string,
      abortSignal?: AbortSignal,
      isInitialLoad = false,
      range = timeRange
    ) => {
      setAnalyticsLoading(true);
      let hasError = false;
      let errorCount = 0;

      try {
        // 檢查是否已被中止
        if (abortSignal?.aborted) {
          return;
        }

        const queryDays = getDaysFromTimeRange(range);
        const granularity = getGranularityFromTimeRange(range);

        // 使用 apiClient 調用真實的後端API端點
        const [
          analyticsRes,
          messageStatsRes,
          userActivityRes,
          usageStatsRes,
          activitiesRes,
        ] = await Promise.all([
          apiClient.getBotAnalytics(botId, range),
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
            title: "互動紀錄載入失敗",
            description: "首次載入時發生錯誤，請重新整理頁面或檢查網路連線",
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

  // 獲取 Webhook 狀態
  const fetchWebhookStatus = useCallback(async (botId: string) => {
    if (!botId) return;

    try {
      const response = await apiClient.getWebhookStatus(botId);
      if (response.data && !response.error) {
        const statusData = response.data as WebhookStatus;

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
        setBotHealth("error");
      }
    } catch (error) {
      console.error("獲取 Webhook 狀態失敗:", error);
      setBotHealth("error");
    }
  }, []);

  // 處理時間範圍變更
  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    if (selectedBotId) {
      // 時間範圍變更不算作初始載入，可以顯示錯誤提示
      fetchAnalytics(selectedBotId, undefined, false, newRange);
    }
  };

  // 手動刷新資料
  const handleRefreshData = async () => {
    if (!selectedBotId) return;
    setRefreshing(true);
    try {
      // 使用統一的 fetchAnalytics 函數來刷新所有數據
      await fetchAnalytics(selectedBotId, undefined, false);
      toast({
        title: "刷新完成",
      description: "互動紀錄已更新",
      });
    } catch (_error) {
      toast({
        title: "刷新失敗",
        description: "無法取得最新互動紀錄",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 單獨刷新活動資料
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
          title: "活動已刷新",
          description: `載入了 ${convertedActivities.length} 條活動記錄`,
        });
      } else {
        toast({
          title: "刷新活動失敗",
          description: response.error || "無法取得活動紀錄",
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

  // 初始化全域 Bot 列表
  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        await refreshBots();
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
  }, [user, refreshBots, toast]);

  // 當選擇的 Bot 變化時清空舊資料並獲取新資料
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    const isInitialLoad = true;

    const fetchBotData = async () => {
      if (selectedBotId && isMounted) {
        // 清空前一個 Bot 的所有相關資料
        setLogicTemplates([]);

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
                      ...analyticsData,
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

        }
        break;
      }

      case "webhook_status_update":
        void fetchWebhookStatus(selectedBotId);
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
    fetchWebhookStatus,
  ]);

  // 更新渲染時間
  useEffect(() => {
    const renderTime = new Date().toISOString();
    setLastRenderTime(renderTime);

    // 更新文檔標題
    if (analytics) {
      document.title = `${copy.documentTitle} - ${analytics.totalMessages || 0} messages`;
    }
  }, [analytics, copy.documentTitle]);

  const isInitialPageLoading =
    authLoading || ((loading || botsLoading) && bots.length === 0);

  return (
    <AppShell
      user={user}
      activeNav="analytics"
      headerKicker={copy.topbarKicker}
      welcomeLabel={copy.welcome}
      sidebarCalloutTitle={copy.botHealthTitle}
      sidebarCalloutBody={copy.botHealthBody}
      headerStatus={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bc-line-2)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--bc-ink-2)] shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[var(--bc-ink-3)]">{copy.channelStatus}</span>
            <span className="font-semibold text-[var(--bc-ink)]">
              {selectedBot?.is_active === false ? copy.inactive : copy.active}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bc-line-2)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--bc-ink-2)] shadow-sm">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[var(--bc-ink-3)]">{copy.webSocket}</span>
            <span className="font-semibold text-[var(--bc-ink)]">
              {isConnected ? copy.connected : copy.reconnecting}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bc-line-2)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--bc-ink-2)] shadow-sm">
            <Radio className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[var(--bc-ink-3)]">{copy.botHealth}</span>
            <span className="font-semibold text-[var(--bc-ink)]">
              {botHealth}
            </span>
          </span>
        </>
      }
    >
      <div className="mt-6 space-y-6">
        {isInitialPageLoading && <ManagementLoadingPanel />}

        {!isInitialPageLoading && bots.length === 0 && !loading && (
          <section className="rounded-[16px] border border-white/70 bg-white/75 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-emerald-100 text-[#16a34a]">
              <BotIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-950">
              {copy.noBotsTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {copy.noBotsBody}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={() => navigate("/bots/create")}
                className="rounded-[14px] bg-[#16a34a] px-5 font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803d]"
              >
                {copy.createFirstBot}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/how-to-establish")}
                className="rounded-[14px] border-emerald-100 bg-white/70 font-semibold text-slate-700 hover:bg-white"
              >
                {copy.viewSetupGuide}
              </Button>
            </div>
          </section>
        )}

        {!isInitialPageLoading && bots.length > 0 && (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="flex h-auto w-full justify-start gap-8 overflow-x-auto rounded-none border-b border-white/70 bg-transparent p-0">
              <TabsTrigger
                value="analytics"
                className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 text-sm font-semibold text-slate-500 shadow-none transition-colors data-[state=active]:border-[#16a34a] data-[state=active]:bg-transparent data-[state=active]:text-[#166534] data-[state=active]:shadow-none"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {copy.tabs.analytics}
              </TabsTrigger>
              <TabsTrigger
                value="logic"
                className="rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-2 text-sm font-semibold text-slate-500 shadow-none transition-colors data-[state=active]:border-[#16a34a] data-[state=active]:bg-transparent data-[state=active]:text-[#166534] data-[state=active]:shadow-none"
              >
                <Zap className="mr-2 h-4 w-4" />
                {copy.tabs.logic}
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

            <TabsContent value="logic" className="space-y-6">
              <LogicTabContent
                selectedBotId={selectedBotId}
                logicLoading={logicLoading}
                logicTemplates={logicTemplates}
                onToggleLogicTemplate={toggleLogicTemplate}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
};

export default BotManagementPage;
