import { useCallback, useMemo, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/UnifiedApiClient";
import {
  GetBotUsersResponse,
  LineUser,
  PaginationInfo,
} from "@/features/bot-management/types/botManagement";

export const useUserManagement = (selectedBotId: string) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<LineUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    offset: 0,
    has_next: false,
    has_prev: false,
  });
  const [selectedUser, setSelectedUser] = useState<LineUser | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [currentChatUser, setCurrentChatUser] = useState<LineUser | null>(null);
  const [selectiveBroadcastLoading, setSelectiveBroadcastLoading] =
    useState(false);

  const pendingBroadcast = useRef<{ fingerprint: string; key: string }>();

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.line_user_id.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, users]
  );

  const resetUserManagement = useCallback(() => {
    setUsers([]);
    setTotalCount(0);
    setPagination({
      limit: 20,
      offset: 0,
      has_next: false,
      has_prev: false,
    });
    setSelectedUser(null);
    setSearchTerm("");
    setBroadcastMessage("");
    setSelectedUserIds(new Set());
    setShowChatPanel(false);
    setShowUserDetails(false);
    setCurrentChatUser(null);
  }, []);

  const applyUsersResponse = useCallback(
    (
      data: Partial<GetBotUsersResponse>,
      fallbackLimit: number,
      fallbackOffset: number
    ) => {
      setUsers((data.users as LineUser[] | undefined) || []);
      setTotalCount((data.total_count as number | undefined) || 0);
      setPagination(
        (data.pagination as PaginationInfo | undefined) || {
          limit: fallbackLimit,
          offset: fallbackOffset,
          has_next: false,
          has_prev: false,
        }
      );
    },
    []
  );

  const fetchUsers = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      if (!selectedBotId) return;

      setUsersLoading(true);
      try {
        const response = await apiClient.getBotUsers(
          selectedBotId,
          limit,
          offset
        );

        if (response.data) {
          applyUsersResponse(
            response.data as Partial<GetBotUsersResponse>,
            limit,
            offset
          );
        }
      } catch (error) {
        console.error("獲取好友列表失敗:", error);
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: "無法載入好友列表",
        });
      } finally {
        setUsersLoading(false);
      }
    },
    [applyUsersResponse, selectedBotId, toast]
  );

  const fetchUsersSilently = useCallback(
    async (limit: number = 20, offset: number = 0) => {
      if (!selectedBotId) return;

      try {
        const response = await apiClient.getBotUsers(
          selectedBotId,
          limit,
          offset
        );

        if (response.data && !response.error) {
          applyUsersResponse(
            response.data as Partial<GetBotUsersResponse>,
            limit,
            offset
          );
        }
      } catch (error) {
        console.error("靜默更新好友列表失敗:", error);
      }
    },
    [applyUsersResponse, selectedBotId]
  );

  const handleSelectiveBroadcast = useCallback(async () => {
    if (
      !selectedBotId ||
      !broadcastMessage.trim() ||
      selectedUserIds.size === 0
    ) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請選擇好友並填寫廣播訊息內容",
      });
      return;
    }

    setSelectiveBroadcastLoading(true);
    try {
      const recipients = Array.from(selectedUserIds).sort();
      const fingerprint = JSON.stringify([selectedBotId, recipients, broadcastMessage]);
      if (pendingBroadcast.current?.fingerprint !== fingerprint) {
        pendingBroadcast.current = { fingerprint, key: crypto.randomUUID() };
      }
      const response = await apiClient.selectiveBroadcastMessage(selectedBotId, {
        message: broadcastMessage,
        user_ids: recipients,
        client_key: pendingBroadcast.current.key,
      });

      if (response.error || !response.data?.success || ["unknown", "failed"].includes(response.data.state ?? "")) {
        throw new Error(response.error || "廣播未確認");
      }
      pendingBroadcast.current = undefined;
      const queued = response.data.state === "queued";
      toast({
        title: queued ? "廣播已排程" : "廣播已處理",
        description: `廣播對象共 ${recipients.length} 位好友`,
      });

      setBroadcastMessage("");
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error("選擇性廣播失敗:", error);
      toast({
        variant: "destructive",
        title: "廣播失敗",
        description: "無法發送選擇性廣播訊息",
      });
    } finally {
      setSelectiveBroadcastLoading(false);
    }
  }, [broadcastMessage, selectedBotId, selectedUserIds, toast]);

  const handlePageChange = useCallback(
    (newOffset: number) => {
      void fetchUsers(pagination.limit, newOffset);
    },
    [fetchUsers, pagination.limit]
  );

  const handleUserSelect = useCallback(
    (user: LineUser) => {
      setSelectedUser(user);

    },
    []
  );

  const handleUserCheck = useCallback((userId: string, checked: boolean) => {
    setSelectedUserIds((current) => {
      const nextSelected = new Set(current);
      if (checked) {
        nextSelected.add(userId);
      } else {
        nextSelected.delete(userId);
      }
      return nextSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedUserIds((current) => {
      if (current.size === filteredUsers.length) {
        return new Set();
      }
      return new Set(filteredUsers.map((user) => user.line_user_id));
    });
  }, [filteredUsers]);

  const handleStartChat = useCallback((user: LineUser) => {
    setCurrentChatUser(user);
    setShowChatPanel(true);
  }, []);

  const handleViewUserDetails = useCallback((user: LineUser) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  }, []);

  return {
    broadcastMessage,
    totalCount,
    selectedUserIds,
    filteredUsers,
    usersLoading,
    selectedUser,
    pagination,
    selectiveBroadcastLoading,
    searchTerm,
    showChatPanel,
    showUserDetails,
    currentChatUser,
    fetchUsers,
    fetchUsersSilently,
    resetUserManagement,
    setBroadcastMessage,
    setSearchTerm,
    setShowChatPanel,
    setShowUserDetails,
    handleSelectiveBroadcast,
    handleSelectAll,
    handleUserCheck,
    handleUserSelect,
    handleViewUserDetails,
    handleStartChat,
    handlePageChange,
  };
};
