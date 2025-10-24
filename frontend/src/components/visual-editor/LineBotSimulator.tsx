import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Bot, User, Send, Code } from 'lucide-react';
import FlexMessagePreview from '../Panels/FlexMessagePreview';
import CodeViewerDialog from './CodeViewerDialog';
import VisualEditorApi, { FlexMessage as StoredFlexMessage } from '../../services/visualEditorApi';

/**
 * 精簡版 LogicEditorPreview
 * - 只保留聊天室模擬功能 (與預覽/測試畫面一致)
 * - 移除其他多餘的視圖與控制元件
 */

/* --- Types --- */
interface BlockData {
  [key: string]: unknown;
  eventType?: string;
  condition?: string;
  replyType?: string;
  content?: string;
  flexMessageId?: string;
  flexMessageName?: string;
}

interface Block {
  blockType: string;
  blockData: BlockData;
  id?: string;
  parentId?: string;
}

interface FlexMessage {
  type: string;
  altText?: string;
  contents?: Record<string, unknown>;
}

interface Message {
  type: 'user' | 'bot' | string;
  content: string;
  messageType?: 'text' | 'flex' | string;
  flexMessage?: FlexMessage;
}

/* --- Component --- */
interface SimulatorProps {
  blocks: Block[];
  flexBlocks?: Block[];
  testAction?: 'new-user' | 'test-message' | 'preview-dialog' | null;
}

