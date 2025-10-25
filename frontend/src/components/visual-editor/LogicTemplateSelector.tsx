import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader } from '../ui/loader';
import { Plus, Save } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import VisualEditorApi, { LogicTemplateSummary } from '../../services/visualEditorApi';
import { generateUnifiedCode } from '../../utils/unifiedCodeGenerator';
import { UnifiedBlock } from '../../types/block';

interface LogicTemplateSelectorProps {
  selectedBotId: string;
  selectedLogicTemplateId?: string;
  onLogicTemplateSelect?: (templateId: string) => void;
  onLogicTemplateCreate?: (name: string) => void;
  onLogicTemplateSave?: (templateId: string, data: { logicBlocks: UnifiedBlock[], generatedCode: string }) => void;
  logicBlocks: UnifiedBlock[];
  disabled?: boolean;
}

const LogicTemplateSelector: React.FC<LogicTemplateSelectorProps> = ({
  selectedBotId,
  selectedLogicTemplateId,
  onLogicTemplateSelect,
  onLogicTemplateCreate,
  onLogicTemplateSave,
  logicBlocks,
  disabled = false
}) => {
  const [logicTemplates, setLogicTemplates] = useState<LogicTemplateSummary[]>([]);
  const [isLoadingLogicTemplates, setIsLoadingLogicTemplates] = useState(false);
  const [newLogicTemplateName, setNewLogicTemplateName] = useState('');
  const [showCreateLogicTemplate, setShowCreateLogicTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

    try {
      if (onLogicTemplateCreate) {
        await onLogicTemplateCreate(newLogicTemplateName.trim());
      }
      setNewLogicTemplateName('');
      setShowCreateLogicTemplate(false);
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
    }
  };

  // 儲存邏輯模板
  const saveLogicTemplate = async () => {
    if (!selectedLogicTemplateId) {
      toast({
        variant: 'destructive',
        title: '儲存失敗',
        description: '請先選擇一個邏輯模板'
      });
      return;
    }

    setIsSaving(true);
    try {
      const generatedCode = generateUnifiedCode(logicBlocks, []);
      if (onLogicTemplateSave) {
        await onLogicTemplateSave(selectedLogicTemplateId, {
          logicBlocks,
          generatedCode
        });
      }
      toast({
        title: '儲存成功',
        description: '邏輯模板儲存成功'
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: '儲存失敗',
        description: err instanceof Error ? err.message : '儲存邏輯模板失敗'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedBotId) {
    return (
      <div className="p-4 text-center text-gray-500">
        請先選擇一個 Bot
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border-b space-y-3">
      {/* 邏輯模板管理 */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">邏輯模板:</span>
        <Select 
          value={selectedLogicTemplateId} 
          onValueChange={(value) => {
            if (value !== 'no-templates' && onLogicTemplateSelect) {
              onLogicTemplateSelect(value);
            }
          }}
          disabled={isLoadingLogicTemplates || disabled}
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
        {isLoadingLogicTemplates && (
          <div className="scale-50">
            <Loader fullPage={false} web3Style={true} />
          </div>
        )}
        
        {/* 創建新邏輯模板按鈕 */}
        {!showCreateLogicTemplate ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateLogicTemplate(true)}
            disabled={disabled}
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
              disabled={disabled}
            />
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleCreateLogicTemplate}
              disabled={!newLogicTemplateName.trim() || disabled}
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
              disabled={disabled}
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
          disabled={!selectedLogicTemplateId || isSaving || disabled}
        >
          {isSaving ? (
            <div className="scale-50 mr-1">
              <Loader fullPage={false} web3Style={true} />
            </div>
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          {isSaving ? '儲存中...' : '儲存邏輯'}
        </Button>
      </div>
    </div>
  );
};

export default LogicTemplateSelector;