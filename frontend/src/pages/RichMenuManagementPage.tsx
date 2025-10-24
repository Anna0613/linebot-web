import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardNavbar from '@/components/layout/DashboardNavbar';
import DashboardFooter from '@/components/layout/DashboardFooter';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import ProjectManager from '@/components/visual-editor/ProjectManager';
import RichMenuApi from '@/services/RichMenuApi';
import type { RichMenu } from '@/types/richMenu';
import RichMenuList from '@/components/richmenu/RichMenuList';
import RichMenuForm from '@/components/richmenu/RichMenuForm';

const RichMenuManagementPage: React.FC = () => {
  const { loading: authLoading } = useUnifiedAuth({ requireAuth: true, redirectTo: '/login' });
  const { toast } = useToast();
  const [sp] = useSearchParams();
  const [selectedBotId, setSelectedBotId] = useState<string>(sp.get('botId') || '');
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RichMenu | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const loadMenus = useCallback(async (botId: string) => {
    if (!botId) return;
    setLoading(true);
    try {
      const list = await RichMenuApi.list(botId);
      setMenus(list);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '無法取得 Rich Menu';
      toast({ variant: 'destructive', title: '載入失敗', description: message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedBotId) loadMenus(selectedBotId);
  }, [selectedBotId, loadMenus]);

  const onSaved = async (_: RichMenu) => {
    setEditing(null);
    setCreating(false);
    if (selectedBotId) await loadMenus(selectedBotId);
  };

  const onDelete = async (m: RichMenu) => {
    if (!selectedBotId) return;
    if (!confirm(`確定刪除 Rich Menu「${m.name}」？`)) return;
    try {
      await RichMenuApi.remove(selectedBotId, m.id);
      toast({ title: '已刪除', description: 'Rich Menu 已刪除' });
      await loadMenus(selectedBotId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '請稍後再試';
      toast({ variant: 'destructive', title: '刪除失敗', description: message });
    }
  };

  const onPublish = async (menu: RichMenu) => {
    if (!selectedBotId) return;
    try {
      const res = await RichMenuApi.publish(selectedBotId, menu.id);
      toast({
        title: '已發佈到 LINE 並設為預設',
        description: `選單「${res.name}」已發佈並設為所有用戶的預設功能選單`
      });
      await loadMenus(selectedBotId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '請稍後再試';
      toast({ variant: 'destructive', title: '發佈失敗', description: message });
    }
  };

  const onCreateNew = () => {
    setCreating(true);
    setEditing(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-6 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Rich Menu 管理</h1>
          <div className="flex items-center gap-2">
            <ProjectManager selectedBotId={selectedBotId} onBotSelect={setSelectedBotId} />
            <Button onClick={() => { setCreating(true); setEditing(null); }} disabled={!selectedBotId}>新增 Rich Menu</Button>
          </div>
        </div>

        {authLoading && (
          <div className="flex justify-center py-10"><Loader fullPage={false} web3Style /></div>
        )}

        {!authLoading && !selectedBotId && (
          <div className="text-sm text-muted-foreground">請先從右上角選擇一個 Bot</div>
        )}

        {!!selectedBotId && (
          <div className="space-y-4">
            {creating && (
              <RichMenuForm botId={selectedBotId} onSaved={onSaved} />
            )}
            {editing && (
              <RichMenuForm botId={selectedBotId} menu={editing} onSaved={onSaved} />
            )}

            {loading ? (
              <div className="flex justify-center py-10"><Loader fullPage={false} web3Style /></div>
            ) : (
              <RichMenuList
                menus={menus}
                onEdit={setEditing}
                onDelete={onDelete}
                onPublish={onPublish}
                onCreateNew={onCreateNew}
              />
            )}
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
};

export default RichMenuManagementPage;
