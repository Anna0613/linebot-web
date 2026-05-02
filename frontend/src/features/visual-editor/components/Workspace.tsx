import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import DropZone from './DropZone';
import FlexMessagePreview from './FlexMessagePreview';
import { BlockPalette } from './BlockPalette';
import FlexMessageSelector from './FlexMessageSelector';
import LogicEditorWithCode from './LogicEditorWithCode';
// 已移除舊的預覽控制台（PreviewControlPanel）與增強模擬器（EnhancedLineBotSimulator）在 AI 知識庫頁面
import RichMenuPanel from './RichMenuPanel';
import BotBasicInfoPanel from './BotBasicInfoPanel';
import AIKnowledgeBaseManager from '@/features/ai/components/AIKnowledgeBaseManager';
import { CodeDisplayProvider } from './CodeDisplayContext';
import {
  UnifiedBlock,
  UnifiedDropItem,
  WorkspaceContext
} from '@/features/visual-editor/types/block';
import { validateWorkspace } from '@/features/visual-editor/utils/blockCompatibility';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Bot, LayoutDashboard, Plus } from 'lucide-react';
import VisualEditorApi, { FlexMessage as StoredFlexMessage } from '@/features/visual-editor/api/visualEditorApi';

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
  onBotUpdated?: () => Promise<unknown> | void;
  // 初始活動標籤
  initialActiveTab?: string;
}

const getPaletteContextForTab = (tab: string): WorkspaceContext => (
  tab === 'flex' ? WorkspaceContext.FLEX : WorkspaceContext.LOGIC
);

