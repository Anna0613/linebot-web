import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import VisualEditorApi, { BotSummary } from '@/features/visual-editor/api/visualEditorApi';

interface ProjectManagerProps {
  selectedBotId?: string;
  onBotSelect?: (botId: string) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  selectedBotId,
  onBotSelect
}) => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const { toast } = useToast();


  // 載入用戶的 Bot 列表
  const loadBots = useCallback(async () => {
    setIsLoadingBots(true);
    try {
      const botsList = await VisualEditorApi.getUserBotsSummary();
      setBots(botsList);
      
      // 如果沒有 Bot，顯示提示訊息
      if (botsList.length === 0) {
        toast({
          title: '温馨提示',
          description: '目前沒有可用的 Bot，請先到 Bot 管理頁面建立 Bot'
        });
      }
    } catch (err) {
      // 只有在真正的錯誤時才顯示錯誤訊息
      console.warn('載入 Bot 列表時發生問題:', err);
      toast({
        variant: 'destructive',
        title: '載入失敗',
        description: '載入 Bot 列表失敗，請確保後端服務正在運行'
      });
    } finally {
      setIsLoadingBots(false);
    }
  }, [toast]);

  // 組件載入時取得 Bot 列表
  useEffect(() => {
    loadBots();
  }, [loadBots]);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        {/* Bot 選擇器 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">選擇 Bot:</span>
          <Select 
            value={selectedBotId} 
            onValueChange={(value) => {
              if (value !== 'no-bots' && onBotSelect) {
                onBotSelect(value);
              }
            }}
            disabled={isLoadingBots}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={isLoadingBots ? "載入中..." : "選擇一個 Bot"} />
            </SelectTrigger>
            <SelectContent>
              {bots.map(bot => (
                <SelectItem key={bot.id} value={bot.id}>
                  {bot.name}
                </SelectItem>
              ))}
              {bots.length === 0 && !isLoadingBots && (
                <SelectItem value="no-bots" disabled>
                  尚無可用的 Bot
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {isLoadingBots && (
            <div className="scale-50">
              <Loader fullPage={false} web3Style={true} />
            </div>
          )}
          {!isLoadingBots && bots.length === 0 && (
            <Button
              size="sm"
              onClick={() => navigate('/bots/create')}
              className="web3-primary-button"
            >
              <Plus className="mr-1 h-4 w-4" />
              建立 Bot
            </Button>
          )}
        </div>

        {/* 移除專案名稱輸入欄位 */}
        {/* 已移除匯出、匯入、儲存、測試按鈕 */}
      </div>
    </div>
  );
};

export default ProjectManager;
