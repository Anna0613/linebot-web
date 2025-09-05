/**
 * 積木連接管理器實現
 * 負責管理積木之間的連接關係和執行邏輯
 */

import {
  BlockConnection,
  ConnectionType,
  IBlockConnectionManager,
  ConnectionValidationResult,
} from '../types/blockConnection';
import { UnifiedBlock } from '../types/block';

export class BlockConnectionManager implements IBlockConnectionManager {
  private connections: Map<string, BlockConnection> = new Map();
  private blocks: Map<string, UnifiedBlock> = new Map();
  
  constructor(initialBlocks: UnifiedBlock[] = []) {
    this.updateBlocks(initialBlocks);
  }

  /**
   * 更新積木列表
   */
  updateBlocks(blocks: UnifiedBlock[]): void {
    this.blocks.clear();
    blocks.forEach(block => {
      if (block.id) {
        this.blocks.set(block.id, block);
      }
    });
    
    // 清理無效的連接
    this.cleanupInvalidConnections();
  }

  /**
   * 創建新的連接
   */
  createConnection(connection: Omit<BlockConnection, 'id'>): string {
    const validation = this.validateConnection(connection);
    if (!validation.isValid) {
      throw new Error(`無法創建連接: ${validation.errorMessage}`);
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullConnection: BlockConnection = {
      id: connectionId,
      ...connection,
      isActive: connection.isActive ?? true
    };

    this.connections.set(connectionId, fullConnection);
    console.log(`✅ 已創建連接: ${connection.sourceBlockId} -> ${connection.targetBlockId}`, fullConnection);
    
    return connectionId;
  }

  /**
   * 移除連接
   */
  removeConnection(connectionId: string): boolean {
    const success = this.connections.delete(connectionId);
    if (success) {
      console.log(`🗑️ 已移除連接: ${connectionId}`);
    }
    return success;
  }

  /**
   * 更新連接
   */
  updateConnection(connectionId: string, updates: Partial<BlockConnection>): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    const updatedConnection = { ...connection, ...updates };
    const validation = this.validateConnection(updatedConnection);
    
    if (!validation.isValid) {
      console.warn(`連接更新驗證失敗: ${validation.errorMessage}`);
      return false;
    }

    this.connections.set(connectionId, updatedConnection);
    console.log(`🔄 已更新連接: ${connectionId}`, updates);
    return true;
  }

