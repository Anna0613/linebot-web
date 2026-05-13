import React, { useEffect, useRef, useState, memo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getBlockColorClass } from '@/features/visual-editor/utils/blockVisualStyles';

interface DroppedBlockProps {
  block: Block;
  index: number;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: BlockData) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
  onInsert?: (index: number, item: Block) => void;
  isSelected?: boolean;
  onSelect?: (index: number) => void;
}

const DroppedBlock: React.FC<DroppedBlockProps> = memo(
  ({ block, index, onRemove, onUpdate, onMove, onInsert, isSelected = false, onSelect }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [blockData, setBlockData] = useState<BlockData>(block.blockData || {});
    const [draftData, setDraftData] = useState<BlockData>(block.blockData || {});
    const [showInsertZone, setShowInsertZone] = useState<'above' | 'below' | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setBlockData(block.blockData || {});
      if (!isSettingsOpen) {
        setDraftData(block.blockData || {});
      }
    }, [block.blockData, isSettingsOpen]);

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
              // 保持拖曳資料的 index 更新，避免抖動
              type MutableDroppedItem = Block & { index?: number };
              (item as MutableDroppedItem).index = hoverIndex;
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

    const openSettings = () => {
      setDraftData(blockData);
      setIsSettingsOpen(true);
    };

    const saveSettings = () => {
      setBlockData(draftData);
      if (onUpdate) onUpdate(index, draftData);
      setIsSettingsOpen(false);
    };

    const commitFromEditor = (data: BlockData) => {
      setDraftData(data);
      setBlockData(data);
      if (onUpdate) onUpdate(index, data);
    };

    const renderBlockContent = (
      editing: boolean,
      data: BlockData,
      setData: React.Dispatch<React.SetStateAction<BlockData>>,
      onEditorCommit?: (data: BlockData) => void,
    ) => {
      const commit = (data: BlockData) => {
        setData(data);
        onEditorCommit?.(data);
      };
      switch (block.blockType) {
        case 'event':
          return (
            <EventBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
              onCommit={commit}
            />
          );
        case 'reply':
          return (
            <ReplyBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
              onCommit={commit}
            />
          );
        case 'flex-content':
          return (
            <FlexContentBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
              onCommit={commit}
            />
          );
        case 'flex-container':
          return (
            <FlexContainerBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
              onCommit={commit}
            />
          );
        case 'flex-layout':
          return (
            <FlexLayoutBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
              onCommit={commit}
            />
          );
        case 'control':
          return (
            <ControlBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
              onCommit={commit}
            />
          );
        case 'setting':
          return (
            <SettingBlock
              block={block}
              index={index}
              isEditing={editing}
              blockData={data}
              setBlockData={setData}
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
          onClick={() => onSelect?.(index)}
          className={`${getBlockColorClass(block.blockType)} rounded-lg border border-l-4 p-3 shadow-sm transition-all duration-200 ${
            isDragging ? 'opacity-50 scale-95 rotate-2' : 'opacity-100 scale-100'
          } ${isOver ? 'ring-2 ring-emerald-300 ring-opacity-60' : ''} ${
            isSelected ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-white' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <div className="shrink-0 cursor-move rounded-sm p-1 pt-1 hover:bg-black/5">
                <GripVertical className="h-4 w-4 text-current opacity-60" />
              </div>
              <div className="min-w-0 flex-1">{renderBlockContent(false, blockData, setBlockData)}</div>
            </div>
            <div className="ml-2 flex shrink-0 items-center space-x-1">
              {index > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-current opacity-75 hover:bg-black/5 hover:opacity-100"
                  onClick={() => onMove && onMove(index, index - 1)}
                  title="向上移動"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-current opacity-75 hover:bg-black/5 hover:opacity-100"
                onClick={() => onMove && onMove(index, index + 1)}
                title="向下移動"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-current opacity-75 hover:bg-black/5 hover:opacity-100"
                onClick={openSettings}
                title="編輯設定"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-current opacity-75 hover:bg-black/5 hover:opacity-100"
                onClick={() => onRemove && onRemove(index)}
                title="刪除積木"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="app-panel-strong flex max-h-[86vh] max-w-3xl flex-col overflow-hidden p-0 text-[color:var(--bc-ink)] sm:rounded-lg">
            <DialogHeader className="border-b border-[color:var(--bc-line-2)] px-5 py-4">
              <DialogTitle className="text-base text-[color:var(--bc-ink)]">
                {String(block.blockData.title || '積木設定')}
              </DialogTitle>
              <DialogDescription className="text-[color:var(--bc-ink-2)]">
                調整設定不會改變畫布中積木高度，儲存後才套用到流程。
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto bg-[color:var(--bc-bg-2)] px-5 py-4">
              {renderBlockContent(true, draftData, setDraftData, commitFromEditor)}
            </div>

            <DialogFooter className="border-t border-[color:var(--bc-line-2)] px-5 py-4">
              <Button
                type="button"
                variant="ghost"
                className="app-secondary-button h-10 min-h-10 px-4"
                onClick={() => {
                  setDraftData(blockData);
                  setIsSettingsOpen(false);
                }}
              >
                取消
              </Button>
              <Button type="button" className="app-primary-button h-10 min-h-10 px-4" onClick={saveSettings}>
                儲存設定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    prevProps.onInsert === nextProps.onInsert &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect,
);

DroppedBlock.displayName = 'DroppedBlock';

export default DroppedBlock;
