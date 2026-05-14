import React, { useState, useEffect, useRef } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import VisualEditorApi, { LogicTemplateSummary } from '@/features/visual-editor/api/visualEditorApi';
import { useToast } from '@/hooks/use-toast';
import {
  WorkflowGraph, WorkflowNodeType,
  getWorkflowNodeKind, getWorkflowNodeDefinition, isWorkflowGraph,
} from '@/features/visual-editor/types/workflow';

// ── Mini SVG 節點圖預覽 ──────────────────────────────────────────
const NODE_W = 180;
const NODE_H = 70;

const kindStyle = (type: WorkflowNodeType) => {
  const kind = getWorkflowNodeKind(type);
  if (kind === 'trigger')   return { fill: '#fef3c7', stroke: '#d97706', text: '#92400e' };
  if (kind === 'condition') return { fill: '#ede9fe', stroke: '#7c3aed', text: '#4c1d95' };
  return                           { fill: '#d1fae5', stroke: '#059669', text: '#065f46' };
};

const LogicMiniPreview: React.FC<{ graph: WorkflowGraph }> = ({ graph }) => {
  const { nodes, edges } = graph;
  if (!nodes.length) return (
    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">空流程</div>
  );

  const PREVIEW_W = 240;
  const PREVIEW_H = 110;
  const PAD = 12;

  const xs = nodes.map(n => n.position.x);
  const ys = nodes.map(n => n.position.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const rangeX = Math.max(Math.max(...xs) + NODE_W - minX, 1);
  const rangeY = Math.max(Math.max(...ys) + NODE_H - minY, 1);
  const scale = Math.min((PREVIEW_W - PAD * 2) / rangeX, (PREVIEW_H - PAD * 2) / rangeY);
  const nw = NODE_W * scale;
  const nh = NODE_H * scale;

  // 計算縮放後的實際尺寸，並置中顯示
  const scaledW = rangeX * scale;
  const scaledH = rangeY * scale;
  const offsetX = (PREVIEW_W - scaledW) / 2;
  const offsetY = (PREVIEW_H - scaledH) / 2;
  const px = (x: number) => (x - minX) * scale + offsetX;
  const py = (y: number) => (y - minY) * scale + offsetY;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <svg viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} className="w-full h-full" style={{ display: 'block' }}>
      {edges.map(edge => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return null;
        // 對齊實際編輯器：output = 節點右側中心，input = 節點左側中心
        const x1 = px(src.position.x) + nw;
        const y1 = py(src.position.y) + nh / 2;
        const x2 = px(tgt.position.x);
        const y2 = py(tgt.position.y) + nh / 2;
        const dx = Math.max(20, Math.abs(x2 - x1) * 0.45);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        return (
          <path key={edge.id} d={d} fill="none" stroke="#10b981" strokeWidth={1.2} strokeLinecap="round" />
        );
      })}
      {nodes.map(node => {
        const s = kindStyle(node.type);
        const def = getWorkflowNodeDefinition(node.type);
        const x = px(node.position.x);
        const y = py(node.position.y);
        const fs = Math.max(6, Math.min(9, nw * 0.085));
        const label = def.label.length > 7 ? def.label.slice(0, 7) + '…' : def.label;
        return (
          <g key={node.id}>
            <rect x={x} y={y} width={nw} height={nh} rx={3}
              fill={s.fill} stroke={s.stroke} strokeWidth={0.8} />
            <text x={x + nw / 2} y={y + nh / 2 + fs * 0.35}
              textAnchor="middle" fontSize={fs} fill={s.text} fontWeight="600">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface LogicTemplateGridProps {
  selectedBotId: string;
  onSelect: (templateId: string) => void;
  onCreate: (name: string) => Promise<unknown>;
  onDelete: (templateId: string) => Promise<unknown>;
}

const LogicTemplateGrid: React.FC<LogicTemplateGridProps> = ({ selectedBotId, onSelect, onCreate, onDelete }) => {
  const [templates, setTemplates] = useState<LogicTemplateSummary[]>([]);
  const [previewGraphs, setPreviewGraphs] = useState<Map<string, WorkflowGraph>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<LogicTemplateSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [templateToRename, setTemplateToRename] = useState<LogicTemplateSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const summaries = await VisualEditorApi.getBotLogicTemplatesSummary(selectedBotId, false);
      setTemplates(summaries);
      // 平行抓取完整模板資料以取得 WorkflowGraph
      const results = await Promise.allSettled(
        summaries.map((t) => VisualEditorApi.getLogicTemplate(t.id, false))
      );
      const map = new Map<string, WorkflowGraph>();
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const lb = r.value.logic_blocks;
          if (isWorkflowGraph(lb)) map.set(r.value.id, lb);
        }
      });
      setPreviewGraphs(map);
    } catch { setTemplates([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (selectedBotId) loadTemplates(); }, [selectedBotId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName(''); setShowCreateDialog(false);
      await loadTemplates();
      toast({ title: '建立成功', description: '邏輯模板已建立' });
    } catch (err) {
      toast({ variant: 'destructive', title: '建立失敗', description: err instanceof Error ? err.message : '建立失敗' });
    } finally { setIsCreating(false); }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(templateToDelete.id);
      setTemplateToDelete(null);
      await loadTemplates();
      toast({ title: '刪除成功', description: '邏輯模板已刪除' });
    } catch (err) {
      toast({ variant: 'destructive', title: '刪除失敗', description: err instanceof Error ? err.message : '刪除失敗' });
    } finally { setIsDeleting(false); }
  };

  const handleRename = async () => {
    if (!templateToRename || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      await VisualEditorApi.updateLogicTemplate(templateToRename.id, { name: renameValue.trim() });
      setTemplateToRename(null);
      await loadTemplates();
      toast({ title: '重新命名成功' });
    } catch (err) {
      toast({ variant: 'destructive', title: '重新命名失敗', description: err instanceof Error ? err.message : '操作失敗' });
    } finally { setIsRenaming(false); }
  };

  const handleToggle = async (templateId: string, isActive: boolean) => {
    // 樂觀更新
    setTemplates(prev => prev.map(t =>
      t.id === templateId ? { ...t, is_active: isActive ? 'true' : 'false' } : t
    ));
    try {
      await VisualEditorApi.updateLogicTemplate(templateId, { is_active: isActive ? 'true' : 'false' });
      toast({ title: isActive ? '已啟用' : '已停用', description: `邏輯模板已${isActive ? '啟用' : '停用'}` });
    } catch (err) {
      // 回滾
      setTemplates(prev => prev.map(t =>
        t.id === templateId ? { ...t, is_active: isActive ? 'false' : 'true' } : t
      ));
      toast({ variant: 'destructive', title: '操作失敗', description: err instanceof Error ? err.message : '無法切換狀態' });
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><span className="text-sm text-slate-400">載入中...</span></div>;
  }

  return (
    <div className="h-full overflow-auto bg-[#f7fbf8] p-6">
      {templates.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="app-panel-strong max-w-lg p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Plus className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-950">選擇或新增邏輯模板</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              新版邏輯編輯器使用節點與連線建立流程。請先新增一個新版模板開始建立流程。
            </p>
            <Button className="app-primary-button mt-6" onClick={() => { setNewName(''); setShowCreateDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />新增邏輯模板
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">邏輯模板</h2>
              <p className="mt-0.5 text-xs text-slate-500">點擊方塊進入編輯器</p>
            </div>
            <Button className="app-primary-button h-8" size="sm" onClick={() => { setNewName(''); setShowCreateDialog(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />新增模板
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {templates.map((template) => {
              const graph = previewGraphs.get(template.id);
              return (
              <div
                key={template.id}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                onClick={() => onSelect(template.id)}
              >
                {/* 三點選單 */}
                <div className="absolute right-1.5 top-1.5 z-10" onClick={(e) => e.stopPropagation()}>
                  <Popover open={openMenuId === template.id} onOpenChange={(open) => setOpenMenuId(open ? template.id : null)}>
                    <PopoverTrigger asChild>
                      <button className="flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-slate-400 opacity-0 shadow-sm transition hover:bg-white hover:text-slate-700 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-36 p-1" align="end">
                      <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => { setTemplateToRename(template); setRenameValue(template.name); setOpenMenuId(null); }}>
                        <Pencil className="h-3.5 w-3.5" />重新命名
                      </button>
                      <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        onClick={() => { setTemplateToDelete(template); setOpenMenuId(null); }}>
                        <Trash2 className="h-3.5 w-3.5" />刪除
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
                {/* 預覽圖區 */}
                <div className="h-28 overflow-hidden border-b border-slate-100 bg-slate-50">
                  {graph ? (
                    <LogicMiniPreview graph={graph} />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 3M21 7.5H7.5" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                {/* 名稱 / Switch / 日期 */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-slate-900">{template.name}</p>
                  <div className="mt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-[11px] font-medium ${template.is_active === 'true' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {template.is_active === 'true' ? '啟用中' : '已停用'}
                    </span>
                    <Switch
                      checked={template.is_active === 'true'}
                      onCheckedChange={(checked) => handleToggle(template.id, checked)}
                      className="scale-75 origin-right"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(template.created_at).toLocaleDateString('zh-TW')}</p>
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
          <DialogHeader><DialogTitle>新增邏輯模板</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input ref={inputRef} value={newName} onChange={(e) => setNewName(e.target.value)} className="app-input"
              placeholder="請輸入模板名稱" disabled={isCreating}
              onKeyDown={(e) => e.key === 'Enter' && !isCreating && newName.trim() && handleCreate()} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCreateDialog(false); setNewName(''); }} disabled={isCreating} className="app-secondary-button">取消</Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || isCreating} className="app-primary-button">{isCreating ? '建立中...' : '確認建立'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新命名對話框 */}
      <Dialog open={!!templateToRename} onOpenChange={(open) => { if (!open) setTemplateToRename(null); }}>
        <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(() => renameInputRef.current?.focus(), 50); }}>
          <DialogHeader><DialogTitle>重新命名模板</DialogTitle></DialogHeader>
          <div className="py-2">
            <Input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="app-input"
              placeholder="請輸入新名稱" disabled={isRenaming}
              onKeyDown={(e) => e.key === 'Enter' && !isRenaming && renameValue.trim() && handleRename()} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTemplateToRename(null)} disabled={isRenaming} className="app-secondary-button">取消</Button>
            <Button size="sm" onClick={handleRename} disabled={!renameValue.trim() || isRenaming} className="app-primary-button">{isRenaming ? '儲存中...' : '確認儲存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認 */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => { if (!open) setTemplateToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除邏輯模板</AlertDialogTitle>
            <AlertDialogDescription>確定要刪除邏輯模板「{templateToDelete?.name}」嗎？此操作無法復原。</AlertDialogDescription>
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

export default LogicTemplateGrid;
