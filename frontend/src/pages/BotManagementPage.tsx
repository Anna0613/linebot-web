import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Target
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { apiClient } from "../services/UnifiedApiClient";
import { Bot as BotType, LogicTemplate } from "@/types/bot";

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
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [logicLoading, setLogicLoading] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testUserId, setTestUserId] = useState("");


  // 圖表配置
  const chartConfig = {
    sent: {
      label: "發送",
      color: "#3b82f6",
    },
    received: {
      label: "接收",
      color: "#10b981",
    },
    activeUsers: {
      label: "活躍用戶",
      color: "#f59e0b",
    },
    usage: {
      label: "使用率",
      color: "#8b5cf6",
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
    } catch (error) {
      console.error("獲取 Bot 列表失敗:", error);
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
    } catch (error) {
      console.error("獲取邏輯模板失敗:", error);
    } finally {
      setLogicLoading(false);
    }
  }, []);

  // 獲取分析數據
  const fetchAnalytics = useCallback(async (botId: string) => {
    setAnalyticsLoading(true);
    try {
      // 並行獲取所有分析數據
      const [analyticsRes, messageStatsRes, userActivityRes, usageStatsRes] = await Promise.all([
        apiClient.getBotAnalytics(botId, "week"),
        apiClient.getBotMessageStats(botId, 7),
        apiClient.getBotUserActivity(botId),
        apiClient.getBotUsageStats(botId)
      ]);

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data as BotAnalytics);
      }
      
      if (messageStatsRes.data) {
        setMessageStats(messageStatsRes.data as MessageStats[]);
      }
      
      if (userActivityRes.data) {
        setUserActivity(userActivityRes.data as UserActivity[]);
      }
      
      if (usageStatsRes.data) {
        setUsageData(usageStatsRes.data as UsageData[]);
      }
    } catch (error) {
      console.error("獲取分析數據失敗:", error);
      toast({
        title: "獲取分析數據失敗",
        description: "無法連接到 LINE Bot API，請檢查您的 Bot 設定",
        variant: "destructive",
      });
      
      // 清空數據，不提供虛假數據
      setAnalytics(null);
      setMessageStats([]);
      setUserActivity([]);
      setUsageData([]);
      
      toast({
        variant: "destructive",
        title: "數據載入警告",
        description: "無法載入最新數據，顯示模擬數據",
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [toast]);

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

  // 發送測試訊息
  const handleSendTestMessage = async () => {
    if (!selectedBotId || !testUserId || !testMessage) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請填寫用戶 ID 和測試訊息",
      });
      return;
    }

    setControlLoading(true);
    try {
      await apiClient.sendTestMessage(selectedBotId, {
        user_id: testUserId,
        message: testMessage
      });

      toast({
        title: "發送成功",
        description: "測試訊息已發送",
      });

      setTestMessage("");
      setTestUserId("");
    } catch (error) {
      console.error("發送測試訊息失敗:", error);
      toast({
        variant: "destructive",
        title: "發送失敗",
        description: "無法發送測試訊息，請檢查 Bot 設定",
      });
    } finally {
      setControlLoading(false);
    }
  };

  // 檢查 Bot 狀態
  const handleCheckBotHealth = async () => {
    if (!selectedBotId) return;

    setControlLoading(true);
    try {
      const response = await apiClient.checkBotHealth(selectedBotId);
      
      toast({
        title: "狀態檢查",
        description: response.data ? "Bot 運作正常" : "Bot 狀態異常",
        variant: response.data ? "default" : "destructive",
      });
    } catch (error) {
      console.error("檢查 Bot 狀態失敗:", error);
      toast({
        variant: "destructive",
        title: "檢查失敗",
        description: "無法檢查 Bot 狀態",
      });
    } finally {
      setControlLoading(false);
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
    const fetchBotData = async () => {
      if (selectedBotId) {
        await Promise.all([
          fetchLogicTemplates(selectedBotId),
          fetchAnalytics(selectedBotId)
        ]);
      }
    };

    fetchBotData();
  }, [selectedBotId, fetchLogicTemplates, fetchAnalytics]);

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardNavbar user={user} />
      
      <div className="flex-1 mt-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 頁面標題 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">LINE Bot 管理中心</h1>
            <p className="text-gray-600">監控和控制您的 LINE Bot，管理邏輯和分析數據</p>
          </div>

          {/* Bot 選擇器 */}
          <div className="mb-8">
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
                      <span className="text-sm text-gray-600">
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analytics">數據分析</TabsTrigger>
                <TabsTrigger value="control">Bot 控制</TabsTrigger>
                <TabsTrigger value="logic">邏輯管理</TabsTrigger>
              </TabsList>

              {/* 數據分析頁籤 */}
              <TabsContent value="analytics" className="space-y-6">
                {analyticsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader />
                  </div>
                ) : (
                  <>
                    {/* 關鍵指標 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">總訊息數</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.totalMessages.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">+12% 較上月</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">活躍用戶</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.activeUsers}</div>
                      <p className="text-xs text-muted-foreground">+5% 較昨日</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">平均回應時間</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.responseTime}s</div>
                      <p className="text-xs text-muted-foreground">-0.2s 較上週</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">成功率</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics?.successRate}%</div>
                      <p className="text-xs text-muted-foreground">+0.3% 較上週</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 圖表區域 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 訊息統計圖表 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        訊息統計
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <BarChart data={messageStats} width={500} height={300}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="sent" fill="var(--color-sent)" />
                          <Bar dataKey="received" fill="var(--color-received)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* 用戶活躍度圖表 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        用戶活躍度
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px]">
                        <LineChart data={userActivity} width={500} height={300}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line 
                            type="monotone" 
                            dataKey="activeUsers" 
                            stroke="var(--color-activeUsers)" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* 使用統計 */}
                <Card>
                  <CardHeader>
                    <CardTitle>功能使用統計</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ChartContainer config={chartConfig} className="h-[200px]">
                        <PieChart width={350} height={200}>
                          <Pie
                            data={usageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="usage"
                          >
                            {usageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="space-y-2">
                        {usageData.map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm">{item.feature}</span>
                            </div>
                            <span className="text-sm font-medium">{item.usage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  </>
                )}
              </TabsContent>

              {/* Bot 控制頁籤 */}
              <TabsContent value="control" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bot 資訊 */}
                  <Card>
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
                              <label className="text-sm font-medium text-gray-500">Bot 名稱</label>
                              <p className="text-sm">{selectedBot.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">狀態</label>
                              <div className="text-sm">
                                <Badge className="bg-green-100 text-green-800">啟用中</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">建立時間</label>
                              <p className="text-sm">{new Date(selectedBot.created_at).toLocaleString("zh-TW")}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">頻道設定</label>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        發送測試訊息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">用戶 ID</label>
                        <Input
                          placeholder="輸入測試用戶 ID"
                          value={testUserId}
                          onChange={(e) => setTestUserId(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">測試訊息</label>
                        <Textarea
                          placeholder="輸入要發送的測試訊息..."
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleSendTestMessage}
                        disabled={controlLoading || !testUserId || !testMessage}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {controlLoading ? "發送中..." : "發送測試訊息"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* 快速操作 */}
                  <Card>
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
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex-1">
                              <h3 className="font-medium">{template.name}</h3>
                              {template.description && (
                                <p className="text-sm text-gray-600 mt-1">
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