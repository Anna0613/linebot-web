import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, User, Bot } from 'lucide-react';
import VisualEditorApi, { FlexMessage } from '../../services/visualEditorApi';

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
}

// 簡化的FLEX訊息渲染引擎
class FlexMessageRenderer {
  static renderFlexMessage(flexMessage: FlexMessage): string {
    if (!flexMessage || !flexMessage.content) {
      return '<div class="text-gray-500 text-center py-2">無法載入FLEX訊息</div>';
    }

    let html = '<div class="bg-white border border-gray-200 rounded-lg shadow-sm" style="max-width: 280px; overflow: hidden;">';
    
    // 簡化處理FLEX訊息結構
    const content = flexMessage.content;
    
    // 處理 body 區塊
    if (content.body && content.body.contents) {
      html += '<div class="p-3">';
      content.body.contents.forEach((item: Record<string, unknown>) => {
        html += this.renderFlexItem(item);
      });
      html += '</div>';
    }
    
    // 處理 footer 區塊
    if (content.footer && content.footer.contents) {
      html += '<div class="p-3 bg-gray-50 border-t">';
      content.footer.contents.forEach((item: Record<string, unknown>) => {
        html += this.renderFlexItem(item);
      });
      html += '</div>';
    }
    
    // 如果都無法解析，顯示FLEX訊息名稱
    if (!content.body && !content.footer) {
      html += `<div class="p-3 text-blue-600 font-medium">[FLEX訊息: ${flexMessage.name || '未命名'}]</div>`;
    }

    html += '</div>';
    return html;
  }

  private static renderFlexItem(item: Record<string, unknown>): string {
    switch (item.type) {
      case 'text': {
        const textAlign = item.align ? `text-align: ${item.align};` : '';
        const margin = item.margin ? `margin-top: ${this.getMarginInPx(item.margin)};` : '';
        return `<div class="mb-1" style="color: ${item.color || '#000'}; font-size: ${this.getSizeInPx(item.size)}; font-weight: ${item.weight || 'normal'}; ${textAlign} ${margin}">${this.formatText(item.text || '')}</div>`;
      }
      
      case 'image':
        return `<img src="${item.url}" class="w-full rounded mb-2" style="max-height: 150px; object-fit: cover;" alt="FLEX Image" />`;
      
      case 'button': {
        const buttonColor = item.color || '#0066cc';
        const buttonLabel = item.action?.label || '按鈕';
        return `<button class="w-full text-white py-2 px-3 rounded text-sm mb-1 hover:opacity-80 transition-opacity" style="background-color: ${buttonColor};">${buttonLabel}</button>`;
      }
      
      case 'separator': {
        const separatorMargin = item.margin ? `margin: ${this.getMarginInPx(item.margin)} 0;` : 'margin: 8px 0;';
        return `<hr class="border-gray-300" style="${separatorMargin}" />`;
      }
      
      case 'box': {
        // 處理巢狀的 box 容器
        if (item.contents && Array.isArray(item.contents)) {
          let boxHtml = '<div class="';
          if (item.layout === 'horizontal') {
            boxHtml += 'flex space-x-2';
          } else {
            boxHtml += 'space-y-1';
          }
          boxHtml += '">';
          
          item.contents.forEach((subItem: Record<string, unknown>) => {
            boxHtml += this.renderFlexItem(subItem);
          });
          
          boxHtml += '</div>';
          return boxHtml;
        }
        return '';
      }
      
      default:
        return `<div class="text-gray-400 text-xs">不支援的元素類型: ${item.type}</div>`;
    }
  }

  private static formatText(text: string): string {
    // 將換行符號轉換為 HTML 換行
    return text.replace(/\n/g, '<br>');
  }

  private static getSizeInPx(size?: string): string {
    const sizeMap: { [key: string]: string } = {
      'xxs': '10px',
      'xs': '12px',
      'sm': '14px', 
      'md': '16px',
      'lg': '18px',
      'xl': '20px',
      'xxl': '24px'
    };
    return sizeMap[size || 'md'] || '16px';
  }

  private static getMarginInPx(margin?: string): string {
    const marginMap: { [key: string]: string } = {
      'none': '0px',
      'xs': '2px',
      'sm': '4px',
      'md': '8px',
      'lg': '12px',
      'xl': '16px',
      'xxl': '20px'
    };
    return marginMap[margin || 'none'] || '8px';
  }
}

