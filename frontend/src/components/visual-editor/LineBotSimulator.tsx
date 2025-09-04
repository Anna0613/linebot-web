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

  // 改進的積木連接邏輯 - 移到前面定義
  const findConnectedReplyBlock = useCallback((eventBlock: Block, allReplyBlocks: Block[]): Block | undefined => {
    const eventId = eventBlock.blockData.id || eventBlock.id;
    
    console.log('🔍 尋找連接的回覆積木:', {
      eventId,
      eventBlock: eventBlock.blockData,
      replyBlocksCount: allReplyBlocks.length
    });

    // 策略1：尋找明確標記為連接的積木
    let replyBlock = allReplyBlocks.find(b => {
      const isConnected = (
        b.blockData.connectedTo === eventId ||
        b.blockData.parentId === eventId ||
        b.parentId === eventId ||
        b.blockData.sourceBlockId === eventId ||
        b.blockData.targetBlockId === eventId
      );
      
      if (isConnected) {
        console.log('✅ 找到明確連接的回覆積木:', b.blockData);
      }
      
      return isConnected;
    });

    // 策略2：根據條件匹配找到最合適的回覆積木
    if (!replyBlock) {
      const eventCondition = (eventBlock.blockData.condition || eventBlock.blockData.pattern) as string;
      
      if (eventCondition) {
        // 尋找有相同或相關條件的回覆積木
        replyBlock = allReplyBlocks.find(b => {
          const replyCondition = b.blockData.condition as string;
          return replyCondition && replyCondition.includes(eventCondition);
        });
        
        if (replyBlock) {
          console.log('✅ 根據條件匹配找到回覆積木:', replyBlock.blockData);
        }
      }
    }

    // 策略3：按照積木在陣列中的順序進行配對
    if (!replyBlock && allReplyBlocks.length > 0) {
      const eventBlocks = blocks.filter(b => b.blockType === 'event');
      const eventIndex = eventBlocks.findIndex(b => 
        (b.blockData.id || b.id) === eventId
      );
      
      // 如果找到事件積木的索引，用相同索引的回覆積木
      if (eventIndex >= 0 && eventIndex < allReplyBlocks.length) {
        replyBlock = allReplyBlocks[eventIndex];
        console.log('✅ 根據順序配對找到回覆積木:', replyBlock.blockData);
      } else {
        // 否則使用第一個可用的回覆積木
        replyBlock = allReplyBlocks[0];
        console.log('⚠️ 使用第一個可用的回覆積木:', replyBlock.blockData);
      }
    }

    if (!replyBlock) {
      console.log('❌ 沒有找到任何連接的回覆積木');
    }

    return replyBlock;
  }, [blocks]);

  // 處理測試動作
  const handleTestAction = useCallback((action: 'new-user' | 'test-message' | 'preview-dialog') => {
    switch (action) {
      case 'new-user':
        // 模擬新用戶加入 - 觸發 follow 事件
        const followBlocks = blocks.filter(b => b.blockType === 'event' && b.blockData.eventType === 'follow');
        const followReplyBlocks = blocks.filter(b => b.blockType === 'reply');
        
        if (followBlocks.length > 0 && followReplyBlocks.length > 0) {
          const followReply = findConnectedReplyBlock(followBlocks[0], followReplyBlocks);
          if (followReply && (followReply.blockData.content || followReply.blockData.text)) {
            setChatMessages([
              {
                type: 'bot',
                content: (followReply.blockData.content || followReply.blockData.text) as string,
                messageType: 'text'
              }
            ]);
          } else {
            setChatMessages([
              {
                type: 'bot',
                content: '歡迎加入！',
                messageType: 'text'
              }
            ]);
          }
        } else {
          setChatMessages([
            {
              type: 'bot',
              content: '歡迎使用 LINE Bot 模擬器！我是您的智能助手。',
              messageType: 'text'
            }
          ]);
        }
        break;
      case 'test-message':
        // 發送預設測試訊息
        const testMessages = ['你好', 'hello', '幫助', '功能', '圖片', 'image'];
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        simulateUserMessage(randomMessage);
        break;
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
  }, [blocks, findConnectedReplyBlock]);

  // 模擬用戶發送訊息
  const simulateUserMessage = useCallback((message: string) => {
    const newMsgs = [
      ...chatMessages,
      { type: 'user', content: message, messageType: 'text' }
    ];

    const botResp = botSimulator(message);
    newMsgs.push(botResp);

    setChatMessages(newMsgs);
  }, [chatMessages]);

  // 處理來自父組件的測試動作
  useEffect(() => {
    if (testAction) {
      handleTestAction(testAction);
    }
  }, [testAction, handleTestAction]);

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

  // 將積木轉換為 Carousel 格式
  const convertBlocksToCarousel = useCallback((blocks: Block[]) => {
    // 過濾出非容器積木
    const contentBlocks = blocks.filter(block => block.blockType !== 'flex-container');
    
    // 簡單實作：將內容積木分成多個 Bubble
    // 每 3 個積木組成一個 Bubble
    const bubbles: Record<string, unknown>[] = [];
    const itemsPerBubble = 3;
    
    for (let i = 0; i < contentBlocks.length; i += itemsPerBubble) {
      const bubbleBlocks = contentBlocks.slice(i, i + itemsPerBubble);
      const bubbleContents: Record<string, unknown>[] = [];
      
      bubbleBlocks.forEach(block => {
        if (block.blockType === 'flex-content') {
          switch (block.blockData.contentType) {
            case 'text':
              bubbleContents.push({
                type: 'text',
                text: block.blockData.text || `卡片 ${Math.floor(i / itemsPerBubble) + 1} 文字`,
                size: 'md',
                wrap: true
              });
              break;
            case 'image':
              bubbleContents.push({
                type: 'image',
                url: block.blockData.url || 'https://via.placeholder.com/300x200',
                aspectRatio: '20:13',
                aspectMode: 'cover',
                size: 'full'
              });
              break;
            case 'button':
              bubbleContents.push({
                type: 'button',
                action: {
                  type: 'message',
                  label: block.blockData.label || `按鈕 ${Math.floor(i / itemsPerBubble) + 1}`,
                  text: block.blockData.text || block.blockData.label || `按鈕 ${Math.floor(i / itemsPerBubble) + 1}`
                },
                style: 'primary'
              });
              break;
          }
        }
      });
      
      // 如果沒有內容，添加預設內容
      if (bubbleContents.length === 0) {
        bubbleContents.push({
          type: 'text',
          text: `輪播卡片 ${bubbles.length + 1}`,
          size: 'md',
          align: 'center'
        });
      }
      
      bubbles.push({
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: bubbleContents
        }
      });
    }
    
    // 如果沒有任何 Bubble，創建預設的
    if (bubbles.length === 0) {
      for (let i = 0; i < 2; i++) {
        bubbles.push({
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `輪播卡片 ${i + 1}`,
                size: 'md',
                align: 'center'
              }
            ]
          }
        });
      }
    }
    
    return {
      type: 'flex',
      contents: {
        type: 'carousel',
        contents: bubbles
      }
    };
  }, []);

  const convertFlexBlocksToFlexMessage = useCallback((blocks: Block[]) => {
    // 檢查是否有 Carousel 容器
    const carouselContainer = blocks.find(block => 
      block.blockType === 'flex-container' && block.blockData.containerType === 'carousel'
    );
    
    if (carouselContainer) {
      // 處理 Carousel 容器 - 需要將其他積木分組為多個 Bubble
      return convertBlocksToCarousel(blocks);
    }
    
    // 否則按照原來的 Bubble 邏輯處理
    // 分類積木到不同的區域
    const headerBlocks: Record<string, unknown>[] = [];
    const bodyBlocks: Record<string, unknown>[] = [];
    const footerBlocks: Record<string, unknown>[] = [];

    blocks.forEach(block => {
      // 跳過容器積木本身
      if (block.blockType === 'flex-container') return;
      
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
          case 'filler': {
            targetArray.push({
              type: 'filler'
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

  // 根據目前的 blocks 與 flexBlocks 模擬 bot 回應（改進版）
  const botSimulator = useCallback((userMessage: string): Message => {
    // 預設回應
    let botResponse: Message = {
      type: 'bot',
      content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。',
      messageType: 'text'
    };

    // 獲取所有事件積木和回覆積木
    const eventBlocks = blocks.filter(b => b.blockType === 'event' && b.blockData.eventType === 'message.text');
    const replyBlocks = blocks.filter(b => b.blockType === 'reply');

    // 如果沒有事件積木或回覆積木，返回預設回應
    if (eventBlocks.length === 0 || replyBlocks.length === 0) {
      return botResponse;
    }

    // 找到匹配的事件積木
    let matchedEventBlock: Block | null = null;

    // 首先檢查有條件的事件積木
    for (const eventBlock of eventBlocks) {
      const condition = eventBlock.blockData.condition || eventBlock.blockData.pattern || '';
      if (condition && isMessageMatched(userMessage, condition as string)) {
        matchedEventBlock = eventBlock;
        break; // 找到第一個匹配的有條件事件就停止
      }
    }

    // 如果沒有找到有條件的匹配事件，檢查無條件的事件積木
    if (!matchedEventBlock) {
      for (const eventBlock of eventBlocks) {
        const condition = eventBlock.blockData.condition || eventBlock.blockData.pattern || '';
        if (!condition) {
          matchedEventBlock = eventBlock;
          break; // 找到第一個無條件事件就停止
        }
      }
    }

    // 如果找到匹配的事件積木，尋找對應的回覆積木
    if (matchedEventBlock) {
      const replyBlock = findConnectedReplyBlock(matchedEventBlock, replyBlocks);

      if (replyBlock) {
        if (replyBlock.blockData.replyType === 'text' && (replyBlock.blockData.content || replyBlock.blockData.text)) {
          // 文字回覆
          botResponse = {
            type: 'bot',
            content: (replyBlock.blockData.content || replyBlock.blockData.text) as string,
            messageType: 'text'
          };
        } else if (replyBlock.blockData.replyType === 'image') {
          // 圖片回覆
          botResponse = {
            type: 'bot',
            content: '圖片訊息',
            messageType: 'image',
            flexMessage: {
              type: 'image',
              contents: {
                type: 'image',
                url: replyBlock.blockData.content as string || 'https://via.placeholder.com/300x200?text=圖片',
                aspectRatio: '20:13',
                aspectMode: 'cover',
                size: 'full'
              }
            }
          };
        } else if (replyBlock.blockData.replyType === 'sticker') {
          // 貼圖回覆
          botResponse = {
            type: 'bot',
            content: '貼圖訊息 🎉',
            messageType: 'sticker'
          };
        } else if (replyBlock.blockData.replyType === 'flex') {
          // FLEX訊息回覆 - 使用 Flex 設計器中的內容
          const storedKey = replyBlock.blockData.flexMessageName || replyBlock.blockData.flexMessageId;
          const stored = storedKey ? savedFlexMessages.get(storedKey as string) : undefined;
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

    return botResponse;
  }, [blocks, flexBlocks, savedFlexMessages, findConnectedReplyBlock, isMessageMatched]);

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
                  ) : m.messageType === 'image' && m.flexMessage ? (
                    // 圖片訊息渲染
                    <div className="bg-white border rounded p-2">
                      <img 
                        src={(m.flexMessage as any)?.contents?.url || 'https://via.placeholder.com/300x200?text=圖片'} 
                        alt="Bot 回覆圖片"
                        className="max-w-xs rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=圖片載入失敗';
                        }}
                      />
                    </div>
                  ) : m.messageType === 'sticker' ? (
                    // 貼圖訊息渲染
                    <div className="bg-white border rounded px-3 py-2 max-w-xs text-sm">
                      <div className="text-2xl mb-1">🎉</div>
                      <div className="text-xs text-gray-500">貼圖訊息</div>
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
