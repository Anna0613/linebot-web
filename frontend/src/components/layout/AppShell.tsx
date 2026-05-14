import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Home,
  LogOut,
  Menu,
  PencilRuler,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";

import BotCraftBrand, { BotCraftMark } from "@/components/brand/BotCraftIdentity";
import LanguageToggle from "@/components/LanguageToggle/LanguageToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import GlobalBotSwitcher from "@/features/bots/components/GlobalBotSwitcher";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { API_CONFIG, getApiUrl } from "@/config/apiConfig";
import { authManager } from "@/services/UnifiedAuthManager";
import { apiClient } from "@/services/UnifiedApiClient";

type IconComponent = React.ComponentType<{ className?: string }>;

export type AppShellNavId =
  | "home"
  | "create"
  | "editor"
  | "analytics"
  | "users"
  | "settings";

export type AppShellUser = {
  display_name?: string;
  username?: string;
  email?: string;
  picture_url?: string;
  avatar_url?: string;
  avatar?: string;
} | null;

const appShellCopy = {
  en: {
    sidebarSubtitle: "LineBot 管理",
    nav: {
      home: "Home",
      create: "Create Bot",
      editor: "Edit Bot",
      analytics: "Interactions",
      users: "Friends",
      settings: "Settings",
    },
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    notifications: "Notifications",
    logout: "Logout",
    logoutSuccessTitle: "Signed out",
    logoutSuccessDescription: "You have signed out successfully.",
    logoutErrorTitle: "Logout failed",
    defaultKicker: "Workspace",
    welcome: "Welcome back",
    calloutTitle: "Bot is ready",
    calloutBody: "Check connection, messages, and friends from here.",
  },
  zh: {
    sidebarSubtitle: "LineBot 管理",
    nav: {
      home: "工作台",
      create: "建立 Bot",
      editor: "編輯 Bot",
      analytics: "互動紀錄",
      users: "好友",
      settings: "設定",
    },
    openNavigation: "開啟導覽",
    closeNavigation: "關閉導覽",
    notifications: "通知",
    logout: "登出",
    logoutSuccessTitle: "已登出",
    logoutSuccessDescription: "您已成功登出",
    logoutErrorTitle: "登出失敗",
    defaultKicker: "工作台",
    welcome: "歡迎回來",
    calloutTitle: "Bot 目前正常",
    calloutBody: "查看連線、訊息與好友互動。",
  },
};

const navItems: Array<{
  id: AppShellNavId;
  href: string;
  icon: IconComponent;
}> = [
  { id: "home", href: "/dashboard", icon: Home },
  { id: "create", href: "/bots/create", icon: Plus },
  { id: "editor", href: "/bots/visual-editor", icon: PencilRuler },
  { id: "analytics", href: "/bots/management", icon: BarChart3 },
  { id: "users", href: "/bots/user-management", icon: Users },
  { id: "settings", href: "/setting", icon: Settings },
];

const getDisplayName = (user: AppShellUser) =>
  user?.display_name || user?.username || user?.email || "RongJiaLin";

const getInitial = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "R";
};

const getDirectAvatarUrl = (user: AppShellUser) =>
  user?.picture_url || user?.avatar_url || user?.avatar || null;

const getAvatarCacheKey = (user: AppShellUser) => {
  const userKey =
    user?.email || user?.username || user?.display_name || "anonymous";
  return `app_shell_avatar:${userKey}`;
};

const readCachedAvatarUrl = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeCachedAvatarUrl = (key: string, value: string | null) => {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage can be unavailable in restricted contexts.
  }
};

export const AppRobotIllustration = () => (
  <div className="relative h-56 w-full max-w-[320px] sm:h-64">
    <div className="absolute left-1/2 top-1 h-6 w-1 -translate-x-1/2 rounded-full bg-[var(--bc-accent)]" />
    <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-[var(--bc-hi)] shadow-lg" />
    <div className="absolute left-1/2 top-8 h-36 w-48 -translate-x-1/2 rounded-[32px] border border-[var(--bc-line-2)] bg-white/90 shadow-[0_28px_80px_rgba(24,22,40,0.16)]">
      <div className="absolute left-1/2 top-9 flex h-16 w-32 -translate-x-1/2 items-center justify-center gap-5 rounded-[24px] bg-[var(--bc-ink)]">
        <span className="h-4 w-4 rounded-full bg-[var(--bc-accent)]" />
        <span className="h-4 w-4 rounded-full bg-[var(--bc-hi)]" />
      </div>
      <div className="absolute bottom-5 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-[var(--bc-line)]" />
      <div className="absolute -left-8 top-16 h-14 w-7 rounded-full bg-white/90 shadow-lg" />
      <div className="absolute -right-8 top-16 h-14 w-7 rounded-full bg-white/90 shadow-lg" />
    </div>
    <div className="absolute bottom-3 left-1/2 h-20 w-40 -translate-x-1/2 rounded-[28px] border border-[var(--bc-line-2)] bg-gradient-to-br from-[var(--bc-accent-soft)] via-white to-[var(--bc-hi-soft)] shadow-xl">
      <div className="mx-auto mt-6 h-8 w-20 rounded-full bg-[var(--bc-accent-soft)]" />
    </div>
  </div>
);

