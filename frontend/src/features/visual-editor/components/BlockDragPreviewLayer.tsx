import React from 'react';
import { useDragLayer } from 'react-dnd';
import { Square, Type, MousePointer, Zap, MessageSquare, Settings, ArrowRight } from 'lucide-react';
import { BlockCategory } from '@/features/visual-editor/types/block';
import { getBlockPreviewColorClass } from '@/features/visual-editor/utils/blockVisualStyles';

type DragPreviewItem = {
  blockType?: string;
  category?: BlockCategory;
  blockData?: Record<string, unknown>;
  block?: {
    blockType?: string;
    blockData?: Record<string, unknown>;
    category?: BlockCategory;
  };
};

const getPreviewBlock = (item: DragPreviewItem | null) => {
  if (!item) return null;
  const block = item.block || item;
  return {
    blockType: block.blockType || 'setting',
    category: block.category || item.category,
    blockData: block.blockData || {},
  };
};

const getPreviewLabel = (blockData: Record<string, unknown>, blockType: string) => {
  if (typeof blockData.title === 'string' && blockData.title) return blockData.title;
  if (blockData.containerType === 'box') return 'Box 容器';
  if (blockData.containerType === 'bubble') return 'Bubble 容器';
  if (blockData.containerType === 'carousel') return 'Carousel 容器';
  if (blockData.contentType === 'text') return '文字';
  if (blockData.contentType === 'image') return '圖片';
  if (blockData.contentType === 'button') return '按鈕';
  if (blockData.contentType === 'separator') return '分隔線';
  return blockType;
};

const getIcon = (category?: BlockCategory) => {
  switch (category) {
    case BlockCategory.EVENT:
      return Zap;
    case BlockCategory.REPLY:
      return MessageSquare;
    case BlockCategory.CONTROL:
      return ArrowRight;
    case BlockCategory.SETTING:
      return Settings;
    case BlockCategory.FLEX_CONTENT:
      return Type;
    case BlockCategory.FLEX_LAYOUT:
      return MousePointer;
    case BlockCategory.FLEX_CONTAINER:
    default:
      return Square;
  }
};

const BlockDragPreviewLayer: React.FC = () => {
  const { item, isDragging, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem() as DragPreviewItem | null,
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset(),
  }));

  const previewBlock = getPreviewBlock(item);

  if (!isDragging || !currentOffset || !previewBlock) return null;

  const Icon = getIcon(previewBlock.category);
  const transform = `translate(${currentOffset.x}px, ${currentOffset.y}px)`;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1000]">
      <div
        className={[
          getBlockPreviewColorClass(previewBlock.blockType),
          'w-56 rounded-lg border border-l-4 px-3 py-2 text-sm font-semibold shadow-lg',
        ].join(' ')}
        style={{ transform }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {getPreviewLabel(previewBlock.blockData, previewBlock.blockType)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BlockDragPreviewLayer;
