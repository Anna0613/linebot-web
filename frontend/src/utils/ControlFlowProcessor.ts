/**
 * 控制流積木處理器
 * 處理 if-then、loop、wait 等控制流邏輯
 */

import { UnifiedBlock } from '../types/block';
import { ExecutionContext, BlockExecutionResult } from '../types/blockConnection';

export enum ControlFlowType {
  IF_THEN = 'if_then',
  IF_ELSE = 'if_else',
  WHILE_LOOP = 'while_loop',
  FOR_LOOP = 'for_loop',
  WAIT = 'wait',
  TRY_CATCH = 'try_catch',
  SWITCH = 'switch'
}

export interface ConditionEvaluator {
  evaluate(condition: string, context: ExecutionContext): boolean;
}

export interface LoopState {
  blockId: string;
  currentIteration: number;
  maxIterations: number;
  condition?: string;
  loopVariable?: string;
  startValue?: number;
  endValue?: number;
  stepValue?: number;
}

/**
 * 控制流積木處理器
 */
export class ControlFlowProcessor {
  private conditionEvaluator: ConditionEvaluator;
  private activeLoops: Map<string, LoopState> = new Map();
  private maxLoopIterations: number = 1000;
  private maxWaitTime: number = 10000; // 10秒

  constructor(conditionEvaluator?: ConditionEvaluator) {
    this.conditionEvaluator = conditionEvaluator || new DefaultConditionEvaluator();
  }

  /**
   * 處理 IF-THEN 積木
   */
  processIfBlock(block: UnifiedBlock, context: ExecutionContext): BlockExecutionResult {
    console.log(`🔄 處理 IF 積木: ${block.id}`, block.blockData);

    const condition = block.blockData.condition as string;
    const thenBlockIds = block.blockData.thenBlocks as string[] || [];
    const elseBlockIds = block.blockData.elseBlocks as string[] || [];

    try {
      const conditionResult = this.conditionEvaluator.evaluate(condition, context);
      
      const nextBlocks = conditionResult ? thenBlockIds : elseBlockIds;
      
      console.log(`✅ IF 條件評估: ${condition} = ${conditionResult}, 執行: [${nextBlocks.join(', ')}]`);

      return {
        success: true,
        output: { conditionResult, condition },
        nextBlocks,
        shouldStop: false,
        context
      };
    } catch (error) {
      console.error('❌ IF 積木執行失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('IF 積木執行失敗'),
        nextBlocks: [],
        shouldStop: true,
        context
      };
    }
  }

