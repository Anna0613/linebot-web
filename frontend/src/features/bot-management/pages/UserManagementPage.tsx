import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot as BotIcon,
  CheckCircle2,
  MessageSquare,
  Radio,
  Users,
  Wifi,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";
import UsersTabContent from "@/features/bot-management/components/UsersTabContent";
import UserDetailsModal from "@/features/bot-management/components/users/UserDetailsModal";
import { useUserManagement } from "@/features/bot-management/hooks/useUserManagement";

const userManagementCopy = {
  en: {
    sidebarSubtitle: "Management",
    topbarKicker: "User Management",
    welcome: "Welcome back",
    heroBadge: "User operations",
    title: "User Management",
    subtitle:
      "Manage LINE Bot users, targeted broadcasts, conversation history, and one-to-one support from one workspace.",
    channelStatus: "Channel status",
    webSocket: "WebSocket",
    selectedUsers: "Selected users",
    active: "Active",
    inactive: "Inactive",
    connected: "Connected",
    reconnecting: "Reconnecting",
    noBotsTitle: "Create your first LINE Bot",
    noBotsBody:
      "After creation, user profiles, conversations, broadcasts, and support tools will appear here.",
    createFirstBot: "Create first Bot",
    viewSetupGuide: "View setup guide",
    loading: "Loading user management...",
    botHealthTitle: "User activity is live",
    botHealthBody:
      "Monitor inbound messages and keep user operations in sync.",
  },
  zh: {
    sidebarSubtitle: "管理中心",
    topbarKicker: "用戶管理",
    welcome: "歡迎回來",
    heroBadge: "用戶營運",
    title: "用戶管理",
    subtitle:
      "集中管理 LINE Bot 用戶、選擇性廣播、對話紀錄與一對一客服操作。",
    channelStatus: "Channel 狀態",
    webSocket: "WebSocket",
    selectedUsers: "已選用戶",
    active: "啟用",
    inactive: "停用",
    connected: "已連線",
    reconnecting: "重新連線中",
    noBotsTitle: "先建立第一個 LINE Bot",
    noBotsBody:
      "建立完成後即可在此管理用戶資料、對話紀錄、廣播與客服操作。",
    createFirstBot: "建立第一個 Bot",
    viewSetupGuide: "查看建立教學",
    loading: "載入用戶管理...",
    botHealthTitle: "用戶活動即時同步",
    botHealthBody: "追蹤用戶訊息並讓管理操作保持同步。",
  },
};

const UserManagementLoadingPanel = ({ text }: { text: string }) => (
  <section
    className="rounded-[16px] border border-white/70 bg-white/75 p-10 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl"
    aria-busy="true"
  >
    <Loader text={text} />
  </section>
);

const getLineUserIdFromMessage = (message: {
  user_id?: string;
  data?: unknown;
}) => {
  if (message.user_id) return message.user_id;

  const data = message.data;
  if (data && typeof data === "object" && "line_user_id" in data) {
    return String((data as { line_user_id?: string }).line_user_id || "");
  }

  return "";
};

const UserManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguagePreference();
  const copy = userManagementCopy[language];
  const {
    bots,
    selectedBotId,
    selectedBot,
    isLoading: botsLoading,
    refreshBots,
  } = useSelectedBot();
  const [loading, setLoading] = useState(true);

  const userManagement = useUserManagement(selectedBotId);
  const {
    currentChatUser,
    fetchUserInteractionsSilently,
    fetchUsers,
    fetchUsersSilently,
    pagination,
    resetUserManagement,
    selectedUser,
  } = userManagement;
  const { isConnected, lastMessage } = useWebSocket({
    botId: selectedBotId || undefined,
    autoReconnect: true,
    enabled: !!selectedBotId,
  });

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        await refreshBots();
      } catch (error) {
        console.error("初始化用戶管理資料失敗:", error);
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
  }, [refreshBots, toast, user]);

  useEffect(() => {
    resetUserManagement();
    if (selectedBotId) {
      void fetchUsers();
    }
  }, [fetchUsers, resetUserManagement, selectedBotId]);

  useEffect(() => {
    if (!lastMessage || !selectedBotId) return;
    if (lastMessage.bot_id && lastMessage.bot_id !== selectedBotId) return;

    if (
      lastMessage.type === "activity_update" ||
      lastMessage.type === "new_user_message" ||
      lastMessage.type === "chat_message"
    ) {
      void fetchUsersSilently(pagination.limit, pagination.offset);

      const lineUserId = getLineUserIdFromMessage(lastMessage);
      const selectedLineUserId =
        currentChatUser?.line_user_id || selectedUser?.line_user_id;

      if (lineUserId && selectedLineUserId === lineUserId) {
        void fetchUserInteractionsSilently(lineUserId);
      }

      if (lastMessage.type === "new_user_message") {
        toast({
          title: "收到新訊息",
          description: "用戶發送了新訊息",
          duration: 2000,
        });
      }
    }
  }, [
    lastMessage,
    selectedBotId,
    toast,
    currentChatUser?.line_user_id,
    fetchUserInteractionsSilently,
    fetchUsersSilently,
    pagination.limit,
    pagination.offset,
    selectedUser?.line_user_id,
  ]);

  useEffect(() => {
    document.title = copy.title;
  }, [copy.title]);

  const isInitialPageLoading =
    authLoading || ((loading || botsLoading) && bots.length === 0);

  return (
    <AppShell
      user={user}
      activeNav="users"
      headerKicker={copy.topbarKicker}
      welcomeLabel={copy.welcome}
      sidebarCalloutTitle={copy.botHealthTitle}
      sidebarCalloutBody={copy.botHealthBody}
    >
      <section className="mt-8 grid gap-6 rounded-[16px] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:grid-cols-[1fr_320px] lg:items-center lg:p-8">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Badge className="border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {copy.heroBadge}
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.01em] text-slate-950 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {copy.subtitle}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] border border-white/70 bg-white/75 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {copy.channelStatus}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {selectedBot?.is_active === false ? copy.inactive : copy.active}
              </p>
            </div>
            <div className="rounded-[16px] border border-white/70 bg-white/75 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Wifi className="h-4 w-4 text-emerald-600" />
                {copy.webSocket}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {isConnected ? copy.connected : copy.reconnecting}
              </p>
            </div>
            <div className="rounded-[16px] border border-white/70 bg-white/75 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Radio className="h-4 w-4 text-emerald-600" />
                {copy.selectedUsers}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {userManagement.selectedUserIds.size}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden justify-end lg:flex">
          <div className="flex h-56 w-full max-w-[280px] items-center justify-center rounded-[16px] border border-white/70 bg-white/75 text-emerald-700 shadow-sm">
            <MessageSquare className="h-20 w-20" />
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {isInitialPageLoading && (
          <UserManagementLoadingPanel text={copy.loading} />
        )}

        {!isInitialPageLoading && bots.length === 0 && !loading && (
          <section className="rounded-[16px] border border-white/70 bg-white/75 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-emerald-100 text-[#16a34a]">
              <BotIcon className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-950">
              {copy.noBotsTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {copy.noBotsBody}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={() => navigate("/bots/create")}
                className="rounded-[14px] bg-[#16a34a] px-5 font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803d]"
              >
                {copy.createFirstBot}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/how-to-establish")}
                className="rounded-[14px] border-emerald-100 bg-white/70 font-semibold text-slate-700 hover:bg-white"
              >
                {copy.viewSetupGuide}
              </Button>
            </div>
          </section>
        )}

        {!isInitialPageLoading && bots.length > 0 && (
          <UsersTabContent
            selectedBotId={selectedBotId}
            broadcastMessage={userManagement.broadcastMessage}
            totalCount={userManagement.totalCount}
            selectedUserIds={userManagement.selectedUserIds}
            filteredUsers={userManagement.filteredUsers}
            usersLoading={userManagement.usersLoading}
            selectedUser={userManagement.selectedUser}
            pagination={userManagement.pagination}
            broadcastLoading={userManagement.broadcastLoading}
            selectiveBroadcastLoading={
              userManagement.selectiveBroadcastLoading
            }
            searchTerm={userManagement.searchTerm}
            showChatPanel={userManagement.showChatPanel}
            currentChatUser={userManagement.currentChatUser}
            onBroadcastMessageChange={userManagement.setBroadcastMessage}
            onSearchTermChange={userManagement.setSearchTerm}
            onBroadcast={userManagement.handleBroadcast}
            onSelectiveBroadcast={userManagement.handleSelectiveBroadcast}
            onSelectAll={userManagement.handleSelectAll}
            onUserCheck={userManagement.handleUserCheck}
            onUserSelect={userManagement.handleUserSelect}
            onViewUserDetails={userManagement.handleViewUserDetails}
            onStartChat={userManagement.handleStartChat}
            onPageChange={userManagement.handlePageChange}
            onCloseChatPanel={() => userManagement.setShowChatPanel(false)}
          />
        )}
      </div>

      <UserDetailsModal
        user={userManagement.selectedUser}
        isOpen={userManagement.showUserDetails}
        onClose={() => userManagement.setShowUserDetails(false)}
      />
    </AppShell>
  );
};

export default UserManagementPage;