const tabUsesBlockPalette = (tab: string): boolean => (
  tab === 'logic' || tab === 'flex'
);

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
  onFlexMessageSave,
  onBotUpdated,
  initialActiveTab = 'logic'
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const shouldShowLeftPanel = Boolean(selectedBotId && tabUsesBlockPalette(activeTab));
  const [lastPaletteContext, setLastPaletteContext] = useState<WorkspaceContext>(
    getPaletteContextForTab(initialActiveTab)
  );
  const [isLeftPanelMounted, setIsLeftPanelMounted] = useState(shouldShowLeftPanel);
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

  useEffect(() => {
    if (shouldShowLeftPanel) {
      setLastPaletteContext(getPaletteContextForTab(activeTab));
      setIsLeftPanelMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLeftPanelMounted(false);
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, shouldShowLeftPanel]);

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

  const renderNoBotSelectedState = () => (
    <div className="flex h-full items-center justify-center p-6">
      <div className="app-panel-strong w-full max-w-xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-[#166534]">
          <Bot className="h-7 w-7" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-slate-950">
          先選擇一個 Bot
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-500">
          從左上角選擇要編輯的 Bot，或先建立新的 LINE Bot，再開始配置邏輯、Flex 訊息、AI 知識庫與 Rich Menu。
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={() => navigate('/bots/create')}
            className="app-primary-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            建立 Bot
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/bots/management')}
            className="app-secondary-button"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            回管理中心
          </Button>
        </div>
      </div>
    </div>
  );

  const shouldRenderLeftPanel = isLeftPanelMounted || shouldShowLeftPanel;
  const displayedPaletteContext = shouldShowLeftPanel
    ? getPaletteContextForTab(activeTab)
    : lastPaletteContext;

  return (
    <CodeDisplayProvider>
      <div className="flex h-full overflow-hidden">
        <aside
          aria-hidden={!shouldShowLeftPanel}
          className={[
            'h-full shrink-0 overflow-hidden bg-white/55 backdrop-blur-xl',
            'transition-[width,opacity,transform] duration-300 ease-in-out',
            shouldRenderLeftPanel ? 'border-r border-white/70' : 'border-r-0',
            shouldShowLeftPanel
              ? 'w-80 translate-x-0 opacity-100'
              : 'pointer-events-none w-0 -translate-x-2 opacity-0'
          ].join(' ')}
        >
          <div className="h-full w-80">
            {shouldRenderLeftPanel && selectedBotId && (
              <BlockPalette currentContext={displayedPaletteContext} />
            )}
          </div>
        </aside>

        {/* 主工作區 */}
        <div className="flex flex-1 flex-col bg-transparent">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            console.log('切換標籤:', value);
            setActiveTab(value);
          }}
          className="h-full flex flex-col relative"
        >
          <TabsList className="app-panel m-4 h-auto flex-shrink-0 justify-start gap-1 overflow-x-auto p-1">
            <TabsTrigger value="basic" className="rounded-md px-3 py-2 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">
              基本資料
            </TabsTrigger>
            <TabsTrigger value="logic" className="rounded-md px-3 py-2 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">
              邏輯編輯器
              {currentLogicTemplateName && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs text-[#166534]">
                  {currentLogicTemplateName}
                </span>
              )}
              {!workspaceValidation.logic.isValid && (
                <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="flex" className="rounded-md px-3 py-2 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">
              Flex 設計器
              {currentFlexMessageName && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs text-[#166534]">
                  {currentFlexMessageName}
                </span>
              )}
              {!workspaceValidation.flex.isValid && (
                <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md px-3 py-2 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">AI 知識庫管理</TabsTrigger>
            <TabsTrigger value="richmenu" className="rounded-md px-3 py-2 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">功能選單</TabsTrigger>
          </TabsList>
          {!selectedBotId ? (
            <div className="min-h-0 flex-1">
              {renderNoBotSelectedState()}
            </div>
          ) : (
            <>
              <TabsContent value="basic" className="absolute inset-0 top-[60px] overflow-hidden data-[state=inactive]:hidden">
                <BotBasicInfoPanel
                  selectedBotId={selectedBotId}
                  onBotUpdated={onBotUpdated}
                />
              </TabsContent>

              <TabsContent value="logic" className="absolute inset-0 top-[60px] overflow-hidden data-[state=inactive]:hidden">
                <LogicEditorWithCode
                  selectedBotId={selectedBotId}
                  selectedLogicTemplateId={selectedLogicTemplateId || ''}
                  currentLogicTemplateName={currentLogicTemplateName || ''}
                  logicBlocks={logicBlocks}
                  flexBlocks={flexBlocks}
                  currentTestAction={currentTestAction}
                  onLogicTemplateSelect={onLogicTemplateSelect || (() => {})}
                  onLogicTemplateCreate={onLogicTemplateCreate || (async () => '')}
                  onLogicTemplateSave={onLogicTemplateSave || (async (_templateId, _data) => {})}
                  onLogicBlocksChange={onLogicBlocksChange}
                  onRemoveBlock={removeLogicBlock}
                  onUpdateBlock={updateLogicBlock}
                  onMoveBlock={moveLogicBlock}
                  onInsertBlock={insertLogicBlock}
                  onDrop={handleLogicDrop}
                />
              </TabsContent>

              <TabsContent value="flex" className="absolute inset-0 top-[60px] overflow-hidden flex flex-col data-[state=inactive]:hidden">
                <div className="flex-shrink-0">
                  {/* FlexMessage 選擇器 */}
                  <FlexMessageSelector
                    selectedFlexMessageId={selectedFlexMessageId}
                    onFlexMessageSelect={onFlexMessageSelect}
                    onFlexMessageCreate={onFlexMessageCreate}
                    onFlexMessageSave={onFlexMessageSave}
                    flexBlocks={flexBlocks as Block[]}
                  />
                </div>

                <div className="flex flex-1 flex-col overflow-hidden p-4">
                  <div className="grid h-full w-full gap-4 lg:grid-cols-2">
                    <div className="flex flex-col h-full overflow-hidden">
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

                    <div className="flex flex-col h-full overflow-hidden">
                      <FlexMessagePreview blocks={flexBlocks} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="absolute inset-0 top-[60px] overflow-hidden flex flex-col data-[state=inactive]:hidden">
                <div className="h-full flex flex-col">
                  <AIKnowledgeBaseManager botId={selectedBotId} />
                </div>
              </TabsContent>

              <TabsContent value="richmenu" className="absolute inset-0 top-[60px] overflow-hidden flex flex-col data-[state=inactive]:hidden">
                <RichMenuPanel selectedBotId={selectedBotId} />
              </TabsContent>
            </>
          )}
        </Tabs>
        </div>
      </div>
    </CodeDisplayProvider>
  );
};

export default Workspace;
