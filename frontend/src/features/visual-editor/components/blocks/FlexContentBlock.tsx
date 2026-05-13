import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_CONFIG } from '@/config/apiConfig';
import { useOptionalVisualEditorContext } from '@/features/visual-editor/context/VisualEditorContext';
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
import type { BlockData, BlockRendererProps } from './types';

const fieldGridClass = 'grid grid-cols-1 gap-3 md:grid-cols-2';
const fullFieldClass = 'md:col-span-2';
const settingPanelClass = 'rounded-lg border border-slate-200 bg-white/80 p-3';
const settingLabelClass = 'text-xs font-medium text-slate-600';

const buildMinioProxyUrl = (objectPath?: unknown): string => {
  if (!objectPath || typeof objectPath !== 'string') return '';
  const params = new URLSearchParams({ object_path: objectPath });
  return `${API_CONFIG.UNIFIED.BASE_URL}/minio/proxy?${params.toString()}`;
};

const FlexContentBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData, onCommit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const selectedBotId = useOptionalVisualEditorContext()?.selectedBotId || '';
  const buttonStyle = ((blockData as any).style || 'primary') as string;
  const buttonColorLabel = buttonStyle === 'link' ? '連結文字顏色' : '按鈕背景顏色';

  const commitBlockData = (data: BlockData) => {
    setBlockData(data);
    onCommit?.(data);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: '檔案類型不支援',
        description: '請上傳 JPG、PNG、GIF 或 WebP 格式的圖片',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: '檔案過大',
        description: `圖片大小不能超過 10MB，目前大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBotId) {
      toast({
        title: '缺少 Bot 資訊',
        description: '請先在上方選擇一個 Bot 後再上傳圖片',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${selectedBotId}/upload-flex-message-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let message = `上傳失敗 (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''})`;
        try {
          const errorData = await response.json();
          const detail = errorData?.detail || errorData?.message;
          if (detail) message = `${message}: ${detail}`;
        } catch {
          const text = await response.text().catch(() => '');
          if (text) message = `${message}: ${text}`;
        }
        throw new Error(message);
      }

      const result = await response.json();
      const objectPath = result.data.object_path;
      const publicUrl = result.data.url || buildMinioProxyUrl(objectPath);
      const previewUrl = buildMinioProxyUrl(objectPath) || publicUrl;
      const nextData = {
        ...blockData,
        url: publicUrl,
        previewUrl,
        imageObjectPath: objectPath,
        imageFilename: result.data.filename,
        imageContentType: result.data.content_type,
        imageSize: result.data.size,
      };

      commitBlockData(nextData);
      toast({
        title: '上傳成功',
        description: `圖片已儲存至 Flex Message 圖片資料夾 (${(file.size / 1024).toFixed(2)}KB)`,
      });
    } catch (error) {
      console.error('Flex Message 圖片上傳失敗:', error);
      toast({
        title: '上傳失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-3 space-y-3">
          {block.blockData.contentType === 'text' && (
            <div className="space-y-3">
              <div className={`${settingPanelClass} ${fullFieldClass}`}>
                <label className={settingLabelClass}>文字內容</label>
                <Textarea
                  placeholder="文字內容"
                  value={(blockData as any).text || ''}
                  onChange={(e) => setBlockData({ ...blockData, text: e.target.value })}
                  className="mt-2 text-black"
                  rows={2}
                />
              </div>

              <div className={fieldGridClass}>
                <SizeSelector type="text-size" value={(blockData as any).size || 'md'} onChange={(size) => setBlockData({ ...blockData, size })} label="文字大小" />
                <div className="space-y-1">
                  <label className={settingLabelClass}>字重</label>
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

                <ColorPicker value={(blockData as any).color || '#000000'} onChange={(color) => setBlockData({ ...blockData, color })} label="文字顏色" />
                <div className="space-y-1">
                  <label className={settingLabelClass}>文字樣式</label>
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

                <div className={fullFieldClass}>
                  <AlignmentSelector
                    type="both"
                    alignValue={(blockData as any).align as AlignType}
                    gravityValue={(blockData as any).gravity as GravityType}
                    onAlignChange={(align) => setBlockData({ ...blockData, align })}
                    onGravityChange={(gravity) => setBlockData({ ...blockData, gravity })}
                    label="對齊設定"
                    showVisual={true}
                  />
                </div>

                <div className="space-y-1">
                  <label className={settingLabelClass}>最大行數</label>
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
                  <label className={settingLabelClass}>自動換行</label>
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
                  <label className={settingLabelClass}>彈性比例</label>
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
              <div className={settingPanelClass}>
                <label className={settingLabelClass}>圖片檔案</label>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageUpload} className="hidden" />
                <div className="mt-2 flex flex-col gap-3">
                  <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-10 w-full whitespace-nowrap">
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? '上傳中...' : ((blockData as any).imageObjectPath || (blockData as any).url ? '更換圖片' : '上傳圖片')}
                  </Button>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                    {(blockData as any).imageFilename ? (
                      <span>目前圖片：{(blockData as any).imageFilename}</span>
                    ) : (
                      <span>尚未上傳圖片，畫布中會顯示圖片位置。</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  支援 JPG、PNG、GIF、WebP，最大 10MB。
                </div>
                {(blockData as any).imageObjectPath && (
                  <div className="mt-2 truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    {(blockData as any).imageObjectPath}
                  </div>
                )}
              </div>

              <div className={fieldGridClass}>
                <SizeSelector type="image-size" value={(blockData as any).size || 'full'} onChange={(size) => setBlockData({ ...blockData, size })} label="圖片尺寸" />
                <div className="space-y-1">
                  <label className={settingLabelClass}>寬高比</label>
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

                <div className="space-y-1">
                  <label className={settingLabelClass}>顯示模式</label>
                  <Select value={(blockData as any).aspectMode || 'cover'} onValueChange={(value) => setBlockData({ ...blockData, aspectMode: value })}>
                    <SelectTrigger className="text-black">
                      <SelectValue placeholder="顯示模式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">填滿 (可能裁切)</SelectItem>
                      <SelectItem value="fit">完整顯示 (可能有空白)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ColorPicker value={(blockData as any).backgroundColor || 'transparent'} onChange={(backgroundColor) => setBlockData({ ...blockData, backgroundColor })} label="背景顏色" />

                <div className={fullFieldClass}>
                  <AlignmentSelector
                    type="align"
                    alignValue={(blockData as any).align as AlignType}
                    onAlignChange={(align) => setBlockData({ ...blockData, align })}
                    label="圖片對齊"
                    showVisual={true}
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

              <div className={settingPanelClass}>
                <div className="flex items-center gap-2">
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
                  <label htmlFor="enableImageAction" className={settingLabelClass}>
                    設定點擊動作
                  </label>
                </div>
                {(blockData as any).action && (
                  <div className="mt-3">
                    <ActionEditor value={(blockData as any).action as ActionData} onChange={(action) => setBlockData({ ...blockData, action })} label="點擊動作" showLabel={false} />
                  </div>
                )}
              </div>
            </div>
          )}

          {block.blockData.contentType === 'button' && (
            <div className="space-y-3">
              <ActionEditor value={((blockData as any).action as ActionData) || { type: 'postback', label: '' }} onChange={(action) => setBlockData({ ...blockData, action })} label="按鈕動作設定" showLabel={true} />
              <div className={fieldGridClass}>
                <div className="space-y-1">
                  <label className={settingLabelClass}>按鈕高度</label>
                  <Select value={(blockData as any).height || 'sm'} onValueChange={(value) => setBlockData({ ...blockData, height: value })}>
                    <SelectTrigger className="text-black">
                      <SelectValue placeholder="按鈕高度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">小按鈕</SelectItem>
                      <SelectItem value="md">中按鈕</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className={settingLabelClass}>按鈕樣式</label>
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
                <ColorPicker
                  value={((blockData as any).color as string | undefined) || ''}
                  onChange={(color) => setBlockData({ ...blockData, color })}
                  label={buttonColorLabel}
                  placeholder="例如：#06C755"
                />
              </div>
            </div>
          )}

          {block.blockData.contentType === 'separator' && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-800">分隔線設定</div>
              <MarginPaddingEditor
                type="margin"
                value={(blockData as any).margin ? (typeof (blockData as any).margin === 'string' ? { all: (blockData as any).margin } : ((blockData as any).margin as any)) : {}}
                onChange={(margin) => setBlockData({ ...blockData, margin })}
                label="邊距設定"
                showUnifiedMode={true}
              />
              <ColorPicker label="分隔線顏色" value={(blockData as any).color} onChange={(color) => setBlockData({ ...blockData, color })} showPresets={true} />
              <div className="rounded bg-slate-50 p-2 text-xs text-slate-500">分隔線用於在 Flex 訊息中建立視覺分割效果</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlexContentBlock;