const LineBotSimulator: React.FC<SimulatorProps> = ({ blocks, flexBlocks = [], testAction }) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: '歡迎使用 LINE Bot 模擬器，請輸入訊息來測試您的 Bot 邏輯。',
      messageType: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);

  // 先定義其他函式，稍後定義 simulateUserMessage 與 handleTestAction

  const [savedFlexMessages, setSavedFlexMessages] = useState<Map<string, StoredFlexMessage>>(
    new Map()
  );

  // 讀取使用者已儲存的 Flex 範本
  const loadSavedFlexMessages = useCallback(async () => {
    try {
      const messages = await VisualEditorApi.getUserFlexMessages();
      const map = new Map<string, StoredFlexMessage>();
      // map by both id and name so callers can lookup by either value
      messages.forEach((m) => {
        if (m && m.id) map.set(m.id, m);
        // some places reference by name, support that as well
        // (if duplicate names exist, last one wins)
        if ((m as any).name) map.set((m as any).name, m);
      });
      setSavedFlexMessages(map);
    } catch (err) {
      console.error('載入已儲存 Flex 範本失敗', err);
    }
  }, []);

  useEffect(() => {
    loadSavedFlexMessages();
  }, [loadSavedFlexMessages]);

  const convertFlexBlocksToFlexMessage = useCallback((blocks: Block[]) => {
    // 分類積木到不同的區域
    const headerBlocks: Record<string, unknown>[] = [];
    const bodyBlocks: Record<string, unknown>[] = [];
    const footerBlocks: Record<string, unknown>[] = [];

    blocks.forEach(block => {
      let targetArray = bodyBlocks; // 預設放到 body

      // 根據積木的區域設定決定放置位置
      if (block.blockData.area === 'header') {
        targetArray = headerBlocks;
      } else if (block.blockData.area === 'footer') {
        targetArray = footerBlocks;
      }

      // 檢查是否為 flex-content 類型的積木
      if (block.blockType === 'flex-content') {
        switch (block.blockData.contentType) {
          case 'text': {
            targetArray.push({
              type: 'text',
              text: block.blockData.text || '文字內容',
              color: block.blockData.color || '#000000',
              size: block.blockData.size || 'md',
              weight: block.blockData.weight || 'regular',
              align: block.blockData.align || 'start',
              wrap: block.blockData.wrap !== false
            });
            break;
          }
          case 'image': {
            targetArray.push({
              type: 'image',
              url: block.blockData.url || 'https://via.placeholder.com/300x200',
              aspectRatio: block.blockData.aspectRatio || '20:13',
              aspectMode: block.blockData.aspectMode || 'cover',
              size: block.blockData.size || 'full'
            });
            break;
          }
          case 'button': {
            targetArray.push({
              type: 'button',
              action: {
                type: block.blockData.actionType || 'message',
                label: block.blockData.label || '按鈕',
                text: block.blockData.text || block.blockData.label || '按鈕'
              },
              style: block.blockData.style || 'primary',
              color: block.blockData.color || undefined
            });
            break;
          }
          case 'separator': {
            targetArray.push({
              type: 'separator',
              margin: block.blockData.margin || 'md',
              color: block.blockData.color || '#E0E0E0'
            });
            break;
          }
        }
      } else if (block.blockType === 'flex-layout') {
        switch (block.blockData.layoutType) {
          case 'spacer': {
            targetArray.push({
              type: 'spacer',
              size: block.blockData.size || 'md'
            });
            break;
          }
          case 'box': {
            // 處理 box 容器
            targetArray.push({
              type: 'box',
              layout: block.blockData.layout || 'vertical',
              contents: [], // 這裡應該處理嵌套內容，暫時留空
              spacing: block.blockData.spacing || 'md',
              margin: block.blockData.margin || 'none'
            });
            break;
          }
        }
      }
    });

    // 構建完整的 Flex 結構
    const bubble: Record<string, unknown> = {
      type: 'bubble'
    };

    // 添加 header（如果有內容）
    if (headerBlocks.length > 0) {
      bubble.header = {
        type: 'box',
        layout: 'vertical',
        contents: headerBlocks
      };
    }

    // 添加 body（總是需要）
    bubble.body = {
      type: 'box',
      layout: 'vertical',
      contents: bodyBlocks.length > 0 ? bodyBlocks : [
        {
          type: 'text',
          text: '請在 Flex 設計器中添加內容',
          color: '#999999',
          align: 'center'
        }
      ]
    };

    // 添加 footer（如果有內容）
    if (footerBlocks.length > 0) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: footerBlocks
      };
    }

    // 返回符合 Panels/FlexMessagePreview 期望的格式
    return {
      type: 'flex',
      contents: bubble
    };
  }, []);

  // 將後端儲存格式轉為前端可用的 LocalFlexMessage
  const convertStoredFlexMessage = useCallback((stored: StoredFlexMessage): FlexMessage => {
    // stored.content 可能是空字串、JSON 字串、或已為物件。
    let contents: unknown = stored.content;

    // 處理字串形式的 content
    if (typeof contents === 'string') {
      const raw = contents.trim();
      if (!raw) {
        // 空字串 -> 回傳一個簡單的 bubble（顯示 name 或提示）
        return {
          type: 'flex',
          altText: stored.name || 'Flex Message',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: stored.name || 'Empty Flex Message' }
              ]
            }
          }
        };
      }

      try {
        contents = JSON.parse(raw);
      } catch (_err) {
        // 無法 parse，保留原始字串，之後會作為文字包入 bubble
      }
    }

    // 如果是設計器格式（含 blocks） -> 轉換成 preview 可用的 flex message
    if (
      contents &&
      typeof contents === 'object' &&
      'blocks' in (contents as Record<string, unknown>) &&
      Array.isArray((contents as { blocks?: unknown }).blocks)
    ) {
      const blocks = (contents as { blocks: Block[] }).blocks;
      const fm = convertFlexBlocksToFlexMessage(blocks);
      return {
        type: 'flex',
        altText: stored.name || 'Flex Message',
        contents: fm.contents
      };
    }

    // 如果 contents 本身就是 bubble / flex 結構，適當處理
    if (contents && typeof contents === 'object') {
      const obj = contents as Record<string, unknown>;

      // 如果已經是完整的 Flex Message，直接返回
      if (obj.type === 'flex' && obj.contents) {
        return contents as FlexMessage;
      }

      // 如果是 bubble 或 carousel 結構，包裝成完整的 Flex Message
      if (obj.type === 'bubble' || obj.type === 'carousel') {
        return {
          type: 'flex',
          altText: stored.name || 'Flex Message',
          contents
        };
      }

      // 如果有 body 屬性，可能是 bubble 結構（沒有明確的 type）
      if (typeof obj.body === 'object') {
        return {
          type: 'flex',
          altText: stored.name || 'Flex Message',
          contents: {
            type: 'bubble',
            ...contents
          }
        };
      }
    }

    // 最後的 fallback：把字串或其他物件序列化並放到 bubble 的 text
    const text = typeof contents === 'string' ? contents : JSON.stringify(contents ?? '');
    return {
      type: 'flex',
      altText: stored.name || 'Flex Message',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: text }
          ]
        }
      }
    };
  }, [convertFlexBlocksToFlexMessage]);

  // 尋找與事件積木連接的回覆積木
  const _findConnectedReplyBlock = useCallback((eventBlock: Block, allReplyBlocks: Block[]): Block | undefined => {
    // 簡化的連接邏輯：在視覺化編輯器中，通常是按順序配對
    const eventId = eventBlock.blockData.id || eventBlock.id;

    // 首先嘗試找到明確連接的回覆積木
    let replyBlock = allReplyBlocks.find(b =>
      b.blockData.connectedTo === eventId ||
      b.blockData.parentId === eventId ||
      b.parentId === eventId
    );

    // 如果沒有找到明確連接的，使用第一個可用的回覆積木
    if (!replyBlock && allReplyBlocks.length > 0) {
      replyBlock = allReplyBlocks[0];
    }

    return replyBlock;
  }, []);

  // 檢查訊息是否匹配條件
  const isMessageMatched = useCallback((userMessage: string, condition?: string): boolean => {
    if (!condition) return true;

    // 支援多種匹配模式
    const lowerMessage = userMessage.toLowerCase();
    const lowerCondition = condition.toLowerCase();

    // 完全匹配
    if (lowerMessage === lowerCondition) return true;

    // 包含匹配
    if (lowerMessage.includes(lowerCondition)) return true;

    // 關鍵字匹配（用逗號分隔）
    if (condition.includes(',')) {
      const keywords = condition.split(',').map(k => k.trim().toLowerCase());
      return keywords.some(keyword => lowerMessage.includes(keyword));
    }

    return false;
  }, []);

  // 根據目前的 blocks 與 flexBlocks 模擬 bot 回應（支援序列執行）
  const botSimulatorMulti = useCallback((userMessage: string): Message[] => {
    const responses: Message[] = [];

    const eventBlocks = blocks.filter(b => b.blockType === 'event' && b.blockData.eventType === 'message.text');
    const replyBlocks = blocks.filter(b => b.blockType === 'reply');

    if (eventBlocks.length === 0 || replyBlocks.length === 0) {
      return [{
        type: 'bot',
        content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。',
        messageType: 'text'
      }];
    }

    // 找到匹配的事件積木
    let matchedEventBlock: Block | null = null;
    for (const eventBlock of eventBlocks) {
      const condition = eventBlock.blockData.condition || eventBlock.blockData.pattern || '';
      if (condition && isMessageMatched(userMessage, condition as string)) {
        matchedEventBlock = eventBlock;
        break;
      }
    }
    if (!matchedEventBlock) {
      matchedEventBlock = eventBlocks.find(eb => !eb.blockData.condition && !eb.blockData.pattern) || null;
    }
    if (!matchedEventBlock) {
      return [{
        type: 'bot',
        content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。',
        messageType: 'text'
      }];
    }

    // 依序從事件積木後方往下執行，直到遇到下一個事件或達到安全上限
    const startIndex = blocks.findIndex(b => b.id === matchedEventBlock!.id);
    const MAX_STEPS = 10;
    let steps = 0;
    for (let i = startIndex + 1; i < blocks.length && steps < MAX_STEPS; i++) {
      const b = blocks[i];
      if (b.blockType === 'event') break;
      steps += 1;

      if (b.blockType === 'control') {
        // 基礎處理控制積木（僅作為提示，不中斷流程）
        const ctype = (b.blockData.controlType as string) || '';
        if (ctype === 'wait' || ctype === 'delay') {
          const delayTime = (b.blockData.delay as number) || (b.blockData.wait as number) || 0;
          responses.push({ type: 'bot', content: `延遲 ${delayTime}ms`, messageType: 'text' });
        }
        continue;
      }

      if (b.blockType !== 'reply') continue;

      const replyType = (b.blockData.replyType as string) || 'text';
      if (replyType === 'text') {
        const content = (b.blockData.content || b.blockData.text) as string || '空的回覆內容';
        responses.push({ type: 'bot', content, messageType: 'text' });
      } else if (replyType === 'flex') {
        const storedKey = b.blockData.flexMessageName || b.blockData.flexMessageId;
        const stored = storedKey ? savedFlexMessages.get(storedKey as string) : undefined;
        if (stored) {
          const fm = convertStoredFlexMessage(stored);
          responses.push({ type: 'bot', content: fm.altText || 'Flex 訊息', messageType: 'flex', flexMessage: fm });
        } else if (flexBlocks && flexBlocks.length > 0) {
          const currentFlexMessage = convertFlexBlocksToFlexMessage(flexBlocks);
          responses.push({ type: 'bot', content: 'Flex 訊息', messageType: 'flex', flexMessage: currentFlexMessage });
        } else if (b.blockData.flexContent && Object.keys(b.blockData.flexContent as Record<string, unknown>).length > 0) {
          responses.push({
            type: 'bot',
            content: 'Flex 訊息',
            messageType: 'flex',
            flexMessage: { type: 'flex', contents: b.blockData.flexContent as Record<string, unknown> }
          });
        } else {
          responses.push({ type: 'bot', content: '請在 Flex 設計器中設計 Flex 訊息內容', messageType: 'text' });
        }
      } else if (replyType === 'image') {
        const imageUrl = (b.blockData.originalContentUrl || b.blockData.url) as string;
        const previewUrl = (b.blockData.previewImageUrl || imageUrl) as string;
        if (imageUrl) {
          responses.push({ type: 'bot', content: previewUrl || imageUrl, messageType: 'image' });
        }
      } else if (replyType === 'sticker') {
        const stickerId = (b.blockData.stickerId as string) || '1';
        responses.push({ type: 'bot', content: `貼圖 ${stickerId}`, messageType: 'sticker' });
      }
    }

    if (responses.length === 0) {
      responses.push({ type: 'bot', content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。', messageType: 'text' });
    }
    return responses;
  }, [blocks, flexBlocks, savedFlexMessages, isMessageMatched, convertFlexBlocksToFlexMessage, convertStoredFlexMessage]);

  // 模擬用戶發送訊息（依賴 botSimulator）
  const simulateUserMessage = useCallback((message: string) => {
    setChatMessages(prev => {
      const userMsg = { type: 'user', content: message, messageType: 'text' } as const;
      const botResps = botSimulatorMulti(message);
      return [...prev, userMsg, ...botResps];
    });
  }, [botSimulatorMulti]);

  // 處理測試動作（依賴 simulateUserMessage）
  const handleTestAction = useCallback((action: 'new-user' | 'test-message' | 'preview-dialog') => {
    switch (action) {
      case 'new-user':
        // 模擬新用戶加入
        setChatMessages([
          {
            type: 'bot',
            content: '歡迎使用 LINE Bot 模擬器！我是您的智能助手。',
            messageType: 'text'
          }
        ]);
        break;
      case 'test-message': {
        // 發送預設測試訊息
        const testMessages = ['你好', 'hello', '幫助', '功能'];
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        simulateUserMessage(randomMessage);
        break;
      }
      case 'preview-dialog':
        // 預覽完整對話流程
        setChatMessages([
          { type: 'bot', content: '歡迎使用 LINE Bot！', messageType: 'text' },
          { type: 'user', content: '你好', messageType: 'text' },
          { type: 'bot', content: '您好！我可以為您做什麼嗎？', messageType: 'text' },
          { type: 'user', content: '幫助', messageType: 'text' },
          { type: 'bot', content: '這裡是幫助訊息...', messageType: 'text' }
        ]);
        break;
    }
  }, [simulateUserMessage]);

  // 處理來自父組件的測試動作（依賴 handleTestAction）
  useEffect(() => {
    if (testAction) {
      handleTestAction(testAction);
    }
  }, [testAction, handleTestAction]);

  // 發送訊息並顯示模擬回覆
  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    const text = inputMessage.trim();

    // 加入用戶訊息
    const newMsgs = [
      ...chatMessages,
      { type: 'user', content: text, messageType: 'text' }
    ];

    // 模擬 Bot 回應
    const botResps = botSimulatorMulti(text);
    newMsgs.push(...botResps);

    setChatMessages(newMsgs);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white rounded border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 bg-green-500 text-white rounded-t">
          <div className="flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            <div className="font-medium">LINE Bot 模擬器</div>
          </div>
          <Button
            onClick={() => setIsCodeDialogOpen(true)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-green-600"
            title="查看生成的程式碼"
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>

      {/* 訊息區域 */}
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
        {chatMessages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* 機器人訊息 */}
            {m.type === 'bot' && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  {m.messageType === 'flex' && m.flexMessage ? (
                    // FLEX 訊息渲染
                    <div className="bg-white border rounded p-2 max-w-xl">
                      <FlexMessagePreview json={m.flexMessage} />
                    </div>
                  ) : m.messageType === 'image' ? (
                    // 圖片訊息渲染
                    <div className="bg-white border rounded p-2 max-w-xs">
                      <img
                        src={m.content}
                        alt="Bot 回覆的圖片"
                        className="w-full rounded"
                        onError={(e) => {
                          // 圖片載入失敗時顯示錯誤訊息
                          e.currentTarget.style.display = 'none';
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'text-red-500 text-xs p-2';
                          errorDiv.textContent = `圖片載入失敗: ${m.content}`;
                          e.currentTarget.parentElement?.appendChild(errorDiv);
                        }}
                      />
                    </div>
                  ) : m.messageType === 'sticker' ? (
                    // 貼圖訊息渲染
                    <div className="bg-white border rounded px-3 py-2 max-w-xs text-sm">
                      😊 {m.content}
                    </div>
                  ) : (
                    // 文字訊息渲染
                    <div className="bg-white border rounded px-3 py-2 max-w-xs text-sm">{m.content}</div>
                  )}
                </div>
              </div>
            )}

            {/* 使用者訊息 */}
            {m.type === 'user' && (
              <div className="flex items-start space-x-2">
                <div>
                  <div className="bg-blue-500 text-white px-3 py-2 rounded-lg max-w-xs text-sm">
                    {m.content}
                  </div>
                </div>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 bg-white border-t flex items-center space-x-2 rounded-b">
        <Input
          placeholder="輸入訊息..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={sendMessage}>
          <Send className="w-4 h-4 mr-2" />
          送出
        </Button>
      </div>
      </div>

      {/* 程式碼查看對話框 */}
      <CodeViewerDialog
        isOpen={isCodeDialogOpen}
        onOpenChange={setIsCodeDialogOpen}
        blocks={blocks}
      />
    </>
  );
};

export default LineBotSimulator;
