import React from 'react';
import { useDrop } from 'react-dnd';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { BlockCategory, WorkspaceContext, type UnifiedBlock, type UnifiedDropItem } from '@/features/visual-editor/types/block';
import { getImagePreviewUrl } from '@/features/visual-editor/utils/flexMessageBuilder';
import { getBlockPreviewColorClass } from '@/features/visual-editor/utils/blockVisualStyles';

interface FlexMessageCanvasProps {
  blocks: UnifiedBlock[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onDrop?: (item: UnifiedDropItem) => void;
  onInsert?: (index: number, item: UnifiedDropItem) => void;
  onUpdate?: (index: number, data: Record<string, unknown>) => void;
  onRemove?: (index: number) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
}

const spacingPx: Record<string, number> = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
};

const textSizePx: Record<string, number> = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
};

const imageWidth: Record<string, string> = {
  xxs: '28%',
  xs: '36%',
  sm: '48%',
  md: '62%',
  lg: '76%',
  xl: '88%',
  xxl: '94%',
  '3xl': '100%',
  '4xl': '100%',
  '5xl': '100%',
  full: '100%',
};

const bubbleWidth: Record<string, string> = {
  nano: '230px',
  micro: '260px',
  deca: '300px',
  hecto: '330px',
  kilo: '360px',
  mega: '390px',
};

const borderWidthPx: Record<string, string> = {
  light: '1px',
  normal: '1px',
  medium: '2px',
  'semi-bold': '3px',
  bold: '4px',
};

const radiusPx: Record<string, string> = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '20px',
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const getButtonLabel = (data: Record<string, unknown>) => {
  const action = isPlainObject(data.action) ? data.action : {};
  return asString(action.label, asString(data.text, '按鈕'));
};

const getActionWithLabel = (data: Record<string, unknown>, label: string) => {
  const action = isPlainObject(data.action)
    ? { ...data.action }
    : { type: 'message' };

  action.label = label;
  if (!action.type || action.type === 'message') {
    action.type = 'message';
    action.text = label;
  }

  return action;
};

const aspectRatioValue = (value: unknown): string => {
  const ratio = asString(value, '20:13');
  const [width, height] = ratio.split(':');
  if (!width || !height) return '20 / 13';
  return `${width} / ${height}`;
};

const isSelectableContent = (block: UnifiedBlock) => (
  block.blockType === 'flex-content' || block.blockType === 'flex-layout'
);

const isBoxContainer = (block: UnifiedBlock) => (
  block.blockType === 'flex-container' && block.blockData.containerType === 'box'
);

type IndexedFlexBlock = { block: UnifiedBlock; index: number };
type CanvasContentItem =
  | { kind: 'component'; block: UnifiedBlock; index: number }
  | { kind: 'box'; block: UnifiedBlock; index: number; contentBlocks: IndexedFlexBlock[] };

const buildCanvasContentItems = (sourceBlocks: IndexedFlexBlock[]): CanvasContentItem[] => {
  const items: CanvasContentItem[] = [];
  let hasBodyBox = false;
  let activeBox: Extract<CanvasContentItem, { kind: 'box' }> | null = null;

  const flushActiveBox = () => {
    if (!activeBox) return;
    items.push(activeBox);
    activeBox = null;
  };

  sourceBlocks.forEach(({ block, index }) => {
    if (isBoxContainer(block)) {
      if (!hasBodyBox) {
        hasBodyBox = true;
        return;
      }

      flushActiveBox();
      activeBox = { kind: 'box', block, index, contentBlocks: [] };
      return;
    }

    if (!isSelectableContent(block)) return;

    if (activeBox) {
      activeBox.contentBlocks.push({ block, index });
      return;
    }

    items.push({ kind: 'component', block, index });
  });

  flushActiveBox();
  return items;
};

const getCanvasItemEndIndex = (item: CanvasContentItem) => {
  if (item.kind === 'box' && item.contentBlocks.length > 0) {
    return item.contentBlocks[item.contentBlocks.length - 1].index + 1;
  }

  return item.index + 1;
};

