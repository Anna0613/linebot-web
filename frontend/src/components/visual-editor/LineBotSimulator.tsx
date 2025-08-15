import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, User, Bot } from 'lucide-react';
import FlexMessagePreview from '../Panels/FlexMessagePreview';

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
  type: 'user' | 'bot';
  content: string;
  messageType?: 'text' | 'flex';
  flexMessage?: FlexMessage; // FLEX訊息內容
}

interface LineBotSimulatorProps {
  blocks: Block[];
  flexBlocks?: Block[];
}

// FlexMessageRenderer 已移除，現在使用 FlexMessagePreview 組件

const LineBotSimulator: React.FC<LineBotSimulatorProps> = ({ blocks, flexBlocks = [] }) => {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', content: '歡迎使用 LINE Bot 模擬器！請輸入訊息來測試您的 Bot 邏輯。', messageType: 'text' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // 將 flexBlocks 轉換為 FlexMessage 格式（符合 Panels/FlexMessagePreview 期望的格式）
  const convertFlexBlocksToFlexMessage = (blocks: Block[]) => {
    const contents: Record<string, unknown>[] = [];

    blocks.forEach(block => {
      // 檢查是否為 flex-content 類型的積木
      if (block.blockType === 'flex-content') {
        switch (block.blockData.contentType) {
          case 'text':
            contents.push({
              type: 'text',
              text: block.blockData.text || '文字內容',
              color: block.blockData.color || '#000000',
              size: block.blockData.size || 'md',
              weight: block.blockData.weight || 'regular',
              align: block.blockData.align || 'start'
            });
            break;
          case 'image':
            contents.push({
              type: 'image',
              url: block.blockData.url || 'https://via.placeholder.com/300x200',
              aspectRatio: block.blockData.aspectRatio || '20:13',
              aspectMode: block.blockData.aspectMode || 'cover'
            });
            break;
          case 'button':
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
          case 'separator':
            contents.push({
              type: 'separator',
              margin: block.blockData.margin || 'md',
              color: block.blockData.color || '#E0E0E0'
            });
            break;
        }
      } else if (block.blockType === 'flex-layout') {
        switch (block.blockData.layoutType) {
          case 'spacer':
            contents.push({
              type: 'spacer',
              size: block.blockData.size || 'md'
            });
            break;
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

  // API 載入邏輯已移除，現在直接使用 flexBlocks

  const simulateBot = (userMessage: string): Message => {
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
              if (flexBlocks && flexBlocks.length > 0) {
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

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    // 加入用戶訊息
    const newMessages: Message[] = [
      ...messages,
      { type: 'user', content: inputMessage, messageType: 'text' }
    ];

    // 模擬 Bot 回應
    const botResponse = simulateBot(inputMessage);
    newMessages.push(botResponse);

    setMessages(newMessages);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      <h3 className="text-lg font-medium text-gray-600 mb-4">LINE Bot 模擬器</h3>
      
      {/* 訊息區域 */}
      <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto mb-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start space-x-2 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'bot' && (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            {message.messageType === 'flex' && message.flexMessage ? (
              // FLEX訊息渲染 - 直接顯示，不加外層容器
              <div className="flex-message-container max-w-sm">
                <FlexMessagePreview json={message.flexMessage as any} />
              </div>
            ) : (
              // 一般訊息容器
              <div
                className={`${
                  message.type === 'user'
                    ? 'max-w-xs bg-blue-500 text-white px-3 py-2 rounded-lg'
                    : 'max-w-xs bg-white border border-gray-200 rounded-lg'
                }`}
              >
                <div className="px-3 py-2">
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            )}
            
            {message.type === 'user' && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 輸入區域 */}
      <div className="flex space-x-2">
        <Input
          placeholder="輸入訊息..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button onClick={sendMessage}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        <div>💡 這是一個簡化的模擬器，實際的 LINE Bot 功能可能會有所不同</div>
      </div>
    </div>
  );
};

export default LineBotSimulator;