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
  Pause
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { apiClient } from "../services/UnifiedApiClient";
import { Bot as BotType, LogicTemplate } from "@/types/bot";
import { getWebhookUrl } from "../config/apiConfig";

// 導入新的儀表板元件
import MetricCard from "@/components/dashboard/MetricCard";
import ChartWidget from "@/components/dashboard/ChartWidget";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActions from "@/components/dashboard/QuickActions";
import HeatMap from "@/components/dashboard/HeatMap";

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
  const [testMessage, setTestMessage] = useState("");
  const [testUserId, setTestUserId] = useState("");
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<Record<string, unknown> | null>(null);
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("week");
  const [_refreshing, setRefreshing] = useState(false);
  const [botHealth, setBotHealth] = useState<"online" | "offline" | "error">("online");


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

  // 獲取用戶的 Bot 列表
  const fetchBots = useCallback(async () => {
    try {
      const response = await apiClient.getBots();
      if (response.data && Array.isArray(response.data)) {
        setBots(response.data);
        if (response.data.length > 0 && !selectedBotId) {
          setSelectedBotId(response.data[0].id);
        }
      }
    } catch (_error) {
      console.error("獲取 Bot 列表失敗:", _error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: "無法載入 Bot 列表",
      });
    }
  }, [selectedBotId, toast]);

  // 獲取邏輯模板
  const fetchLogicTemplates = useCallback(async (botId: string) => {
    setLogicLoading(true);
    try {
      const response = await apiClient.getBotLogicTemplates(botId);
      if (response.data && Array.isArray(response.data)) {
        setLogicTemplates(response.data);
      }
    } catch (_error) {
      console.error("獲取邏輯模板失敗:", _error);
    } finally {
      setLogicLoading(false);
    }
  }, []);

  // 獲取分析數據 - 使用真實API
  const fetchAnalytics = useCallback(async (botId: string) => {
    setAnalyticsLoading(true);
    try {
      // 使用 apiClient 調用真實的後端API端點
      const [analyticsRes, messageStatsRes, userActivityRes, usageStatsRes, activitiesRes] = await Promise.all([
        apiClient.getBotAnalytics(botId, timeRange),
        apiClient.getBotMessageStats(botId, 7),
        apiClient.getBotUserActivity(botId),
        apiClient.getBotUsageStats(botId),
        apiClient.getBotActivities(botId, 20, 0)
      ]);

      // 處理分析數據響應
      if (analyticsRes.data && !analyticsRes.error) {
        setAnalytics(analyticsRes.data as BotAnalytics);
        setBotHealth("online");
      } else {
        console.warn('Analytics API 響應錯誤:', analyticsRes.error);
        setBotHealth("error");
      }

      // 處理訊息統計數據
      if (messageStatsRes.data && !messageStatsRes.error) {
        setMessageStats(Array.isArray(messageStatsRes.data) ? messageStatsRes.data as MessageStats[] : []);
      } else {
        console.warn('Message stats API 響應錯誤:', messageStatsRes.error);
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
        console.warn('User activity API 響應錯誤:', userActivityRes.error);
        setUserActivity([]);
        setHeatMapData([]);
      }

      // 處理使用統計數據
      if (usageStatsRes.data && !usageStatsRes.error) {
        setUsageData(Array.isArray(usageStatsRes.data) ? usageStatsRes.data as UsageData[] : []);
      } else {
        console.warn('Usage stats API 響應錯誤:', usageStatsRes.error);
        setUsageData([]);
      }

      // 處理活動記錄
      if (activitiesRes.data && !activitiesRes.error) {
        const responseData = activitiesRes.data as any;
        const activitiesData = responseData.activities || responseData;
        setActivities(Array.isArray(activitiesData) ? activitiesData as ActivityItem[] : []);
      } else {
        console.warn('Activities API 響應錯誤:', activitiesRes.error);
        setActivities([]);
      }

    } catch (error) {
      console.error("獲取分析數據失敗:", error);
      toast({
        title: "獲取分析數據失敗",
        description: "無法連接到 LINE Bot API，請檢查您的 Bot 設定",
        variant: "destructive",
      });

      // 設置為離線狀態
      setBotHealth("error");

      // 設置空數據以避免顯示錯誤
      setAnalytics(null);
      setMessageStats([]);
      setUserActivity([]);
      setUsageData([]);
      setHeatMapData([]);
      setActivities([]);

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
    } catch (_error) {
      console.error("切換邏輯模板狀態失敗:", _error);
      toast({
        variant: "destructive",
        title: "操作失敗",
        description: "無法切換邏輯模板狀態",
      });
    }
  };



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
    } catch (_error) {
      console.error("複製 Webhook URL 失敗:", _error);
      toast({
        variant: "destructive",
        title: "複製失敗",
        description: "無法複製 Webhook URL",
      });
    }
  };

  // 獲取 Webhook 狀態
  const fetchWebhookStatus = async (botId: string) => {
    if (!botId) return;

    setWebhookStatusLoading(true);
    try {
      const response = await apiClient.getWebhookStatus(botId);
      if (response.data) {
        setWebhookStatus(response.data as Record<string, unknown>);
      }
    } catch (_error) {
      console.error("獲取 Webhook 狀態失敗:", _error);
      setWebhookStatus(null);
    } finally {
      setWebhookStatusLoading(false);
    }
  };

  // 檢查 Webhook 狀態
  const handleCheckWebhookStatus = async () => {
    if (!selectedBotId) return;
    await fetchWebhookStatus(selectedBotId);
  };



  // 處理時間範圍變更
  const handleTimeRangeChange = (newRange: string) => {
    setTimeRange(newRange);
    if (selectedBotId) {
      fetchAnalytics(selectedBotId);
    }
  };

  // 手動刷新數據
  const handleRefreshData = async () => {
    if (!selectedBotId) return;
    setRefreshing(true);
    await fetchAnalytics(selectedBotId);
    setRefreshing(false);
    toast({
      title: "刷新完成",
      description: "數據已更新"
    });
  };

  // 處理測試訊息發送
  const handleSendTestMessage = async (userId: string, message: string): Promise<void> => {
    if (!selectedBotId) throw new Error("未選擇 Bot");

    const response = await apiClient.sendTestMessage(selectedBotId, {
      user_id: userId,
      message: message
    });

    if (response.error) {
      throw new Error(response.error || '發送失敗');
    }
  };

  // 處理Bot健康檢查
  const handleCheckBotHealth = async () => {
    if (!selectedBotId) return;
    
    try {
      const response = await fetch(`/api/v1/bots/${selectedBotId}/health`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      const healthData = await response.json();
      
      if (healthData.healthy) {
        setBotHealth("online");
        toast({
          title: "狀態檢查",
          description: "Bot 運作正常"
        });
      } else {
        setBotHealth("offline");
        toast({
          title: "狀態檢查",
          description: "Bot 狀態異常",
          variant: "destructive"
        });
      }
    } catch (_error) {
      setBotHealth("error");
      toast({
        variant: "destructive",
        title: "檢查失敗",
        description: "無法檢查 Bot 狀態"
      });
    }
  };

  // 初始化數據
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await fetchBots();
      setLoading(false);
    };

    if (user) {
      initializeData();
    }
  }, [user, fetchBots]);

  // 當選擇的 Bot 變化時獲取相關數據
  useEffect(() => {
    let isMounted = true;

    const fetchBotData = async () => {
      if (selectedBotId && isMounted) {
        try {
          await Promise.all([
            fetchLogicTemplates(selectedBotId),
            fetchAnalytics(selectedBotId),
            fetchWebhookStatus(selectedBotId)
          ]);
        } catch (error) {
          if (isMounted) {
            console.error('獲取 Bot 數據失敗:', error);
          }
        }
      }
    };

    fetchBotData();

    // 清理函數
    return () => {
      isMounted = false;
    };
  }, [selectedBotId]);

  // 處理加載狀態
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
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
                      <span className="text-sm text-muted-foreground">
                        建立時間: {new Date(selectedBot.created_at).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedBotId && (
            <Tabs defaultValue="analytics" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 rounded-lg bg-muted p-1">
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
              </TabsList>

              {/* 數據分析頁籤 */}
              <TabsContent value="analytics" className="space-y-6">
                {analyticsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader />
                  </div>
                ) : (
                  <>
                    {/* 現代化的關鍵指標卡片 */}
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <MetricCard
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
                          onClick={() => console.log('點擊訊息統計')}
                        />
                      </div>
                      
                      <div>
                        <MetricCard
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
                        title="訊息統計趋勢"
                        data={messageStats.map(stat => ({
                          name: stat.date,
                          發送: stat.sent,
                          接收: stat.received
                        }))}
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
                      />
                    </div>
                  </div>

                  {/* 右側工具欄和統計 */}
                  <div className="lg:col-span-4">
                    <div className="space-y-6">
                      {/* 即時活動動態 */}
                      <ActivityFeed
                        activities={activities}
                        isLoading={analyticsLoading}
                        height={350}
                        showRefresh
                        onRefresh={handleRefreshData}
                        autoRefresh
                        refreshInterval={30000}
                      />
                      
                      {/* 功能使用統計 */}
                      <ChartWidget
                        title="功能使用統計"
                        data={usageData.map(usage => ({
                          name: usage.feature,
                          value: usage.usage
                        }))}
                        chartType="pie"
                        isLoading={analyticsLoading}
                        height={250}
                        customColors={usageData.map(u => u.color)}
                      />
                    </div>
                  </div>
                </div>
                  </>
                )}
              </TabsContent>

              {/* Bot 控制頁籤 */}
              <TabsContent value="control" className="space-y-6">
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                  <div>
                    <QuickActions
                      botId={selectedBotId}
                      onSendTestMessage={handleSendTestMessage}
                      onCheckBotHealth={handleCheckBotHealth}
                      onViewUsers={() => navigate(`/bots/${selectedBotId}/users`)}
                      onCopyWebhookUrl={handleCopyWebhookUrl}
                      webhookUrl={selectedBotId ? getWebhookUrl(selectedBotId) : undefined}
                      botStatus={botHealth}
                    />
                  </div>
                  
                  <div>
                    <div className="space-y-6">
                  {/* Bot 資訊 */}
                  <Card className="shadow-sm hover:shadow-md transition">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Bot 資訊
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedBot && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Bot 名稱</label>
                              <p className="text-sm">{selectedBot.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">狀態</label>
                              <div className="text-sm">
                                <Badge className="bg-green-100 text-green-800">啟用中</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">建立時間</label>
                              <p className="text-sm">{new Date(selectedBot.created_at).toLocaleString("zh-TW")}</p>
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
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* 測試訊息 */}
                  <Card className="shadow-sm hover:shadow-md transition">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        發送測試訊息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">用戶 ID</label>
                        <Input
                          placeholder="輸入測試用戶 ID"
                          value={testUserId}
                          onChange={(e) => setTestUserId(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">測試訊息</label>
                        <Textarea
                          placeholder="輸入要發送的測試訊息..."
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleSendTestMessage(testUserId, testMessage)}
                        disabled={controlLoading || !testUserId || !testMessage}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {controlLoading ? "發送中..." : "發送測試訊息"}
                      </Button>
                    </CardContent>
                  </Card>

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
                              webhookStatus.status === 'not_configured' ? 'bg-gray-100 text-gray-800 border-gray-200' : 
                              'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {webhookStatusLoading ? '檢查中...' : (webhookStatus as any)?.status_text || '未知狀態'}
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
                              <span className="text-gray-500">LINE API:</span>
                              <span className={`ml-1 ${webhookStatus.line_api_accessible ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                {webhookStatus.line_api_accessible ? '✓ 可連接' : '✗ 連接失敗'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Webhook 端點:</span>
                              {(webhookStatus as any)?.webhook_endpoint_info?.is_set ? (
                                <span className={`ml-1 ${(webhookStatus as any)?.webhook_endpoint_info?.active ? 'text-green-600' : 'text-orange-600'} font-medium`}>
                                  {(webhookStatus as any)?.webhook_endpoint_info?.active ? '✓ 已啟用' : '⚠ 已設定但未啟用'}
                                </span>
                              ) : (
                                <span className="ml-1 text-red-600 font-medium">
                                  ✗ 未設定
                                </span>
                              )}
                            </div>
                            {(webhookStatus as any)?.webhook_endpoint_info?.endpoint && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">設定的端點:</span>
                                <div className="text-xs text-gray-700 mt-1 break-all">
                                  {(webhookStatus as any)?.webhook_endpoint_info?.endpoint}
                                </div>
                              </div>
                            )}
                          </div>
                          {(webhookStatus as any)?.checked_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              最後檢查: {new Date((webhookStatus as any).checked_at).toLocaleString('zh-TW')}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 快速操作 */}
                  <Card className="shadow-sm hover:shadow-md transition">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        快速操作
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleCheckBotHealth}
                        disabled={controlLoading}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        {controlLoading ? "檢查中..." : "檢查 Bot 狀態"}
                      </Button>
                      <Button className="w-full" variant="outline" disabled>
                        <Settings className="h-4 w-4 mr-2" />
                        管理 Rich Menu (開發中)
                      </Button>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => navigate(`/bots/${selectedBotId}/users`)}
                        disabled={!selectedBotId}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        查看用戶列表
                      </Button>
                    </CardContent>
                  </Card>
                  </div>
                </div>
                </div>
              </TabsContent>

              {/* 邏輯管理頁籤 */}
              <TabsContent value="logic" className="space-y-6">
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
                        <p className="text-gray-500 mb-4">尚無邏輯模板</p>
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
                                <span className="text-xs text-gray-500">
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
              </TabsContent>
            </Tabs>
          )}

          {bots.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">尚無 LINE Bot</p>
                <Button onClick={() => navigate("/bots/create")}>
                  建立第一個 Bot
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <DashboardFooter />
    </div>
  );
};

export default BotManagementPage;