const getContentAppendInsertIndex = (items: CanvasContentItem[], fallbackInsertIndex: number) => {
  if (items.length === 0) return fallbackInsertIndex;
  return getCanvasItemEndIndex(items[items.length - 1]);
};

const getBoxStyle = (data: Record<string, unknown>): React.CSSProperties => {
  const borderWidth = borderWidthPx[asString(data.borderWidth)] || undefined;
  const borderColor = asString(data.borderColor);
  const backgroundColor = asString(data.backgroundColor);
  const paddingAll = spacingPx[asString(data.paddingAll)] ?? 16;

  return {
    backgroundColor: backgroundColor && backgroundColor !== 'transparent' ? backgroundColor : undefined,
    borderColor: borderColor && borderColor !== 'transparent' ? borderColor : undefined,
    borderStyle: borderWidth ? 'solid' : undefined,
    borderWidth,
    borderRadius: radiusPx[asString(data.cornerRadius)] || undefined,
    padding: paddingAll,
    gap: spacingPx[asString(data.spacing, 'md')] ?? 12,
  };
};

const getButtonPreviewStyle = (data: Record<string, unknown>): React.CSSProperties => {
  const style = asString(data.style, 'primary');
  const color = asString(data.color);
  const accentColor = color || '#06C755';
  const height = asString(data.height, 'sm') === 'md' ? 44 : 36;

  if (style === 'link') {
    return {
      minHeight: height,
      color: accentColor,
      backgroundColor: 'transparent',
      border: 'none',
    };
  }

  if (style === 'secondary') {
    return {
      minHeight: height,
      color: '#111827',
      backgroundColor: color || '#f7f8f9',
      border: '1px solid rgba(15, 23, 42, 0.08)',
    };
  }

  return {
    minHeight: height,
    color: '#ffffff',
    backgroundColor: accentColor,
    border: 'none',
  };
};

const createCarouselBubbleDropItem = (): UnifiedDropItem => ({
  blockType: 'flex-container',
  category: BlockCategory.FLEX_CONTAINER,
  blockData: { title: 'Bubble 容器', containerType: 'bubble' },
  compatibility: [WorkspaceContext.FLEX],
});

const renderDropPlacementPreview = (item: UnifiedDropItem | null, orientation: 'vertical' | 'horizontal') => {
  if (!item) return null;

  const data = item.blockData || {};
  const colorClass = getBlockPreviewColorClass(item.blockType);
  const baseClass = [
    colorClass,
    'pointer-events-none shrink-0 border-2 border-dashed shadow-sm transition-all',
  ].join(' ');

  if (item.blockType === 'flex-container') {
    if (data.containerType === 'bubble') {
      return <div className={`${baseClass} h-36 w-full max-w-[390px] rounded-[18px]`} />;
    }

    if (data.containerType === 'carousel') {
      return (
        <div className="flex w-full max-w-[460px] gap-3">
          <div className={`${baseClass} h-32 flex-1 rounded-[18px]`} />
          <div className={`${baseClass} h-32 flex-1 rounded-[18px] opacity-70`} />
        </div>
      );
    }

    if (data.containerType === 'box') {
      return <div className={`${baseClass} min-h-20 w-full rounded-lg`} />;
    }
  }

  if (item.blockType === 'flex-content') {
    if (data.contentType === 'image') {
      return <div className={`${baseClass} aspect-[20/13] w-full max-w-[320px] rounded-md`} />;
    }

    if (data.contentType === 'button') {
      return <div className={`${baseClass} h-10 w-full max-w-[320px] rounded-md`} />;
    }

    if (data.contentType === 'separator') {
      return <div className={`${baseClass} h-2 w-full max-w-[320px] rounded-full`} />;
    }

    return <div className={`${baseClass} h-9 w-full max-w-[320px] rounded-md`} />;
  }

  if (item.blockType === 'flex-layout') {
    return <div className={`${baseClass} h-8 w-full max-w-[320px] rounded-md`} />;
  }

  return (
    <div className={`${baseClass} ${orientation === 'horizontal' ? 'h-16 w-20' : 'h-10 w-full'} rounded-md`} />
  );
};

