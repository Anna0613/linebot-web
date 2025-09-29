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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RichMenuForm from '@/components/richmenu/RichMenuForm';

const RichMenuEditorPage: React.FC = () => {
  const { loading: authLoading } = useUnifiedAuth({ requireAuth: true, redirectTo: '/login' });
  const { toast } = useToast();
  const [sp] = useSearchParams();
  const [selectedBotId, setSelectedBotId] = useState<string>(sp.get('botId') || '');
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(sp.get('menuId'));
  const [currentMenu, setCurrentMenu] = useState<RichMenu | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMenus = useCallback(async (botId: string) => {
    if (!botId) return;
    setLoading(true);
    try {
      const list = await RichMenuApi.list(botId);
      setMenus(list);
      if (list.length && !currentMenuId) {
        setCurrentMenuId(list[0].id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '無法取得 Rich Menu';
      toast({ variant: 'destructive', title: '載入失敗', description: message });
    } finally {
      setLoading(false);
    }
  }, [currentMenuId, toast]);

  useEffect(() => {
    if (selectedBotId) loadMenus(selectedBotId);
  }, [selectedBotId, loadMenus]);

  useEffect(() => {
    const found = menus.find(m => m.id === currentMenuId) || null;
    setCurrentMenu(found);
  }, [menus, currentMenuId]);

  const onSaved = async (saved: RichMenu) => {
    if (selectedBotId) {
      await loadMenus(selectedBotId);
      setCurrentMenuId(saved.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNavbar />
      <main className="container mx-auto px-4 py-6 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Rich Menu 編輯器</h1>
          <ProjectManager selectedBotId={selectedBotId} onBotSelect={setSelectedBotId} />
        </div>

        {authLoading && (
          <div className="flex justify-center py-10"><Loader fullPage={false} web3Style /></div>
        )}

        {!!selectedBotId && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-10"><Loader fullPage={false} web3Style /></div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">選擇 Rich Menu：</span>
                  <Select value={currentMenuId || ''} onValueChange={setCurrentMenuId}>
                    <SelectTrigger className="w-80"><SelectValue placeholder="選擇 Rich Menu" /></SelectTrigger>
                    <SelectContent>
                      {menus.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                      {!menus.length && <SelectItem value="" disabled>尚無 Rich Menu</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button variant="secondary" onClick={() => setCurrentMenuId(null)}>新增</Button>
                </div>

                <RichMenuForm botId={selectedBotId} menu={currentMenu || undefined} onSaved={onSaved} />
              </div>
            )}
          </div>
        )}
      </main>
      <DashboardFooter />
    </div>
  );
};

export default RichMenuEditorPage;
