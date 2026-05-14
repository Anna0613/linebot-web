import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import VisualEditorApi, { FlexMessageSummary } from '@/features/visual-editor/api/visualEditorApi';
import { useToast } from '@/hooks/use-toast';
import type { UnifiedBlock } from '@/features/visual-editor/types/block';
import FlexMessageCanvas from './FlexMessageCanvas';

// Canvas 預覽縮放比例
const CANVAS_SCALE = 0.4;
const CANVAS_RENDER_H = Math.ceil(112 / CANVAS_SCALE); // ≈ 280px


interface FlexMessageGridProps {
  onSelect: (messageId: string) => void;
  onCreate: (name: string) => Promise<unknown>;
  onDelete: (messageId: string) => Promise<unknown>;
}

const FlexMessageGrid: React.FC<FlexMessageGridProps> = ({ onSelect, onCreate, onDelete }) => {
  const [messages, setMessages] = useState<FlexMessageSummary[]>([]);
  const [previewBlocks, setPreviewBlocks] = useState<Map<string, FlexBlockLite[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<FlexMessageSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageToRename, setMessageToRename] = useState<FlexMessageSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const summaries = await VisualEditorApi.getUserFlexMessagesSummary(false);
      setMessages(summaries);
      // 平行抓取完整訊息資料以取得 design_blocks
      const full = await VisualEditorApi.getUserFlexMessages(false);
      const map = new Map<string, FlexBlockLite[]>();
      full.forEach((msg) => {
        if (Array.isArray(msg.design_blocks) && msg.design_blocks.length > 0) {
          map.set(msg.id, msg.design_blocks as UnifiedBlock[]);
        }
      });
      setPreviewBlocks(map);
    } catch { setMessages([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadMessages(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName(''); setShowCreateDialog(false);
      await loadMessages();
      toast({ title: '建立成功', description: 'Flex Message 已建立' });
    } catch (err) {
      toast({ variant: 'destructive', title: '建立失敗', description: err instanceof Error ? err.message : '建立失敗' });
    } finally { setIsCreating(false); }
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(messageToDelete.id);
      setMessageToDelete(null);
      await loadMessages();
      toast({ title: '刪除成功', description: 'Flex Message 已刪除' });
    } catch (err) {
      toast({ variant: 'destructive', title: '刪除失敗', description: err instanceof Error ? err.message : '刪除失敗' });
    } finally { setIsDeleting(false); }
  };

  const handleRename = async () => {
    if (!messageToRename || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      await VisualEditorApi.updateFlexMessage(messageToRename.id, { name: renameValue.trim() });
      setMessageToRename(null);
      await loadMessages();
      toast({ title: '重新命名成功' });
    } catch (err) {
      toast({ variant: 'destructive', title: '重新命名失敗', description: err instanceof Error ? err.message : '操作失敗' });
    } finally { setIsRenaming(false); }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><span className="text-sm text-slate-400">載入中...</span></div>;
  }

  return (
    <div className="h-full overflow-auto bg-[#f7fbf8] p-6">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="app-panel-strong max-w-lg p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Plus className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-950">選擇或新增 Flex Message 模板</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Flex Message 編輯器可視覺化設計 LINE 訊息卡片。請先新增一個新的 Flex Message 開始設計。
            </p>
            <Button className="app-primary-button mt-6" onClick={() => { setNewName(''); setShowCreateDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />新增 Flex Message
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Flex Message</h2>
              <p className="mt-0.5 text-xs text-slate-500">點擊方塊進入編輯器</p>
            </div>
            <Button className="app-primary-button h-8" size="sm" onClick={() => { setNewName(''); setShowCreateDialog(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />新增
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {messages.map((message) => {
              const blocks = previewBlocks.get(message.id);
              return (
              <div
                key={message.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                onClick={() => onSelect(message.id)}
              >
                {/* 三點選單 */}
                <div className="absolute right-1.5 top-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                  <Popover open={openMenuId === message.id} onOpenChange={(open) => setOpenMenuId(open ? message.id : null)}>
                    <PopoverTrigger asChild>
                      <button className="flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-slate-400 opacity-0 shadow-sm transition hover:bg-white hover:text-slate-700 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-1" align="end">
                      <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => { setMessageToRename(message); setRenameValue(message.name); setOpenMenuId(null); }}>
                        <Pencil className="h-3.5 w-3.5" />重新命名
                      </button>
                      <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => { setMessageToDelete(message); setOpenMenuId(null); }}>
                        <Trash2 className="h-3.5 w-3.5" />刪除
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* 預覽圖區 */}
                <div className="relative h-28 overflow-hidden border-b border-slate-100">
                  {blocks && blocks.length > 0 ? (
                    <div
                      className="pointer-events-none absolute left-0 top-0"
                      style={{
                        width: `${100 / CANVAS_SCALE}%`,
                        height: CANVAS_RENDER_H,
                        transform: `scale(${CANVAS_SCALE})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <FlexMessageCanvas
                        blocks={blocks as UnifiedBlock[]}
                        selectedIndex={null}
                        onSelect={() => {}}
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-50">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                {/* 名稱 / 日期 */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-900">{message.name}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(message.created_at).toLocaleDateString('zh-TW')}</p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 新增對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setNewName(''); }}>
        <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 50); }}>
          <DialogHeader><DialogTitle>新增 Flex Message</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)} className="app-input"
              placeholder="請輸入訊息名稱" disabled={isCreating}
              onKeyDown={(e) => e.key === 'Enter' && !isCreating && newName.trim() && handleCreate()} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCreateDialog(false); setNewName(''); }} disabled={isCreating} className="app-secondary-button">取消</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || isCreating} className="app-primary-button">{isCreating ? '建立中...' : '確認建立'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新命名對話框 */}
      <Dialog open={!!messageToRename} onOpenChange={(open) => { if (!open) setMessageToRename(null); }}>
        <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => renameInputRef.current?.focus(), 50); }}>
          <DialogHeader><DialogTitle>重新命名 Flex Message</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="app-input"
              placeholder="請輸入新名稱" disabled={isRenaming}
              onKeyDown={(e) => e.key === 'Enter' && !isRenaming && renameValue.trim() && handleRename()} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMessageToRename(null)} disabled={isRenaming} className="app-secondary-button">取消</Button>
            <Button size="sm" onClick={handleRename} disabled={!renameValue.trim() || isRenaming} className="app-primary-button">{isRenaming ? '儲存中...' : '確認儲存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => { if (!open) setMessageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除 Flex Message</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除「{messageToDelete?.name}」嗎？此操作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? '刪除中...' : '確認刪除'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FlexMessageGrid;
