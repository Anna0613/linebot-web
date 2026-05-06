import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  BarChart3,
  Bot as BotIcon,
  CheckCircle2,
  Edit3,
  Grid3X3,
  LayoutDashboard,
  List,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import AppShell, { AppRobotIllustration } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader } from "@/components/ui/loader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/UnifiedApiClient";
import { useBotManagement } from "@/features/bot-management/hooks/useBotManagement";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { Bot as BotType } from "@/types/bot";

const BotDetailsModal = lazy(() => import("./BotDetailsModal"));

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

interface AnalyticsPayload {
  totalMessages?: number;
  activeUsers?: number;
  totalUsers?: number;
  todayMessages?: number;
  weekMessages?: number;
  monthMessages?: number;
}

interface MessageStatPayload {
  date?: string;
  sent?: number;
  received?: number;
  hour?: number;
}

interface BotUsersPayload {
  users?: Array<{ is_followed?: boolean }>;
  total_count?: number;
  pagination?: {
    total?: number;
  };
}

interface TrendPoint {
  date: string;
  label: string;
  messages: number;
  sent: number;
  received: number;
}

interface AnalyticsSummary {
  messagesSent: number;
  newUsers: number;
  blockCount: number;
  engagementRate: number;
  totalSubscribers: number;
  messagesChange: number;
  usersChange: number;
  blockChange: number;
  engagementChange: number;
  chartData: TrendPoint[];
  isLoading: boolean;
}

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "inactive";
type IconComponent = React.ComponentType<{ className?: string }>;

const dashboardCopy = {
  en: {
    sidebarSubtitle: "Workspace",
    botHealthTitle: "Bot is ready",
    botHealthBody: "Check connection, messages, and friends from here.",
    nav: {
      home: "Home",
      myBots: "My Bots",
      createBot: "Create Bot",
      botEditor: "Bot Editor",
      analytics: "Interactions",
      settings: "Settings",
    },
    headerKicker: "Workspace",
    welcome: "Welcome back",
    closeNavigation: "Close navigation",
    openNavigation: "Open navigation",
    notifications: "Notifications",
    heroBadge: "Your LINE Bot workspace",
    heroTitle: "What would you like to update today?",
    heroBody:
      "Create bots, adjust replies, and check recent interactions from one clean workspace.",
    createLineBot: "Create LINE Bot",
    viewMyBots: "View My Bots",
    myBotsTitle: "My Bots",
    myBotsSubtitle: "Search, filter, and open the right bot quickly.",
    newBot: "New Bot",
    searchBots: "Search bots",
    filter: "Filter",
    allStatus: "All status",
    active: "Active",
    inactive: "Inactive",
    noBotsTitle: "No bots found",
    noBotsBody: "Create a new LINE Bot or adjust the current filter.",
    botFallbackDescription: "LINE Bot workspace",
    statusActive: "active",
    statusInactive: "inactive",
    created: "Created",
    updated: "Updated",
    channel: "Channel",
    subscribers: "Subscribers",
    connected: "Connected",
    pending: "Pending",
    edit: "Edit",
    settings: "Settings",
    analyticsTitle: "Recent interactions",
    analyticsSubtitle: "A simple view of messages and friends across your bots.",
    botsTracked: "bots tracked",
    metrics: {
      messagesSent: "Messages sent",
      newUsers: "New users",
      blockCount: "Block count",
      engagementRate: "Engagement rate",
    },
    chartTitle: "Message trend",
    chartSubtitle: "Sent and received messages from every bot.",
    sevenDayView: "7 day view",
    chartMessages: "Messages",
    chartSent: "Sent",
  },
  zh: {
    sidebarSubtitle: "工作台",
    botHealthTitle: "Bot 目前正常",
    botHealthBody: "查看連線、訊息與好友互動。",
    nav: {
      home: "工作台",
      myBots: "我的 Bot",
      createBot: "建立 Bot",
      botEditor: "設計",
      analytics: "互動紀錄",
      settings: "設定",
    },
    headerKicker: "工作台",
    welcome: "歡迎回來",
    closeNavigation: "關閉導覽",
    openNavigation: "開啟導覽",
    notifications: "通知",
    heroBadge: "你的 LINE Bot 工作台",
    heroTitle: "今天想更新哪一個 Bot？",
    heroBody:
      "建立 Bot、調整回覆、查看最近互動，都從這裡開始。",
    createLineBot: "建立我的 Bot",
    viewMyBots: "查看我的 Bot",
    myBotsTitle: "我的 Bot",
    myBotsSubtitle: "找到要調整的 Bot，快速進入設計或設定。",
    newBot: "新增 Bot",
    searchBots: "搜尋 Bot",
    filter: "篩選",
    allStatus: "所有狀態",
    active: "啟用",
    inactive: "停用",
    noBotsTitle: "找不到 Bot",
    noBotsBody: "建立第一個 LINE Bot 後，就能開始設計回覆與查看互動。",
    botFallbackDescription: "LINE Bot 工作區",
    statusActive: "啟用",
    statusInactive: "停用",
    created: "建立時間",
    updated: "更新時間",
    channel: "Channel",
    subscribers: "好友",
    connected: "已連線",
    pending: "待設定",
    edit: "編輯",
    settings: "設定",
    analyticsTitle: "最近互動",
    analyticsSubtitle: "用簡單的方式查看所有 Bot 的訊息與好友變化。",
    botsTracked: "個 Bot",
    metrics: {
      messagesSent: "已發送訊息",
      newUsers: "新增好友",
      blockCount: "封鎖數",
      engagementRate: "互動率",
    },
    chartTitle: "訊息趨勢",
    chartSubtitle: "所有 Bot 的發送與接收訊息。",
    sevenDayView: "最近 7 天",
    chartMessages: "訊息量",
    chartSent: "已發送",
  },
};

