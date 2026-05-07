import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader } from '@/components/ui/loader';
import { Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import VisualEditorApi, { LogicTemplateSummary } from '@/features/visual-editor/api/visualEditorApi';
import { generateWorkflowCode } from '@/features/visual-editor/utils/workflowCodeGenerator';
import { WorkflowGraph } from '@/features/visual-editor/types/workflow';

interface LogicTemplateSelectorProps {
  selectedBotId: string;
  selectedLogicTemplateId?: string;
  onLogicTemplateSelect?: (templateId: string) => void;
  onLogicTemplateCreate?: (name: string) => Promise<unknown> | unknown;
  onLogicTemplateSave?: (templateId: string, data: { workflowGraph: WorkflowGraph, generatedCode: string }) => Promise<unknown> | unknown;
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
  onLogicTemplateSave,
  workflowGraph,
  disabled = false,
  variant = 'panel',
  className = ''
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
      if (!workflowGraph) {
        throw new Error('目前模板不是新版節點流程格式，無法儲存');
      }

      const generatedCode = generateWorkflowCode(workflowGraph);
      if (onLogicTemplateSave) {
        await onLogicTemplateSave(selectedLogicTemplateId, {
          workflowGraph,
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
  const selectClassName = variant === 'toolbar'
    ? 'app-input h-8 w-52 shrink-0'
    : 'app-input w-52';
  const buttonClassName = variant === 'toolbar'
    ? 'h-8 shrink-0'
    : 'h-10';

  return (
    <div className={containerClassName}>
      {/* 邏輯模板管理 */}
      <div className={rowClassName}>
        <span className="whitespace-nowrap text-sm font-medium text-slate-600">邏輯模板</span>
        <Select 
          value={selectedLogicTemplateId} 
          onValueChange={(value) => {
            if (value !== 'no-templates' && onLogicTemplateSelect) {
              onLogicTemplateSelect(value);
            }
          }}
          disabled={isLoadingLogicTemplates || disabled}
        >
          <SelectTrigger className={selectClassName}>
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
            <Loader fullPage={false} />
          </div>
        )}
        
        {/* 創建新邏輯模板按鈕 */}
        {!showCreateLogicTemplate ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowCreateLogicTemplate(true)}
            disabled={disabled}
            className={`app-secondary-button ${buttonClassName}`}
          >
            <Plus className="w-4 h-4 mr-1" />
            新增
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newLogicTemplateName}
              onChange={(e) => setNewLogicTemplateName(e.target.value)}
              className="app-input h-8 w-40"
              placeholder="模板名稱"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateLogicTemplate()}
              disabled={disabled}
            />
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleCreateLogicTemplate}
              disabled={!newLogicTemplateName.trim() || disabled}
              className={`app-primary-button ${buttonClassName}`}
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
              className={`app-secondary-button ${buttonClassName}`}
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
          disabled={!selectedLogicTemplateId || !workflowGraph || isSaving || disabled}
          className={`app-primary-button ${buttonClassName}`}
        >
          {isSaving ? (
            <div className="scale-50 mr-1">
              <Loader fullPage={false} />
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
