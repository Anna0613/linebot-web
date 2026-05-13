import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, FileCode2, ListTree, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import DropZone from './DropZone';
import {
  FlexContainerBlock,
  FlexContentBlock,
  FlexLayoutBlock,
  type BlockData,
} from './blocks';
import type { UnifiedBlock, UnifiedDropItem, WorkspaceContext } from '@/features/visual-editor/types/block';
import { generateFlexMessageFromBlocks } from '@/features/visual-editor/utils/flexMessageBuilder';

interface FlexMessageInspectorProps {
  blocks: UnifiedBlock[];
  selectedIndex: number | null;
  selectedBlock?: UnifiedBlock;
  context: WorkspaceContext;
  onDrop?: (item: UnifiedDropItem) => void;
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, data: Record<string, unknown>) => void;
  onMove?: (dragIndex: number, hoverIndex: number) => void;
  onInsert?: (index: number, item: UnifiedDropItem) => void;
  onSelectBlock?: (index: number) => void;
}

const getFlexBlockDisplayName = (block?: UnifiedBlock): string => {
  if (!block) return '尚未選取元件';
  const data = block.blockData || {};
  if (block.blockType === 'flex-container') {
    if (data.containerType === 'bubble') return '訊息外框';
    if (data.containerType === 'box') return '內容區塊';
    if (data.containerType === 'carousel') return '輪播容器';
    return '容器';
  }
  if (block.blockType === 'flex-layout') {
    if (data.layoutType === 'spacer') return '留白';
    if (data.layoutType === 'filler') return '自動填滿';
    return '佈局';
  }
  if (data.contentType === 'text') return '文字';
  if (data.contentType === 'image') return '圖片';
  if (data.contentType === 'button') return '按鈕';
  if (data.contentType === 'separator') return '分隔線';
  return String(data.title || '元件');
};

const getBlockHelpText = (block?: UnifiedBlock): string => {
  if (!block) return '請先在左側畫布點選一個文字、圖片、按鈕或容器。';
  const data = block.blockData || {};
  if (data.contentType === 'text') return '修改文字內容、大小、顏色、對齊與換行方式。';
  if (data.contentType === 'image') return '上傳圖片，調整顯示比例、尺寸與點擊動作。';
  if (data.contentType === 'button') return '設定按鈕文字、樣式與使用者點擊後要做的事。';
  if (data.contentType === 'separator') return '調整分隔線顏色與上下留白。';
  if (data.containerType === 'box') return '控制內容的排列方向、間距、背景、邊框與內距。';
  if (data.containerType === 'bubble') return '調整整張訊息卡片的大小與文字方向。';
  if (data.layoutType === 'spacer') return '調整元件之間的留白高度。';
  if (data.layoutType === 'filler') return '調整自動填滿空間的比例。';
  return '調整這個元件的詳細設定。';
};

