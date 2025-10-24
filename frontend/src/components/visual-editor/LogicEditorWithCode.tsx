import React from 'react';
import DropZone from './DropZone';
import LineBotSimulator from './LineBotSimulator';
import LogicTemplateSelector from './LogicTemplateSelector';
import { WorkspaceContext, UnifiedBlock } from '../../types/block';

interface LogicEditorWithCodeProps {
  selectedBotId: string;
  selectedLogicTemplateId: string;
  currentLogicTemplateName: string;
  logicBlocks: UnifiedBlock[];
  flexBlocks: UnifiedBlock[];
  currentTestAction?: string;
  onLogicTemplateSelect: (templateId: string) => void;
  onLogicTemplateCreate: (name: string) => Promise<string>;
  onLogicTemplateSave: () => Promise<void>;
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
  onLogicBlocksChange,
  onRemoveBlock,
  onUpdateBlock,
  onMoveBlock,
  onInsertBlock,
  onDrop,
}) => {
  return (
    <div className="h-full flex flex-col">
      {/* 邏輯模板選擇器 */}
      {selectedBotId && (
        <LogicTemplateSelector
          selectedBotId={selectedBotId}
          selectedLogicTemplateId={selectedLogicTemplateId}
          onLogicTemplateSelect={onLogicTemplateSelect}
          onLogicTemplateCreate={onLogicTemplateCreate}
          onLogicTemplateSave={onLogicTemplateSave}
          logicBlocks={logicBlocks as any}
        />
      )}

      {/* 邏輯編輯器主體 */}
      <div className="flex-1 p-4 overflow-auto h-full">
        <div className="grid grid-cols-2 gap-4 h-full min-h-0">
          <div className="flex flex-col min-h-0">
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

          <div className="flex flex-col min-h-0">
            <LineBotSimulator
              blocks={logicBlocks as any}
              flexBlocks={flexBlocks as any}
              testAction={currentTestAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicEditorWithCode;

