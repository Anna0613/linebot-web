import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import RichMenuApi from '@/services/RichMenuApi';
import type { RichMenu, RichMenuArea, RichMenuBounds, RichMenuAction, CreateRichMenuPayload, UpdateRichMenuPayload } from '@/types/richMenu';

type Props = {
  botId: string;
  menu?: RichMenu | null;
  onSaved?: (menu: RichMenu) => void;
  onCancel?: () => void;
  onChangePreview?: (data: {
    name: string;
    chat_bar_text: string;
    size: { width: 2500; height: 1686 | 843 };
    areas: RichMenuArea[];
    image_url?: string;
    image_meta?: { iw: number; ih: number; offset: { x: number; y: number } };
  }) => void;
  onBindPreviewControls?: (controls: {
    createArea: (b: RichMenuBounds) => void;
    updateArea: (index: number, b: RichMenuBounds) => void;
    selectArea: (index: number | null) => void;
    removeArea: (index: number) => void;
    setImageOffset: (offset: { x: number; y: number }) => void;
  }) => void;
  onSelectedIndexChange?: (index: number | null) => void;
};

const emptyBounds: RichMenuBounds = { x: 0, y: 0, width: 1250, height: 843 };
const defaultAction: RichMenuAction = { type: 'postback', data: 'action=demo' };

