import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import DroppedBlock from './DroppedBlock';
import LazyDroppedBlock from './LazyDroppedBlock';
import { UnifiedBlock, UnifiedDropItem, WorkspaceContext, BlockValidationResult } from '../../types/block';
import { isBlockCompatible } from '../../utils/blockCompatibility';
import { useCompatibilityWorker } from '../../hooks/useCompatibilityWorker';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';


interface DropZoneProps {
  title: string;
  context: WorkspaceContext;
  onDrop?: (item: UnifiedDropItem) => void;
  blocks?: UnifiedBlock[];
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: Record<string, unknown>) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
  onInsert?: (index: number, item: UnifiedDropItem) => void;
  showCompatibilityInfo?: boolean;
  useLazyLoading?: boolean;
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
  showCompatibilityInfo = true,
  useLazyLoading = true 
}) => {
  const [dragValidation, setDragValidation] = useState<BlockValidationResult | null>(null);
  const [hoveredItem, setHoveredItem] = useState<UnifiedDropItem | null>(null);
  
  // 使用 Web Worker 進行非阻塞相容性檢查
  const { checkCompatibility, isWorkerAvailable } = useCompatibilityWorker();

  // 積木已經是統一格式
  const normalizedBlocks: UnifiedBlock[] = blocks;

  const [{ isOver, canDrop: _canDrop }, drop] = useDrop(() => ({
    accept: ['block', 'dropped-block'],
    hover: (item: UnifiedDropItem | { index?: number; block?: UnifiedBlock; id?: string }) => {
      setHoveredItem(item);
      
      try {
        // 檢查是否為重新排序操作（已存在的積木）
        const isReorderOperation = 'index' in item && typeof item.index === 'number';
        const isDroppedBlock = 'id' in item && typeof item.id === 'string' && item.id.includes('dropped-');
        
        console.log('🖱️ DropZone hover 事件:', {
          item: item,
          context: context,
          contextType: typeof context,
          normalizedBlocksCount: normalizedBlocks.length,
          isReorderOperation: isReorderOperation,
          isDroppedBlock: isDroppedBlock,
          timestamp: new Date().toISOString()
        });
        
        // 如果是重新排序操作，跳過相容性檢查
        if (isReorderOperation || isDroppedBlock) {
          console.log('🔄 檢測到重新排序操作，跳過相容性檢查');
          setDragValidation({
            isValid: true,
            reason: '重新排序積木（無需相容性檢查）',
            suggestions: ['您可以自由調整積木的順序']
          });
          return;
        }
        
        // 對新積木執行異步相容性檢查
        const performCompatibilityCheck = async () => {
          try {
            let validation: BlockValidationResult;
            
            if (isWorkerAvailable) {
              // 使用 Web Worker 進行非阻塞檢查
              if ('category' in item) {
                validation = await checkCompatibility(item as UnifiedDropItem, context, normalizedBlocks);
              }
            } else {
              // 後備到同步檢查
              if ('category' in item) {
                validation = isBlockCompatible(item as UnifiedDropItem, context, normalizedBlocks);
              }
            }
            
            console.log('🔍 新積木相容性檢查結果:', validation);
            setDragValidation(validation);
          } catch (error) {
            console.error('❌ 異步相容性檢查失敗:', error);
            // 提供後備驗證
            setDragValidation({
              isValid: true,
              reason: '使用後備相容性檢查（寬鬆政策）',
              suggestions: ['如果遇到問題，請重新整理頁面']
            });
          }
        };
        
        // 執行異步檢查
        performCompatibilityCheck();
      } catch (error) {
        console.error('❌ 積木相容性檢查失敗:', error, {
          item: item,
          context: context,
          itemType: 'category' in item ? 'unified' : ('index' in item ? 'reorder' : 'legacy'),
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // 提供更詳細的錯誤處理
        setDragValidation({
          isValid: false,
          reason: `積木相容性檢查時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
          suggestions: [
            '請檢查瀏覽器控制台以獲取更多詳細信息',
            '嘗試重新整理頁面',
            '如果問題持續存在，請聯繫技術支援'
          ]
        });
      }
    },
    drop: (item: UnifiedDropItem | { index?: number; block?: UnifiedBlock; id?: string }) => {
      try {
        // 檢查是否為重新排序操作
        const isReorderOperation = 'index' in item && typeof item.index === 'number';
        const isDroppedBlock = 'id' in item && typeof item.id === 'string' && item.id.includes('dropped-');
        
        console.log('🎯 DropZone drop 事件:', {
          item: item,
          context: context,
          normalizedBlocksCount: normalizedBlocks.length,
          isReorderOperation: isReorderOperation,
          isDroppedBlock: isDroppedBlock,
          timestamp: new Date().toISOString()
        });
        
        // 如果是重新排序操作，不執行相容性檢查，直接允許
        if (isReorderOperation || isDroppedBlock) {
          console.log('🔄 檢測到重新排序操作，直接允許放置');
          // 重新排序操作由 DroppedBlock 組件內部處理，這裡不需要調用 onDrop
          return;
        }
        
        // 只對新積木進行最終驗證
        if (!('category' in item)) {
          return; // 不支援非統一格式積木
        }
        
        const finalValidation = isBlockCompatible(item as UnifiedDropItem, context, normalizedBlocks);
        
        console.log('🔍 Drop 事件：最終相容性檢查結果:', finalValidation);
        
        if (finalValidation.isValid && onDrop) {
          console.log('✅ 新積木放置成功，調用 onDrop');
          onDrop(item as UnifiedDropItem);
        } else if (!finalValidation.isValid) {
          console.warn('⚠️ 新積木無法放置:', finalValidation.reason, finalValidation.suggestions);
          // 在某些情況下，即使顯示警告也允許放置（寬鬆政策）
          if (finalValidation.reason?.includes('寬鬆政策') || finalValidation.reason?.includes('建議')) {
            console.log('🔄 應用寬鬆政策，允許放置');
            if (onDrop) {
              onDrop(item as UnifiedDropItem);
            }
          }
        } else {
          console.warn('⚠️ onDrop 函數未定義或其他問題');
        }
      } catch (error) {
        console.error('❌ 積木放置時發生錯誤:', error, {
          item: item,
          context: context,
          itemType: 'category' in item ? 'unified' : ('index' in item ? 'reorder' : 'legacy'),
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // 即使發生錯誤，也嘗試執行放置操作（容錯機制）
        const isReorderOp = 'index' in item;
        if (!isReorderOp) { // 只對新積木執行容錯放置
          console.log('🔄 嘗試容錯放置');
          if (onDrop) {
            try {
              onDrop(item as UnifiedDropItem);
              console.log('✅ 容錯放置成功');
            } catch (fallbackError) {
              console.error('❌ 容錯放置也失敗:', fallbackError);
            }
          }
        }
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

    // 檢查是否為重新排序操作
    const isReorderOperation = hoveredItem && 
      ('index' in hoveredItem && typeof hoveredItem.index === 'number') ||
      ('id' in hoveredItem && typeof hoveredItem.id === 'string' && hoveredItem.id.includes('dropped-'));

    // 為重新排序操作提供特殊的視覺樣式
    const feedbackClass = isReorderOperation 
      ? 'bg-blue-50 border border-blue-200'
      : (dragValidation.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200');
    
    const iconColor = isReorderOperation ? 'text-blue-600' : (dragValidation.isValid ? 'text-green-600' : 'text-red-600');
    const textColor = isReorderOperation ? 'text-blue-800' : (dragValidation.isValid ? 'text-green-800' : 'text-red-800');
    const reasonColor = isReorderOperation ? 'text-blue-700' : (dragValidation.isValid ? 'text-green-700' : 'text-red-700');

    return (
      <div className={`mt-4 p-3 rounded-lg ${feedbackClass}`}>
        <div className="flex items-center space-x-2">
          {isReorderOperation ? (
            <Info className={`w-4 h-4 ${iconColor}`} />
          ) : dragValidation.isValid ? (
            <CheckCircle className={`w-4 h-4 ${iconColor}`} />
          ) : (
            <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
          )}
          <span className={`text-sm font-medium ${textColor}`}>
            {isReorderOperation 
              ? '重新排序積木' 
              : (dragValidation.isValid ? '可以放置此積木' : '無法放置此積木')
            }
          </span>
        </div>
        
        {dragValidation.reason && (
          <p className={`text-sm mt-1 ${reasonColor}`}>
            {dragValidation.reason}
          </p>
        )}
        
        {dragValidation.suggestions && dragValidation.suggestions.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center space-x-1 mb-1">
              <Info className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">
                {isReorderOperation ? '操作說明：' : '建議：'}
              </span>
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
          blocks.map((block, index) => {
            // 選擇使用延遲載入或傳統載入
            const BlockComponent = useLazyLoading ? LazyDroppedBlock : DroppedBlock;
            
            return (
              <BlockComponent 
                key={`${index}-${Date.now()}`} 
                block={block} 
                index={index}
                onRemove={onRemove}
                onUpdate={onUpdate}
                onMove={onMove}
                onInsert={onInsert}
              />
            );
          })
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