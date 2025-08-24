import React, { useState, useCallback, Suspense, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { 
  Bot, 
  BarChart3, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Settings,
  Send,
  Eye,
  Play,
  Pause,
  Activity,
  Calendar,
  Clock,
  Target,
  Copy,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { getWebhookUrl } from "../config/apiConfig";

// 使用新的 React Query hooks
import {
  useBots,
  useBotDashboard,
  useBotDashboardLight,
  useToggleLogicTemplate,
  useRefreshWebhookStatus
} from "@/hooks/useBotManagement";

// 懶加載組件
const BotAnalyticsChart = React.lazy(() => import("@/components/analytics/BotAnalyticsChart"));
const LogicTemplateManager = React.lazy(() => import("@/components/logic/LogicTemplateManager"));
const WebhookStatusPanel = React.lazy(() => import("@/components/webhook/WebhookStatusPanel"));

// 輕量級載入骨架
const BotSelectionSkeleton = () => (
  <Card className="glass-card">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bot className="h-5 w-5" />
        選擇 Bot
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* 統計卡片骨架 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="glass-card">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Tabs 骨架 */}
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

const BotManagementPageOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login"
  });

  // 狀態管理
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");

  // React Query hooks
  const { data: botsData, isLoading: botsLoading, error: botsError } = useBots();
  
  // 使用輕量版儀表板進行初始載入
  const { 
    data: lightDashboard, 
    isLoading: lightLoading 
  } = useBotDashboardLight(selectedBotId, !!selectedBotId);

  // 根據需要載入完整儀表板資料
  const shouldLoadFullDashboard = !!selectedBotId && activeTab !== 'overview';
  const { 
    data: fullDashboard, 
    isLoading: fullLoading,
    error: dashboardError 
  } = useBotDashboard(
    selectedBotId,
    {
      includeAnalytics: activeTab === 'analytics',
      includeLogic: activeTab === 'logic',
      includeWebhook: activeTab === 'webhook',
      period: 'week',
      enabled: shouldLoadFullDashboard
    }
  );

  // Mutations
  const toggleLogicTemplate = useToggleLogicTemplate();
  const refreshWebhookStatus = useRefreshWebhookStatus();

  // 計算衍生狀態
  const bots = useMemo(() => botsData?.data || [], [botsData]);
  const selectedBot = useMemo(
    () => bots.find(bot => bot.id === selectedBotId),
    [bots, selectedBotId]
  );

  // 自動選擇第一個 Bot（如果沒有選擇且有可用的 Bot）
  useEffect(() => {
    if (!selectedBotId && bots.length > 0 && !botsLoading) {
      setSelectedBotId(bots[0].id);
    }
  }, [selectedBotId, bots, botsLoading]);

  // 智能資料選擇：優先使用完整儀表板，回退到輕量版
  const dashboardData = useMemo(() => {
    if (fullDashboard?.data) return fullDashboard.data;
    if (lightDashboard?.data) return lightDashboard.data;
    return null;
  }, [fullDashboard, lightDashboard]);

  const isLoading = useMemo(() => {
    if (botsLoading || lightLoading) return true;
    if (shouldLoadFullDashboard && fullLoading) return true;
    return false;
  }, [botsLoading, lightLoading, shouldLoadFullDashboard, fullLoading]);

  // 事件處理器
  const handleBotChange = useCallback((botId: string) => {
    setSelectedBotId(botId);
  }, []);

  const handleLogicTemplateToggle = useCallback(async (templateId: string, isActive: boolean) => {
    toggleLogicTemplate.mutate({ templateId, isActive });
  }, [toggleLogicTemplate]);

  const handleWebhookRefresh = useCallback(async () => {
    if (!selectedBotId) return;
    refreshWebhookStatus.mutate(selectedBotId);
  }, [selectedBotId, refreshWebhookStatus]);

  const handleCopyWebhookUrl = useCallback(async () => {
    if (!selectedBotId) return;
    
    try {
      const webhookUrl = getWebhookUrl(selectedBotId);
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhookUrl(true);
      
      toast({
        title: "複製成功",
        description: "Webhook URL 已複製到剪貼簿",
      });

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
  }, [selectedBotId, toast]);

  // 錯誤處理
  if (botsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">載入失敗</div>
            <div className="text-sm text-gray-600">無法載入 Bot 資料</div>
            <Button onClick={() => window.location.reload()} className="mt-4">
              重試
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 認證載入中
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
      <DashboardNavbar user={user} />
      
      <div className="flex-1 mt-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 頁面標題 */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-1">
              LINE Bot 管理中心
            </h1>
            <p className="text-muted-foreground">
              監控與控制您的 LINE Bot，管理邏輯與分析數據
            </p>
          </div>

          {/* Bot 選擇器 */}
          <div className="mb-6 sticky top-20 z-20">
            {botsLoading ? (
              <BotSelectionSkeleton />
            ) : (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    選擇 Bot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedBotId || ""} onValueChange={handleBotChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇要管理的 Bot" />
                    </SelectTrigger>
                    <SelectContent>
                      {bots.map((bot) => (
                        <SelectItem key={bot.id} value={bot.id}>
                          <div className="flex items-center gap-2">
                            <span>{bot.name}</span>
                            <Badge variant={bot.channel_token ? "default" : "secondary"}>
                              {bot.channel_token ? "已配置" : "未配置"}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 主要內容區域 */}
          {!selectedBotId ? (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">選擇一個 Bot 開始管理</h3>
                  <p className="text-muted-foreground mb-4">
                    請從上方下拉選單中選擇要管理的 LINE Bot
                  </p>
                  <Button onClick={() => navigate("/add-bot")} variant="outline">
                    <Bot className="h-4 w-4 mr-2" />
                    新增 Bot
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <DashboardSkeleton />
          ) : (
            <div className="space-y-6">
              {/* 快速統計卡片 */}
              {dashboardData?.basic_stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        總用戶數
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.basic_stats.total_users || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        註冊用戶總數
                      </p>
                    </CardContent>
                  </Card>

                  {dashboardData.basic_stats.today_interactions !== undefined && (
                    <Card className="glass-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          今日互動
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dashboardData.basic_stats.today_interactions}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          今天的訊息數量
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                        <Activity className="h-4 w-4 mr-2" />
                        Bot 狀態
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        {dashboardData.bot_info?.is_configured ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            已配置
                          </>
                        ) : (
                          <>
                            <Clock className="h-5 w-5 text-yellow-500" />
                            未配置
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        連接設定狀態
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Webhook
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyWebhookUrl}
                          className="flex-1"
                        >
                          {copiedWebhookUrl ? (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          {copiedWebhookUrl ? "已複製" : "複製 URL"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        LINE Bot Webhook 地址
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 詳細管理區域 */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Bot 管理</span>
                    {dashboardError && (
                      <Badge variant="destructive">
                        載入失敗
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">概覽</TabsTrigger>
                      <TabsTrigger value="analytics">分析</TabsTrigger>
                      <TabsTrigger value="logic">邏輯</TabsTrigger>
                      <TabsTrigger value="webhook">Webhook</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="text-center py-8">
                        <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          {selectedBot?.name}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Bot 基本資訊和快速統計
                        </p>
                        {dashboardData?.basic_stats && (
                          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {dashboardData.basic_stats.total_users}
                              </div>
                              <div className="text-sm text-muted-foreground">總用戶</div>
                            </div>
                            {dashboardData.basic_stats.today_interactions !== undefined && (
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {dashboardData.basic_stats.today_interactions}
                                </div>
                                <div className="text-sm text-muted-foreground">今日互動</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-4">
                      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                        {dashboardData?.analytics ? (
                          <BotAnalyticsChart data={dashboardData.analytics} />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            載入分析資料中...
                          </div>
                        )}
                      </Suspense>
                    </TabsContent>

                    <TabsContent value="logic" className="space-y-4">
                      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                        {dashboardData?.logic_templates ? (
                          <LogicTemplateManager 
                            templates={dashboardData.logic_templates}
                            onToggle={handleLogicTemplateToggle}
                            isLoading={toggleLogicTemplate.isPending}
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            載入邏輯模板中...
                          </div>
                        )}
                      </Suspense>
                    </TabsContent>

                    <TabsContent value="webhook" className="space-y-4">
                      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                        {dashboardData?.webhook_status ? (
                          <WebhookStatusPanel 
                            status={dashboardData.webhook_status}
                            onRefresh={handleWebhookRefresh}
                            onCopyUrl={handleCopyWebhookUrl}
                            isRefreshing={refreshWebhookStatus.isPending}
                            urlCopied={copiedWebhookUrl}
                          />
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            載入 Webhook 狀態中...
                          </div>
                        )}
                      </Suspense>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      <DashboardFooter />
    </div>
  );
};

export default BotManagementPageOptimized;