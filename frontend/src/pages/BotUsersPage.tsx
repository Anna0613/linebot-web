import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  MessageSquare, 
  ArrowLeft, 
  Search,
  Send,
  Eye,
  Calendar,
  Hash,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "../hooks/useUnifiedAuth";
import DashboardNavbar from "../components/layout/DashboardNavbar";
import DashboardFooter from "../components/layout/DashboardFooter";
import { apiClient } from "../services/UnifiedApiClient";

// 類型定義
interface LineUser {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url: string;
  status_message: string;
  language: string;
  first_interaction: string;
  last_interaction: string;
  interaction_count: string;
}

interface UserInteraction {
  event_type: string;
  message_type: string;
  message_content: any;
  timestamp: string;
}

interface PaginationInfo {
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

const BotUsersPage: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const { user, loading: authLoading } = useUnifiedAuth({ requireAuth: true, redirectTo: "/login" });
  const navigate = useNavigate();
  const { toast } = useToast();

  // 狀態管理
  const [users, setUsers] = useState<LineUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: 20,
    offset: 0,
    has_next: false,
    has_prev: false
  });
  const [selectedUser, setSelectedUser] = useState<LineUser | null>(null);
  const [userInteractions, setUserInteractions] = useState<UserInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // 獲取用戶列表
  const fetchUsers = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!botId) return;

    setLoading(true);
    try {
      const response = await apiClient.getBotUsers(botId, limit, offset);
      
      if (response.data) {
        setUsers(response.data.users || []);
        setTotalCount(response.data.total_count || 0);
        setPagination(response.data.pagination || {
          limit,
          offset,
          has_next: false,
          has_prev: false
        });
      }
    } catch (error) {
      console.error("獲取用戶列表失敗:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: "無法載入用戶列表",
      });
    } finally {
      setLoading(false);
    }
  }, [botId, toast]);

  // 獲取用戶互動歷史
  const fetchUserInteractions = useCallback(async (lineUserId: string) => {
    if (!botId) return;

    setInteractionsLoading(true);
    try {
      const response = await apiClient.getUserInteractions(botId, lineUserId);
      
      if (response.data) {
        setUserInteractions(response.data.interactions || []);
      }
    } catch (error) {
      console.error("獲取用戶互動失敗:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: "無法載入用戶互動歷史",
      });
    } finally {
      setInteractionsLoading(false);
    }
  }, [botId, toast]);

  // 廣播訊息
  const handleBroadcast = async () => {
    if (!botId || !broadcastMessage.trim()) {
      toast({
        variant: "destructive",
        title: "參數不足",
        description: "請填寫廣播訊息內容",
      });
      return;
    }

    setBroadcastLoading(true);
    try {
      await apiClient.broadcastMessage(botId, {
        message: broadcastMessage
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
  };

  // 處理分頁
  const handlePageChange = (newOffset: number) => {
    fetchUsers(pagination.limit, newOffset);
  };

  // 處理用戶選擇
  const handleUserSelect = (user: LineUser) => {
    setSelectedUser(user);
    fetchUserInteractions(user.line_user_id);
  };

  // 過濾用戶列表
  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.line_user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 初始化數據
  useEffect(() => {
    if (user && botId) {
      fetchUsers();
    }
  }, [user, botId, fetchUsers]);

  // 處理加載狀態
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DashboardNavbar user={user} />
      
      <div className="flex-1 mt-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 頁面標題 */}
          <div className="mb-8 flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/bots/management")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回管理中心
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">用戶管理</h1>
              <p className="text-gray-600">管理 LINE Bot 的關注者和互動記錄</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 用戶列表 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 廣播訊息 */}
              <Card>
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
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleBroadcast}
                    disabled={broadcastLoading || !broadcastMessage.trim()}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {broadcastLoading ? "發送中..." : `發送給所有用戶 (${totalCount})`}
                  </Button>
                </CardContent>
              </Card>

              {/* 搜尋和統計 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      關注者列表 ({totalCount})
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜尋用戶名稱或 ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* 用戶列表 */}
                  <div className="space-y-3">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">尚無關注者</p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                            selectedUser?.id === user.id ? "border-blue-500 bg-blue-50" : ""
                          }`}
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center gap-3">
                            {user.picture_url ? (
                              <img
                                src={user.picture_url}
                                alt={user.display_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {user.display_name || "未設定名稱"}
                              </h3>
                              <p className="text-sm text-gray-500 truncate">
                                {user.line_user_id}
                              </p>
                              {user.status_message && (
                                <p className="text-xs text-gray-400 truncate">
                                  {user.status_message}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />
                                {user.interaction_count}
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(user.last_interaction).toLocaleDateString("zh-TW")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 分頁 */}
                  {totalCount > pagination.limit && (
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                        disabled={!pagination.has_prev}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        上一頁
                      </Button>
                      <span className="text-sm text-gray-500">
                        {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, totalCount)} / {totalCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.offset + pagination.limit)}
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

            {/* 用戶詳情和互動歷史 */}
            <div className="space-y-6">
              {selectedUser ? (
                <>
                  {/* 用戶詳情 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        用戶詳情
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        {selectedUser.picture_url ? (
                          <img
                            src={selectedUser.picture_url}
                            alt={selectedUser.display_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-8 w-8 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {selectedUser.display_name || "未設定名稱"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {selectedUser.line_user_id}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">狀態訊息</span>
                          <span className="text-sm">
                            {selectedUser.status_message || "無"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">語言</span>
                          <span className="text-sm">
                            {selectedUser.language || "未知"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">互動次數</span>
                          <Badge variant="secondary">
                            {selectedUser.interaction_count}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">首次互動</span>
                          <span className="text-sm">
                            {new Date(selectedUser.first_interaction).toLocaleString("zh-TW")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">最後互動</span>
                          <span className="text-sm">
                            {new Date(selectedUser.last_interaction).toLocaleString("zh-TW")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 互動歷史 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        互動歷史
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {interactionsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader />
                        </div>
                      ) : userInteractions.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">尚無互動記錄</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userInteractions.map((interaction, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge
                                  variant={
                                    interaction.event_type === "message"
                                      ? "default"
                                      : interaction.event_type === "follow"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {interaction.event_type}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(interaction.timestamp).toLocaleString("zh-TW")}
                                </span>
                              </div>
                              {interaction.message_type && (
                                <p className="text-sm text-gray-600 mb-1">
                                  類型: {interaction.message_type}
                                </p>
                              )}
                              {interaction.message_content && (
                                <div className="text-sm text-gray-800">
                                  <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-2 rounded border">
                                    {JSON.stringify(interaction.message_content, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">請點選左側用戶查看詳細資訊</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <DashboardFooter />
    </div>
  );
};

export default BotUsersPage;