import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { ChevronDown, Plus, Save, Trash2 } from 'lucide-react';
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
import VisualEditorApi, { FlexMessageSummary } from '@/features/visual-editor/api/visualEditorApi';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface FlexMessageSelectorProps {
  selectedFlexMessageId?: string;
  onFlexMessageSelect?: (messageId: string) => void;
  onFlexMessageCreate?: (name: string) => Promise<unknown> | unknown;
  onFlexMessageSave?: (messageId: string, data: { flexBlocks: Block[] }) => Promise<unknown> | unknown;
  onFlexMessageDelete?: (messageId: string) => Promise<unknown> | unknown;
  flexBlocks: Block[];
  disabled?: boolean;
  variant?: 'panel' | 'toolbar';
  className?: string;
}

const FlexMessageSelector: React.FC<FlexMessageSelectorProps> = ({
  selectedFlexMessageId,
  onFlexMessageSelect,
  onFlexMessageCreate,
  onFlexMessageSave,
  onFlexMessageDelete,
  flexBlocks,
  disabled = false,
  variant = 'panel',
  className = ''
}) => {
  const [flexMessages, setFlexMessages] = useState<FlexMessageSummary[]>([]);
  const [isLoadingFlexMessages, setIsLoadingFlexMessages] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newFlexMessageName, setNewFlexMessageName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<FlexMessageSummary | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 載入 FlexMessage 列表
  const loadFlexMessages = async () => {
    setIsLoadingFlexMessages(true);
    try {
      const messages = await VisualEditorApi.getUserFlexMessagesSummary();
      setFlexMessages(messages);
    } catch (err) {
      console.warn('載入 FlexMessage 列表失敗:', err);
      setFlexMessages([]);
    } finally {
      setIsLoadingFlexMessages(false);
    }
  };

  // 組件載入時取得 FlexMessage 列表
  useEffect(() => {
    loadFlexMessages();
  }, []);

  // 創建新 FlexMessage
  const handleCreateFlexMessage = async () => {
    if (!newFlexMessageName.trim()) {
      toast({
        variant: 'destructive',
        title: '創建失敗',
        description: '請輸入 FlexMessage 名稱'
      });
      return;
    }

    setIsCreating(true);
    try {
      if (onFlexMessageCreate) {
        await onFlexMessageCreate(newFlexMessageName.trim());
      }
      setNewFlexMessageName('');
      setShowCreateDialog(false);
      await loadFlexMessages();
      toast({
        title: '創建成功',
        description: 'FlexMessage 創建成功'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '創建失敗',
        description: err instanceof Error ? err.message : '創建 FlexMessage 失敗'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 刪除 FlexMessage
  const handleDeleteFlexMessage = async () => {
    if (!messageToDelete) return;

    setIsDeleting(true);
    try {
      if (onFlexMessageDelete) {
        await onFlexMessageDelete(messageToDelete.id);
      }
      setMessageToDelete(null);
      await loadFlexMessages();
      toast({
        title: '刪除成功',
        description: 'FlexMessage 已刪除'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '刪除失敗',
        description: err instanceof Error ? err.message : '刪除 FlexMessage 失敗'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 儲存 FlexMessage
  const saveFlexMessage = async () => {
    if (!selectedFlexMessageId) {
      toast({
        variant: 'destructive',
        title: '儲存失敗',
        description: '請先選擇一個 FlexMessage'
      });
      return;
    }

    setIsSaving(true);
    try {
      if (onFlexMessageSave) {
        await onFlexMessageSave(selectedFlexMessageId, {
          flexBlocks
        });
      }
      toast({
        title: '儲存成功',
        description: 'FlexMessage 儲存成功'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '儲存失敗',
        description: err instanceof Error ? err.message : '儲存 FlexMessage 失敗'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const containerClassName = variant === 'toolbar'
    ? `flex min-h-11 min-w-0 items-center overflow-x-auto overflow-y-visible bg-transparent px-2 py-1 ${className}`
    : `space-y-3 border-b border-white/60 bg-white/55 p-3 backdrop-blur-xl ${className}`;
  const rowClassName = variant === 'toolbar'
    ? 'flex min-w-max flex-1 flex-nowrap items-center justify-end gap-2'
    : 'flex flex-wrap items-center gap-2';
  const selectClassName = variant === 'toolbar'
    ? 'app-input h-8 w-52 shrink-0'
    : 'app-input w-52';
  const buttonClassName = variant === 'toolbar'
    ? 'h-8 shrink-0'
    : 'h-10';

  const selectedMessageName = flexMessages.find(m => m.id === selectedFlexMessageId)?.name;

  return (
    <>
      <div className={containerClassName}>
        {/* FlexMessage 管理 */}
        <div className={rowClassName}>
          <span className="whitespace-nowrap text-sm font-medium text-slate-600">FlexMessage</span>

          {/* 自訂下拉選單（支援每列刪除 icon） */}
          <Popover open={isDropdownOpen} onOpenChange={(open) => {
            if (!disabled && !isLoadingFlexMessages) setIsDropdownOpen(open);
          }}>
            <PopoverTrigger asChild>
              <button
                className="inline-flex h-8 w-52 shrink-0 items-center justify-between gap-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoadingFlexMessages || disabled}
              >
                <span className="truncate">
                  {isLoadingFlexMessages
                    ? '載入中...'
                    : selectedMessageName
                    ? selectedMessageName
                    : <span className="text-muted-foreground">選擇 FlexMessage</span>}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-1" style={{ width: 'var(--radix-popover-trigger-width)' }} align="start">
              {flexMessages.length === 0 ? (
                <div className="px-2 py-3 text-center text-sm text-slate-400">尚無 FlexMessage</div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {flexMessages.map(message => (
                    <div
                      key={message.id}
                      className={`group flex items-center justify-between gap-1 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${
                        message.id === selectedFlexMessageId ? 'bg-accent/60 font-medium' : ''
                      }`}
                    >
                      <span
                        className="flex-1 truncate"
                        onClick={() => {
                          if (onFlexMessageSelect) onFlexMessageSelect(message.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {message.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageToDelete(message);
                          setIsDropdownOpen(false);
                        }}
                        className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="刪除此訊息"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {isLoadingFlexMessages && (
            <div className="scale-50">
              <Loader fullPage={false} />
            </div>
          )}

          {/* 新增按鈕 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewFlexMessageName('');
              setShowCreateDialog(true);
            }}
            disabled={disabled}
            className={`app-secondary-button ${buttonClassName}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增
          </Button>

          {/* 儲存 FlexMessage 按鈕 */}
          <Button
            variant="default"
            size="sm"
            onClick={saveFlexMessage}
            disabled={!selectedFlexMessageId || isSaving || disabled}
            className={`app-primary-button ${buttonClassName}`}
          >
            {isSaving ? (
              <div className="scale-50 mr-1">
                <Loader fullPage={false} />
              </div>
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {isSaving ? '儲存中...' : '儲存訊息'}
          </Button>
        </div>
      </div>

      {/* 新增 FlexMessage 浮動對話框 */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) setNewFlexMessageName('');
      }}>
        <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => {
          e.preventDefault();
          setTimeout(() => inputRef.current?.focus(), 50);
        }}>
          <DialogHeader>
            <DialogTitle>新增 FlexMessage</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              ref={inputRef}
              value={newFlexMessageName}
              onChange={(e) => setNewFlexMessageName(e.target.value)}
              className="app-input"
              placeholder="請輸入訊息名稱"
              onKeyDown={(e) => e.key === 'Enter' && !isCreating && newFlexMessageName.trim() && handleCreateFlexMessage()}
              disabled={isCreating}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreateDialog(false);
                setNewFlexMessageName('');
              }}
              disabled={isCreating}
              className="app-secondary-button"
            >
              取消
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateFlexMessage}
              disabled={!newFlexMessageName.trim() || isCreating}
              className="app-primary-button"
            >
              {isCreating ? '建立中...' : '確認建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除 FlexMessage 確認對話框 */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => { if (!open) setMessageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除 FlexMessage</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除 FlexMessage「{messageToDelete?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlexMessage}
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

export default FlexMessageSelector;
