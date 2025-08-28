import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Bot, User, Send } from 'lucide-react';
import FlexMessagePreview from '../Panels/FlexMessagePreview';
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
}

const LineBotSimulator: React.FC<SimulatorProps> = ({ blocks, flexBlocks = [] }) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: '歡迎使用 LINE Bot 模擬器，請輸入訊息來測試您的 Bot 邏輯。',
      messageType: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const convertFlexBlocksToFlexMessage = (blocks: Block[]) => {
    const contents: Record<string, unknown>[] = [];

    blocks.forEach(block => {
      // 檢查是否為 flex-content 類型的積木
      if (block.blockType === 'flex-content') {
        switch (block.blockData.contentType) {
          case 'text': {
            contents.push({
              type: 'text',
              text: block.blockData.text || '文字內容',
              color: block.blockData.color || '#000000',
              size: block.blockData.size || 'md',
              weight: block.blockData.weight || 'regular',
              align: block.blockData.align || 'start'
            });
            break;
          }
          case 'image': {
            contents.push({
              type: 'image',
              url: block.blockData.url || 'https://via.placeholder.com/300x200',
              aspectRatio: block.blockData.aspectRatio || '20:13',
              aspectMode: block.blockData.aspectMode || 'cover'
            });
            break;
          }
          case 'button': {
            contents.push({
              type: 'button',
              action: {
                type: block.blockData.actionType || 'message',
                label: block.blockData.label || '按鈕',
                text: block.blockData.text || block.blockData.label || '按鈕'
              },
              style: block.blockData.style || 'primary'
            });
            break;
          }
          case 'separator': {
            contents.push({
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
            contents.push({
              type: 'spacer',
              size: block.blockData.size || 'md'
            });
            break;
          }
        }
      }
    });

    // 返回符合 Panels/FlexMessagePreview 期望的格式
    return {
      type: 'flex',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents
        }
      }
    };
  };

  // 將後端儲存格式轉為前端可用的 LocalFlexMessage
  const convertStoredFlexMessage = (stored: StoredFlexMessage): FlexMessage => {
    // stored.content 可能是空字串、JSON 字串、或已為物件。
    let contents: any = stored.content;

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
      } catch (err) {
        // 無法 parse，保留原始字串，之後會作為文字包入 bubble
      }
    }

    // 如果是設計器格式（含 blocks） -> 轉換成 preview 可用的 flex message
    if (contents && typeof contents === 'object' && Array.isArray((contents as any).blocks)) {
      const blocks = (contents as any).blocks as Block[];
      const fm = convertFlexBlocksToFlexMessage(blocks);
      return {
        type: 'flex',
        altText: stored.name || 'Flex Message',
        contents: fm.contents
      };
    }

    // 如果 contents 本身就是 bubble / flex 結構，直接回傳
    if (contents && typeof contents === 'object') {
      // 偵測常見 flex structure
      if ((contents as any).type === 'bubble' || (contents as any).body || (contents as any).contents) {
        return {
          type: 'flex',
          altText: stored.name || 'Flex Message',
          contents
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
  };

  // 根據目前的 blocks 與 flexBlocks 模擬 bot 回應（簡化）
  const botSimulator = (userMessage: string): Message => {
    // 預設回應
    let botResponse: Message = {
      type: 'bot',
      content: '我還不知道如何回應這個訊息。',
      messageType: 'text'
    };

    // 根據積木邏輯生成回應
    blocks.forEach(block => {
      if (block.blockType === 'event' && block.blockData.eventType === 'message.text') {
        const condition = block.blockData.condition;
        if (!condition || userMessage.includes(condition)) {
          // 尋找對應的回覆積木
          const replyBlock = blocks.find(b => b.blockType === 'reply');

          if (replyBlock) {
            if (replyBlock.blockData.replyType === 'text' && replyBlock.blockData.content) {
              // 文字回覆
              botResponse = {
                type: 'bot',
                content: replyBlock.blockData.content,
                messageType: 'text'
              };
            } else if (replyBlock.blockData.replyType === 'flex') {
              // FLEX訊息回覆 - 使用 Flex 設計器中的內容
              const storedKey = replyBlock.blockData.flexMessageName || replyBlock.blockData.flexMessageId;
              const stored = storedKey ? savedFlexMessages.get(storedKey) : undefined;
              if (stored) {
                const fm = convertStoredFlexMessage(stored);

                botResponse = {
                  type: 'bot',
                  content: fm.altText || 'Flex 訊息',
                  messageType: 'flex',
                  flexMessage: fm
                };
              }
              else if (flexBlocks && flexBlocks.length > 0) {
                // 使用當前 Flex 設計器中設計的內容
                const currentFlexMessage = convertFlexBlocksToFlexMessage(flexBlocks);
                botResponse = {
                  type: 'bot',
                  content: `Flex 訊息`,
                  messageType: 'flex',
                  flexMessage: currentFlexMessage
                };
              } else if (replyBlock.blockData.flexContent && Object.keys(replyBlock.blockData.flexContent as Record<string, unknown>).length > 0) {
                // 備用：使用積木中設定的 Flex 內容
                botResponse = {
                  type: 'bot',
                  content: `Flex 訊息`,
                  messageType: 'flex',
                  flexMessage: {
                    type: 'flex',
                    contents: replyBlock.blockData.flexContent as Record<string, unknown>
                  }
                };
              } else {
                botResponse = {
                  type: 'bot',
                  content: '請在 Flex 設計器中設計 Flex 訊息內容',
                  messageType: 'text'
                };
              }
            }
          }
        }
      }
    });

    return botResponse;
  };

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
    const botResp = botSimulator(text);
    newMsgs.push(botResp);

    setChatMessages(newMsgs);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="h-full flex flex-col bg-white rounded border border-gray-200">
      <div className="flex items-center px-4 py-2 bg-green-500 text-white rounded-t">
        <Bot className="w-5 h-5 mr-2" />
        <div className="font-medium">LINE Bot 模擬器</div>
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
                      <FlexMessagePreview json={m.flexMessage as any} />
                    </div>
                  ) : (
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
  );
};

export default LineBotSimulator;
