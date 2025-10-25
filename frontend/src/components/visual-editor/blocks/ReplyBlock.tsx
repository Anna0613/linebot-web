import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Upload, Link as LinkIcon } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { useFlexMessageCache } from '../../../hooks/useFlexMessageCache';
import type { FlexMessageSummary } from '../../../services/visualEditorApi';
import { useVisualEditorContext } from '../../../contexts/VisualEditorContext';
import type { BlockRendererProps } from './types';
import { API_CONFIG } from '../../../config/apiConfig';

const ReplyBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData, onCommit }) => {
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [flexMessages, setFlexMessages] = useState<FlexMessageSummary[]>([]);
  const { getFlexMessages, isLoading: loadingFlexMessages } = useFlexMessageCache();

  // 取得當前選擇的 Bot ID（如果 Context 存在）
  let selectedBotId = '';
  try {
    const ctx = useVisualEditorContext();
    selectedBotId = ctx.selectedBotId;
  } catch {
    // ignore when provider not present
  }

  const replyType = block.blockData.replyType;
  useEffect(() => {
    const loadFlexMessages = async () => {
      if (block.blockType === 'reply' && replyType === 'flex') {
        try {
          const messages = await getFlexMessages();
          setFlexMessages(messages);
        } catch (error) {
          console.error('Error occurred:', error);
          setFlexMessages([]);
        }
      }
    };
    loadFlexMessages();
  }, [block.blockType, replyType, getFlexMessages]);

  const handleFlexMessageSelect = (value: string) => {
    const selectedMessage = flexMessages.find((msg) => msg.id === value);
    if (selectedMessage) {
      setBlockData({
        ...blockData,
        flexMessageId: value,
        flexMessageName: selectedMessage.name,
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: '檔案類型不支援',
        description: `請上傳 JPG、PNG、GIF 或 WebP 格式的圖片`,
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

    setIsUploading(true);
    try {
      let botId = selectedBotId;
      if (!botId) {
        const pathParts = window.location.pathname.split('/');
        botId = pathParts[pathParts.indexOf('bots') + 1];
      }
      if (!botId || botId === 'visual-editor') {
        toast({
          title: '缺少 Bot 資訊',
          description: '請先在上方選擇一個 Bot 後再上傳圖片',
          variant: 'destructive',
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const uploadUrl = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/upload-logic-template-image`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let message = `上傳失敗 (HTTP ${response.status}${response.statusText ? ' ' + response.statusText : ''})`;
        try {
          const errorData = await response.json();
          const extra = (errorData && (errorData.detail || errorData.message));
          if (extra) message = `${message}: ${extra}`;
        } catch {
          try {
            const text = await response.text();
            if (text) message = `${message}: ${text}`;
          } catch (_e) {
            // ignore non-JSON body
          }
        }
        throw new Error(message);
      }

      const result = await response.json();
      const imageUrl = result.data.url;
      const newData = {
        ...blockData,
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      } as any;
      setBlockData(newData);
      // 立即要求父層保存，避免使用者未按「儲存設定」而遺失
      onCommit?.(newData);

      toast({ title: '上傳成功', description: `圖片已成功上傳 (${(file.size / 1024).toFixed(2)}KB)` });
    } catch (error) {
      console.error('圖片上傳失敗:', error);
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
        <div className="mt-2 space-y-2">
          {block.blockData.replyType === 'flex' ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-white/80">選擇FLEX訊息模板:</div>
              <Select value={(blockData as any).flexMessageId || ''} onValueChange={handleFlexMessageSelect} disabled={loadingFlexMessages}>
                <SelectTrigger className="text-black">
                  <SelectValue placeholder={loadingFlexMessages ? '載入中...' : '選擇FLEX訊息模板'} />
                </SelectTrigger>
                <SelectContent>
                  {flexMessages.length === 0 && !loadingFlexMessages ? (
                    <SelectItem value="no-templates" disabled>
                      沒有可用的FLEX訊息模板
                    </SelectItem>
                  ) : (
                    flexMessages.map((message) => (
                      <SelectItem key={message.id} value={message.id}>
                        {message.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {(blockData as any).flexMessageName && <div className="text-xs text-white/60">已選擇: {(blockData as any).flexMessageName}</div>}
            </div>
          ) : (blockData as any).replyType === 'flex' ? (
            <div className="space-y-2">
              <label className="text-xs text-white/80">Flex 訊息 JSON 內容：</label>
              <Textarea
                placeholder={'請輸入 Flex 訊息 JSON，例如：\n{\n  "type": "bubble",\n  "body": {\n    "type": "box",\n    "layout": "vertical",\n    "contents": [\n      {\n        "type": "text",\n        "text": "Hello World",\n        "size": "md",\n        "weight": "regular",\n        "color": "#000000"\n      }\n    ]\n  }\n}'}
                value={typeof (blockData as any).flexContent === 'string' ? (blockData as any).flexContent : JSON.stringify((blockData as any).flexContent || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setBlockData({ ...blockData, flexContent: parsed });
                  } catch {
                    setBlockData({ ...blockData, flexContent: e.target.value });
                  }
                }}
                className="text-black font-mono text-xs"
                rows={8}
              />
            </div>
          ) : block.blockData.replyType === 'image' ? (
            <div className="space-y-3">
              <label className="text-xs text-white/80 dark:text-white/80">圖片回覆設定：</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={imageUploadMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => setImageUploadMode('upload')}
                  className={`flex-1 ${imageUploadMode === 'upload' ? '' : 'text-foreground'}`}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  上傳圖片
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={imageUploadMode === 'url' ? 'default' : 'outline'}
                  onClick={() => setImageUploadMode('url')}
                  className={`flex-1 ${imageUploadMode === 'url' ? '' : 'text-foreground'}`}
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  輸入網址
                </Button>
              </div>

              {imageUploadMode === 'upload' ? (
                <div className="space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageUpload} className="hidden" />
                  <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? '上傳中...' : '選擇圖片並上傳'}
                  </Button>
                  <div className="text-xs text-white/60">支援 JPG、PNG、GIF、WebP 格式，最大 10MB</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input placeholder="原始圖片URL (必填)" value={(blockData as any).originalContentUrl || ''} onChange={(e) => setBlockData({ ...blockData, originalContentUrl: e.target.value })} className="text-black" />
                  <Input placeholder="預覽圖片URL (必填)" value={(blockData as any).previewImageUrl || ''} onChange={(e) => setBlockData({ ...blockData, previewImageUrl: e.target.value })} className="text-black" />
                  <div className="text-xs text-white/60">• 原始圖片: 用戶點擊時顯示的高解析度圖片<br/>• 預覽圖片: 聊天室中顯示的縮圖 (建議 240x240px)</div>
                </div>
              )}

              {(blockData as any).originalContentUrl && (
                <PreviewWithRetry
                  src={(blockData as any).previewImageUrl || (blockData as any).originalContentUrl}
                  label="圖片預覽"
                />
              )}
            </div>
          ) : block.blockData.replyType === 'sticker' ? (
            <div className="space-y-2">
              <label className="text-xs text-white/80">貼圖回覆設定：</label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="貼圖包ID" value={(blockData as any).packageId || ''} onChange={(e) => setBlockData({ ...blockData, packageId: e.target.value })} className="text-black" />
                <Input placeholder="貼圖ID" value={(blockData as any).stickerId || ''} onChange={(e) => setBlockData({ ...blockData, stickerId: e.target.value })} className="text-black" />
              </div>
              <div className="text-xs text-white/60">常用貼圖包：<br/>• 包ID 1: LINE 官方貼圖 (貼圖ID: 1-17)<br/>• 包ID 2: LINE 表情符號 (貼圖ID: 144-180)<br/>• 包ID 3: 熊大兔兔 (貼圖ID: 180-259)</div>
              <div className="bg-white/5 p-2 rounded">
                <div className="text-xs text-white/70 mb-1">快速選擇:</div>
                <div className="flex flex-wrap gap-1">
                  {[
                    { packageId: '1', stickerId: '1', name: '😊' },
                    { packageId: '1', stickerId: '2', name: '😢' },
                    { packageId: '1', stickerId: '3', name: '😍' },
                    { packageId: '1', stickerId: '4', name: '😂' },
                    { packageId: '1', stickerId: '5', name: '😡' },
                    { packageId: '2', stickerId: '144', name: '👍' },
                    { packageId: '2', stickerId: '145', name: '👎' },
                    { packageId: '2', stickerId: '146', name: '❤️' },
                  ].map((sticker, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => setBlockData({ ...blockData, packageId: sticker.packageId, stickerId: sticker.stickerId })}
                    >
                      {sticker.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-white/80">回覆文字內容：</label>
              <Textarea placeholder="請輸入回覆內容 (例如: 321)" value={String((blockData as any).text || '')} onChange={(e) => setBlockData({ ...blockData, text: e.target.value })} className="text-black" rows={3} />
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="text-xs text-white/70 mt-1">
          {block.blockData.replyType === 'flex' ? (
            (block.blockData as any).flexMessageName ? (
              <div>FLEX模板: {(block.blockData as any).flexMessageName}</div>
            ) : (block.blockData as any).flexContent && Object.keys((block.blockData as any).flexContent).length > 0 ? (
              <div>
                <div>自定義 Flex 訊息</div>
                <div className="text-white/50 truncate">
                  {typeof (block.blockData as any).flexContent === 'string'
                    ? (block.blockData as any).flexContent.substring(0, 50) + '...'
                    : JSON.stringify((block.blockData as any).flexContent).substring(0, 50) + '...'}
                </div>
              </div>
            ) : (
              <div className="text-orange-300">請設定 Flex 訊息內容</div>
            )
          ) : block.blockData.replyType === 'image' ? (
            (block.blockData as any).originalContentUrl && (block.blockData as any).previewImageUrl ? (
              <div className="space-y-1">
                <div>圖片回覆: 已設定圖片</div>
                <div className="text-white/50 text-xs">預覽: {(block.blockData as any).previewImageUrl.substring(0, 30)}...</div>
              </div>
            ) : (
              <div className="text-orange-300">請設定圖片URL</div>
            )
          ) : block.blockData.replyType === 'sticker' ? (
            (block.blockData as any).packageId && (block.blockData as any).stickerId ? (
              <div>貼圖回覆: 包{(block.blockData as any).packageId} - 圖{(block.blockData as any).stickerId}</div>
            ) : (
              <div className="text-orange-300">請設定貼圖ID</div>
            )
          ) : (block.blockData as any).text || (block.blockData as any).content ? (
            <div>回覆內容: "{(block.blockData as any).text || (block.blockData as any).content}"</div>
          ) : (
            <div className="text-orange-300">請設定回覆內容</div>
          )}
        </div>
      )}
    </div>
  );
};

// 帶重試的圖片預覽（最多 3 次，失敗顯示錯誤訊息）
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
      // 非絕對 URL（如 data:）直接回傳
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
            if (attempt < 3) {
              setAttempt((a) => a + 1);
            } else {
              setError('圖片載入失敗，請稍後重試或重新上傳');
            }
          }}
        />
      ) : (
        <div className="text-xs text-red-300">{error}</div>
      )}
    </div>
  );
};

export default ReplyBlock;
