import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bot,
  BarChart3,
  Users,
  MessageSquare,
  Settings,
  Eye,
  Activity,
  Clock,
  Target,
  Zap,
  Send,
  Copy,
  CheckCircle,
  Play,
  Pause,
  Search,
  Hash,
  User,
  ChevronLeft,
  ChevronRight,
  Info,
  UserCheck,
  CheckSquare,
  Square,
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import { useWebSocket } from "../hooks/useWebSocket";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { apiClient } from "../services/UnifiedApiClient";
import { Bot as BotType, LogicTemplate } from "@/types/bot";
import { getWebhookUrl } from "../config/apiConfig";

// 導入新的儀表板元件
import MetricCard from "@/components/dashboard/MetricCard";
import ChartWidget from "@/components/dashboard/ChartWidget";
import OptimizedActivityFeed from "@/components/optimized/OptimizedActivityFeed";
import HeatMap from "@/components/dashboard/HeatMap";

// 導入用戶管理相關元件
import ChatPanel from "../components/users/ChatPanel";
import UserDetailsModal from "../components/users/UserDetailsModal";

// 類型定義
interface BotAnalytics {
  totalMessages: number;
  activeUsers: number;
  responseTime: number;
  successRate: number;
  todayMessages: number;
  weekMessages: number;
  monthMessages: number;
}

interface MessageStats {
  date: string;
  sent: number;
  received: number;
}

interface UserActivity {
  hour: string;
  activeUsers: number;
}

interface UsageData {
  feature: string;
  usage: number;
  color: string;
}

interface HeatMapDataPoint {
  hour: number;
  day: number;
  value: number;
  label?: string;
}