const fallbackTrendData = (): TrendPoint[] =>
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
    date: label,
    label,
    messages: 0,
    sent: 0,
    received: 0,
  }));

const initialAnalyticsSummary: AnalyticsSummary = {
  messagesSent: 0,
  newUsers: 0,
  blockCount: 0,
  engagementRate: 0,
  totalSubscribers: 0,
  messagesChange: 0,
  usersChange: 0,
  blockChange: 0,
  engagementChange: 0,
  chartData: fallbackTrendData(),
  isLoading: false,
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateChange = (current: number, baseline: number) => {
  if (!baseline) {
    return current > 0 ? 100 : 0;
  }
  return ((current - baseline) / baseline) * 100;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatTrendLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getInitial = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "B";
};

const getApiData = <T,>(
  result: PromiseSettledResult<{ data?: unknown; error?: string }>
): T | null => {
  if (result.status !== "fulfilled" || result.value.error) {
    return null;
  }
  return (result.value.data as T) || null;
};

const TrendPill = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        isPositive
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatPercent(Math.abs(value))}%
    </span>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  suffix,
  change,
  accent,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  suffix?: string;
  change: number;
  accent: string;
}) => (
  <div className="rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-[14px]",
          accent
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <TrendPill value={change} />
    </div>
    <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
    <div className="mt-2 flex items-end gap-1">
      <span className="text-3xl font-semibold text-slate-950">{value}</span>
      {suffix && (
        <span className="pb-1 text-sm font-semibold text-slate-500">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const HomeBotfly: React.FC<HomeBotflyProps> = ({ user }) => {
  const navigate = useNavigate();
  const { language } = useLanguagePreference();
  const copy = dashboardCopy[language];
  const { bots, isLoading, error, fetchBots } = useBotManagement();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [subscriberCounts, setSubscriberCounts] = useState<
    Record<string, number>
  >({});
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>(
    initialAnalyticsSummary
  );

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

  useEffect(() => {
    let isMounted = true;

    const loadAggregateAnalytics = async () => {
      if (!bots.length) {
        setAnalyticsSummary(initialAnalyticsSummary);
        setSubscriberCounts({});
        return;
      }

      setAnalyticsSummary((current) => ({ ...current, isLoading: true }));

      const results = await Promise.allSettled(
        bots.map(async (bot: BotType) => {
          const [analyticsResult, statsResult, usersResult] =
            await Promise.allSettled([
              apiClient.getBotAnalytics(bot.id, "week"),
              apiClient.getBotMessageStats(bot.id, 7, "day"),
              apiClient.getBotUsers(bot.id, 500, 0),
            ]);

          const analytics = getApiData<AnalyticsPayload>(analyticsResult);
          const messageStats =
            getApiData<MessageStatPayload[]>(statsResult) || [];
          const usersPayload = getApiData<BotUsersPayload>(usersResult);

          return {
            botId: bot.id,
            analytics,
            messageStats,
            usersPayload,
          };
        })
      );

      if (!isMounted) return;

      const successfulResults = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      );

      const nextSubscriberCounts: Record<string, number> = {};
      const trendMap = new Map<string, TrendPoint>();

      let totalMessages = 0;
      let sentMessages = 0;
      let activeUsers = 0;
      let totalSubscribers = 0;
      let blockCount = 0;
      let todayMessages = 0;
      let weekMessages = 0;

      successfulResults.forEach((result) => {
        const analytics = result.analytics;
        const users = result.usersPayload?.users || [];
        const subscriberTotal =
          toNumber(result.usersPayload?.total_count) ||
          toNumber(result.usersPayload?.pagination?.total) ||
          toNumber(analytics?.totalUsers) ||
          users.length;

        nextSubscriberCounts[result.botId] = subscriberTotal;
        totalSubscribers += subscriberTotal;
        blockCount += users.filter(
          (lineUser) => lineUser.is_followed === false
        ).length;

        totalMessages += toNumber(analytics?.totalMessages);
        activeUsers += toNumber(analytics?.activeUsers);
        todayMessages += toNumber(analytics?.todayMessages);
        weekMessages += toNumber(analytics?.weekMessages);

        result.messageStats.forEach((stat, index) => {
          const key = stat.date || `${result.botId}-${index}`;
          const existing = trendMap.get(key) || {
            date: key,
            label: stat.date
              ? formatTrendLabel(stat.date)
              : language === "zh"
                ? `第 ${index + 1} 天`
                : `Day ${index + 1}`,
            messages: 0,
            sent: 0,
            received: 0,
          };
          const sent = toNumber(stat.sent);
          const received = toNumber(stat.received);

          existing.sent += sent;
          existing.received += received;
          existing.messages += sent + received;
          trendMap.set(key, existing);
          sentMessages += sent;
        });
      });

      const messagesSent = sentMessages || totalMessages;
      const engagementRate = totalSubscribers
        ? Math.min(100, (activeUsers / totalSubscribers) * 100)
        : 0;
      const dailyAverage = weekMessages ? weekMessages / 7 : 0;
      const chartData = Array.from(trendMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      setSubscriberCounts(nextSubscriberCounts);
      setAnalyticsSummary({
        messagesSent,
        newUsers: activeUsers,
        blockCount,
        engagementRate,
        totalSubscribers,
        messagesChange: calculateChange(todayMessages, dailyAverage),
        usersChange: totalSubscribers
          ? (activeUsers / totalSubscribers) * 100
          : 0,
        blockChange: blockCount ? -Math.min(blockCount * 1.8, 12) : 0,
        engagementChange: engagementRate - 50,
        chartData: chartData.length ? chartData : fallbackTrendData(),
        isLoading: false,
      });
    };

    void loadAggregateAnalytics();

    return () => {
      isMounted = false;
    };
  }, [bots, language]);

  const avatarUrl = user?.picture_url;

  const filteredBots = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return bots.filter((bot: BotType) => {
      const matchesSearch = normalizedSearch
        ? bot.name.toLowerCase().includes(normalizedSearch)
        : true;
      const isActive = bot.is_active !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [bots, searchQuery, statusFilter]);

  const metricCards = [
    {
      label: copy.metrics.messagesSent,
      value: formatNumber(analyticsSummary.messagesSent),
      change: analyticsSummary.messagesChange,
      icon: Send,
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      label: copy.metrics.newUsers,
      value: formatNumber(analyticsSummary.newUsers),
      change: analyticsSummary.usersChange,
      icon: Users,
      accent: "bg-sky-100 text-sky-700",
    },
    {
      label: copy.metrics.blockCount,
      value: formatNumber(analyticsSummary.blockCount),
      change: analyticsSummary.blockChange,
      icon: Ban,
      accent: "bg-rose-100 text-rose-700",
    },
    {
      label: copy.metrics.engagementRate,
      value: formatPercent(analyticsSummary.engagementRate),
      suffix: "%",
      change: analyticsSummary.engagementChange,
      icon: Activity,
      accent: "bg-violet-100 text-violet-700",
    },
  ];

  const handleEditClick = (botId: string) => {
    navigate("/bots/visual-editor", {
      state: {
        selectedBotId: botId,
        activeTab: "logic",
        returnTo: "/dashboard",
        returnLabel: "返回工作台",
      },
    });
  };

  const showBotDetails = (bot: BotType) => {
    setDetailsModal({
      isOpen: true,
      bot,
    });
  };

  const closeDetailsModal = () => {
    setDetailsModal({
      isOpen: false,
      bot: null,
    });
  };

  return (
    <TooltipProvider delayDuration={120}>
      <AppShell
        user={{ ...user, avatar_url: avatarUrl }}
        activeNav="home"
        headerKicker={copy.headerKicker}
        welcomeLabel={copy.welcome}
        sidebarCalloutTitle={copy.botHealthTitle}
        sidebarCalloutBody={copy.botHealthBody}
        innerClassName="max-w-[1480px]"
      >
        <div className="flex w-full flex-col gap-8 py-6">
          <section className="grid overflow-hidden rounded-[16px] border border-white/70 bg-white/55 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:grid-cols-[1.12fr_0.88fr]">
            <div className="flex flex-col justify-center px-6 py-8 sm:px-8 lg:py-12">
              <Badge className="w-fit border-emerald-200 bg-emerald-50 px-3 py-1 text-[#166534] hover:bg-emerald-50">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {copy.heroBadge}
              </Badge>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                {copy.heroTitle}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                {copy.heroBody}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-[16px] bg-[#16a34a] px-5 font-semibold text-white shadow-lg shadow-emerald-700/20 hover:bg-[#15803d]"
                >
                  <Link to="/bots/create">
                    <Plus className="mr-2 h-4 w-4" />
                    {copy.createLineBot}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex items-end justify-center bg-gradient-to-br from-emerald-100/70 via-white/40 to-stone-100/80 px-6 py-8">
              <AppRobotIllustration />
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {copy.myBotsTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {copy.myBotsSubtitle}
                </p>
              </div>
              <Button
                asChild
                className="h-11 rounded-[16px] bg-[#16a34a] px-4 font-semibold text-white hover:bg-[#15803d]"
              >
                <Link to="/bots/create">
                  <Plus className="mr-2 h-4 w-4" />
                  {copy.newBot}
                </Link>
              </Button>
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-[16px] border border-white/70 bg-white/65 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={copy.searchBots}
                  className="h-11 rounded-[14px] border-white/80 bg-white/80 pl-10 text-slate-700 placeholder:text-slate-400"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as StatusFilter)
                }
              >
                <SelectTrigger className="h-11 rounded-[14px] border-white/80 bg-white/80 text-slate-700 lg:w-44">
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-slate-400" />
                  <SelectValue placeholder={copy.filter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.allStatus}</SelectItem>
                  <SelectItem value="active">{copy.active}</SelectItem>
                  <SelectItem value="inactive">{copy.inactive}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-[14px] border border-white/80 bg-white/80 p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={language === "zh" ? "網格檢視" : "Grid view"}
                  className={cn(
                    "h-9 w-9 rounded-[12px] text-slate-500",
                    viewMode === "grid" && "bg-emerald-50 text-[#166534]"
                  )}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={language === "zh" ? "列表檢視" : "List view"}
                  className={cn(
                    "h-9 w-9 rounded-[12px] text-slate-500",
                    viewMode === "list" && "bg-emerald-50 text-[#166534]"
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="rounded-[16px] border border-white/70 bg-white/70 p-10 shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
                <Loader text={language === "zh" ? "載入 Bot..." : "Loading bots..."} />
              </div>
            ) : filteredBots.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-emerald-200 bg-white/60 px-6 py-12 text-center">
                <BotIcon className="mx-auto h-12 w-12 text-[#16a34a]" />
                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                  {copy.noBotsTitle}
                </h3>
                <p className="mt-2 text-sm text-slate-500">{copy.noBotsBody}</p>
                <Button
                  asChild
                  className="mt-5 rounded-[16px] bg-[#16a34a] text-white hover:bg-[#15803d]"
                >
                  <Link to="/bots/create">{copy.createLineBot}</Link>
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-4",
                  viewMode === "grid"
                    ? "md:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                )}
              >
                {filteredBots.map((bot: BotType) => {
                  const isActive = bot.is_active !== false;
                  const channelConfigured = Boolean(
                    bot.channel_token && bot.channel_secret
                  );

                  return (
                    <div
                      key={bot.id}
                      className={cn(
                        "rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-transform hover:-translate-y-0.5",
                        viewMode === "list" &&
                          "md:grid md:grid-cols-[1.1fr_1.4fr_auto] md:items-center md:gap-5"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#16a34a] to-emerald-300 text-lg font-semibold text-white shadow-lg shadow-emerald-700/15">
                          {getInitial(bot.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-slate-950">
                              {bot.name}
                            </h3>
                            <Badge
                              className={cn(
                                "border px-2.5 py-1 text-xs",
                                isActive
                                  ? "border-emerald-200 bg-emerald-50 text-[#166534] hover:bg-emerald-50"
                                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              {isActive
                                ? copy.statusActive
                                : copy.statusInactive}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {bot.description || copy.botFallbackDescription}
                          </p>
                        </div>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm md:mt-0">
                        <div className="rounded-[14px] bg-slate-50/80 p-3">
                          <dt className="text-xs text-slate-500">
                            {copy.created}
                          </dt>
                          <dd className="mt-1 font-medium text-slate-800">
                            {formatDate(bot.created_at)}
                          </dd>
                        </div>
                        <div className="rounded-[14px] bg-slate-50/80 p-3">
                          <dt className="text-xs text-slate-500">
                            {copy.updated}
                          </dt>
                          <dd className="mt-1 font-medium text-slate-800">
                            {formatDate(bot.updated_at)}
                          </dd>
                        </div>
                        <div className="rounded-[14px] bg-slate-50/80 p-3">
                          <dt className="text-xs text-slate-500">
                            {copy.channel}
                          </dt>
                          <dd
                            className={cn(
                              "mt-1 font-medium",
                              channelConfigured
                                ? "text-[#166534]"
                                : "text-amber-700"
                            )}
                          >
                            {channelConfigured ? copy.connected : copy.pending}
                          </dd>
                        </div>
                        <div className="rounded-[14px] bg-slate-50/80 p-3">
                          <dt className="text-xs text-slate-500">
                            {copy.subscribers}
                          </dt>
                          <dd className="mt-1 font-medium text-slate-800">
                            {analyticsSummary.isLoading
                              ? "--"
                              : formatNumber(subscriberCounts[bot.id] || 0)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex justify-end gap-2 md:mt-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              asChild
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-[14px] border-white/80 bg-white/70 text-slate-600 hover:bg-emerald-50 hover:text-[#166534]"
                            >
                              <Link
                                to="/bots/management"
                                aria-label={copy.analyticsTitle}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copy.analyticsTitle}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-[14px] border-white/80 bg-white/70 text-slate-600 hover:bg-emerald-50 hover:text-[#166534]"
                              onClick={() => handleEditClick(bot.id)}
                              aria-label={copy.edit}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copy.edit}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-[14px] border-white/80 bg-white/70 text-slate-600 hover:bg-emerald-50 hover:text-[#166534]"
                              onClick={() => showBotDetails(bot)}
                              aria-label={copy.settings}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copy.settings}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {copy.analyticsTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {copy.analyticsSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-2 text-sm text-slate-500">
                <LayoutDashboard className="h-4 w-4 text-[#16a34a]" />
                {formatNumber(bots.length)} {copy.botsTracked}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>

            <div className="mt-4 rounded-[16px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    {copy.chartTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {copy.chartSubtitle}
                  </p>
                </div>
                <Badge className="w-fit border-emerald-200 bg-emerald-50 text-[#166534] hover:bg-emerald-50">
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  {copy.sevenDayView}
                </Badge>
              </div>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analyticsSummary.chartData}
                    margin={{ left: -20, right: 8, top: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="messagesGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#16a34a"
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="95%"
                          stopColor="#16a34a"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="sentGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#38bdf8"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="95%"
                          stopColor="#38bdf8"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#d9e5d6"
                      strokeDasharray="4 8"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      width={44}
                    />
                    <RechartsTooltip
                      cursor={{
                        stroke: "#16a34a",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      contentStyle={{
                        border: "1px solid rgba(255,255,255,0.9)",
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.92)",
                        boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      name={copy.chartMessages}
                      stroke="#16a34a"
                      strokeWidth={3}
                      fill="url(#messagesGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      name={copy.chartSent}
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="url(#sentGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </div>

        <Suspense fallback={null}>
          <BotDetailsModal
            isOpen={detailsModal.isOpen}
            onClose={closeDetailsModal}
            bot={detailsModal.bot}
          />
        </Suspense>
      </AppShell>
    </TooltipProvider>
  );
};

export default HomeBotfly;
