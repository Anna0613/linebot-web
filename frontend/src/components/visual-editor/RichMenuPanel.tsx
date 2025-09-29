import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import RichMenuApi from '@/services/RichMenuApi';
import type { RichMenu } from '@/types/richMenu';
import RichMenuList from '@/components/richmenu/RichMenuList';
import RichMenuForm from '@/components/richmenu/RichMenuForm';
import RichMenuPreview, { RichMenuPreviewData } from '@/components/richmenu/RichMenuPreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  selectedBotId?: string;
};

const RichMenuPanel: React.FC<Props> = ({ selectedBotId }) => {
  const { toast } = useToast();
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RichMenu | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const emptyToastForBotRef = useRef<string | null>(null);
  const [previewData, setPreviewData] = useState<RichMenuPreviewData | null>(null);
  const previewControlsRef = useRef<{
    createArea: (b: any) => void;
    updateArea: (i: number, b: any) => void;
    selectArea: (i: number | null) => void;
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
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : '無法取得選單，請稍後再試';
      toast({ variant: 'destructive', title: '載入失敗', description: msg });
    } finally {
      setLoading(false);
    }
  }, [selectedBotId, toast]);

  useEffect(() => {
    setEditing(null);
    setCreating(false);
    setMenus([]);
    if (selectedBotId) {
      void loadMenus();
    }
  }, [selectedBotId, loadMenus]);

  useEffect(() => {
    if (!editing && !creating) {
      setPreviewData(null);
    }
  }, [editing, creating]);

  const onSaved = async (_: RichMenu) => {
    setEditing(null);
    setCreating(false);
    await loadMenus();
  };

  const onDelete = async (m: RichMenu) => {
    if (!selectedBotId) return;
    if (!confirm(`確定刪除 Rich Menu「${m.name}」？`)) return;
    try {
      await RichMenuApi.remove(selectedBotId, m.id);
      toast({ title: '已刪除', description: 'Rich Menu 已刪除' });
      await loadMenus();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '刪除失敗', description: e?.message || '請稍後再試' });
    }
  };

  const onSetDefault = async (m: RichMenu) => {
    if (!selectedBotId) return;
    try {
      await RichMenuApi.setDefault(selectedBotId, m.id);
      toast({ title: '已設定預設', description: `已將「${m.name}」設為預設 Rich Menu` });
      await loadMenus();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '設定失敗', description: e?.message || '請稍後再試' });
    }
  };

  const onPublish = async (menu: RichMenu) => {
    if (!selectedBotId) return;
    try {
      const res = await RichMenuApi.publish(selectedBotId, menu.id);
      toast({ title: '已重新發佈到 LINE', description: `選單「${res.name}」已更新` });
      await loadMenus();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '重新發佈失敗', description: e?.message || '請稍後再試' });
    }
  };

  const onCreateNew = () => {
    setCreating(true);
    setEditing(null);
  };

  const onBackToList = () => {
    setCreating(false);
    setEditing(null);
    setPreviewData(null);
    setSelectedIndex(null);
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
                        onEdit={setEditing}
                        onDelete={onDelete}
                        onSetDefault={onSetDefault}
                        onPublish={onPublish}
                        onCreateNew={onCreateNew}
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
                  onSelectArea={(i) => previewControlsRef.current?.selectArea(i >= 0 ? i : null)}
                  onCreateArea={(b) => previewControlsRef.current?.createArea(b)}
                  onUpdateArea={(i, b) => previewControlsRef.current?.updateArea(i, b)}
                  onDeleteArea={(i) => previewControlsRef.current?.removeArea?.(i)}
                  imageNaturalWidth={(previewData as any)?.image_meta?.iw}
                  imageNaturalHeight={(previewData as any)?.image_meta?.ih}
                  imageOffset={(previewData as any)?.image_meta?.offset}
                  onImageOffsetChange={(offset) => {
                    // reflect to form state via binding if provided
                    previewControlsRef.current?.setImageOffset?.(offset);
                  }}
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
