import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  flexBlocks,
  disabled = false,
  variant = 'panel',
  className = ''
}) => {
  const [flexMessages, setFlexMessages] = useState<FlexMessageSummary[]>([]);
  const [isLoadingFlexMessages, setIsLoadingFlexMessages] = useState(false);
  const [newFlexMessageName, setNewFlexMessageName] = useState('');
  const [showCreateFlexMessage, setShowCreateFlexMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

    try {
      if (onFlexMessageCreate) {
        await onFlexMessageCreate(newFlexMessageName.trim());
      }
      setNewFlexMessageName('');
      setShowCreateFlexMessage(false);
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

  return (
    <div className={containerClassName}>
      {/* FlexMessage 管理 */}
      <div className={rowClassName}>
        <span className="whitespace-nowrap text-sm font-medium text-slate-600">FlexMessage</span>
        <Select 
          value={selectedFlexMessageId} 
          onValueChange={(value) => {
            if (value !== 'no-messages' && onFlexMessageSelect) {
              onFlexMessageSelect(value);
            }
          }}
          disabled={isLoadingFlexMessages || disabled}
        >
          <SelectTrigger className={selectClassName}>
            <SelectValue placeholder={isLoadingFlexMessages ? "載入中..." : "選擇 FlexMessage"} />
          </SelectTrigger>
          <SelectContent>
            {flexMessages.map(message => (
              <SelectItem key={message.id} value={message.id}>
                {message.name}
              </SelectItem>
            ))}
            {flexMessages.length === 0 && !isLoadingFlexMessages && (
              <SelectItem value="no-messages" disabled>
                尚無 FlexMessage
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {isLoadingFlexMessages && (
          <div className="scale-50">
            <Loader fullPage={false} />
          </div>
        )}
        
        {/* 創建新 FlexMessage 按鈕 */}
        {!showCreateFlexMessage ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateFlexMessage(true)}
            disabled={disabled}
            className={`app-secondary-button ${buttonClassName}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newFlexMessageName}
              onChange={(e) => setNewFlexMessageName(e.target.value)}
              className="app-input h-8 w-40"
              placeholder="訊息名稱"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFlexMessage()}
              disabled={disabled}
            />
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleCreateFlexMessage}
              disabled={!newFlexMessageName.trim() || disabled}
              className={`app-primary-button ${buttonClassName}`}
            >
              確認
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowCreateFlexMessage(false);
                setNewFlexMessageName('');
              }}
              disabled={disabled}
              className={`app-secondary-button ${buttonClassName}`}
            >
              取消
            </Button>
          </div>
        )}
        
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
  );
};

export default FlexMessageSelector;