const FlexMessageInspector: React.FC<FlexMessageInspectorProps> = ({
  blocks,
  selectedIndex,
  selectedBlock,
  context,
  onDrop,
  onRemove,
  onUpdate,
  onMove,
  onInsert,
  onSelectBlock,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('settings');
  const flexMessage = useMemo(() => generateFlexMessageFromBlocks(blocks), [blocks]);
  const jsonText = useMemo(() => JSON.stringify(flexMessage, null, 2), [flexMessage]);

  useEffect(() => {
    if (selectedIndex !== null) {
      setActiveTab('settings');
    }
  }, [selectedIndex]);

  const setSelectedBlockData: React.Dispatch<React.SetStateAction<BlockData>> = (value) => {
    if (selectedIndex === null || !selectedBlock) return;
    const current = selectedBlock.blockData || {};
    const nextData = typeof value === 'function'
      ? value(current)
      : value;
    onUpdate?.(selectedIndex, nextData);
  };

  const commitSelectedBlockData = (data: BlockData) => {
    if (selectedIndex === null || !selectedBlock) return;
    onUpdate?.(selectedIndex, data);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast({ title: '已複製', description: 'Flex Message JSON 已複製到剪貼簿' });
    } catch {
      toast({ title: '無法複製', description: '瀏覽器未允許剪貼簿權限', variant: 'destructive' });
    }
  };

  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'flex-message.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const renderSettings = () => {
    if (selectedIndex === null || !selectedBlock) {
      return (
        <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <SlidersHorizontal className="mb-3 h-7 w-7 text-slate-400" />
          <div className="text-sm font-semibold text-slate-800">選取畫布中的元件</div>
          <p className="mt-1 max-w-xs text-sm leading-5 text-slate-500">
            點一下左側畫布的文字、圖片、按鈕或外框，這裡就會顯示可調整的設定。
          </p>
        </div>
      );
    }

    const sharedProps = {
      block: selectedBlock,
      index: selectedIndex,
      isEditing: true,
      blockData: selectedBlock.blockData || {},
      setBlockData: setSelectedBlockData,
      onCommit: commitSelectedBlockData,
    };

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
          <div className="text-sm font-semibold text-slate-950">
            {getFlexBlockDisplayName(selectedBlock)}
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {getBlockHelpText(selectedBlock)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
          {selectedBlock.blockType === 'flex-content' && (
            <FlexContentBlock {...sharedProps} />
          )}
          {selectedBlock.blockType === 'flex-container' && (
            <FlexContainerBlock {...sharedProps} />
          )}
          {selectedBlock.blockType === 'flex-layout' && (
            <FlexLayoutBlock {...sharedProps} />
          )}
          {!['flex-content', 'flex-container', 'flex-layout'].includes(selectedBlock.blockType) && (
            <div className="text-sm text-slate-500">
              這個元件目前沒有可視化設定。
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/70 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          右側工具
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-slate-950">
          {getFlexBlockDisplayName(selectedBlock)}
        </div>
        <p className="mt-1 text-sm leading-5 text-slate-500">
          先用畫布看結果，再到這裡調整細節。
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid h-10 shrink-0 grid-cols-3 rounded-lg bg-slate-100 p-1">
          <TabsTrigger value="structure" className="h-8 gap-1.5 rounded-md px-2 text-xs">
            <ListTree className="h-3.5 w-3.5" />
            結構
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-8 gap-1.5 rounded-md px-2 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            設定
          </TabsTrigger>
          <TabsTrigger value="json" className="h-8 gap-1.5 rounded-md px-2 text-xs">
            <FileCode2 className="h-3.5 w-3.5" />
            JSON
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" animationDisabled className="m-0 min-h-0 flex-1 overflow-hidden p-3 data-[state=inactive]:hidden">
          <DropZone
            title="結構積木"
            description="由上到下就是 LINE 訊息中的顯示順序。拖曳可排序，也可以用箭頭微調。"
            context={context}
            onDrop={onDrop}
            blocks={blocks}
            onRemove={onRemove}
            onUpdate={onUpdate}
            onMove={onMove}
            onInsert={onInsert}
            showContextHint={false}
            selectedIndex={selectedIndex}
            onSelectBlock={onSelectBlock}
            showReorderFeedback={false}
            emptyTitle="畫布還沒有元件"
            emptyDescription="從左側拖入文字、圖片或按鈕後，這裡會同步顯示結構。"
          />
        </TabsContent>

        <TabsContent value="settings" animationDisabled className="m-0 min-h-0 flex-1 overflow-auto p-3 data-[state=inactive]:hidden">
          {renderSettings()}
        </TabsContent>

        <TabsContent value="json" animationDisabled className="m-0 min-h-0 flex-1 overflow-hidden p-3 data-[state=inactive]:hidden">
          <div className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-slate-950">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div className="text-sm font-semibold text-white">Flex Message JSON</div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyJson} className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  複製
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={downloadJson} className="h-8 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  下載
                </Button>
              </div>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-5 text-emerald-200">
              {jsonText}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FlexMessageInspector;
