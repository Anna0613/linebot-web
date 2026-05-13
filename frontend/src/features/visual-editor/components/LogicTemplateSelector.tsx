import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import VisualEditorApi, { LogicTemplateSummary } from '@/features/visual-editor/api/visualEditorApi';
import { WorkflowGraph } from '@/features/visual-editor/types/workflow';

interface LogicTemplateSelectorProps {
  selectedBotId: string;
  selectedLogicTemplateId?: string;
  onLogicTemplateSelect?: (templateId: string) => void;
  onLogicTemplateCreate?: (name: string) => Promise<unknown> | unknown;
  onLogicTemplateDelete?: (templateId: string) => Promise<unknown> | unknown;
  workflowGraph: WorkflowGraph | null;
  disabled?: boolean;
  variant?: 'panel' | 'toolbar';
  className?: string;
}

const LogicTemplateSelector: React.FC<LogicTemplateSelectorProps> = ({
  selectedBotId,
  selectedLogicTemplateId,
  onLogicTemplateSelect,
  onLogicTemplateCreate,
  onLogicTemplateDelete,
  workflowGraph: _workflowGraph,
  disabled = false,
  variant = 'panel',
  className = ''
}) => {
  const [logicTemplates, setLogicTemplates] = useState<LogicTemplateSummary[]>([]);
  const [isLoadingLogicTemplates, setIsLoadingLogicTemplates] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newLogicTemplateName, setNewLogicTemplateName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<LogicTemplateSummary | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 載入邏輯模板列表
  const loadLogicTemplates = async (botId: string) => {
    if (!botId) {
      setLogicTemplates([]);
      return;
    }
    
    setIsLoadingLogicTemplates(true);
    try {
      const templates = await VisualEditorApi.getBotLogicTemplatesSummary(botId);
      setLogicTemplates(templates);
    } catch (err) {
      console.warn('載入邏輯模板列表失敗:', err);
      setLogicTemplates([]);
    } finally {
      setIsLoadingLogicTemplates(false);
    }
  };

  // 當選擇的 Bot 改變時，載入對應的邏輯模板
  useEffect(() => {
    if (selectedBotId) {
      loadLogicTemplates(selectedBotId);
    } else {
      setLogicTemplates([]);
    }
  }, [selectedBotId]);


  // 創建新邏輯模板
  const handleCreateLogicTemplate = async () => {
    if (!selectedBotId || !newLogicTemplateName.trim()) {
      toast({
        variant: 'destructive',
        title: '創建失敗',
        description: '請輸入邏輯模板名稱'
      });
      return;
    }

    setIsCreating(true);
    try {
      if (onLogicTemplateCreate) {
        await onLogicTemplateCreate(newLogicTemplateName.trim());
      }
      setNewLogicTemplateName('');
      setShowCreateDialog(false);
      await loadLogicTemplates(selectedBotId);
      toast({
        title: '創建成功',
        description: '邏輯模板創建成功'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '創建失敗',
        description: err instanceof Error ? err.message : '創建邏輯模板失敗'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 刪除邏輯模板
  const handleDeleteLogicTemplate = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      if (onLogicTemplateDelete) {
        await onLogicTemplateDelete(templateToDelete.id);
      }
      setTemplateToDelete(null);
      await loadLogicTemplates(selectedBotId);
      toast({
        title: '刪除成功',
        description: '邏輯模板已刪除'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '刪除失敗',
        description: err instanceof Error ? err.message : '刪除邏輯模板失敗'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedBotId) {
    return (
      <div className={variant === 'toolbar' ? 'text-sm text-slate-500' : 'p-4 text-center text-sm text-slate-500'}>
        請先選擇一個 Bot
      </div>
    );
  }

  const containerClassName = variant === 'toolbar'
    ? `flex min-h-11 min-w-0 items-center overflow-x-auto overflow-y-visible bg-transparent px-2 py-1 ${className}`
    : `space-y-3 border-b border-white/60 bg-white/55 p-3 backdrop-blur-xl ${className}`;
  const rowClassName = variant === 'toolbar'
    ? 'flex min-w-max flex-1 flex-nowrap items-center justify-end gap-2'
    : 'flex flex-wrap items-center gap-2';
  const _selectClassName = variant === 'toolbar'
    ? 'app-input h-8 w-52 shrink-0'
    : 'app-input w-52';
  const buttonClassName = variant === 'toolbar'
    ? 'h-8 shrink-0'
    : 'h-10';

  const selectedTemplateName = logicTemplates.find(t => t.id === selectedLogicTemplateId)?.name;

  return (
    <>
      <div className={containerClassName}>
        {/* 邏輯模板管理 */}
        <div className={rowClassName}>
          <span className="whitespace-nowrap text-sm font-medium text-slate-600">邏輯模板</span>

          {/* 自訂下拉選單（支援每列刪除 icon） */}
          <Popover open={isDropdownOpen} onOpenChange={(open) => {
            if (!disabled && !isLoadingLogicTemplates) setIsDropdownOpen(open);
          }}>
            <PopoverTrigger asChild>
              <button
                className="inline-flex h-8 w-52 shrink-0 items-center justify-between gap-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoadingLogicTemplates || disabled}
              >
                <span className="truncate">
                  {isLoadingLogicTemplates
                    ? '載入中...'
                    : selectedTemplateName
                    ? selectedTemplateName
                    : <span className="text-muted-foreground">選擇邏輯模板</span>}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-1" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
              {logicTemplates.length === 0 ? (
                <div className="px-2 py-3 text-center text-sm text-slate-400">尚無邏輯模板</div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {logicTemplates.map(template => (
                    <div
                      key={template.id}
                      className={`group flex items-center justify-between gap-1 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${
                        template.id === selectedLogicTemplateId ? 'bg-accent/60 font-medium' : ''
                      }`}
                    >
                      <span
                        className="flex-1 truncate"
                        onClick={() => {
                          if (onLogicTemplateSelect) onLogicTemplateSelect(template.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {template.name}
                        {template.is_active === 'true' && (
                          <span className="ml-1 text-xs text-emerald-600">(啟用中)</span>
                        )}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template);
                          setIsDropdownOpen(false);
                        }}
                        className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="刪除此模板"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {isLoadingLogicTemplates && (
            <div className="scale-50">
              <Loader fullPage={false} />
            </div>
          )}

          {/* 新增按鈕 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewLogicTemplateName('');
              setShowCreateDialog(true);
            }}
            disabled={disabled}
            className={`app-secondary-button ${buttonClassName}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增
          </Button>

        </div>
      </div>

      {/* 新增模板浮動對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) setNewLogicTemplateName('');
      }}>
        <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => {
          e.preventDefault();
          setTimeout(() => inputRef.current?.focus(), 50);
        }}>
          <DialogHeader>
            <DialogTitle>新增邏輯模板</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              ref={inputRef}
              value={newLogicTemplateName}
              onChange={(e) => setNewLogicTemplateName(e.target.value)}
              className="app-input"
              placeholder="請輸入模板名稱"
              onKeyDown={(e) => e.key === 'Enter' && !isCreating && newLogicTemplateName.trim() && handleCreateLogicTemplate()}
              disabled={isCreating}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreateDialog(false);
                setNewLogicTemplateName('');
              }}
              disabled={isCreating}
              className="app-secondary-button"
            >
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateLogicTemplate}
              disabled={!newLogicTemplateName.trim() || isCreating}
              className="app-primary-button"
            >
              {isCreating ? '建立中...' : '確認建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除模板確認對話框 */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => { if (!open) setTemplateToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除邏輯模板</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除邏輯模板「{templateToDelete?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLogicTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '刪除中...' : '確認刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LogicTemplateSelector;
