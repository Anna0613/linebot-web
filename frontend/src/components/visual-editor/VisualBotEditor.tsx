import React, { useState, useEffect } from 'react';
import DragDropProvider from './DragDropProvider';
import Workspace from './Workspace';
import ProjectManager from './ProjectManager';
import { UnifiedBlock } from '../../types/block';
import { migrateBlocks } from '../../utils/blockCompatibility';

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

  // 自動儲存專案
  const autoSaveProject = React.useCallback(() => {
    const projectData: ProjectData = {
      name: 'LINE Bot Project',
      logicBlocks,
      flexBlocks,
      version: projectVersion
    };
    
    try {
      localStorage.setItem('linebot_project', JSON.stringify(projectData));
    } catch (error) {
      console.error('自動儲存專案失敗:', error);
    }
  }, [logicBlocks, flexBlocks, projectVersion]);

  // 載入儲存的專案
  useEffect(() => {
    const savedProject = localStorage.getItem('linebot_project');
    if (savedProject) {
      try {
        const projectData = JSON.parse(savedProject) as ProjectData;
        
        // 檢查專案版本並處理遷移
        if (!projectData.version || projectData.version < '2.0') {
          console.log('偵測到舊版本專案，正在升級...');
          
          // 將舊格式積木轉換為統一格式
          const migratedLogicBlocks = migrateBlocks(projectData.logicBlocks as LegacyBlock[]);
          const migratedFlexBlocks = migrateBlocks(projectData.flexBlocks as LegacyBlock[]);
          
          setLogicBlocks(migratedLogicBlocks);
          setFlexBlocks(migratedFlexBlocks);
          setProjectVersion('2.0');
          
          // 儲存升級後的專案
          const upgradedProject: ProjectData = {
            name: projectData.name || 'LINE Bot Project',
            logicBlocks: migratedLogicBlocks,
            flexBlocks: migratedFlexBlocks,
            version: '2.0'
          };
          localStorage.setItem('linebot_project', JSON.stringify(upgradedProject));
          
          console.log('專案升級完成！');
        } else {
          // 載入新版本專案
          setLogicBlocks(projectData.logicBlocks || []);
          setFlexBlocks(projectData.flexBlocks || []);
          setProjectVersion(projectData.version || '2.0');
        }
      } catch (error) {
        console.error('載入專案失敗:', error);
      }
    }
  }, []);

  // 自動儲存（在積木變更時）
  useEffect(() => {
    const timeoutId = setTimeout(autoSaveProject, 1000); // 延遲 1 秒自動儲存
    return () => clearTimeout(timeoutId);
  }, [autoSaveProject]);

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
            />
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
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