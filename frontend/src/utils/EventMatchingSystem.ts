/**
 * 增強的事件匹配系統
 * 支援多種匹配模式和複雜條件組合
 */

export enum MatchType {
  EXACT = 'exact',           // 完全匹配
  CONTAINS = 'contains',     // 包含匹配
  STARTS_WITH = 'startsWith', // 開頭匹配
  ENDS_WITH = 'endsWith',    // 結尾匹配
  REGEX = 'regex',           // 正則表達式
  CUSTOM = 'custom',         // 自訂函數
  FUZZY = 'fuzzy'           // 模糊匹配
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export interface EventPattern {
  id: string;
  type: MatchType;
  pattern: string;
  caseSensitive: boolean;
  weight: number;              // 匹配權重 (0-1)
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompoundCondition {
  operator: LogicalOperator;
  conditions: (EventPattern | CompoundCondition)[];
}

export interface MatchResult {
  matched: boolean;
  confidence: number;          // 匹配信心度 (0-1)
  matchedPatterns: string[];   // 匹配的模式 ID
  extractedValues: Map<string, string>; // 提取的值
  processingTime: number;      // 處理時間 (ms)
}

export interface EventContext {
  userMessage: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  previousMessages: string[];
  userProfile?: Record<string, unknown>;
  customData?: Record<string, unknown>;
}

/**
 * 增強的事件匹配器
 */
export class EnhancedEventMatcher {
  private patterns: Map<string, EventPattern> = new Map();
  private customMatchers: Map<string, (message: string, context: EventContext) => boolean> = new Map();
  private fuzzyThreshold: number = 0.6;

  constructor() {
    this.initializeBuiltInMatchers();
  }

  /**
   * 添加事件模式
   */
  addPattern(pattern: EventPattern): void {
    this.patterns.set(pattern.id, pattern);
    console.log(`📝 已添加事件模式: ${pattern.id}`, pattern);
  }

  /**
   * 移除事件模式
   */
  removePattern(patternId: string): boolean {
    const success = this.patterns.delete(patternId);
    if (success) {
      console.log(`🗑️ 已移除事件模式: ${patternId}`);
    }
    return success;
  }

  /**
   * 更新事件模式
   */
  updatePattern(patternId: string, updates: Partial<EventPattern>): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      return false;
    }

    const updatedPattern = { ...pattern, ...updates };
    this.patterns.set(patternId, updatedPattern);
    console.log(`🔄 已更新事件模式: ${patternId}`, updates);
    return true;
  }

  /**
   * 註冊自訂匹配器
   */
  registerCustomMatcher(
    name: string, 
    matcher: (message: string, context: EventContext) => boolean
  ): void {
    this.customMatchers.set(name, matcher);
    console.log(`🔧 已註冊自訂匹配器: ${name}`);
  }

  /**
   * 匹配訊息
   */
  match(message: string, context: Partial<EventContext> = {}): MatchResult {
    const startTime = performance.now();
    
    const fullContext: EventContext = {
      userMessage: message,
      timestamp: Date.now(),
      previousMessages: [],
      ...context
    };

    const matchedPatterns: string[] = [];
    const extractedValues = new Map<string, string>();
    let totalWeight = 0;
    let totalConfidence = 0;

    // 檢查所有啟用的模式
    for (const pattern of this.patterns.values()) {
      if (!pattern.enabled) continue;

      const patternResult = this.matchPattern(message, pattern, fullContext);
      if (patternResult.matched) {
        matchedPatterns.push(pattern.id);
        totalWeight += pattern.weight;
        totalConfidence += patternResult.confidence * pattern.weight;

        // 合併提取的值
        patternResult.extractedValues.forEach((value, key) => {
          extractedValues.set(key, value);
        });
      }
    }

    const finalConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0;
    const processingTime = performance.now() - startTime;

    const result: MatchResult = {
      matched: matchedPatterns.length > 0,
      confidence: finalConfidence,
      matchedPatterns,
      extractedValues,
      processingTime
    };

    console.log(`🎯 事件匹配結果:`, result);
    return result;
  }

  /**
   * 匹配複合條件
   */
  matchCompoundCondition(
    message: string, 
    condition: CompoundCondition, 
    context: EventContext
  ): MatchResult {
    const results: MatchResult[] = [];

    for (const subCondition of condition.conditions) {
      if ('operator' in subCondition) {
        // 遞迴處理複合條件
        results.push(this.matchCompoundCondition(message, subCondition, context));
      } else {
        // 處理單一模式
        results.push(this.matchPattern(message, subCondition, context));
      }
    }

    return this.combineResults(results, condition.operator);
  }

  /**
   * 批次匹配多個訊息
   */
  batchMatch(messages: string[], context: Partial<EventContext> = {}): MatchResult[] {
    return messages.map(message => this.match(message, context));
  }

  /**
   * 取得匹配統計
   */
  getMatchingStats(): {
    totalPatterns: number;
    enabledPatterns: number;
    patternsByType: Record<MatchType, number>;
    customMatchers: number;
  } {
    const patternsByType: Record<MatchType, number> = {} as Record<MatchType, number>;
    let enabledCount = 0;

    for (const pattern of this.patterns.values()) {
      if (pattern.enabled) enabledCount++;
      
      patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1;
    }

    return {
      totalPatterns: this.patterns.size,
      enabledPatterns: enabledCount,
      patternsByType,
      customMatchers: this.customMatchers.size
    };
  }

