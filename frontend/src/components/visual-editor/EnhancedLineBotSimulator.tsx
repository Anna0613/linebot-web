/**
 * 增強版 LINE Bot 模擬器
 * 使用新的積木連接管理系統和事件匹配系統
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Bot, User, Send, Play, RefreshCw, Settings, AlertTriangle } from 'lucide-react';
import FlexMessagePreview from '../Panels/FlexMessagePreview';
import { BlockConnectionManager } from '../../utils/BlockConnectionManager';
import { EnhancedEventMatcher, EventPattern, MatchType } from '../../utils/EventMatchingSystem';
import { ControlFlowProcessor, ControlFlowType } from '../../utils/ControlFlowProcessor';
import { ExecutionContext } from '../../types/blockConnection';
import { UnifiedBlock } from '../../types/block';
import VisualEditorApi, { FlexMessage as StoredFlexMessage } from '../../services/visualEditorApi';

interface BlockData {
  [key: string]: unknown;
  eventType?: string;
  condition?: string;
  replyType?: string;
  content?: string;
  flexMessageId?: string;
  flexMessageName?: string;
  controlType?: string;
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
  timestamp?: number;
  executionInfo?: {
    matchedPatterns: string[];
    executionPath: string[];
    processingTime: number;
  };
}

interface SimulatorProps {
  blocks: Block[];
  flexBlocks?: Block[];
  testAction?: 'new-user' | 'test-message' | 'preview-dialog' | null;
  showDebugInfo?: boolean;
}

const EnhancedLineBotSimulator: React.FC<SimulatorProps> = ({ 
  blocks, 
  flexBlocks = [], 
  testAction,
  showDebugInfo = false 
}) => {
  // 狀態管理
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: '🤖 歡迎使用增強版 LINE Bot 模擬器！我已經準備好回應您的訊息。',
      messageType: 'text',
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // 核心系統實例
  const connectionManager = useMemo(() => new BlockConnectionManager(blocks as UnifiedBlock[]), [blocks]);
  const eventMatcher = useMemo(() => new EnhancedEventMatcher(), []);
  const controlFlowProcessor = useMemo(() => new ControlFlowProcessor(), []);

  // Flex Message 資料
  const [savedFlexMessages, setSavedFlexMessages] = useState<Map<string, StoredFlexMessage>>(new Map());

  // 初始化系統
  useEffect(() => {
    console.log('🚀 初始化增強版模擬器');
    
    // 更新積木資料
    connectionManager.updateBlocks(blocks as UnifiedBlock[]);
    
    // 自動建立連接
    connectionManager.autoConnectBlocks();
    
    // 初始化事件模式
    initializeEventPatterns();
    
    // 載入 Flex Messages
    loadSavedFlexMessages();
    
    const stats = connectionManager.getConnectionGraph();
    console.log('📊 連接統計:', stats);
  }, [blocks, connectionManager]);

  // 初始化事件模式
  const initializeEventPatterns = useCallback(() => {
    // 清空現有模式
    eventMatcher.getMatchingStats();

    // 從積木中提取事件模式
    blocks.forEach((block, index) => {
      if (block.blockType === 'event' && block.blockData.eventType === 'message.text') {
        const condition = block.blockData.condition || block.blockData.pattern || '';
        
        if (condition) {
          const pattern: EventPattern = {
            id: `block_${block.id || index}`,
            type: MatchType.CONTAINS,
            pattern: condition as string,
            caseSensitive: false,
            weight: 1.0,
            enabled: true,
            metadata: {
              blockId: block.id,
              blockType: block.blockType
            }
          };
          
          // 檢查是否為正則表達式
          if (condition.toString().startsWith('/') && condition.toString().endsWith('/')) {
            pattern.type = MatchType.REGEX;
            pattern.pattern = condition.toString().slice(1, -1); // 移除 / /
          }
          
          eventMatcher.addPattern(pattern);
          console.log('📝 添加事件模式:', pattern);
        }
      }
    });

    // 添加預設模式
    eventMatcher.addPattern({
      id: 'greeting',
      type: MatchType.CUSTOM,
      pattern: 'greeting',
      caseSensitive: false,
      weight: 0.8,
      enabled: true,
      metadata: { type: 'builtin' }
    });

    const stats = eventMatcher.getMatchingStats();
    console.log('🎯 事件匹配統計:', stats);
  }, [blocks, eventMatcher]);

  // 載入已儲存的 Flex Messages
  const loadSavedFlexMessages = useCallback(async () => {
    try {
      const messages = await VisualEditorApi.getUserFlexMessages();
      const map = new Map<string, StoredFlexMessage>();
      
      messages.forEach((m) => {
        if (m && m.id) map.set(m.id, m);
        if ((m as any).name) map.set((m as any).name, m);
      });
      
      setSavedFlexMessages(map);
      console.log('📦 載入 Flex Messages:', map.size);
    } catch (err) {
      console.error('❌ 載入 Flex Messages 失敗:', err);
    }
  }, []);

  // 轉換 Flex 積木為 Flex Message
  const convertFlexBlocksToFlexMessage = useCallback((blocks: Block[]) => {
    const headerBlocks: Record<string, unknown>[] = [];
    const bodyBlocks: Record<string, unknown>[] = [];
    const footerBlocks: Record<string, unknown>[] = [];

    blocks.forEach(block => {
      let targetArray = bodyBlocks;

      if (block.blockData.area === 'header') {
        targetArray = headerBlocks;
      } else if (block.blockData.area === 'footer') {
        targetArray = footerBlocks;
      }

      if (block.blockType === 'flex-content') {
        switch (block.blockData.contentType) {
          case 'text':
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
          case 'image':
            targetArray.push({
              type: 'image',
              url: block.blockData.url || 'https://via.placeholder.com/300x200',
              aspectRatio: block.blockData.aspectRatio || '20:13',
              aspectMode: block.blockData.aspectMode || 'cover',
              size: block.blockData.size || 'full'
            });
            break;
          case 'button':
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
          case 'separator':
            targetArray.push({
              type: 'separator',
              margin: block.blockData.margin || 'md',
              color: block.blockData.color || '#E0E0E0'
            });
            break;
        }
      }
    });

    const bubble: Record<string, unknown> = {
      type: 'bubble'
    };

    if (headerBlocks.length > 0) {
      bubble.header = {
        type: 'box',
        layout: 'vertical',
        contents: headerBlocks
      };
    }

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

    if (footerBlocks.length > 0) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: footerBlocks
      };
    }

    return {
      type: 'flex',
      contents: bubble
    };
  }, []);

  // 增強的 Bot 模擬器
  const enhancedBotSimulator = useCallback(async (userMessage: string): Promise<Message> => {
    setIsProcessing(true);
    const startTime = performance.now();
    const newDebugInfo: string[] = [];

    try {
      newDebugInfo.push(`🔍 開始處理訊息: "${userMessage}"`);

      // 建立執行上下文
      const context: ExecutionContext = {
        variables: new Map(),
        userMessage,
        userId: 'simulator_user',
        sessionId: `sim_${Date.now()}`,
        executionStack: [],
        loopCounters: new Map(),
        maxExecutionSteps: 100,
        currentStep: 0
      };

      // 使用增強事件匹配
      const matchResult = eventMatcher.match(userMessage, {
        userMessage,
        timestamp: Date.now()
      });

      newDebugInfo.push(`🎯 事件匹配結果: ${matchResult.matched ? '成功' : '失敗'}`);
      if (matchResult.matched) {
        newDebugInfo.push(`   匹配模式: [${matchResult.matchedPatterns.join(', ')}]`);
        newDebugInfo.push(`   信心度: ${(matchResult.confidence * 100).toFixed(1)}%`);
      }

      // 找到匹配的事件積木
      let matchedEventBlock: Block | null = null;
      
      if (matchResult.matched) {
        for (const patternId of matchResult.matchedPatterns) {
          const blockId = eventMatcher['patterns'].get(patternId)?.metadata?.blockId;
          if (blockId) {
            matchedEventBlock = blocks.find(b => b.id === blockId) || null;
            if (matchedEventBlock) {
              newDebugInfo.push(`✅ 找到匹配積木: ${matchedEventBlock.id}`);
              break;
            }
          }
        }
      }

      // 如果沒有找到匹配的事件，嘗試找無條件事件
      if (!matchedEventBlock) {
        const eventBlocks = blocks.filter(b => 
          b.blockType === 'event' && 
          b.blockData.eventType === 'message.text' &&
          !b.blockData.condition
        );
        
        if (eventBlocks.length > 0) {
          matchedEventBlock = eventBlocks[0];
          newDebugInfo.push(`🔄 使用預設事件積木: ${matchedEventBlock.id || '未知'}`);
        }
      }

      if (!matchedEventBlock) {
        newDebugInfo.push('❌ 未找到匹配的事件積木');
        return {
          type: 'bot',
          content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。',
          messageType: 'text',
          timestamp: Date.now(),
          executionInfo: {
            matchedPatterns: [],
            executionPath: [],
            processingTime: performance.now() - startTime
          }
        };
      }

      // 使用連接管理器找到下一個積木
      const nextBlockIds = connectionManager.getNextBlocks(matchedEventBlock.id!, context);
      newDebugInfo.push(`🔗 下一個積木: [${nextBlockIds.join(', ')}]`);

      if (nextBlockIds.length === 0) {
        newDebugInfo.push('⚠️ 沒有連接的積木');
        return {
          type: 'bot',
          content: '事件已觸發，但沒有設定回應動作。',
          messageType: 'text',
          timestamp: Date.now(),
          executionInfo: {
            matchedPatterns: matchResult.matchedPatterns,
            executionPath: [matchedEventBlock.id || ''],
            processingTime: performance.now() - startTime
          }
        };
      }

      // 執行第一個連接的積木
      const firstNextBlockId = nextBlockIds[0];
      const nextBlock = blocks.find(b => b.id === firstNextBlockId);
      
      if (!nextBlock) {
        newDebugInfo.push(`❌ 找不到積木: ${firstNextBlockId}`);
        return {
          type: 'bot',
          content: '積木執行錯誤：找不到目標積木。',
          messageType: 'text',
          timestamp: Date.now(),
          executionInfo: {
            matchedPatterns: matchResult.matchedPatterns,
            executionPath: [matchedEventBlock.id || ''],
            processingTime: performance.now() - startTime
          }
        };
      }

      newDebugInfo.push(`🔄 執行積木: ${nextBlock.id} (${nextBlock.blockType})`);

      // 根據積木類型執行相應邏輯
      let botResponse: Message;

      if (nextBlock.blockType === 'reply') {
        botResponse = await handleReplyBlock(nextBlock, context, newDebugInfo);
      } else if (nextBlock.blockType === 'control') {
        botResponse = await handleControlBlock(nextBlock, context, newDebugInfo);
      } else {
        newDebugInfo.push(`⚠️ 未知的積木類型: ${nextBlock.blockType}`);
        botResponse = {
          type: 'bot',
          content: `不支援的積木類型: ${nextBlock.blockType}`,
          messageType: 'text',
          timestamp: Date.now()
        };
      }

      // 添加執行資訊
      botResponse.executionInfo = {
        matchedPatterns: matchResult.matchedPatterns,
        executionPath: [matchedEventBlock.id || '', nextBlock.id || ''],
        processingTime: performance.now() - startTime
      };

      return botResponse;

    } catch (error) {
      console.error('❌ 模擬器執行錯誤:', error);
      newDebugInfo.push(`❌ 執行錯誤: ${error}`);
      
      return {
        type: 'bot',
        content: '抱歉，處理您的訊息時發生了錯誤。',
        messageType: 'text',
        timestamp: Date.now(),
        executionInfo: {
          matchedPatterns: [],
          executionPath: [],
          processingTime: performance.now() - startTime
        }
      };
    } finally {
      setIsProcessing(false);
      if (showDebugInfo) {
        setDebugInfo(prev => [...prev, ...newDebugInfo, '---']);
      }
    }
  }, [blocks, eventMatcher, connectionManager, showDebugInfo]);

  // 處理回覆積木
  const handleReplyBlock = async (
    block: Block, 
    context: ExecutionContext, 
    debugInfo: string[]
  ): Promise<Message> => {
    const replyType = block.blockData.replyType as string;
    
    debugInfo.push(`💬 處理回覆積木: ${replyType}`);

    switch (replyType) {
      case 'text':
        const content = block.blockData.content as string || '空的回覆內容';
        debugInfo.push(`📝 文字回覆: "${content}"`);
        return {
          type: 'bot',
          content,
          messageType: 'text',
          timestamp: Date.now()
        };

      case 'flex':
        debugInfo.push('🎨 處理 Flex 回覆');
        
        // 優先使用當前 Flex 設計器內容
        if (flexBlocks && flexBlocks.length > 0) {
          const currentFlexMessage = convertFlexBlocksToFlexMessage(flexBlocks);
          debugInfo.push(`✅ 使用當前 Flex 設計 (${flexBlocks.length} 個組件)`);
          return {
            type: 'bot',
            content: 'Flex 訊息',
            messageType: 'flex',
            flexMessage: currentFlexMessage,
            timestamp: Date.now()
          };
        }

        // 使用儲存的 Flex Message
        const storedKey = block.blockData.flexMessageName || block.blockData.flexMessageId;
        const stored = storedKey ? savedFlexMessages.get(storedKey as string) : undefined;
        
        if (stored) {
          debugInfo.push(`📦 使用儲存的 Flex: ${stored.name}`);
          // 這裡需要實現 convertStoredFlexMessage 函數
          return {
            type: 'bot',
            content: stored.name || 'Flex 訊息',
            messageType: 'flex',
            flexMessage: { type: 'flex', contents: stored.content },
            timestamp: Date.now()
          };
        }

        debugInfo.push('⚠️ 沒有可用的 Flex 內容');
        return {
          type: 'bot',
          content: '請在 Flex 設計器中設計 Flex 訊息內容',
          messageType: 'text',
          timestamp: Date.now()
        };

      default:
        debugInfo.push(`⚠️ 不支援的回覆類型: ${replyType}`);
        return {
          type: 'bot',
          content: `不支援的回覆類型: ${replyType}`,
          messageType: 'text',
          timestamp: Date.now()
        };
    }
  };

  // 處理控制積木
  const handleControlBlock = async (
    block: Block, 
    context: ExecutionContext, 
    debugInfo: string[]
  ): Promise<Message> => {
    const controlType = block.blockData.controlType as string;
    
    debugInfo.push(`🎛️ 處理控制積木: ${controlType}`);

    try {
      let result;
      
      switch (controlType) {
        case 'if':
        case 'if_then':
          result = controlFlowProcessor.processIfBlock(block as UnifiedBlock, context);
          break;
        case 'wait':
          result = await controlFlowProcessor.processWaitBlock(block as UnifiedBlock, context);
          break;
        default:
          debugInfo.push(`⚠️ 不支援的控制類型: ${controlType}`);
          return {
            type: 'bot',
            content: `不支援的控制類型: ${controlType}`,
            messageType: 'text',
            timestamp: Date.now()
          };
      }

      if (result.success) {
        debugInfo.push(`✅ 控制積木執行成功`);
        
        // 如果有下一個積木，繼續執行
        if (result.nextBlocks.length > 0) {
          const nextBlock = blocks.find(b => b.id === result.nextBlocks[0]);
          if (nextBlock) {
            return await handleReplyBlock(nextBlock, result.context, debugInfo);
          }
        }
        
        return {
          type: 'bot',
          content: `控制流程執行完成`,
          messageType: 'text',
          timestamp: Date.now()
        };
      } else {
        debugInfo.push(`❌ 控制積木執行失敗: ${result.error?.message}`);
        return {
          type: 'bot',
          content: `控制流程執行錯誤: ${result.error?.message}`,
          messageType: 'text',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      debugInfo.push(`❌ 控制積木異常: ${error}`);
      return {
        type: 'bot',
        content: `控制積木執行異常`,
        messageType: 'text',
        timestamp: Date.now()
      };
    }
  };

  // 處理測試動作
  const handleTestAction = useCallback((action: 'new-user' | 'test-message' | 'preview-dialog') => {
    switch (action) {
      case 'new-user':
        setChatMessages([
          {
            type: 'bot',
            content: '🎉 歡迎新用戶！我是您的智能助手。',
            messageType: 'text',
            timestamp: Date.now()
          }
        ]);
        break;
      case 'test-message':
        const testMessages = ['你好', 'hello', '幫助', '功能', '測試'];
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        simulateUserMessage(randomMessage);
        break;
      case 'preview-dialog':
        setChatMessages([
          { type: 'bot', content: '歡迎使用 LINE Bot！', messageType: 'text', timestamp: Date.now() },
          { type: 'user', content: '你好', messageType: 'text', timestamp: Date.now() + 1 },
          { type: 'bot', content: '您好！我可以為您做什麼嗎？', messageType: 'text', timestamp: Date.now() + 2 },
          { type: 'user', content: '幫助', messageType: 'text', timestamp: Date.now() + 3 },
          { type: 'bot', content: '這裡是幫助訊息...', messageType: 'text', timestamp: Date.now() + 4 }
        ]);
        break;
    }
  }, []);

  // 模擬用戶發送訊息
  const simulateUserMessage = useCallback(async (message: string) => {
    const userMsg: Message = { 
      type: 'user', 
      content: message, 
      messageType: 'text',
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);

    const botResponse = await enhancedBotSimulator(message);
    setChatMessages(prev => [...prev, botResponse]);
  }, [enhancedBotSimulator]);

  // 處理來自父組件的測試動作
  useEffect(() => {
    if (testAction) {
      handleTestAction(testAction);
    }
  }, [testAction, handleTestAction]);

  // 發送訊息
  const sendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const text = inputMessage.trim();
    setInputMessage('');
    
    await simulateUserMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) sendMessage();
  };

  return (
    <div className="h-full flex flex-col bg-white rounded border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t">
        <div className="flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          <div className="font-medium">增強版 LINE Bot 模擬器</div>
        </div>
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
          {showDebugInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugInfo([])}
              className="text-white hover:bg-white/10"
            >
              清除調試
            </Button>
          )}
        </div>
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
              <div className="flex items-start space-x-2 max-w-4xl">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  {m.messageType === 'flex' && m.flexMessage ? (
                    <div className="bg-white border rounded p-2 max-w-xl">
                      <FlexMessagePreview json={m.flexMessage as any} />
                    </div>
                  ) : (
                    <div className="bg-white border rounded px-3 py-2 text-sm">{m.content}</div>
                  )}
                  
                  {/* 執行資訊 */}
                  {showDebugInfo && m.executionInfo && (
                    <div className="mt-1 text-xs text-gray-500 bg-gray-100 rounded p-2">
                      <div>匹配模式: {m.executionInfo.matchedPatterns.join(', ') || '無'}</div>
                      <div>執行路徑: {m.executionInfo.executionPath.join(' → ') || '無'}</div>
                      <div>處理時間: {m.executionInfo.processingTime.toFixed(2)}ms</div>
                    </div>
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
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* 處理中指示 */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-gray-200 rounded px-3 py-2 text-sm">
                正在處理中...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 調試資訊區域 */}
      {showDebugInfo && debugInfo.length > 0 && (
        <div className="border-t bg-gray-50 p-2 max-h-32 overflow-y-auto">
          <div className="text-xs font-mono space-y-1">
            {debugInfo.map((info, i) => (
              <div key={i} className="text-gray-600">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* 輸入區域 */}
      <div className="p-3 bg-white border-t flex items-center space-x-2 rounded-b">
        <Input
          placeholder="輸入訊息測試您的 Bot..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          className="flex-1"
        />
        <Button 
          onClick={sendMessage} 
          disabled={!inputMessage.trim() || isProcessing}
          size="sm"
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          {isProcessing ? '處理中' : '送出'}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedLineBotSimulator;