import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useWebSocket } from "../hooks/useWebSocket";
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
  id: string;
  event_type: string;
  message_type: string;
  message_content: any;
  media_url?: string;
  media_path?: string;
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

  // WebSocket 連接
  const { isConnected, connectionError, lastMessage } = useWebSocket({
    botId: botId || undefined,
    autoReconnect: true,
    enabled: !!botId
  });

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
  const [isDetailedMode, setIsDetailedMode] = useState(false);  // 基本/詳細模式切換

  // 媒體 URL 緩存狀態
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  // 獲取媒體內容 URL
  const fetchMediaContent = useCallback(async (messageId: string) => {
    if (!botId || !messageId || mediaUrls[messageId]) return;
    
    try {
      const response = await apiClient.getMessageContent(botId, messageId);
      if (response.data) {
        if (response.data.success && response.data.content_url) {
          // 成功獲取媒體 URL
          setMediaUrls(prev => ({
            ...prev,
            [messageId]: response.data.content_url
          }));
        } else if (response.data.error === 'legacy_media') {
          // 舊媒體記錄，無法載入
          setMediaUrls(prev => ({
            ...prev,
            [messageId]: 'LEGACY_MEDIA_ERROR'
          }));
        } else {
          // 其他錯誤
          console.warn(`媒體載入失敗 (${messageId}):`, response.data.message || '未知錯誤');
          setMediaUrls(prev => ({
            ...prev,
            [messageId]: 'MEDIA_ERROR'
          }));
        }
      }
    } catch (error) {
      console.error("獲取媒體內容失敗:", error);
      setMediaUrls(prev => ({
        ...prev,
        [messageId]: 'NETWORK_ERROR'
      }));
    }
  }, [botId, mediaUrls]);

  // 事件類型文本映射
  const getEventTypeText = (eventType: string) => {
    const eventMap: Record<string, string> = {
      follow: "用戶關注",
      unfollow: "用戶取消關注",
      message: "訊息",
      postback: "點擊按鈕",
      join: "加入群組",
      leave: "離開群組"
    };
    return eventMap[eventType] || eventType;
  };

  // 渲染訊息內容（支持媒體文件）
  const renderMessageContent = (interaction: UserInteraction, isDetailed: boolean) => {
    if (!interaction.message_content) {
      return <span className="text-sm">無內容</span>;
    }

    const content = interaction.message_content;
    
    // 基本模式：只顯示簡化的訊息
    if (!isDetailed) {
      if (interaction.message_type === "text" && content.text) {
        return <span className="text-sm">{content.text}</span>;
      } else if (interaction.message_type === "image") {
        return <span className="text-sm">📷 圖片</span>;
      } else if (interaction.message_type === "video") {
        return <span className="text-sm">🎥 影片</span>;
      } else if (interaction.message_type === "audio") {
        return <span className="text-sm">🎵 音訊</span>;
      } else if (interaction.message_type === "file") {
        return <span className="text-sm">📎 檔案</span>;
      } else if (interaction.message_type === "sticker") {
        return <span className="text-sm">😊 貼圖</span>;
      } else if (interaction.message_type === "location") {
        return <span className="text-sm">📍 位置</span>;
      }
      return <span className="text-sm">{interaction.message_type}</span>;
    }

    // 詳細模式：顯示完整內容和媒體
    if (interaction.message_type === "text" && content.text) {
      return (
        <div>
          <div className="text-sm mb-1">{content.text}</div>
          <div className="text-xs opacity-75">文字訊息</div>
        </div>
      );
    } else if (interaction.message_type === "image") {
      const messageId = interaction.id;
      // 優先使用資料庫中的 media_url，否則使用動態獲取的 URL
      const mediaUrl = interaction.media_url || mediaUrls[messageId];
      
      // 如果沒有媒體 URL，嘗試獲取
      if (!mediaUrl && messageId) {
        fetchMediaContent(messageId);
      }
      
      return (
        <div>
          {mediaUrl && !['LEGACY_MEDIA_ERROR', 'MEDIA_ERROR', 'NETWORK_ERROR'].includes(mediaUrl) ? (
            <img 
              src={mediaUrl} 
              alt="用戶發送的圖片"
              className="max-w-full rounded-lg mb-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.style.display = 'block';
              }}
            />
          ) : mediaUrl === 'LEGACY_MEDIA_ERROR' ? (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded mb-2">
              📷 舊版媒體訊息，無法載入內容
            </div>
          ) : mediaUrl === 'MEDIA_ERROR' ? (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              📷 媒體載入失敗
            </div>
          ) : mediaUrl === 'NETWORK_ERROR' ? (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              📷 網路錯誤，無法載入
            </div>
          ) : messageId ? (
            <div className="text-sm text-gray-500 mb-2">📷 圖片載入中...</div>
          ) : (
            <div className="text-sm text-gray-500 mb-2">📷 圖片</div>
          )}
          <div className="hidden text-sm">📷 圖片載入失敗</div>
          <div className="text-xs opacity-75">圖片訊息</div>
        </div>
      );
    } else if (interaction.message_type === "video") {
      const messageId = interaction.id;
      // 優先使用資料庫中的 media_url，否則使用動態獲取的 URL
      const mediaUrl = interaction.media_url || mediaUrls[messageId];
      
      // 如果沒有媒體 URL，嘗試獲取
      if (!mediaUrl && messageId) {
        fetchMediaContent(messageId);
      }
      
      return (
        <div>
          {mediaUrl && !['LEGACY_MEDIA_ERROR', 'MEDIA_ERROR', 'NETWORK_ERROR'].includes(mediaUrl) ? (
            <video 
              src={mediaUrl} 
              controls
              className="max-w-full rounded-lg mb-2"
              style={{ maxHeight: "200px" }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.style.display = 'block';
              }}
            />
          ) : mediaUrl === 'LEGACY_MEDIA_ERROR' ? (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded mb-2">
              🎥 舊版媒體訊息，無法載入內容
            </div>
          ) : mediaUrl === 'MEDIA_ERROR' ? (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              🎥 媒體載入失敗
            </div>
          ) : mediaUrl === 'NETWORK_ERROR' ? (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              🎥 網路錯誤，無法載入
            </div>
          ) : messageId ? (
            <div className="text-sm text-gray-500 mb-2">🎥 影片載入中...</div>
          ) : (
            <div className="text-sm text-gray-500 mb-2">🎥 影片</div>
          )}
          <div className="hidden text-sm">🎥 影片載入失敗</div>
          <div className="text-xs opacity-75">影片訊息</div>
        </div>
      );
    } else if (interaction.message_type === "audio") {
      const messageId = interaction.id;
      // 優先使用資料庫中的 media_url，否則使用動態獲取的 URL
      const mediaUrl = interaction.media_url || mediaUrls[messageId];
      
      // 如果沒有媒體 URL，嘗試獲取
      if (!mediaUrl && messageId) {
        fetchMediaContent(messageId);
      }
      
      return (
        <div>
          {mediaUrl && !['LEGACY_MEDIA_ERROR', 'MEDIA_ERROR', 'NETWORK_ERROR'].includes(mediaUrl) ? (
            <audio 
              src={mediaUrl} 
              controls
              className="w-full mb-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.style.display = 'block';
              }}
            />
          ) : mediaUrl === 'LEGACY_MEDIA_ERROR' ? (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded mb-2">
              🎵 舊版媒體訊息，無法載入內容
            </div>
          ) : mediaUrl === 'MEDIA_ERROR' ? (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              🎵 媒體載入失敗
            </div>
          ) : mediaUrl === 'NETWORK_ERROR' ? (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
              🎵 網路錯誤，無法載入
            </div>
          ) : messageId ? (
            <div className="text-sm text-gray-500 mb-2">🎵 音訊載入中...</div>
          ) : (
            <div className="text-sm text-gray-500 mb-2">🎵 音訊</div>
          )}
          <div className="hidden text-sm">🎵 音訊載入失敗</div>
          <div className="text-xs opacity-75">音訊訊息</div>
        </div>
      );
    } else if (interaction.message_type === "sticker") {
      return (
        <div>
          <div className="text-2xl mb-1">😊</div>
          <div className="text-xs opacity-75">
            貼圖 ID: {content.stickerId || 'unknown'}
          </div>
        </div>
      );
    } else if (interaction.message_type === "location" && content.address) {
      return (
        <div>
          <div className="text-sm mb-1">📍 {content.title || content.address}</div>
          {content.address && <div className="text-xs opacity-75">{content.address}</div>}
        </div>
      );
    }

    // 其他類型或包含原始JSON的詳細信息
    return (
      <div>
        <div className="text-sm mb-2">{interaction.message_type}</div>
        <pre className="whitespace-pre-wrap font-mono text-xs bg-black/20 p-2 rounded max-h-32 overflow-y-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    );
  };

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

  // 靜默更新用戶列表（WebSocket 更新時使用，不顯示 loading）
  const fetchUsersSilently = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!botId) return;

    try {
      const response = await apiClient.getBotUsers(botId, limit, offset);
      
      if (response.data && !response.error) {
        // 使用函數式更新，保持其他狀態不變
        setUsers(response.data.users || []);
        setTotalCount(response.data.total_count || 0);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
          limit,
          offset
        }));
      }
    } catch (error) {
      console.error("靜默更新用戶列表失敗:", error);
      // 靜默處理錯誤，不顯示通知
    }
  }, [botId]);

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

  // 靜默更新用戶互動記錄（WebSocket 更新時使用，不顯示 loading）
  const fetchUserInteractionsSilently = useCallback(async (lineUserId: string) => {
    if (!botId) return;

    try {
      const response = await apiClient.getUserInteractions(botId, lineUserId);
      
      if (response.data && !response.error) {
        setUserInteractions(response.data.interactions || []);
      }
    } catch (error) {
      console.error("靜默更新用戶互動記錄失敗:", error);
      // 靜默處理錯誤，不顯示通知
    }
  }, [botId]);

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

  // 處理 WebSocket 即時更新消息
  useEffect(() => {
    if (!lastMessage || !botId) return;
    
    // 確保消息是針對當前 Bot
    if (lastMessage.bot_id !== botId) {
      return;
    }
    
    switch (lastMessage.type) {
      case 'activity_update':
        // 有新活動時靜默更新用戶列表和選中用戶的互動記錄
        if (lastMessage.data) {
          // 靜默更新用戶列表以更新互動次數和最後互動時間，不顯示 loading
          fetchUsersSilently(pagination.limit, pagination.offset);
          
          // 如果有選中的用戶，靜默更新其互動記錄
          if (selectedUser) {
            fetchUserInteractionsSilently(selectedUser.line_user_id);
          }
          
          toast({
            title: "新用戶活動",
            description: "檢測到新的用戶互動",
            duration: 3000,
          });
        }
        break;
        
      case 'analytics_update':
        // 分析數據更新時，靜默重新獲取用戶列表以更新統計
        fetchUsersSilently(pagination.limit, pagination.offset);
        break;
        
      default:
        // 未處理的消息類型
    }
  }, [lastMessage, botId, pagination.limit, pagination.offset, selectedUser, fetchUsersSilently, fetchUserInteractionsSilently, toast]);

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
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">用戶管理</h1>
              <p className="text-gray-600">管理 LINE Bot 的關注者和互動記錄</p>
            </div>
            
            {/* WebSocket 連接狀態 */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex flex-col">
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? '即時連接' : '離線模式'}
                </span>
                {connectionError && (
                  <span className="text-red-500 text-xs">({connectionError})</span>
                )}
              </div>
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

                  {/* 互動歷史 - 聊天室樣式 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          互動歷史
                        </CardTitle>
                        
                        {/* 基本/詳細模式切換 */}
                        <div className="flex items-center gap-2">
                          <Label htmlFor="detailed-mode" className="text-sm text-muted-foreground">
                            基本
                          </Label>
                          <Switch
                            id="detailed-mode"
                            checked={isDetailedMode}
                            onCheckedChange={setIsDetailedMode}
                          />
                          <Label htmlFor="detailed-mode" className="text-sm text-muted-foreground">
                            詳細
                          </Label>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
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
                        <div className="h-96 overflow-y-auto p-4 space-y-4">
                          {userInteractions.map((interaction, index) => (
                            <div key={index} className="flex flex-col">
                              {/* 用戶訊息 */}
                              <div className="flex justify-end mb-2">
                                <div className="max-w-xs lg:max-w-md">
                                  <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2">
                                    {renderMessageContent(interaction, isDetailedMode)}
                                  </div>
                                  {isDetailedMode && (
                                    <div className="flex justify-end mt-1">
                                      <span className="text-xs text-gray-500">
                                        {new Date(interaction.timestamp).toLocaleString("zh-TW")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* 事件信息（詳細模式才顯示） */}
                              {isDetailedMode && interaction.event_type !== "message" && (
                                <div className="flex justify-center mb-2">
                                  <Badge
                                    variant={
                                      interaction.event_type === "follow"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {getEventTypeText(interaction.event_type)}
                                  </Badge>
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