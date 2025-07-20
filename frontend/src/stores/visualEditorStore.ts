import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface BlockField {
  id: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'dropdown';
  label: string;
  value: any;
  options?: string[];
  placeholder?: string;
}

export interface BlockDefinition {
  id: string;
  type: string;
  category: string;
  label: string;
  color: string;
  shape: 'statement' | 'expression' | 'hat' | 'cap';
  fields: BlockField[];
  code: string; // Python 程式碼範本
  nextConnection?: boolean;
  previousConnection?: boolean;
  outputConnection?: boolean;
}

export interface Connection {
  sourceBlockId: string;
  sourceConnectionType: 'next' | 'output';
  targetBlockId: string;
  targetConnectionType: 'previous' | 'input';
}

export interface WorkspaceBlock extends BlockDefinition {
  x: number;
  y: number;
  nextBlock?: string;
  parentBlock?: string;
  connections: {
    next?: string;
    previous?: string;
    output?: string;
    input?: string[];
  };
}

interface VisualEditorState {
  // 拖拽狀態
  activeId: string | null;
  setActiveId: (id: string | null) => void;

  // 工作區區塊
  workspaceBlocks: Record<string, WorkspaceBlock>;
  addBlockToWorkspace: (block: WorkspaceBlock) => void;
  removeBlockFromWorkspace: (blockId: string) => void;
  updateBlockField: (blockId: string, fieldId: string, value: any) => void;
  moveBlock: (blockId: string, newX: number, newY: number) => void;
  
  // 拼圖連接功能
  connectBlocks: (sourceId: string, targetId: string, connectionType: 'next' | 'output') => void;
  disconnectBlocks: (sourceId: string, connectionType: 'next' | 'output') => void;
  findNearbyConnectionPoints: (blockId: string, x: number, y: number) => { blockId: string; connectionType: string; distance: number }[];

  // 程式碼生成
  generatedCode: string;
  generateCode: () => void;

  // 專案管理
  projectName: string;
  setProjectName: (name: string) => void;
  saveProject: () => void;
  loadProject: (projectData: any) => void;
}

