import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Download, Upload, Save, Play } from 'lucide-react';

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
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ logicBlocks, flexBlocks, onImport }) => {
  const [projectName, setProjectName] = useState('我的 LINE Bot 專案');

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

  const saveProject = () => {
    // 模擬儲存到本地儲存
    const projectData: ProjectData = {
      name: projectName,
      logicBlocks: logicBlocks,
      flexBlocks: flexBlocks,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('linebot_project', JSON.stringify(projectData));
    alert('專案已儲存到瀏覽器本地儲存');
  };

  const testBot = () => {
    // 切換到預覽標籤
    const previewTab = document.querySelector('[value="preview"]') as HTMLElement;
    if (previewTab) {
      previewTab.click();
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <Input
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="w-48"
        placeholder="專案名稱"
      />
      
      <Button variant="outline" size="sm" onClick={importProject}>
        <Upload className="w-4 h-4 mr-2" />
        匯入
      </Button>
      
      <Button variant="outline" size="sm" onClick={exportProject}>
        <Download className="w-4 h-4 mr-2" />
        匯出
      </Button>
      
      <Button variant="outline" size="sm" onClick={saveProject}>
        <Save className="w-4 h-4 mr-2" />
        儲存
      </Button>
      
      <Button variant="default" size="sm" onClick={testBot}>
        <Play className="w-4 h-4 mr-2" />
        測試
      </Button>
    </div>
  );
};

export default ProjectManager;