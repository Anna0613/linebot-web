import React, { useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragMoveEvent, closestCenter, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { BlockPalette } from './BlockPalette';
import { Workspace } from './Workspace';
import { CodePreview } from './CodePreview';
import { useVisualEditorStore } from '../../stores/visualEditorStore';
import { BlockRenderer } from './BlockRenderer';

export const VisualBotEditor: React.FC = () => {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const { 
    activeId, 
    setActiveId, 
    addBlockToWorkspace, 
    moveBlock,
    workspaceBlocks,
    generateCode,
    connectBlocks,
    findNearbyConnectionPoints
  } = useVisualEditorStore();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // 如果拖拽到工作區 (新增拼圖)
    if (over.id === 'workspace') {
      const blockData = active.data.current;
      if (blockData?.type === 'palette-block') {
        // 計算相對於工作區的位置
        const workspaceRect = workspaceRef.current?.getBoundingClientRect();
        const relativeX = workspaceRect ? Math.max(0, event.activatorEvent.clientX - workspaceRect.left - 100) : 100;
        const relativeY = workspaceRect ? Math.max(0, event.activatorEvent.clientY - workspaceRect.top - 50) : 100;
        
        addBlockToWorkspace({
          ...blockData.block,
          id: `block-${Date.now()}`,
          x: relativeX,
          y: relativeY
        });
      }
    }
    
    // 如果在工作區內移動現有拼圖
    if (active.id && typeof active.id === 'string' && active.id.startsWith('workspace-block-')) {
      const blockId = active.id.replace('workspace-block-', '');
      const currentBlock = workspaceBlocks[blockId];
      
      if (currentBlock && delta) {
        let newX = Math.max(0, currentBlock.x + delta.x);
        let newY = Math.max(0, currentBlock.y + delta.y);
        
        // 檢查附近的連接點
        const nearbyConnections = findNearbyConnectionPoints(blockId, newX, newY);
        
        if (nearbyConnections.length > 0) {
          const closestConnection = nearbyConnections[0];
          const targetBlock = workspaceBlocks[closestConnection.blockId];
          
          if (targetBlock) {
            // 自動吸附到連接點
            if (closestConnection.connectionType === 'next') {
              newX = targetBlock.x;
              newY = targetBlock.y - 60; // 垂直連接
              connectBlocks(blockId, closestConnection.blockId, 'next');
            } else if (closestConnection.connectionType === 'output') {
              newX = targetBlock.x - 200; // 水平連接
              newY = targetBlock.y;
              connectBlocks(blockId, closestConnection.blockId, 'output');
            }
          }
        }
        
        moveBlock(blockId, newX, newY);
      }
    }

    setActiveId(null);
  };

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex">
        {/* 左側拼圖工具區 */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <BlockPalette />
        </div>

        {/* 中間工作區 */}
        <div ref={workspaceRef} className="flex-1 bg-gray-100">
          <Workspace />
        </div>

        {/* 右側程式碼預覽區 */}
        <div className="w-96 bg-white border-l border-gray-200">
          <CodePreview />
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 transform rotate-3 scale-105">
            <BlockRenderer blockId={activeId} isDragging={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};