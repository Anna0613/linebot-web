import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Bot as BotIcon,
  KeyRound,
  Pencil,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Power,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
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

import AppShell from "@/components/layout/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Loader } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import { listItem, listStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/UnifiedApiClient";
import BotCreationForm from "@/features/bots/components/BotCreationForm";
import BotEditModal from "@/features/bots/components/BotEditModal";
import { useBotManagement } from "@/features/bot-management/hooks/useBotManagement";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useToast } from "@/hooks/use-toast";
import { Bot as BotType } from "@/types/bot";

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
    botName: "Bot",
    status: "Status",
    enabled: "Enabled",
    actions: "Actions",
    botActions: "Bot actions",
    enableBot: "Enable Bot",
    disableBot: "Disable Bot",
    deleteBot: "Delete Bot",
    deleteConfirmTitle: "Delete Bot?",
    deleteConfirmDescription:
      "This will permanently remove the bot and its related settings. This action cannot be undone.",
    cancel: "Cancel",
    confirmDelete: "Delete",
    deleting: "Deleting...",
    actionFailed: "Action failed",
    toggleSuccess: "Bot status updated",
    deleteSuccess: "Bot deleted",
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
    analyticsSubtitle:
      "A simple view of messages and friends across your bots.",
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
    heroBody: "建立 Bot、調整回覆、查看最近互動，都從這裡開始。",
    createLineBot: "建立我的 Bot",
    viewMyBots: "查看我的 Bot",
    myBotsTitle: "我的 Bot",
    myBotsSubtitle: "找到要調整的 Bot，快速進入設計或設定。",
    newBot: "新增 Bot",
    searchBots: "搜尋 Bot",
    filter: "篩選",
    botName: "Bot",
    status: "狀態",
    enabled: "是否啟用",
    actions: "動作",
    botActions: "Bot 操作",
    enableBot: "啟用 Bot",
    disableBot: "關閉 Bot",
    deleteBot: "刪除 Bot",
    deleteConfirmTitle: "確認刪除 Bot？",
    deleteConfirmDescription:
      "刪除後，這個 Bot 和相關設定會永久移除，此操作無法復原。",
    cancel: "取消",
    confirmDelete: "刪除",
    deleting: "刪除中...",
    actionFailed: "操作失敗",
    toggleSuccess: "Bot 狀態已更新",
    deleteSuccess: "Bot 已刪除",
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
        "inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-xs font-semibold",
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

