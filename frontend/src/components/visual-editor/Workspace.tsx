import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import DropZone from './DropZone';
import CodePreview from './CodePreview';
import LineBotSimulator from './LineBotSimulator';
import FlexMessagePreview from './FlexMessagePreview';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface DropItem {
  blockType: string;
  blockData: BlockData;
}

interface WorkspaceProps {
  logicBlocks: Block[];
  flexBlocks: Block[];
  onLogicBlocksChange: (blocks: Block[] | ((prev: Block[]) => Block[])) => void;
  onFlexBlocksChange: (blocks: Block[] | ((prev: Block[]) => Block[])) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  logicBlocks, 
  flexBlocks, 
  onLogicBlocksChange, 
  onFlexBlocksChange 
}) => {
  const handleLogicDrop = (item: DropItem) => {
    onLogicBlocksChange(prev => [...prev, item]);
  };

  const handleFlexDrop = (item: DropItem) => {
    onFlexBlocksChange(prev => [...prev, item]);
  };

  const removeLogicBlock = (index: number) => {
    onLogicBlocksChange(prev => prev.filter((_, i) => i !== index));
  };

  const removeFlexBlock = (index: number) => {
    onFlexBlocksChange(prev => prev.filter((_, i) => i !== index));
  };

  const updateLogicBlock = (index: number, newData: BlockData) => {
    onLogicBlocksChange(prev => prev.map((block, i) => 
      i === index ? { ...block, blockData: { ...block.blockData, ...newData } } : block
    ));
  };

  const updateFlexBlock = (index: number, newData: BlockData) => {
    onFlexBlocksChange(prev => prev.map((block, i) => 
      i === index ? { ...block, blockData: { ...block.blockData, ...newData } } : block
    ));
  };

  return (
    <div className="flex-1 bg-gray-100">
      <Tabs defaultValue="logic" className="h-full">
        <TabsList className="m-4">
          <TabsTrigger value="logic">邏輯編輯器</TabsTrigger>
          <TabsTrigger value="flex">Flex 設計器</TabsTrigger>
          <TabsTrigger value="preview">預覽與測試</TabsTrigger>
          <TabsTrigger value="code">程式碼</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logic" className="p-4 h-full">
          <DropZone 
            title="將積木拖拽到這裡來建立 LINE Bot 邏輯"
            onDrop={handleLogicDrop}
            blocks={logicBlocks}
            onRemove={removeLogicBlock}
            onUpdate={updateLogicBlock}
          />
        </TabsContent>
        
        <TabsContent value="flex" className="p-4 h-full">
          <div className="grid grid-cols-2 gap-4 h-full">
            <DropZone 
              title="Flex Message 設計區"
              onDrop={handleFlexDrop}
              blocks={flexBlocks}
              onRemove={removeFlexBlock}
              onUpdate={updateFlexBlock}
            />
            
            <FlexMessagePreview blocks={flexBlocks} />
          </div>
        </TabsContent>
        
        <TabsContent value="preview" className="p-4 h-full">
          <LineBotSimulator blocks={logicBlocks} />
        </TabsContent>
        
        <TabsContent value="code" className="p-4 h-full">
          <CodePreview blocks={logicBlocks} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Workspace;