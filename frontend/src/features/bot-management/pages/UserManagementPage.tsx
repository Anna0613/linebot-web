import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot as BotIcon, CheckCircle2, Wifi } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
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
    sidebarSubtitle: "Workspace",
    topbarKicker: "Friends",
    welcome: "Welcome back",
    heroBadge: "Friends and messages",
    title: "Friends",
    subtitle:
      "View LINE friends, conversation history, broadcasts, and one-to-one replies from one workspace.",
    channelStatus: "Channel status",
    webSocket: "WebSocket",
    selectedUsers: "Selected friends",
    active: "Active",
    inactive: "Inactive",
    connected: "Connected",
    reconnecting: "Reconnecting",
    noBotsTitle: "Create your first LINE Bot",
    noBotsBody:
      "After creation, friend profiles, conversations, and broadcast tools will appear here.",
    createFirstBot: "Create first Bot",
    viewSetupGuide: "View setup guide",
    loading: "Loading friends...",
    botHealthTitle: "Messages are synced",
    botHealthBody: "Incoming messages and friend activity stay up to date.",
  },
  zh: {
    sidebarSubtitle: "工作台",
    topbarKicker: "好友",
    welcome: "歡迎回來",
    heroBadge: "好友與訊息",
    title: "好友",
    subtitle: "查看 LINE 好友、對話紀錄、廣播對象與一對一回覆。",
    channelStatus: "Channel 狀態",
    webSocket: "WebSocket",
    selectedUsers: "已選好友",
    active: "啟用",
    inactive: "停用",
    connected: "已連線",
    reconnecting: "重新連線中",
    noBotsTitle: "先建立第一個 LINE Bot",
    noBotsBody: "建立完成後，好友資料、對話紀錄與廣播工具會出現在這裡。",
    createFirstBot: "建立第一個 Bot",
    viewSetupGuide: "查看建立教學",
    loading: "載入好友...",
    botHealthTitle: "訊息已同步",
    botHealthBody: "好友訊息與互動會保持更新。",
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
          description: "好友傳來新訊息",
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
      headerStatus={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bc-line-2)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--bc-ink-2)] shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[var(--bc-ink-3)]">{copy.channelStatus}</span>
            <span className="font-semibold text-[var(--bc-ink)]">
              {selectedBot?.is_active === false ? copy.inactive : copy.active}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bc-line-2)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--bc-ink-2)] shadow-sm">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[var(--bc-ink-3)]">{copy.webSocket}</span>
            <span className="font-semibold text-[var(--bc-ink)]">
              {isConnected ? copy.connected : copy.reconnecting}
            </span>
          </span>
        </>
      }
      innerClassName="max-w-none px-4 pb-12 sm:px-6 lg:px-8"
    >
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
                onClick={() => navigate("/dashboard?createBot=1")}
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
            selectiveBroadcastLoading={userManagement.selectiveBroadcastLoading}
            searchTerm={userManagement.searchTerm}
            currentChatUser={userManagement.currentChatUser}
            onBroadcastMessageChange={userManagement.setBroadcastMessage}
            onSearchTermChange={userManagement.setSearchTerm}
            onSelectiveBroadcast={userManagement.handleSelectiveBroadcast}
            onSelectAll={userManagement.handleSelectAll}
            onUserCheck={userManagement.handleUserCheck}
            onUserSelect={userManagement.handleUserSelect}
            onViewUserDetails={userManagement.handleViewUserDetails}
            onStartChat={userManagement.handleStartChat}
            onPageChange={userManagement.handlePageChange}
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