const LineBotSimulator: React.FC<LineBotSimulatorProps> = ({ blocks }) => {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', content: '歡迎使用 LINE Bot 模擬器！請輸入訊息來測試您的 Bot 邏輯。', messageType: 'text' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [flexMessages, setFlexMessages] = useState<FlexMessage[]>([]);
  const [loadingFlexMessages, setLoadingFlexMessages] = useState(false);

  // 載入FLEX訊息列表
  useEffect(() => {
    const loadFlexMessages = async () => {
      setLoadingFlexMessages(true);
      try {
        // 嘗試載入FLEX訊息
        console.log('開始載入FLEX訊息...');
        const messages = await VisualEditorApi.getUserFlexMessages();
        setFlexMessages(messages);
        console.log('成功載入FLEX訊息:', messages.length, '個');
      } catch (error) {
        console.error("Error occurred:", _error);
        
        // 檢查錯誤類型並提供詳細信息
        if (error instanceof Error) {
          console.error('錯誤訊息:', error.message);
          if (error.message.includes('400')) {
            console.error('API返回400錯誤: 這可能是認證問題或請求格式錯誤');
          } else if (error.message.includes('401')) {
            console.error('API返回401錯誤: 認證失敗，請檢查登入狀態');
          } else if (error.message.includes('404')) {
            console.error('API返回404錯誤: API端點不存在');
          } else if (error.message.includes('500')) {
            console.error('API返回500錯誤: 服務器內部錯誤');
          }
        }
        
        // 設置空的FLEX訊息列表，不使用模擬數據
        setFlexMessages([]);
        console.log('由於API錯誤，FLEX訊息列表設為空，用戶需要先創建FLEX訊息');
      } finally {
        setLoadingFlexMessages(false);
      }
    };

    // 延遲載入，避免在組件還沒完全準備好時就調用API
    const timer = setTimeout(loadFlexMessages, 500);
    return () => clearTimeout(timer);
  }, []);

  // 根據ID查找FLEX訊息
  const getFlexMessageById = (id: string): FlexMessage | null => {
    return flexMessages.find(msg => msg.id === id) || null;
  };

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
            } else if (replyBlock.blockData.replyType === 'flex' && replyBlock.blockData.flexMessageId) {
              // FLEX訊息回覆
              const flexMessage = getFlexMessageById(replyBlock.blockData.flexMessageId);
              if (flexMessage) {
                botResponse = {
                  type: 'bot',
                  content: `FLEX訊息: ${flexMessage.name}`,
                  messageType: 'flex',
                  flexMessage: flexMessage
                };
              } else {
                botResponse = {
                  type: 'bot',
                  content: `無法載入FLEX訊息 (ID: ${replyBlock.blockData.flexMessageId})`,
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
            
            <div
              className={`max-w-xs rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white px-3 py-2'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {message.messageType === 'flex' && message.flexMessage ? (
                // FLEX訊息渲染
                <div 
                  className="flex-message-container"
                  dangerouslySetInnerHTML={{ 
                    __html: FlexMessageRenderer.renderFlexMessage(message.flexMessage) 
                  }}
                />
              ) : (
                // 一般文字訊息
                <div className="px-3 py-2">
                  <p className="text-sm">{message.content}</p>
                </div>
              )}
            </div>
            
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
      
      <div className="mt-2 text-xs text-gray-500 space-y-1">
        <div>💡 這是一個簡化的模擬器，實際的 LINE Bot 功能可能會有所不同</div>
        {loadingFlexMessages && (
          <div className="text-blue-600">🔄 載入FLEX訊息中...</div>
        )}
        {!loadingFlexMessages && flexMessages.length === 0 && (
          <div className="text-orange-600">⚠️ 沒有可用的FLEX訊息模板，請先在FLEX編輯器中創建</div>
        )}
        {!loadingFlexMessages && flexMessages.length > 0 && (
          <div className="text-green-600">
            ✅ 已載入 {flexMessages.length} 個FLEX訊息模板
          </div>
        )}
        {!loadingFlexMessages && flexMessages.length > 0 && (
          <div className="text-gray-400">
            📋 可用的FLEX訊息: {flexMessages.map(msg => msg.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};

export default LineBotSimulator;