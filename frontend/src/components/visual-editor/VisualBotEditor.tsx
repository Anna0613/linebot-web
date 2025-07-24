import React, { useState, useEffect } from 'react';
import DragDropProvider from './DragDropProvider';
import { BlockPalette } from './BlockPalette';
import Workspace from './Workspace';
import ProjectManager from './ProjectManager';

interface BlockData {
  [key: string]: unknown;
}

interface Block {
  blockType: string;
  blockData: BlockData;
}

interface ProjectData {
  name: string;
  logicBlocks: Block[];
  flexBlocks: Block[];
}

export const VisualBotEditor: React.FC = () => {
  const [logicBlocks, setLogicBlocks] = useState<Block[]>([]);
  const [flexBlocks, setFlexBlocks] = useState<Block[]>([]);

  // 載入儲存的專案
  useEffect(() => {
    const savedProject = localStorage.getItem('linebot_project');
    if (savedProject) {
      try {
        const projectData = JSON.parse(savedProject) as ProjectData;
        setLogicBlocks(projectData.logicBlocks || []);
        setFlexBlocks(projectData.flexBlocks || []);
      } catch (error) {
        console.error('載入專案失敗:', error);
      }
    }
  }, []);

  const handleImportProject = (projectData: ProjectData) => {
    setLogicBlocks(projectData.logicBlocks || []);
    setFlexBlocks(projectData.flexBlocks || []);
  };

  return (
    <DragDropProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">
              LINE Bot 視覺化編輯器
            </h1>
            
            <ProjectManager 
              logicBlocks={logicBlocks}
              flexBlocks={flexBlocks}
              onImport={handleImportProject}
            />
          </div>
        </header>
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <BlockPalette />
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