interface CanvasInsertionZoneProps {
  insertIndex: number;
  orientation: 'vertical' | 'horizontal';
  onInsert?: (index: number, item: UnifiedDropItem) => void;
}

interface CanvasDropSurfaceProps {
  insertIndex: number;
  onInsert?: (index: number, item: UnifiedDropItem) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  role?: string;
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

const CanvasDropSurface: React.FC<CanvasDropSurfaceProps> = ({
  insertIndex,
  onInsert,
  className,
  style,
  children,
  onClick,
  role,
  tabIndex,
  onKeyDown,
}) => {
  const [{ isOver, draggedItem }, drop] = useDrop(() => ({
    accept: 'block',
    drop: (item: UnifiedDropItem, monitor) => {
      if (monitor.didDrop()) return undefined;
      if ('category' in item && onInsert) {
        onInsert(insertIndex, item);
        return { inserted: true };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      draggedItem: monitor.getItem() as UnifiedDropItem | null,
    }),
  }), [insertIndex, onInsert]);

  return (
    <div
      ref={drop}
      className={[
        className || '',
        isOver ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-white' : '',
      ].filter(Boolean).join(' ')}
      style={style}
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      {children}
      {isOver && draggedItem && (
        <div className="mt-3 flex w-full justify-center">
          {renderDropPlacementPreview(draggedItem, 'vertical')}
        </div>
      )}
    </div>
  );
};

const CanvasInsertionZone: React.FC<CanvasInsertionZoneProps> = ({
  insertIndex,
  orientation,
  onInsert,
}) => {
  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept: 'block',
    drop: (item: UnifiedDropItem, monitor) => {
      if (monitor.didDrop()) return undefined;
      if ('category' in item && onInsert) {
        onInsert(insertIndex, item);
        return { inserted: true };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem() as UnifiedDropItem | null,
    }),
  }), [insertIndex, onInsert]);

  if (!canDrop) return null;

  if (orientation === 'horizontal') {
    return (
      <div
        ref={drop}
        className={[
          'flex min-h-16 shrink-0 items-stretch justify-center rounded-md transition-all',
          isOver ? 'w-32 bg-white/75 p-2' : 'w-8 bg-transparent px-2',
        ].join(' ')}
      >
        {isOver && draggedItem ? (
          renderDropPlacementPreview(draggedItem, 'horizontal')
        ) : (
          <div className="w-1 rounded-full bg-emerald-200 transition-colors" />
        )}
      </div>
    );
  }

  return (
    <div
      ref={drop}
      className={[
        'flex shrink-0 items-center rounded-md px-2 transition-all',
        isOver ? 'min-h-24 bg-white/75 py-2' : 'h-6 bg-transparent',
      ].join(' ')}
    >
      {isOver && draggedItem ? (
        renderDropPlacementPreview(draggedItem, 'vertical')
      ) : (
        <div className="h-1 w-full rounded-full bg-emerald-200 transition-colors" />
      )}
    </div>
  );
};