interface ActivityItem {
  id: string;
  type: "message" | "user_join" | "user_leave" | "error" | "success" | "info";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    userId?: string;
    userName?: string;
    messageContent?: string;
    errorCode?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

// 用戶管理相關類型定義
interface LineUser {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url: string;
  status_message: string;
  language: string;
  first_interaction: string;
  last_interaction: string;
  interaction_count: string;
}

interface UserInteraction {
  id: string;
  event_type: string;
  message_type: string;
  message_content: MessageContent;
  media_url?: string;
  media_path?: string;
  timestamp: string;
}

interface PaginationInfo {
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

// 後端 API 回應型別
interface GetBotUsersResponse {
  users: LineUser[];
  total_count: number;
  pagination: PaginationInfo;
}

interface GetUserInteractionsResponse {
  interactions: UserInteraction[];
}

// 訊息內容類型定義
type MessageContent =
  | string
  | {
      text?: string | { text: string };
      content?: string;
      stickerId?: string;
      packageId?: string;
      title?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      [key: string]: unknown;
    };

// 後端資料結構介面（從資料庫查詢結果）
interface BackendActivityData {
  id?: string;
  line_bot_user_interactions_id?: string;
  interaction_type?: string;
  message_content?: string;
  timestamp?: string;
  created_at?: string;
  line_bot_users_id?: string;
  user_id?: string;
  username?: string;
  display_name?: string;
  [key: string]: unknown;
}

// 資料轉換函式：將後端資料轉換為前端 ActivityItem 格式
const convertBackendDataToActivityItem = (backendData: BackendActivityData[]): ActivityItem[] => {
  if (!Array.isArray(backendData)) {
    console.warn('後端資料不是陣列格式:', backendData);
    return [];
  }

  return backendData.map((item: BackendActivityData) => {
    // 取得 ID（優先使用 line_bot_user_interactions_id，其次使用 id）
    const id = item.line_bot_user_interactions_id || item.id || `activity_${Date.now()}_${Math.random()}`;
    
    // 根據互動類型決定活動類型
    let type: ActivityItem['type'] = 'info';
    let title = '未知活動';
    let description = '';
    
    switch (item.interaction_type) {
      case 'message':
        type = 'message';
        title = `用戶發送訊息`;
        description = item.message_content || '無內容';
        break;
      case 'join':
      case 'user_join':
        type = 'user_join';
        title = `新用戶加入`;
        description = `用戶 ${item.display_name || item.username || '匿名用戶'} 加入對話`;
        break;
      case 'leave':
      case 'user_leave':
        type = 'user_leave';
        title = `用戶離開`;
        description = `用戶 ${item.display_name || item.username || '匿名用戶'} 離開對話`;
        break;
      case 'follow':
        type = 'success';
        title = `用戶追蹤`;
        description = `用戶 ${item.display_name || item.username || '匿名用戶'} 開始追蹤機器人`;
        break;
      case 'unfollow':
        type = 'user_leave';
        title = `用戶取消追蹤`;
        description = `用戶 ${item.display_name || item.username || '匿名用戶'} 取消追蹤機器人`;
        break;
      default:
        type = 'info';
        title = `${item.interaction_type || '系統活動'}`;
        description = item.message_content || '無詳細資訊';
    }
    
    // 使用 timestamp 或 created_at，如果都沒有則使用當前時間
    const timestamp = item.timestamp || item.created_at || new Date().toISOString();
    
    return {
      id,
      type,
      title,
      description,
      timestamp,
      metadata: {
        userId: item.line_bot_users_id || item.user_id,
        userName: item.display_name || item.username,
        messageContent: item.message_content,
        interactionType: item.interaction_type,
        ...item // 保留其他所有欄位
      }
    };
  });
};

const BotManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useUnifiedAuth({ requireAuth: true, redirectTo: "/login" });
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
  const [heatMapData, setHeatMapData] = useState<HeatMapDataPoint[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [logicLoading, setLogicLoading] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<Record<string, unknown> | null>(null);
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("week");
  const [_refreshing, setRefreshing] = useState(false);
  const [botHealth, setBotHealth] = useState<"online" | "offline" | "error">("online");
  const [_lastRenderTime, setLastRenderTime] = useState(new Date().toISOString());

  // 用戶管理相關狀態
  const [users, setUsers] = useState<LineUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    offset: 0,
    has_next: false,
    has_prev: false
  });
  const [selectedUser, setSelectedUser] = useState<LineUser | null>(null);
  const [_userInteractions, _setUserInteractions] = useState<UserInteraction[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [_interactionsLoading, _setInteractionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [currentChatUser, setCurrentChatUser] = useState<LineUser | null>(null);
  const [selectiveBroadcastLoading, setSelectiveBroadcastLoading] = useState(false);
  const [_mediaUrls, _setMediaUrls] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("analytics");

  // WebSocket 即時連接 - 在選擇 Bot 後立即連接，由 useWebSocket 內部處理延遲
  const { isConnected, connectionError, lastMessage } = useWebSocket({
    botId: selectedBotId || undefined,
    autoReconnect: true,
    // 只要選中了 Bot 就啟用 WebSocket，連接時序由 hook 內部處理
    enabled: !!selectedBotId
  });

  // 創建穩定的 WebSocket 連接檢查函數，避免每次渲染都創建新函數
  const checkWebSocketConnection = useCallback(() => isConnected, [isConnected]);

  // 圖表配置
  const _chartConfig = {
    sent: {
      label: "發送",
      color: "hsl(var(--primary))",
    },
    received: {
      label: "接收",
      color: "hsl(var(--accent))",
    },
    activeUsers: {
      label: "活躍用戶",
      color: "hsl(222.2 84% 59%)",
    },
    usage: {
      label: "使用率",
      color: "hsl(215.4 16.3% 46.9%)",
    },
  };

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
  const fetchAnalytics = useCallback(async (botId: string, abortSignal?: AbortSignal, isInitialLoad = false) => {
    setAnalyticsLoading(true);
    let hasError = false;
    let errorCount = 0;
    
    try {
      // 檢查是否已被中止
      if (abortSignal?.aborted) {
        return;
      }

      // 根據時間範圍計算查詢天數
      const getDaysFromTimeRange = (range: string) => {
        switch (range) {
          case "day": return 1;
          case "week": return 7;
          case "month": return 30;
          default: return 30;
        }
      };

      const queryDays = getDaysFromTimeRange(timeRange);

      // 使用 apiClient 調用真實的後端API端點
      const [analyticsRes, messageStatsRes, userActivityRes, usageStatsRes, activitiesRes] = await Promise.all([
        apiClient.getBotAnalytics(botId, timeRange),
        apiClient.getBotMessageStats(botId, queryDays), // 根據時間範圍動態調整天數
        apiClient.getBotUserActivity(botId),
        apiClient.getBotUsageStats(botId),
        apiClient.getBotActivities(botId, 20, 0)
      ]);

      // 處理分析數據響應
      if (analyticsRes.data && !analyticsRes.error) {
        setAnalytics(analyticsRes.data as BotAnalytics);
        setBotHealth("online");
      } else {
        errorCount++;
        if (!String(analyticsRes.error).includes('AbortError')) {
          console.warn('Analytics API 響應錯誤:', analyticsRes.error);
          hasError = true;
        }
      }

      // 處理訊息統計數據
      if (messageStatsRes.data && !messageStatsRes.error) {
        setMessageStats(Array.isArray(messageStatsRes.data) ? messageStatsRes.data as MessageStats[] : []);
      } else {
        errorCount++;
        if (!String(messageStatsRes.error).includes('AbortError')) {
          console.warn('Message stats API 響應錯誤:', messageStatsRes.error);
          hasError = true;
        }
        setMessageStats([]);
      }

      // 處理用戶活躍度數據
      if (userActivityRes.data && !userActivityRes.error) {
        setUserActivity(Array.isArray(userActivityRes.data) ? userActivityRes.data as UserActivity[] : []);

        // 生成熱力圖數據
        const heatData: HeatMapDataPoint[] = [];
        if (Array.isArray(userActivityRes.data)) {
          (userActivityRes.data as UserActivity[]).forEach((activity: UserActivity) => {
            for (let day = 0; day < 7; day++) {
              heatData.push({
                hour: parseInt(activity.hour) || 0,
                day: day,
                value: activity.activeUsers || 0,
                label: `${activity.hour}:00`
              });
            }
          });
        }
        setHeatMapData(heatData);
      } else {
        errorCount++;
        if (!String(userActivityRes.error).includes('AbortError')) {
          console.warn('User activity API 響應錯誤:', userActivityRes.error);
          hasError = true;
        }
        setUserActivity([]);
        setHeatMapData([]);
      }

      // 處理使用統計數據
      if (usageStatsRes.data && !usageStatsRes.error) {
        // 定義顏色映射（活力配色方案，每個類別都有獨特顏色）
        const colorMapping: Record<string, string> = {
          "文字訊息": "#6366F1",  // 靛藍色 - 最常用的訊息類型，專業且有活力
          "圖片訊息": "#3B82F6",  // 天藍色 - 視覺媒體
          "影片訊息": "#8B5CF6",  // 紫色 - 動態媒體
          "語音訊息": "#10B981",  // 翠綠色 - 聲音媒體
          "貼圖訊息": "#F59E0B",  // 琥珀色 - 表情互動
          "位置訊息": "#EF4444",  // 玫瑰色 - 地理位置
          "其他類型": "#06B6D4"   // 青色 - 其他未分類
        };

        // 為後端數據添加顏色信息
        const dataWithColors = Array.isArray(usageStatsRes.data)
          ? (usageStatsRes.data as Array<{feature: string; usage: number; percentage: number}>).map(item => ({
              ...item,
              color: colorMapping[item.feature] || "#A4A6B0"
            }))
          : [];

        setUsageData(dataWithColors as UsageData[]);
      } else {
        errorCount++;
        if (!String(usageStatsRes.error).includes('AbortError')) {
          console.warn('Usage stats API 響應錯誤:', usageStatsRes.error);
          hasError = true;
        }
        setUsageData([]);
      }

      // 處理活動記錄
      if (activitiesRes.data && !activitiesRes.error) {
        console.log('Activities API 原始響應:', activitiesRes.data);
        
        let activitiesData: unknown = activitiesRes.data;
        
        // 嘗試從不同的可能結構中提取資料
        const dataObj = activitiesData as { activities?: unknown; data?: unknown };
        if (dataObj.activities && Array.isArray(dataObj.activities)) {
          activitiesData = dataObj.activities;
        } else if (dataObj.data && Array.isArray(dataObj.data)) {
          activitiesData = dataObj.data;
        } else if (!Array.isArray(activitiesData)) {
          console.warn('活動數據結構異常，嘗試轉換為陣列:', activitiesData);
          activitiesData = []; // 設為空陣列
        }
        
        console.log('提取後的活動數據:', activitiesData);
        
        if (Array.isArray(activitiesData)) {
          // 使用轉換函式處理後端資料
          const convertedActivities = convertBackendDataToActivityItem(activitiesData as BackendActivityData[]);
          console.log('轉換後的活動數據:', convertedActivities);
          
          setActivities(convertedActivities);
          console.log('成功設置活動數據，數量:', convertedActivities.length);
        } else {
          console.warn('活動數據不是數組格式:', typeof activitiesData, activitiesData);
          setActivities([]);
        }
      } else {
        errorCount++;
        if (!String(activitiesRes.error).includes('AbortError')) {
          console.warn('Activities API 響應錯誤:', activitiesRes.error);
          console.warn('Activities API 完整響應:', activitiesRes);
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
      if ((error as Error)?.name === 'AbortError' || abortSignal?.aborted) {
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
        setHeatMapData([]);
        setActivities([]);
      }

    } finally {
      setAnalyticsLoading(false);
    }
  }, [toast, timeRange]);

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
  const fetchUsers = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!selectedBotId) return;

    setUsersLoading(true);
    try {
      const response = await apiClient.getBotUsers(selectedBotId, limit, offset);

      if (response.data) {
        const data = response.data as Partial<GetBotUsersResponse>;
        const users = (data.users as LineUser[] | undefined) || [];
        setUsers(users);
        setTotalCount((data.total_count as number | undefined) || 0);
        setPagination((data.pagination as PaginationInfo | undefined) || {
          limit,
          offset,
          has_next: false,
          has_prev: false
        });
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
  }, [selectedBotId, toast]);

  // 靜默更新用戶列表（WebSocket 更新時使用，不顯示 loading）
  const fetchUsersSilently = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!selectedBotId) return;

    try {
      const response = await apiClient.getBotUsers(selectedBotId, limit, offset);

      if (response.data && !response.error) {
        // 使用函數式更新，保持其他狀態不變
        const data = response.data as Partial<GetBotUsersResponse>;
        setUsers((data.users as LineUser[] | undefined) || []);
        setTotalCount((data.total_count as number | undefined) || 0);
        setPagination(prev => ({
          ...prev,
          ...(data.pagination as PaginationInfo | undefined),
          limit,
          offset
        }));
      }
    } catch (error) {
      console.error("靜默更新用戶列表失敗:", error);
      // 靜默處理錯誤，不顯示通知
    }
  }, [selectedBotId]);

