import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  MessageSquare, 
  User, 
  Clock,
  CheckCheck,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "../../services/UnifiedApiClient";
import { useWebSocket } from "../../hooks/useWebSocket";
import FlexMessagePreview from "../Panels/FlexMessagePreview";

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

// 訊息內容類型定義
type MessageContent =
  | string
  | {
      text?: string | { text: string };
      content?: string;
      stickerId?: string;
      packageId?: string;
      title?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      [key: string]: unknown;
    };

interface ChatMessage {
  id: string;
  event_type: string;
  message_type: string;
  message_content: MessageContent;
  sender_type: "user" | "admin";
  timestamp: string;
  media_url?: string;
  media_path?: string;
  admin_user?: {
    id: string;
    username: string;
    full_name: string;
  };
}

interface ChatPanelProps {
  botId: string;
  selectedUser: LineUser | null;
  onClose?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ botId, selectedUser, onClose }) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0); // 以最新訊息為基準的偏移
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // WebSocket 連接，用於即時更新
  const { isConnected, lastMessage } = useWebSocket({
    botId: botId,
    enabled: !!selectedUser && !!botId,
    autoReconnect: true
  });

  // 僅滾動聊天區域到最底，不觸發整頁滾動
  const scrollToBottom = (smooth: boolean = true) => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      // 後備：若尚未綁定 scrollRef，避免觸發頁面滾動
      try {
        messagesEndRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
      } catch {}
    }
  };

  // 初始化或重新載入最新聊天記錄（最末端 50 筆）
  const loadInitial = useCallback(async () => {
    if (!selectedUser || !botId) return;
    setLoading(true);
    try {
      const resp = await apiClient.getChatHistory(botId, selectedUser.line_user_id, limit, 0);
      if (resp.data && resp.data.success) {
        const list: ChatMessage[] = resp.data.chat_history || [];
        setChatHistory(list);
        setOffset(list.length);
        setHasMore((resp.data.total_count || 0) > list.length);
        setTimeout(scrollToBottom, 50);
      } else {
        toast({ variant: "destructive", title: "載入失敗", description: "無法載入聊天記錄" });
      }
    } catch (err) {
      console.error("載入聊天記錄失敗:", err);
      toast({ variant: "destructive", title: "載入失敗", description: "無法載入聊天記錄" });
    } finally {
      setLoading(false);
    }
  }, [selectedUser, botId, limit, toast]);

  // 加載更舊訊息並置頂插入
  const loadMoreOlder = useCallback(async () => {
    if (!selectedUser || !botId || isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    const el = scrollRef.current;
    const prevScrollHeight = el ? el.scrollHeight : 0;
    const prevScrollTop = el ? el.scrollTop : 0;
    try {
      const resp = await apiClient.getChatHistory(botId, selectedUser.line_user_id, limit, offset);
      if (resp.data && resp.data.success) {
        const older: ChatMessage[] = resp.data.chat_history || [];
        if (older.length > 0) {
          setChatHistory((prev) => [...older, ...prev]);
          setOffset(offset + older.length);
          setHasMore((resp.data.total_count || 0) > (offset + older.length));
          // 維持目前視窗位置
          setTimeout(() => {
            if (scrollRef.current) {
              const delta = scrollRef.current.scrollHeight - prevScrollHeight;
              scrollRef.current.scrollTop = prevScrollTop + delta;
            }
          }, 0);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("載入更舊訊息失敗:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [selectedUser, botId, limit, offset, hasMore, isFetchingMore]);

  // 發送訊息
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser || !botId || sending) return;

    setSending(true);
    try {
      const response = await apiClient.sendMessageToUser(
        botId, 
        selectedUser.line_user_id, 
        { message: message.trim() }
      );

      if (response.data && response.data.success) {
        toast({
          title: "發送成功",
          description: "訊息已發送給用戶",
        });
        setMessage("");
        // 交由 WebSocket 推播觸發增量更新（避免整頁重載）
      } else {
        throw new Error(response.data?.message || "發送失敗");
      }
    } catch (error) {
      console.error("發送訊息失敗:", error);
      toast({
        variant: "destructive",
        title: "發送失敗",
        description: "無法發送訊息",
      });
    } finally {
      setSending(false);
    }
  };

  // 渲染訊息內容
  const renderMessageContent = (message: ChatMessage) => {
    const content = message.message_content;

    // 安全地提取文字內容
    const getTextContent = (content: MessageContent): string => {
      if (typeof content === 'string') {
        return content;
      }
      if (content && typeof content === 'object') {
        // 處理 {text: "..."} 格式
        if (content.text) {
          // 如果 content.text 也是對象，繼續提取
          if (typeof content.text === 'object' && content.text.text) {
            return String(content.text.text);
          }
          return String(content.text);
        }
        // 處理其他可能的格式
        if (content.content) {
          return String(content.content);
        }
      }
      return String(content || '');
    };

    if (message.message_type === "text") {
      const textContent = getTextContent(content);
      return <div className="break-words">{textContent}</div>;
    } else if (message.message_type === "image") {
      return (
        <div>
          {message.media_url ? (
            <img
              src={message.media_url}
              alt="用戶發送的圖片"
              className="max-w-xs rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-gray-500">📷 圖片</div>
          )}
        </div>
      );
    } else if (message.message_type === "flex") {
      try {
        // 後端存的是 { altText, contents }
        const flexContent = content as { contents?: unknown };
        const fm = { type: 'flex', contents: flexContent?.contents } as unknown;
        return (
          <div className="bg-white border rounded p-2 max-w-xl">
            <FlexMessagePreview json={fm} />
          </div>
        );
      } catch (_err) {
        return <div className="text-gray-500">Flex 訊息</div>;
      }
    } else if (message.message_type === "sticker") {
      // 嘗試以 LINE 官方貼圖圖檔顯示（以 stickerId 組 URL）
      const stickerContent = content as { packageId?: string; stickerId?: string };
      const pkg = stickerContent?.packageId || '';
      const sid = stickerContent?.stickerId || '';
      if (!sid) {
        return <div className="text-gray-600">😊 貼圖</div>;
      }
      const androidUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${sid}/android/sticker.png`;
      const iphoneUrl = `https://stickershop.line-scdn.net/stickershop/v1/sticker/${sid}/iPhone/sticker.png`;
      return (
        <div className="flex items-center justify-center">
          <img
            src={androidUrl}
            alt={`sticker ${pkg}-${sid}`}
            className="max-w-[160px] max-h-[160px] object-contain"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              // 嘗試 iPhone 路徑作為備援
              if (el.src !== iphoneUrl) {
                el.src = iphoneUrl;
              } else {
                // 兩者皆失敗則顯示替代文字
                el.style.display = 'none';
                const parent = el.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'text-gray-600';
                  fallback.innerText = `😊 貼圖（${pkg}-${sid})`;
                  parent.appendChild(fallback);
                }
              }
            }}
          />
        </div>
      );
    } else if (message.message_type === "location") {
      return <div className="text-gray-600">📍 位置訊息</div>;
    }

    return <div className="text-gray-500">{message.message_type}</div>;
  };

  // 格式化時間
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString("zh-TW", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });
    } else {
      return date.toLocaleDateString("zh-TW", { 
        month: "short", 
        day: "numeric",
        hour: "2-digit", 
        minute: "2-digit" 
      });
    }
  };

  // 當選中用戶變化時，初始化最近訊息
  useEffect(() => {
    if (selectedUser) {
      setChatHistory([]);
      setOffset(0);
      setHasMore(true);
      loadInitial();
    } else {
      setChatHistory([]);
    }
  }, [selectedUser, botId, loadInitial]);

  // 當聊天記錄更新時滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // 處理 WebSocket 消息：優先增量更新
  useEffect(() => {
    if (lastMessage && selectedUser) {
      // 直接推送的聊天消息（我們在後端廣播/單發時發出）
      if (lastMessage.type === 'chat_message') {
        const payload = lastMessage.data as { line_user_id?: string; message?: ChatMessage };
        if (payload?.line_user_id === selectedUser.line_user_id && payload.message) {
          setChatHistory((prev) => {
            const idx = prev.findIndex(m => m.id === payload.message!.id);
            if (idx >= 0) {
              // 更新既有訊息（例如媒體就緒）
              const next = prev.slice();
              next[idx] = { ...prev[idx], ...payload.message };
              return next;
            }
            // 新增訊息（增量 append）
            return [...prev, payload.message!];
          });
          setTimeout(scrollToBottom, 50);
        }
      }
      // 其餘事件（new_user_message / activity_update）不再觸發整頁重載，
      // 改由後端推送 chat_message 時進行增量插入，避免閃動與 loading。
    }
  }, [lastMessage, selectedUser, loadInitial]);

  // 處理 Enter 鍵發送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedUser) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">請選擇一個用戶開始聊天</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col self-start max-h-[75vh]">
      {/* 聊天室頭部 */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedUser.picture_url} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {selectedUser.display_name || "未設定名稱"}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>最後活動: {formatTime(selectedUser.last_interaction)}</span>
                {/* WebSocket 連接狀態 */}
                <div className={`flex items-center gap-1 ml-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs">
                    {isConnected ? '即時' : '離線'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* 聊天訊息區域 */}
      <CardContent className="p-0">
        <ScrollArea
          ref={scrollRef}
          className="max-h-[60vh] p-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop < 40 && hasMore && !isFetchingMore) {
              void loadMoreOlder();
            }
          }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">尚無對話記錄</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((msg, index) => {
                const isUser = msg.sender_type === 'user';
                const isAdmin = msg.sender_type === 'admin';
                const isBot = msg.sender_type === 'bot';

                // 對齊方向：用戶在左，管理員/機器人在右
                const justify = isUser ? 'justify-start' : 'justify-end';
                return (
                  <div key={`${msg.id}-${index}`} className={`flex ${justify}`}>
                    {/* 左側（用戶）顯示頭像在左 */}
                    {isUser && (
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="bg-blue-500 text-white text-xs">用戶</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-md px-4 py-2 max-w-xs lg:max-w-md">
                            {renderMessageContent(msg)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <span>{formatTime(msg.timestamp)}</span>
                            {msg.event_type !== "message" && (
                              <Badge variant="outline" className="text-xs">{msg.event_type}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 右側（管理員）顯示頭像在右 */}
                    {isAdmin && (
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="bg-green-500 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-xs lg:max-w-md">
                            {renderMessageContent(msg)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 justify-end">
                            <span>{formatTime(msg.timestamp)}</span>
                            <CheckCheck className="h-3 w-3 text-green-500" />
                          </div>
                        </div>
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="bg-green-500 text-white text-xs">管理</AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    {/* 右側（機器人）顯示頭像在右 */}
                    {isBot && (
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="bg-purple-500 text-white rounded-2xl rounded-tr-md px-4 py-2 max-w-xs lg:max-w-md">
                            {renderMessageContent(msg)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 justify-end">
                            <span>{formatTime(msg.timestamp)}</span>
                            <Badge variant="outline" className="text-xs">Bot</Badge>
                          </div>
                        </div>
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="bg-purple-500 text-white text-xs">機器</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* 訊息輸入區域 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="輸入訊息..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || !message.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
            {sending ? "發送中" : "發送"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatPanel;
