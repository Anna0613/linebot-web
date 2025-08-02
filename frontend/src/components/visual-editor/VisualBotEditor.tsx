import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DragDropProvider from './DragDropProvider';
import Workspace from './Workspace';
import ProjectManager from './ProjectManager';
import SaveStatusIndicator, { SaveStatus } from './SaveStatusIndicator';
import { Button } from '../ui/button';
import { UnifiedBlock } from '../../types/block';
import { migrateBlocks } from '../../utils/blockCompatibility';
import VisualEditorApi from '../../services/visualEditorApi';

// 向後相容的舊格式介面
interface LegacyBlockData {
  [key: string]: unknown;
}

interface LegacyBlock {
  blockType: string;
  blockData: LegacyBlockData;
}

// 專案資料介面（支援新舊格式）
interface ProjectData {
  name: string;
  logicBlocks: (UnifiedBlock | LegacyBlock)[];
  flexBlocks: (UnifiedBlock | LegacyBlock)[];
  version?: string; // 用於追蹤專案格式版本
}

export const VisualBotEditor: React.FC = () => {
  const navigate = useNavigate();
  const [logicBlocks, setLogicBlocks] = useState<(UnifiedBlock | LegacyBlock)[]>([]);
  const [flexBlocks, setFlexBlocks] = useState<(UnifiedBlock | LegacyBlock)[]>([]);
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
  
  // 自動儲存計時器
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const AUTOSAVE_DELAY = 5000; // 5秒延遲自動儲存


  // 標記為有未儲存變更
  const markAsChanged = useCallback(() => {
    if (saveStatus !== SaveStatus.PENDING) {
      setSaveStatus(SaveStatus.PENDING);
      setHasUnsavedChanges(true);
      setSaveError('');
    }
  }, [saveStatus]);

  // 清除自動儲存計時器
  const clearAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // 設置自動儲存計時器（先定義空函數，稍後定義實際內容）
  const scheduleAutoSave = useCallback(() => {
    clearAutoSaveTimer();
  }, [clearAutoSaveTimer]);

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

  // 監聽積木變更，觸發自動儲存計時器
  const isInitialLoadRef = useRef(true);

  // 頁面離開前的確認和清理
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '您有未儲存的變更，確定要離開嗎？';
        return '您有未儲存的變更，確定要離開嗎？';
      }
    };

    const handleUnload = () => {
      // 頁面卸載時嘗試同步儲存（可能不會完成）
      if (hasUnsavedChanges && navigator.sendBeacon) {
        // 使用 sendBeacon 嘗試發送最後的儲存請求
        console.log('🔄 頁面卸載，嘗試使用 sendBeacon 儲存...');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      clearAutoSaveTimer();
    };
  }, [hasUnsavedChanges, clearAutoSaveTimer]);



  // 處理 Bot 選擇變更
  const handleBotSelect = async (botId: string) => {
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
        clearAutoSaveTimer();
        
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
          clearAutoSaveTimer();
          
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
  const handleLogicTemplateSave = async (templateId: string, data: { logicBlocks: (UnifiedBlock | LegacyBlock)[], generatedCode: string }) => {
    try {
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');
      
      // 確保所有積木都是統一格式
      const normalizedLogicBlocks = data.logicBlocks.map(block => {
        if ('category' in block) {
          return block as UnifiedBlock;
        } else {
          const legacyBlock = block as LegacyBlock;
          return migrateBlocks([legacyBlock])[0] as UnifiedBlock;
        }
      });

      await VisualEditorApi.updateLogicTemplate(templateId, {
        logic_blocks: normalizedLogicBlocks,
        generated_code: data.generatedCode
      });
      
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      clearAutoSaveTimer();
      console.log(`邏輯模板 ${templateId} 儲存成功`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    }
  };

  // 儲存 FlexMessage
  const handleFlexMessageSave = async (messageId: string, data: { flexBlocks: (UnifiedBlock | LegacyBlock)[] }) => {
    try {
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');
      
      // 確保所有積木都是統一格式
      const normalizedFlexBlocks = data.flexBlocks.map(block => {
        if ('category' in block) {
          return block as UnifiedBlock;
        } else {
          const legacyBlock = block as LegacyBlock;
          return migrateBlocks([legacyBlock])[0] as UnifiedBlock;
        }
      });

      await VisualEditorApi.updateFlexMessage(messageId, {
        content: { blocks: normalizedFlexBlocks }
      });
      
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      clearAutoSaveTimer();
      console.log(`FlexMessage ${messageId} 儲存成功`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error;
    }
  };

  // 處理儲存到 Bot
  const handleSaveToBot = async (botId: string, data: { logicBlocks: (UnifiedBlock | LegacyBlock)[], flexBlocks: (UnifiedBlock | LegacyBlock)[], generatedCode: string }) => {
    try {
      setSaveStatus(SaveStatus.SAVING);
      setSaveError('');
      
      // 確保所有積木都是統一格式
      const normalizedLogicBlocks = data.logicBlocks.map(block => {
        if ('category' in block) {
          return block as UnifiedBlock;
        } else {
          // 這應該不會發生，因為我們已經做了遷移，但為了安全起見
          const legacyBlock = block as LegacyBlock;
          return migrateBlocks([legacyBlock])[0] as UnifiedBlock;
        }
      });

      const normalizedFlexBlocks = data.flexBlocks.map(block => {
        if ('category' in block) {
          return block as UnifiedBlock;
        } else {
          const legacyBlock = block as LegacyBlock;
          return migrateBlocks([legacyBlock])[0] as UnifiedBlock;
        }
      });

      await VisualEditorApi.saveVisualEditorData(botId, {
        logic_blocks: normalizedLogicBlocks,
        flex_blocks: normalizedFlexBlocks,
        generated_code: data.generatedCode
      });
      
      setSaveStatus(SaveStatus.SAVED);
      setLastSavedTime(new Date());
      setHasUnsavedChanges(false);
      clearAutoSaveTimer();
      console.log(`已儲存數據到 Bot ${botId}`);
    } catch (error) {
      console.error("Error occurred:", error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '儲存失敗');
      throw error; // 重新拋出錯誤，讓 ProjectManager 處理
    }
  };

  const handleImportProject = (projectData: ProjectData) => {
    // 檢查匯入的專案版本
    if (!projectData.version || projectData.version < '2.0') {
      console.log('匯入舊版本專案，正在升級...');
      
      const migratedLogicBlocks = migrateBlocks(projectData.logicBlocks as LegacyBlock[]);
      const migratedFlexBlocks = migrateBlocks(projectData.flexBlocks as LegacyBlock[]);
      
      setLogicBlocks(migratedLogicBlocks);
      setFlexBlocks(migratedFlexBlocks);
      setProjectVersion('2.0');
    } else {
      setLogicBlocks(projectData.logicBlocks || []);
      setFlexBlocks(projectData.flexBlocks || []);
      setProjectVersion(projectData.version || '2.0');
    }
    
    // 重置儲存狀態
    setSaveStatus(SaveStatus.PENDING);
    setHasUnsavedChanges(true);
    setSaveError('');
    setLastSavedTime(undefined);
  };

  // 執行自動儲存（在儲存函數定義之後）
  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    console.log('🔄 執行自動儲存...');
    setSaveStatus(SaveStatus.SAVING);
    
    try {
      let saved = false;
      
      // 優先儲存邏輯模板
      if (selectedLogicTemplateId) {
        // 動態 import 生成程式碼函數
        const { generateUnifiedCode } = await import('../../utils/unifiedCodeGenerator');
        const generatedCode = generateUnifiedCode(logicBlocks, []);
        
        await handleLogicTemplateSave(selectedLogicTemplateId, {
          logicBlocks,
          generatedCode
        });
        saved = true;
      }
      
      // 然後儲存 FlexMessage  
      if (selectedFlexMessageId) {
        await handleFlexMessageSave(selectedFlexMessageId, {
          flexBlocks
        });
        saved = true;
      }
      
      if (saved) {
        console.log('✅ 自動儲存完成');
      }
    } catch (error) {
      console.error('❌ 自動儲存失敗:', error);
      setSaveStatus(SaveStatus.ERROR);
      setSaveError(error instanceof Error ? error.message : '自動儲存失敗');
    }
  }, [hasUnsavedChanges, selectedLogicTemplateId, selectedFlexMessageId, logicBlocks, flexBlocks, handleLogicTemplateSave, handleFlexMessageSave]);

  // 重新定義完整的自動儲存計時器
  const scheduleAutoSaveTimer = useCallback(() => {
    clearAutoSaveTimer();
    
    // 只有在有選擇的模板/訊息時才自動儲存
    if ((selectedLogicTemplateId || selectedFlexMessageId) && hasUnsavedChanges) {
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSave();
      }, AUTOSAVE_DELAY);
    }
  }, [selectedLogicTemplateId, selectedFlexMessageId, hasUnsavedChanges, clearAutoSaveTimer, performAutoSave]);

  // 監聽積木變更的 useEffect
  useEffect(() => {
    // 初次載入時不觸發變更檢測
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // 如果不是正在載入數據且有積木，才標記為變更
    if (!isLoadingData && (logicBlocks.length > 0 || flexBlocks.length > 0)) {
      markAsChanged();
      scheduleAutoSaveTimer();
    }
  }, [logicBlocks, flexBlocks, isLoadingData, markAsChanged, scheduleAutoSaveTimer]);

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
    </DragDropProvider>
  );
};