// 創建 store 的工廠函數
const createVisualEditorStore = () => create<VisualEditorState>((set, get) => ({
  // 拖拽狀態
  activeId: null,
  setActiveId: (id) => set({ activeId: id }),

  // 工作區區塊
  workspaceBlocks: {},
  
  addBlockToWorkspace: (block) => {
    const blockId = `workspace-${uuidv4()}`;
    set((state) => ({
      workspaceBlocks: {
        ...state.workspaceBlocks,
        [blockId]: { 
          ...block, 
          id: blockId,
          connections: {
            input: []
          }
        }
      }
    }));
    // 延遲調用 generateCode 避免循環依賴
    setTimeout(() => get().generateCode(), 0);
  },

  removeBlockFromWorkspace: (blockId) => {
    set((state) => {
      const newBlocks = { ...state.workspaceBlocks };
      delete newBlocks[blockId];
      return { workspaceBlocks: newBlocks };
    });
    setTimeout(() => get().generateCode(), 0);
  },

  updateBlockField: (blockId, fieldId, value) => {
    set((state) => ({
      workspaceBlocks: {
        ...state.workspaceBlocks,
        [blockId]: {
          ...state.workspaceBlocks[blockId],
          fields: state.workspaceBlocks[blockId].fields.map(field =>
            field.id === fieldId ? { ...field, value } : field
          )
        }
      }
    }));
    setTimeout(() => get().generateCode(), 0);
  },

  moveBlock: (blockId, newX, newY) => {
    set((state) => {
      const block = state.workspaceBlocks[blockId];
      if (!block) return state;

      return {
        workspaceBlocks: {
          ...state.workspaceBlocks,
          [blockId]: {
            ...block,
            x: newX,
            y: newY
          }
        }
      };
    });
  },

  // 拼圖連接功能
  connectBlocks: (sourceId, targetId, connectionType) => {
    set((state) => {
      const sourceBlock = state.workspaceBlocks[sourceId];
      const targetBlock = state.workspaceBlocks[targetId];
      
      if (!sourceBlock || !targetBlock) return state;

      const newBlocks = { ...state.workspaceBlocks };
      
      if (connectionType === 'next') {
        // 連接到下一個語句
        newBlocks[sourceId] = {
          ...sourceBlock,
          connections: {
            ...sourceBlock.connections,
            next: targetId
          }
        };
        newBlocks[targetId] = {
          ...targetBlock,
          connections: {
            ...targetBlock.connections,
            previous: sourceId
          }
        };
      } else if (connectionType === 'output') {
        // 連接到輸入
        newBlocks[sourceId] = {
          ...sourceBlock,
          connections: {
            ...sourceBlock.connections,
            output: targetId
          }
        };
        newBlocks[targetId] = {
          ...targetBlock,
          connections: {
            ...targetBlock.connections,
            input: [...(targetBlock.connections.input || []), sourceId]
          }
        };
      }
      
      return { workspaceBlocks: newBlocks };
    });
    setTimeout(() => get().generateCode(), 0);
  },

  disconnectBlocks: (sourceId, connectionType) => {
    set((state) => {
      const sourceBlock = state.workspaceBlocks[sourceId];
      if (!sourceBlock) return state;

      const newBlocks = { ...state.workspaceBlocks };
      
      if (connectionType === 'next' && sourceBlock.connections.next) {
        const targetId = sourceBlock.connections.next;
        const targetBlock = state.workspaceBlocks[targetId];
        
        if (targetBlock) {
          newBlocks[targetId] = {
            ...targetBlock,
            connections: {
              ...targetBlock.connections,
              previous: undefined
            }
          };
        }
        
        newBlocks[sourceId] = {
          ...sourceBlock,
          connections: {
            ...sourceBlock.connections,
            next: undefined
          }
        };
      }
      
      return { workspaceBlocks: newBlocks };
    });
    setTimeout(() => get().generateCode(), 0);
  },

  findNearbyConnectionPoints: (blockId, x, y) => {
    const { workspaceBlocks } = get();
    const currentBlock = workspaceBlocks[blockId];
    if (!currentBlock) return [];

    const connectionPoints: { blockId: string; connectionType: string; distance: number }[] = [];
    const SNAP_DISTANCE = 30; // 吸附距離

    Object.entries(workspaceBlocks).forEach(([otherBlockId, otherBlock]) => {
      if (otherBlockId === blockId) return;

      // 檢查是否可以連接到下一個語句
      if (currentBlock.nextConnection && otherBlock.previousConnection) {
        const targetX = otherBlock.x;
        const targetY = otherBlock.y - 10; // 連接點偏移
        const distance = Math.sqrt(Math.pow(x - targetX, 2) + Math.pow(y - targetY, 2));
        
        if (distance < SNAP_DISTANCE) {
          connectionPoints.push({
            blockId: otherBlockId,
            connectionType: 'next',
            distance
          });
        }
      }

      // 檢查是否可以連接到輸入
      if (currentBlock.outputConnection && otherBlock.fields.some(f => f.type === 'text' || f.type === 'number')) {
        const targetX = otherBlock.x - 10; // 連接點偏移
        const targetY = otherBlock.y + 20;
        const distance = Math.sqrt(Math.pow(x - targetX, 2) + Math.pow(y - targetY, 2));
        
        if (distance < SNAP_DISTANCE) {
          connectionPoints.push({
            blockId: otherBlockId,
            connectionType: 'output',
            distance
          });
        }
      }
    });

    return connectionPoints.sort((a, b) => a.distance - b.distance);
  },

  // 程式碼生成
  generatedCode: '',
  
  generateCode: () => {
    try {
      const { workspaceBlocks } = get();
      const blocks = Object.values(workspaceBlocks);
      
      // 基本的程式碼生成邏輯
      let code = `from linebot.v3.messaging import *
from linebot.v3.webhooks import *
import os

# LINE Bot 設定
line_bot_api = MessagingApi(
    api_client=ApiClient(
        configuration=Configuration(
            access_token=os.getenv('LINE_CHANNEL_ACCESS_TOKEN')
        )
    )
)

def handle_message(event):
    \"\"\"處理訊息事件\"\"\"
`;

      // 按類型生成程式碼
      const eventBlocks = blocks.filter(block => block.category === 'events');
      const messageBlocks = blocks.filter(block => block.category === 'messages');
      
      // 生成事件處理器
      eventBlocks.forEach(block => {
        const fields = block.fields.reduce((acc, field) => {
          acc[field.id] = field.value || '';
          return acc;
        }, {} as Record<string, any>);
        
        let blockCode = block.code;
        Object.entries(fields).forEach(([key, value]) => {
          blockCode = blockCode.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });
        
        code += '\n    ' + blockCode;
      });

      // 生成訊息回覆
      if (messageBlocks.length > 0) {
        code += '\n    \n    # 回覆訊息';
        messageBlocks.forEach(block => {
          const fields = block.fields.reduce((acc, field) => {
            acc[field.id] = field.value || '';
            return acc;
          }, {} as Record<string, any>);
          
          let blockCode = block.code;
          Object.entries(fields).forEach(([key, value]) => {
            blockCode = blockCode.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
          });
          
          code += '\n    ' + blockCode;
        });
      }

      set({ generatedCode: code });
    } catch (error) {
      console.error('Code generation error:', error);
      set({ generatedCode: '# 程式碼生成時發生錯誤\n# 請檢查區塊配置' });
    }
  },

  // 專案管理
  projectName: '新專案',
  setProjectName: (name) => set({ projectName: name }),
  
  saveProject: () => {
    try {
      const { workspaceBlocks, projectName } = get();
      const projectData = {
        name: projectName,
        blocks: workspaceBlocks,
        createdAt: new Date().toISOString()
      };
      
      // 儲存到 localStorage
      localStorage.setItem(`linebot-project-${projectName}`, JSON.stringify(projectData));
    } catch (error) {
      console.error('Save project error:', error);
    }
  },

  loadProject: (projectData) => {
    try {
      set({
        projectName: projectData.name,
        workspaceBlocks: projectData.blocks
      });
      setTimeout(() => get().generateCode(), 0);
    } catch (error) {
      console.error('Load project error:', error);
    }
  }
}));

// Lazy initialization 的 store
let storeInstance: ReturnType<typeof createVisualEditorStore> | null = null;

export const useVisualEditorStore = () => {
  if (!storeInstance) {
    storeInstance = createVisualEditorStore();
  }
  return storeInstance();
};