  // 獲取用戶互動歷史
  const fetchUserInteractions = useCallback(async (lineUserId: string) => {
    if (!selectedBotId) return;

    _setInteractionsLoading(true);
    try {
      const response = await apiClient.getUserInteractions(selectedBotId, lineUserId);

      if (response.data) {
        const data = response.data as Partial<GetUserInteractionsResponse>;
        const interactions = (data.interactions as UserInteraction[] | undefined) || [];
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
  }, [selectedBotId, toast]);

  // 靜默更新用戶互動記錄（WebSocket 更新時使用，不顯示 loading）
  const fetchUserInteractionsSilently = useCallback(async (lineUserId: string) => {
    if (!selectedBotId) return;

    try {
      const response = await apiClient.getUserInteractions(selectedBotId, lineUserId);

      if (response.data && !response.error) {
        const d = response.data as Partial<{ interactions: UserInteraction[] }>;
        _setUserInteractions((d.interactions as UserInteraction[] | undefined) || []);
      }
    } catch (error) {
      console.error("靜默更新用戶互動記錄失敗:", error);
      // 靜默處理錯誤，不顯示通知
    }
  }, [selectedBotId]);

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
        message: broadcastMessage
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
      setSelectedUserIds(new Set(filteredUsers.map(user => user.line_user_id)));
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
    if (!selectedBotId || !broadcastMessage.trim() || selectedUserIds.size === 0) {
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
        user_ids: Array.from(selectedUserIds)
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
  const filteredUsers = users.filter(user =>
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
        const statusData = response.data as {status?: string; is_configured?: boolean; line_api_accessible?: boolean; checked_at?: string};
        setWebhookStatus(statusData);
        
        // 根據 Webhook 狀態設置 Bot 健康狀態
        if (statusData.status === 'active') {
          setBotHealth("online");
        } else if (statusData.status === 'not_configured') {
          setBotHealth("error");
        } else if (statusData.status === 'configuration_error') {
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
        description: "數據已更新"
      });
    } catch (_error) {
      toast({
        title: "刷新失敗",
        description: "無法獲取最新數據",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 單獨刷新活動數據
  const handleRefreshActivities = async () => {
    if (!selectedBotId) return;
    console.log('手動刷新活動數據...');
    
    try {
      const response = await apiClient.getBotActivities(selectedBotId, 20, 0);
      console.log('手動刷新活動 API 響應:', response);
      
      if (response.data && !response.error) {
        console.log('手動刷新 - 原始響應數據:', response.data);
        
        let activitiesData: unknown = response.data;
        
        // 嘗試從不同的可能結構中提取資料
        const dataObj = activitiesData as { activities?: unknown; data?: unknown };
        if (dataObj.activities && Array.isArray(dataObj.activities)) {
          activitiesData = dataObj.activities;
        } else if (dataObj.data && Array.isArray(dataObj.data)) {
          activitiesData = dataObj.data;
        } else if (!Array.isArray(activitiesData)) {
          console.warn('手動刷新：活動數據結構異常:', activitiesData);
          activitiesData = []; // 設為空陣列
        }
        
        console.log('手動刷新 - 提取後的活動數據:', activitiesData);
        
        if (Array.isArray(activitiesData)) {
          // 使用轉換函式處理後端資料
          const convertedActivities = convertBackendDataToActivityItem(activitiesData as BackendActivityData[]);
          console.log('手動刷新 - 轉換後的活動數據:', convertedActivities);
          
          setActivities(convertedActivities);
          toast({
            title: "活動數據已刷新",
            description: `載入了 ${convertedActivities.length} 條活動記錄`
          });
        } else {
          toast({
            title: "活動數據格式錯誤",
            description: "服務器返回的數據格式不正確",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "刷新活動失敗",
          description: response.error || "無法獲取活動數據",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('手動刷新活動錯誤:', error);
      toast({
        title: "刷新活動失敗",
        description: "網路錯誤或服務器不可用",
        variant: "destructive"
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
        const statusData = response.data as {status?: string; is_configured?: boolean; line_api_accessible?: boolean; checked_at?: string};
        
        // 根據 Bot 的配置和 LINE API 連接狀態設定健康狀態
        if (statusData.status === 'active') {
          setBotHealth("online");
          toast({
            title: "狀態檢查",
            description: "Bot 運作正常，Webhook 已綁定"
          });
        } else if (statusData.status === 'not_configured') {
          setBotHealth("error");
          toast({
            title: "狀態檢查",
            description: "Bot 尚未配置 Channel Token 或 Channel Secret",
            variant: "destructive"
          });
        } else if (statusData.status === 'configuration_error') {
          setBotHealth("error");
          toast({
            title: "狀態檢查",
            description: "Bot 配置錯誤，無法連接 LINE API",
            variant: "destructive"
          });
        } else {
          setBotHealth("offline");
          toast({
            title: "狀態檢查",
            description: "Bot 已配置但 Webhook 未綁定",
            variant: "destructive"
          });
        }
      } else {
        setBotHealth("error");
        toast({
          variant: "destructive",
          title: "檢查失敗",
          description: response.error || "無法獲取 Bot 狀態"
        });
      }
    } catch (_error) {
      setBotHealth("error");
      toast({
        variant: "destructive",
        title: "檢查失敗",
        description: "網路錯誤，無法檢查 Bot 狀態"
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
        console.error('初始化數據失敗:', error);
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

  // 當選擇的 Bot 變化時獲取相關數據
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;
    const isInitialLoad = true;

    const fetchBotData = async () => {
      if (selectedBotId && isMounted) {
        try {
          // 順序載入，避免並發問題
          // 1. 先載入邏輯模板和 Webhook 狀態（較快的 API）
          await Promise.all([
            fetchLogicTemplates(selectedBotId),
            fetchWebhookStatus(selectedBotId)
          ]);
          
          // 2. 檢查是否還在載入中且未被取消
          if (isMounted && !abortController.signal.aborted) {
            // 延遲載入分析數據，給其他 API 更多時間完成
            await new Promise(resolve => setTimeout(resolve, 100));
            await fetchAnalytics(selectedBotId, abortController.signal, isInitialLoad);
          }
        } catch (error: unknown) {
          if (isMounted && (error as Error).name !== 'AbortError') {
            console.error('獲取 Bot 數據失敗:', error);
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
          abortController.abort('Bot changed or component unmounting');
        }
      }, 500);
    };
  }, [selectedBotId, fetchLogicTemplates, fetchAnalytics, fetchWebhookStatus, toast]);

  // 當切換到用戶管理 Tab 時載入用戶數據
  useEffect(() => {
    if (activeTab === "users" && selectedBotId && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab, selectedBotId, users.length, fetchUsers]);

  // 處理 WebSocket 即時更新消息
  useEffect(() => {
    if (!lastMessage || !selectedBotId) return;
    
    // 確保消息是針對當前選中的 Bot
    if (lastMessage.bot_id !== selectedBotId) {
      return;
    }
    
    switch (lastMessage.type) {
      case 'analytics_update':
        console.log('🔄 收到 analytics_update WebSocket 事件，開始更新數據...');

        // 根據時間範圍計算查詢天數
        const getDaysFromTimeRange = (range: string) => {
          switch (range) {
            case "day": return 1;
            case "week": return 7;
            case "month": return 30;
            default: return 30;
          }
        };

        const queryDays = getDaysFromTimeRange(timeRange);
        console.log(`📊 當前時間範圍: ${timeRange}, 查詢天數: ${queryDays}`);

        // 靜默更新所有分析相關數據，保持其他數據不變
        Promise.all([
          apiClient.getBotAnalytics(selectedBotId, timeRange),
          apiClient.getBotMessageStats(selectedBotId, queryDays), // 根據時間範圍動態調整天數
          apiClient.getBotUserActivity(selectedBotId),
          apiClient.getBotUsageStats(selectedBotId)
        ]).then(([analyticsRes, messageStatsRes, userActivityRes, usageStatsRes]) => {
          console.log('📈 WebSocket 觸發的 API 響應:', {
            analytics: analyticsRes.data ? '✅' : '❌',
            messageStats: messageStatsRes.data ? '✅' : '❌',
            userActivity: userActivityRes.data ? '✅' : '❌',
            usageStats: usageStatsRes.data ? '✅' : '❌'
          });

          // 更新分析數據
          if (analyticsRes.data && !analyticsRes.error) {
            const analyticsData = analyticsRes.data as BotAnalytics;
            setAnalytics(prev => ({
              ...prev,
              totalMessages: analyticsData.totalMessages || prev?.totalMessages || 0,
              activeUsers: analyticsData.activeUsers || prev?.activeUsers || 0,
              responseTime: analyticsData.responseTime || prev?.responseTime || 0,
              successRate: analyticsData.successRate || prev?.successRate || 0,
              todayMessages: analyticsData.todayMessages || prev?.todayMessages || 0,
              weekMessages: analyticsData.weekMessages || prev?.weekMessages || 0,
              monthMessages: analyticsData.monthMessages || prev?.monthMessages || 0,
            } as BotAnalytics));
            console.log('✅ Analytics 數據已更新');
          }

          // 更新訊息統計圖表數據
          if (messageStatsRes.data && !messageStatsRes.error) {
            const newMessageStats = Array.isArray(messageStatsRes.data) ? messageStatsRes.data as MessageStats[] : [];
            setMessageStats(newMessageStats);
            console.log('📊 MessageStats 數據已更新:', {
              數據長度: newMessageStats.length,
              第一個: newMessageStats[0],
              最後一個: newMessageStats[newMessageStats.length - 1]
            });
          }

          // 更新用戶活躍度數據和熱力圖
          if (userActivityRes.data && !userActivityRes.error) {
            setUserActivity(Array.isArray(userActivityRes.data) ? userActivityRes.data as UserActivity[] : []);
            
            // 生成熱力圖數據
            const heatData: HeatMapDataPoint[] = [];
            if (Array.isArray(userActivityRes.data)) {
              (userActivityRes.data as UserActivity[]).forEach((activity: UserActivity) => {
                for (let day = 0; day < 7; day++) {
                  heatData.push({
                    hour: parseInt(activity.hour) || 0,
                    day: day,
                    value: activity.activeUsers || 0,
                    label: `${activity.hour}:00`
                  });
                }
              });
            }
            setHeatMapData(heatData);
          }

          // 更新使用統計數據
          if (usageStatsRes.data && !usageStatsRes.error) {
            // 定義顏色映射（與主要處理邏輯保持一致）
            const colorMapping: Record<string, string> = {
              "文字訊息": "#6366F1",  // 靛藍色 - 最常用的訊息類型，專業且有活力
              "圖片訊息": "#3B82F6",  // 天藍色 - 視覺媒體
              "影片訊息": "#8B5CF6",  // 紫色 - 動態媒體
              "語音訊息": "#10B981",  // 翠綠色 - 聲音媒體
              "貼圖訊息": "#F59E0B",  // 琥珀色 - 表情互動
              "位置訊息": "#EF4444",  // 玫瑰色 - 地理位置
              "其他類型": "#06B6D4"   // 青色 - 其他未分類
            };

            // 為後端數據添加顏色信息
            const dataWithColors = Array.isArray(usageStatsRes.data)
              ? (usageStatsRes.data as Array<{feature: string; usage: number; percentage: number}>).map(item => ({
                  ...item,
                  color: colorMapping[item.feature] || "#A4A6B0"
                }))
              : [];

            setUsageData(dataWithColors as UsageData[]);
          }
        }).catch(() => {
          // 靜默處理錯誤，不影響用戶體驗
        });
        break;
        
      case 'activity_update':
        if (lastMessage.data) {
          console.log('收到 WebSocket 活動更新:', lastMessage.data);
          // 靜默更新活動數據，保持其他數據不變
          apiClient.getBotActivities(selectedBotId, 20, 0).then(response => {
            console.log('WebSocket 觸發的活動 API 響應:', response);
            if (response.data && !response.error) {
              console.log('WebSocket - 原始響應數據:', response.data);

              let activitiesData: unknown = response.data;

              // 嘗試從不同的可能結構中提取資料
              const dataObj = activitiesData as { activities?: unknown; data?: unknown };
              if (dataObj.activities && Array.isArray(dataObj.activities)) {
                activitiesData = dataObj.activities;
              } else if (dataObj.data && Array.isArray(dataObj.data)) {
                activitiesData = dataObj.data;
              } else if (!Array.isArray(activitiesData)) {
                console.warn('WebSocket：活動數據結構異常:', activitiesData);
                activitiesData = []; // 設為空陣列
              }

              console.log('WebSocket - 提取後的活動數據:', activitiesData);

              if (Array.isArray(activitiesData)) {
                // 使用轉換函式處理後端資料
                const convertedActivities = convertBackendDataToActivityItem(activitiesData as BackendActivityData[]);
                console.log('WebSocket - 轉換後的活動數據:', convertedActivities);

                setActivities(convertedActivities);
                console.log('WebSocket 成功更新活動數據，數量:', convertedActivities.length);

                toast({
                  title: "新活動",
                  description: "檢測到新的 Bot 活動",
                  duration: 3000,
                });
              } else {
                console.warn('WebSocket 活動數據格式錯誤:', typeof activitiesData, activitiesData);
              }
            } else {
              console.error('WebSocket 活動 API 調用失敗:', response.error);
            }
          }).catch((error) => {
            console.error('WebSocket 活動更新錯誤:', error);
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

      case 'new_user_message':
        // 收到新用戶訊息時更新用戶列表和對話記錄
        if (lastMessage?.data) {
          const lm = lastMessage as unknown;
          const lineUserId = (lm && typeof lm === 'object' && 'line_user_id' in (lm as Record<string, unknown>))
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
        
      case 'webhook_status_update':
        setWebhookStatusLoading(true);
        apiClient.getWebhookStatus(selectedBotId).then(response => {
          if (response.data) {
            setWebhookStatus(response.data as Record<string, unknown>);
          }
        }).catch(() => {
          // 靜默處理錯誤
        }).finally(() => {
          setWebhookStatusLoading(false);
        });
        break;
        
      case 'pong':
        setBotHealth('online');
        break;
        
      default:
        // 未處理的消息類型
    }
  }, [lastMessage, selectedBotId, timeRange, toast, activeTab, pagination.limit, pagination.offset, selectedUser, fetchUsersSilently, fetchUserInteractionsSilently]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // 如果用戶已認證但仍在載入 Bot 列表，顯示載入器
  if (loading && bots.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-muted-foreground">載入 Bot 列表中...</p>
        </div>
      </div>
    );
  }

  const selectedBot = bots.find(bot => bot.id === selectedBotId);

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <DashboardNavbar user={user} />
      
      <div className="flex-1 mt-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 頁面標題 */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-1">LINE Bot 管理中心</h1>
            <p className="text-muted-foreground">監控與控制您的 LINE Bot，管理邏輯與分析數據</p>
          </div>

          {/* Bot 選擇器 */}
          <div className="mb-6 sticky top-20 z-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  選擇 Bot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select value={selectedBotId} onValueChange={setSelectedBotId}>
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
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Activity className="h-3 w-3 mr-1" />
                        啟用中
                      </Badge>

                      {/* WebSocket 連接狀態 */}
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                          {isConnected ? '即時連接' : '離線模式'}
                        </span>
                        {connectionError && (
                          <span className="text-red-500 text-xs">({connectionError})</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 rounded-lg bg-muted p-1">
                <TabsTrigger value="analytics" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  數據分析
                </TabsTrigger>
                <TabsTrigger value="control" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Bot 控制
                </TabsTrigger>
                <TabsTrigger value="logic" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Zap className="h-4 w-4 mr-2" />
                  邏輯管理
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="h-4 w-4 mr-2" />
                  用戶管理
                </TabsTrigger>
              </TabsList>

              {/* 數據分析頁籤 */}
              <TabsContent value="analytics" className="space-y-6">
                {!selectedBotId ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">請先選擇一個 Bot 來查看分析數據</p>
                    </CardContent>
                  </Card>
                ) : analyticsLoading && !analytics ? (
                  /* 首次載入骨架屏 */
                  <>
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader className="pb-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                      <div className="lg:col-span-8">
                        <Card className="animate-pulse">
                          <CardHeader>
                            <div className="h-6 bg-muted rounded w-1/3"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64 bg-muted rounded"></div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="lg:col-span-4">
                        <Card className="animate-pulse">
                          <CardHeader>
                            <div className="h-6 bg-muted rounded w-1/2"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex space-x-3">
                                  <div className="h-4 w-4 bg-muted rounded"></div>
                                  <div className="flex-1 space-y-1">
                                    <div className="h-3 bg-muted rounded w-3/4"></div>
                                    <div className="h-3 bg-muted rounded w-1/2"></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
) : (
                  <>
                    {/* 現代化的關鍵指標卡片 */}
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <MetricCard
                          key="total-messages"
                          icon={MessageSquare}
                          title="總訊息數"
                          value={analytics?.totalMessages || 0}
                          trend={{
                            value: 12,
                            isPositive: true,
                            period: "較上月"
                          }}
                          variant="info"
                          showMiniChart
                          miniChartData={messageStats.map(s => s.sent + s.received)}
                          onClick={() => {}}
                        />
                      </div>
                      
                      <div>
                        <MetricCard
                          key="active-users"
                          icon={Users}
                          title="活躍用戶"
                          value={analytics?.activeUsers || 0}
                          trend={{
                            value: 5,
                            isPositive: true,
                            period: "較昨日"
                          }}
                          variant="success"
                          showMiniChart
                          miniChartData={userActivity.map(u => u.activeUsers)}
                        />
                      </div>
                      
                      <div>
                        <MetricCard
                          key="response-time"
                          icon={Clock}
                          title="平均回應時間"
                          value={analytics?.responseTime || 0}
                          unit="s"
                          trend={{
                            value: 10,
                            isPositive: false,
                            period: "較上週"
                          }}
                          variant="warning"
                        />
                      </div>
                      
                      <div>
                        <MetricCard
                          key="success-rate"
                          icon={Target}
                          title="成功率"
                          value={analytics?.successRate || 0}
                          unit="%"
                          trend={{
                            value: 0.3,
                            isPositive: true,
                            period: "較上週"
                          }}
                          variant="success"
                        />
                      </div>
                    </div>

                {/* 現代化的圖表和分析區域 */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-8">
                    <div className="space-y-6">
                      {/* 增強版訊息統計圖表 */}
                      <ChartWidget
                        title="訊息統計趨勢"
                        data={messageStats.map(stat => {
                          // 格式化日期顯示
                          const formatDate = (dateStr: string) => {
                            const date = new Date(dateStr);
                            if (timeRange === 'day') {
                              return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
                            } else if (timeRange === 'week') {
                              return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
                            } else {
                              return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
                            }
                          };

                          return {
                            name: formatDate(stat.date),
                            originalDate: stat.date, // 保留原始日期用於排序
                            發送: stat.sent,
                            接收: stat.received
                          };
                        })}
                        chartType="bar"
                        isLoading={analyticsLoading}
                        height={300}
                        showControls
                        showRefresh
                        onRefresh={handleRefreshData}
                        trend={{
                          value: 8.5,
                          isPositive: true,
                          description: "本週較上週增長"
                        }}
                        config={{
                          發送: { label: "發送", color: "hsl(var(--primary))" },
                          接收: { label: "接收", color: "hsl(var(--secondary))" }
                        }}
                        timeRange={{
                          current: timeRange,
                          options: [
                            { value: "day", label: "今日" },
                            { value: "week", label: "本週" },
                            { value: "month", label: "本月" }
                          ],
                          onChange: handleTimeRangeChange
                        }}
                      />
                      
                      {/* 用戶活躍度圖表 */}
                      <ChartWidget
                        title="用戶活躍度分析"
                        data={userActivity.map(activity => ({
                          name: `${activity.hour}:00`,
                          活躍用戶: activity.activeUsers
                        }))}
                        chartType="line"
                        isLoading={analyticsLoading}
                        height={300}
                        showControls
                        trend={{
                          value: 15.2,
                          isPositive: true,
                          description: "活躍度提升"
                        }}
                        config={{
                          活躍用戶: { label: "活躍用戶", color: "hsl(222.2 84% 59%)" }
                        }}
                      />
                      
                      {/* 熱力圖 */}
                      <HeatMap
                        data={heatMapData}
                        title="一週用戶活躍時間分布"
                        isLoading={analyticsLoading}
                        colorScheme="blue"
                        showLegend
                        defaultView="simplified"
                        showViewToggle={true}
                        cellSize={18}
                      />
                    </div>
                  </div>

                  {/* 右側工具欄和統計 */}
                  <div className="lg:col-span-4">
                    <div className="space-y-6">
                      {/* 即時活動動態 */}
                      <OptimizedActivityFeed
                        activities={activities}
                        isLoading={analyticsLoading}
                        height={400}
                        showRefresh
                        onRefresh={handleRefreshActivities}
                        autoRefresh={false} // 禁用自動刷新，依賴 WebSocket 即時更新
                        refreshInterval={30000}
                        isWebSocketConnected={checkWebSocketConnection}
                      />
                      
                      {/* 功能使用統計 */}
                      <ChartWidget
                        title="功能使用統計"
                        data={usageData.map(usage => ({
                          name: usage.feature,
                          value: usage.usage,
                          fill: usage.color
                        }))}
                        chartType="pie"
                        isLoading={analyticsLoading}
                        height={280}
                        customColors={usageData.map(u => u.color)}
                        config={{
                          value: {
                            label: "使用次數",
                            color: "hsl(var(--primary))"
                          }
                        }}
                        trend={{
                          value: 8.5,
                          isPositive: true,
                          description: "相較上週使用率提升"
                        }}
                      />
                    </div>
                  </div>
                </div>
                  </>
                )}
              </TabsContent>

              {/* Bot 控制頁籤 */}
              <TabsContent value="control" className="space-y-6">
                {!selectedBotId ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">請先選擇一個 Bot 來查看控制選項</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  {/* 左側：Bot 資訊和狀態 */}
                  <div className="space-y-6">
                    {/* Bot 資訊與狀態綜合卡片 */}
                    <Card className="shadow-sm hover:shadow-md transition">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Bot 資訊與狀態
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${botHealth === 'online' ? 'bg-green-50 text-green-700 border-green-200' : 
                                      botHealth === 'offline' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                      'bg-red-50 text-red-700 border-red-200'}`}
                          >
                            <Activity className="h-3 w-3 mr-1" />
                            {botHealth === 'online' ? '運作正常' : botHealth === 'offline' ? '離線' : '錯誤'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedBot && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Bot 名稱</label>
                                <p className="text-sm font-medium">{selectedBot.name}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">頻道設定</label>
                                <div className="text-sm">
                                  <Badge variant={selectedBot.channel_token ? "default" : "secondary"}>
                                    {selectedBot.channel_token ? "已設定" : "未設定"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">建立時間</label>
                                <p className="text-sm">{new Date(selectedBot.created_at).toLocaleString("zh-TW")}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">連接狀態</label>
                                <div className="flex items-center gap-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                                    {isConnected ? '即時連接' : '離線模式'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="pt-4 border-t">
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={handleCheckBotHealth}
                                disabled={controlLoading}
                              >
                                <Activity className="h-4 w-4 mr-2" />
                                {controlLoading ? "檢查中..." : "重新檢查狀態"}
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>


                  </div>

                  {/* 右側：Webhook 和其他設定 */}
                  <div className="space-y-6">

                  {/* Webhook URL 設定 */}
                  <Card className="shadow-sm hover:shadow-md transition">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Webhook URL
                        </div>
                        {webhookStatus && (
                          <Badge 
                            variant={
                              webhookStatus.status === 'active' ? 'default' : 
                              webhookStatus.status === 'not_configured' ? 'secondary' : 
                              'destructive'
                            }
                            className={
                              webhookStatus.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 
                              webhookStatus.status === 'not_configured' ? 'bg-secondary text-foreground border-border' : 
                              'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {webhookStatusLoading ? '檢查中...' : (webhookStatus as {status_text?: string})?.status_text || '未知狀態'}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          LINE Bot Webhook URL
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={selectedBotId ? getWebhookUrl(selectedBotId) : ""}
                            readOnly
                            className="flex-1"
                            placeholder="請選擇 Bot"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyWebhookUrl}
                            disabled={!selectedBotId}
                            className="px-3"
                          >
                            {copiedWebhookUrl ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          請將此 URL 設定到 LINE Developers Console 的 Webhook URL 欄位
                        </p>
                      </div>

                      {/* Webhook 狀態詳細資訊 */}
                      {webhookStatus && (
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">綁定狀態</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCheckWebhookStatus}
                              disabled={webhookStatusLoading}
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              {webhookStatusLoading ? '檢查中...' : '重新檢查'}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Bot 配置:</span>
                              <span className={`ml-1 ${webhookStatus.is_configured ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                {webhookStatus.is_configured ? '✓ 已配置' : '✗ 未配置'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">LINE API:</span>
                              <span className={`ml-1 ${webhookStatus.line_api_accessible ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                {webhookStatus.line_api_accessible ? '✓ 可連接' : '✗ 連接失敗'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Webhook 端點:</span>
                              {(webhookStatus as {webhook_endpoint_info?: {is_set?: boolean; active?: boolean; endpoint?: string}})?.webhook_endpoint_info?.is_set ? (
                                <span className={`ml-1 ${(webhookStatus as {webhook_endpoint_info?: {active?: boolean}})?.webhook_endpoint_info?.active ? 'text-green-600' : 'text-orange-600'} font-medium`}>
                                  {(webhookStatus as {webhook_endpoint_info?: {active?: boolean}})?.webhook_endpoint_info?.active ? '✓ 已啟用' : '⚠ 已設定但未啟用'}
                                </span>
                              ) : (
                                <span className="ml-1 text-red-600 font-medium">
                                  ✗ 未設定
                                </span>
                              )}
                            </div>
                            {(webhookStatus as {webhook_endpoint_info?: {endpoint?: string}})?.webhook_endpoint_info?.endpoint && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">設定的端點:</span>
                                <div className="text-xs text-muted-foreground mt-1 break-all">
                                  {(webhookStatus as {webhook_endpoint_info?: {endpoint?: string}})?.webhook_endpoint_info?.endpoint}
                                </div>
                              </div>
                            )}
                          </div>
                          {(webhookStatus as {checked_at?: string})?.checked_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              最後檢查: {new Date((webhookStatus as {checked_at: string}).checked_at).toLocaleString('zh-TW')}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                    {/* 進階功能 */}
                    <Card className="shadow-sm hover:shadow-md transition">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          進階功能
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button className="w-full" variant="outline" disabled>
                          <Settings className="h-4 w-4 mr-2" />
                          管理 Rich Menu
                          <Badge variant="secondary" className="ml-2 text-xs">開發中</Badge>
                        </Button>
                        
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => navigate("/bots/visual-editor")}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          編輯 Bot 邏輯
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  </div>
                )}
              </TabsContent>

              {/* 邏輯管理頁籤 */}
              <TabsContent value="logic" className="space-y-6">
                {!selectedBotId ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">請先選擇一個 Bot 來管理邏輯</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        邏輯模板管理
                      </div>
                      <Button
                        onClick={() => navigate("/bots/visual-editor")}
                        size="sm"
                      >
                        建立新邏輯
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {logicLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader />
                      </div>
                    ) : logicTemplates.length === 0 ? (
                      <div className="text-center py-8">
                        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">尚無邏輯模板</p>
                        <Button onClick={() => navigate("/bots/visual-editor")}>
                          建立第一個邏輯
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {logicTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between p-4 border rounded-lg bg-background shadow-sm hover:shadow transition"
                          >
                            <div className="flex-1">
                              <h3 className="font-medium">{template.name}</h3>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant={template.is_active === "true" ? "default" : "secondary"}
                                  className={template.is_active === "true" ? "bg-green-100 text-green-800" : ""}
                                >
                                  {template.is_active === "true" ? (
                                    <>
                                      <Play className="h-3 w-3 mr-1" />
                                      啟用中
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="h-3 w-3 mr-1" />
                                      已停用
                                    </>
                                  )}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  更新時間: {new Date(template.updated_at).toLocaleDateString("zh-TW")}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={template.is_active === "true"}
                                onCheckedChange={(checked) => toggleLogicTemplate(template.id, checked)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 用戶管理頁籤 */}
              <TabsContent value="users" className="space-y-6">
                {!selectedBotId ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">請先選擇一個 Bot 來管理用戶</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
                    {/* 用戶列表 */}
                    <div className="space-y-6">
                      {/* 廣播訊息 */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5" />
                            廣播訊息
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Textarea
                            placeholder="輸入要廣播的訊息..."
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleBroadcast}
                              disabled={broadcastLoading || !broadcastMessage.trim()}
                              variant="outline"
                              className="flex-1"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {broadcastLoading ? "發送中..." : `全部用戶 (${totalCount})`}
                            </Button>
                            <Button
                              onClick={handleSelectiveBroadcast}
                              disabled={selectiveBroadcastLoading || !broadcastMessage.trim() || selectedUserIds.size === 0}
                              className="flex-1"
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              {selectiveBroadcastLoading ? "發送中..." : `選中用戶 (${selectedUserIds.size})`}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 搜尋和統計 */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              關注者列表 ({totalCount})
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSelectAll}
                                className="flex items-center gap-1"
                              >
                                {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                                  <CheckSquare className="h-4 w-4" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                                全選
                              </Button>
                              {selectedUserIds.size > 0 && (
                                <Badge variant="secondary">
                                  已選 {selectedUserIds.size}
                                </Badge>
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="搜尋用戶名稱或 ID..."
                              autoComplete="off"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>

                          {/* 用戶列表 */}
                          <div className="space-y-3">
                            {usersLoading ? (
                              <div className="flex justify-center py-8">
                                <Loader />
                              </div>
                            ) : filteredUsers.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">尚無關注者</p>
                              </div>
                            ) : (
                              filteredUsers.map((user) => (
                                <div
                                  key={user.id}
                                  className={`p-4 border rounded-lg transition-colors hover:bg-secondary ${
                                    selectedUser?.id === user.id ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* 復選框 */}
                                    <Checkbox
                                      checked={selectedUserIds.has(user.line_user_id)}
                                      onCheckedChange={(checked) => handleUserCheck(user.line_user_id, !!checked)}
                                      onClick={(e) => e.stopPropagation()}
                                    />

                                    {/* 用戶頭像 */}
                                    {user.picture_url ? (
                                      <img
                                        src={user.picture_url}
                                        alt={user.display_name}
                                        className="w-10 h-10 rounded-full object-cover cursor-pointer"
                                        onClick={() => handleUserSelect(user)}
                                      />
                                    ) : (
                                      <div
                                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center cursor-pointer"
                                        onClick={() => handleUserSelect(user)}
                                      >
                                        <User className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}

                                    {/* 用戶信息 */}
                                    <div
                                      className="flex-1 min-w-0 cursor-pointer"
                                      onClick={() => handleUserSelect(user)}
                                    >
                                      <h3 className="font-medium text-foreground truncate">
                                        {user.display_name || "未設定名稱"}
                                      </h3>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {user.line_user_id}
                                      </p>
                                      {user.status_message && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {user.status_message}
                                        </p>
                                      )}
                                    </div>

                                    {/* 互動統計 */}
                                    <div className="text-center">
                                      <Badge variant="secondary" className="text-xs">
                                        <Hash className="h-3 w-3 mr-1" />
                                        {user.interaction_count}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(user.last_interaction).toLocaleDateString("zh-TW")}
                                      </p>
                                    </div>

                                    {/* 操作按鈕 */}
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewUserDetails(user);
                                        }}
                                        className="px-2"
                                      >
                                        <Info className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartChat(user);
                                        }}
                                        className="px-2"
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* 分頁 */}
                          {totalCount > pagination.limit && (
                            <div className="flex items-center justify-between pt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                                disabled={!pagination.has_prev}
                              >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                上一頁
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, totalCount)} / {totalCount}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                                disabled={!pagination.has_next}
                              >
                                下一頁
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* 聊天面板區域 */}
                    {showChatPanel && currentChatUser && (
                      <div className="space-y-6">
                        <ChatPanel
                          botId={selectedBotId}
                          selectedUser={currentChatUser}
                          onClose={() => setShowChatPanel(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

            </Tabs>

          {bots.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">尚無 LINE Bot</p>
                <Button onClick={() => navigate("/bots/create")}>
                  建立第一個 Bot
                </Button>
              </CardContent>
            </Card>
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