const AppSidebar = ({
  activeNav,
  onNavigate,
  mobile = false,
  calloutTitle,
  calloutBody,
}: {
  activeNav: AppShellNavId;
  onNavigate?: () => void;
  mobile?: boolean;
  calloutTitle?: string;
  calloutBody?: string;
}) => {
  const { language } = useLanguagePreference();
  const copy = appShellCopy[language];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[var(--bc-line-2)] bg-[color-mix(in_oklch,var(--bc-bg)_86%,transparent)] px-4 py-5 shadow-[0_24px_80px_rgba(24,22,40,0.08)] backdrop-blur-2xl",
        mobile ? "w-72" : "w-72"
      )}
    >
      <div className="mb-5 px-2">
        <BotCraftBrand to="/dashboard" />
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--bc-ink-3)]">
          {copy.sidebarSubtitle}
        </p>
      </div>

      <GlobalBotSwitcher
        className="w-full"
        triggerClassName="border-[var(--bc-line-2)] bg-white text-[var(--bc-ink)] rounded-[14px]"
      />

      <nav className="mt-7 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeNav;

          return (
            <Link
              key={item.id}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[14px] px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--bc-accent-soft)] text-[var(--bc-accent-ink)] shadow-sm"
                  : "text-[var(--bc-ink-2)] hover:bg-white/70 hover:text-[var(--bc-ink)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {copy.nav[item.id]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[14px] border border-[var(--bc-line-2)] bg-gradient-to-br from-[var(--bc-accent-soft)] via-white to-[var(--bc-hi-soft)] p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white shadow-sm">
          <BotCraftMark className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--bc-ink)]">
          {calloutTitle || copy.calloutTitle}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--bc-ink-2)]">
          {calloutBody || copy.calloutBody}
        </p>
      </div>
    </aside>
  );
};

