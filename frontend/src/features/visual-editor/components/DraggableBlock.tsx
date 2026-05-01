import React from 'react';
import { useDrag } from 'react-dnd';
import { BlockCategory, WorkspaceContext } from '@/features/visual-editor/types/block';
import { getCategoryFromBlockType, getBlockCompatibility } from '@/features/visual-editor/utils/blockCompatibility';
import { Badge } from '@/components/ui/badge';
import { Info, Zap, MessageSquare, Settings, Square, Type, MousePointer, ArrowRight } from 'lucide-react';

interface BlockData {
  [key: string]: unknown;
}

interface DraggableBlockProps {
  children: React.ReactNode;
  blockType: string;
  blockData: BlockData;
  color?: string;
  showCompatibilityBadge?: boolean;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ 
  children, 
  blockType, 
  blockData, 
  color = "bg-blue-500",
  showCompatibilityBadge = true
}) => {
  // 獲取積木的類別和相容性資訊 - 增強版
  const category = getCategoryFromBlockType(blockType);
  const compatibility = getBlockCompatibility(category);
  
  // React Hook must be called before any early returns
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'block',
    item: () => {
      console.log('🏁 開始拖拽積木:', { blockType, category });
      return { 
        blockType, 
        blockData: blockData || {},
        category,
        compatibility: compatibility || []
      };
    },
    end: (item, monitor) => {
      const didDrop = monitor.didDrop();
      console.log('🏁 拖拽結束:', { 
        blockType, 
        category, 
        didDrop,
        dropResult: monitor.getDropResult()
      });
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [blockType, blockData, category, compatibility]);

  // 調試資訊
  console.log('📦 DraggableBlock 初始化:', {
    blockType,
    category,
    compatibility,
    blockDataKeys: Object.keys(blockData || {}),
    timestamp: new Date().toISOString()
  });

  // 增強的積木數據完整性檢查
  if (!blockType) {
    console.error('❌ DraggableBlock: blockType 未定義', { blockType, category, blockData });
    return (
      <div className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm border border-red-600">
        ⚠️ 錯誤: blockType 未定義
      </div>
    );
  }
  
  if (!category) {
    console.error('❌ DraggableBlock: 類別無效', { blockType, category, blockData });
    return (
      <div className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm border border-orange-600">
        ⚠️ 警告: 類別無效 ({blockType})
      </div>
    );
  }
  
  if (!compatibility || compatibility.length === 0) {
    console.warn('⚠️ DraggableBlock: 缺少相容性資訊', { blockType, category, compatibility });
    // 不阻斷渲染，但發出警告
  }
  
  if (!blockData || Object.keys(blockData).length === 0) {
    console.warn('⚠️ DraggableBlock: blockData 為空或未定義', { blockType, category, blockData });
  }

  // 獲取類別圖示
  const getCategoryIcon = (category: BlockCategory) => {
    const iconClass = "w-3 h-3";
    switch (category) {
      case BlockCategory.EVENT:
        return <Zap className={iconClass} />;
      case BlockCategory.REPLY:
        return <MessageSquare className={iconClass} />;
      case BlockCategory.CONTROL:
        return <ArrowRight className={iconClass} />;
      case BlockCategory.SETTING:
        return <Settings className={iconClass} />;
      case BlockCategory.FLEX_CONTAINER:
        return <Square className={iconClass} />;
      case BlockCategory.FLEX_CONTENT:
        return <Type className={iconClass} />;
      case BlockCategory.FLEX_LAYOUT:
        return <MousePointer className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  // 獲取相容性描述
  const getCompatibilityText = (compatibility: WorkspaceContext[]) => {
    if (compatibility.length === 2) {
      return "通用";
    } else if (compatibility.includes(WorkspaceContext.LOGIC)) {
      return "邏輯";
    } else if (compatibility.includes(WorkspaceContext.FLEX)) {
      return "Flex";
    }
    return "未知";
  };

  return (
    <div 
      ref={drag}
      className={`relative ${color} cursor-move rounded-[14px] px-3 py-2 text-sm text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getCategoryIcon(category)}
          <span>{children}</span>
        </div>
        
        {showCompatibilityBadge && (
          <Badge 
            variant="secondary" 
            className="ml-2 text-xs bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            {getCompatibilityText(compatibility)}
          </Badge>
        )}
      </div>
      
      {/* 拖拽時的額外視覺提示 */}
      {isDragging && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/50 bg-white/10 pointer-events-none" />
      )}
    </div>
  );
};

export default DraggableBlock;
