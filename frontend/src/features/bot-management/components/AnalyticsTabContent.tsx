import React, { useMemo } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot as BotIcon,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { cn } from "@/lib/utils";
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

type IconComponent = React.ComponentType<{ className?: string }>;

const analyticsCopy = {
  en: {
    emptyState: "Select a Bot first to view analytics.",
    kpis: {
      totalMessages: "Messages",
      activeUsers: "Targeted reach",
      retentionRate: "Reach rate",
      peakTime: "Followers",
    },
    comparisons: {
      messages: "From LINE Insight",
      activeUsers: "Reachable friends from LINE",
      retention: "Targeted reach / followers",
      peak: "LINE follower count",
    },
    chartTitle: "Message trend over time",
    chartSubtitle: "Delivered message trend from LINE Insight.",
    timeRange: {
      day: "Today",
      week: "This week",
      month: "This month",
    },
    refreshData: "Refresh data",
    refreshActivities: "Refresh activities",
    chartEmpty: "No message trend data yet",
    activityTitle: "Real-time activity",
    activitySubtitle: "Recent LINE Insight snapshots.",
    live: "Live",
    syncing: "Syncing",
    activityEmpty: "No real-time activity yet",
    heatmapTitle: "Hourly activity",
    heatmapSubtitle: "LINE Insight doesn't expose hourly active users.",
    usageTitle: "Follower demographics",
    usageSubtitle: "Distribution from LINE Insight demographics.",
    noData: "No data",
    usageEmpty: "No feature usage data yet",
    insightTitle: "LINE Insight snapshot",
    insightBody:
      "Overview data is sourced from LINE delivery, follower, and demographic APIs.",
    viewFullReport: "View full report",
    chartMetric: "Messages",
  },
  zh: {
    emptyState: "請先選擇一個 Bot 來查看分析數據。",
    kpis: {
      totalMessages: "總訊息數",
      activeUsers: "可觸及好友",
      retentionRate: "好友觸及率",
      peakTime: "LINE 好友數",
    },
    comparisons: {
      messages: "來自 LINE Insight",
      activeUsers: "LINE 可觸及好友數",
      retention: "可觸及好友 / 好友數",
      peak: "LINE 官方好友數",
    },
    chartTitle: "訊息趨勢",
    chartSubtitle: "LINE Insight 回傳的訊息送達趨勢。",
    timeRange: {
      day: "今日",
      week: "本週",
      month: "本月",
    },
    refreshData: "刷新數據",
    refreshActivities: "刷新活動",
    chartEmpty: "尚無訊息趨勢資料",
    activityTitle: "即時活動",
    activitySubtitle: "最近的 LINE Insight 快照。",
    live: "即時",
    syncing: "同步中",
    activityEmpty: "尚無即時活動",
    heatmapTitle: "每小時活躍資料",
    heatmapSubtitle: "LINE Insight 未提供每小時活躍用戶資料。",
    usageTitle: "好友人口統計分布",
    usageSubtitle: "來自 LINE Insight demographics 的分布資料。",
    noData: "無資料",
    usageEmpty: "尚無功能使用資料",
    insightTitle: "LINE Insight 最新快照",
    insightBody: "總覽資料來自 LINE 的訊息送達、好友與人口統計 API。",
    viewFullReport: "查看完整報表",
    chartMetric: "訊息量",
  },
};

const getLocale = (language: keyof typeof analyticsCopy) =>
  language === "zh" ? "zh-TW" : "en-US";

const formatMessageStatsLabel = (
  stat: MessageStats,
  timeRange: string,
  language: keyof typeof analyticsCopy
) => {
  if (timeRange === "day") {
    if (stat.hour !== undefined) {
      return `${stat.hour}:00`;
    }

    const date = new Date(stat.date);
    return `${date.getHours()}:00`;
  }

  const date = new Date(stat.date);
  if (Number.isNaN(date.getTime())) return stat.date;
  return date.toLocaleDateString(getLocale(language), {
    month: "short",
    day: "numeric",
  });
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);

