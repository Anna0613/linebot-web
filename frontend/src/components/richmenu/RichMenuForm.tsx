import React, { useEffect, useMemo, useState } from 'react';
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
  onChangePreview?: (data: {
    name: string;
    chat_bar_text: string;
    size: { width: 2500; height: 1686 | 843 };
    areas: RichMenuArea[];
    image_url?: string;
  }) => void;
};

const emptyBounds: RichMenuBounds = { x: 0, y: 0, width: 1250, height: 843 };
const defaultAction: RichMenuAction = { type: 'postback', data: 'action=demo' };

const RichMenuForm: React.FC<Props> = ({ botId, menu, onSaved, onChangePreview }) => {
  const isEdit = !!menu?.id;
  const { toast } = useToast();
  const [name, setName] = useState<string>(menu?.name || 'MainMenu');
  const [chatBarText, setChatBarText] = useState<string>(menu?.chat_bar_text || '開啟選單');
  const [height, setHeight] = useState<'1686' | '843'>(
    String((menu?.size as any)?.height || 1686) === '843' ? '843' : '1686'
  );
  const [selected, setSelected] = useState<boolean>(!!menu?.selected);
  const [areas, setAreas] = useState<RichMenuArea[]>(
    (menu?.areas as RichMenuArea[]) || [
      { bounds: { ...emptyBounds, x: 0, y: 0 }, action: { ...defaultAction, data: 'action=area1' } },
    ]
  );
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(menu?.image_url);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (menu) {
      setName(menu.name);
      setChatBarText(menu.chat_bar_text);
      setHeight(String((menu.size as any)?.height || 1686) === '843' ? '843' : '1686');
      setSelected(menu.selected);
      setAreas((menu.areas as RichMenuArea[]) || []);
      setImageUrl(menu.image_url);
    }
  }, [menu]);

  // 同步預覽資料
  useEffect(() => {
    if (!onChangePreview) return;
    onChangePreview({
      name,
      chat_bar_text: chatBarText,
      size: { width: 2500, height: Number(height) as 1686 | 843 },
      areas,
      image_url: imageUrl,
    });
  }, [name, chatBarText, height, areas, imageUrl, onChangePreview]);

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

  const onSubmit = async () => {
    try {
      setSaving(true);
      let saved: RichMenu;
      if (isEdit && menu) {
        const update: UpdateRichMenuPayload = payload;
        saved = await RichMenuApi.update(botId, menu.id, update);
      } else {
        const create: CreateRichMenuPayload = payload as any;
        saved = await RichMenuApi.create(botId, create);
      }
      toast({ title: '已保存', description: 'Rich Menu 設定已更新' });
      onSaved?.(saved);
    } catch (e: any) {
      toast({ variant: 'destructive', title: '保存失敗', description: e?.message || '請稍後再試' });
    } finally {
      setSaving(false);
    }
  };

  const onUploadImage = async (file?: File | null) => {
    if (!file || !menu) return;
    try {
      setUploading(true);
      const updated = await RichMenuApi.uploadImage(botId, menu.id, file);
      toast({ title: '圖片已上傳', description: '已更新 Rich Menu 圖片' });
      setImageUrl(updated.image_url);
      onSaved?.(updated);
    } catch (e: any) {
      toast({ variant: 'destructive', title: '上傳失敗', description: e?.message || '請稍後再試' });
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
              <div key={idx} className="grid grid-cols-12 gap-2 border rounded-md p-3">
                <div className="col-span-12 md:col-span-6 grid grid-cols-4 gap-2">
                  <Input type="number" value={area.bounds.x} onChange={e => onChangeArea(idx, { bounds: { x: Number(e.target.value) } as any })} placeholder="X（左）" />
                  <Input type="number" value={area.bounds.y} onChange={e => onChangeArea(idx, { bounds: { y: Number(e.target.value) } as any })} placeholder="Y（上）" />
                  <Input type="number" value={area.bounds.width} onChange={e => onChangeArea(idx, { bounds: { width: Number(e.target.value) } as any })} placeholder="寬度" />
                  <Input type="number" value={area.bounds.height} onChange={e => onChangeArea(idx, { bounds: { height: Number(e.target.value) } as any })} placeholder="高度" />
                </div>
                <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-2">
                  <Select value={area.action.type} onValueChange={v => onChangeArea(idx, { action: { ...area.action, type: v as RichMenuAction['type'] } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">回覆文字訊息</SelectItem>
                      <SelectItem value="uri">開啟連結（網址）</SelectItem>
                      <SelectItem value="datetimepicker">選日期時間</SelectItem>
                      <SelectItem value="richmenuswitch">切換到其他選單</SelectItem>
                      <SelectItem value="postback">回傳暗號（進階）</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={(area.action.data as string) || ''} onChange={e => onChangeArea(idx, { action: { ...area.action, data: e.target.value } })} placeholder="輸入內容（上方選項不同，填文字/網址/暗號）" />
                </div>
                <div className="col-span-12 md:col-span-12">
                  <p className="text-xs text-muted-foreground">提示：
                    「回覆文字訊息」請在右側輸入要回覆的文字；
                    「開啟連結」請輸入完整網址；
                    「切換到其他選單」需先設定選單別名；
                    「回傳暗號」給系統做進階判斷。
                  </p>
                </div>
                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                  <Button variant="destructive" onClick={() => onRemoveArea(idx)}>移除</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          {isEdit && (
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/png,image/jpeg" onChange={e => onUploadImage(e.target.files?.[0])} />
              <Button disabled={uploading} onClick={() => { /* button kept for layout */ }} type="button" variant="outline">
                {uploading ? '上傳中...' : '上傳圖片'}
              </Button>
              <p className="text-xs text-muted-foreground">建議尺寸：2500×1686（大）或 2500×843（小）；格式：JPG/PNG</p>
            </div>
          )}
          <Button onClick={onSubmit} disabled={saving}>{saving ? '儲存中...' : '儲存選單'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RichMenuForm;