const renderDraggedGhost = (item: UnifiedDropItem | null, isActive: boolean) => {
  if (!item) return null;

  const data = item.blockData || {};
  const activeClass = [
    getBlockPreviewColorClass(item.blockType),
    isActive ? 'shadow-lg opacity-100' : 'opacity-80',
  ].join(' ');

  if (item.blockType === 'flex-container') {
    if (data.containerType === 'bubble') {
      return <div className={`h-48 w-full max-w-[390px] rounded-[18px] border-2 border-dashed ${activeClass}`} />;
    }

    if (data.containerType === 'box') {
      return <div className={`h-32 w-full max-w-[360px] rounded-lg border-2 border-dashed ${activeClass}`} />;
    }

    if (data.containerType === 'carousel') {
      return (
        <div className="flex w-full max-w-[460px] gap-3">
          <div className={`h-40 flex-1 rounded-[18px] border-2 border-dashed ${activeClass}`} />
          <div className={`h-40 flex-1 rounded-[18px] border-2 border-dashed ${activeClass}`} />
        </div>
      );
    }
  }

  if (item.blockType === 'flex-content') {
    if (data.contentType === 'text') {
      return (
        <div className={`w-full max-w-[320px] rounded-md border-2 border-dashed p-3 ${activeClass}`}>
          <div className="h-4 w-2/3 rounded bg-slate-300" />
        </div>
      );
    }

    if (data.contentType === 'image') {
      return (
        <div className={`aspect-[20/13] w-full max-w-[320px] rounded-md border-2 border-dashed ${activeClass}`}>
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-slate-400" />
          </div>
        </div>
      );
    }

    if (data.contentType === 'button') {
      return <div className={`h-10 w-full max-w-[320px] rounded-md border-2 border-dashed ${activeClass}`} />;
    }

    if (data.contentType === 'separator') {
      return (
        <div className="w-full max-w-[320px] px-3">
          <div className={`h-1 rounded-full ${isActive ? 'bg-[#06C755]' : 'bg-emerald-200'}`} />
        </div>
      );
    }
  }

  if (item.blockType === 'flex-layout') {
    return <div className={`h-10 w-full max-w-[320px] rounded-md border-2 border-dashed ${activeClass}`} />;
  }

  return null;
};

