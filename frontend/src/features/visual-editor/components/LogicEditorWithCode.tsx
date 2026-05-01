import React from 'react';
import DropZone from './DropZone';
import LineBotSimulator from './LineBotSimulator';
import LogicTemplateSelector from './LogicTemplateSelector';
import { WorkspaceContext, UnifiedBlock } from '@/features/visual-editor/types/block';

interface LogicEditorWithCodeProps {
  selectedBotId: string;
  selectedLogicTemplateId: string;
  currentLogicTemplateName: string;
  logicBlocks: UnifiedBlock[];
  flexBlocks: UnifiedBlock[];
  currentTestAction?: string;
  onLogicTemplateSelect: (templateId: string) => void;
  onLogicTemplateCreate: (name: string) => Promise<string>;
  onLogicTemplateSave: (templateId: string, data: { logicBlocks: UnifiedBlock[], generatedCode: string }) => Promise<void>;
  onLogicBlocksChange: (blocks: UnifiedBlock[] | ((prev: UnifiedBlock[]) => UnifiedBlock[])) => void;
  onRemoveBlock: (index: number) => void;
  onUpdateBlock: (index: number, data: Record<string, unknown>) => void;
  onMoveBlock: (dragIndex: number, hoverIndex: number) => void;
  onInsertBlock: (index: number, item: unknown) => void;
  onDrop: (item: unknown) => void;
}

const LogicEditorWithCode: React.FC<LogicEditorWithCodeProps> = ({
  selectedBotId,
  selectedLogicTemplateId,
  currentLogicTemplateName,
  logicBlocks,
  flexBlocks,
  currentTestAction,
  onLogicTemplateSelect,
  onLogicTemplateCreate,
  onLogicTemplateSave,
  onLogicBlocksChange: _onLogicBlocksChange,
  onRemoveBlock,
  onUpdateBlock,
  onMoveBlock,
  onInsertBlock,
  onDrop,
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* 邏輯模板選擇器 */}
      <div className="flex-shrink-0">
        {selectedBotId && (
          <LogicTemplateSelector
            selectedBotId={selectedBotId}
            selectedLogicTemplateId={selectedLogicTemplateId}
            onLogicTemplateSelect={onLogicTemplateSelect}
            onLogicTemplateCreate={onLogicTemplateCreate}
            onLogicTemplateSave={onLogicTemplateSave}
            logicBlocks={logicBlocks}
          />
        )}
      </div>

      {/* 邏輯編輯器主體 */}
      <div className="flex flex-1 overflow-hidden p-4">
        <div className="grid h-full w-full gap-4 lg:grid-cols-2">
          <div className="flex flex-col h-full overflow-hidden">
            <DropZone
              title={currentLogicTemplateName ?
                `邏輯編輯器 - ${currentLogicTemplateName}` :
                "邏輯編輯器 - 請選擇邏輯模板"
              }
              context={WorkspaceContext.LOGIC}
              onDrop={onDrop}
              blocks={logicBlocks}
              onRemove={onRemoveBlock}
              onUpdate={onUpdateBlock}
              onMove={onMoveBlock}
              onInsert={onInsertBlock}
            />
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <LineBotSimulator
              blocks={logicBlocks.map((b) => ({ blockType: b.blockType, blockData: b.blockData, id: b.id, parentId: b.parentId }))}
              flexBlocks={flexBlocks.map((b) => ({ blockType: b.blockType, blockData: b.blockData, id: b.id, parentId: b.parentId }))}
              testAction={currentTestAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicEditorWithCode;
