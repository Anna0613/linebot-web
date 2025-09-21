import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DropZone from './DropZone';
import CodePreview from './CodePreview';
import LineBotSimulator from './LineBotSimulator';
import FlexMessagePreview from './FlexMessagePreview';
import { BlockPalette } from './BlockPalette';
import LogicTemplateSelector from './LogicTemplateSelector';
import FlexMessageSelector from './FlexMessageSelector';
// 已移除舊的預覽控制台（PreviewControlPanel）與增強模擬器（EnhancedLineBotSimulator）在 AI 知識庫頁面
import CodeControlPanel from './CodeControlPanel';
import AIKnowledgeBaseManager from '../ai/AIKnowledgeBaseManager';
import { CodeDisplayProvider } from './CodeDisplayContext';
import { 
  UnifiedBlock, 
  UnifiedDropItem, 
  WorkspaceContext 
} from '../../types/block';
import { validateWorkspace } from '../../utils/blockCompatibility';
import { useToast } from '../../hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import VisualEditorApi, { FlexMessage as StoredFlexMessage } from '../../services/visualEditorApi';

// 簡化的 Flex Message 生成器
class FlexMessageGenerator {
  generateFlexMessage(blocks: Block[]): Record<string, unknown> {
    const bubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: []
      }
    };

    // 處理所有積木
    blocks.forEach(block => {
      if (block.blockType === 'flex-container') {
        // 處理容器積木
        switch (block.blockData.containerType) {
          case 'bubble':
            // Bubble 容器已經是預設結構，不需要額外處理
            break;
          case 'box':
            // 如果是 box 容器，可以調整 layout
            if (block.blockData.layout) {
              bubble.body.layout = block.blockData.layout as string;
            }
            break;
        }
      } else if (block.blockType === 'flex-content') {
        // 處理內容積木
        switch (block.blockData.contentType) {
          case 'text':
            bubble.body.contents.push({
              type: "text",
              text: block.blockData.text || "示例文字",
              size: block.blockData.size || "md",
              weight: block.blockData.weight || "regular",
              color: block.blockData.color || "#000000"
            });
            break;
          case 'image':
            bubble.body.contents.push({
              type: "image",
              url: block.blockData.url || "https://via.placeholder.com/300x200",
              aspectMode: "cover",
              aspectRatio: "20:13"
            });
            break;
          case 'button':
            bubble.body.contents.push({
              type: "button",
              action: {
                type: "message",
                label: block.blockData.text || "按鈕",
                text: block.blockData.text || "按鈕被點擊"
              }
            });
            break;
          case 'separator':
            bubble.body.contents.push({
              type: "separator",
              margin: "md"
            });
            break;
        }
      }
    });

    // 如果沒有內容，添加一個預設文字
    if (bubble.body.contents.length === 0) {
      bubble.body.contents.push({
        type: "text",
        text: "Flex 訊息內容",
        color: "#666666",
        align: "center"
      });
    }

    return bubble;
  }
}

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface WorkspaceProps {
  logicBlocks: UnifiedBlock[];
  flexBlocks: UnifiedBlock[];
  onLogicBlocksChange: (blocks: UnifiedBlock[] | ((prev: UnifiedBlock[]) => UnifiedBlock[])) => void;
  onFlexBlocksChange: (blocks: UnifiedBlock[] | ((prev: UnifiedBlock[]) => UnifiedBlock[])) => void;
  currentLogicTemplateName?: string;
  currentFlexMessageName?: string;
  // 新增邏輯模板相關 props
  selectedBotId?: string;
  selectedLogicTemplateId?: string;
  onLogicTemplateSelect?: (templateId: string) => void;
  onLogicTemplateCreate?: (name: string) => void;
  onLogicTemplateSave?: (templateId: string, data: { logicBlocks: Block[], generatedCode: string }) => void;
  // 新增 FlexMessage 相關 props
  selectedFlexMessageId?: string;
  onFlexMessageSelect?: (messageId: string) => void;
  onFlexMessageCreate?: (name: string) => void;
  onFlexMessageSave?: (messageId: string, data: { flexBlocks: Block[] }) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  logicBlocks, 
  flexBlocks, 
  onLogicBlocksChange, 
  onFlexBlocksChange,
  currentLogicTemplateName,
  currentFlexMessageName,
  selectedBotId,
  selectedLogicTemplateId,
  onLogicTemplateSelect,
  onLogicTemplateCreate,
  onLogicTemplateSave,
  selectedFlexMessageId,
  onFlexMessageSelect,
  onFlexMessageCreate,
  onFlexMessageSave
}) => {
  const [activeTab, setActiveTab] = useState('logic');
  const [showAllBlocks, setShowAllBlocks] = useState(true);
  // 已移除舊的預覽模擬器控制狀態（useEnhancedSimulator / showDebugInfo）

  // 測試動作處理
  const [currentTestAction, setCurrentTestAction] = useState<'new-user' | 'test-message' | 'preview-dialog' | null>(null);
  const [workspaceValidation, setWorkspaceValidation] = useState<{
    logic: { isValid: boolean; errors: string[]; warnings: string[] };
    flex: { isValid: boolean; errors: string[]; warnings: string[] };
  }>({
    logic: { isValid: true, errors: [], warnings: [] },
    flex: { isValid: true, errors: [], warnings: [] }
  });
  const { toast } = useToast();

  // Flex 訊息資料
  const [_savedFlexMessages, setSavedFlexMessages] = useState<Map<string, StoredFlexMessage>>(new Map());

  // Flex 訊息生成器
  const flexMessageGenerator = useMemo(() => new FlexMessageGenerator(), []);

  // 轉換函數
  const _convertFlexBlocksToFlexMessage = useCallback((blocks: Block[]) => {
    return flexMessageGenerator.generateFlexMessage(blocks);
  }, [flexMessageGenerator]);

  // 載入儲存的 Flex 訊息
  const loadSavedFlexMessages = useCallback(async () => {
    try {
      const messages = await VisualEditorApi.getUserFlexMessages();
      const map = new Map<string, StoredFlexMessage>();
      // 同時以 ID 和名稱作為 key，方便查找
      messages.forEach((m) => {
        if (m && m.id) map.set(m.id, m);
        if (m && typeof (m as Record<string, unknown>).name === 'string') {
          map.set((m as Record<string, string>).name, m);
        }
      });
      setSavedFlexMessages(map);
      console.log(`📦 載入了 ${messages.length} 個儲存的 Flex 訊息`);
    } catch (err) {
      console.error('載入已儲存 Flex 範本失敗', err);
    }
  }, []);

  useEffect(() => {
    loadSavedFlexMessages();
  }, [loadSavedFlexMessages]);

  // 調試：監視 logicBlocks 的變化
  React.useEffect(() => {
    console.log(`📱 Workspace 接收到 ${logicBlocks?.length || 0} 個邏輯積木`);
  }, [logicBlocks]);

  // 處理測試動作
  const _handleTestAction = useCallback((action: 'new-user' | 'test-message' | 'preview-dialog') => {
    setCurrentTestAction(action);
    // 清除動作狀態，讓下次同樣的動作也能觸發
    setTimeout(() => setCurrentTestAction(null), 100);

    toast({
      title: "測試動作已執行",
      description: `已執行${action === 'new-user' ? '新用戶模擬' : action === 'test-message' ? '測試訊息' : '對話預覽'}`,
    });
  }, [toast]);

  // 積木已是統一格式，無需轉換
  const normalizeBlocks = useCallback((blocks: UnifiedBlock[]): UnifiedBlock[] => {
    return blocks;
  }, []);

  // 使用 ref 來存儲上一次的驗證結果，避免依賴狀態導致循環
  const prevValidationRef = React.useRef({
    logic: { errors: [], warnings: [] },
    flex: { errors: [], warnings: [] }
  });

  // 驗證工作區 - 優化版本，避免無限循環
  const validateCurrentWorkspace = useCallback(() => {
    const normalizedLogicBlocks = normalizeBlocks(logicBlocks);
    const normalizedFlexBlocks = normalizeBlocks(flexBlocks);

    const logicValidation = validateWorkspace(normalizedLogicBlocks, WorkspaceContext.LOGIC);
    const flexValidation = validateWorkspace(normalizedFlexBlocks, WorkspaceContext.FLEX);

    // 使用 ref 來比較上一次的驗證結果
    const prevLogicErrors = prevValidationRef.current.logic.errors;
    const prevLogicWarnings = prevValidationRef.current.logic.warnings;
    const prevFlexErrors = prevValidationRef.current.flex.errors;
    const prevFlexWarnings = prevValidationRef.current.flex.warnings;

    // 檢查邏輯編輯器驗證結果
    if (logicValidation.errors.length > 0 && 
        JSON.stringify(logicValidation.errors) !== JSON.stringify(prevLogicErrors)) {
      toast({
        variant: 'destructive',
        title: '邏輯編輯器錯誤',
        description: logicValidation.errors.join('; ')
      });
    }

    if (logicValidation.warnings.length > 0 && 
        JSON.stringify(logicValidation.warnings) !== JSON.stringify(prevLogicWarnings)) {
      toast({
        title: '邏輯編輯器建議',
        description: logicValidation.warnings.join('; ')
      });
    }

    // 檢查 Flex 設計器驗證結果
    if (flexValidation.errors.length > 0 && 
        JSON.stringify(flexValidation.errors) !== JSON.stringify(prevFlexErrors)) {
      toast({
        variant: 'destructive',
        title: 'Flex 設計器錯誤',
        description: flexValidation.errors.join('; ')
      });
    }

    if (flexValidation.warnings.length > 0 && 
        JSON.stringify(flexValidation.warnings) !== JSON.stringify(prevFlexWarnings)) {
      toast({
        title: 'Flex 設計器建議',
        description: flexValidation.warnings.join('; ')
      });
    }

    // 更新 ref 中的驗證結果
    prevValidationRef.current = {
      logic: logicValidation,
      flex: flexValidation
    };

    // 更新驗證結果狀態
    setWorkspaceValidation({
      logic: logicValidation,
      flex: flexValidation
    });
  }, [logicBlocks, flexBlocks, normalizeBlocks, toast]);

  // 智能防抖驗證函數 - 優化版本
  const debouncedValidation = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          validateCurrentWorkspace();
        }, 1000); // 增加到 1000ms 延遲，減少頻繁驗證
      };
    },
    [validateCurrentWorkspace]
  );

  // 在積木變更時驗證工作區 - 使用智能防抖機制
  React.useEffect(() => {
    debouncedValidation();
  }, [logicBlocks, flexBlocks, debouncedValidation]);

  const handleLogicDrop = useCallback((item: UnifiedDropItem) => {
    const blockToAdd: UnifiedBlock = {
      ...item,
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      children: []
    };
    
    onLogicBlocksChange(prev => [...prev, blockToAdd]);
  }, [onLogicBlocksChange]);

  const handleFlexDrop = useCallback((item: UnifiedDropItem) => {
    console.log('🎨 Flex 設計器積木放置:', {
      item: item,
      itemType: 'category' in item ? 'unified' : 'legacy',
      currentTab: activeTab,
      timestamp: new Date().toISOString()
    });
    
    try {
      const blockToAdd: UnifiedBlock = {
        ...item,
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        children: []
      };
      
      console.log('✅ 積木成功添加到 Flex 設計器:', blockToAdd);
      onFlexBlocksChange(prev => [...prev, blockToAdd]);
    } catch (_error) {
      console.error("Error occurred:", _error);
    }
  }, [onFlexBlocksChange, activeTab]);

  const removeLogicBlock = useCallback((index: number) => {
    onLogicBlocksChange(prev => prev.filter((_, i) => i !== index));
  }, [onLogicBlocksChange]);

  const removeFlexBlock = useCallback((index: number) => {
    onFlexBlocksChange(prev => prev.filter((_, i) => i !== index));
  }, [onFlexBlocksChange]);

  const updateLogicBlock = useCallback((index: number, newData: BlockData) => {
    onLogicBlocksChange(prev => prev.map((block, i) => 
      i === index ? { ...block, blockData: { ...block.blockData, ...newData } } : block
    ));
  }, [onLogicBlocksChange]);

  const updateFlexBlock = useCallback((index: number, newData: BlockData) => {
    onFlexBlocksChange(prev => prev.map((block, i) => 
      i === index ? { ...block, blockData: { ...block.blockData, ...newData } } : block
    ));
  }, [onFlexBlocksChange]);

  // 新增：移動積木功能
  const moveLogicBlock = useCallback((dragIndex: number, hoverIndex: number) => {
    onLogicBlocksChange(prev => {
      const newBlocks = [...prev];
      const draggedBlock = newBlocks[dragIndex];
      newBlocks.splice(dragIndex, 1);
      newBlocks.splice(hoverIndex, 0, draggedBlock);
      return newBlocks;
    });
  }, [onLogicBlocksChange]);

  const moveFlexBlock = useCallback((dragIndex: number, hoverIndex: number) => {
    onFlexBlocksChange(prev => {
      const newBlocks = [...prev];
      const draggedBlock = newBlocks[dragIndex];
      newBlocks.splice(dragIndex, 1);
      newBlocks.splice(hoverIndex, 0, draggedBlock);
      return newBlocks;
    });
  }, [onFlexBlocksChange]);

  // 新增：插入積木功能
  const insertLogicBlock = useCallback((index: number, item: UnifiedDropItem) => {
    const blockToAdd: UnifiedBlock = {
      ...item,
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      children: []
    };
    
    onLogicBlocksChange(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index, 0, blockToAdd);
      return newBlocks;
    });
  }, [onLogicBlocksChange]);

  const insertFlexBlock = useCallback((index: number, item: UnifiedDropItem) => {
    console.log('🎨 Flex 設計器積木插入:', {
      insertIndex: index,
      item: item,
      currentTab: activeTab,
      timestamp: new Date().toISOString()
    });
    
    try {
      const blockToAdd: UnifiedBlock = {
        ...item,
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        children: []
      };
      
      onFlexBlocksChange(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(index, 0, blockToAdd);
        console.log('✅ 積木成功插入到 Flex 設計器位置', index, blockToAdd);
        return newBlocks;
      });
    } catch (_error) {
      console.error("Error occurred:", _error);
    }
  }, [onFlexBlocksChange, activeTab]);

  // 獲取當前工作區上下文（增強版）
  const getCurrentContext = (): WorkspaceContext => {
    let context: WorkspaceContext;
    
    // 根據活動標籤決定上下文
    switch (activeTab) {
      case 'logic':
        context = WorkspaceContext.LOGIC;
        break;
      case 'flex':
        context = WorkspaceContext.FLEX;
        break;
      case 'preview':
        // 預覽標籤基於邏輯編輯器內容，使用邏輯上下文
        context = WorkspaceContext.LOGIC;
        break;
      case 'code':
        // 程式碼標籤基於邏輯編輯器內容，使用邏輯上下文
        context = WorkspaceContext.LOGIC;
        break;
      default:
        // 對於未知標籤，使用邏輯上下文作為預設值
        console.debug('🔧 未知標籤:', activeTab, '使用邏輯上下文作為預設值');
        context = WorkspaceContext.LOGIC;
        break;
    }
    
    console.debug('📍 當前工作區上下文:', {
      context: context,
      activeTab: activeTab,
      contextType: typeof context,
      isValidContext: Object.values(WorkspaceContext).includes(context),
      timestamp: new Date().toISOString()
    });
    
    // 驗證上下文的有效性（保留驗證機制以防萬一）
    if (!Object.values(WorkspaceContext).includes(context)) {
      console.error('❌ 生成的上下文無效:', context);
      context = WorkspaceContext.LOGIC; // 回退到安全的預設值
      console.log('🔧 使用回退上下文:', context);
    }
    
    return context;
  };


  // 渲染左側面板
  const renderLeftPanel = () => {
    switch (activeTab) {
      case 'logic':
      case 'flex':
        return (
          <BlockPalette
            currentContext={getCurrentContext()}
            showAllBlocks={showAllBlocks}
            onShowAllBlocksChange={setShowAllBlocks}
          />
        );
      case 'preview':
        // AI 知識庫管理頁面不再顯示舊的預覽控制台
        return null;
      case 'code':
        return (
          <CodeControlPanel
            blocks={logicBlocks}
          />
        );
      default:
        return null;
    }
  };

  return (
    <CodeDisplayProvider>
      <div className="flex h-full">
        {/* 左側面板 - 根據當前標籤顯示不同內容 */}
        {renderLeftPanel()}

        {/* 主工作區 */}
        <div className="flex-1 bg-background flex flex-col">
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            console.log('切換標籤:', value);
            setActiveTab(value);
          }} 
          className="h-full flex flex-col"
        >
          <TabsList className="m-4 flex-shrink-0">
            <TabsTrigger value="logic">
              邏輯編輯器
              {currentLogicTemplateName && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {currentLogicTemplateName}
                </span>
              )}
              {!workspaceValidation.logic.isValid && (
                <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="flex">
              Flex 設計器
              {currentFlexMessageName && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {currentFlexMessageName}
                </span>
              )}
              {!workspaceValidation.flex.isValid && (
                <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="preview">AI 知識庫管理</TabsTrigger>
            <TabsTrigger value="code">程式碼</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logic" className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* 邏輯模板選擇器 */}
              {selectedBotId && (
                <LogicTemplateSelector
                  selectedBotId={selectedBotId}
                  selectedLogicTemplateId={selectedLogicTemplateId}
                  onLogicTemplateSelect={onLogicTemplateSelect}
                  onLogicTemplateCreate={onLogicTemplateCreate}
                  onLogicTemplateSave={onLogicTemplateSave}
                  logicBlocks={logicBlocks as Block[]}
                />
              )}
              
              <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-2 gap-4 h-full min-h-0">
                  <div className="flex flex-col min-h-0">
                    <DropZone 
                      title={currentLogicTemplateName ? 
                        `邏輯編輯器 - ${currentLogicTemplateName}` : 
                        "邏輯編輯器 - 請選擇邏輯模板"
                      }
                      context={WorkspaceContext.LOGIC}
                      onDrop={handleLogicDrop}
                      blocks={logicBlocks}
                      onRemove={removeLogicBlock}
                      onUpdate={updateLogicBlock}
                      onMove={moveLogicBlock}
                      onInsert={insertLogicBlock}
                    />
                  </div>
                  
                  <div className="flex flex-col min-h-0">
                    <LineBotSimulator
                      blocks={logicBlocks as Block[]}
                      flexBlocks={flexBlocks as Block[]}
                      testAction={currentTestAction}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="flex" className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* FlexMessage 選擇器 */}
              <FlexMessageSelector
                selectedFlexMessageId={selectedFlexMessageId}
                onFlexMessageSelect={onFlexMessageSelect}
                onFlexMessageCreate={onFlexMessageCreate}
                onFlexMessageSave={onFlexMessageSave}
                flexBlocks={flexBlocks as Block[]}
              />
              
              <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-2 gap-4 h-full min-h-0">
                  <div className="flex flex-col min-h-0">
                    <DropZone 
                      title={currentFlexMessageName ? 
                        `Flex 設計器 - ${currentFlexMessageName}` : 
                        "Flex 設計器 - 請選擇 FlexMessage"
                      }
                      context={WorkspaceContext.FLEX}
                      onDrop={handleFlexDrop}
                      blocks={flexBlocks}
                      onRemove={removeFlexBlock}
                      onUpdate={updateFlexBlock}
                      onMove={moveFlexBlock}
                      onInsert={insertFlexBlock}
                    />
                  </div>
                  
                  <div className="flex flex-col min-h-0">
                    <FlexMessagePreview blocks={flexBlocks} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <AIKnowledgeBaseManager botId={selectedBotId} />
          </TabsContent>
          
          <TabsContent value="code" className="flex-1 overflow-hidden">
            <div className="h-full p-4 overflow-auto">
              <CodePreview blocks={logicBlocks} />
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </CodeDisplayProvider>
  );
};

export default Workspace;
