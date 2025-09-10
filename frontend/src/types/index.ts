/**
 * 統一類型導出文件
 * 集中管理所有類型定義
 */

// 從 block.ts 導出
export type { UnifiedBlock, BlockData, BlockCategory, WorkspaceContext } from './block';

// 從 blockConnection.ts 導出
export type { 
  BlockConnection, 
  ExecutionContext, 
  BlockExecutionResult,
  ConnectionType 
} from './blockConnection';

// 從 bot.ts 導出
export type { Bot, BotCreateData, BotUpdateData, LogicTemplate } from './bot';

// 從 saveStatus.ts 導出
export { SaveStatus } from './saveStatus';

// 從 linebot.ts 導出
export type { FlexMessage } from './linebot';

// 基礎積木介面（向後相容）
export interface Block {
  blockType: string;
  blockData: BlockData;
  id?: string;
  parentId?: string;
}

// 訊息介面
export interface Message {
  type: 'user' | 'bot' | string;
  content: string;
  messageType?: 'text' | 'flex' | string;
  flexMessage?: FlexMessage;
  timestamp?: number;
  executionInfo?: {
    matchedPatterns: string[];
    executionPath: string[];
    processingTime: number;
  };
}
