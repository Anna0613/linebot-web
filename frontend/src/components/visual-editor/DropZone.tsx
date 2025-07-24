import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import DroppedBlock from './DroppedBlock';
import { UnifiedBlock, UnifiedDropItem, WorkspaceContext, BlockValidationResult } from '../../types/block';
import { isBlockCompatible, migrateBlock } from '../../utils/blockCompatibility';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

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

interface DropZoneProps {
  title: string;
  context: WorkspaceContext;                    // 工作區上下文
  onDrop?: (item: UnifiedDropItem | LegacyDropItem) => void;
  blocks?: (UnifiedBlock | LegacyBlock)[];     // 支援新舊格式
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: LegacyBlockData) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;  // 新增：移動積木
  onInsert?: (index: number, item: any) => void;             // 新增：插入積木
  showCompatibilityInfo?: boolean;             // 是否顯示相容性資訊
}

const DropZone: React.FC<DropZoneProps> = ({ 
  title, 
  context, 
  onDrop, 
  blocks = [], 
  onRemove, 
  onUpdate, 
  onMove,
  onInsert,
  showCompatibilityInfo = true 
}) => {
  const [dragValidation, setDragValidation] = useState<BlockValidationResult | null>(null);
  const [hoveredItem, setHoveredItem] = useState<UnifiedDropItem | LegacyDropItem | null>(null);

  // 轉換舊格式積木到統一格式進行相容性檢查
  const normalizedBlocks: UnifiedBlock[] = blocks.map(block => {
    if ('category' in block) {
      return block as UnifiedBlock;
    } else {
      return migrateBlock(block as LegacyBlock);
    }
  });

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['block', 'dropped-block'],
    hover: (item: UnifiedDropItem | LegacyDropItem) => {
      setHoveredItem(item);
      
      try {
        // 執行相容性檢查
        let validation: BlockValidationResult;
        if ('category' in item) {
          validation = isBlockCompatible(item as UnifiedDropItem, context, normalizedBlocks);
        } else {
          // 轉換舊格式積木進行檢查
          const migratedBlock = migrateBlock(item as LegacyDropItem);
          validation = isBlockCompatible(migratedBlock, context, normalizedBlocks);
        }
        
        setDragValidation(validation);
      } catch (error) {
        console.error('積木相容性檢查失敗:', error);
        setDragValidation({
          isValid: false,
          reason: '積木相容性檢查時發生錯誤',
          suggestions: ['請重新整理頁面或聯繫技術支援']
        });
      }
    },
    drop: (item: UnifiedDropItem | LegacyDropItem) => {
      try {
        // 最終驗證
        let finalValidation: BlockValidationResult;
        if ('category' in item) {
          finalValidation = isBlockCompatible(item as UnifiedDropItem, context, normalizedBlocks);
        } else {
          const migratedBlock = migrateBlock(item as LegacyDropItem);
          finalValidation = isBlockCompatible(migratedBlock, context, normalizedBlocks);
        }
        
        if (finalValidation.isValid && onDrop) {
          onDrop(item);
        } else if (!finalValidation.isValid) {
          console.warn('積木無法放置:', finalValidation.reason);
        }
      } catch (error) {
        console.error('積木放置時發生錯誤:', error);
      } finally {
        // 清除狀態
        setDragValidation(null);
        setHoveredItem(null);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: dragValidation?.isValid ?? true
    }),
  }), [context, normalizedBlocks, onDrop, title]);

  // 根據驗證結果決定樣式
  const getDropZoneStyle = () => {
    if (!isOver) return 'border-gray-300 bg-white';
    
    if (dragValidation?.isValid === false) {
      return 'border-red-400 bg-red-50';
    }
    
    return 'border-blue-400 bg-blue-50';
  };

  // 渲染相容性提示
  const renderCompatibilityFeedback = () => {
    if (!isOver || !dragValidation || !showCompatibilityInfo) return null;

    return (
      <div className={`mt-4 p-3 rounded-lg ${
        dragValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center space-x-2">
          {dragValidation.isValid ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            dragValidation.isValid ? 'text-green-800' : 'text-red-800'
          }`}>
            {dragValidation.isValid ? '可以放置此積木' : '無法放置此積木'}
          </span>
        </div>
        
        {dragValidation.reason && (
          <p className={`text-sm mt-1 ${
            dragValidation.isValid ? 'text-green-700' : 'text-red-700'
          }`}>
            {dragValidation.reason}
          </p>
        )}
        
        {dragValidation.suggestions && dragValidation.suggestions.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center space-x-1 mb-1">
              <Info className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">建議：</span>
            </div>
            <ul className="text-xs text-blue-700 space-y-1">
              {dragValidation.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-1">
                  <span>•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={drop}
      className={`border-2 border-dashed rounded-lg p-4 h-full flex flex-col transition-all duration-200 ${getDropZoneStyle()}`}
    >
      <h3 className="text-lg font-medium text-gray-600 mb-4 flex-shrink-0">{title}</h3>
      
      {/* 上下文提示 */}
      <div className="mb-4 text-sm text-gray-500 flex-shrink-0">
        當前模式：<span className="font-medium">
          {context === WorkspaceContext.LOGIC ? '邏輯編輯器' : 'Flex 設計器'}
        </span>
        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
          {context || 'undefined'}
        </span>
      </div>
      
      <div className="space-y-4 flex-1 overflow-auto min-h-0">
        {blocks.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <div className="mb-2">
              從左側選擇積木並拖拽到這裡開始建立您的 LINE Bot
            </div>
            <div className="text-xs">
              {context === WorkspaceContext.LOGIC 
                ? '支援邏輯積木、控制積木和相容的 Flex 積木' 
                : '支援 Flex 積木、佈局積木和相容的邏輯積木'
              }
            </div>
          </div>
        ) : (
          blocks.map((block, index) => (
            <DroppedBlock 
              key={`${index}-${Date.now()}`} 
              block={block} 
              index={index}
              onRemove={onRemove}
              onUpdate={onUpdate}
              onMove={onMove}
              onInsert={onInsert}
            />
          ))
        )}
      </div>
      
      {/* 相容性反饋 */}
      <div className="flex-shrink-0">
        {renderCompatibilityFeedback()}
      </div>
    </div>
  );
};

export default DropZone;