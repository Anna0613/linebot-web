import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useVisualEditorStore } from '../../stores/visualEditorStore';
import { BlockRenderer } from './BlockRenderer';
import { ConnectionLines } from './ConnectionLines';

export const Workspace: React.FC = () => {
  const { workspaceBlocks } = useVisualEditorStore();
  
  const { isOver, setNodeRef } = useDroppable({
    id: 'workspace'
  });

  return (
    <div 
      ref={setNodeRef}
      className={`
        h-full relative overflow-auto p-4
        ${isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-gray-100'}
        transition-all duration-200
      `}
      style={{
        backgroundImage: `
          radial-gradient(circle, #e2e8f0 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}
    >
      {Object.keys(workspaceBlocks).length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">🧩</div>
            <h3 className="text-lg font-medium mb-2">開始建立你的 LINE Bot</h3>
            <p className="text-sm">從左側拖拽區塊到這裡開始編程</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* 連接線層 */}
          <ConnectionLines />
          
          {/* 拼圖區塊層 */}
          {Object.entries(workspaceBlocks).map(([blockId, block]) => (
            <div
              key={blockId}
              className="absolute"
              style={{
                left: block.x,
                top: block.y,
                zIndex: 10
              }}
            >
              <BlockRenderer 
                blockId={blockId} 
                isDragging={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};