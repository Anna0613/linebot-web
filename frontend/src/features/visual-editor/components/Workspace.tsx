import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FlexMessageCanvas from './FlexMessageCanvas';
import FlexMessageInspector from './FlexMessageInspector';
import { BlockPalette } from './BlockPalette';
import FlexMessageSelector from './FlexMessageSelector';
import LogicEditorWithCode from './LogicEditorWithCode';
import LogicTemplateSelector from './LogicTemplateSelector';
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
import { WorkflowGraph, validateWorkflowGraph } from '@/features/visual-editor/types/workflow';
import { validateWorkspace } from '@/features/visual-editor/utils/blockCompatibility';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Bot, LayoutDashboard, Plus } from 'lucide-react';
import VisualEditorApi, { FlexMessage as StoredFlexMessage } from '@/features/visual-editor/api/visualEditorApi';
import { API_CONFIG } from '@/config/apiConfig';

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
              size: block.blockData.size || "full",
              aspectMode: block.blockData.aspectMode || "cover",
              aspectRatio: block.blockData.aspectRatio || "20:13",
              ...(block.blockData.align ? { align: block.blockData.align } : {}),
              ...(block.blockData.backgroundColor && block.blockData.backgroundColor !== 'transparent'
                ? { backgroundColor: block.blockData.backgroundColor }
                : {}),
              ...(block.blockData.action ? { action: block.blockData.action } : {})
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

const deleteFlexMessageImage = async (botId: string, objectPath: string): Promise<void> => {
  const params = new URLSearchParams({ object_path: objectPath });
  const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/flex-message-image?${params.toString()}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `刪除圖片失敗 (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`;
    try {
      const errorData = await response.json();
      const detail = errorData?.detail || errorData?.message;
      if (detail) message = `${message}: ${detail}`;
    } catch {
      const text = await response.text().catch(() => '');
      if (text) message = `${message}: ${text}`;
    }
    throw new Error(message);
  }
};

interface WorkspaceProps {
  logicGraph: WorkflowGraph | null;
  flexBlocks: UnifiedBlock[];
  onLogicGraphChange: (graph: WorkflowGraph) => void;
  onFlexBlocksChange: (blocks: UnifiedBlock[] | ((prev: UnifiedBlock[]) => UnifiedBlock[])) => void;
  currentLogicTemplateName?: string;
  currentFlexMessageName?: string;
  isUnsupportedLogicTemplate?: boolean;
  // 新增邏輯模板相關 props
  selectedBotId?: string;
  selectedLogicTemplateId?: string;
  onLogicTemplateSelect?: (templateId: string) => void;
  onLogicTemplateCreate?: (name: string) => Promise<unknown> | unknown;
  onLogicTemplateDelete?: (templateId: string) => Promise<unknown> | unknown;
  // 新增 FlexMessage 相關 props
  selectedFlexMessageId?: string;
  onFlexMessageSelect?: (messageId: string) => void;
  onFlexMessageCreate?: (name: string) => Promise<unknown> | unknown;
  onFlexMessageDelete?: (messageId: string) => Promise<unknown> | unknown;
  onBotUpdated?: () => Promise<unknown> | void;
  // 初始活動標籤
  initialActiveTab?: string;
}

const getPaletteContextForTab = (tab: string): WorkspaceContext => (
  tab === 'flex' ? WorkspaceContext.FLEX : WorkspaceContext.LOGIC
);

const tabUsesBlockPalette = (_tab: string): boolean => (
  false
);

const tabUsesTemplatePanel = (tab: string): boolean => (
  tab === 'logic' || tab === 'flex'
);

