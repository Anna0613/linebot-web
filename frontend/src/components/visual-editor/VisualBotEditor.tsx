import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DragDropProvider from './DragDropProvider';
import Workspace from './Workspace';
import ProjectManager from './ProjectManager';
import SaveStatusIndicator from './SaveStatusIndicator';
import { SaveStatus } from '../../types/saveStatus';
import { Button } from '../ui/button';
import { UnifiedBlock } from '../../types/block';
import VisualEditorApi from '../../services/visualEditorApi';
import PerformanceDashboard from './PerformanceDashboard';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';

// 專案資料介面
interface ProjectData {
  name: string;
  logicBlocks: UnifiedBlock[];
  flexBlocks: UnifiedBlock[];
  version?: string;
}

export const VisualBotEditor: React.FC = () => {
  const navigate = useNavigate();
  const [logicBlocks, setLogicBlocks] = useState<UnifiedBlock[]>([]);
  const [flexBlocks, setFlexBlocks] = useState<UnifiedBlock[]>([]);
  const [projectVersion, setProjectVersion] = useState<string>('2.0'); // 新版本使用統一積木系統
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [selectedLogicTemplateId, setSelectedLogicTemplateId] = useState<string>('');
  const [selectedFlexMessageId, setSelectedFlexMessageId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentLogicTemplateName, setCurrentLogicTemplateName] = useState<string>('');
  const [currentFlexMessageName, setCurrentFlexMessageName] = useState<string>('');

  // 延遲儲存相關狀態
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.SAVED);
  const [lastSavedTime, setLastSavedTime] = useState<Date | undefined>();
  const [saveError, setSaveError] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);

  // 性能監控 Hook
  const { measureInteraction } = usePerformanceMonitor();

  // 標記為有未儲存變更 - 使用防抖優化
  const markAsChanged = useCallback(() => {
    if (saveStatus !== SaveStatus.PENDING) {
      setSaveStatus(SaveStatus.PENDING);
      setHasUnsavedChanges(true);
      setSaveError('');
    }
  }, [saveStatus]);

  // 防抖版本的標記變更函數
  const debouncedMarkAsChanged = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          markAsChanged();
        }, 300); // 300ms 防抖延遲
      };
    },
    [markAsChanged]
  );

  // 處理返回上一頁
  const handleGoBack = () => {
    // 如果有未儲存的變更，先嘗試儲存
    if (hasUnsavedChanges) {
      if (confirm('您有未儲存的變更，確定要離開嗎？變更將會遺失。')) {
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  // 監聽積木變更，標記為未儲存
  const isInitialLoadRef = useRef(true);

  // 頁面離開前的確認
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '您有未儲存的變更，確定要離開嗎？';
        return '您有未儲存的變更，確定要離開嗎？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);



  // 處理 Bot 選擇變更 - 添加性能監控
  const handleBotSelect = async (botId: string) => {
    measureInteraction('bot-selection', () => {
      setSelectedBotId(botId);
      // 清空邏輯模板和 FlexMessage 選擇
      setSelectedLogicTemplateId('');
      setSelectedFlexMessageId('');
      setCurrentLogicTemplateName('');
      setCurrentFlexMessageName('');
      
      if (botId && VisualEditorApi.isValidBotId(botId)) {
        // 清空當前積木，等待用戶選擇邏輯模板和 FlexMessage
        setLogicBlocks([]);
        setFlexBlocks([]);
      } else {
        // 清空積木
        setLogicBlocks([]);
        setFlexBlocks([]);
      }
    });
  };

  // 處理邏輯模板選擇變更
  const handleLogicTemplateSelect = async (templateId: string) => {
    setSelectedLogicTemplateId(templateId);
    
    if (templateId) {
      setIsLoadingData(true);
      try {
        const template = await VisualEditorApi.getLogicTemplate(templateId);
        setLogicBlocks(template.logic_blocks || []);
        setCurrentLogicTemplateName(template.name);
        
        // 重置儲存狀態為已儲存（剛載入的數據）
        setSaveStatus(SaveStatus.SAVED);
        setHasUnsavedChanges(false);
        setSaveError('');
        setLastSavedTime(new Date(template.updated_at));
        
        console.log(`已載入邏輯模板 ${template.name} 的數據`);
      } catch (error) {
        console.error("Error occurred:", error);
        setLogicBlocks([]);
        setCurrentLogicTemplateName('');
        setSaveStatus(SaveStatus.ERROR);
        setSaveError('載入邏輯模板失敗');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setLogicBlocks([]);
      setCurrentLogicTemplateName('');
      setSaveStatus(SaveStatus.SAVED);
      setHasUnsavedChanges(false);
      setSaveError('');
    }
  };

  // 處理 FlexMessage 選擇變更
  const handleFlexMessageSelect = async (messageId: string) => {
    setSelectedFlexMessageId(messageId);
    
    if (messageId) {
      setIsLoadingData(true);
      try {
        const messages = await VisualEditorApi.getUserFlexMessages();
        const message = messages.find(m => m.id === messageId);
        if (message && message.content && message.content.blocks) {
          setFlexBlocks(message.content.blocks || []);
          setCurrentFlexMessageName(message.name);
          
          // 重置儲存狀態為已儲存（剛載入的數據）
          setSaveStatus(SaveStatus.SAVED);
          setHasUnsavedChanges(false);
          setSaveError('');
          setLastSavedTime(new Date(message.updated_at));
          
          console.log(`已載入 FlexMessage ${message.name} 的數據`);
        } else {
          setFlexBlocks([]);
          setCurrentFlexMessageName(message?.name || '');
          setSaveStatus(SaveStatus.SAVED);
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error("Error occurred:", error);
        setFlexBlocks([]);
        setCurrentFlexMessageName('');
        setSaveStatus(SaveStatus.ERROR);
        setSaveError('載入 FlexMessage 失敗');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setFlexBlocks([]);
      setCurrentFlexMessageName('');
      setSaveStatus(SaveStatus.SAVED);
      setHasUnsavedChanges(false);
      setSaveError('');
    }
  };

  // 創建新邏輯模板
  const handleLogicTemplateCreate = async (name: string) => {
    if (!selectedBotId) {
      throw new Error('請先選擇一個 Bot');
    }

    try {
      const template = await VisualEditorApi.createLogicTemplate(selectedBotId, {
        name,
        description: `由視覺化編輯器創建的邏輯模板`,
        logic_blocks: [],
        is_active: 'false'
      });
      
      // 自動選擇新創建的邏輯模板
      await handleLogicTemplateSelect(template.id);
      console.log('邏輯模板創建成功:', template);
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw error;
    }
  };

  // 創建新 FlexMessage
  const handleFlexMessageCreate = async (name: string) => {
    try {
      const message = await VisualEditorApi.createFlexMessage({
        name,
        content: { blocks: [] }
      });
      
      // 自動選擇新創建的 FlexMessage
      await handleFlexMessageSelect(message.id);
      console.log('FlexMessage 創建成功:', message);
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw error;
    }
  };

  // 儲存邏輯模板
  const handleLogicTemplateSave = async (templateId: string, data: { logicBlocks: UnifiedBlock[], generatedCode: string }) => {
    try {
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');

      await VisualEditorApi.updateLogicTemplate(templateId, {
        logic_blocks: data.logicBlocks,
        generated_code: data.generatedCode
      });
      
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      console.log(`邏輯模板 ${templateId} 儲存成功`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    }
  };

  // 儲存 FlexMessage
  const handleFlexMessageSave = async (messageId: string, data: { flexBlocks: UnifiedBlock[] }) => {
    try {
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');

      await VisualEditorApi.updateFlexMessage(messageId, {
        content: { blocks: data.flexBlocks }
      });
      
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      console.log(`FlexMessage ${messageId} 儲存成功`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    }
  };

  // 處理儲存到 Bot
  const handleSaveToBot = async (botId: string, data: { logicBlocks: UnifiedBlock[], flexBlocks: UnifiedBlock[], generatedCode: string }) => {
    try {
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');

      await VisualEditorApi.saveVisualEditorData(botId, {
        logic_blocks: data.logicBlocks,
        flex_blocks: data.flexBlocks,
        generated_code: data.generatedCode
      });
      
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      console.log(`已儲存數據到 Bot ${botId}`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    }
  };

  const handleImportProject = (projectData: ProjectData) => {
    setLogicBlocks(projectData.logicBlocks || []);
    setFlexBlocks(projectData.flexBlocks || []);
    setProjectVersion(projectData.version || '2.0');
    
    // 重置儲存狀態
    setSaveStatus(SaveStatus.PENDING);
    setHasUnsavedChanges(true);
    setSaveError('');
    setLastSavedTime(undefined);
  };

  // 記憶化積木數據以減少不必要的重新渲染
  const memoizedLogicBlocks = useMemo(() => logicBlocks, [logicBlocks]);
  const memoizedFlexBlocks = useMemo(() => flexBlocks, [flexBlocks]);

  // 監聽積木變更的 useEffect（優化版本，使用防抖）
  useEffect(() => {
    // 初次載入時不觸發變更檢測
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // 如果不是正在載入數據且有積木，才標記為變更
    if (!isLoadingData && (memoizedLogicBlocks.length > 0 || memoizedFlexBlocks.length > 0)) {
      debouncedMarkAsChanged();
    }
  }, [memoizedLogicBlocks, memoizedFlexBlocks, isLoadingData, debouncedMarkAsChanged]);

  // 初始化組件
  useEffect(() => {
    // 組件初始化時為空狀態，等待用戶選擇 Bot
    console.log('視覺化編輯器已載入，請選擇一個 Bot 開始編輯');
  }, []);

  return (
    <DragDropProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 返回按鈕 */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleGoBack}
                className="text-gray-600 hover:text-gray-800"
                title="返回上一頁"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <h1 className="text-xl font-semibold text-gray-800">
                LINE Bot 視覺化編輯器
              </h1>
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  v{projectVersion} - 統一積木系統
                </div>
                <SaveStatusIndicator 
                  status={saveStatus}
                  lastSavedTime={lastSavedTime}
                  errorMessage={saveError}
                />
              </div>
            </div>
            
            <ProjectManager 
              logicBlocks={logicBlocks}
              flexBlocks={flexBlocks}
              onImport={handleImportProject}
              selectedBotId={selectedBotId}
              onBotSelect={handleBotSelect}
              onSaveToBot={handleSaveToBot}
            />
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {isLoadingData && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <div className="flex items-center space-x-2 bg-white p-4 rounded-lg shadow-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-700">載入 Bot 數據中...</span>
              </div>
            </div>
          )}
          
          <Workspace 
            logicBlocks={logicBlocks}
            flexBlocks={flexBlocks}
            onLogicBlocksChange={setLogicBlocks}
            onFlexBlocksChange={setFlexBlocks}
            currentLogicTemplateName={currentLogicTemplateName}
            currentFlexMessageName={currentFlexMessageName}
            selectedBotId={selectedBotId}
            selectedLogicTemplateId={selectedLogicTemplateId}
            onLogicTemplateSelect={handleLogicTemplateSelect}
            onLogicTemplateCreate={handleLogicTemplateCreate}
            onLogicTemplateSave={handleLogicTemplateSave}
            selectedFlexMessageId={selectedFlexMessageId}
            onFlexMessageSelect={handleFlexMessageSelect}
            onFlexMessageCreate={handleFlexMessageCreate}
            onFlexMessageSave={handleFlexMessageSave}
          />
        </div>
      </div>
      
      {/* 性能監控儀表板 */}
      <PerformanceDashboard 
        isVisible={showPerformanceDashboard}
        onToggle={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
      />
    </DragDropProvider>
  );
};