  /**
   * 處理 WHILE 迴圈積木
   */
  processWhileLoop(block: UnifiedBlock, context: ExecutionContext): BlockExecutionResult {
    console.log(`🔄 處理 WHILE 迴圈: ${block.id}`, block.blockData);

    const blockId = block.id!;
    const condition = block.blockData.condition as string;
    const loopBodyIds = block.blockData.loopBody as string[] || [];
    const maxIterations = Math.min(
      (block.blockData.maxIterations as number) || this.maxLoopIterations,
      this.maxLoopIterations
    );

    try {
      // 取得或創建迴圈狀態
      let loopState = this.activeLoops.get(blockId);
      if (!loopState) {
        loopState = {
          blockId,
          currentIteration: 0,
          maxIterations,
          condition
        };
        this.activeLoops.set(blockId, loopState);
      }

      // 檢查條件
      const conditionResult = this.conditionEvaluator.evaluate(condition, context);
      
      // 檢查迭代限制
      if (loopState.currentIteration >= maxIterations) {
        console.warn(`⚠️ 迴圈達到最大迭代次數: ${maxIterations}`);
        this.activeLoops.delete(blockId);
        return {
          success: true,
          output: { reason: 'max_iterations_reached', iterations: loopState.currentIteration },
          nextBlocks: [], // 結束迴圈
          shouldStop: false,
          context
        };
      }

      if (conditionResult) {
        // 條件為真，執行迴圈體
        loopState.currentIteration++;
        console.log(`🔄 WHILE 迴圈執行第 ${loopState.currentIteration} 次迭代`);
        
        // 將迴圈計數器添加到執行上下文
        context.loopCounters.set(blockId, loopState.currentIteration);

        return {
          success: true,
          output: { iteration: loopState.currentIteration },
          nextBlocks: loopBodyIds,
          shouldStop: false,
          context
        };
      } else {
        // 條件為假，結束迴圈
        console.log(`✅ WHILE 迴圈結束，總共執行 ${loopState.currentIteration} 次`);
        this.activeLoops.delete(blockId);
        
        return {
          success: true,
          output: { completed: true, totalIterations: loopState.currentIteration },
          nextBlocks: [], // 繼續到下一個積木
          shouldStop: false,
          context
        };
      }
    } catch (error) {
      console.error('❌ WHILE 迴圈執行失敗:', error);
      this.activeLoops.delete(blockId);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('WHILE 迴圈執行失敗'),
        nextBlocks: [],
        shouldStop: true,
        context
      };
    }
  }

  /**
   * 處理 FOR 迴圈積木
   */
  processForLoop(block: UnifiedBlock, context: ExecutionContext): BlockExecutionResult {
    console.log(`🔄 處理 FOR 迴圈: ${block.id}`, block.blockData);

    const blockId = block.id!;
    const loopVariable = block.blockData.loopVariable as string || 'i';
    const startValue = (block.blockData.startValue as number) || 0;
    const endValue = (block.blockData.endValue as number) || 10;
    const stepValue = (block.blockData.stepValue as number) || 1;
    const loopBodyIds = block.blockData.loopBody as string[] || [];

    try {
      // 取得或創建迴圈狀態
      let loopState = this.activeLoops.get(blockId);
      if (!loopState) {
        loopState = {
          blockId,
          currentIteration: 0,
          maxIterations: Math.abs((endValue - startValue) / stepValue),
          loopVariable,
          startValue,
          endValue,
          stepValue
        };
        this.activeLoops.set(blockId, loopState);
      }

      const currentValue = startValue + (loopState.currentIteration * stepValue);
      
      // 檢查是否應該繼續迴圈
      const shouldContinue = stepValue > 0 ? currentValue < endValue : currentValue > endValue;

      if (shouldContinue && loopState.currentIteration < this.maxLoopIterations) {
        // 繼續迭代
        loopState.currentIteration++;
        
        // 將迴圈變數添加到執行上下文
        context.variables.set(loopVariable, currentValue);
        context.loopCounters.set(blockId, loopState.currentIteration);

        console.log(`🔄 FOR 迴圈執行第 ${loopState.currentIteration} 次, ${loopVariable} = ${currentValue}`);

        return {
          success: true,
          output: { iteration: loopState.currentIteration, [loopVariable]: currentValue },
          nextBlocks: loopBodyIds,
          shouldStop: false,
          context
        };
      } else {
        // 結束迴圈
        console.log(`✅ FOR 迴圈結束，總共執行 ${loopState.currentIteration} 次`);
        this.activeLoops.delete(blockId);
        
        // 清理迴圈變數
        context.variables.delete(loopVariable);
        
        return {
          success: true,
          output: { completed: true, totalIterations: loopState.currentIteration },
          nextBlocks: [],
          shouldStop: false,
          context
        };
      }
    } catch (error) {
      console.error('❌ FOR 迴圈執行失敗:', error);
      this.activeLoops.delete(blockId);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('FOR 迴圈執行失敗'),
        nextBlocks: [],
        shouldStop: true,
        context
      };
    }
  }

  /**
   * 處理 WAIT 積木
   */
  async processWaitBlock(block: UnifiedBlock, context: ExecutionContext): Promise<BlockExecutionResult> {
    console.log(`⏳ 處理 WAIT 積木: ${block.id}`, block.blockData);

    const waitTime = Math.min(
      (block.blockData.waitTime as number) || 1000,
      this.maxWaitTime
    );
    const waitType = block.blockData.waitType as string || 'time';

    try {
      switch (waitType) {
        case 'time':
          console.log(`⏳ 等待 ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          break;

        case 'condition':
          const condition = block.blockData.waitCondition as string;
          const timeout = Math.min(
            (block.blockData.timeout as number) || 5000,
            this.maxWaitTime
          );
          
          const conditionMet = await this.waitForCondition(condition, context, timeout);
          if (!conditionMet) {
            console.warn('⚠️ 等待條件超時');
            return {
              success: false,
              error: new Error('等待條件超時'),
              nextBlocks: [],
              shouldStop: false, // 不完全停止，允許繼續執行
              context
            };
          }
          break;

        case 'user_input':
          console.log('⏳ 等待用戶輸入');
          // 在實際應用中，這可能需要與 UI 互動
          break;

        default:
          console.warn(`⚠️ 未知的等待類型: ${waitType}`);
      }

      return {
        success: true,
        output: { waitType, waitTime },
        nextBlocks: [],
        shouldStop: false,
        context
      };
    } catch (error) {
      console.error('❌ WAIT 積木執行失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('WAIT 積木執行失敗'),
        nextBlocks: [],
        shouldStop: true,
        context
      };
    }
  }

  /**
   * 處理 TRY-CATCH 積木
   */
  processTryCatchBlock(block: UnifiedBlock, context: ExecutionContext): BlockExecutionResult {
    console.log(`🔄 處理 TRY-CATCH 積木: ${block.id}`, block.blockData);

    const tryBlockIds = block.blockData.tryBlocks as string[] || [];
    const catchBlockIds = block.blockData.catchBlocks as string[] || [];
    const finallyBlockIds = block.blockData.finallyBlocks as string[] || [];

    try {
      // 在實際應用中，這需要與執行引擎整合
      // 這裡只是示例實現
      return {
        success: true,
        output: { tryBlocks: tryBlockIds.length, catchBlocks: catchBlockIds.length },
        nextBlocks: tryBlockIds, // 首先執行 try 區塊
        shouldStop: false,
        context
      };
    } catch (error) {
      console.error('❌ TRY-CATCH 積木執行失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('TRY-CATCH 積木執行失敗'),
        nextBlocks: catchBlockIds, // 執行 catch 區塊
        shouldStop: false,
        context
      };
    }
  }

  /**
   * 處理 SWITCH 積木
   */
  processSwitchBlock(block: UnifiedBlock, context: ExecutionContext): BlockExecutionResult {
    console.log(`🔄 處理 SWITCH 積木: ${block.id}`, block.blockData);

    const switchVariable = block.blockData.switchVariable as string;
    const cases = block.blockData.cases as Array<{
      value: string;
      blocks: string[];
    }> || [];
    const defaultBlocks = block.blockData.defaultBlocks as string[] || [];

    try {
      const variableValue = context.variables.get(switchVariable);
      const stringValue = String(variableValue);

      // 尋找匹配的 case
      for (const caseItem of cases) {
        if (caseItem.value === stringValue) {
          console.log(`✅ SWITCH 匹配 case: ${caseItem.value}`);
          return {
            success: true,
            output: { matchedCase: caseItem.value },
            nextBlocks: caseItem.blocks,
            shouldStop: false,
            context
          };
        }
      }

      // 沒有匹配的 case，執行 default
      console.log('🔄 SWITCH 執行 default case');
      return {
        success: true,
        output: { matchedCase: 'default' },
        nextBlocks: defaultBlocks,
        shouldStop: false,
        context
      };
    } catch (error) {
      console.error('❌ SWITCH 積木執行失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('SWITCH 積木執行失敗'),
        nextBlocks: [],
        shouldStop: true,
        context
      };
    }
  }

  /**
   * 清理迴圈狀態
   */
  clearLoopState(blockId?: string): void {
    if (blockId) {
      this.activeLoops.delete(blockId);
      console.log(`🧹 已清理迴圈狀態: ${blockId}`);
    } else {
      this.activeLoops.clear();
      console.log('🧹 已清理所有迴圈狀態');
    }
  }

  /**
   * 取得迴圈統計
   */
  getLoopStats(): {
    activeLoops: number;
    loopDetails: Array<{
      blockId: string;
      currentIteration: number;
      maxIterations: number;
    }>;
  } {
    return {
      activeLoops: this.activeLoops.size,
      loopDetails: Array.from(this.activeLoops.values()).map(state => ({
        blockId: state.blockId,
        currentIteration: state.currentIteration,
        maxIterations: state.maxIterations
      }))
    };
  }

  /**
   * 等待條件滿足
   */
  private async waitForCondition(
    condition: string, 
    context: ExecutionContext, 
    timeout: number
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // 每100ms檢查一次

    while (Date.now() - startTime < timeout) {
      try {
        if (this.conditionEvaluator.evaluate(condition, context)) {
          return true;
        }
      } catch (error) {
        console.warn('條件評估錯誤:', error);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return false;
  }
}

/**
 * 預設條件評估器
 */
export class DefaultConditionEvaluator implements ConditionEvaluator {
  evaluate(condition: string, context: ExecutionContext): boolean {
    try {
      // 簡單的條件評估實現
      // 在實際應用中，應該使用更安全的表達式解析器
      
      // 支援變數替換
      let evaluatedCondition = condition;
      
      // 替換變數
      context.variables.forEach((value, key) => {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedCondition = evaluatedCondition.replace(regex, String(value));
      });
      
      // 替換常用的比較操作
      evaluatedCondition = evaluatedCondition
        .replace(/\bequals\b/g, '===')
        .replace(/\bcontains\b/g, '.includes')
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\b/g, '!');

      // 在實際應用中，這裡應該使用更安全的評估方式
      // eslint-disable-next-line no-eval
      return Boolean(eval(evaluatedCondition));
    } catch (error) {
      console.warn(`條件評估失敗: ${condition}`, error);
      return false;
    }
  }
}