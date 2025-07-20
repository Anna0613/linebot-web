import React from 'react';
import { useVisualEditorStore } from '../../stores/visualEditorStore';

export const ConnectionLines: React.FC = () => {
  const { workspaceBlocks } = useVisualEditorStore();

  const renderConnection = (sourceBlock: any, targetBlock: any, connectionType: 'next' | 'output') => {
    if (!sourceBlock || !targetBlock) return null;

    let sourceX: number, sourceY: number, targetX: number, targetY: number;

    if (connectionType === 'next') {
      // 垂直連接（下一個語句）
      sourceX = sourceBlock.x + 96; // 區塊寬度的一半
      sourceY = sourceBlock.y + 60; // 區塊底部
      targetX = targetBlock.x + 96;
      targetY = targetBlock.y; // 目標區塊頂部
    } else {
      // 水平連接（輸出到輸入）
      sourceX = sourceBlock.x + 192; // 區塊右側
      sourceY = sourceBlock.y + 30; // 區塊中間
      targetX = targetBlock.x; // 目標區塊左側
      targetY = targetBlock.y + 30;
    }

    // 計算連接線路徑
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    let pathData: string;
    
    if (connectionType === 'next') {
      // 垂直連接使用簡單的直線
      pathData = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    } else {
      // 水平連接使用曲線
      pathData = `M ${sourceX} ${sourceY} C ${sourceX + 50} ${sourceY}, ${targetX - 50} ${targetY}, ${targetX} ${targetY}`;
    }

    return (
      <path
        key={`${sourceBlock.id}-${targetBlock.id}-${connectionType}`}
        d={pathData}
        stroke={connectionType === 'next' ? '#3b82f6' : '#8b5cf6'}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className="drop-shadow-sm"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}
      />
    );
  };

  return (
    <svg 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    >
      {Object.entries(workspaceBlocks).map(([blockId, block]) => {
        const connections = [];
        
        // 渲染 next 連接
        if (block.connections.next) {
          const targetBlock = workspaceBlocks[block.connections.next];
          if (targetBlock) {
            connections.push(renderConnection(block, targetBlock, 'next'));
          }
        }
        
        // 渲染 output 連接
        if (block.connections.output) {
          const targetBlock = workspaceBlocks[block.connections.output];
          if (targetBlock) {
            connections.push(renderConnection(block, targetBlock, 'output'));
          }
        }
        
        return connections;
      })}
    </svg>
  );
};