  /**
   * 匹配單一模式
   */
  private matchPattern(
    message: string, 
    pattern: EventPattern, 
    context: EventContext
  ): MatchResult {
    let matched = false;
    let confidence = 0;
    const extractedValues = new Map<string, string>();

    const targetMessage = pattern.caseSensitive ? message : message.toLowerCase();
    const targetPattern = pattern.caseSensitive ? pattern.pattern : pattern.pattern.toLowerCase();

    switch (pattern.type) {
      case MatchType.EXACT:
        matched = targetMessage === targetPattern;
        confidence = matched ? 1.0 : 0.0;
        break;

      case MatchType.CONTAINS:
        matched = targetMessage.includes(targetPattern);
        confidence = matched ? 0.8 : 0.0;
        break;

      case MatchType.STARTS_WITH:
        matched = targetMessage.startsWith(targetPattern);
        confidence = matched ? 0.9 : 0.0;
        break;

      case MatchType.ENDS_WITH:
        matched = targetMessage.endsWith(targetPattern);
        confidence = matched ? 0.9 : 0.0;
        break;

      case MatchType.REGEX:
        const regexResult = this.matchRegex(targetMessage, pattern.pattern, pattern.caseSensitive);
        matched = regexResult.matched;
        confidence = regexResult.confidence;
        regexResult.extractedValues.forEach((value, key) => {
          extractedValues.set(key, value);
        });
        break;

      case MatchType.CUSTOM:
        const customMatcher = this.customMatchers.get(pattern.pattern);
        if (customMatcher) {
          matched = customMatcher(message, context);
          confidence = matched ? 0.7 : 0.0;
        }
        break;

      case MatchType.FUZZY:
        const fuzzyResult = this.fuzzyMatch(targetMessage, targetPattern);
        matched = fuzzyResult >= this.fuzzyThreshold;
        confidence = fuzzyResult;
        break;
    }

    return {
      matched,
      confidence,
      matchedPatterns: matched ? [pattern.id] : [],
      extractedValues,
      processingTime: 0
    };
  }

  /**
   * 正則表達式匹配
   */
  private matchRegex(
    message: string, 
    pattern: string, 
    caseSensitive: boolean
  ): { matched: boolean; confidence: number; extractedValues: Map<string, string> } {
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const match = message.match(regex);
      
      const extractedValues = new Map<string, string>();
      
      if (match) {
        // 提取命名群組
        if (match.groups) {
          Object.entries(match.groups).forEach(([key, value]) => {
            if (value) extractedValues.set(key, value);
          });
        }
        
        // 提取數字群組
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            extractedValues.set(`group${i}`, match[i]);
          }
        }
      }

      return {
        matched: match !== null,
        confidence: match ? 0.85 : 0.0,
        extractedValues
      };
    } catch (error) {
      console.warn(`正則表達式錯誤: ${pattern}`, error);
      return {
        matched: false,
        confidence: 0.0,
        extractedValues: new Map()
      };
    }
  }

  /**
   * 模糊匹配 (使用 Levenshtein 距離)
   */
  private fuzzyMatch(message: string, pattern: string): number {
    const maxLength = Math.max(message.length, pattern.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(message, pattern);
    return 1.0 - (distance / maxLength);
  }

  /**
   * 計算 Levenshtein 距離
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 合併匹配結果
   */
  private combineResults(results: MatchResult[], operator: LogicalOperator): MatchResult {
    if (results.length === 0) {
      return {
        matched: false,
        confidence: 0,
        matchedPatterns: [],
        extractedValues: new Map(),
        processingTime: 0
      };
    }

    let matched: boolean;
    let confidence: number;
    const allMatchedPatterns: string[] = [];
    const allExtractedValues = new Map<string, string>();
    const totalTime = results.reduce((sum, result) => sum + result.processingTime, 0);

    // 合併所有匹配的模式和提取值
    results.forEach(result => {
      allMatchedPatterns.push(...result.matchedPatterns);
      result.extractedValues.forEach((value, key) => {
        allExtractedValues.set(key, value);
      });
    });

    switch (operator) {
      case LogicalOperator.AND:
        matched = results.every(result => result.matched);
        confidence = matched ? results.reduce((sum, result) => sum + result.confidence, 0) / results.length : 0;
        break;

      case LogicalOperator.OR:
        matched = results.some(result => result.matched);
        confidence = Math.max(...results.map(result => result.confidence));
        break;

      case LogicalOperator.NOT:
        // NOT 操作只考慮第一個結果
        matched = !results[0].matched;
        confidence = 1.0 - results[0].confidence;
        break;
    }

    return {
      matched,
      confidence,
      matchedPatterns: allMatchedPatterns,
      extractedValues: allExtractedValues,
      processingTime: totalTime
    };
  }

  /**
   * 初始化內建匹配器
   */
  private initializeBuiltInMatchers(): void {
    // 問候語匹配器
    this.registerCustomMatcher('greeting', (message: string) => {
      const greetings = ['你好', 'hello', 'hi', '嗨', '哈囉', '安安'];
      return greetings.some(greeting => 
        message.toLowerCase().includes(greeting.toLowerCase())
      );
    });

    // 時間敏感匹配器
    this.registerCustomMatcher('time_sensitive', (message: string, context: EventContext) => {
      const now = new Date();
      const hour = now.getHours();
      
      if (hour >= 6 && hour < 12) {
        return message.includes('早安') || message.includes('早上好');
      } else if (hour >= 12 && hour < 18) {
        return message.includes('午安') || message.includes('下午好');
      } else {
        return message.includes('晚安') || message.includes('晚上好');
      }
    });

    // 情緒檢測匹配器
    this.registerCustomMatcher('emotion', (message: string) => {
      const positiveWords = ['開心', '高興', '快樂', '讚', '好棒'];
      const negativeWords = ['難過', '生氣', '沮喪', '不爽', '煩'];
      
      return positiveWords.some(word => message.includes(word)) ||
             negativeWords.some(word => message.includes(word));
    });

    console.log('🔧 已初始化內建匹配器');
  }
}