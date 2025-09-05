/**
 * 智能錯誤提示和驗證系統
 * 提供即時驗證、智能建議和自動修復功能
 */

import { UnifiedBlock } from '../types/block';
import { BlockConnection, ConnectionType } from '../types/blockConnection';

export enum ValidationLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success'
}

export enum ValidationCategory {
  STRUCTURE = 'structure',        // 結構錯誤
  LOGIC = 'logic',               // 邏輯錯誤
  CONTENT = 'content',           // 內容錯誤
  PERFORMANCE = 'performance',   // 效能問題
  ACCESSIBILITY = 'accessibility', // 可存取性
  BEST_PRACTICE = 'best_practice' // 最佳實踐
}

export interface ValidationIssue {
  id: string;
  level: ValidationLevel;
  category: ValidationCategory;
  title: string;
  description: string;
  blockId?: string;
  connectionId?: string;
  position?: { x: number; y: number };
  suggestions: ValidationSuggestion[];
  autoFixAvailable: boolean;
  learnMoreUrl?: string;
  relatedIssues?: string[];
}

export interface ValidationSuggestion {
  id: string;
  title: string;
  description: string;
  action: 'fix' | 'ignore' | 'learn';
  actionData?: Record<string, unknown>;
  confidence: number; // 0-1
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    totalIssues: number;
  };
  overallScore: number; // 0-100
  recommendations: string[];
}

export interface AutoFixResult {
  success: boolean;
  issuesFixed: string[];
  newIssues: ValidationIssue[];
  modifiedBlocks: UnifiedBlock[];
  modifiedConnections: BlockConnection[];
  summary: string;
}

/**
 * 智能驗證系統
 */
export class IntelligentValidationSystem {
  private validationRules: Map<string, ValidationRule> = new Map();
  private fixStrategies: Map<string, AutoFixStrategy> = new Map();
  private validationHistory: ValidationResult[] = [];

  constructor() {
    this.initializeValidationRules();
    this.initializeAutoFixStrategies();
  }

  /**
   * 驗證整個工作區
   */
  validateWorkspace(
    blocks: UnifiedBlock[], 
    connections: BlockConnection[]
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    console.log('🔍 開始智能驗證工作區...');

    // 執行所有驗證規則
    for (const rule of this.validationRules.values()) {
      try {
        const ruleIssues = rule.validate(blocks, connections);
        issues.push(...ruleIssues);
      } catch (error) {
        console.error(`驗證規則執行失敗: ${rule.id}`, error);
      }
    }

    // 計算統計資料
    const summary = this.calculateSummary(issues);
    const overallScore = this.calculateOverallScore(issues, blocks.length);
    const recommendations = this.generateRecommendations(issues);

    const result: ValidationResult = {
      isValid: summary.errorCount === 0,
      issues,
      summary,
      overallScore,
      recommendations
    };

    // 儲存到歷史記錄
    this.validationHistory.push(result);
    if (this.validationHistory.length > 10) {
      this.validationHistory.shift();
    }

    console.log('✅ 驗證完成:', summary);
    return result;
  }