const RichMenuForm: React.FC<Props> = ({ botId, menu, onSaved, onCancel, onChangePreview, onBindPreviewControls, onSelectedIndexChange }) => {
  const isEdit = !!menu?.id;
  const { toast } = useToast();
  const [name, setName] = useState<string>(menu?.name || 'MainMenu');
  const [chatBarText, setChatBarText] = useState<string>(menu?.chat_bar_text || '開啟選單');
  const isRichMenuSize = (v: unknown): v is { height: number } =>
    !!v && typeof v === 'object' && typeof (v as { height?: unknown }).height === 'number';
  const initialHeightNum = isRichMenuSize(menu?.size) ? (menu!.size as { height: number }).height : 1686;
  const [height, setHeight] = useState<'1686' | '843'>(String(initialHeightNum) === '843' ? '843' : '1686');
  const [selected, setSelected] = useState<boolean>(!!menu?.selected);
  const [areas, setAreas] = useState<RichMenuArea[]>(
    (menu?.areas as RichMenuArea[]) || [
      { bounds: { ...emptyBounds, x: 0, y: 0 }, action: { ...defaultAction, data: 'action=area1' } },
    ]
  );

  // 新增：獲取其他選單列表供 richmenuswitch 使用
  const [availableMenus, setAvailableMenus] = useState<RichMenu[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(menu?.image_url);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [imageMeta, setImageMeta] = useState<{ iw: number; ih: number; offset: { x: number; y: number } } | null>(null);
  const areaInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (menu) {
      setName(menu.name);
      setChatBarText(menu.chat_bar_text);
      setHeight(String(isRichMenuSize(menu.size) ? (menu.size as { height: number }).height : 1686) === '843' ? '843' : '1686');
      setSelected(menu.selected);
      setAreas((menu.areas as RichMenuArea[]) || []);
      setImageUrl(menu.image_url);
    }
  }, [menu]);

  // 載入其他選單列表供 richmenuswitch 使用
  useEffect(() => {
    const loadAvailableMenus = async () => {
      if (!botId) return;
      try {
        const menus = await RichMenuApi.list(botId);
        // 過濾掉當前編輯的選單
        const otherMenus = menus.filter(m => m.id !== menu?.id);
        setAvailableMenus(otherMenus);
      } catch (error) {
        console.error('載入選單列表失敗:', error);
      }
    };
    loadAvailableMenus();
  }, [botId, menu?.id]);

  // 同步預覽資料
  useEffect(() => {
    if (!onChangePreview) return;
    onChangePreview({
      name,
      chat_bar_text: chatBarText,
      size: { width: 2500, height: Number(height) as 1686 | 843 },
      areas,
      image_url: imageUrl,
      image_meta: imageMeta || undefined,
    });
  }, [name, chatBarText, height, areas, imageUrl, imageMeta, onChangePreview]);

  // 將互動控制權綁定給父層（預覽面板）
  useEffect(() => {
    if (!onBindPreviewControls) return;
    onBindPreviewControls({
      createArea: (b) => {
        setAreas(prev => [...prev, { bounds: b, action: { ...defaultAction } }]);
        const next = (areas?.length ?? 0);
        setSelectedAreaIndex(next);
        onSelectedIndexChange?.(next);
      },
      updateArea: (index, b) => {
        setAreas(prev => prev.map((a, i) => i === index ? ({ ...a, bounds: b }) : a));
      },
      selectArea: (index) => {
        setSelectedAreaIndex(index);
        onSelectedIndexChange?.(index);
      },
      removeArea: (index) => {
        setAreas(prev => prev.filter((_, i) => i !== index));
      },
      setImageOffset: (offset) => {
        setImageMeta(prev => prev ? ({ ...prev, offset }) : prev);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas.length, onBindPreviewControls]);

  // 預覽點「編輯」時，僅滾動到該區塊（不聚焦單一欄位，避免欄位高亮）
  useEffect(() => {
    if (selectedAreaIndex == null) return;
    const el = areaInputRefs.current[selectedAreaIndex];
    if (el) {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (_) {
        // ignore
      }
    }
  }, [selectedAreaIndex]);

  const onAddArea = () => {
    const idx = areas.length;
    const newArea: RichMenuArea = {
      bounds: { ...emptyBounds, x: (idx % 2) * 1250, y: idx >= 2 || height === '1686' ? 843 : 0 },
      action: { ...defaultAction, data: `action=area${idx + 1}` },
    };
    setAreas(prev => [...prev, newArea]);
  };

  const onRemoveArea = (index: number) => {
    setAreas(prev => prev.filter((_, i) => i !== index));
  };

  const onChangeArea = (index: number, next: Partial<RichMenuArea>) => {
    setAreas(prev => prev.map((a, i) => (i === index ? ({
      bounds: { ...a.bounds, ...(next.bounds || {}) },
      action: { ...a.action, ...(next.action || {}) },
    }) : a)));
  };

  const payload = useMemo(() => ({
    name,
    chat_bar_text: chatBarText,
    selected,
    size: { width: 2500, height: Number(height) as 1686 | 843 },
    areas,
  }), [name, chatBarText, selected, height, areas]);

  const onSubmit = async (): Promise<RichMenu | undefined> => {
    try {
      setSaving(true);
      let saved: RichMenu;
      if (isEdit && menu) {
        const update: UpdateRichMenuPayload = payload;
        saved = await RichMenuApi.update(botId, menu.id, update);
      } else {
        const create: CreateRichMenuPayload = payload;
        saved = await RichMenuApi.create(botId, create);
      }
      // 若有待上傳圖片，保存後一併上傳（依照目前高度裁切/縮放）
      if (pendingFile) {
        try {
          const blob = await renderProcessedImage(pendingFile);
          const updated = await RichMenuApi.uploadImage(botId, saved.id, blob);
          setImageUrl(updated.image_url);
          toast({ title: '圖片已上傳', description: '已更新選單圖片' });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          toast({ variant: 'destructive', title: '圖片上傳失敗', description: message || '請稍後再試' });
        } finally {
          setPendingFile(null);
        }
      }
      toast({ title: '已保存', description: '功能選單已更新' });
      onSaved?.(saved);
      return saved;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: '保存失敗', description: message || '請稍後再試' });
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const renderProcessedImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          const iw = img.width;
          const ih = img.height;
          const expectedW = 2500;
          const expectedH = Number(height);
          const scale = Math.max(expectedW / iw, expectedH / ih);
          const dsW = iw * scale;
          const dsH = ih * scale;
          const offset = imageMeta?.offset || { x: Math.round((expectedW - dsW) / 2), y: Math.round((expectedH - dsH) / 2) };
          const canvas = document.createElement('canvas');
          canvas.width = expectedW;
          canvas.height = expectedH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('瀏覽器不支援 Canvas'));
          ctx.clearRect(0, 0, expectedW, expectedH);
          // draw scaled image with offset
          ctx.drawImage(img, offset.x, offset.y, dsW, dsH);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('轉換圖片失敗'));
            resolve(blob);
          }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
        };
        img.onerror = () => reject(new Error('載入圖片失敗'));
        img.src = URL.createObjectURL(file);
      } catch (e) {
        reject(e as Error);
      }
    });
  };

  const validateImage = (file: File): Promise<{ iw: number; ih: number }> => {
    return new Promise((resolve, reject) => {
      const allowed = ['image/jpeg', 'image/png'];
      if (!allowed.includes(file.type)) {
        reject(new Error('僅支援 JPG/PNG 圖片'));
        return;
      }
      const maxBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxBytes) {
        reject(new Error('圖片大小請小於 5MB'));
        return;
      }
      const img = new Image();
      img.onload = () => resolve({ iw: img.width, ih: img.height });
      img.onerror = () => reject(new Error('讀取圖片失敗，請更換檔案'));
      img.src = URL.createObjectURL(file);
    });
  };

  const onUploadImage = async (file?: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      const { iw, ih } = await validateImage(file);
      // 預先預覽：計算 cover 比例與置中偏移
      const expectedW = 2500;
      const expectedH = Number(height);
      const scale = Math.max(expectedW / iw, expectedH / ih);
      const dsW = iw * scale;
      const dsH = ih * scale;
      const offset = { x: Math.round((expectedW - dsW) / 2), y: Math.round((expectedH - dsH) / 2) };
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setImageMeta({ iw, ih, offset });
      setPendingFile(file);
      toast({ title: '已選取圖片', description: '可拖曳右側圖片調整顯示位置，最後按「儲存選單」套用。' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: '上傳失敗', description: message || '請稍後再試' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? '編輯功能選單（Rich Menu）' : '新增功能選單（Rich Menu）'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">選單名稱（只在後台顯示）</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="例如：主選單、首頁選單" />
            <p className="mt-1 text-xs text-muted-foreground">方便你在後台辨識，不會顯示給使用者。</p>
          </div>
          <div>
            <Label htmlFor="chatbar">聊天室下方按鈕文字</Label>
            <Input id="chatbar" value={chatBarText} onChange={e => setChatBarText(e.target.value)} placeholder="例如：開啟選單" maxLength={14} />
            <p className="mt-1 text-xs text-muted-foreground">這是使用者在 LINE 聊天室下方看到的按鈕文字（最多 14 字）。</p>
          </div>
          <div>
            <Label>選單大小</Label>
            <Select value={height} onValueChange={v => setHeight(v as '1686' | '843')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="選擇高度" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1686">大（佔滿高度，1686）</SelectItem>
                <SelectItem value="843">小（半高，843）</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">大：佔滿畫面高度；小：只佔一半高度。</p>
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={selected} onCheckedChange={setSelected} id="selected" />
            <Label htmlFor="selected">設為所有人預設選單</Label>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">可點區塊（把圖片切成可點的範圍）</h3>
            <Button variant="secondary" onClick={onAddArea}>新增可點區塊</Button>
          </div>
          <p className="text-xs text-muted-foreground">設定每個可點區塊的位置與動作：位置用「X（左）、Y（上）、寬度、高度」表示，單位為像素。</p>

          <div className="space-y-3">
            {areas.map((area, idx) => (
              <div
                key={idx}
                className={
                  `grid grid-cols-12 gap-2 rounded-md p-3 transition-shadow transition-colors border ` +
                  (selectedAreaIndex === idx
                    ? 'ring-2 ring-blue-500 border-blue-300 shadow-sm bg-blue-50/40'
                    : 'border-border')
                }
                onClick={() => setSelectedAreaIndex(idx)}
              >
                <div className="col-span-12 md:col-span-6 grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">X（左）</Label>
                    <Input ref={el => (areaInputRefs.current[idx] = el)} type="number" value={area.bounds.x} onChange={e => onChangeArea(idx, { bounds: { x: Number(e.target.value) } as Partial<RichMenuBounds> })} />
                  </div>
                  <div>
                    <Label className="text-xs">Y（上）</Label>
                    <Input type="number" value={area.bounds.y} onChange={e => onChangeArea(idx, { bounds: { y: Number(e.target.value) } as Partial<RichMenuBounds> })} />
                  </div>
                  <div>
                    <Label className="text-xs">寬度</Label>
                    <Input type="number" value={area.bounds.width} onChange={e => onChangeArea(idx, { bounds: { width: Number(e.target.value) } as Partial<RichMenuBounds> })} />
                  </div>
                  <div>
                    <Label className="text-xs">高度</Label>
                    <Input type="number" value={area.bounds.height} onChange={e => onChangeArea(idx, { bounds: { height: Number(e.target.value) } as Partial<RichMenuBounds> })} />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">點擊後的動作</Label>
                    <Select value={area.action.type} onValueChange={v => {
                      // 清除舊的 action 資料，根據新類型設定預設值
                      const newAction: RichMenuAction = { type: v as RichMenuAction['type'] };
                      if (v === 'message') {
                        newAction.text = '';
                      } else if (v === 'uri') {
                        newAction.uri = '';
                      } else if (v === 'postback') {
                        newAction.data = '';
                      } else if (v === 'datetimepicker') {
                        newAction.data = '';
                        newAction.mode = 'date';
                      } else if (v === 'richmenuswitch') {
                        newAction.richMenuAliasId = '';
                      }
                      onChangeArea(idx, { action: newAction });
                    }}>
                      <SelectTrigger><SelectValue placeholder="選擇動作" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="message">回覆文字訊息</SelectItem>
                        <SelectItem value="uri">開啟連結（網址）</SelectItem>
                        <SelectItem value="datetimepicker">選日期時間</SelectItem>
                        <SelectItem value="richmenuswitch">切換到其他選單</SelectItem>
                        <SelectItem value="postback">回傳暗號（進階）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    {/* 根據 action 類型顯示不同的輸入欄位和提示 */}
                    {area.action.type === 'message' && (
                      <>
                        <Label className="text-xs">訊息內容</Label>
                        <Input
                          value={area.action.text || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, text: e.target.value } })}
                          placeholder="輸入要回覆的訊息內容"
                        />
                      </>
                    )}
                    {area.action.type === 'uri' && (
                      <>
                        <Label className="text-xs">網址 (URL)</Label>
                        <Input
                          value={area.action.uri || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, uri: e.target.value } })}
                          placeholder="https://example.com"
                          type="url"
                        />
                      </>
                    )}
                    {area.action.type === 'postback' && (
                      <>
                        <Label className="text-xs">回傳資料</Label>
                        <Input
                          value={area.action.data || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, data: e.target.value } })}
                          placeholder="輸入要回傳的資料"
                        />
                      </>
                    )}
                    {area.action.type === 'datetimepicker' && (
                      <>
                        <Label className="text-xs">識別碼</Label>
                        <Input
                          value={area.action.data || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, data: e.target.value } })}
                          placeholder="用於識別此日期選擇器的標識"
                        />
                      </>
                    )}
                    {area.action.type === 'richmenuswitch' && (
                      <>
                        <Label className="text-xs">切換到選單</Label>
                        <Select
                          value={area.action.richMenuAliasId || undefined}
                          onValueChange={v => onChangeArea(idx, { action: { ...area.action, richMenuAliasId: v } })}
                        >
                          <SelectTrigger><SelectValue placeholder="選擇要切換的選單" /></SelectTrigger>
                          <SelectContent>
                            {availableMenus.length === 0 ? (
                              <SelectItem value="no-menus" disabled>沒有其他可用的選單</SelectItem>
                            ) : (
                              availableMenus.map(menu => (
                                <SelectItem key={menu.id} value={menu.line_rich_menu_id || menu.id}>
                                  {menu.name} {menu.line_rich_menu_id ? '(已發佈)' : '(未發佈)'}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                </div>

                {/* 額外的 datetimepicker 設定 */}
                {area.action.type === 'datetimepicker' && (
                  <div className="col-span-12 md:col-span-8">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">模式</Label>
                        <Select
                          value={area.action.mode || 'date'}
                          onValueChange={v => onChangeArea(idx, { action: { ...area.action, mode: v } })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">僅日期</SelectItem>
                            <SelectItem value="time">僅時間</SelectItem>
                            <SelectItem value="datetime">日期和時間</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">初始值（可選）</Label>
                        <Input
                          value={area.action.initial || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, initial: e.target.value } })}
                          placeholder="YYYY-MM-DD 或 HH:mm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">最大值（可選）</Label>
                        <Input
                          value={area.action.max || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, max: e.target.value } })}
                          placeholder="YYYY-MM-DD 或 HH:mm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 額外的 postback 設定 */}
                {area.action.type === 'postback' && (
                  <div className="col-span-12 md:col-span-8">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">顯示文字（可選）</Label>
                        <Input
                          value={area.action.text || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, text: e.target.value } })}
                          placeholder="點擊後顯示在聊天室的文字"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">顯示文字（替代，可選）</Label>
                        <Input
                          value={(area.action as { displayText?: string }).displayText || ''}
                          onChange={e => onChangeArea(idx, { action: { ...area.action, displayText: e.target.value } })}
                          placeholder="替代顯示文字"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                  <Button variant="destructive" onClick={() => onRemoveArea(idx)}>移除</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={e => onUploadImage(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? '上傳中...' : '選擇圖片上傳'}
            </Button>
            <p className="text-xs text-muted-foreground">建議尺寸：2500×1686（大）或 2500×843（小）；格式：JPG/PNG</p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? '儲存中...' : '儲存選單'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RichMenuForm;
