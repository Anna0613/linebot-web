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
  Sparkles,
  Users,
  X,
} from "lucide-react";

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
    sidebarSubtitle: "Workspace",
    nav: {
      home: "Home",
      create: "Create Bot",
      editor: "Design",
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
    sidebarSubtitle: "工作台",
    nav: {
      home: "工作台",
      create: "建立 Bot",
      editor: "設計",
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
    <div className="absolute left-1/2 top-2 h-6 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />
    <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-amber-300 shadow-lg" />
    <div className="absolute left-1/2 top-8 h-36 w-48 -translate-x-1/2 rounded-[32px] border border-white/80 bg-white/90 shadow-[0_28px_80px_rgba(22,163,74,0.22)]">
      <div className="absolute left-1/2 top-9 flex h-16 w-32 -translate-x-1/2 items-center justify-center gap-5 rounded-[24px] bg-slate-900">
        <span className="h-4 w-4 rounded-full bg-[#16a34a] shadow-[0_0_18px_rgba(22,163,74,0.85)]" />
        <span className="h-4 w-4 rounded-full bg-[#16a34a] shadow-[0_0_18px_rgba(22,163,74,0.85)]" />
      </div>
      <div className="absolute bottom-5 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-emerald-100" />
      <div className="absolute -left-8 top-16 h-14 w-7 rounded-full bg-white/90 shadow-lg" />
      <div className="absolute -right-8 top-16 h-14 w-7 rounded-full bg-white/90 shadow-lg" />
    </div>
    <div className="absolute bottom-3 left-1/2 h-20 w-40 -translate-x-1/2 rounded-[28px] border border-white/80 bg-gradient-to-br from-emerald-100 via-white to-stone-100 shadow-xl">
      <div className="mx-auto mt-6 h-8 w-20 rounded-full bg-[#16a34a]/15" />
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
        "flex h-full flex-col border-r border-white/60 bg-white/70 px-4 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl",
        mobile ? "w-72" : "w-72"
      )}
    >
      <GlobalBotSwitcher
        className="w-full"
        triggerClassName="border-emerald-100 bg-white text-slate-900"
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
                "flex items-center gap-3 rounded-[16px] px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-50 text-[#166534] shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
              )}
            >
              <Icon className="h-4 w-4" />
              {copy.nav[item.id]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[16px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-stone-50 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#16a34a] shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-950">
          {calloutTitle || copy.calloutTitle}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
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
}: {
  user: AppShellUser;
  onOpenSidebar: () => void;
  kicker?: string;
  welcomeLabel?: string;
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
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/55 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenSidebar}
            className="h-10 w-10 rounded-[14px] text-slate-600 hover:bg-white/80 lg:hidden"
            aria-label={copy.openNavigation}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <GlobalBotSwitcher
            className="min-w-0 max-w-[260px] flex-1 lg:hidden"
            showLabel={false}
          />
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-xs font-semibold uppercase tracking-normal text-emerald-700">
              {kicker || copy.defaultKicker}
            </p>
            <p className="truncate text-sm text-slate-500">
              {welcomeLabel || copy.welcome}, {displayName}!
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-[14px] border-white/70 bg-white/70 text-slate-600 shadow-sm hover:bg-white"
            aria-label={copy.notifications}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <div className="flex h-10 items-center rounded-[14px] border border-white/70 bg-white/70 px-2 shadow-sm">
            <LanguageToggle className="h-8 min-w-8 text-sm" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-10 rounded-[14px] border-white/70 bg-white/70 px-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-white hover:text-slate-950"
            aria-label={copy.logout}
          >
            <LogOut className="h-4 w-4 xl:mr-2" />
            <span className="hidden xl:inline">{copy.logout}</span>
          </Button>
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={resolvedAvatarUrl || undefined} />
            <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700">
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
  sidebarCalloutTitle,
  sidebarCalloutBody,
  contentClassName,
  innerClassName,
}: AppShellProps) => {
  const { language } = useLanguagePreference();
  const copy = appShellCopy[language];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-page-surface min-h-screen text-slate-900">
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
            className="absolute right-4 top-4 h-10 w-10 rounded-full bg-white/90 text-slate-700 shadow-lg"
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