  /**
   * 驗證單一積木
   */
  validateBlock(block: UnifiedBlock, context: {
    allBlocks: UnifiedBlock[];
    connections: BlockConnection[];
  }): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const rule of this.validationRules.values()) {
      if (rule.appliesToBlock && rule.appliesToBlock(block)) {
        try {
          const ruleIssues = rule.validate(context.allBlocks, context.connections, block);
          issues.push(...ruleIssues);
        } catch (error) {
          console.error(`積木驗證規則執行失敗: ${rule.id}`, error);
        }
      }
    }

    return issues;
  }

  /**
   * 自動修復問題
   */
  async autoFixIssues(
    issues: ValidationIssue[],
    blocks: UnifiedBlock[],
    connections: BlockConnection[]
  ): Promise<AutoFixResult> {
    const fixedIssues: string[] = [];
    const newIssues: ValidationIssue[] = [];
    let modifiedBlocks = [...blocks];
    let modifiedConnections = [...connections];

    console.log(`🔧 開始自動修復 ${issues.length} 個問題...`);

    for (const issue of issues) {
      if (!issue.autoFixAvailable) continue;

      const strategy = this.fixStrategies.get(issue.category);
      if (!strategy) continue;

      try {
        const fixResult = await strategy.fix(issue, modifiedBlocks, modifiedConnections);
        
        if (fixResult.success) {
          fixedIssues.push(issue.id);
          modifiedBlocks = fixResult.modifiedBlocks || modifiedBlocks;
          modifiedConnections = fixResult.modifiedConnections || modifiedConnections;
          
          // 檢查是否產生新問題
          if (fixResult.newIssues) {
            newIssues.push(...fixResult.newIssues);
          }

          console.log(`✅ 已修復問題: ${issue.title}`);
        } else {
          console.warn(`❌ 修復失敗: ${issue.title} - ${fixResult.error}`);
        }
      } catch (error) {
        console.error(`自動修復執行失敗: ${issue.id}`, error);
      }
    }

    const result: AutoFixResult = {
      success: fixedIssues.length > 0,
      issuesFixed: fixedIssues,
      newIssues,
      modifiedBlocks,
      modifiedConnections,
      summary: this.generateAutoFixSummary(fixedIssues, newIssues)
    };

    console.log('🔧 自動修復完成:', result.summary);
    return result;
  }

  /**
   * 獲取智能建議
   */
  getSmartSuggestions(
    blocks: UnifiedBlock[],
    connections: BlockConnection[],
    context?: {
      currentBlock?: UnifiedBlock;
      userIntent?: string;
      recentActions?: string[];
    }
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // 基於現有問題的建議
    const validationResult = this.validateWorkspace(blocks, connections);
    validationResult.issues.forEach(issue => {
      suggestions.push(...issue.suggestions);
    });

    // 基於最佳實踐的建議
    suggestions.push(...this.generateBestPracticeSuggestions(blocks, connections));

    // 基於使用模式的建議
    if (context?.recentActions) {
      suggestions.push(...this.generateUsagePatternSuggestions(context.recentActions));
    }

    // 依信心度排序
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // 只返回前10個建議
  }

  /**
   * 取得驗證歷史趨勢
   */
  getValidationTrends(): {
    scoreHistory: number[];
    issueCountHistory: number[];
    improvementSuggestions: string[];
  } {
    const scoreHistory = this.validationHistory.map(r => r.overallScore);
    const issueCountHistory = this.validationHistory.map(r => r.summary.totalIssues);
    
    const improvementSuggestions = this.analyzeValidationTrends(this.validationHistory);

    return {
      scoreHistory,
      issueCountHistory,
      improvementSuggestions
    };
  }

  // 私有方法

  /**
   * 初始化驗證規則
   */
  private initializeValidationRules(): void {
    // 結構驗證規則
    this.validationRules.set('orphan_blocks', {
      id: 'orphan_blocks',
      category: ValidationCategory.STRUCTURE,
      validate: (blocks, connections) => {
        const issues: ValidationIssue[] = [];
        const connectedBlockIds = new Set<string>();
        
        connections.forEach(conn => {
          connectedBlockIds.add(conn.sourceBlockId);
          connectedBlockIds.add(conn.targetBlockId);
        });

        blocks.forEach(block => {
          if (block.id && !connectedBlockIds.has(block.id) && blocks.length > 1) {
            issues.push({
              id: `orphan_${block.id}`,
              level: ValidationLevel.WARNING,
              category: ValidationCategory.STRUCTURE,
              title: '孤立積木',
              description: '此積木沒有與其他積木連接，可能不會被執行。',
              blockId: block.id,
              suggestions: [
                {
                  id: 'connect_block',
                  title: '連接此積木',
                  description: '將此積木與其他積木連接以確保它會被執行。',
                  action: 'fix',
                  confidence: 0.8,
                  estimatedImpact: 'medium'
                }
              ],
              autoFixAvailable: true
            });
          }
        });

        return issues;
      }
    });

    // 邏輯驗證規則
    this.validationRules.set('missing_event_handler', {
      id: 'missing_event_handler',
      category: ValidationCategory.LOGIC,
      validate: (blocks) => {
        const issues: ValidationIssue[] = [];
        const hasEventBlock = blocks.some(b => b.blockType === 'event');

        if (!hasEventBlock && blocks.length > 0) {
          issues.push({
            id: 'no_event_blocks',
            level: ValidationLevel.ERROR,
            category: ValidationCategory.LOGIC,
            title: '缺少事件積木',
            description: 'Bot 需要至少一個事件積木來響應用戶訊息。',
            suggestions: [
              {
                id: 'add_event_block',
                title: '添加訊息事件積木',
                description: '添加「當收到文字訊息時」積木來處理用戶訊息。',
                action: 'fix',
                confidence: 0.9,
                estimatedImpact: 'high'
              }
            ],
            autoFixAvailable: true
          });
        }

        return issues;
      }
    });

    // 內容驗證規則
    this.validationRules.set('empty_content', {
      id: 'empty_content',
      category: ValidationCategory.CONTENT,
      validate: (blocks) => {
        const issues: ValidationIssue[] = [];

        blocks.forEach(block => {
          if (block.blockType === 'reply' && block.blockData.replyType === 'text') {
            const content = block.blockData.content as string;
            if (!content || content.trim().length === 0) {
              issues.push({
                id: `empty_content_${block.id}`,
                level: ValidationLevel.WARNING,
                category: ValidationCategory.CONTENT,
                title: '空的回覆內容',
                description: '回覆積木沒有設定內容，用戶將收到空白訊息。',
                blockId: block.id,
                suggestions: [
                  {
                    id: 'set_content',
                    title: '設定回覆內容',
                    description: '為此回覆積木設定具體的回覆文字。',
                    action: 'fix',
                    confidence: 0.9,
                    estimatedImpact: 'medium'
                  }
                ],
                autoFixAvailable: true
              });
            }
          }
        });

        return issues;
      }
    });

    // 效能驗證規則
    this.validationRules.set('too_many_blocks', {
      id: 'too_many_blocks',
      category: ValidationCategory.PERFORMANCE,
      validate: (blocks) => {
        const issues: ValidationIssue[] = [];

        if (blocks.length > 50) {
          issues.push({
            id: 'block_count_high',
            level: ValidationLevel.INFO,
            category: ValidationCategory.PERFORMANCE,
            title: '積木數量較多',
            description: `目前有 ${blocks.length} 個積木，可能會影響編輯器效能。`,
            suggestions: [
              {
                id: 'optimize_structure',
                title: '優化結構',
                description: '考慮將複雜的邏輯分解為多個簡單的流程。',
                action: 'learn',
                confidence: 0.7,
                estimatedImpact: 'low'
              }
            ],
            autoFixAvailable: false
          });
        }

        return issues;
      }
    });

    console.log(`✅ 已初始化 ${this.validationRules.size} 個驗證規則`);
  }

  /**
   * 初始化自動修復策略
   */
  private initializeAutoFixStrategies(): void {
    // 結構修復策略
    this.fixStrategies.set(ValidationCategory.STRUCTURE, {
      fix: async (issue, blocks, connections) => {
        if (issue.id.startsWith('orphan_')) {
          const blockId = issue.blockId;
          if (!blockId) return { success: false, error: '無效的積木ID' };

          // 找到最近的事件積木進行連接
          const eventBlocks = blocks.filter(b => b.blockType === 'event');
          if (eventBlocks.length > 0) {
            const newConnection: BlockConnection = {
              id: `conn_${Date.now()}`,
              sourceBlockId: eventBlocks[0].id!,
              targetBlockId: blockId,
              connectionType: ConnectionType.NEXT,
              isActive: true
            };

            return {
              success: true,
              modifiedConnections: [...connections, newConnection]
            };
          }
        }

        return { success: false, error: '無法修復此結構問題' };
      }
    });

    // 邏輯修復策略
    this.fixStrategies.set(ValidationCategory.LOGIC, {
      fix: async (issue, blocks) => {
        if (issue.id === 'no_event_blocks') {
          // 創建一個基本的訊息事件積木
          const newEventBlock: UnifiedBlock = {
            id: `event_${Date.now()}`,
            blockType: 'event',
            category: 'EVENT',
            name: '當收到文字訊息時',
            blockData: {
              title: '當收到文字訊息時',
              eventType: 'message.text'
            },
            children: []
          };

          return {
            success: true,
            modifiedBlocks: [...blocks, newEventBlock]
          };
        }

        return { success: false, error: '無法修復此邏輯問題' };
      }
    });

    // 內容修復策略
    this.fixStrategies.set(ValidationCategory.CONTENT, {
      fix: async (issue, blocks) => {
        if (issue.id.startsWith('empty_content_')) {
          const blockId = issue.blockId;
          if (!blockId) return { success: false, error: '無效的積木ID' };

          const modifiedBlocks = blocks.map(block => {
            if (block.id === blockId) {
              return {
                ...block,
                blockData: {
                  ...block.blockData,
                  content: '您好！我是 LINE Bot 助手。'
                }
              };
            }
            return block;
          });

          return {
            success: true,
            modifiedBlocks
          };
        }

        return { success: false, error: '無法修復此內容問題' };
      }
    });

    console.log(`✅ 已初始化 ${this.fixStrategies.size} 個修復策略`);
  }

  /**
   * 計算驗證統計
   */
  private calculateSummary(issues: ValidationIssue[]): ValidationResult['summary'] {
    return {
      errorCount: issues.filter(i => i.level === ValidationLevel.ERROR).length,
      warningCount: issues.filter(i => i.level === ValidationLevel.WARNING).length,
      infoCount: issues.filter(i => i.level === ValidationLevel.INFO).length,
      totalIssues: issues.length
    };
  }

  /**
   * 計算整體分數
   */
  private calculateOverallScore(issues: ValidationIssue[], blockCount: number): number {
    if (blockCount === 0) return 100;

    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.level) {
        case ValidationLevel.ERROR:
          score -= 20;
          break;
        case ValidationLevel.WARNING:
          score -= 10;
          break;
        case ValidationLevel.INFO:
          score -= 2;
          break;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成建議
   */
  private generateRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.some(i => i.level === ValidationLevel.ERROR)) {
      recommendations.push('請優先修復錯誤級別的問題，這些問題會影響 Bot 的正常運作。');
    }
    
    if (issues.filter(i => i.level === ValidationLevel.WARNING).length > 3) {
      recommendations.push('建議逐步解決警告問題，這將提升 Bot 的穩定性和用戶體驗。');
    }

    if (issues.length === 0) {
      recommendations.push('🎉 太棒了！您的 Bot 邏輯結構完美，沒有發現任何問題。');
    }

    return recommendations;
  }

  /**
   * 生成最佳實踐建議
   */
  private generateBestPracticeSuggestions(
    blocks: UnifiedBlock[], 
    _connections: BlockConnection[]
  ): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // 建議使用條件邏輯
    const hasCondition = blocks.some(b => b.blockType === 'control');
    if (!hasCondition && blocks.length > 3) {
      suggestions.push({
        id: 'add_conditions',
        title: '考慮添加條件邏輯',
        description: '使用條件積木可以讓 Bot 根據不同情況給出不同回應。',
        action: 'learn',
        confidence: 0.6,
        estimatedImpact: 'medium'
      });
    }

    return suggestions;
  }

  /**
   * 生成使用模式建議
   */
  private generateUsagePatternSuggestions(recentActions: string[]): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // 分析最近的操作模式並提供建議
    if (recentActions.includes('add_block') && recentActions.includes('add_block')) {
      suggestions.push({
        id: 'connect_blocks',
        title: '不要忘記連接積木',
        description: '您剛添加了幾個積木，記得將它們連接起來。',
        action: 'fix',
        confidence: 0.8,
        estimatedImpact: 'high'
      });
    }

    return suggestions;
  }

  /**
   * 分析驗證趨勢
   */
  private analyzeValidationTrends(history: ValidationResult[]): string[] {
    const suggestions: string[] = [];

    if (history.length < 2) return suggestions;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    // 分數趨勢
    if (latest.overallScore > previous.overallScore) {
      suggestions.push('🎉 您的 Bot 品質正在改善！繼續保持這個趨勢。');
    } else if (latest.overallScore < previous.overallScore) {
      suggestions.push('⚠️ 品質分數有所下降，建議檢查最近的變更。');
    }

    // 問題數量趨勢
    if (latest.summary.totalIssues < previous.summary.totalIssues) {
      suggestions.push('✅ 問題數量減少了，您的改進很有效！');
    }

    return suggestions;
  }

  /**
   * 生成自動修復摘要
   */
  private generateAutoFixSummary(fixedIssues: string[], newIssues: ValidationIssue[]): string {
    let summary = `已修復 ${fixedIssues.length} 個問題`;
    
    if (newIssues.length > 0) {
      summary += `，但產生了 ${newIssues.length} 個新問題`;
    }
    
    return summary + '。';
  }
}

/**
 * 驗證規則介面
 */
interface ValidationRule {
  id: string;
  category: ValidationCategory;
  validate: (
    blocks: UnifiedBlock[], 
    connections: BlockConnection[], 
    targetBlock?: UnifiedBlock
  ) => ValidationIssue[];
  appliesToBlock?: (block: UnifiedBlock) => boolean;
}

/**
 * 自動修復策略介面
 */
interface AutoFixStrategy {
  fix: (
    issue: ValidationIssue,
    blocks: UnifiedBlock[],
    connections: BlockConnection[]
  ) => Promise<{
    success: boolean;
    error?: string;
    modifiedBlocks?: UnifiedBlock[];
    modifiedConnections?: BlockConnection[];
    newIssues?: ValidationIssue[];
  }>;
}