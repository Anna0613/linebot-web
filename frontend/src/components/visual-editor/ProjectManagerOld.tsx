import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, Upload, Save, Play, Loader2, AlertCircle, Plus, /* Edit, Trash */ } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import VisualEditorApi, { BotSummary, LogicTemplateSummary, FlexMessageSummary } from '../../services/visualEditorApi';
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
  // 新增邏輯模板相關 props
  selectedLogicTemplateId?: string;
  onLogicTemplateSelect?: (templateId: string) => void;
  onLogicTemplateCreate?: (name: string) => void;
  onLogicTemplateSave?: (templateId: string, data: { logicBlocks: Block[], generatedCode: string }) => void;
  // 新增 FlexMessage 相關 props
  selectedFlexMessageId?: string;
  onFlexMessageSelect?: (messageId: string) => void;
  onFlexMessageCreate?: (name: string) => void;
  onFlexMessageSave?: (messageId: string, data: { flexBlocks: Block[] }) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ 
  logicBlocks, 
  flexBlocks, 
  onImport,
  selectedBotId,
  onBotSelect,
  onSaveToBot,
  selectedLogicTemplateId,
  onLogicTemplateSelect,
  onLogicTemplateCreate,
  onLogicTemplateSave,
  selectedFlexMessageId,
  onFlexMessageSelect,
  onFlexMessageCreate,
  onFlexMessageSave
}) => {
  const [projectName, setProjectName] = useState('我的 LINE Bot 專案');
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [logicTemplates, setLogicTemplates] = useState<LogicTemplateSummary[]>([]);
  const [flexMessages, setFlexMessages] = useState<FlexMessageSummary[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const [isLoadingLogicTemplates, setIsLoadingLogicTemplates] = useState(false);
  const [isLoadingFlexMessages, setIsLoadingFlexMessages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newLogicTemplateName, setNewLogicTemplateName] = useState('');
  const [newFlexMessageName, setNewFlexMessageName] = useState('');
  const [showCreateLogicTemplate, setShowCreateLogicTemplate] = useState(false);
  const [showCreateFlexMessage, setShowCreateFlexMessage] = useState(false);

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

  // 組件載入時取得 Bot 列表和 FlexMessage 列表
  useEffect(() => {
    loadBots();
    loadFlexMessages();
  }, []);

  // 當選擇的 Bot 改變時，載入對應的邏輯模板
  useEffect(() => {
    if (selectedBotId) {
      loadLogicTemplates(selectedBotId);
    } else {
      setLogicTemplates([]);
    }
  }, [selectedBotId]);

  // 清除錯誤訊息
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // 創建新邏輯模板
  const handleCreateLogicTemplate = async () => {
    if (!selectedBotId || !newLogicTemplateName.trim()) {
      setError('請輸入邏輯模板名稱');
      return;
    }

    try {
      if (onLogicTemplateCreate) {
        await onLogicTemplateCreate(newLogicTemplateName.trim());
      }
      setNewLogicTemplateName('');
      setShowCreateLogicTemplate(false);
      await loadLogicTemplates(selectedBotId);
      setSuccess('邏輯模板創建成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '創建邏輯模板失敗');
    }
  };

  // 創建新 FlexMessage
  const handleCreateFlexMessage = async () => {
    if (!newFlexMessageName.trim()) {
      setError('請輸入 FlexMessage 名稱');
      return;
    }

    try {
      if (onFlexMessageCreate) {
        await onFlexMessageCreate(newFlexMessageName.trim());
      }
      setNewFlexMessageName('');
      setShowCreateFlexMessage(false);
      await loadFlexMessages();
      setSuccess('FlexMessage 創建成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '創建 FlexMessage 失敗');
    }
  };

  // 儲存邏輯模板
  const saveLogicTemplate = async () => {
    if (!selectedLogicTemplateId) {
      setError('請先選擇一個邏輯模板');
      return;
    }

    try {
      const generatedCode = generateUnifiedCode(logicBlocks, []);
      if (onLogicTemplateSave) {
        await onLogicTemplateSave(selectedLogicTemplateId, {
          logicBlocks,
          generatedCode
        });
      }
      setSuccess('邏輯模板儲存成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存邏輯模板失敗');
    }
  };

  // 儲存 FlexMessage
  const saveFlexMessage = async () => {
    if (!selectedFlexMessageId) {
      setError('請先選擇一個 FlexMessage');
      return;
    }

    try {
      if (onFlexMessageSave) {
        await onFlexMessageSave(selectedFlexMessageId, {
          flexBlocks
        });
      }
      setSuccess('FlexMessage 儲存成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存 FlexMessage 失敗');
    }
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

      {/* 第一行：Bot 選擇器 */}
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
      </div>

      {/* 第二行：邏輯模板與 FlexMessage 管理 */}
      {selectedBotId && (
        <div className="flex flex-col space-y-3">
          {/* 邏輯模板管理 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">邏輯模板:</span>
            <Select 
              value={selectedLogicTemplateId} 
              onValueChange={(value) => {
                if (value !== 'no-templates' && onLogicTemplateSelect) {
                  onLogicTemplateSelect(value);
                }
                clearMessages();
              }}
              disabled={isLoadingLogicTemplates}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={isLoadingLogicTemplates ? "載入中..." : "選擇邏輯模板"} />
              </SelectTrigger>
              <SelectContent>
                {logicTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.is_active === 'true' && '(啟用中)'}
                  </SelectItem>
                ))}
                {logicTemplates.length === 0 && !isLoadingLogicTemplates && (
                  <SelectItem value="no-templates" disabled>
                    尚無邏輯模板
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {isLoadingLogicTemplates && <Loader2 className="h-4 w-4 animate-spin" />}
            
            {/* 創建新邏輯模板按鈕 */}
            {!showCreateLogicTemplate ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateLogicTemplate(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                新增
              </Button>
            ) : (
              <div className="flex items-center space-x-2">
                <Input
                  value={newLogicTemplateName}
                  onChange={(e) => setNewLogicTemplateName(e.target.value)}
                  className="w-32"
                  placeholder="模板名稱"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateLogicTemplate()}
                />
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleCreateLogicTemplate}
                  disabled={!newLogicTemplateName.trim()}
                >
                  確認
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowCreateLogicTemplate(false);
                    setNewLogicTemplateName('');
                  }}
                >
                  取消
                </Button>
              </div>
            )}
            
            {/* 儲存邏輯模板按鈕 */}
            <Button 
              variant="default" 
              size="sm" 
              onClick={saveLogicTemplate}
              disabled={!selectedLogicTemplateId}
            >
              <Save className="w-4 h-4 mr-1" />
              儲存邏輯
            </Button>
          </div>

          {/* FlexMessage 管理 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">FlexMessage:</span>
            <Select 
              value={selectedFlexMessageId} 
              onValueChange={(value) => {
                if (value !== 'no-messages' && onFlexMessageSelect) {
                  onFlexMessageSelect(value);
                }
                clearMessages();
              }}
              disabled={isLoadingFlexMessages}
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
                />
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleCreateFlexMessage}
                  disabled={!newFlexMessageName.trim()}
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
              disabled={!selectedFlexMessageId}
            >
              <Save className="w-4 h-4 mr-1" />
              儲存訊息
            </Button>
          </div>
        </div>
      )}

      {/* 第三行：專案管理功能 */}
      <div className="flex items-center space-x-4">

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