const FlexMessageCanvas: React.FC<FlexMessageCanvasProps> = ({
  blocks,
  selectedIndex,
  onSelect,
  onDrop,
  onInsert,
  onUpdate,
}) => {
  const carouselIndex = blocks.findIndex(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'carousel',
  );
  const bubbleIndex = blocks.findIndex(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
  );
  const boxIndex = blocks.findIndex(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'box',
  );
  const bubbleData = bubbleIndex >= 0 ? blocks[bubbleIndex].blockData : {};
  const boxData = boxIndex >= 0 ? blocks[boxIndex].blockData : {};
  const contentItems = React.useMemo(
    () => buildCanvasContentItems(blocks.map((block, index) => ({ block, index }))),
    [blocks],
  );
  const isHorizontal = asString(boxData.layout, 'vertical') === 'horizontal';
  const hasCarousel = carouselIndex >= 0;
  const hasBubble = bubbleIndex >= 0;
  const hasBox = boxIndex >= 0;
  const bodyAppendInsertIndex = getContentAppendInsertIndex(contentItems, blocks.length);
  const carouselGroups = React.useMemo(() => {
    const groups: Array<{
      bubble?: UnifiedBlock;
      bubbleIndex?: number;
      box?: UnifiedBlock;
      boxIndex?: number;
      contentBlocks: Array<{ block: UnifiedBlock; index: number }>;
    }> = [];
    let currentGroup: {
      bubble?: UnifiedBlock;
      bubbleIndex?: number;
      box?: UnifiedBlock;
      boxIndex?: number;
      contentBlocks: Array<{ block: UnifiedBlock; index: number }>;
    } | null = null;

    blocks.forEach((block, index) => {
      if (block.blockType === 'flex-container' && block.blockData.containerType === 'carousel') return;

      if (block.blockType === 'flex-container' && block.blockData.containerType === 'bubble') {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { bubble: block, bubbleIndex: index, contentBlocks: [] };
        return;
      }

      if (!currentGroup) {
        currentGroup = { contentBlocks: [] };
      }

      if (isBoxContainer(block)) {
        if (!currentGroup.box) {
          currentGroup.box = block;
          currentGroup.boxIndex = index;
        }
        currentGroup.contentBlocks.push({ block, index });
        return;
      }

      if (isSelectableContent(block)) {
        currentGroup.contentBlocks.push({ block, index });
      }
    });

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [blocks]);

  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept: 'block',
    drop: (item: UnifiedDropItem, monitor) => {
      if (monitor.didDrop()) return undefined;
      if ('category' in item && onDrop) {
        onDrop(item);
        return { appended: true };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem() as UnifiedDropItem | null,
    }),
  }), [onDrop]);

  const updateBlock = (index: number, patch: Record<string, unknown>) => {
    const current = blocks[index]?.blockData || {};
    onUpdate?.(index, { ...current, ...patch });
  };

  const renderCanvasBlock = (block: UnifiedBlock, index: number) => {
    const data = block.blockData || {};
    const selected = selectedIndex === index;
    const frameClass = [
      'group relative rounded-md transition-all duration-150',
      selected ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-white' : 'hover:ring-2 hover:ring-emerald-200',
    ].join(' ');

    const commonProps = {
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        onSelect(index);
      },
      role: 'button',
      tabIndex: 0,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(index);
        }
      },
    };

    if (block.blockType === 'flex-layout' && data.layoutType === 'spacer') {
      return (
        <div key={block.id || index} className={frameClass} {...commonProps}>
          <div
            className="flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500"
            style={{ minHeight: spacingPx[asString(data.size, 'md')] || 12 }}
          >
            留白
          </div>
        </div>
      );
    }

    if (block.blockType === 'flex-layout' && data.layoutType === 'filler') {
      return (
        <div key={block.id || index} className={frameClass} {...commonProps}>
          <div className="flex min-h-8 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
            自動填滿
          </div>
        </div>
      );
    }

    if (data.contentType === 'text') {
      return (
        <div key={block.id || index} className={frameClass} {...commonProps}>
          <textarea
            aria-label="文字內容"
            value={asString(data.text, '示例文字')}
            onFocus={() => onSelect(index)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(index);
            }}
            onChange={(event) => updateBlock(index, { text: event.target.value })}
            rows={Math.max(1, asString(data.text, '示例文字').split('\n').length)}
            className="block w-full resize-none rounded-sm border border-transparent bg-transparent p-1 leading-snug outline-none transition focus:border-emerald-200 focus:bg-emerald-50/40"
            style={{
              color: asString(data.color, '#111827'),
              fontSize: textSizePx[asString(data.size, 'md')] || 16,
              fontWeight: asString(data.weight) === 'bold' ? 700 : 400,
              fontStyle: asString(data.style) === 'italic' ? 'italic' : 'normal',
              textAlign: asString(data.align, 'start') as React.CSSProperties['textAlign'],
            }}
          />
        </div>
      );
    }

    if (data.contentType === 'image') {
      const previewUrl = getImagePreviewUrl(data);
      const width = imageWidth[asString(data.size, 'full')] || '100%';
      const align = asString(data.align, 'center');
      const justify =
        align === 'start' ? 'flex-start' :
        align === 'end' ? 'flex-end' :
        'center';

      return (
        <div key={block.id || index} className={frameClass} {...commonProps}>
          <div className="flex" style={{ justifyContent: justify }}>
            <div
              className="overflow-hidden rounded-md border border-slate-200 bg-slate-100"
              style={{
                width,
                aspectRatio: aspectRatioValue(data.aspectRatio),
                backgroundColor: asString(data.backgroundColor) || undefined,
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Flex Message 圖片"
                  className="h-full w-full"
                  style={{ objectFit: asString(data.aspectMode, 'cover') === 'fit' ? 'contain' : 'cover' }}
                />
              ) : (
                <div className="flex h-full min-h-24 flex-col items-center justify-center px-3 text-center text-xs text-slate-500">
                  <ImageIcon className="mb-2 h-6 w-6 text-slate-400" />
                  選取圖片積木後，可在右側設定上傳圖片
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (data.contentType === 'button') {
      const label = getButtonLabel(data);
      const previewStyle = getButtonPreviewStyle(data);

      return (
        <div key={block.id || index} className={frameClass} {...commonProps}>
          <div
            className="flex w-full items-center justify-center rounded px-3"
            style={previewStyle}
          >
            <input
              aria-label="按鈕文字"
              value={label}
              onFocus={() => onSelect(index)}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(index);
              }}
              onChange={(event) => updateBlock(index, {
                text: event.target.value,
                action: getActionWithLabel(data, event.target.value),
              })}
              className="bc-flex-button-input w-full border-none bg-transparent text-center text-sm font-semibold text-current outline-none placeholder:text-current/60"
              placeholder="按鈕文字"
            />
          </div>
        </div>
      );
    }

    if (data.contentType === 'separator') {
      return (
        <div key={block.id || index} className={frameClass} {...commonProps}>
          <div className="py-1">
            <div className="h-px w-full" style={{ backgroundColor: asString(data.color, '#d1d5db') }} />
          </div>
        </div>
      );
    }

    return null;
  };

  const renderContentItems = (
    items: CanvasContentItem[],
    fallbackInsertIndex: number,
    orientation: 'vertical' | 'horizontal',
  ) => {
    if (items.length === 0) {
      return (
        <div className="flex min-h-28 flex-col justify-center">
          <CanvasInsertionZone
            insertIndex={fallbackInsertIndex}
            orientation="vertical"
            onInsert={onInsert}
          />
        </div>
      );
    }

    return (
      <>
        <CanvasInsertionZone
          insertIndex={items[0]?.index ?? fallbackInsertIndex}
          orientation={orientation}
          onInsert={onInsert}
        />
        {items.map((item) => (
          <React.Fragment key={item.block.id || item.index}>
            {renderContentItem(item)}
            <CanvasInsertionZone
              insertIndex={getCanvasItemEndIndex(item)}
              orientation={orientation}
              onInsert={onInsert}
            />
          </React.Fragment>
        ))}
      </>
    );
  };

  function renderNestedBox(item: Extract<CanvasContentItem, { kind: 'box' }>) {
    const data = item.block.blockData || {};
    const selected = selectedIndex === item.index;
    const nestedOrientation = asString(data.layout, 'vertical') === 'horizontal' ? 'horizontal' : 'vertical';
    const nestedItems = item.contentBlocks.map(({ block, index }) => ({ kind: 'component' as const, block, index }));
    const nestedAppendInsertIndex = getContentAppendInsertIndex(nestedItems, item.index + 1);
    const frameClass = [
      'group relative rounded-lg border border-slate-200 bg-white/70 transition-all duration-150',
      selected ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-white' : 'hover:ring-2 hover:ring-emerald-200',
    ].join(' ');

    return (
      <CanvasDropSurface
        insertIndex={nestedAppendInsertIndex}
        onInsert={onInsert}
        className={frameClass}
        style={getBoxStyle(data)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(item.index);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(item.index);
          }
        }}
      >
        <div
          className={nestedOrientation === 'horizontal' ? 'flex min-w-0 items-stretch' : 'flex min-w-0 flex-col'}
          style={{ gap: spacingPx[asString(data.spacing, 'md')] ?? 12 }}
        >
          {item.contentBlocks.length === 0 ? (
            <CanvasInsertionZone
              insertIndex={item.index + 1}
              orientation="vertical"
              onInsert={onInsert}
            />
          ) : (
            <>
              <CanvasInsertionZone
                insertIndex={item.contentBlocks[0]?.index ?? item.index + 1}
                orientation={nestedOrientation}
                onInsert={onInsert}
              />
              {item.contentBlocks.map(({ block, index }) => (
                <React.Fragment key={block.id || index}>
                  {renderCanvasBlock(block, index)}
                  <CanvasInsertionZone
                    insertIndex={index + 1}
                    orientation={nestedOrientation}
                    onInsert={onInsert}
                  />
                </React.Fragment>
              ))}
            </>
          )}
        </div>
      </CanvasDropSurface>
    );
  }

  function renderContentItem(item: CanvasContentItem) {
    if (item.kind === 'box') return renderNestedBox(item);
    return renderCanvasBlock(item.block, item.index);
  }

  const renderCanvasContents = () => (
    renderContentItems(contentItems, blocks.length, isHorizontal ? 'horizontal' : 'vertical')
  );

  const renderCarouselGroupContents = (
    group: {
      bubble?: UnifiedBlock;
      bubbleIndex?: number;
      box?: UnifiedBlock;
      boxIndex?: number;
      contentBlocks: Array<{ block: UnifiedBlock; index: number }>;
    },
  ) => {
    const groupBoxData = group.box?.blockData || {};
    const orientation = asString(groupBoxData.layout, 'vertical') === 'horizontal' ? 'horizontal' : 'vertical';
    const fallbackInsertIndex = group.boxIndex !== undefined
      ? group.boxIndex + 1
      : group.bubbleIndex !== undefined
        ? group.bubbleIndex + 1
        : blocks.length;
    const groupItems = buildCanvasContentItems(group.contentBlocks);

    return renderContentItems(groupItems, fallbackInsertIndex, orientation);
  };

  const renderCarouselSurface = () => {
    const groups = carouselGroups.length > 0 ? carouselGroups : [{ contentBlocks: [] }];
    const getGroupFallbackInsertIndex = (group: {
      bubbleIndex?: number;
      boxIndex?: number;
      contentBlocks: Array<{ block: UnifiedBlock; index: number }>;
    }) => (
      group.boxIndex !== undefined
        ? group.boxIndex + 1
        : group.bubbleIndex !== undefined
          ? group.bubbleIndex + 1
          : blocks.length
    );
    const getGroupAppendInsertIndex = (group: {
      bubbleIndex?: number;
      boxIndex?: number;
      contentBlocks: Array<{ block: UnifiedBlock; index: number }>;
    }) => (
      getContentAppendInsertIndex(
        buildCanvasContentItems(group.contentBlocks),
        getGroupFallbackInsertIndex(group),
      )
    );
    const carouselAppendInsertIndex = groups.length > 0
      ? getGroupAppendInsertIndex(groups[groups.length - 1])
      : blocks.length;

    return (
      <CanvasDropSurface
        insertIndex={carouselAppendInsertIndex}
        onInsert={onInsert}
        className={[
          'w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50/40 p-4 transition',
          selectedIndex === carouselIndex ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-[#d9efe3]' : '',
        ].join(' ')}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(carouselIndex);
        }}
      >
        <div className="mb-3 text-xs font-semibold text-emerald-800">
          Carousel
        </div>
        <div className="flex w-full snap-x gap-4 overflow-x-auto pb-2">
          {groups.map((group, groupIndex) => {
            const groupBubbleData = group.bubble?.blockData || {};
            const groupBoxData = group.box?.blockData || {};
            const groupIsHorizontal = asString(groupBoxData.layout, 'vertical') === 'horizontal';

            return (
              <div
                key={group.bubble?.id || `carousel-group-${groupIndex}`}
                className={[
                  'w-[320px] shrink-0 snap-start rounded-[18px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition',
                  selectedIndex === group.bubbleIndex && group.bubbleIndex !== undefined
                    ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-[#d9efe3]'
                    : '',
                ].join(' ')}
                style={{ maxWidth: bubbleWidth[asString(groupBubbleData.size, 'mega')] || '390px' }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (group.bubbleIndex !== undefined) onSelect(group.bubbleIndex);
                }}
              >
                <CanvasDropSurface
                  insertIndex={getGroupAppendInsertIndex(group)}
                  onInsert={onInsert}
                  className={[
                    'min-h-28 rounded-[18px] transition',
                    selectedIndex === group.boxIndex && group.boxIndex !== undefined
                      ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-white'
                      : '',
                  ].join(' ')}
                  style={getBoxStyle(groupBoxData)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (group.boxIndex !== undefined) onSelect(group.boxIndex);
                  }}
                >
                  <div
                    className={groupIsHorizontal ? 'flex min-w-0 items-stretch' : 'flex min-w-0 flex-col'}
                    style={{ gap: spacingPx[asString(groupBoxData.spacing, 'md')] ?? 12 }}
                  >
                    {renderCarouselGroupContents(group)}
                  </div>
                </CanvasDropSurface>
              </div>
            );
          })}
          {groups.length < 12 && (
            <div className="flex w-16 shrink-0 snap-start items-center justify-center">
              <button
                type="button"
                aria-label="新增 Carousel 卡片"
                title="新增 Carousel 卡片"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755] focus-visible:ring-offset-2"
                onClick={(event) => {
                  event.stopPropagation();
                  onInsert?.(carouselAppendInsertIndex, createCarouselBubbleDropItem());
                }}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </CanvasDropSurface>
    );
  };

  const renderCanvasSurface = () => {
    if (blocks.length === 0) {
      return canDrop ? renderDraggedGhost(draggedItem, isOver) : null;
    }

    if (hasCarousel) {
      return renderCarouselSurface();
    }

    if (!hasBubble && !hasBox) {
      return (
        <CanvasDropSurface
          insertIndex={bodyAppendInsertIndex}
          onInsert={onInsert}
          className={isHorizontal ? 'flex min-w-0 items-stretch' : 'flex min-w-0 flex-col'}
          style={{
            gap: spacingPx[asString(boxData.spacing, 'md')] ?? 12,
            maxWidth: bubbleWidth[asString(bubbleData.size, 'mega')] || '390px',
            width: '100%',
          }}
        >
          {renderCanvasContents()}
        </CanvasDropSurface>
      );
    }

    if (!hasBubble && hasBox) {
      return (
        <CanvasDropSurface
          insertIndex={bodyAppendInsertIndex}
          onInsert={onInsert}
          className={[
            'mx-auto min-h-28 w-full rounded-lg border border-dashed border-slate-300 bg-white/45 transition',
            selectedIndex === boxIndex ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-[#d9efe3]' : '',
          ].join(' ')}
          style={{
            ...getBoxStyle(boxData),
            maxWidth: bubbleWidth[asString(bubbleData.size, 'mega')] || '390px',
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(boxIndex);
          }}
        >
          <div
            className={isHorizontal ? 'flex min-w-0 items-stretch' : 'flex min-w-0 flex-col'}
            style={{ gap: spacingPx[asString(boxData.spacing, 'md')] ?? 12 }}
          >
            {renderCanvasContents()}
          </div>
        </CanvasDropSurface>
      );
    }

    return (
      <div
        className={[
          'mx-auto w-full rounded-[18px] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition',
          selectedIndex === bubbleIndex && bubbleIndex >= 0 ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-[#d9efe3]' : '',
        ].join(' ')}
        style={{ maxWidth: bubbleWidth[asString(bubbleData.size, 'mega')] || '390px' }}
        onClick={(event) => {
          event.stopPropagation();
          if (bubbleIndex >= 0) onSelect(bubbleIndex);
        }}
      >
        <CanvasDropSurface
          insertIndex={bodyAppendInsertIndex}
          onInsert={onInsert}
          className={[
            'min-h-28 rounded-[18px] transition',
            selectedIndex === boxIndex && boxIndex >= 0 ? 'ring-2 ring-[#06C755] ring-offset-2 ring-offset-white' : '',
          ].join(' ')}
          style={getBoxStyle(boxData)}
          onClick={(event) => {
            event.stopPropagation();
            if (boxIndex >= 0) onSelect(boxIndex);
          }}
        >
          <div
            className={isHorizontal ? 'flex min-w-0 items-stretch' : 'flex min-w-0 flex-col'}
            style={{ gap: spacingPx[asString(boxData.spacing, 'md')] ?? 12 }}
          >
            {renderCanvasContents()}
          </div>
        </CanvasDropSurface>
      </div>
    );
  };

  return (
    <div
      ref={drop}
      onClick={() => onSelect(null)}
      className={[
        'flex h-full min-h-0 overflow-auto bg-[#d9efe3] p-6 transition',
        isOver ? 'ring-2 ring-inset ring-emerald-300' : '',
      ].join(' ')}
    >
      <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
        {renderCanvasSurface()}
      </div>
    </div>
  );
};

export default FlexMessageCanvas;
