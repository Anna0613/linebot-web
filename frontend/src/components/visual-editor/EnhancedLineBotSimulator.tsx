import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EnhancedEventMatcher, MatchType } from '../../utils/EventMatchingSystem';
import { BlockConnectionManager } from '../../utils/BlockConnectionManager';
import { ExecutionContext } from '../../types/blockConnection';
import FlexMessagePreview from '../Panels/FlexMessagePreview';

// 本地類型定義（臨時解決方案）
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
  contents?: unknown;
}

type FlexBubble = {
  type: 'bubble';
  body?: { type: 'box'; layout: string; contents: unknown[] };
};

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

interface SavedFlexMessage {
  name: string;
  content: FlexMessage;
}

interface EnhancedLineBotSimulatorProps {
  blocks?: Block[];
  savedFlexMessages?: Map<string, SavedFlexMessage>;
  flexBlocks?: Block[];
  convertFlexBlocksToFlexMessage?: (blocks: Block[]) => FlexMessage;
  testAction?: 'new-user' | 'test-message' | 'preview-dialog' | null;
  showDebugInfo?: boolean;
}

const EnhancedLineBotSimulator: React.FC<EnhancedLineBotSimulatorProps> = ({
  blocks = [],
  savedFlexMessages = new Map(),
  flexBlocks = [],
  convertFlexBlocksToFlexMessage = () => ({ type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } }),
  testAction,
  showDebugInfo = false
}) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // 初始化系統
  const eventMatcher = useMemo(() => new EnhancedEventMatcher(), []);
  const connectionManager = useMemo(() => new BlockConnectionManager(), []);

  // 已移除未使用的內部 Flex 轉換函數

  // 處理回覆積木
  const handleReplyBlock = useCallback(async (
    block: Block,
    _context: ExecutionContext,
    debugInfo: string[]
  ): Promise<Message> => {
    const replyType = block.blockData.replyType as string;
    
    debugInfo.push(`💬 處理回覆積木: ${replyType}`);

    switch (replyType) {
      case 'text': {
        const content = (block.blockData.content || block.blockData.text) as string || '空的回覆內容';
        debugInfo.push(`📝 文字回覆: "${content}"`);
        return {
          type: 'bot',
          content,
          messageType: 'text',
          timestamp: Date.now()
        };
      }

      case 'flex': {
        debugInfo.push('🎨 處理 Flex 回覆');
        debugInfo.push(`📋 積木資料: ${JSON.stringify({
          content: block.blockData.content,
          text: block.blockData.text,
          flexMessageName: block.blockData.flexMessageName,
          flexMessageId: block.blockData.flexMessageId
        })}`);

        // 檢查是否指定了特定的 Flex Message 模板
        const storedKey = block.blockData.flexMessageName || block.blockData.flexMessageId;
        const stored = storedKey ? savedFlexMessages.get(storedKey as string) : undefined;

        debugInfo.push(`🔍 當前 flexBlocks 狀態: ${flexBlocks ? flexBlocks.length : 0} 個積木`);
        if (flexBlocks && flexBlocks.length > 0) {
          debugInfo.push(`🔍 flexBlocks 詳情: ${JSON.stringify(flexBlocks.map(b => ({ blockType: b.blockType, contentType: b.blockData?.contentType })))}`);
        }

        // 如果指定了 Flex Message 模板，優先使用指定的模板
        if (stored) {
          debugInfo.push(`📦 使用指定的 Flex 模板: ${stored.name}`);
        } else if (flexBlocks && flexBlocks.length > 0) {
          // 如果沒有指定模板，則使用當前 Flex 設計器內容
          debugInfo.push(`🔍 Flex 積木詳情: ${JSON.stringify(flexBlocks.map(b => ({ blockType: b.blockType, contentType: b.blockData?.contentType })))}`);
          const currentBubble = convertFlexBlocksToFlexMessage(flexBlocks);
          debugInfo.push(`🔍 轉換後的 bubble: ${JSON.stringify(currentBubble).substring(0, 200)}...`);

          // 檢查 bubble 是否有內容
          const bubbleData = currentBubble as FlexBubble;
          if (bubbleData && bubbleData.body && bubbleData.body.contents && bubbleData.body.contents.length > 0) {
            // convertFlexBlocksToFlexMessage 返回的是 bubble 結構，需要包裝成完整的 Flex Message
            const currentFlexMessage = {
              type: 'flex',
              altText: 'Flex 訊息',
              contents: bubbleData
            };
            debugInfo.push(`✅ 使用當前 Flex 設計 (${flexBlocks.length} 個組件，${bubbleData.body.contents.length} 個內容)`);
            return {
              type: 'bot',
              content: 'Flex 訊息',
              messageType: 'flex',
              flexMessage: currentFlexMessage,
              timestamp: Date.now()
            };
          } else {
            debugInfo.push(`⚠️ Flex 積木轉換後沒有內容`);
          }
        }

        // 處理儲存的 Flex Message
        
        if (stored) {
          debugInfo.push(`📦 使用儲存的 Flex: ${stored.name}`);
          debugInfo.push(`📄 Flex 內容結構: ${JSON.stringify(stored.content).substring(0, 200)}...`);
          
          // 檢查儲存的 Flex 結構
          let flexMessage: FlexMessage;
          debugInfo.push(`🔍 儲存內容類型: ${typeof stored.content}`);

          let parsedContent = stored.content;

          // 如果是字串，嘗試解析為 JSON
          if (typeof stored.content === 'string') {
            try {
              parsedContent = JSON.parse(stored.content);
              debugInfo.push(`🔄 成功解析 JSON 字串`);
            } catch (e) {
              debugInfo.push(`❌ JSON 解析失敗: ${e.message}`);
              parsedContent = null;
            }
          }

          if (Array.isArray(parsedContent)) {
            debugInfo.push(`📦 內容是陣列，長度: ${parsedContent.length}`);
            if (parsedContent.length > 0) {
              flexMessage = parsedContent[0];
              debugInfo.push(`✅ 使用陣列第一個元素作為 Flex Message`);
            }
          } else if (parsedContent && typeof parsedContent === 'object') {
            // 檢查是否是我們系統的積木格式
            if (parsedContent.blocks && Array.isArray(parsedContent.blocks)) {
              debugInfo.push(`🔧 轉換系統積木格式到 LINE Flex Message (${parsedContent.blocks.length} 個積木)`);
              try {
                const flexBlocks = parsedContent.blocks as Block[];
                const convertedBubble = convertFlexBlocksToFlexMessage(flexBlocks);
                // convertFlexBlocksToFlexMessage 返回的是 bubble 結構，需要包裝成完整的 Flex Message
                flexMessage = {
                  type: 'flex',
                  altText: stored.name || 'Flex 訊息',
                  contents: convertedBubble
                };
                debugInfo.push(`✅ 成功轉換 ${flexBlocks.length} 個 Flex 積木`);
              } catch (error) {
                debugInfo.push(`❌ 積木轉換失敗: ${error}`);
                flexMessage = null;
              }
            } else {
              // 檢查是否是 bubble 或 carousel 結構，需要包裝成完整的 Flex Message
              if (parsedContent.type === 'bubble' || parsedContent.type === 'carousel') {
                flexMessage = {
                  type: 'flex',
                  altText: stored.name || 'Flex 訊息',
                  contents: parsedContent
                };
                debugInfo.push(`✅ 包裝 ${parsedContent.type} 結構為完整的 Flex Message`);
              } else if (parsedContent.type === 'flex') {
                flexMessage = parsedContent;
                debugInfo.push(`✅ 直接使用完整的 Flex Message`);
              } else {
                // 其他格式，嘗試作為 bubble 內容處理
                flexMessage = {
                  type: 'flex',
                  altText: stored.name || 'Flex 訊息',
                  contents: {
                    type: 'bubble',
                    body: {
                      type: 'box',
                      layout: 'vertical',
                      contents: [
                        {
                          type: 'text',
                          text: JSON.stringify(parsedContent)
                        }
                      ]
                    }
                  }
                };
                debugInfo.push(`⚠️ 未知格式，包裝為文字內容`);
              }
            }
          }
          
          if (flexMessage) {
            return {
              type: 'bot',
              content: stored.name || 'Flex 訊息',
              messageType: 'flex',
              flexMessage,
              timestamp: Date.now()
            };
          }
        }

        // 預設 Flex 回覆
        debugInfo.push('⚠️ 無可用的 Flex 內容，使用預設 Flex 回覆');
        return {
          type: 'bot',
          content: 'Flex 訊息',
          messageType: 'flex',
          flexMessage: {
            type: 'flex',
            altText: 'Flex 訊息',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                  type: 'text',
                  text: '請在 Flex 設計器中添加內容來設計 Flex 訊息',
                  color: '#999999',
                  align: 'center',
                  wrap: true
                }]
              }
            }
          },
          timestamp: Date.now()
        };
      }

      case 'image': {
        const imageUrl = block.blockData.imageUrl as string || 'https://via.placeholder.com/300x200';
        debugInfo.push(`🖼️ 圖片回覆: ${imageUrl}`);
        return {
          type: 'bot',
          content: imageUrl,
          messageType: 'image',
          timestamp: Date.now()
        };
      }

      case 'sticker': {
        const stickerId = block.blockData.stickerId as string || '1';
        debugInfo.push(`😊 貼圖回覆: ${stickerId}`);
        return {
          type: 'bot',
          content: `貼圖 ${stickerId}`,
          messageType: 'sticker',
          timestamp: Date.now()
        };
      }

      default:
        debugInfo.push(`⚠️ 未知的回覆類型: ${replyType}`);
        return {
          type: 'bot',
          content: '未知的回覆類型',
          messageType: 'text',
          timestamp: Date.now()
        };
    }
  }, [flexBlocks, savedFlexMessages, convertFlexBlocksToFlexMessage]);

  // 處理控制積木
  const handleControlBlock = useCallback(async (
    block: Block,
    _context: ExecutionContext,
    debugInfo: string[]
  ): Promise<Message> => {
    const controlType = block.blockData.controlType as string;
    
    debugInfo.push(`🎛️ 處理控制積木: ${controlType}`);

    switch (controlType) {
      case 'condition': {
        const condition = block.blockData.condition as string;
        const conditionResult = Math.random() > 0.5; // 簡化的條件判斷
        debugInfo.push(`🎯 條件判斷: ${condition} → ${conditionResult ? '成立' : '不成立'}`);
        
        return {
          type: 'bot',
          content: `條件判斷結果: ${conditionResult ? '條件成立' : '條件不成立'}`,
          messageType: 'text',
          timestamp: Date.now()
        };
      }

      case 'delay': {
        const delayTime = (block.blockData.delay as number) || 1000;
        debugInfo.push(`⏰ 延遲 ${delayTime}ms`);
        
        return {
          type: 'bot',
          content: `延遲 ${delayTime}ms 後執行`,
          messageType: 'text',
          timestamp: Date.now()
        };
      }

      default:
        debugInfo.push(`⚠️ 未知的控制類型: ${controlType}`);
        return {
          type: 'bot',
          content: '未知的控制類型',
          messageType: 'text',
          timestamp: Date.now()
        };
    }
  }, []);

  // 增強的 Bot 模擬器
  const enhancedBotSimulator = useCallback(async (userMessage: string): Promise<Message[]> => {
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
        timestamp: Date.now(),
        userId: context.userId,
        sessionId: context.sessionId,
        previousMessages: [],
        userProfile: {},
        customData: {}
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
          const pattern = eventMatcher.getPatternById(patternId);
          const blockId = pattern?.metadata?.blockId;
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
          !b.blockData.condition && 
          !b.blockData.pattern
        );
        
        if (eventBlocks.length > 0) {
          matchedEventBlock = eventBlocks[0];
          newDebugInfo.push(`🔄 使用預設事件積木: ${matchedEventBlock.id || '未知'}`);
        }
      }

      if (!matchedEventBlock) {
        newDebugInfo.push('❌ 未找到匹配的事件積木');
        return [{
          type: 'bot',
          content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。',
          messageType: 'text',
          timestamp: Date.now(),
          executionInfo: {
            matchedPatterns: [],
            executionPath: [],
            processingTime: performance.now() - startTime
          }
        }];
      }

      // 從事件積木開始，依序執行多個積木（最多 10 步）
      const results: Message[] = [];
      const eventIndex = blocks.findIndex(b => b.id === matchedEventBlock.id);
      let currentIndex = eventIndex + 1;
      let steps = 0;
      while (currentIndex < blocks.length && steps < 10) {
        const connections = connectionManager.getOutgoingConnections(blocks[currentIndex - 1]?.id || '');
        newDebugInfo.push(`🔍 查找連接: ${blocks[currentIndex - 1]?.id} -> ${connections.length} 個連接`);

        let currentBlock: Block | undefined;
        if (connections.length > 0) {
          const connection = connections[0];
          currentBlock = blocks.find(block => block.id === connection.targetBlockId);
          // 若找不到，退回順序
          if (!currentBlock) currentBlock = blocks[currentIndex];
        } else {
          currentBlock = blocks[currentIndex];
        }

        if (!currentBlock) break;
        if (currentBlock.blockType === 'event') break;

        newDebugInfo.push(`🔄 執行積木: ${currentBlock.id} (${currentBlock.blockType})`);

        if (currentBlock.blockType === 'reply') {
          const msg = await handleReplyBlock(currentBlock, context, newDebugInfo);
          msg.executionInfo = {
            matchedPatterns: matchResult.matched ? matchResult.matchedPatterns : [],
            executionPath: [matchedEventBlock.id || '', currentBlock.id || ''],
            processingTime: performance.now() - startTime
          };
          results.push(msg);
        } else if (currentBlock.blockType === 'control') {
          // 控制積木也以文字訊息顯示在模擬器中，方便觀察流程
          const ctrl = await handleControlBlock(currentBlock, context, newDebugInfo);
          ctrl.executionInfo = {
            matchedPatterns: matchResult.matched ? matchResult.matchedPatterns : [],
            executionPath: [matchedEventBlock.id || '', currentBlock.id || ''],
            processingTime: performance.now() - startTime
          };
          results.push(ctrl);
        } else {
          newDebugInfo.push(`⚠️ 未知的積木類型: ${currentBlock.blockType}`);
          results.push({
            type: 'bot',
            content: `不支援的積木類型: ${currentBlock.blockType}`,
            messageType: 'text',
            timestamp: Date.now()
          });
        }

        steps += 1;
        // 若有連接，下一步會由連接決定；否則按順序往下
        if (connections.length > 0) {
          const nextId = connections[0].targetBlockId;
          const nextIndex = blocks.findIndex(b => b.id === nextId);
          currentIndex = nextIndex > -1 ? nextIndex : currentIndex + 1;
        } else {
          currentIndex += 1;
        }
      }

      if (results.length === 0) {
        return [{
          type: 'bot',
          content: '我還不知道如何回應這個訊息。請檢查您的 Bot 邏輯設定。',
          messageType: 'text',
          timestamp: Date.now(),
          executionInfo: {
            matchedPatterns: matchResult.matched ? matchResult.matchedPatterns : [],
            executionPath: [matchedEventBlock.id || ''],
            processingTime: performance.now() - startTime
          }
        }];
      }

      return results;

    } catch (error) {
      console.error('❌ 模擬器執行錯誤:', error);
      newDebugInfo.push(`❌ 執行錯誤: ${error}`);
      
      return [{
        type: 'bot',
        content: '抱歉，處理您的訊息時發生了錯誤。',
        messageType: 'text',
        timestamp: Date.now(),
        executionInfo: {
          matchedPatterns: [],
          executionPath: [],
          processingTime: performance.now() - startTime
        }
      }];
    } finally {
      setIsProcessing(false);
      if (showDebugInfo) {
        setDebugInfo(prev => [...prev, ...newDebugInfo, '---']);
      }
    }
  }, [blocks, eventMatcher, connectionManager, showDebugInfo, handleReplyBlock, handleControlBlock]);

  // 模擬用戶發送訊息
  const simulateUserMessage = useCallback(async (message: string) => {
    const userMsg: Message = { 
      type: 'user', 
      content: message, 
      messageType: 'text',
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);

    const botResponses = await enhancedBotSimulator(message);
    setChatMessages(prev => [...prev, ...botResponses]);
  }, [enhancedBotSimulator]);

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
      case 'test-message': {
        const testMessages = ['你好', 'hello', '幫助', '功能', '測試'];
        const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
        simulateUserMessage(randomMessage);
        break;
      }
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
  }, [simulateUserMessage]);

  // 處理來自父組件的測試動作
  useEffect(() => {
    if (testAction) {
      handleTestAction(testAction);
    }
  }, [testAction, handleTestAction]);

  // 註冊事件積木的匹配模式
  useEffect(() => {
    console.log('🔄 重新註冊事件模式，積木數量:', blocks?.length || 0);
    
    // 先獲取現有模式並清除
    const stats = eventMatcher.getMatchingStats();
    console.log('🔍 清除前的模式統計:', stats);
    
    // 移除所有現有模式（使用已知的模式名稱格式）
    for (let i = 0; i < 100; i++) {  // 假設最多不會超過100個積木
      eventMatcher.removePattern(`event_block-${i}`);
      eventMatcher.removePattern(`event_${i}`);
    }
    
    if (blocks && blocks.length > 0) {
      console.log('🔍 所有積木資料:', blocks.map(b => ({ 
        id: b.id, 
        type: b.blockType, 
        data: b.blockData 
      })));
      
      blocks.forEach(block => {
        console.log(`🧩 檢查積木 ${block.id} (${block.blockType}):`, {
          blockData: block.blockData,
          hasEventType: 'eventType' in (block.blockData || {}),
          hasContent: 'content' in (block.blockData || {}),
          hasText: 'text' in (block.blockData || {}),
          hasTrigger: 'trigger' in (block.blockData || {})
        });
        
        if (block.blockType === 'event') {
          const eventType = block.blockData?.eventType as string;
          const trigger = (block.blockData?.trigger || block.blockData?.pattern || block.blockData?.content || block.blockData?.text) as string;
          
          console.log(`📝 事件積木 ${block.id}:`, { 
            eventType, 
            trigger, 
            originalData: block.blockData 
          });
          
          if (trigger) {
            // 根據事件類型決定匹配模式
            let matchType = MatchType.CONTAINS; // 預設使用包含匹配
            
            if (eventType === 'text_exact') {
              matchType = MatchType.EXACT;
            } else if (eventType === 'text_starts') {
              matchType = MatchType.STARTS_WITH;
            } else if (eventType === 'text_contains') {
              matchType = MatchType.CONTAINS;
            }
            
            // 創建事件模式
            const eventPattern = {
              id: `event_${block.id}`,
              type: matchType,
              pattern: trigger,
              caseSensitive: false,
              weight: 1.0,
              enabled: true,
              metadata: {
                blockId: block.id,
                eventType,
                originalTrigger: trigger
              }
            };
            
            console.log('➕ 註冊事件模式:', eventPattern);
            eventMatcher.addPattern(eventPattern);
          } else {
            console.log(`⚠️ 事件積木 ${block.id} 缺少觸發條件`);
          }
        }
      });
      
      // 顯示註冊統計
      const stats = eventMatcher.getMatchingStats();
      console.log('📊 事件匹配統計:', stats);
    }
  }, [blocks, eventMatcher]);

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
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <span className="font-medium">LINE Bot 模擬器</span>
        </div>
        <div className="text-sm opacity-80">
          增強版 | {blocks.length} 個積木
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto max-h-96 bg-gray-50">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="mb-2">🤖</div>
            <div>開始對話吧！</div>
            <div className="text-xs mt-1">輸入訊息來測試您的 Bot 邏輯</div>
          </div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.messageType === 'flex' && message.flexMessage ? (
                  <div className="max-w-xl">
                    <FlexMessagePreview json={message.flexMessage} />
                  </div>
                ) : (
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                      {message.messageType === 'image' ? (
                        <div className="text-sm">
                          <div className="mb-1">📷 圖片訊息</div>
                          <div className="text-xs opacity-70">{message.content}</div>
                        </div>
                      ) : (
                        <div className="text-sm">{message.content}</div>
                      )}

                      {message.executionInfo && showDebugInfo && (
                        <div className="text-xs mt-2 pt-2 border-t border-gray-300 opacity-70">
                          <div>處理時間: {message.executionInfo.processingTime.toFixed(1)}ms</div>
                          {message.executionInfo.matchedPatterns && message.executionInfo.matchedPatterns.length > 0 && (
                            <div>匹配: {message.executionInfo.matchedPatterns.join(', ')}</div>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug Info */}
      {showDebugInfo && debugInfo.length > 0 && (
        <div className="border-t border-gray-200 p-4 max-h-32 overflow-y-auto bg-gray-100">
          <div className="text-xs font-mono text-gray-600">
            <div className="font-bold mb-2">除錯資訊:</div>
            {debugInfo.map((info, index) => (
              <div key={index} className="mb-1">{info}</div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入訊息..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            disabled={isProcessing}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isProcessing}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            發送
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLineBotSimulator;
