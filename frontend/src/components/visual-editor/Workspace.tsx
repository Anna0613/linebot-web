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
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';

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

    setWorkspaceValidation({
      logic: logicValidation,
      flex: flexValidation
    });
  }, [logicBlocks, flexBlocks, normalizeBlocks]);

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

  // 獲取當前工作區上下文
  const getCurrentContext = (): WorkspaceContext => {
    const context = activeTab === 'logic' ? WorkspaceContext.LOGIC : WorkspaceContext.FLEX;
    console.log('當前工作區上下文:', context, '活動標籤:', activeTab);
    return context;
  };

  // 渲染驗證提示
  const renderValidationAlert = (context: WorkspaceContext) => {
    const validation = context === WorkspaceContext.LOGIC ? 
      workspaceValidation.logic : workspaceValidation.flex;

    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      return null;
    }

    return (
      <div className="mb-4 space-y-2">
        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">發現錯誤：</div>
              <ul className="text-sm space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {validation.warnings.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">建議：</div>
              <ul className="text-sm space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
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
                {renderValidationAlert(WorkspaceContext.LOGIC)}
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
                {renderValidationAlert(WorkspaceContext.FLEX)}
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