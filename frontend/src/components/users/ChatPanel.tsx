import React, { useState, useEffect, useRef } from "react";
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

interface ChatMessage {
  id: string;
  event_type: string;
  message_type: string;
  message_content: any;
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
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket 連接，用於即時更新
  const { isConnected, lastMessage } = useWebSocket({
    botId: botId,
    enabled: !!selectedUser && !!botId,
    autoReconnect: true
  });

  // 滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 獲取聊天記錄
  const fetchChatHistory = async () => {
    if (!selectedUser || !botId) return;

    setLoading(true);
    try {
      const response = await apiClient.getChatHistory(botId, selectedUser.line_user_id);
      
      if (response.data && response.data.success) {
        setChatHistory(response.data.chat_history || []);
        // 延遲滾動以確保內容已渲染
        setTimeout(scrollToBottom, 100);
      } else {
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: "無法載入聊天記錄",
        });
      }
    } catch (error) {
      console.error("獲取聊天記錄失敗:", error);
      toast({
        variant: "destructive",
        title: "載入失敗",
        description: "無法載入聊天記錄",
      });
    } finally {
      setLoading(false);
    }
  };

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
        // 重新獲取聊天記錄以顯示新訊息
        await fetchChatHistory();
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
    
    if (message.message_type === "text" && content?.text) {
      return <div className="break-words">{content.text}</div>;
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
    } else if (message.message_type === "sticker") {
      return <div className="text-2xl">😊 貼圖</div>;
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

  // 當選中用戶變化時，重新獲取聊天記錄
  useEffect(() => {
    if (selectedUser) {
      fetchChatHistory();
    } else {
      setChatHistory([]);
    }
  }, [selectedUser, botId]);

  // 當聊天記錄更新時滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // 處理 WebSocket 消息，實現即時更新
  useEffect(() => {
    if (lastMessage && selectedUser) {
      console.log("收到 WebSocket 消息:", lastMessage);
      
      // 檢查是否是當前用戶的新訊息
      if (lastMessage.type === 'new_user_message') {
        const messageData = lastMessage.data as any;
        
        // 確保這是當前選中用戶的訊息
        if (messageData && messageData.line_user_id === selectedUser.line_user_id) {
          console.log("檢測到當前用戶的新訊息，重新載入聊天記錄");
          
          // 延遲一下確保資料庫已經保存完成，然後重新獲取聊天記錄
          setTimeout(() => {
            fetchChatHistory();
          }, 500);
        }
      }
      
      // 處理活動更新（也可能包含訊息事件）
      if (lastMessage.type === 'activity_update') {
        const activityData = lastMessage.data as any;
        
        // 如果是訊息事件且來自當前用戶，也觸發更新
        if (activityData && 
            activityData.event_type === 'message' && 
            activityData.user_id === selectedUser.line_user_id) {
          console.log("檢測到當前用戶的活動更新，重新載入聊天記錄");
          
          setTimeout(() => {
            fetchChatHistory();
          }, 500);
        }
      }
    }
  }, [lastMessage, selectedUser]);

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
    <Card className="h-full flex flex-col">
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
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] p-4">
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
              {chatHistory.map((msg, index) => (
                <div 
                  key={`${msg.id}-${index}`} 
                  className={`flex ${msg.sender_type === "admin" ? "justify-start" : "justify-end"}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${
                    msg.sender_type === "admin" ? "" : ""
                  }`}>
                    {/* 管理者訊息 */}
                    {msg.sender_type === "admin" && (
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="bg-green-500 text-white text-xs">
                            管理
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-green-500 text-white rounded-2xl rounded-tl-md px-4 py-2">
                            {renderMessageContent(msg)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <span>{formatTime(msg.timestamp)}</span>
                            <CheckCheck className="h-3 w-3 text-green-500" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 用戶訊息 */}
                    {msg.sender_type === "user" && (
                      <div className="flex flex-col items-end">
                        <div className="bg-blue-500 text-white rounded-2xl rounded-tr-md px-4 py-2">
                          {renderMessageContent(msg)}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <span>{formatTime(msg.timestamp)}</span>
                          {msg.event_type !== "message" && (
                            <Badge variant="outline" className="text-xs">
                              {msg.event_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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