const AppTopbar = ({
  user,
  onOpenSidebar,
  kicker,
  welcomeLabel,
  headerStatus,
}: {
  user: AppShellUser;
  onOpenSidebar: () => void;
  kicker?: string;
  welcomeLabel?: string;
  headerStatus?: React.ReactNode;
}) => {
  const { language } = useLanguagePreference();
  const copy = appShellCopy[language];
  const navigate = useNavigate();
  const { toast } = useToast();
  const displayName = getDisplayName(user);
  const avatarCacheKey = getAvatarCacheKey(user);
  const previousAvatarCacheKeyRef = useRef(avatarCacheKey);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    () => getDirectAvatarUrl(user) || readCachedAvatarUrl(avatarCacheKey)
  );

  useEffect(() => {
    const directAvatarUrl = getDirectAvatarUrl(user);
    if (directAvatarUrl) {
      setResolvedAvatarUrl(directAvatarUrl);
      writeCachedAvatarUrl(avatarCacheKey, directAvatarUrl);
      return;
    }

    if (!user) {
      setResolvedAvatarUrl(null);
      return;
    }

    const isSameUser = previousAvatarCacheKeyRef.current === avatarCacheKey;
    previousAvatarCacheKeyRef.current = avatarCacheKey;
    const cachedAvatarUrl = readCachedAvatarUrl(avatarCacheKey);
    if (cachedAvatarUrl) {
      setResolvedAvatarUrl(cachedAvatarUrl);
    } else if (!isSameUser) {
      setResolvedAvatarUrl(null);
    }

    let cancelled = false;

    const loadUserAvatar = async () => {
      try {
        const response = await apiClient.getUserAvatar();
        const data = response.data as { avatar?: string } | undefined;
        if (!cancelled && response.status === 200 && data?.avatar) {
          setResolvedAvatarUrl(data.avatar);
          writeCachedAvatarUrl(avatarCacheKey, data.avatar);
        }
      } catch (error) {
        console.warn("無法載入用戶頭像:", error);
      }
    };

    loadUserAvatar();

    return () => {
      cancelled = true;
    };
  }, [
    user?.avatar,
    user?.avatar_url,
    user?.display_name,
    user?.email,
    user?.picture_url,
    user?.username,
    avatarCacheKey,
    user,
  ]);

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatar: string | null }>;
      setResolvedAvatarUrl(customEvent.detail.avatar);
      writeCachedAvatarUrl(avatarCacheKey, customEvent.detail.avatar);
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () => {
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
    };
  }, [avatarCacheKey]);

  const handleLogout = async () => {
    try {
      try {
        await fetch(
          getApiUrl(API_CONFIG.AUTH.BASE_URL, API_CONFIG.AUTH.ENDPOINTS.LOGOUT),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );
      } catch (error) {
        console.warn("後端登出失敗:", error);
      }

      authManager.clearAuth("logout");
      writeCachedAvatarUrl(avatarCacheKey, null);
      toast({
        title: copy.logoutSuccessTitle,
        description: copy.logoutSuccessDescription,
      });
      navigate("/login", { replace: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: copy.logoutErrorTitle,
        description:
          error instanceof Error ? error.message : copy.logoutErrorTitle,
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--bc-line-2)] bg-[color-mix(in_oklch,var(--bc-bg)_82%,transparent)] px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="h-10 w-10 rounded-[14px] text-[var(--bc-ink-2)] hover:bg-white/80 lg:hidden"
            aria-label={copy.openNavigation}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <GlobalBotSwitcher
            className="min-w-0 max-w-[260px] flex-1 lg:hidden"
            showLabel={false}
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--bc-accent-ink)]">
              {kicker || copy.defaultKicker}
            </p>
            <p className="truncate text-sm text-[var(--bc-ink-2)]">
              {welcomeLabel || copy.welcome}, {displayName}!
            </p>
          </div>
          {headerStatus && (
            <div className="ml-2 hidden min-w-0 items-center gap-2 lg:flex">
              {headerStatus}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-[14px] border-[var(--bc-line-2)] bg-white/70 text-[var(--bc-ink-2)] shadow-sm hover:bg-white hover:text-[var(--bc-ink)]"
            aria-label={copy.notifications}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <div className="flex h-10 items-center rounded-[14px] border border-[var(--bc-line-2)] bg-white/70 px-2 shadow-sm">
            <LanguageToggle className="h-8 min-w-8 text-sm" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-10 rounded-full border-[var(--bc-line)] bg-transparent px-3 text-sm font-medium text-[var(--bc-ink-2)] shadow-none hover:border-[var(--bc-ink)] hover:bg-transparent hover:text-[var(--bc-ink)]"
            aria-label={copy.logout}
          >
            <LogOut className="h-4 w-4 xl:mr-2" />
            <span className="hidden xl:inline">{copy.logout}</span>
          </Button>
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={resolvedAvatarUrl || undefined} />
            <AvatarFallback className="bg-[var(--bc-accent-soft)] text-sm font-semibold text-[var(--bc-accent-ink)]">
              {getInitial(displayName)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

interface AppShellProps {
  user: AppShellUser;
  activeNav: AppShellNavId;
  children: React.ReactNode;
  headerKicker?: string;
  welcomeLabel?: string;
  headerStatus?: React.ReactNode;
  sidebarCalloutTitle?: string;
  sidebarCalloutBody?: string;
  contentClassName?: string;
  innerClassName?: string;
}

const AppShell = ({
  user,
  activeNav,
  children,
  headerKicker,
  welcomeLabel,
  headerStatus,
  sidebarCalloutTitle,
  sidebarCalloutBody,
  contentClassName,
  innerClassName,
}: AppShellProps) => {
  const { language } = useLanguagePreference();
  const copy = appShellCopy[language];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-page-surface min-h-screen text-[var(--bc-ink)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block">
        <AppSidebar
          activeNav={activeNav}
          calloutTitle={sidebarCalloutTitle}
          calloutBody={sidebarCalloutBody}
        />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label={copy.closeNavigation}
          />
          <div className="absolute inset-y-0 left-0">
            <AppSidebar
              activeNav={activeNav}
              mobile
              calloutTitle={sidebarCalloutTitle}
              calloutBody={sidebarCalloutBody}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/90 text-[var(--bc-ink-2)] shadow-lg"
            aria-label={copy.closeNavigation}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      <main className={cn("min-h-screen lg:pl-72", contentClassName)}>
        <AppTopbar
          user={user}
          onOpenSidebar={() => setSidebarOpen(true)}
          kicker={headerKicker}
          welcomeLabel={welcomeLabel}
          headerStatus={headerStatus}
        />
        <div
          className={cn(
            "mx-auto max-w-[1440px] px-4 pb-12 sm:px-6 lg:px-8",
            innerClassName
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
