import React, { useState } from 'react';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import {
  ActionEditor,
  ColorPicker,
  SizeSelector,
  AlignmentSelector,
  MarginPaddingEditor,
  type ActionData,
  type AlignType,
  type GravityType,
} from '../editors';
import type { BlockRendererProps } from './types';

const FlexContentBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-2">
          {block.blockData.contentType === 'text' && (
            <div className="space-y-3">
              <Textarea
                placeholder="文字內容"
                value={(blockData as any).text || ''}
                onChange={(e) => setBlockData({ ...blockData, text: e.target.value })}
                className="text-black"
                rows={2}
              />

              <div className="grid grid-cols-2 gap-2">
                <SizeSelector type="text-size" value={(blockData as any).size || 'md'} onChange={(size) => setBlockData({ ...blockData, size })} label="文字大小" />
                <Select value={(blockData as any).weight || 'regular'} onValueChange={(value) => setBlockData({ ...blockData, weight: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="字重" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">一般</SelectItem>
                    <SelectItem value="bold">粗體</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ColorPicker value={(blockData as any).color || '#000000'} onChange={(color) => setBlockData({ ...blockData, color })} label="文字顏色" />
                <Select value={(blockData as any).style || 'normal'} onValueChange={(value) => setBlockData({ ...blockData, style: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="文字樣式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">一般</SelectItem>
                    <SelectItem value="italic">斜體</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AlignmentSelector
                type="both"
                alignValue={(blockData as any).align as AlignType}
                gravityValue={(blockData as any).gravity as GravityType}
                onAlignChange={(align) => setBlockData({ ...blockData, align })}
                onGravityChange={(gravity) => setBlockData({ ...blockData, gravity })}
                label="對齊設定"
                showVisual={true}
              />

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-white/80">最大行數</label>
                  <Input
                    type="number"
                    value={(blockData as any).maxLines || '0'}
                    onChange={(e) => setBlockData({ ...blockData, maxLines: parseInt(e.target.value) || 0 })}
                    className="text-black"
                    min="0"
                    max="20"
                    placeholder="0=無限制"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/80">自動換行</label>
                  <Select value={(blockData as any).wrap ? 'true' : 'false'} onValueChange={(value) => setBlockData({ ...blockData, wrap: value === 'true' })}>
                    <SelectTrigger className="text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">開啟</SelectItem>
                      <SelectItem value="false">關閉</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/80">彈性比例</label>
                  <Input
                    type="number"
                    value={(blockData as any).flex || '0'}
                    onChange={(e) => setBlockData({ ...blockData, flex: parseInt(e.target.value) || 0 })}
                    className="text-black"
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              <MarginPaddingEditor
                type="margin"
                value={(blockData as any).margin ? { all: (blockData as any).margin } : {}}
                onChange={(margin) => setBlockData({ ...blockData, margin: (margin as any).all || 'none' })}
                label="外邊距"
                showUnifiedMode={true}
              />
            </div>
          )}

          {block.blockData.contentType === 'image' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Input placeholder="圖片 URL" value={(blockData as any).url || ''} onChange={(e) => setBlockData({ ...blockData, url: e.target.value })} className="text-black" />
                {(blockData as any).url && (
                  <PreviewWithRetry src={(blockData as any).url as string} label="圖片預覽" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SizeSelector type="image-size" value={(blockData as any).size || 'full'} onChange={(size) => setBlockData({ ...blockData, size })} label="圖片尺寸" />
                <Select value={(blockData as any).aspectRatio || '20:13'} onValueChange={(value) => setBlockData({ ...blockData, aspectRatio: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="寬高比" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">正方形 (1:1)</SelectItem>
                    <SelectItem value="1.51:1">照片 (1.51:1)</SelectItem>
                    <SelectItem value="20:13">預設 (20:13)</SelectItem>
                    <SelectItem value="16:9">寬螢幕 (16:9)</SelectItem>
                    <SelectItem value="4:3">標準 (4:3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={(blockData as any).aspectMode || 'cover'} onValueChange={(value) => setBlockData({ ...blockData, aspectMode: value })}>
                <SelectTrigger className="text-black">
                  <SelectValue placeholder="顯示模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">填滿 (可能裁切)</SelectItem>
                  <SelectItem value="fit">完整顯示 (可能有空白)</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <AlignmentSelector
                  type="align"
                  alignValue={(blockData as any).align as AlignType}
                  onAlignChange={(align) => setBlockData({ ...blockData, align })}
                  label="圖片對齊"
                  showVisual={true}
                />
                <ColorPicker value={(blockData as any).backgroundColor || 'transparent'} onChange={(backgroundColor) => setBlockData({ ...blockData, backgroundColor })} label="背景顏色" />
              </div>

              <MarginPaddingEditor
                type="margin"
                value={(blockData as any).margin ? { all: (blockData as any).margin } : {}}
                onChange={(margin) => setBlockData({ ...blockData, margin: (margin as any).all || 'none' })}
                label="外邊距"
                showUnifiedMode={true}
              />

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enableImageAction"
                    checked={!!(blockData as any).action}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBlockData({ ...blockData, action: { type: 'uri', label: '圖片', uri: '' } });
                      } else {
                        const newData: any = { ...blockData };
                        delete newData.action;
                        setBlockData(newData);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="enableImageAction" className="text-xs text-white/80">
                    設定點擊動作
                  </label>
                </div>
                {(blockData as any).action && <ActionEditor value={(blockData as any).action as ActionData} onChange={(action) => setBlockData({ ...blockData, action })} label="點擊動作" showLabel={false} />}
              </div>
            </div>
          )}

          {block.blockData.contentType === 'button' && (
            <div className="space-y-2">
              <ActionEditor value={((blockData as any).action as ActionData) || { type: 'postback', label: '' }} onChange={(action) => setBlockData({ ...blockData, action })} label="按鈕動作設定" showLabel={true} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={(blockData as any).height || 'sm'} onValueChange={(value) => setBlockData({ ...blockData, height: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="按鈕高度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm">小按鈕</SelectItem>
                    <SelectItem value="md">中按鈕</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={(blockData as any).style || 'primary'} onValueChange={(value) => setBlockData({ ...blockData, style: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="按鈕樣式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">主要按鈕</SelectItem>
                    <SelectItem value="secondary">次要按鈕</SelectItem>
                    <SelectItem value="link">連結樣式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {block.blockData.contentType === 'separator' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/90">分隔線設定</label>
              <MarginPaddingEditor
                type="margin"
                value={(blockData as any).margin ? (typeof (blockData as any).margin === 'string' ? { all: (blockData as any).margin } : ((blockData as any).margin as any)) : {}}
                onChange={(margin) => setBlockData({ ...blockData, margin })}
                label="邊距設定"
                showUnifiedMode={true}
              />
              <ColorPicker label="分隔線顏色" value={(blockData as any).color} onChange={(color) => setBlockData({ ...blockData, color })} showPresets={true} />
              <div className="text-xs text-white/60 bg-white/5 p-2 rounded">分隔線用於在Flex訊息中創建視覺分割效果</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlexContentBlock;

// 本檔案獨立使用的帶重試預覽元件
const PreviewWithRetry: React.FC<{ src: string; label?: string }> = ({ src, label }) => {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const withBuster = (url: string, n: number) => {
    try {
      const u = new URL(url, window.location.origin);
      u.searchParams.set('_t', String(Date.now()));
      u.searchParams.set('_r', String(n));
      return u.toString();
    } catch {
      return url;
    }
  };
  const actualSrc = attempt === 0 ? src : withBuster(src, attempt);

  return (
    <div className="bg-white/5 p-2 rounded">
      <div className="text-xs text-white/70 mb-1">{label || '圖片預覽'}:</div>
      {!error ? (
        <img
          src={actualSrc}
          alt="圖片預覽"
          className="max-w-full max-h-32 rounded border"
          onError={() => {
            if (attempt < 3) setAttempt((a) => a + 1);
            else setError('圖片載入失敗，請稍後重試或更換 URL');
          }}
        />
      ) : (
        <div className="text-xs text-red-300">{error}</div>
      )}
    </div>
  );
};
