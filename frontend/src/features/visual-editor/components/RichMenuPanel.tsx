import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import RichMenuApi from '@/features/rich-menu/api/RichMenuApi';
import type { RichMenu, RichMenuArea } from '@/features/rich-menu/types/richMenu';
import RichMenuList from '@/features/rich-menu/components/RichMenuList';
import RichMenuForm from '@/features/rich-menu/components/RichMenuForm';
import RichMenuPreview, { RichMenuPreviewData } from '@/features/rich-menu/components/RichMenuPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  selectedBotId?: string;
};

const toPreviewData = (menu: RichMenu): RichMenuPreviewData => {
  const rawHeight = typeof menu.size === 'object' && menu.size && 'height' in menu.size
    ? Number(menu.size.height)
    : 1686;

  return {
    name: menu.name,
    chat_bar_text: menu.chat_bar_text,
    size: { width: 2500, height: rawHeight === 843 ? 843 : 1686 },
    areas: Array.isArray(menu.areas) ? (menu.areas as RichMenuArea[]) : [],
    image_url: menu.image_url,
  };
};

const RichMenuPanel: React.FC<Props> = ({ selectedBotId }) => {
  const { toast } = useToast();
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishingMenuId, setPublishingMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RichMenu | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const emptyToastForBotRef = useRef<string | null>(null);
  const [previewData, setPreviewData] = useState<RichMenuPreviewData | null>(null);
  const [previewingMenuId, setPreviewingMenuId] = useState<string | null>(null);
  const previewControlsRef = useRef<{
    createArea: (b: RichMenu['areas'][number]['bounds']) => void;
    updateArea: (i: number, b: RichMenu['areas'][number]['bounds']) => void;
    selectArea: (i: number | null) => void;
    removeArea?: (i: number) => void;
    setImageOffset?: (offset: { x: number; y: number }) => void;
  } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const loadMenus = useCallback(async () => {
    if (!selectedBotId) return;
    setLoading(true);
    try {
      const list = await RichMenuApi.list(selectedBotId);
      setMenus(list);
      if (list.length === 0 && emptyToastForBotRef.current !== selectedBotId) {
        toast({ title: '目前沒有選單', description: '點右上角「新增選單」即可建立你的第一個功能選單。' });
        emptyToastForBotRef.current = selectedBotId;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '無法取得選單，請稍後再試';
      toast({ variant: 'destructive', title: '載入失敗', description: msg });
    } finally {
      setLoading(false);
    }
  }, [selectedBotId, toast]);

  useEffect(() => {
    setEditing(null);
    setCreating(false);
    setMenus([]);
    setPreviewingMenuId(null);
    setPreviewData(null);
    setSelectedIndex(null);
    previewControlsRef.current = null;
    if (selectedBotId) {
      void loadMenus();
    }
  }, [selectedBotId, loadMenus]);

  useEffect(() => {
    if (!editing && !creating) {
      previewControlsRef.current = null;
      setSelectedIndex(null);
    }
  }, [editing, creating]);

  useEffect(() => {
    if (editing || creating || !previewingMenuId) return;
    const previewMenu = menus.find(menu => menu.id === previewingMenuId);
    if (!previewMenu) {
      setPreviewingMenuId(null);
      setPreviewData(null);
      return;
    }
    setPreviewData(toPreviewData(previewMenu));
  }, [creating, editing, menus, previewingMenuId]);

  const onSaved = async (saved: RichMenu) => {
    setEditing(null);
    setCreating(false);
    setPreviewingMenuId(saved.id);
    setPreviewData(toPreviewData(saved));
    await loadMenus();
  };

  const onDelete = async (m: RichMenu) => {
    if (!selectedBotId) return;
    if (!confirm(`確定刪除 Rich Menu「${m.name}」？`)) return;
    try {
      await RichMenuApi.remove(selectedBotId, m.id);
      toast({ title: '已刪除', description: 'Rich Menu 已刪除' });
      if (previewingMenuId === m.id) {
        setPreviewingMenuId(null);
        setPreviewData(null);
      }
      await loadMenus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '請稍後再試';
      toast({ variant: 'destructive', title: '刪除失敗', description: msg });
    }
  };

  const onPublish = async (menu: RichMenu) => {
    if (!selectedBotId) return;
    setPublishingMenuId(menu.id);
    try {
      const res = await RichMenuApi.publish(selectedBotId, menu.id);
      toast({
        title: '已發佈到 LINE 並設為預設',
        description: `選單「${res.name}」已發佈並設為所有用戶的預設功能選單`
      });
      await loadMenus();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '請稍後再試';
      toast({ variant: 'destructive', title: '發佈失敗', description: msg });
    } finally {
      setPublishingMenuId(null);
    }
  };

  const onCreateNew = () => {
    setCreating(true);
    setEditing(null);
    setPreviewingMenuId(null);
    setPreviewData(null);
    setSelectedIndex(null);
  };

  const onEditMenu = (menu: RichMenu) => {
    setEditing(menu);
    setCreating(false);
    setPreviewingMenuId(null);
    setSelectedIndex(null);
  };

  const onPreviewMenu = (menu: RichMenu) => {
    setPreviewingMenuId(menu.id);
    setPreviewData(toPreviewData(menu));
    setSelectedIndex(null);
    previewControlsRef.current = null;
  };

  const onBackToList = () => {
    setCreating(false);
    setEditing(null);
    setPreviewData(null);
    setPreviewingMenuId(null);
    setSelectedIndex(null);
    previewControlsRef.current = null;
  };

  if (!selectedBotId) {
    return <div className="p-4 text-sm text-muted-foreground">請先在上方選擇一個 Bot</div>;
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-hidden">
      {/* 頂部標題和導航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-medium">功能選單（Rich Menu）</h2>
          {(editing || creating) && (
            <>
              <span className="text-muted-foreground">›</span>
              <span className="text-sm text-muted-foreground">
                {creating ? '新增選單' : `編輯 ${editing.name}`}
              </span>
            </>
          )}
        </div>
        {(editing || creating) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToList}
          >
            返回列表
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* 左：編輯與設定 */}
          <div className="flex flex-col h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  {(editing || creating) ? '編輯選單' : '編輯與設定'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {creating && (
                  <RichMenuForm
                    botId={selectedBotId}
                    onSaved={onSaved}
                    onCancel={onBackToList}
                    onChangePreview={setPreviewData}
                    onBindPreviewControls={(controls) => { previewControlsRef.current = controls; }}
                    onSelectedIndexChange={setSelectedIndex}
                  />
                )}
                {editing && (
                  <RichMenuForm
                    botId={selectedBotId}
                    menu={editing}
                    onSaved={onSaved}
                    onCancel={onBackToList}
                    onChangePreview={setPreviewData}
                    onBindPreviewControls={(controls) => { previewControlsRef.current = controls; }}
                    onSelectedIndexChange={setSelectedIndex}
                  />
                )}
                {!creating && !editing && (
                  <div className="space-y-3">
                    {loading ? (
                      <div className="flex justify-center py-10"><Loader fullPage={false} web3Style /></div>
                    ) : (
                      <RichMenuList
                        menus={menus}
                        onEdit={onEditMenu}
                        onDelete={onDelete}
                        onPublish={onPublish}
                        onCreateNew={onCreateNew}
                        onPreview={onPreviewMenu}
                        previewingMenuId={previewingMenuId}
                        publishingMenuId={publishingMenuId}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* 右：預覽 */}
          <div className="flex flex-col h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3"><CardTitle className="text-base">預覽</CardTitle></CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <RichMenuPreview
                  data={previewData}
                  selectedIndex={selectedIndex ?? undefined}
                  onSelectArea={(editing || creating) ? (i) => previewControlsRef.current?.selectArea(i >= 0 ? i : null) : undefined}
                  onCreateArea={(editing || creating) ? (b) => previewControlsRef.current?.createArea(b) : undefined}
                  onUpdateArea={(editing || creating) ? (i, b) => previewControlsRef.current?.updateArea(i, b) : undefined}
                  onDeleteArea={(editing || creating) ? (i) => previewControlsRef.current?.removeArea?.(i) : undefined}
                  imageNaturalWidth={previewData?.image_meta?.iw}
                  imageNaturalHeight={previewData?.image_meta?.ih}
                  imageOffset={previewData?.image_meta?.offset}
                  onImageOffsetChange={(editing || creating) ? (offset) => {
                    // reflect to form state via binding if provided
                    previewControlsRef.current?.setImageOffset?.(offset);
                  } : undefined}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichMenuPanel;
