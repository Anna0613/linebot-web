import { useCallback, useMemo, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/UnifiedApiClient";
import {
  GetBotUsersResponse,
  GetUserInteractionsResponse,
  LineUser,
  PaginationInfo,
  UserInteraction,
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
  const [_userInteractions, _setUserInteractions] = useState<
    UserInteraction[]
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [_interactionsLoading, _setInteractionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set()
  );
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [currentChatUser, setCurrentChatUser] = useState<LineUser | null>(null);
  const [selectiveBroadcastLoading, setSelectiveBroadcastLoading] =
    useState(false);

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
    _setUserInteractions([]);
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
        console.error("獲取用戶列表失敗:", error);
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: "無法載入用戶列表",
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
        console.error("靜默更新用戶列表失敗:", error);
      }
    },
    [applyUsersResponse, selectedBotId]
  );

  const fetchUserInteractions = useCallback(
    async (lineUserId: string) => {
      if (!selectedBotId) return;

      _setInteractionsLoading(true);
      try {
        const response = await apiClient.getUserInteractions(
          selectedBotId,
          lineUserId
        );

        if (response.data) {
          const data = response.data as Partial<GetUserInteractionsResponse>;
          _setUserInteractions(
            (data.interactions as UserInteraction[] | undefined) || []
          );
        }
      } catch (error) {
        console.error("獲取用戶互動失敗:", error);
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: "無法載入用戶互動歷史",
        });
      } finally {
        _setInteractionsLoading(false);
      }
    },
    [selectedBotId, toast]
  );

  const fetchUserInteractionsSilently = useCallback(
    async (lineUserId: string) => {
      if (!selectedBotId) return;

      try {
        const response = await apiClient.getUserInteractions(
          selectedBotId,
          lineUserId
        );

        if (response.data && !response.error) {
          const data = response.data as Partial<GetUserInteractionsResponse>;
          _setUserInteractions(
            (data.interactions as UserInteraction[] | undefined) || []
          );
        }
      } catch (error) {
        console.error("靜默更新用戶互動記錄失敗:", error);
      }
    },
    [selectedBotId]
  );

  const handleBroadcast = useCallback(async () => {
    if (!selectedBotId || !broadcastMessage.trim()) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請填寫廣播訊息內容",
      });
      return;
    }

    setBroadcastLoading(true);
    try {
      await apiClient.broadcastMessage(selectedBotId, {
        message: broadcastMessage,
      });

      toast({
        title: "廣播成功",
        description: "訊息已發送給所有關注者",
      });

      setBroadcastMessage("");
    } catch (error) {
      console.error("廣播失敗:", error);
      toast({
        variant: "destructive",
        title: "廣播失敗",
        description: "無法發送廣播訊息",
      });
    } finally {
      setBroadcastLoading(false);
    }
  }, [broadcastMessage, selectedBotId, toast]);

  const handleSelectiveBroadcast = useCallback(async () => {
    if (
      !selectedBotId ||
      !broadcastMessage.trim() ||
      selectedUserIds.size === 0
    ) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請選擇用戶並填寫廣播訊息內容",
      });
      return;
    }

    setSelectiveBroadcastLoading(true);
    try {
      await apiClient.selectiveBroadcastMessage(selectedBotId, {
        message: broadcastMessage,
        user_ids: Array.from(selectedUserIds),
      });

      toast({
        title: "廣播成功",
        description: `訊息已發送給 ${selectedUserIds.size} 個選中的用戶`,
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
      void fetchUserInteractions(user.line_user_id);
    },
    [fetchUserInteractions]
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
    broadcastLoading,
    selectiveBroadcastLoading,
    searchTerm,
    showChatPanel,
    showUserDetails,
    currentChatUser,
    fetchUsers,
    fetchUsersSilently,
    fetchUserInteractionsSilently,
    resetUserManagement,
    setBroadcastMessage,
    setSearchTerm,
    setShowChatPanel,
    setShowUserDetails,
    handleBroadcast,
    handleSelectiveBroadcast,
    handleSelectAll,
    handleUserCheck,
    handleUserSelect,
    handleViewUserDetails,
    handleStartChat,
    handlePageChange,
  };
};