const formatTimestamp = (
  value: string,
  language: keyof typeof analyticsCopy
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getLocale(language), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const normalizeHour = (hour: string | number | undefined) => {
  const parsed = Number(hour);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPeakHour = (
  userActivity: UserActivity[],
  analytics: BotAnalytics | null
) => {
  if (userActivity.length) {
    const peak = userActivity.reduce(
      (current, next) =>
        next.activeUsers > current.activeUsers ? next : current,
      userActivity[0]
    );
    return normalizeHour(peak.hour);
  }

  return normalizeHour(analytics?.peakHour);
};

const formatHourRange = (hour: number) =>
  `${String(hour).padStart(2, "0")}:00-${String((hour + 1) % 24).padStart(
    2,
    "0"
  )}:00`;

const getActivityIcon = (type: ActivityItem["type"]): IconComponent => {
  switch (type) {
    case "message":
      return MessageSquare;
    case "user_join":
      return Users;
    case "user_leave":
      return UserMinus;
    case "error":
      return Zap;
    case "success":
      return Sparkles;
    default:
      return Activity;
  }
};

const KpiCard = ({
  icon: Icon,
  title,
  value,
  trend,
  comparison,
  accentClass,
  negative = false,
}: {
  icon: IconComponent;
  title: string;
  value: string;
  trend: number;
  comparison: string;
  accentClass: string;
  negative?: boolean;
}) => {
  const trendIsPositive = negative ? trend <= 0 : trend >= 0;
  const TrendIcon = trendIsPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[14px]",
            accentClass
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            trendIsPositive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {formatPercent(Math.abs(trend))}%
        </span>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.01em] text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-400">{comparison}</p>
    </div>
  );
};