const Workspace: React.FC<WorkspaceProps> = ({
  logicGraph,
  flexBlocks,
  onLogicGraphChange,
  onFlexBlocksChange,
  currentLogicTemplateName,
  currentFlexMessageName,
  isUnsupportedLogicTemplate = false,
  selectedBotId,
  selectedLogicTemplateId,
  onLogicTemplateSelect,
  onLogicTemplateCreate,
  onLogicTemplateDelete,
  selectedFlexMessageId,
  onFlexMessageSelect,
  onFlexMessageCreate,
  onFlexMessageDelete,
  onBotUpdated,
  initialActiveTab = 'basic'
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const shouldShowLeftPanel = Boolean(selectedBotId && tabUsesBlockPalette(activeTab));
  const shouldShowTemplatePanel = Boolean(selectedBotId && tabUsesTemplatePanel(activeTab));
  const [lastPaletteContext, setLastPaletteContext] = useState<WorkspaceContext>(
    getPaletteContextForTab(initialActiveTab)
  );
  const [lastTemplateTab, setLastTemplateTab] = useState(
    tabUsesTemplatePanel(initialActiveTab) ? initialActiveTab : 'logic'
  );
  const [isLeftPanelMounted, setIsLeftPanelMounted] = useState(shouldShowLeftPanel);
  const [isTemplatePanelMounted, setIsTemplatePanelMounted] = useState(shouldShowTemplatePanel);
  // 已移除舊的預覽模擬器控制狀態（useEnhancedSimulator / showDebugInfo）

  // 測試動作處理
  const [_currentTestAction, setCurrentTestAction] = useState<'new-user' | 'test-message' | 'preview-dialog' | null>(null);
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
  const [selectedFlexBlockIndex, setSelectedFlexBlockIndex] = useState<number | null>(null);

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

  useEffect(() => {
    if (shouldShowTemplatePanel) {
      setLastTemplateTab(activeTab);
      setIsTemplatePanelMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsTemplatePanelMounted(false);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, shouldShowTemplatePanel]);

  // 調試：監視 logic graph 的變化
  React.useEffect(() => {
    console.log(`📱 Workspace 接收到 ${logicGraph?.nodes.length || 0} 個邏輯節點`);
  }, [logicGraph]);

  useEffect(() => {
    if (flexBlocks.length === 0) {
      setSelectedFlexBlockIndex(null);
      return;
    }

    setSelectedFlexBlockIndex((current) => {
      if (current === null) return current;
      if (current >= flexBlocks.length) return flexBlocks.length - 1;
      return current;
    });
  }, [flexBlocks.length]);

  // 處理測試動作
  const _handleTestAction = useCallback((action: 'new-user' | 'test-message' | 'preview-dialog') => {
    setCurrentTestAction(action);
    // 清除動作狀態，讓下次同樣的動作也能觸發
    setTimeout(() => setCurrentTestAction(null), 100);

    toast({
      title: "測試動作已執行",
      description: `已執行${action === 'new-user' ? '新好友模擬' : action === 'test-message' ? '測試訊息' : '對話預覽'}`,
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
    const normalizedFlexBlocks = normalizeBlocks(flexBlocks);

    const logicValidation = validateWorkflowGraph(logicGraph);
    const flexValidation = validateWorkspace(normalizedFlexBlocks, WorkspaceContext.FLEX);

    // 使用 ref 來比較上一次的驗證結果
    const prevLogicErrors = prevValidationRef.current.logic.errors;
    const prevLogicWarnings = prevValidationRef.current.logic.warnings;
    const prevFlexErrors = prevValidationRef.current.flex.errors;
    const prevFlexWarnings = prevValidationRef.current.flex.warnings;

    // 只有在已選擇邏輯模板時才顯示驗證錯誤（避免未選擇時出現無意義的錯誤提示）
    if (selectedLogicTemplateId) {
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
    }

    // 檢查 Flex Message 編輯驗證結果
    if (flexValidation.errors.length > 0 && 
        JSON.stringify(flexValidation.errors) !== JSON.stringify(prevFlexErrors)) {
      toast({
        variant: 'destructive',
        title: 'Flex Message 編輯錯誤',
        description: flexValidation.errors.join('; ')
      });
    }

    if (flexValidation.warnings.length > 0 && 
        JSON.stringify(flexValidation.warnings) !== JSON.stringify(prevFlexWarnings)) {
      toast({
        title: 'Flex Message 編輯建議',
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
  }, [logicGraph, flexBlocks, normalizeBlocks, toast, selectedLogicTemplateId]);

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
  }, [logicGraph, flexBlocks, debouncedValidation]);

  const handleFlexDrop = useCallback((item: UnifiedDropItem) => {
    console.log('🎨 Flex Message 編輯積木放置:', {
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
      
      console.log('✅ 積木成功添加到 Flex Message 編輯:', blockToAdd);
      onFlexBlocksChange(prev => {
        setSelectedFlexBlockIndex(prev.length);
        return [...prev, blockToAdd];
      });
    } catch (_error) {
      console.error("Error occurred:", _error);
    }
  }, [onFlexBlocksChange, activeTab]);

  const removeFlexBlock = useCallback(async (index: number) => {
    const blockToRemove = flexBlocks[index];
    const imageObjectPath = blockToRemove?.blockData?.imageObjectPath;
    const shouldDeleteImage =
      blockToRemove?.blockType === 'flex-content' &&
      blockToRemove.blockData?.contentType === 'image' &&
      typeof imageObjectPath === 'string' &&
      imageObjectPath.length > 0;

    if (shouldDeleteImage) {
      if (!selectedBotId) {
        toast({
          title: '無法刪除圖片',
          description: '缺少 Bot 資訊，請重新選擇 Bot 後再刪除圖片積木',
          variant: 'destructive',
        });
        return;
      }

      try {
        await deleteFlexMessageImage(selectedBotId, imageObjectPath);
      } catch (error) {
        console.error('刪除 Flex Message 圖片失敗:', error);
        toast({
          title: '刪除圖片失敗',
          description: error instanceof Error ? error.message : 'MinIO 圖片刪除失敗，積木已保留',
          variant: 'destructive',
        });
        return;
      }
    }

    onFlexBlocksChange(prev => prev.filter((_, i) => i !== index));
  }, [flexBlocks, onFlexBlocksChange, selectedBotId, toast]);

  const updateFlexBlock = useCallback((index: number, newData: BlockData) => {
    onFlexBlocksChange(prev => prev.map((block, i) => 
      i === index ? { ...block, blockData: newData } : block
    ));
  }, [onFlexBlocksChange]);

  const moveFlexBlock = useCallback((dragIndex: number, hoverIndex: number) => {
    if (flexBlocks.length === 0) return;
    const targetIndex = Math.max(0, Math.min(hoverIndex, flexBlocks.length - 1));
    if (dragIndex === targetIndex) return;

    onFlexBlocksChange(prev => {
      const newBlocks = [...prev];
      const draggedBlock = newBlocks[dragIndex];
      newBlocks.splice(dragIndex, 1);
      newBlocks.splice(targetIndex, 0, draggedBlock);
      return newBlocks;
    });
    setSelectedFlexBlockIndex((current) => {
      if (current === dragIndex) return targetIndex;
      if (current === null) return current;
      if (dragIndex < targetIndex && current > dragIndex && current <= targetIndex) return current - 1;
      if (dragIndex > targetIndex && current >= targetIndex && current < dragIndex) return current + 1;
      return current;
    });
  }, [onFlexBlocksChange, flexBlocks.length]);

  const insertFlexBlock = useCallback((index: number, item: UnifiedDropItem) => {
    console.log('🎨 Flex Message 編輯積木插入:', {
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
        console.log('✅ 積木成功插入到 Flex Message 編輯位置', index, blockToAdd);
        setSelectedFlexBlockIndex(index);
        return newBlocks;
      });
    } catch (_error) {
      console.error("Error occurred:", _error);
    }
  }, [onFlexBlocksChange, activeTab]);

  const handleRemoveFlexBlock = useCallback(async (index: number) => {
    await removeFlexBlock(index);
    setSelectedFlexBlockIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }, [removeFlexBlock]);

  const selectedFlexBlock = selectedFlexBlockIndex !== null ? flexBlocks[selectedFlexBlockIndex] : undefined;

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
            回互動紀錄
          </Button>
        </div>
      </div>
    </div>
  );

  const shouldRenderLeftPanel = isLeftPanelMounted || shouldShowLeftPanel;
  const displayedPaletteContext = shouldShowLeftPanel
    ? getPaletteContextForTab(activeTab)
    : lastPaletteContext;
  const shouldRenderTemplatePanel = isTemplatePanelMounted || shouldShowTemplatePanel;
  const displayedTemplateTab = shouldShowTemplatePanel ? activeTab : lastTemplateTab;

  const renderTemplateToolbar = (tab: string) => {
    if (!selectedBotId) {
      return null;
    }

    if (tab === 'logic') {
      return (
        <LogicTemplateSelector
          selectedBotId={selectedBotId}
          selectedLogicTemplateId={selectedLogicTemplateId}
          onLogicTemplateSelect={onLogicTemplateSelect}
          onLogicTemplateCreate={onLogicTemplateCreate}
          onLogicTemplateDelete={onLogicTemplateDelete}
          workflowGraph={logicGraph}
          variant="toolbar"
        />
      );
    }

    if (tab === 'flex') {
      return (
        <FlexMessageSelector
          selectedFlexMessageId={selectedFlexMessageId}
          selectedFlexMessageName={currentFlexMessageName}
          onFlexMessageSelect={onFlexMessageSelect}
          onFlexMessageCreate={onFlexMessageCreate}
          onFlexMessageDelete={onFlexMessageDelete}
          flexBlocks={flexBlocks as Block[]}
          variant="toolbar"
        />
      );
    }

    return null;
  };

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
        <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            console.log('切換標籤:', value);
            setActiveTab(value);
          }}
          className="flex h-full min-h-0 flex-col"
        >
          <div className="mx-3 mb-2 mt-2 flex shrink-0 items-stretch overflow-visible rounded-lg border border-white/70 bg-white/65 shadow-sm backdrop-blur-xl">
            <TabsList
              className={[
                'h-auto min-h-11 min-w-0 flex-1 self-stretch justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-1',
                shouldShowTemplatePanel ? 'border-r border-white/70' : ''
              ].join(' ')}
            >
              <TabsTrigger value="basic" className="h-8 shrink-0 rounded-md px-2.5 py-1.5 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">
                基本資料
              </TabsTrigger>
              <TabsTrigger value="logic" className="h-8 shrink-0 rounded-md px-2.5 py-1.5 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">
                邏輯編輯器
                {!workspaceValidation.logic.isValid && (
                  <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="flex" className="h-8 shrink-0 rounded-md px-2.5 py-1.5 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">
                Flex Message 編輯
                {!workspaceValidation.flex.isValid && (
                  <AlertTriangle className="w-3 h-3 ml-1 text-red-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-8 shrink-0 rounded-md px-2.5 py-1.5 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">AI 知識庫管理</TabsTrigger>
              <TabsTrigger value="richmenu" className="h-8 shrink-0 rounded-md px-2.5 py-1.5 text-slate-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-[#166534]">功能選單</TabsTrigger>
            </TabsList>
            <div
              aria-hidden={!shouldShowTemplatePanel}
              className={[
                'shrink-0 transition-[width,opacity,transform] duration-300 ease-in-out',
                shouldShowTemplatePanel
                  ? 'w-1/2 translate-x-0 overflow-visible opacity-100'
                  : 'pointer-events-none w-0 translate-x-2 overflow-hidden opacity-0'
              ].join(' ')}
            >
              <div className="w-full min-w-[420px]">
                {shouldRenderTemplatePanel && renderTemplateToolbar(displayedTemplateTab)}
              </div>
            </div>
          </div>
          {!selectedBotId ? (
            <div className="min-h-0 flex-1">
              {renderNoBotSelectedState()}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden">
              <TabsContent value="basic" className="m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden">
                <BotBasicInfoPanel
                  selectedBotId={selectedBotId}
                  onBotUpdated={onBotUpdated}
                />
              </TabsContent>

              <TabsContent value="logic" className="m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden">
                <LogicEditorWithCode
                  selectedLogicTemplateId={selectedLogicTemplateId || ''}
                  currentLogicTemplateName={currentLogicTemplateName || ''}
                  workflowGraph={logicGraph}
                  isUnsupportedTemplate={isUnsupportedLogicTemplate}
                  onWorkflowGraphChange={onLogicGraphChange}
                />
              </TabsContent>

              <TabsContent value="flex" className="m-0 h-full min-h-0 overflow-hidden data-[state=inactive]:hidden">
                {!selectedFlexMessageId ? (
                  <div className="flex h-full items-center justify-center p-6 bg-[#f7fbf8]">
                    <div className="app-panel-strong max-w-lg p-8 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Plus className="h-6 w-6" />
                      </div>
                      <h2 className="text-xl font-semibold text-slate-950">選擇或新增 Flex Message 模板</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Flex Message 編輯器可視覺化設計 LINE 訊息卡片。請先在右上方選擇模板，或新增一個新的 Flex Message。
                      </p>
                    </div>
                  </div>
                ) : (
                <div className="grid h-full min-h-0 overflow-hidden bg-[#f7fbf8] grid-cols-[280px_minmax(0,1fr)_330px]">
                  <aside className="flex min-h-0 flex-col bg-white/75 backdrop-blur-xl">
                    <div className="border-b border-slate-200/80 p-4">
                      <div className="text-sm font-semibold text-slate-950">元件抽屜</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">拖到畫布建立 Flex Message</div>
                    </div>
                    <div className="min-h-0 flex-1">
                      <BlockPalette currentContext={WorkspaceContext.FLEX} />
                    </div>
                  </aside>

                  <main className="flex min-w-0 flex-col border-x border-slate-200/80 bg-white/45">
                    <div className="flex min-h-14 items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-xl">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-950">Flex Message 畫布</div>
                        <div className="truncate text-xs text-slate-500">
                          拖曳左側元件到畫布，點選畫布內容後到右側調整細節
                        </div>
                      </div>
                      <Badge variant={workspaceValidation.flex.isValid ? 'secondary' : 'destructive'} className="shrink-0 rounded-md">
                        {workspaceValidation.flex.isValid ? '可儲存' : '需修正'}
                      </Badge>
                    </div>

                    <div className="min-h-0 flex-1">
                      <FlexMessageCanvas
                        blocks={flexBlocks}
                        selectedIndex={selectedFlexBlockIndex}
                        onSelect={setSelectedFlexBlockIndex}
                        onDrop={handleFlexDrop}
                        onInsert={insertFlexBlock}
                        onUpdate={updateFlexBlock}
                        onRemove={handleRemoveFlexBlock}
                        onMove={moveFlexBlock}
                      />
                    </div>
                  </main>

                  <FlexMessageInspector
                    blocks={flexBlocks}
                    selectedIndex={selectedFlexBlockIndex}
                    selectedBlock={selectedFlexBlock}
                    context={WorkspaceContext.FLEX}
                    onDrop={handleFlexDrop}
                    onRemove={handleRemoveFlexBlock}
                    onUpdate={updateFlexBlock}
                    onMove={moveFlexBlock}
                    onInsert={insertFlexBlock}
                    onSelectBlock={setSelectedFlexBlockIndex}
                  />
                </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="m-0 h-full min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
                <div className="h-full flex flex-col">
                  <AIKnowledgeBaseManager botId={selectedBotId} />
                </div>
              </TabsContent>

              <TabsContent value="richmenu" className="m-0 h-full min-h-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
                <RichMenuPanel selectedBotId={selectedBotId} />
              </TabsContent>
            </div>
          )}
        </Tabs>
        </div>
      </div>
    </CodeDisplayProvider>
  );
};

export default Workspace;
