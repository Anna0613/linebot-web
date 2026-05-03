import React from "react";
import {
  Bot,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Hash,
  Info,
  MessageSquare,
  Search,
  Send,
  Square,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import ChatPanel from "./users/ChatPanel";
import { LineUser, PaginationInfo } from "@/features/bot-management/types/botManagement";

interface UsersTabContentProps {
  selectedBotId: string;
  broadcastMessage: string;
  totalCount: number;
  selectedUserIds: Set<string>;
  filteredUsers: LineUser[];
  usersLoading: boolean;
  selectedUser: LineUser | null;
  pagination: PaginationInfo;
  broadcastLoading: boolean;
  selectiveBroadcastLoading: boolean;
  searchTerm: string;
  showChatPanel: boolean;
  currentChatUser: LineUser | null;
  onBroadcastMessageChange: (message: string) => void;
  onSearchTermChange: (searchTerm: string) => void;
  onBroadcast: () => void;
  onSelectiveBroadcast: () => void;
  onSelectAll: () => void;
  onUserCheck: (userId: string, checked: boolean) => void;
  onUserSelect: (user: LineUser) => void;
  onViewUserDetails: (user: LineUser) => void;
  onStartChat: (user: LineUser) => void;
  onPageChange: (offset: number) => void;
  onCloseChatPanel: () => void;
}

const UsersTabContent: React.FC<UsersTabContentProps> = ({
  selectedBotId,
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
  currentChatUser,
  onBroadcastMessageChange,
  onSearchTermChange,
  onBroadcast,
  onSelectiveBroadcast,
  onSelectAll,
  onUserCheck,
  onUserSelect,
  onViewUserDetails,
  onStartChat,
  onPageChange,
  onCloseChatPanel,
}) => {
  if (!selectedBotId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground">請先選擇一個 Bot 來管理用戶</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 equal-columns">
      <div className="space-y-6 flex flex-col h-full min-h-0">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              廣播訊息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="輸入要廣播的訊息..."
              value={broadcastMessage}
              onChange={(e) => onBroadcastMessageChange(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={onBroadcast}
                disabled={broadcastLoading || !broadcastMessage.trim()}
                variant="outline"
                className="flex-1"
              >
                {broadcastLoading ? (
                  <>
                    <Loader size="sm" />
                    發送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {`全部用戶 (${totalCount})`}
                  </>
                )}
              </Button>
              <Button
                onClick={onSelectiveBroadcast}
                disabled={
                  selectiveBroadcastLoading ||
                  !broadcastMessage.trim() ||
                  selectedUserIds.size === 0
                }
                className="flex-1"
              >
                {selectiveBroadcastLoading ? (
                  <>
                    <Loader size="sm" />
                    發送中...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    {`選中用戶 (${selectedUserIds.size})`}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  系統用戶列表 ({totalCount})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAll}
                  className="flex items-center gap-1"
                >
                  {selectedUserIds.size === filteredUsers.length &&
                  filteredUsers.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  全選
                </Button>
                {selectedUserIds.size > 0 && (
                  <Badge variant="secondary">已選 {selectedUserIds.size}</Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋用戶名稱或 ID..."
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-3">
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    尚無系統用戶
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 border rounded-lg transition-colors hover:bg-secondary ${
                      selectedUser?.id === user.id
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedUserIds.has(user.line_user_id)}
                        onCheckedChange={(checked) =>
                          onUserCheck(user.line_user_id, !!checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />

                      {user.picture_url ? (
                        <img
                          src={user.picture_url}
                          alt={user.display_name}
                          className="w-10 h-10 rounded-full object-cover cursor-pointer"
                          onClick={() => onUserSelect(user)}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center cursor-pointer"
                          onClick={() => onUserSelect(user)}
                        >
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          onUserSelect(user);
                          onStartChat(user);
                        }}
                      >
                        <h3 className="font-medium text-foreground truncate">
                          {user.display_name || "未設定名稱"}
                        </h3>
                        {user.status_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.status_message}
                          </p>
                        )}
                      </div>

                      <div className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {user.interaction_count && user.interaction_count !== "0" ? (
                            <>
                              <Hash className="h-3 w-3 mr-1" />
                              {user.interaction_count}
                            </>
                          ) : (
                            "LINE"
                          )}
                        </Badge>
                        {user.last_interaction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(user.last_interaction).toLocaleDateString(
                              "zh-TW"
                            )}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewUserDetails(user);
                        }}
                        className="px-2"
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalCount > pagination.limit && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPageChange(pagination.offset - pagination.limit)
                  }
                  disabled={!pagination.has_prev}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  上一頁
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pagination.offset + 1} -{" "}
                  {Math.min(pagination.offset + pagination.limit, totalCount)} /{" "}
                  {totalCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPageChange(pagination.offset + pagination.limit)
                  }
                  disabled={!pagination.has_next}
                >
                  下一頁
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showChatPanel && currentChatUser && (
        <div className="space-y-6 flex flex-col h-full min-h-0">
          <div className="flex-1 flex min-h-0">
            <ChatPanel
              botId={selectedBotId}
              selectedUser={currentChatUser}
              onClose={onCloseChatPanel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTabContent;
