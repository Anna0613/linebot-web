import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useSelectedBot } from "@/features/bots/context/SelectedBotContext";
import RichMenuApi from "@/features/rich-menu/api/RichMenuApi";
import type { RichMenu } from "@/features/rich-menu/types/richMenu";
import RichMenuList from "@/features/rich-menu/components/RichMenuList";
import RichMenuForm from "@/features/rich-menu/components/RichMenuForm";

const RichMenuManagementPage: React.FC = () => {
  const { user, loading: authLoading } = useUnifiedAuth({
    requireAuth: true,
    redirectTo: "/login",
  });
  const { toast } = useToast();
  const [sp] = useSearchParams();
  const { selectedBotId, selectBot } = useSelectedBot();
  const queryBotId = sp.get("botId") || "";
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RichMenu | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const loadMenus = useCallback(
    async (botId: string) => {
      if (!botId) return;
      setLoading(true);
      try {
        const list = await RichMenuApi.list(botId);
        setMenus(list);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "無法取得 Rich Menu";
        toast({
          variant: "destructive",
          title: "載入失敗",
          description: message,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (queryBotId && queryBotId !== selectedBotId) {
      selectBot(queryBotId);
    }
  }, [queryBotId, selectedBotId, selectBot]);

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
    try {
      await RichMenuApi.remove(selectedBotId, m.id);
      toast({ title: "已刪除", description: "Rich Menu 已刪除" });
      await loadMenus(selectedBotId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "請稍後再試";
      toast({
        variant: "destructive",
        title: "刪除失敗",
        description: message,
      });
    }
  };

  const onPublish = async (menu: RichMenu) => {
    if (!selectedBotId) return;
    try {
      const res = await RichMenuApi.publish(selectedBotId, menu.id);
      toast({
        title: "已發佈到 LINE 並設為預設",
        description: `選單「${res.name}」已發佈並設為所有好友的預設功能選單`,
      });
      await loadMenus(selectedBotId);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "請稍後再試";
      toast({
        variant: "destructive",
        title: "發佈失敗",
        description: message,
      });
    }
  };

  const onCreateNew = () => {
    setCreating(true);
    setEditing(null);
  };

  return (
    <AppShell user={user} activeNav="editor" headerKicker="圖文選單">
      <main className="py-8 space-y-4">
        <div className="app-panel relative flex flex-col gap-4 overflow-hidden p-6 sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(var(--bc-line-2)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_100%_at_100%_0%,black_0%,transparent_70%)]"
          />
          <div className="relative">
            <p className="app-kicker mb-2">設計</p>
            <h1 className="text-2xl font-semibold text-[var(--bc-ink)]">圖文選單</h1>
            <p className="mt-2 text-sm text-[var(--bc-ink-3)]">
              建立 LINE 對話下方的快捷選單。
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <Button
              onClick={() => {
                setCreating(true);
                setEditing(null);
              }}
              disabled={!selectedBotId}
              className="app-primary-button"
            >
              新增圖文選單
            </Button>
          </div>
        </div>

        {authLoading && (
          <div className="flex justify-center py-10">
            <Loader fullPage={false} />
          </div>
        )}

        {!authLoading && !selectedBotId && (
          <div className="app-muted-panel text-sm text-[var(--bc-ink-3)]">
            請先從左上角選擇一個 Bot
          </div>
        )}

        {!!selectedBotId && (
          <div className="space-y-4">
            {creating && (
              <RichMenuForm botId={selectedBotId} onSaved={onSaved} />
            )}
            {editing && (
              <RichMenuForm
                botId={selectedBotId}
                menu={editing}
                onSaved={onSaved}
              />
            )}

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader fullPage={false} />
              </div>
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
    </AppShell>
  );
};

export default RichMenuManagementPage;
