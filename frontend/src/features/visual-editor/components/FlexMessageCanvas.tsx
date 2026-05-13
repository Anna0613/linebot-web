import React from 'react';
import { useDrop } from 'react-dnd';
import { Image as ImageIcon } from 'lucide-react';
import type { UnifiedBlock, UnifiedDropItem } from '@/features/visual-editor/types/block';
import { getImagePreviewUrl } from '@/features/visual-editor/utils/flexMessageBuilder';

interface FlexMessageCanvasProps {
  blocks: UnifiedBlock[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onDrop?: (item: UnifiedDropItem) => void;
  onInsert?: (index: number, item: UnifiedDropItem) => void;
  onUpdate?: (index: number, data: Record<string, unknown>) => void;
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

interface CanvasInsertionZoneProps {
  insertIndex: number;
  orientation: 'vertical' | 'horizontal';
  onInsert?: (index: number, item: UnifiedDropItem) => void;
}

const CanvasInsertionZone: React.FC<CanvasInsertionZoneProps> = ({
  insertIndex,
  orientation,
  onInsert,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
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
    }),
  }), [insertIndex, onInsert]);

  if (!canDrop) return null;

  if (orientation === 'horizontal') {
    return (
      <div
        ref={drop}
        className={[
          'flex min-h-16 w-6 shrink-0 items-stretch justify-center rounded-md px-2 transition-all',
          isOver ? 'bg-emerald-50' : 'bg-transparent',
        ].join(' ')}
      >
        <div className={[
          'w-1 rounded-full transition-colors',
          isOver ? 'bg-[#06C755]' : 'bg-emerald-200',
        ].join(' ')} />
      </div>
    );
  }

  return (
    <div
      ref={drop}
      className={[
        'flex h-6 shrink-0 items-center rounded-md px-2 transition-all',
        isOver ? 'bg-emerald-50' : 'bg-transparent',
      ].join(' ')}
    >
      <div className={[
        'h-1 w-full rounded-full transition-colors',
        isOver ? 'bg-[#06C755]' : 'bg-emerald-200',
      ].join(' ')} />
    </div>
  );
};

const renderDraggedGhost = (item: UnifiedDropItem | null, isActive: boolean) => {
  if (!item) return null;

  const data = item.blockData || {};
  const activeClass = isActive ? 'border-[#06C755] bg-white shadow-lg' : 'border-emerald-200 bg-white/80';

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
  const bubbleIndex = blocks.findIndex(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'bubble',
  );
  const boxIndex = blocks.findIndex(
    (block) => block.blockType === 'flex-container' && block.blockData.containerType === 'box',
  );
  const bubbleData = bubbleIndex >= 0 ? blocks[bubbleIndex].blockData : {};
  const boxData = boxIndex >= 0 ? blocks[boxIndex].blockData : {};
  const contentBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => isSelectableContent(block));
  const isHorizontal = asString(boxData.layout, 'vertical') === 'horizontal';
  const hasBubble = bubbleIndex >= 0;
  const hasBox = boxIndex >= 0;

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

  const renderCanvasContents = () => {
    const orientation = isHorizontal ? 'horizontal' : 'vertical';

    if (contentBlocks.length === 0) {
      return (
        <div className="flex min-h-28 flex-col justify-center">
          <CanvasInsertionZone
            insertIndex={blocks.length}
            orientation="vertical"
            onInsert={onInsert}
          />
        </div>
      );
    }

    return (
      <>
        <CanvasInsertionZone
          insertIndex={contentBlocks[0]?.index ?? blocks.length}
          orientation={orientation}
          onInsert={onInsert}
        />
        {contentBlocks.map(({ block, index }) => (
          <React.Fragment key={block.id || index}>
            {renderCanvasBlock(block, index)}
            <CanvasInsertionZone
              insertIndex={index + 1}
              orientation={orientation}
              onInsert={onInsert}
            />
          </React.Fragment>
        ))}
      </>
    );
  };

  const renderCanvasSurface = () => {
    if (blocks.length === 0) {
      return canDrop ? renderDraggedGhost(draggedItem, isOver) : null;
    }

    if (!hasBubble && !hasBox) {
      return (
        <div
          className={isHorizontal ? 'flex min-w-0 items-stretch' : 'flex min-w-0 flex-col'}
          style={{
            gap: spacingPx[asString(boxData.spacing, 'md')] ?? 12,
            maxWidth: bubbleWidth[asString(bubbleData.size, 'mega')] || '390px',
            width: '100%',
          }}
        >
          {renderCanvasContents()}
        </div>
      );
    }

    if (!hasBubble && hasBox) {
      return (
        <div
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
        </div>
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
        <div
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
        </div>
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
