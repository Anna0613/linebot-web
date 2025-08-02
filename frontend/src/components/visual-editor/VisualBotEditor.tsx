import React, { useState, useEffect } from 'react';
import DragDropProvider from './DragDropProvider';
import Workspace from './Workspace';
import ProjectManager from './ProjectManager';
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
  const [logicBlocks, setLogicBlocks] = useState<(UnifiedBlock | LegacyBlock)[]>([]);
  const [flexBlocks, setFlexBlocks] = useState<(UnifiedBlock | LegacyBlock)[]>([]);
  const [projectVersion, setProjectVersion] = useState<string>('2.0'); // 新版本使用統一積木系統
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [selectedLogicTemplateId, setSelectedLogicTemplateId] = useState<string>('');
  const [selectedFlexMessageId, setSelectedFlexMessageId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentLogicTemplateName, setCurrentLogicTemplateName] = useState<string>('');
  const [currentFlexMessageName, setCurrentFlexMessageName] = useState<string>('');


  // 初始化組件時，積木數據從 Bot 選擇時載入，不需要本地儲存
  useEffect(() => {
    // 組件初始化時為空狀態，等待用戶選擇 Bot
    console.log('視覺化編輯器已載入，請選擇一個 Bot 開始編輯');
  }, []);


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
        console.log(`已載入邏輯模板 ${template.name} 的數據`);
      } catch (error) {
        console.error('載入邏輯模板失敗:', error);
        setLogicBlocks([]);
        setCurrentLogicTemplateName('');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setLogicBlocks([]);
      setCurrentLogicTemplateName('');
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
          console.log(`已載入 FlexMessage ${message.name} 的數據`);
        } else {
          setFlexBlocks([]);
          setCurrentFlexMessageName(message?.name || '');
        }
      } catch (error) {
        console.error('載入 FlexMessage 失敗:', error);
        setFlexBlocks([]);
        setCurrentFlexMessageName('');
      } finally {
        setIsLoadingData(false);
      }
    } else {
      setFlexBlocks([]);
      setCurrentFlexMessageName('');
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
    } catch (error) {
      console.error('創建邏輯模板失敗:', error);
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
    } catch (error) {
      console.error('創建 FlexMessage 失敗:', error);
      throw error;
    }
  };

  // 儲存邏輯模板
  const handleLogicTemplateSave = async (templateId: string, data: { logicBlocks: (UnifiedBlock | LegacyBlock)[], generatedCode: string }) => {
    try {
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
      
      console.log(`邏輯模板 ${templateId} 儲存成功`);
    } catch (error) {
      console.error('儲存邏輯模板失敗:', error);
      throw error;
    }
  };

  // 儲存 FlexMessage
  const handleFlexMessageSave = async (messageId: string, data: { flexBlocks: (UnifiedBlock | LegacyBlock)[] }) => {
    try {
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
      
      console.log(`FlexMessage ${messageId} 儲存成功`);
    } catch (error) {
      console.error('儲存 FlexMessage 失敗:', error);
      throw error;
    }
  };

  // 處理儲存到 Bot
  const handleSaveToBot = async (botId: string, data: { logicBlocks: (UnifiedBlock | LegacyBlock)[], flexBlocks: (UnifiedBlock | LegacyBlock)[], generatedCode: string }) => {
    try {
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
      
      console.log(`已儲存數據到 Bot ${botId}`);
    } catch (error) {
      console.error('儲存到 Bot 失敗:', error);
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
  };

  return (
    <DragDropProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-800">
                LINE Bot 視覺化編輯器
              </h1>
              <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                v{projectVersion} - 統一積木系統
              </div>
            </div>
            
            <ProjectManager 
              logicBlocks={logicBlocks}
              flexBlocks={flexBlocks}
              onImport={handleImportProject}
              selectedBotId={selectedBotId}
              onBotSelect={handleBotSelect}
              onSaveToBot={handleSaveToBot}
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
          />
        </div>
      </div>
    </DragDropProvider>
  );
};