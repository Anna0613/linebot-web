import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, Upload, Save, Play, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import VisualEditorApi, { BotSummary } from '../../services/visualEditorApi';
import { generateUnifiedCode } from '../../utils/unifiedCodeGenerator';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface ProjectData {
  name: string;
  version?: string;
  createdAt?: string;
  logicBlocks: Block[];
  flexBlocks: Block[];
  metadata?: {
    description: string;
    author: string;
  };
  savedAt?: string;
}

interface ProjectManagerProps {
  logicBlocks: Block[];
  flexBlocks: Block[];
  onImport?: (projectData: ProjectData) => void;
  selectedBotId?: string;
  onBotSelect?: (botId: string) => void;
  onSaveToBot?: (botId: string, data: { logicBlocks: Block[], flexBlocks: Block[], generatedCode: string }) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  logicBlocks, 
  flexBlocks, 
  onImport,
  selectedBotId,
  onBotSelect,
  onSaveToBot
}) => {
  const [projectName, setProjectName] = useState('我的 LINE Bot 專案');
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const exportProject = () => {
    const projectData: ProjectData = {
      name: projectName,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      logicBlocks: logicBlocks,
      flexBlocks: flexBlocks,
      metadata: {
        description: '使用 LINE Bot 視覺化編輯器建立的專案',
        author: 'LINE Bot Visual Editor'
      }
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = e.target?.result as string;
            const projectData = JSON.parse(result) as ProjectData;
            if (projectData.logicBlocks && projectData.flexBlocks) {
              setProjectName(projectData.name || '匯入的專案');
              if (onImport) {
                onImport(projectData);
              }
            } else {
              alert('無效的專案檔案格式');
            }
          } catch (error) {
            alert('檔案讀取失敗：' + (error as Error).message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // 載入用戶的 Bot 列表
  const loadBots = async () => {
    setIsLoadingBots(true);
    setError(null);
    try {
      const botsList = await VisualEditorApi.getUserBotsSummary();
      setBots(botsList);
      
      // 如果沒有 Bot，顯示提示訊息
      if (botsList.length === 0) {
        setError('目前沒有可用的 Bot，請先到 Bot 管理頁面建立 Bot');
      }
    } catch (err) {
      // 只有在真正的錯誤時才顯示錯誤訊息
      console.warn('載入 Bot 列表時發生問題:', err);
      setError('載入 Bot 列表失敗，請確保後端服務正在運行');
    } finally {
      setIsLoadingBots(false);
    }
  };

  // 統一的儲存功能 - 儲存到資料庫
  const saveProject = async () => {
    if (!selectedBotId) {
      setError('請先選擇一個 Bot');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 生成程式碼
      const generatedCode = generateUnifiedCode(logicBlocks, flexBlocks);
      
      // 呼叫父組件的儲存函數
      if (onSaveToBot) {
        await onSaveToBot(selectedBotId, {
          logicBlocks,
          flexBlocks,
          generatedCode
        });
      }

      setSuccess('專案已成功儲存到資料庫');
      
      // 3秒後清除成功訊息
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const testBot = () => {
    // 切換到預覽標籤
    const previewTab = document.querySelector('[value="preview"]') as HTMLElement;
    if (previewTab) {
      previewTab.click();
    }
  };

  // 組件載入時取得 Bot 列表
  useEffect(() => {
    loadBots();
  }, []);

  // 清除錯誤訊息
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-4">
      {/* 錯誤和成功訊息 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

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
              clearMessages();
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
          {isLoadingBots && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {/* 專案名稱（保留用於本地儲存） */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">專案名稱:</span>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-32"
            placeholder="專案名稱"
          />
        </div>
      
        <Button variant="outline" size="sm" onClick={importProject}>
          <Upload className="w-4 h-4 mr-2" />
          匯入
        </Button>
        
        <Button variant="outline" size="sm" onClick={exportProject}>
          <Download className="w-4 h-4 mr-2" />
          匯出
        </Button>
        
        {/* 儲存按鈕 */}
        <Button 
          variant="default" 
          size="sm" 
          onClick={saveProject}
          disabled={!selectedBotId || isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? '儲存中...' : '儲存'}
        </Button>
        
        <Button variant="default" size="sm" onClick={testBot}>
          <Play className="w-4 h-4 mr-2" />
          測試
        </Button>
      </div>
    </div>
  );
};

export default ProjectManager;