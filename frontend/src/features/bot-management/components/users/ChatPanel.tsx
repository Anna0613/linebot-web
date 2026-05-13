import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/ui/loader";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  MessageSquare,
  User,
  Clock,
  CheckCheck,
  X,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/UnifiedApiClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import FlexMessagePreview from "@/components/preview/FlexMessagePreview";

// API 回應類型定義
interface ChatHistoryResponse {
  success: boolean;
  chat_history: ChatMessage[];
  total_count: number;
}

interface SendMessageResponse {
  success: boolean;
  message?: string;
}

interface UserAvatarResponse {
  avatar?: string;
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  sender_type: "user" | "admin" | "bot";
  timestamp: string;
  media_url?: string;
  media_path?: string;
  admin_user?: {
    id: string;
    username: string;
    full_name: string;
    avatar?: string;
  };
}

interface AIContextMetadata {
  provider?: string;
  model?: string;
  candidate_messages?: number;
  included_messages?: number;
  omitted_messages?: number;
  context_format?: string;
  estimated_context_tokens?: number;
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
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

  // AI 分析模式
  const [aiMode, setAiMode] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [awaitingAI, setAwaitingAI] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [aiContextMetadata, setAiContextMetadata] = useState<AIContextMetadata | null>(null);

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
      } catch (_err) {
        // ignore if scrollIntoView fails (ref not ready)
        console.debug('scrollIntoView fallback failed');
      }
    }
  };

  // 初始化或重新載入最新聊天記錄（最末端 50 筆）
  const loadInitial = useCallback(async () => {
    if (!selectedUser || !botId) return;
    setLoading(true);
    try {
      const resp = await apiClient.getChatHistory(botId, selectedUser.line_user_id, limit, 0);
      const data = resp.data as ChatHistoryResponse;
      if (data && data.success) {
        const list: ChatMessage[] = data.chat_history || [];
        setChatHistory(list);
        setOffset(list.length);
        setHasMore((data.total_count || 0) > list.length);
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
      const data = resp.data as ChatHistoryResponse;
      if (data && data.success) {
        const older: ChatMessage[] = data.chat_history || [];
        if (older.length > 0) {
          setChatHistory((prev) => [...older, ...prev]);
          setOffset(offset + older.length);
          setHasMore((data.total_count || 0) > (offset + older.length));
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

      const data = response.data as SendMessageResponse;
      if (data && data.success) {
        toast({
          title: "發送成功",
          description: "訊息已發送給好友",
        });
        setMessage("");
        // 交由 WebSocket 推播觸發增量更新（避免整頁重載）
      } else {
        throw new Error(data?.message || "發送失敗");
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

    // 以最小實作支援 Markdown 的渲染（粗體、斜體、連結、inline code、code block、換行）
    const renderMarkdown = (md: string) => {
      const escapeHtml = (s: string) =>
        s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      // 先 escape，再進行標記轉換
      let html = escapeHtml(md);

      // 三個反引號的程式碼區塊 ```lang ... ```
      html = html.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
        const langCls = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${langCls}>${code}</code></pre>`;
      });

      // 粗體與斜體（注意順序避免互相干擾）
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

      // 反引號 inline code
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

      // 連結 [text](url)
      html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) => {
        const safeText = String(text);
        const safeUrl = String(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600">${safeText}</a>`;
      });

      // 標題（#, ##, ### 轉成粗體行）
      html = html.replace(/^###\s+(.+)$/gm, '<strong>$1</strong><br/>');
      html = html.replace(/^##\s+(.+)$/gm, '<strong>$1</strong><br/>');
      html = html.replace(/^#\s+(.+)$/gm, '<strong>$1</strong><br/>');

      // 換行
      html = html.replace(/\n/g, '<br/>');

      return (
        <div
          className="prose prose-sm max-w-none prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-md prose-code:before:content-[''] prose-code:after:content-['']"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    };

    if (message.message_type === "text") {
      const textContent = getTextContent(content);
      // AI 模式下的 AI 回覆支援 Markdown 顯示
      if (aiMode && message.sender_type === 'bot') {
        return renderMarkdown(textContent);
      }
      return <div className="break-words whitespace-pre-wrap">{textContent}</div>;
    } else if (message.message_type === "image") {
      // 嘗試從 media_url 或 message_content 中獲取圖片 URL
      let imageUrl = message.media_url;
      if (!imageUrl && typeof content === 'object' && content) {
        // 從 message_content 中提取圖片 URL（用於舊訊息的向後兼容）
        imageUrl = (content as { originalContentUrl?: string }).originalContentUrl;
      }

      return (
        <div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="用戶發送的圖片"
              className="max-w-xs rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-muted-foreground">📷 圖片</div>
          )}
        </div>
      );
    } else if (message.message_type === "flex") {
      try {
        // 後端存的是 { altText, contents }
        const flexContent = content as { contents?: unknown };
        const fm = { type: 'flex', contents: flexContent?.contents } as unknown;
        return (
          <div className="bg-card text-card-foreground border rounded p-2 max-w-xl">
            <FlexMessagePreview json={fm} />
          </div>
        );
      } catch (_err) {
        return <div className="text-muted-foreground">Flex 訊息</div>;
      }
    } else if (message.message_type === "sticker") {
      // 嘗試以 LINE 官方貼圖圖檔顯示（以 stickerId 組 URL）
      const stickerContent = content as { packageId?: string; stickerId?: string };
      const pkg = stickerContent?.packageId || '';
      const sid = stickerContent?.stickerId || '';
      if (!sid) {
        return <div className="text-muted-foreground">😊 貼圖</div>;
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
                  fallback.className = 'text-muted-foreground';
                  fallback.innerText = `😊 貼圖（${pkg}-${sid})`;
                  parent.appendChild(fallback);
                }
              }
            }}
          />
        </div>
      );
    } else if (message.message_type === "location") {
      return <div className="text-muted-foreground">📍 位置訊息</div>;
    }

    return <div className="text-muted-foreground">{message.message_type}</div>;
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
      // 切換用戶時重設 AI 模式與內容
      setAiMode(false);
      setAiMessages([]);
      setAiContextMetadata(null);
    } else {
      setChatHistory([]);
    }
  }, [selectedUser, botId, loadInitial]);

  // 載入管理員頭像（從使用者 PostgreSQL 儲存的 avatar_base64）
  useEffect(() => {
    const fetchAdminAvatar = async () => {
      try {
        const resp = await apiClient.getUserAvatar();
        const data = resp.data as UserAvatarResponse;
        if (resp.status === 200 && data && data.avatar) {
          setAdminAvatar(data.avatar as string);
        } else {
          setAdminAvatar(null);
        }
      } catch (_e) {
        setAdminAvatar(null);
      }
    };
    fetchAdminAvatar();
  }, []);

  // 當聊天記錄或 AI 訊息更新時滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, aiMessages]);

  // 處理 WebSocket 消息：優先增量更新
  useEffect(() => {
    if (lastMessage && selectedUser) {
      console.log('🔄 ChatPanel 收到 WebSocket 訊息:', lastMessage.type, lastMessage);

      // 直接推送的聊天消息（我們在後端廣播/單發時發出）
      if (lastMessage.type === 'chat_message') {
        const payload = lastMessage.data as { line_user_id?: string; message?: ChatMessage };
        console.log('📨 處理 chat_message:', payload);

        if (payload?.line_user_id === selectedUser.line_user_id && payload.message) {
          console.log('✅ 訊息匹配當前用戶，準備更新聊天記錄');
          console.log('📋 新訊息詳情:', payload.message);

          setChatHistory((prev) => {
            console.log('🔍 檢查訊息是否已存在，當前記錄數:', prev.length);
            const idx = prev.findIndex(m => m.id === payload.message!.id);
            console.log('🔍 查找結果 idx:', idx, '訊息 ID:', payload.message!.id);

            if (idx >= 0) {
              // 更新既有訊息（例如媒體就緒）
              console.log('🔄 更新既有訊息:', payload.message!.id);
              const next = prev.slice();
              next[idx] = { ...prev[idx], ...payload.message };
              console.log('🔄 更新後記錄數:', next.length);
              return next;
            }
            // 新增訊息（增量 append）
            console.log('➕ 新增訊息到聊天記錄:', payload.message!.id, payload.message!.sender_type);
            const newHistory = [...prev, payload.message!];
            console.log('➕ 新增後記錄數:', newHistory.length);
            return newHistory;
          });
          setTimeout(scrollToBottom, 50);
        } else {
          console.log('❌ 訊息不匹配當前用戶或無訊息內容:', {
            payloadUserId: payload?.line_user_id,
            selectedUserId: selectedUser.line_user_id,
            hasMessage: !!payload?.message
          });
        }
      }
      // 其餘事件（new_user_message / activity_update）不再觸發整頁重載，
      // 改由後端推送 chat_message 時進行增量插入，避免閃動與 loading。
    }
  }, [lastMessage, selectedUser, loadInitial]);

  // 處理 Enter 鍵發送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (aiMode) {
        void handleAskAI();
      } else {
        void handleSendMessage();
      }
    }
  };

  // 切換 AI 分析模式
  const toggleAIMode = (checked: boolean) => {
    setAiMode(checked);
    if (checked && aiMessages.length === 0) {
      const now = new Date().toISOString();
      // 加入一則引導訊息（以 bot 身份顯示）
      setAiMessages([
        {
          id: `ai-welcome-${now}`,
          event_type: "message",
          message_type: "text",
          message_content: { text: "AI 分析模式已啟用。請直接提問，例如：「請總結這位好友常問的問題」或「過去 30 天，這位好友最常互動的主題是什麼？」" },
          sender_type: "bot",
          timestamp: now,
        },
      ]);
    }
  };

  // 構建傳給後端的 AI 歷史（user / assistant）
  const buildAIHistory = (): Array<{ role: 'user' | 'assistant'; content: string }> => {
    const turns: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const m of aiMessages) {
      if (m.id.startsWith('ai-welcome-')) continue;
      const content = (() => {
        const c: MessageContent = m.message_content;
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object') {
          if (typeof c.text === 'object' && (c.text as { text?: string })?.text) {
            return String((c.text as { text?: string }).text);
          }
          if (typeof c.text === 'string') return c.text as string;
          if (typeof c.content === 'string') return c.content as string;
        }
        return '';
      })();
      if (!content) continue;
      if (m.sender_type === 'admin') {
        turns.push({ role: 'user', content });
      } else if (m.sender_type === 'bot') {
        turns.push({ role: 'assistant', content });
      }
    }
    return turns.slice(-12);
  };

  // AI 提問
  const handleAskAI = async () => {
    if (!message.trim() || !selectedUser || !botId || awaitingAI) return;
    const q = message.trim();
    setAwaitingAI(true);

    const now = new Date().toISOString();
    // 先插入管理者問題
    const adminMsg: ChatMessage = {
      id: `ai-q-${now}`,
      event_type: 'message',
      message_type: 'text',
      message_content: { text: q },
      sender_type: 'admin',
      timestamp: now,
    };
    setAiMessages(prev => [...prev, adminMsg]);
    setMessage('');

    try {
      const history = buildAIHistory();

      // 準備 API 請求參數
      interface AskAIRequest {
        question: string;
        history: Array<{ role: 'user' | 'assistant'; content: string }>;
      }
      const requestParams: AskAIRequest = {
        question: q,
        history,
      };

      const resp = await apiClient.askAI(botId, selectedUser.line_user_id, requestParams);
      if (resp.success && resp.data) {
        type AskAIResponse = { answer?: string; context_metadata?: AIContextMetadata };
        const data = resp.data as AskAIResponse;
        const answer = typeof data?.answer === 'string' ? data.answer : '（無回應）';
        setAiContextMetadata(data.context_metadata || null);
        const ts = new Date().toISOString();
        const botMsg: ChatMessage = {
          id: `ai-a-${ts}`,
          event_type: 'message',
          message_type: 'text',
          message_content: { text: answer },
          sender_type: 'bot',
          timestamp: ts,
        };
        setAiMessages(prev => [...prev, botMsg]);
      } else {
        toast({ variant: 'destructive', title: 'AI 服務錯誤', description: String((resp.error || '請稍後重試')) });
      }
    } catch (err) {
      console.error('AI 分析失敗:', err);
      toast({ variant: 'destructive', title: 'AI 分析失敗', description: '請確認後端 AI 服務設定，或稍後再試。' });
    } finally {
      setAwaitingAI(false);
    }
  };

  // 清除 AI 分析快取
  const handleClearAIHistory = async () => {
    if (!selectedUser || !botId || clearingHistory) return;

    setClearingHistory(true);

    try {
      // 清除後端快取
      const response = await apiClient.clearAIConversationHistory(botId, selectedUser.line_user_id);

      if (response.success) {
        // 清除前端 AI 分析對話狀態
        setAiMessages([]);
        setAiContextMetadata(null);

        toast({
          title: '清除成功',
          description: 'AI 分析快取已清除',
        });
      } else {
        throw new Error(response.error || '清除失敗');
      }
    } catch (error) {
      console.error('清除 AI 分析快取失敗:', error);
      toast({
        variant: 'destructive',
        title: '清除失敗',
        description: '無法清除 AI 分析快取，請稍後再試',
      });
    } finally {
      setClearingHistory(false);
    }
  };

  if (!selectedUser) {
    return (
      <Card className="flex flex-col h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[calc(100vh-10rem)] w-full">
        <CardContent className="flex items-center justify-center flex-1">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">請選擇一位好友開始聊天</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[calc(100vh-10rem)] w-full">
      {/* 聊天室頭部 */}
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={selectedUser.picture_url} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">
                {selectedUser.display_name || "未設定名稱"}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Clock className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">最後活動: {formatTime(selectedUser.last_interaction)}</span>
                {/* WebSocket 連接狀態 */}
                <div className={`flex items-center gap-1 ${isConnected ? 'text-green-500' : 'text-red-500'} flex-shrink-0`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs">
                    {isConnected ? '即時' : '離線'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">AI 分析</span>
              <Switch checked={aiMode} onCheckedChange={toggleAIMode} />
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {/* 在小螢幕上顯示 AI 分析開關 */}
        <div className="sm:hidden flex items-center justify-between pt-3 mt-3 border-t">
          <span className="text-sm text-muted-foreground">AI 分析</span>
          <Switch checked={aiMode} onCheckedChange={toggleAIMode} />
        </div>
      </CardHeader>

      {/* AI 分析固定策略 */}
      {aiMode && (
        <div className="px-4 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">Groq GPT-OSS 120B</Badge>
              </div>
              {aiContextMetadata && (
                <div className="mt-1 text-xs text-muted-foreground">
                  已納入 {aiContextMetadata.included_messages ?? 0} 則
                  {typeof aiContextMetadata.omitted_messages === 'number' && (
                    <>，省略 {aiContextMetadata.omitted_messages} 則</>
                  )}
                  {aiContextMetadata.context_format && (
                    <>，格式 {aiContextMetadata.context_format}</>
                  )}
                </div>
              )}
            </div>

            {/* 清除 AI 分析快取按鈕 */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  disabled={awaitingAI || clearingHistory || aiMessages.length === 0}
                  className="h-10 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  清除對話紀錄
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>確認清除 AI 分析快取</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作將清除這位好友的 AI 分析快取與畫面上的 AI 分析對話。
                    <br />
                    <strong>注意：</strong>此操作不會影響好友與 LINE Bot 的正常聊天記錄。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAIHistory}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    確認清除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* 聊天訊息區域 */}
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto"
          onScroll={(e: React.UIEvent<HTMLDivElement>) => {
            const el = e.currentTarget;
            // 當使用者捲動到頂部附近（100px 內）時，載入更舊的批次訊息
            if (el.scrollTop < 100 && hasMore && !isFetchingMore && !aiMode) {
              void loadMoreOlder();
            }
          }}
        >
          {(!aiMode && loading) ? (
            <div className="flex justify-center py-8">
              <Loader text="載入對話..." />
            </div>
          ) : (!aiMode && chatHistory.length === 0) ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">尚無對話記錄</p>
            </div>
          ) : (aiMode && aiMessages.length === 0) ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">歡迎使用 AI 分析功能</p>
              <p className="text-sm text-muted-foreground mt-2">
                請在下方輸入問題，AI 會根據這位好友的對話紀錄進行分析。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 批次載入提示：載入更舊訊息時顯示 */}
              {!aiMode && isFetchingMore && (
                <div className="flex justify-center py-2">
                  <Loader size="sm" text="載入更多..." />
                </div>
              )}
              {/* 已無更多訊息提示 */}
              {!aiMode && !hasMore && chatHistory.length > 0 && (
                <div className="flex justify-center py-2">
                  <span className="text-xs text-muted-foreground px-3 py-1 rounded-full bg-muted">
                    已顯示全部對話記錄
                  </span>
                </div>
              )}
              {(aiMode ? aiMessages : chatHistory).map((msg, index) => {
                const isUser = msg.sender_type === 'user';
                const isAdmin = msg.sender_type === 'admin';
                const isBot = msg.sender_type === 'bot';

                // 對齊方向
                // - 一般模式：用戶在左，其餘在右
                // - AI 模式：AI(機器人)在左，管理者在右
                const justify = aiMode
                  ? (isBot ? 'justify-start' : 'justify-end')
                  : (isUser ? 'justify-start' : 'justify-end');
                return (
                  <div key={`${msg.id}-${index}`} className={`flex ${justify}`}>
                    {/* 左側（用戶）顯示頭像在左 */}
                    {isUser && (
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src={selectedUser?.picture_url} />
                          <AvatarFallback className="bg-blue-500 text-white text-xs">好友</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="bg-secondary text-foreground rounded-2xl rounded-tl-md px-4 py-2 max-w-xs lg:max-w-md">
                            {renderMessageContent(msg)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
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
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                            <span>{formatTime(msg.timestamp)}</span>
                            <CheckCheck className="h-3 w-3 text-green-500" />
                          </div>
                        </div>
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src={adminAvatar || undefined} />
                          <AvatarFallback className="bg-green-500 text-white text-xs">管理</AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    {/* 機器人訊息：AI 模式在左側，其他在右側 */}
                    {isBot && (
                      aiMode ? (
                        // 左側（AI）顯示頭像在左，使用淺底色
                        <div className="flex items-start gap-2">
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-accent text-accent-foreground text-xs">AI</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="bg-secondary text-foreground rounded-2xl rounded-tl-md px-4 py-2 max-w-xs lg:max-w-md">
                              {renderMessageContent(msg)}
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <span>{formatTime(msg.timestamp)}</span>
                              <Badge variant="outline" className="text-xs">AI</Badge>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // 右側（一般 bot 訊息）— 使用設計系統 accent 柔和紫色
                        <div className="flex items-start gap-2">
                          <div>
                            <div className="bg-accent text-accent-foreground rounded-2xl rounded-tr-md px-4 py-2 max-w-xs lg:max-w-md border border-accent">
                              {renderMessageContent(msg)}
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                              <span>{formatTime(msg.timestamp)}</span>
                              <Badge variant="outline" className="text-xs">Bot</Badge>
                            </div>
                          </div>
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-accent text-accent-foreground text-xs">機器</AvatarFallback>
                          </Avatar>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </CardContent>

      {/* 訊息輸入區域 */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder={aiMode ? "向 AI 詢問關於這位好友的問題..." : "輸入訊息..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending || awaitingAI}
            className="flex-1"
          />
          <Button
            onClick={aiMode ? handleAskAI : handleSendMessage}
            disabled={(sending || awaitingAI) || !message.trim()}
            size="sm"
          >
            {sending || awaitingAI ? (
              <Loader size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {aiMode ? (awaitingAI ? "分析中" : "詢問 AI") : (sending ? "發送中" : "發送")}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatPanel;
