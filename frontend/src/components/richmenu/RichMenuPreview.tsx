import React from 'react';
import type { RichMenuArea, RichMenuBounds } from '@/types/richMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface RichMenuPreviewData {
  name: string;
  chat_bar_text: string;
  size: { width: 2500; height: 1686 | 843 };
  areas: RichMenuArea[];
  image_url?: string;
}

type Props = {
  data?: RichMenuPreviewData | null;
  selectedIndex?: number;
  onSelectArea?: (index: number) => void;
  onCreateArea?: (bounds: RichMenuBounds) => void;
  onUpdateArea?: (index: number, bounds: RichMenuBounds) => void;
  onDeleteArea?: (index: number) => void;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  imageOffset?: { x: number; y: number };
  onImageOffsetChange?: (offset: { x: number; y: number }) => void;
};

const HANDLE = 10;

const RichMenuPreview: React.FC<Props> = ({ data, selectedIndex, onSelectArea, onCreateArea, onUpdateArea, onDeleteArea, imageNaturalWidth, imageNaturalHeight, imageOffset, onImageOffsetChange }) => {
  const widthBase = 2500;
  const heightBase = data?.size?.height || 1686;

  // 互動拖曳狀態
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = React.useState<'idle'|'creating'|'moving'|'resizing'|'panning'>('idle');
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const startRef = React.useRef<{x:number;y:number}>();
  const startBoundsRef = React.useRef<RichMenuBounds>();
  const resizeAnchorRef = React.useRef<'nw'|'ne'|'sw'|'se'>();
  const [draft, setDraft] = React.useState<RichMenuBounds | null>(null);
  const [gridSize, setGridSize] = React.useState<number>(25);
  const [panMode, setPanMode] = React.useState<boolean>(false);

  const getPointBase = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(widthBase, Math.round(rx * widthBase))),
      y: Math.max(0, Math.min(heightBase, Math.round(ry * heightBase)))
    };
  };

  const clampBounds = (b: RichMenuBounds): RichMenuBounds => {
    const x2 = Math.min(widthBase, Math.max(0, b.x + b.width));
    const y2 = Math.min(heightBase, Math.max(0, b.y + b.height));
    const x1 = Math.max(0, Math.min(b.x, x2 - 1));
    const y1 = Math.max(0, Math.min(b.y, y2 - 1));
    return { x: x1, y: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!data) return;
    const el = containerRef.current;
    if (!el) return;
    // panning image
    if (panMode) {
      setDragMode('panning');
      startRef.current = getPointBase(e);
      return;
    }
    // if clicked on handle
    const target = e.target as HTMLElement;
    const role = target.getAttribute('data-role');
    if (role && activeIndex !== null && onUpdateArea) {
      // start resizing
      resizeAnchorRef.current = role as 'nw'|'ne'|'sw'|'se';
      setDragMode('resizing');
      startRef.current = getPointBase(e);
      startBoundsRef.current = data.areas[activeIndex].bounds;
      e.preventDefault();
      return;
    }
    // if clicked on area
    const idxAttr = target.getAttribute('data-area-index');
    if (idxAttr) {
      const idx = parseInt(idxAttr, 10);
      setActiveIndex(idx);
      onSelectArea?.(idx);
      setDragMode('moving');
      startRef.current = getPointBase(e);
      startBoundsRef.current = { ...data.areas[idx].bounds };
      e.preventDefault();
      return;
    }
    // empty space: start creating
    setActiveIndex(null);
    onSelectArea?.(-1);
    setDragMode('creating');
    startRef.current = getPointBase(e);
    setDraft({ x: startRef.current.x, y: startRef.current.y, width: 1, height: 1 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragMode === 'idle') return;
    const p = getPointBase(e);
    if (dragMode === 'panning' && startRef.current && onImageOffsetChange && imageNaturalWidth && imageNaturalHeight) {
      // compute new offset based on delta in base coordinates
      const dx = p.x - startRef.current.x;
      const dy = p.y - startRef.current.y;
      // move reference point for continuous pan
      startRef.current = p;
      const iw = imageNaturalWidth;
      const ih = imageNaturalHeight;
      const scale = Math.max(widthBase / iw, heightBase / ih);
      const dsW = iw * scale;
      const dsH = ih * scale;
      const cur = imageOffset || { x: Math.round((widthBase - dsW) / 2), y: Math.round((heightBase - dsH) / 2) };
      let nx = cur.x + dx;
      let ny = cur.y + dy;
      // clamp so image always covers the canvas
      const minX = widthBase - dsW;
      const minY = heightBase - dsH;
      nx = Math.max(minX, Math.min(0, nx));
      ny = Math.max(minY, Math.min(0, ny));
      onImageOffsetChange({ x: Math.round(nx), y: Math.round(ny) });
      return;
    }
    if (dragMode === 'creating' && startRef.current) {
      const x1 = Math.min(startRef.current.x, p.x);
      const y1 = Math.min(startRef.current.y, p.y);
      const x2 = Math.max(startRef.current.x, p.x);
      const y2 = Math.max(startRef.current.y, p.y);
      setDraft(clampBounds({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 }));
    } else if (dragMode === 'moving' && startRef.current && startBoundsRef.current && activeIndex !== null) {
      const dx = p.x - startRef.current.x;
      const dy = p.y - startRef.current.y;
      const nb = clampBounds({
        x: startBoundsRef.current.x + dx,
        y: startBoundsRef.current.y + dy,
        width: startBoundsRef.current.width,
        height: startBoundsRef.current.height,
      });
      onUpdateArea?.(activeIndex, nb);
    } else if (dragMode === 'resizing' && startRef.current && startBoundsRef.current && activeIndex !== null) {
      const anchor = resizeAnchorRef.current;
      if (!anchor) return;
      let b = { ...startBoundsRef.current } as RichMenuBounds;
      const dx = p.x - startRef.current.x;
      const dy = p.y - startRef.current.y;
      if (anchor.includes('n')) {
        b.y += dy;
        b.height -= dy;
      }
      if (anchor.includes('s')) {
        b.height += dy;
      }
      if (anchor.includes('w')) {
        b.x += dx;
        b.width -= dx;
      }
      if (anchor.includes('e')) {
        b.width += dx;
      }
      b = clampBounds(b);
      onUpdateArea?.(activeIndex, b);
    }
    e.preventDefault();
  };

  const onMouseUp = () => {
    if (dragMode === 'creating') {
      if (draft && draft.width > 3 && draft.height > 3) onCreateArea?.(draft);
      setDraft(null);
    }
    setDragMode('idle');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">即時預覽</h3>
          <div className="text-xs text-muted-foreground">聊天室按鈕：{data?.chat_bar_text || '（未設定）'}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">格線：</div>
          <Select value={String(gridSize)} onValueChange={(v) => setGridSize(Number(v))}>
            <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">細</SelectItem>
              <SelectItem value="25">中</SelectItem>
              <SelectItem value="50">粗</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant={panMode ? 'default' : 'outline'} onClick={() => setPanMode(v => !v)}>
            {panMode ? '調整圖片中' : '調整圖片'}
          </Button>
        </div>
      </div>
      <div className="flex-1 w-full">
        <div
          ref={containerRef}
          className="relative w-full border rounded-md overflow-hidden bg-muted select-none"
          style={{ aspectRatio: `${widthBase} / ${heightBase}`, backgroundImage: `
            linear-gradient(0deg, rgba(0,0,0,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)` , backgroundSize: `${gridSize}px ${gridSize}px`}}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {/* 背景圖片或佔位 */}
          {data?.image_url ? (
            (() => {
              const iw = imageNaturalWidth || 0;
              const ih = imageNaturalHeight || 0;
              const scale = iw && ih ? Math.max(widthBase / iw, heightBase / ih) : 1;
              const dsW = iw * scale;
              const dsH = ih * scale;
              const ox = imageOffset?.x ?? Math.round((widthBase - dsW) / 2);
              const oy = imageOffset?.y ?? Math.round((heightBase - dsH) / 2);
              const left = (ox / widthBase) * 100;
              const top = (oy / heightBase) * 100;
              const w = (dsW / widthBase) * 100;
              const h = (dsH / heightBase) * 100;
              return (
                <img
                  src={data.image_url}
                  alt="richmenu"
                  className="absolute"
                  style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, objectFit: 'cover' }}
                  draggable={false}
                />
              );
            })()
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              尚未上傳選單圖片
            </div>
          )}

          {/* 區塊覆蓋 */}
          {(data?.areas || []).map((a, idx) => {
            const { x, y, width, height } = a.bounds;
            const left = (x / widthBase) * 100;
            const top = (y / heightBase) * 100;
            const w = (width / widthBase) * 100;
            const h = (height / heightBase) * 100;
            const isActive = (selectedIndex ?? activeIndex) === idx;
            const action = a.action as any;
            const summary = action?.type === 'message' ? `回覆：「${action.text || action.data || ''}」`
              : action?.type === 'uri' ? `連結：${action.uri || action.data || ''}`
              : action?.type === 'datetimepicker' ? '選日期/時間'
              : action?.type === 'richmenuswitch' ? `切換選單：${action.richMenuAliasId || ''}`
              : action?.type === 'postback' ? `暗號：${action.data || ''}` : '未設定';
            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    data-area-index={idx}
                    className={`absolute ${isActive ? 'border-2 border-blue-600 bg-blue-500/10' : 'border-2 border-blue-500/70 bg-blue-500/10'}`}
                    style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
                    onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); onSelectArea?.(idx); }}
                    onContextMenu={(e) => { e.preventDefault(); onDeleteArea?.(idx); }}
                  >
                    {/* label */}
                    <div className="absolute -top-5 left-0 text-[10px] bg-blue-600 text-white px-1 rounded">
                      #{idx + 1}
                    </div>
                    {/* hover toolbar */}
                    <div className="absolute right-1 top-1 hidden group-[.area]:block"></div>
                    <div className="absolute right-1 top-1 text-[10px] bg-black/60 text-white rounded px-1 py-0.5 opacity-0 hover:opacity-100 transition">
                      <button className="underline mr-1" onClick={(ev) => { ev.stopPropagation(); onSelectArea?.(idx); }}>編輯</button>
                      <button className="underline" onClick={(ev) => { ev.stopPropagation(); onDeleteArea?.(idx); }}>刪除</button>
                    </div>
                    {/* resize handles */}
                    {isActive && (
                      <>
                        <div data-role="nw" className="absolute -left-[5px] -top-[5px] w-[10px] h-[10px] bg-blue-600 rounded-sm" />
                        <div data-role="ne" className="absolute -right-[5px] -top-[5px] w-[10px] h-[10px] bg-blue-600 rounded-sm" />
                        <div data-role="sw" className="absolute -left-[5px] -bottom-[5px] w-[10px] h-[10px] bg-blue-600 rounded-sm" />
                        <div data-role="se" className="absolute -right-[5px] -bottom-[5px] w-[10px] h-[10px] bg-blue-600 rounded-sm" />
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <div>區塊 {idx + 1}</div>
                    <div className="text-muted-foreground">{summary}</div>
                    <div className="text-muted-foreground">({x}, {y}) {width}×{height}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {/* draft rectangle when creating */}
          {draft && (
            <div
              className="absolute border-2 border-green-500/70 bg-green-500/10"
              style={{ left: `${(draft.x / widthBase) * 100}%`, top: `${(draft.y / heightBase) * 100}%`, width: `${(draft.width / widthBase) * 100}%`, height: `${(draft.height / heightBase) * 100}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RichMenuPreview;
