import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Plus, Save } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import VisualEditorApi, { FlexMessageSummary } from '../../services/visualEditorApi';

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
  onFlexMessageCreate?: (name: string) => void;
  onFlexMessageSave?: (messageId: string, data: { flexBlocks: Block[] }) => void;
  flexBlocks: Block[];
  disabled?: boolean;
}

const FlexMessageSelector: React.FC<FlexMessageSelectorProps> = ({
  selectedFlexMessageId,
  onFlexMessageSelect,
  onFlexMessageCreate,
  onFlexMessageSave,
  flexBlocks,
  disabled = false
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

  return (
    <div className="p-4 bg-white border-b space-y-3">
      {/* FlexMessage 管理 */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">FlexMessage:</span>
        <Select 
          value={selectedFlexMessageId} 
          onValueChange={(value) => {
            if (value !== 'no-messages' && onFlexMessageSelect) {
              onFlexMessageSelect(value);
            }
          }}
          disabled={isLoadingFlexMessages || disabled}
        >
          <SelectTrigger className="w-48">
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
        {isLoadingFlexMessages && <Loader2 className="h-4 w-4 animate-spin" />}
        
        {/* 創建新 FlexMessage 按鈕 */}
        {!showCreateFlexMessage ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateFlexMessage(true)}
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增
          </Button>
        ) : (
          <div className="flex items-center space-x-2">
            <Input
              value={newFlexMessageName}
              onChange={(e) => setNewFlexMessageName(e.target.value)}
              className="w-32"
              placeholder="訊息名稱"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFlexMessage()}
              disabled={disabled}
            />
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleCreateFlexMessage}
              disabled={!newFlexMessageName.trim() || disabled}
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
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
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