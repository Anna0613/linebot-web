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
  const [isLoadingData, setIsLoadingData] = useState(false);


  // 初始化組件時，積木數據從 Bot 選擇時載入，不需要本地儲存
  useEffect(() => {
    // 組件初始化時為空狀態，等待用戶選擇 Bot
    console.log('視覺化編輯器已載入，請選擇一個 Bot 開始編輯');
  }, []);


  // 處理 Bot 選擇變更
  const handleBotSelect = async (botId: string) => {
    setSelectedBotId(botId);
    
    if (botId && VisualEditorApi.isValidBotId(botId)) {
      setIsLoadingData(true);
      try {
        // 載入選定 Bot 的視覺化編輯器數據
        const data = await VisualEditorApi.loadVisualEditorData(botId);
        
        // 更新積木數據
        setLogicBlocks(data.logic_blocks || []);
        setFlexBlocks(data.flex_blocks || []);
        
        console.log(`已載入 Bot ${botId} 的數據`);
      } catch (error) {
        console.error('載入 Bot 數據失敗:', error);
        // 如果載入失敗，初始化為空的積木
        setLogicBlocks([]);
        setFlexBlocks([]);
      } finally {
        setIsLoadingData(false);
      }
    } else {
      // 清空積木
      setLogicBlocks([]);
      setFlexBlocks([]);
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
          />
        </div>
      </div>
    </DragDropProvider>
  );
};