const BotStateBadge = ({
  active,
  activeLabel,
  inactiveLabel,
  icon: Icon,
  inactiveTone = "slate",
  onClick,
  disabled,
  isLoading,
  ariaLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  icon: IconComponent;
  inactiveTone?: "amber" | "slate";
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
}) => {
  const className = cn(
    "inline-flex h-8 items-center gap-1 rounded-[10px] border px-2.5 py-1 text-xs font-semibold transition-colors",
    active
      ? "border-emerald-200 bg-emerald-50 text-[#166534] hover:bg-emerald-50"
      : inactiveTone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50"
        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50",
    onClick &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
  );
  const content = (
    <>
      {isLoading ? <Loader size="sm" /> : <Icon className="h-3.5 w-3.5" />}
      {active ? activeLabel : inactiveLabel}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <Badge
      className={cn(
        className,
        "!rounded-[10px] focus:ring-0 focus:ring-offset-0"
      )}
    >
      {content}
    </Badge>
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
  <div className="rounded-[12px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-[10px]",
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
  const location = useLocation();
  const { language } = useLanguagePreference();
  const { toast } = useToast();
  const copy = dashboardCopy[language];
  const { bots, isLoading, error, fetchBots } = useBotManagement();
  const { refreshBots: refreshSelectedBots } = useSelectedBot();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [actionBotId, setActionBotId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BotType | null>(null);
  const [editTarget, setEditTarget] = useState<BotType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>(
    initialAnalyticsSummary
  );

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const state = location.state as { openCreateBot?: boolean } | null;

    if (params.get("createBot") === "1" || state?.openCreateBot) {
      setIsCreateDialogOpen(true);
    }
  }, [location.search, location.state]);

  useEffect(() => {
    let isMounted = true;

    const loadAggregateAnalytics = async () => {
      if (!bots.length) {
        setAnalyticsSummary(initialAnalyticsSummary);
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

  const openCreateDialog = () => setIsCreateDialogOpen(true);

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);

    const params = new URLSearchParams(location.search);
    const hasCreateParam = params.has("createBot");
    const state = location.state as { openCreateBot?: boolean } | null;
    if (hasCreateParam) {
      params.delete("createBot");
    }

    if (hasCreateParam || state?.openCreateBot) {
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : "",
        },
        { replace: true, state: null }
      );
    }
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    if (open) {
      setIsCreateDialogOpen(true);
      return;
    }

    closeCreateDialog();
  };

  const handleBotCreated = () => {
    void fetchBots();
  };

  const refreshBotLists = async () => {
    await Promise.all([fetchBots(), refreshSelectedBots()]);
  };

  const handleToggleBot = async (bot: BotType) => {
    const nextIsActive = bot.is_active === false;
    setActionBotId(bot.id);

    try {
      const response = await apiClient.updateBot(bot.id, {
        is_active: nextIsActive,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: copy.toggleSuccess,
        description: nextIsActive ? copy.enableBot : copy.disableBot,
      });
      await refreshBotLists();
    } catch (toggleError) {
      toast({
        variant: "destructive",
        title: copy.actionFailed,
        description:
          toggleError instanceof Error
            ? toggleError.message
            : copy.actionFailed,
      });
    } finally {
      setActionBotId(null);
    }
  };

  const handleDeleteBot = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      const response = await apiClient.deleteBot(deleteTarget.id);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: copy.deleteSuccess,
        description: deleteTarget.name,
      });
      setDeleteTarget(null);
      await refreshBotLists();
    } catch (deleteError) {
      toast({
        variant: "destructive",
        title: copy.actionFailed,
        description:
          deleteError instanceof Error
            ? deleteError.message
            : copy.actionFailed,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
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
              type="button"
              onClick={openCreateDialog}
              className="h-11 rounded-[12px] bg-[#16a34a] px-4 font-semibold text-white hover:bg-[#15803d]"
            >
              <Plus className="mr-2 h-4 w-4" />
              {copy.newBot}
            </Button>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={copy.searchBots}
                className="h-11 rounded-[12px] border-white/80 bg-white/85 pl-10 text-slate-700 shadow-sm placeholder:text-slate-400"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="h-11 rounded-[12px] border-white/80 bg-white/80 text-slate-700 lg:w-44">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder={copy.filter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allStatus}</SelectItem>
                <SelectItem value="active">{copy.active}</SelectItem>
                <SelectItem value="inactive">{copy.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="mb-4 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-[12px] border border-white/70 bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)]"
                >
                  <Skeleton className="h-12 w-12 shrink-0 rounded-[12px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBots.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-emerald-200 bg-white/60 px-6 py-12 text-center">
              <BotIcon className="mx-auto h-12 w-12 text-[#16a34a]" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {copy.noBotsTitle}
              </h3>
              <p className="mt-2 text-sm text-slate-500">{copy.noBotsBody}</p>
              <Button
                type="button"
                onClick={openCreateDialog}
                className="mt-5 rounded-[12px] bg-[#16a34a] text-white hover:bg-[#15803d]"
              >
                {copy.createLineBot}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[12px] border border-white/70 bg-white/75 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
              <div className="hidden grid-cols-[minmax(220px,1.6fr)_minmax(140px,0.75fr)_minmax(140px,0.75fr)_minmax(120px,0.65fr)_minmax(120px,0.65fr)_auto] gap-4 border-b border-slate-100/80 px-5 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 md:grid">
                <span>{copy.botName}</span>
                <span>{copy.created}</span>
                <span>{copy.updated}</span>
                <span>{copy.status}</span>
                <span>{copy.enabled}</span>
                <span className="sr-only">{copy.actions}</span>
              </div>
              <motion.div
                className="divide-y divide-slate-100/80"
                variants={listStagger}
                initial="initial"
                animate="animate"
              >
                {filteredBots.map((bot: BotType) => {
                  const isActive = bot.is_active !== false;
                  const channelConfigured = Boolean(
                    bot.channel_token && bot.channel_secret
                  );

                  return (
                    <motion.div
                      key={bot.id}
                      variants={listItem}
                      className="relative grid gap-4 px-4 py-4 transition-colors hover:bg-white/70 md:grid-cols-[minmax(220px,1.6fr)_minmax(140px,0.75fr)_minmax(140px,0.75fr)_minmax(120px,0.65fr)_minmax(120px,0.65fr)_auto] md:items-center md:px-5"
                    >
                      <div className="flex min-w-0 items-start gap-4 pr-12 md:pr-0">
                        <Avatar className="h-12 w-12 shrink-0 rounded-[12px] shadow-lg shadow-emerald-700/15">
                          <AvatarImage
                            src={bot.line_bot_picture_url ?? undefined}
                            alt={bot.name}
                            className="rounded-[12px] object-cover"
                          />
                          <AvatarFallback className="rounded-[12px] bg-gradient-to-br from-[#16a34a] to-emerald-300 text-lg font-semibold text-white">
                            {getInitial(bot.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-slate-950">
                              {bot.name}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:contents">
                        <div className="flex items-baseline gap-1.5 md:block">
                          <dt className="text-xs text-[var(--bc-ink-3)] md:hidden">
                            {copy.created}
                          </dt>
                          <dd className="font-medium text-[var(--bc-ink-2)] md:mt-0">
                            {formatDate(bot.created_at)}
                          </dd>
                        </div>
                        <div className="flex items-baseline gap-1.5 md:block">
                          <dt className="text-xs text-[var(--bc-ink-3)] md:hidden">
                            {copy.updated}
                          </dt>
                          <dd className="font-medium text-[var(--bc-ink-2)] md:mt-0">
                            {formatDate(bot.updated_at)}
                          </dd>
                        </div>
                        <div className="md:block">
                          <dt className="text-xs text-[var(--bc-ink-3)] md:hidden">
                            {copy.status}
                          </dt>
                          <dd className="mt-1 md:mt-0">
                            <BotStateBadge
                              active={channelConfigured}
                              activeLabel={copy.connected}
                              inactiveLabel={copy.pending}
                              icon={KeyRound}
                              inactiveTone="amber"
                            />
                          </dd>
                        </div>
                        <div className="md:block">
                          <dt className="text-xs text-[var(--bc-ink-3)] md:hidden">
                            {copy.enabled}
                          </dt>
                          <dd className="mt-1 md:mt-0">
                            <BotStateBadge
                              active={isActive}
                              activeLabel={copy.active}
                              inactiveLabel={copy.inactive}
                              icon={Power}
                              onClick={() => void handleToggleBot(bot)}
                              disabled={actionBotId === bot.id}
                              isLoading={actionBotId === bot.id}
                              ariaLabel={
                                isActive ? copy.disableBot : copy.enableBot
                              }
                            />
                          </dd>
                        </div>
                      </dl>

                      <div className="absolute right-4 top-4 md:static md:justify-self-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={actionBotId === bot.id}
                              className="h-10 w-10 rounded-[12px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label={copy.botActions}
                            >
                              {actionBotId === bot.id ? (
                                <Loader size="sm" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditTarget(bot)}>
                              <Pencil className="h-4 w-4" />
                              {copy.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                              onSelect={() => setDeleteTarget(bot)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {copy.deleteBot}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
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
            <div className="flex items-center gap-2 rounded-[12px] border border-white/70 bg-white/65 px-3 py-2 text-sm text-slate-500">
              <LayoutDashboard className="h-4 w-4 text-[#16a34a]" />
              {formatNumber(bots.length)} {copy.botsTracked}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="mt-4 rounded-[12px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  {copy.chartTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {copy.chartSubtitle}
                </p>
              </div>
              <Badge className="w-fit !rounded-[10px] border-emerald-200 bg-emerald-50 text-[#166534] hover:bg-emerald-50">
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
                      borderRadius: 12,
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

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogOpenChange}
      >
        <DialogContent className="max-h-[calc(100vh-3rem)] overflow-y-auto border-white/80 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:max-w-3xl sm:rounded-[12px]">
          <DialogHeader className="border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-xl text-slate-950">
              <Plus className="h-5 w-5 text-[#16a34a]" />
              {copy.createLineBot}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              貼上 LINE Developers 的 Channel Access Token 與 Channel
              Secret，視窗右側可查看取得位置。
            </DialogDescription>
          </DialogHeader>
          <BotCreationForm
            variant="dialog"
            onCreated={handleBotCreated}
            onClose={closeCreateDialog}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-white/80 bg-white sm:rounded-[12px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {copy.deleteConfirmDescription}
              {deleteTarget && (
                <span className="mt-3 block font-semibold text-slate-900">
                  {deleteTarget.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {copy.cancel}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => void handleDeleteBot()}
            >
              {isDeleting ? (
                <>
                  <Loader size="sm" />
                  {copy.deleting}
                </>
              ) : (
                copy.confirmDelete
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editTarget && (
        <BotEditModal
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          botId={editTarget.id}
          editType="all"
          onBotUpdated={() => {
            setEditTarget(null);
            void fetchBots();
          }}
        />
      )}
    </AppShell>
  );
};

export default HomeBotfly;
