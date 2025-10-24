import React, { useEffect, useRef, useState, memo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '../ui/button';
import { X, Settings, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import type { Block, BlockData } from './blocks';
import {
  EventBlock,
  ReplyBlock,
  FlexContentBlock,
  FlexContainerBlock,
  FlexLayoutBlock,
  ControlBlock,
  SettingBlock,
} from './blocks';

interface DroppedBlockProps {
  block: Block;
  index: number;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: BlockData) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
  onInsert?: (index: number, item: Block) => void;
}

const DroppedBlock: React.FC<DroppedBlockProps> = memo(
  ({ block, index, onRemove, onUpdate, onMove, onInsert }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [blockData, setBlockData] = useState<BlockData>(block.blockData || {});
    const [showInsertZone, setShowInsertZone] = useState<'above' | 'below' | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setBlockData(block.blockData || {});
    }, [block.blockData]);

    const [{ isDragging }, drag] = useDrag({
      type: 'dropped-block',
      item: () => ({ index, block, id: `dropped-${index}` }),
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    const [{ isOver }, drop] = useDrop({
      accept: ['block', 'dropped-block'],
      hover: (item: Block & { index?: number; type?: string }, monitor) => {
        if (!ref.current) return;

        if (item.type === 'dropped-block' || (item.index !== undefined && typeof item.index === 'number')) {
          const dragIndex = item.index as number;
          const hoverIndex = index;
          if (dragIndex === hoverIndex) return;

          const hoverBoundingRect = ref.current.getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          if (!clientOffset) return;
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (hoverClientY < hoverMiddleY / 2) setShowInsertZone('above');
          else if (hoverClientY > hoverBoundingRect.height - hoverMiddleY / 2) setShowInsertZone('below');
          else setShowInsertZone(null);

          if (
            (dragIndex < hoverIndex && hoverClientY > hoverMiddleY) ||
            (dragIndex > hoverIndex && hoverClientY < hoverMiddleY)
          ) {
            if (onMove) {
              onMove(dragIndex, hoverIndex);
              (item as any).index = hoverIndex;
            }
          }
        } else {
          const hoverBoundingRect = ref.current.getBoundingClientRect();
          const clientOffset = monitor.getClientOffset();
          if (!clientOffset) return;
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          setShowInsertZone(hoverClientY < hoverMiddleY ? 'above' : 'below');
        }
      },
      drop: (item: Block & { index?: number; blockType?: string }, monitor) => {
        if (!ref.current) return;
        if (item.blockType && onInsert) {
          const hoverBoundingRect = ref.current.getBoundingClientRect();
          const clientOffset = monitor.getClientOffset();
          if (!clientOffset) return;
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const insertIndex = hoverClientY < hoverMiddleY ? index : index + 1;
          onInsert(insertIndex, item);
        }
        setShowInsertZone(null);
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    });

    const handleMouseLeave = () => setShowInsertZone(null);
    drag(drop(ref));

    const getBlockColor = (blockType: string): string => {
      const colorMap: Record<string, string> = {
        event: 'bg-orange-500',
        reply: 'bg-green-500',
        control: 'bg-purple-500',
        setting: 'bg-gray-500',
        'flex-container': 'bg-indigo-500',
        'flex-content': 'bg-blue-500',
        'flex-layout': 'bg-teal-500',
      };
      return colorMap[blockType] || 'bg-blue-500';
    };

    const renderBlockContent = () => {
      const commit = (data: BlockData) => {
        setBlockData(data);
        if (onUpdate) onUpdate(index, data);
      };
      switch (block.blockType) {
        case 'event':
          return (
            <EventBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        case 'reply':
          return (
            <ReplyBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        case 'flex-content':
          return (
            <FlexContentBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        case 'flex-container':
          return (
            <FlexContainerBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        case 'flex-layout':
          return (
            <FlexLayoutBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        case 'control':
          return (
            <ControlBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        case 'setting':
          return (
            <SettingBlock
              block={block}
              index={index}
              isEditing={isEditing}
              blockData={blockData}
              setBlockData={setBlockData}
              onCommit={commit}
            />
          );
        default:
          return (
            <div>
              <div className="font-medium">{block.blockData.title}</div>
            </div>
          );
      }
    };

    return (
      <div className="relative">
        {showInsertZone === 'above' && (
          <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-400 rounded-full z-10 shadow-lg">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
          </div>
        )}

        <div
          ref={ref}
          onMouseLeave={handleMouseLeave}
          className={`${getBlockColor(block.blockType)} text-white p-3 rounded-lg shadow-sm transition-all duration-200 ${
            isDragging ? 'opacity-50 scale-95 rotate-2' : 'opacity-100 scale-100'
          } ${isOver ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <div className="pt-1 cursor-move hover:bg-white/20 p-1 rounded">
                <GripVertical className="h-4 w-4 text-white/70" />
              </div>
              <div className="flex-1">{renderBlockContent()}</div>
            </div>
            <div className="flex items-center space-x-1 ml-2">
              {index > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={() => onMove && onMove(index, index - 1)}
                  title="向上移動"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => onMove && onMove(index, index + 1)}
                title="向下移動"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => setIsEditing(!isEditing)}
                title="編輯設定"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => onRemove && onRemove(index)}
                title="刪除積木"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {isEditing && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (onUpdate) onUpdate(index, blockData);
                  setIsEditing(false);
                }}
              >
                儲存設定
              </Button>
            </div>
          )}
        </div>

        {showInsertZone === 'below' && (
          <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-400 rounded-full z-10 shadow-lg">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.block === nextProps.block &&
    prevProps.index === nextProps.index &&
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onMove === nextProps.onMove &&
    prevProps.onInsert === nextProps.onInsert,
);

DroppedBlock.displayName = 'DroppedBlock';

export default DroppedBlock;
