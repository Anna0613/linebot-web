/**
 * 積木連接系統類型定義
 * 用於管理積木之間的連接關係
 */

export enum ConnectionType {
  NEXT = 'next',           // 順序執行連接
  CONDITION = 'condition', // 條件連接
  LOOP = 'loop',          // 迴圈連接
  ERROR = 'error'         // 錯誤處理連接
}

export interface BlockConnection {
  id: string;                    // 連接唯一識別碼
  sourceBlockId: string;         // 來源積木 ID
  targetBlockId: string;         // 目標積木 ID
  connectionType: ConnectionType; // 連接類型
  condition?: string;            // 連接條件（用於條件連接）
  order?: number;               // 連接順序（同個積木的多個輸出）
  isActive: boolean;            // 連接是否啟用
  metadata?: Record<string, unknown>; // 額外元數據
}

export interface BlockConnectionPoint {
  blockId: string;              // 積木 ID
  pointType: 'input' | 'output'; // 連接點類型
  pointId: string;              // 連接點 ID
  position: { x: number; y: number }; // 連接點位置
  allowedTypes: ConnectionType[]; // 允許的連接類型
}

export interface ConnectionValidationResult {
  isValid: boolean;
  errorMessage?: string;
  warning?: string;
  suggestions?: string[];
}

/**
 * 積木連接管理器介面
 */
export interface IBlockConnectionManager {
  // 連接管理
  createConnection(connection: Omit<BlockConnection, 'id'>): string;
  removeConnection(connectionId: string): boolean;
  updateConnection(connectionId: string, updates: Partial<BlockConnection>): boolean;
  
  // 查詢功能
  getConnection(connectionId: string): BlockConnection | undefined;
  getConnectionsByBlock(blockId: string): BlockConnection[];
  getIncomingConnections(blockId: string): BlockConnection[];
  getOutgoingConnections(blockId: string): BlockConnection[];
  
  // 驗證功能
  validateConnection(connection: Omit<BlockConnection, 'id'>): ConnectionValidationResult;
  validateAllConnections(): ConnectionValidationResult[];
  
  // 執行追蹤
  getExecutionPath(startBlockId: string): string[];
  getNextBlocks(blockId: string, context?: Record<string, unknown>): string[];
  
  // 狀態管理
  clear(): void;
  getConnectionGraph(): Map<string, string[]>;
}

/**
 * 執行上下文
 * 用於儲存積木執行過程中的變數和狀態
 */
export interface ExecutionContext {
  variables: Map<string, unknown>;
  userMessage?: string;
  userId?: string;
  sessionId?: string;
  executionStack: string[];
  loopCounters: Map<string, number>;
  maxExecutionSteps: number;
  currentStep: number;
}

/**
 * 積木執行結果
 */
export interface BlockExecutionResult {
  success: boolean;
  output?: unknown;
  nextBlocks: string[];
  error?: Error;
  shouldStop: boolean;
  context: ExecutionContext;
}

/**
 * 連接渲染資料
 * 用於在 UI 中繪製連接線
 */
export interface ConnectionRenderData {
  connectionId: string;
  sourcePoint: { x: number; y: number };
  targetPoint: { x: number; y: number };
  connectionType: ConnectionType;
  isActive: boolean;
  isHighlighted: boolean;
  path: string; // SVG 路徑字串
}