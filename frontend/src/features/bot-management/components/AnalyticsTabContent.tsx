import React from "react";
import { Bot, MessageSquare, TrendingUp, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ChartWidget from "./analytics/ChartWidget";
import MetricCard from "./analytics/MetricCard";
import OptimizedActivityFeed from "./activity/OptimizedActivityFeed";
import {
  ActivityItem,
  BotAnalytics,
  MessageStats,
  UsageData,
  UserActivity,
} from "@/features/bot-management/types/botManagement";

interface AnalyticsTabContentProps {
  selectedBotId: string;
  analyticsLoading: boolean;
  analytics: BotAnalytics | null;
  messageStats: MessageStats[];
  userActivity: UserActivity[];
  activities: ActivityItem[];
  usageData: UsageData[];
  timeRange: string;
  onRefreshData: () => void;
  onRefreshActivities: () => void;
  onTimeRangeChange: (range: string) => void;
  isWebSocketConnected: () => boolean;
}

const formatMessageStatsLabel = (stat: MessageStats, timeRange: string) => {
  if (timeRange === "day") {
    if ("hour" in stat) {
      return `${stat.hour}:00`;
    }

    const date = new Date(stat.date);
    return `${date.getHours()}:00`;
  }

  const date = new Date(stat.date);
  return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
};

const AnalyticsSkeleton = () => (
  <>
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex space-x-3">
                  <div className="h-4 w-4 bg-muted rounded" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </>
);

const AnalyticsTabContent: React.FC<AnalyticsTabContentProps> = ({
  selectedBotId,
  analyticsLoading,
  analytics,
  messageStats,
  userActivity,
  activities,
  usageData,
  timeRange,
  onRefreshData,
  onRefreshActivities,
  onTimeRangeChange,
  isWebSocketConnected,
}) => {
  if (!selectedBotId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">
            請先選擇一個 Bot 來查看分析數據
          </p>
        </CardContent>
      </Card>
    );
  }

  if (analyticsLoading && !analytics) {
    return <AnalyticsSkeleton />;
  }

  return (
    <>
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
              period: "較上月",
            }}
            variant="info"
            showMiniChart
            miniChartData={messageStats.map((s) => s.sent + s.received)}
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
              period: "較昨日",
            }}
            variant="success"
            showMiniChart
            miniChartData={userActivity.map((u) => u.activeUsers)}
          />
        </div>

        <div>
          <MetricCard
            key="user-retention"
            icon={UserPlus}
            title="用戶留存率"
            value={analytics?.userRetention || 0}
            unit="%"
            trend={{
              value: 5.2,
              isPositive: true,
              period: "較上週",
            }}
            variant="purple"
            description="回訪用戶佔比"
          />
        </div>

        <div>
          <MetricCard
            key="peak-hour"
            icon={TrendingUp}
            title="高峰時段"
            value={
              analytics?.peakHour !== undefined
                ? `${analytics.peakHour}:00`
                : "N/A"
            }
            trend={{
              value: 0,
              isPositive: true,
              period: "訊息最多時段",
            }}
            variant="warning"
            description="訊息量最高的時段"
          />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12 mt-8">
        <div className="lg:col-span-8">
          <div className="space-y-6">
            <ChartWidget
              title="訊息統計趨勢"
              data={messageStats.map((stat) => ({
                name: formatMessageStatsLabel(stat, timeRange),
                originalDate: stat.date,
                發送: stat.sent,
                接收: stat.received,
              }))}
              chartType="bar"
              isLoading={analyticsLoading}
              height={320}
              showControls
              showRefresh
              onRefresh={onRefreshData}
              trend={{
                value: 8.5,
                isPositive: true,
                description: "本週較上週增長",
              }}
              config={{
                發送: { label: "發送", color: "#10b981" },
                接收: { label: "接收", color: "#06d6a0" },
              }}
              timeRange={{
                current: timeRange,
                options: [
                  { value: "day", label: "今日" },
                  { value: "week", label: "本週" },
                  { value: "month", label: "本月" },
                ],
                onChange: onTimeRangeChange,
              }}
            />

            <ChartWidget
              title="24小時用戶活躍度分布"
              data={userActivity.map((activity) => ({
                name: `${activity.hour}:00`,
                活躍用戶: activity.activeUsers,
              }))}
              chartType="bar"
              isLoading={analyticsLoading}
              height={320}
              showControls
              showRefresh
              onRefresh={onRefreshData}
              trend={{
                value: 15.2,
                isPositive: true,
                description: "相較上週活躍度提升",
              }}
              config={{
                活躍用戶: {
                  label: "活躍用戶數",
                  color: "#10b981",
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="space-y-6">
            <OptimizedActivityFeed
              activities={activities}
              isLoading={analyticsLoading}
              height={360}
              showRefresh
              onRefresh={onRefreshActivities}
              autoRefresh={false}
              refreshInterval={30000}
              isWebSocketConnected={isWebSocketConnected}
            />

            <ChartWidget
              title="功能使用統計"
              data={usageData.map((usage) => ({
                name: usage.feature,
                value: usage.usage,
                fill: usage.color,
              }))}
              chartType="pie"
              isLoading={analyticsLoading}
              height={320}
              customColors={usageData.map((u) => u.color)}
              config={{
                value: {
                  label: "使用次數",
                  color: "hsl(var(--primary))",
                },
              }}
              trend={{
                value: 8.5,
                isPositive: true,
                description: "相較上週使用率提升",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsTabContent;