const AnalyticsLoading = () => (
  <div className="rounded-[16px] border border-white/70 bg-white/75 p-10 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
    <Loader text="載入分析資料..." />
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-[16px] border border-white/70 bg-white/75 p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-emerald-100 text-[#16a34a]">
      <BotIcon className="h-6 w-6" />
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{message}</p>
  </div>
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
  const { language } = useLanguagePreference();
  const copy = analyticsCopy[language];
  const peakHour = getPeakHour(userActivity, analytics);
  const peakHourRange = formatHourRange(peakHour);
  const isLive = isWebSocketConnected();

  const trendData = useMemo(
    () =>
      messageStats.map((stat) => ({
        name: formatMessageStatsLabel(stat, timeRange, language),
        sent: stat.sent,
        received: stat.received,
        messages: stat.sent,
      })),
    [language, messageStats, timeRange]
  );

  const heatmapData = useMemo(() => {
    const activityMap = new Map(
      userActivity.map((item) => [normalizeHour(item.hour), item.activeUsers])
    );

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: activityMap.get(hour) || 0,
    }));
  }, [userActivity]);

  const hasHourlyActivity = userActivity.some((item) => item.activeUsers > 0);
  const heatmapMax = Math.max(...heatmapData.map((item) => item.value), 1);
  const usageTotal = usageData.reduce((total, item) => total + item.usage, 0);
  const recentActivities = activities.slice(0, 6);
  const lineFollowers = analytics?.lineFollowers || 0;

  if (!selectedBotId) {
    return <EmptyState message={copy.emptyState} />;
  }

  if (analyticsLoading && !analytics) {
    return <AnalyticsLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={MessageSquare}
          title={copy.kpis.totalMessages}
          value={formatNumber(analytics?.totalMessages || 0)}
          trend={0}
          comparison={copy.comparisons.messages}
          accentClass="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          icon={Users}
          title={copy.kpis.activeUsers}
          value={formatNumber(analytics?.activeUsers || 0)}
          trend={0}
          comparison={copy.comparisons.activeUsers}
          accentClass="bg-sky-100 text-sky-700"
        />
        <KpiCard
          icon={TrendingUp}
          title={copy.kpis.retentionRate}
          value={`${formatPercent(analytics?.userRetention || 0)}%`}
          trend={0}
          comparison={copy.comparisons.retention}
          accentClass="bg-violet-100 text-violet-700"
        />
        <KpiCard
          icon={UserMinus}
          title={copy.kpis.peakTime}
          value={formatNumber(lineFollowers)}
          trend={0}
          comparison={copy.comparisons.peak}
          accentClass="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <section className="rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-950">
                {copy.chartTitle}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {copy.chartSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "day", label: copy.timeRange.day },
                { value: "week", label: copy.timeRange.week },
                { value: "month", label: copy.timeRange.month },
              ].map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTimeRangeChange(item.value)}
                  className={cn(
                    "h-9 rounded-full px-3 text-xs font-semibold",
                    timeRange === item.value
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-500 hover:bg-white"
                  )}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefreshData}
                className="h-9 w-9 rounded-full border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50"
                aria-label={copy.refreshData}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-6 h-[300px]">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ left: -12, right: 12 }}>
                  <defs>
                    <linearGradient
                      id="messageFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#16a34a"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor="#16a34a"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 8" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "#16a34a", strokeWidth: 1 }}
                    contentStyle={{
                      border: "1px solid rgba(255,255,255,0.8)",
                      borderRadius: 16,
                      boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name={copy.chartMetric}
                    stroke="#16a34a"
                    strokeWidth={3}
                    fill="url(#messageFill)"
                    activeDot={{
                      r: 5,
                      fill: "#16a34a",
                      stroke: "#fff",
                      strokeWidth: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-[16px] bg-white/60 text-sm text-slate-400">
                {copy.chartEmpty}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-950">
                {copy.activityTitle}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {copy.activitySubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border-white/70 bg-white/70 text-xs",
                  isLive ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {isLive ? copy.live : copy.syncing}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onRefreshActivities}
                className="h-9 w-9 rounded-full border-emerald-100 bg-white/70 text-emerald-700 hover:bg-emerald-50"
                aria-label={copy.refreshActivities}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentActivities.length ? (
              recentActivities.map((item) => {
                const Icon = getActivityIcon(item.type);

                return (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-[16px] border border-white/70 bg-white/65 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <span className="shrink-0 text-xs font-medium text-slate-400">
                          {formatTimestamp(item.timestamp, language)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-[16px] bg-white/60 text-sm text-slate-400">
                {copy.activityEmpty}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">
                {copy.heatmapTitle}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {copy.heatmapSubtitle}
              </p>
            </div>
            {hasHourlyActivity && (
              <Badge className="border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {peakHourRange}
              </Badge>
            )}
          </div>

          {hasHourlyActivity ? (
            <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6 xl:grid-cols-8">
              {heatmapData.map((item) => {
                const intensity = item.value / heatmapMax;

                return (
                  <div
                    key={item.hour}
                    className={cn(
                      "flex h-16 flex-col justify-between rounded-[14px] border border-white/70 p-3 shadow-sm",
                      intensity > 0.58 ? "text-white" : "text-slate-700"
                    )}
                    style={{
                      backgroundColor: `rgba(22, 163, 74, ${0.08 + intensity * 0.74})`,
                    }}
                  >
                    <span className="text-xs font-semibold">
                      {String(item.hour).padStart(2, "0")}:00
                    </span>
                    <span className="text-sm font-semibold">
                      {formatNumber(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 flex h-[192px] items-center justify-center rounded-[16px] bg-white/60 text-sm text-slate-400">
              {copy.noData}
            </div>
          )}
        </section>

        <section className="rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div>
            <p className="text-lg font-semibold text-slate-950">
              {copy.usageTitle}
            </p>
            <p className="mt-1 text-sm text-slate-500">{copy.usageSubtitle}</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div className="h-[220px]">
              {usageData.length && usageTotal ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={usageData}
                      dataKey="usage"
                      nameKey="feature"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={4}
                    >
                      {usageData.map((entry) => (
                        <Cell key={entry.feature} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        border: "1px solid rgba(255,255,255,0.8)",
                        borderRadius: 16,
                        boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-full bg-white/60 text-sm text-slate-400">
                  {copy.noData}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {usageData.length ? (
                usageData.map((item) => {
                  const percent = usageTotal
                    ? (item.usage / usageTotal) * 100
                    : 0;

                  return (
                    <div
                      key={item.feature}
                      className="flex items-center justify-between gap-3 rounded-[14px] bg-white/60 px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.feature}</span>
                      </span>
                      <span className="text-sm font-semibold text-slate-950">
                        {formatPercent(percent)}%
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[14px] bg-white/60 px-3 py-8 text-center text-sm text-slate-400">
                  {copy.usageEmpty}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-[16px] border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-stone-50 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#16a34a] shadow-sm">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {copy.insightTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {copy.insightBody}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onRefreshData}
          className="rounded-[14px] bg-[#16a34a] px-5 font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803d]"
        >
          {copy.viewFullReport}
        </Button>
      </section>
    </div>
  );
};

export default AnalyticsTabContent;
