import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DropZone from './DropZone';
import CodePreview from './CodePreview';
import LineBotSimulator from './LineBotSimulator';
import FlexMessagePreview from './FlexMessagePreview';
import { BlockPalette } from './BlockPalette';
import LogicTemplateSelector from './LogicTemplateSelector';
import FlexMessageSelector from './FlexMessageSelector';
import { 
  UnifiedBlock, 
  UnifiedDropItem, 
  WorkspaceContext, 
  BlockCategory 
} from '../../types/block';
import { migrateBlock, migrateBlocks, validateWorkspace } from '../../utils/blockCompatibility';
import { useToast } from '../../hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

// 向後相容的舊格式介面
interface LegacyBlockData {
  [key: string]: unknown;
}

interface LegacyBlock {
  blockType: string;
  blockData: LegacyBlockData;
}

interface LegacyDropItem {
  blockType: string;
  blockData: LegacyBlockData;
}

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface WorkspaceProps {
  logicBlocks: (UnifiedBlock | LegacyBlock)[];
  flexBlocks: (UnifiedBlock | LegacyBlock)[];
  onLogicBlocksChange: (blocks: (UnifiedBlock | LegacyBlock)[] | ((prev: (UnifiedBlock | LegacyBlock)[]) => (UnifiedBlock | LegacyBlock)[])) => void;
  onFlexBlocksChange: (blocks: (UnifiedBlock | LegacyBlock)[] | ((prev: (UnifiedBlock | LegacyBlock)[]) => (UnifiedBlock | LegacyBlock)[])) => void;
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
  const [workspaceValidation, setWorkspaceValidation] = useState<{ 
    logic: { isValid: boolean; errors: string[]; warnings: string[] };
    flex: { isValid: boolean; errors: string[]; warnings: string[] };
  }>({
    logic: { isValid: true, errors: [], warnings: [] },
    flex: { isValid: true, errors: [], warnings: [] }
  });
  const { toast } = useToast();

  // 轉換積木到統一格式進行驗證
  const normalizeBlocks = useCallback((blocks: (UnifiedBlock | LegacyBlock)[]): UnifiedBlock[] => {
    return blocks.map(block => {
      if ('category' in block) {
        return block as UnifiedBlock;
      } else {
        return migrateBlock(block as LegacyBlock);
      }
    });
  }, []);

  // 驗證工作區
  const validateCurrentWorkspace = useCallback(() => {
    const normalizedLogicBlocks = normalizeBlocks(logicBlocks);
    const normalizedFlexBlocks = normalizeBlocks(flexBlocks);

    const logicValidation = validateWorkspace(normalizedLogicBlocks, WorkspaceContext.LOGIC);
    const flexValidation = validateWorkspace(normalizedFlexBlocks, WorkspaceContext.FLEX);

    // 只有在錯誤或警告發生變化時才顯示 toast
    const prevLogicValidation = workspaceValidation.logic;
    const prevFlexValidation = workspaceValidation.flex;

    // 檢查邏輯編輯器驗證結果
    if (logicValidation.errors.length > 0 && 
        JSON.stringify(logicValidation.errors) !== JSON.stringify(prevLogicValidation.errors)) {
      toast({
        variant: 'destructive',
        title: '邏輯編輯器錯誤',
        description: logicValidation.errors.join('; ')
      });
    }

    if (logicValidation.warnings.length > 0 && 
        JSON.stringify(logicValidation.warnings) !== JSON.stringify(prevLogicValidation.warnings)) {
      toast({
        title: '邏輯編輯器建議',
        description: logicValidation.warnings.join('; ')
      });
    }

    // 檢查 Flex 設計器驗證結果
    if (flexValidation.errors.length > 0 && 
        JSON.stringify(flexValidation.errors) !== JSON.stringify(prevFlexValidation.errors)) {
      toast({
        variant: 'destructive',
        title: 'Flex 設計器錯誤',
        description: flexValidation.errors.join('; ')
      });
    }

    if (flexValidation.warnings.length > 0 && 
        JSON.stringify(flexValidation.warnings) !== JSON.stringify(prevFlexValidation.warnings)) {
      toast({
        title: 'Flex 設計器建議',
        description: flexValidation.warnings.join('; ')
      });
    }

    setWorkspaceValidation({
      logic: logicValidation,
      flex: flexValidation
    });
  }, [logicBlocks, flexBlocks, normalizeBlocks, workspaceValidation, toast]);

  // 在積木變更時驗證工作區
  React.useEffect(() => {
    validateCurrentWorkspace();
  }, [validateCurrentWorkspace]);

  const handleLogicDrop = useCallback((item: UnifiedDropItem | LegacyDropItem) => {
    let blockToAdd: UnifiedBlock | LegacyBlock;
    
    if ('category' in item) {
      blockToAdd = {
        ...(item as UnifiedDropItem),
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        children: []
      } as UnifiedBlock;
    } else {
      blockToAdd = item as LegacyBlock;
    }
    
    onLogicBlocksChange(prev => [...prev, blockToAdd]);
  }, [onLogicBlocksChange]);

  const handleFlexDrop = useCallback((item: UnifiedDropItem | LegacyDropItem) => {
    console.log('🎨 Flex 設計器積木放置:', {
      item: item,
      itemType: 'category' in item ? 'unified' : 'legacy',
      currentTab: activeTab,
      timestamp: new Date().toISOString()
    });
    
    try {
      let blockToAdd: UnifiedBlock | LegacyBlock;
      
      if ('category' in item) {
        blockToAdd = {
          ...(item as UnifiedDropItem),
          id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          children: []
        } as UnifiedBlock;
      } else {
        blockToAdd = item as LegacyBlock;
      }
      
      console.log('✅ 積木成功添加到 Flex 設計器:', blockToAdd);
      onFlexBlocksChange(prev => [...prev, blockToAdd]);
    } catch (error) {
      console.error('❌ Flex 設計器積木放置失敗:', error);
    }
  }, [onFlexBlocksChange, activeTab]);

  const removeLogicBlock = useCallback((index: number) => {
    onLogicBlocksChange(prev => prev.filter((_, i) => i !== index));
  }, [onLogicBlocksChange]);

  const removeFlexBlock = useCallback((index: number) => {
    onFlexBlocksChange(prev => prev.filter((_, i) => i !== index));
  }, [onFlexBlocksChange]);

  const updateLogicBlock = useCallback((index: number, newData: LegacyBlockData) => {
    onLogicBlocksChange(prev => prev.map((block, i) => 
      i === index ? { ...block, blockData: { ...block.blockData, ...newData } } : block
    ));
  }, [onLogicBlocksChange]);

  const updateFlexBlock = useCallback((index: number, newData: LegacyBlockData) => {
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
  const insertLogicBlock = useCallback((index: number, item: UnifiedDropItem | LegacyDropItem) => {
    let blockToAdd: UnifiedBlock | LegacyBlock;
    
    if ('category' in item) {
      blockToAdd = {
        ...(item as UnifiedDropItem),
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        children: []
      } as UnifiedBlock;
    } else {
      blockToAdd = item as LegacyBlock;
    }
    
    onLogicBlocksChange(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index, 0, blockToAdd);
      return newBlocks;
    });
  }, [onLogicBlocksChange]);

  const insertFlexBlock = useCallback((index: number, item: UnifiedDropItem | LegacyDropItem) => {
    console.log('🎨 Flex 設計器積木插入:', {
      insertIndex: index,
      item: item,
      itemType: 'category' in item ? 'unified' : 'legacy',
      currentTab: activeTab,
      timestamp: new Date().toISOString()
    });
    
    try {
      let blockToAdd: UnifiedBlock | LegacyBlock;
      
      if ('category' in item) {
        blockToAdd = {
          ...(item as UnifiedDropItem),
          id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          children: []
        } as UnifiedBlock;
      } else {
        blockToAdd = item as LegacyBlock;
      }
      
      onFlexBlocksChange(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(index, 0, blockToAdd);
        console.log('✅ 積木成功插入到 Flex 設計器位置', index, blockToAdd);
        return newBlocks;
      });
    } catch (error) {
      console.error('❌ Flex 設計器積木插入失敗:', error);
    }
  }, [onFlexBlocksChange, activeTab]);

  // 獲取當前工作區上下文（增強版）
  const getCurrentContext = (): WorkspaceContext => {
    let context: WorkspaceContext;
    
    // 根據活動標籤決定上下文
    if (activeTab === 'logic') {
      context = WorkspaceContext.LOGIC;
    } else if (activeTab === 'flex') {
      context = WorkspaceContext.FLEX;
    } else {
      // 對於其他標籤（如 preview, code），使用預設值
      console.warn('⚠️ 未識別的活動標籤:', activeTab, '使用預設上下文');
      context = WorkspaceContext.LOGIC;
    }
    
    console.log('📍 當前工作區上下文:', {
      context: context,
      activeTab: activeTab,
      contextType: typeof context,
      isValidContext: Object.values(WorkspaceContext).includes(context),
      timestamp: new Date().toISOString()
    });
    
    // 驗證上下文的有效性
    if (!Object.values(WorkspaceContext).includes(context)) {
      console.error('❌ 生成的上下文無效:', context);
      context = WorkspaceContext.LOGIC; // 回退到安全的預設值
      console.log('🔧 使用回退上下文:', context);
    }
    
    return context;
  };


  return (
    <div className="flex h-full">
      {/* 積木選擇面板 */}
      <BlockPalette 
        currentContext={getCurrentContext()}
        showAllBlocks={showAllBlocks}
        onShowAllBlocksChange={setShowAllBlocks}
      />
      
      {/* 主工作區 */}
      <div className="flex-1 bg-gray-100 flex flex-col">
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
            <TabsTrigger value="preview">預覽與測試</TabsTrigger>
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
            <div className="h-full p-4 overflow-auto">
              <LineBotSimulator blocks={logicBlocks} />
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="flex-1 overflow-hidden">
            <div className="h-full p-4 overflow-auto">
              <CodePreview blocks={logicBlocks} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Workspace;