  /**
   * 取得特定連接
   */
  getConnection(connectionId: string): BlockConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * 取得積木的所有連接
   */
  getConnectionsByBlock(blockId: string): BlockConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.sourceBlockId === blockId || conn.targetBlockId === blockId
    );
  }

  /**
   * 取得進入積木的連接
   */
  getIncomingConnections(blockId: string): BlockConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.targetBlockId === blockId && conn.isActive
    );
  }

  /**
   * 取得離開積木的連接
   */
  getOutgoingConnections(blockId: string): BlockConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.sourceBlockId === blockId && conn.isActive
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * 驗證連接是否有效
   */
  validateConnection(connection: Omit<BlockConnection, 'id'>): ConnectionValidationResult {
    // 檢查積木是否存在
    const sourceBlock = this.blocks.get(connection.sourceBlockId);
    const targetBlock = this.blocks.get(connection.targetBlockId);

    if (!sourceBlock) {
      return {
        isValid: false,
        errorMessage: `來源積木不存在: ${connection.sourceBlockId}`
      };
    }

    if (!targetBlock) {
      return {
        isValid: false,
        errorMessage: `目標積木不存在: ${connection.targetBlockId}`
      };
    }

    // 檢查是否會造成循環
    if (this.wouldCreateCycle(connection.sourceBlockId, connection.targetBlockId)) {
      return {
        isValid: false,
        errorMessage: '此連接會造成循環依賴'
      };
    }

    // 檢查連接類型相容性
    const compatibility = this.checkBlockCompatibility(sourceBlock, targetBlock, connection.connectionType);
    if (!compatibility.isValid) {
      return compatibility;
    }

    return { isValid: true };
  }

  /**
   * 驗證所有連接
   */
  validateAllConnections(): ConnectionValidationResult[] {
    return Array.from(this.connections.values()).map(conn => {
      const result = this.validateConnection(conn);
      return {
        ...result,
        errorMessage: result.errorMessage ? `連接 ${conn.id}: ${result.errorMessage}` : undefined
      };
    });
  }

  /**
   * 取得執行路徑
   */
  getExecutionPath(startBlockId: string, maxDepth: number = 50): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (blockId: string, depth: number) => {
      if (depth >= maxDepth || visited.has(blockId)) {
        return;
      }
      
      visited.add(blockId);
      path.push(blockId);
      
      const outgoingConnections = this.getOutgoingConnections(blockId);
      if (outgoingConnections.length > 0) {
        // 簡單情況：取第一個連接
        traverse(outgoingConnections[0].targetBlockId, depth + 1);
      }
    };
    
    traverse(startBlockId, 0);
    return path;
  }

  /**
   * 取得下一個要執行的積木
   */
  getNextBlocks(blockId: string, context?: Record<string, unknown>): string[] {
    const outgoingConnections = this.getOutgoingConnections(blockId);
    const nextBlocks: string[] = [];

    for (const connection of outgoingConnections) {
      if (this.shouldExecuteConnection(connection, context)) {
        nextBlocks.push(connection.targetBlockId);
      }
    }

    return nextBlocks;
  }

  /**
   * 清空所有連接
   */
  clear(): void {
    this.connections.clear();
    console.log('🧹 已清空所有連接');
  }

  /**
   * 取得連接圖表
   */
  getConnectionGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const block of this.blocks.keys()) {
      graph.set(block, []);
    }
    
    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        const targets = graph.get(connection.sourceBlockId) || [];
        targets.push(connection.targetBlockId);
        graph.set(connection.sourceBlockId, targets);
      }
    }
    
    return graph;
  }

  /**
   * 自動建立連接（基於積木位置和類型推斷）
   */
  autoConnectBlocks(): void {
    const blocks = Array.from(this.blocks.values());
    
    // 清空現有連接
    this.clear();
    
    // 按 Y 座標排序積木
    const sortedBlocks = blocks.sort((a, b) => {
      const posA = a.position || { x: 0, y: 0 };
      const posB = b.position || { x: 0, y: 0 };
      return posA.y - posB.y;
    });

    // 依序連接相鄰的積木
    for (let i = 0; i < sortedBlocks.length - 1; i++) {
      const currentBlock = sortedBlocks[i];
      const nextBlock = sortedBlocks[i + 1];
      
      if (currentBlock.id && nextBlock.id) {
        try {
          this.createConnection({
            sourceBlockId: currentBlock.id,
            targetBlockId: nextBlock.id,
            connectionType: this.inferConnectionType(currentBlock, nextBlock),
            isActive: true
          });
        } catch (error) {
          console.warn(`無法自動連接 ${currentBlock.id} -> ${nextBlock.id}:`, error);
        }
      }
    }
    
    console.log(`🔗 自動建立了 ${this.connections.size} 個連接`);
  }

  /**
   * 匯出連接資料
   */
  exportConnections(): BlockConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 匯入連接資料
   */
  importConnections(connections: BlockConnection[]): void {
    this.clear();
    
    for (const connection of connections) {
      try {
        this.connections.set(connection.id, connection);
      } catch (error) {
        console.warn(`無法匯入連接 ${connection.id}:`, error);
      }
    }
    
    console.log(`📥 已匯入 ${this.connections.size} 個連接`);
  }

  // 私有方法

  /**
   * 檢查是否會造成循環依賴
   */
  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    const visited = new Set<string>();
    
    const hasCycle = (currentId: string): boolean => {
      if (currentId === sourceId) {
        return true;
      }
      
      if (visited.has(currentId)) {
        return false;
      }
      
      visited.add(currentId);
      
      const outgoing = this.getOutgoingConnections(currentId);
      return outgoing.some(conn => hasCycle(conn.targetBlockId));
    };
    
    return hasCycle(targetId);
  }

  /**
   * 檢查積木相容性
   */
  private checkBlockCompatibility(
    sourceBlock: UnifiedBlock,
    targetBlock: UnifiedBlock,
    connectionType: ConnectionType
  ): ConnectionValidationResult {
    const sourceType = sourceBlock.blockType;
    const targetType = targetBlock.blockType;

    // 基本規則：事件積木只能連接到回覆或控制積木
    if (sourceType === 'event') {
      if (!['reply', 'control', 'setting'].includes(targetType)) {
        return {
          isValid: false,
          errorMessage: `事件積木不能直接連接到 ${targetType} 積木`
        };
      }
    }

    // 回覆積木不應該有輸出連接（通常是結束節點）
    if (sourceType === 'reply' && connectionType === ConnectionType.NEXT) {
      return {
        isValid: true,
        warning: '回覆積木通常是執行流程的結束點'
      };
    }

    return { isValid: true };
  }

  /**
   * 判斷連接是否應該執行
   */
  private shouldExecuteConnection(connection: BlockConnection, context?: Record<string, unknown>): boolean {
    if (!connection.isActive) {
      return false;
    }

    // 無條件連接總是執行
    if (connection.connectionType === ConnectionType.NEXT) {
      return true;
    }

    // 條件連接需要評估條件
    if (connection.connectionType === ConnectionType.CONDITION && connection.condition) {
      return this.evaluateCondition(connection.condition, context);
    }

    return true;
  }

  /**
   * 評估連接條件
   */
  private evaluateCondition(condition: string, context?: Record<string, unknown>): boolean {
    // 簡單的條件評估實現
    // 在實際應用中，可以使用更複雜的表達式解析器
    
    if (!context) {
      return false;
    }

    try {
      // 支援簡單的比較操作
      const userMessage = (context.userMessage as string) || '';
      
      // 檢查是否包含特定文字
      if (condition.startsWith('contains:')) {
        const keyword = condition.substring(9).trim();
        return userMessage.toLowerCase().includes(keyword.toLowerCase());
      }
      
      // 檢查是否完全匹配
      if (condition.startsWith('equals:')) {
        const target = condition.substring(7).trim();
        return userMessage.toLowerCase() === target.toLowerCase();
      }
      
      // 預設：包含匹配
      return userMessage.toLowerCase().includes(condition.toLowerCase());
    } catch (error) {
      console.warn(`條件評估失敗: ${condition}`, error);
      return false;
    }
  }

  /**
   * 推斷連接類型
   */
  private inferConnectionType(sourceBlock: UnifiedBlock, _targetBlock: UnifiedBlock): ConnectionType {
    const sourceType = sourceBlock.blockType;

    // 控制積木通常使用條件連接
    if (sourceType === 'control') {
      return ConnectionType.CONDITION;
    }

    // 預設使用順序連接
    return ConnectionType.NEXT;
  }

  /**
   * 清理無效的連接
   */
  private cleanupInvalidConnections(): void {
    const invalidConnections: string[] = [];
    
    for (const [connectionId, connection] of this.connections) {
      if (!this.blocks.has(connection.sourceBlockId) || !this.blocks.has(connection.targetBlockId)) {
        invalidConnections.push(connectionId);
      }
    }
    
    invalidConnections.forEach(id => {
      this.connections.delete(id);
      console.log(`🗑️ 清理無效連接: ${id}`);
    });
  }
}