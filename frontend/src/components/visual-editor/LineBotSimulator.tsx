import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, User, Bot } from 'lucide-react';

interface BlockData {
  [key: string]: unknown;
  eventType?: string;
  condition?: string;
  replyType?: string;
  content?: string;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface Message {
  type: 'user' | 'bot';
  content: string;
}

interface LineBotSimulatorProps {
  blocks: Block[];
}

const LineBotSimulator: React.FC<LineBotSimulatorProps> = ({ blocks }) => {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', content: '歡迎使用 LINE Bot 模擬器！請輸入訊息來測試您的 Bot 邏輯。' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const simulateBot = (userMessage: string): string => {
    // 簡化的 Bot 邏輯模擬
    let botResponse = '我還不知道如何回應這個訊息。';

    // 根據積木邏輯生成回應
    blocks.forEach(block => {
      if (block.blockType === 'event' && block.blockData.eventType === 'message.text') {
        const condition = block.blockData.condition;
        if (!condition || userMessage.includes(condition)) {
          // 尋找對應的回覆積木
          const replyBlock = blocks.find(b => 
            b.blockType === 'reply' && 
            b.blockData.replyType === 'text'
          );
          if (replyBlock && replyBlock.blockData.content) {
            botResponse = replyBlock.blockData.content;
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
      { type: 'user', content: inputMessage }
    ];

    // 模擬 Bot 回應
    const botResponse = simulateBot(inputMessage);
    newMessages.push({ type: 'bot', content: botResponse });

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
              className={`max-w-xs px-3 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="text-sm">{message.content}</p>
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
      
      <div className="mt-2 text-xs text-gray-500">
        💡 這是一個簡化的模擬器，實際的 LINE Bot 功能可能會有所不同
      </div>
    </div>
  );
};

export default LineBotSimulator;