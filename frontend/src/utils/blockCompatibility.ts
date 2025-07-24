/**
 * 積木相容性檢查工具
 * 提供積木在不同工作區上下文中的相容性驗證
 */

import {
  UnifiedBlock,
  BlockCategory,
  WorkspaceContext,
  BlockValidationResult,
  BLOCK_COMPATIBILITY_RULES,
  BLOCK_MIGRATION_RULES,
  BlockData,
  UnifiedDropItem
} from '../types/block';

/**
 * 檢查積木是否可以在指定的工作區上下文中使用
 */
export function isBlockCompatible(
  block: UnifiedBlock | UnifiedDropItem,
  context: WorkspaceContext,
  existingBlocks: UnifiedBlock[] = []
): BlockValidationResult {
  // 增強的上下文驗證和調試
  console.log('🔍 積木相容性檢查:', {
    block: block,
    context: context,
    contextType: typeof context,
    isValidContext: Object.values(WorkspaceContext).includes(context),
    existingBlocksCount: existingBlocks.length
  });

  // 確保上下文有效
  if (!context) {
    console.warn('⚠️ 上下文為空或未定義:', context);
    return {
      isValid: false,
      reason: '無效的工作區上下文',
      suggestions: [
        '請確認當前工作區模式設置正確',
        '檢查 activeTab 狀態是否正常初始化',
        '確認 getCurrentContext() 函數返回值'
      ]
    };
  }

  // 檢查上下文是否為有效的枚舉值
  if (!Object.values(WorkspaceContext).includes(context)) {
    console.error('❌ 無效的上下文值:', context, '有效值:', Object.values(WorkspaceContext));
    // 嘗試修復無效的上下文
    const fallbackContext = WorkspaceContext.LOGIC;
    console.log('🔧 使用後備上下文:', fallbackContext);
    return isBlockCompatible(block, fallbackContext, existingBlocks);
  }

  const category = 'category' in block ? block.category : getCategoryFromBlockType(block.blockType);
  console.log('📦 積木類別檢查:', {
    blockType: 'blockType' in block ? block.blockType : 'N/A',
    category: category,
    hasCategory: 'category' in block
  });
  
  const rule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === category);
  
  if (!rule) {
    // 對於未定義的積木類別，給予更寬鬆的處理
    console.warn(`⚠️ 未找到積木類別 ${category} 的相容性規則，使用預設規則`);
    console.log('📋 可用的積木類別規則:', BLOCK_COMPATIBILITY_RULES.map(r => r.category));
    
    // 檢查是否為有效的 BlockCategory 枚舉值
    if (Object.values(BlockCategory).includes(category)) {
      console.log('✅ 積木類別有效，但缺少相容性規則，允許在當前上下文使用');
      return {
        isValid: true,
        reason: `積木類別 ${category} 使用預設相容性規則（在 ${context} 上下文中允許）`,
        suggestions: [
          '此積木可能需要更新相容性定義',
          '建議在 BLOCK_COMPATIBILITY_RULES 中添加此類別的規則'
        ]
      };
    } else {
      console.error('❌ 無效的積木類別:', category, '有效類別:', Object.values(BlockCategory));
      return {
        isValid: false,
        reason: `無效的積木類別: ${category}`,
        suggestions: [
          '檢查積木定義是否正確',
          '確認 getCategoryFromBlockType 函數是否正常工作'
        ]
      };
    }
  }
  
  // 檢查基本相容性
  console.log('🔒 檢查基本相容性:', {
    category: category,
    allowedIn: rule.allowedIn,
    currentContext: context,
    isAllowed: rule.allowedIn.includes(context)
  });
  
  if (!rule.allowedIn.includes(context)) {
    console.log('❌ 積木不相容於當前上下文');
    return {
      isValid: false,
      reason: `${category} 積木不能在 ${context} 上下文中使用`,
      suggestions: [
        `此積木只能在 ${rule.allowedIn.join(', ')} 上下文中使用`,
        context === WorkspaceContext.LOGIC ? '切換到 Flex 設計器模式' : '切換到邏輯編輯器模式'
      ]
    };
  }
  
  // 檢查數量限制
  if (rule.restrictions?.maxCount !== undefined) {
    const existingCount = existingBlocks.filter(b => b.category === category).length;
    if (existingCount >= rule.restrictions.maxCount) {
      return {
        isValid: false,
        reason: `${category} 積木數量已達上限 (${rule.restrictions.maxCount})`,
        suggestions: ['請移除現有的同類積木再添加新的']
      };
    }
  }
  
  // 檢查父積木依賴
  if (rule.restrictions?.requiresParent && context === WorkspaceContext.LOGIC) {
    const hasValidParent = existingBlocks.some(existingBlock => 
      rule.restrictions!.requiresParent!.includes(existingBlock.category)
    );
    
    if (!hasValidParent) {
      return {
        isValid: false,
        reason: `${category} 積木需要特定的父積木`,
        suggestions: [`請先添加 ${rule.restrictions.requiresParent.join(' 或 ')} 積木`]
      };
    }
  }
  
  // 檢查禁止組合
  if (rule.restrictions?.forbiddenWith) {
    const hasForbiddenBlock = existingBlocks.some(existingBlock =>
      rule.restrictions!.forbiddenWith!.includes(existingBlock.category)
    );
    
    if (hasForbiddenBlock) {
      return {
        isValid: false,
        reason: `${category} 積木不能與現有的某些積木同時存在`,
        suggestions: [`請移除 ${rule.restrictions.forbiddenWith.join(' 或 ')} 積木`]
      };
    }
  }
  
  console.log('✅ 積木相容性檢查通過');
  return {
    isValid: true,
    reason: `${category} 積木可以在 ${context} 上下文中使用`
  };
}

/**
 * 根據舊的 blockType 獲取對應的類別
 */
export function getCategoryFromBlockType(blockType: string): BlockCategory {
  const migrationRule = BLOCK_MIGRATION_RULES.find(rule => rule.oldBlockType === blockType);
  return migrationRule?.newCategory || BlockCategory.SETTING; // 默認為設定類別
}

/**
 * 獲取積木的相容性上下文
 */
export function getBlockCompatibility(category: BlockCategory): WorkspaceContext[] {
  const rule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === category);
  return rule?.allowedIn || [];
}

/**
 * 轉換舊格式的積木到統一格式
 */
export function migrateBlock(oldBlock: {
  blockType: string;
  blockData: BlockData;
}): UnifiedBlock {
  const category = getCategoryFromBlockType(oldBlock.blockType);
  const compatibility = getBlockCompatibility(category);
  const migrationRule = BLOCK_MIGRATION_RULES.find(rule => rule.oldBlockType === oldBlock.blockType);
  
  const transformedData = migrationRule?.dataTransform 
    ? migrationRule.dataTransform(oldBlock.blockData)
    : oldBlock.blockData;
  
  return {
    id: generateBlockId(),
    blockType: oldBlock.blockType,
    category,
    blockData: transformedData,
    compatibility,
    children: []
  };
}

/**
 * 轉換多個舊格式積木到統一格式
 */
export function migrateBlocks(oldBlocks: { blockType: string; blockData: BlockData; }[]): UnifiedBlock[] {
  return oldBlocks.map(migrateBlock);
}

/**
 * 生成唯一的積木 ID
 */
export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 檢查積木是否可以嵌套到另一個積木中
 */
export function canNestBlock(
  childCategory: BlockCategory,
  parentCategory: BlockCategory
): boolean {
  const childRule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === childCategory);
  
  if (!childRule?.restrictions?.requiresParent) {
    return true; // 沒有父積木要求，可以自由嵌套
  }
  
  return childRule.restrictions.requiresParent.includes(parentCategory);
}

/**
 * 獲取積木的建議用法
 */
export function getBlockUsageSuggestions(category: BlockCategory): string[] {
  const rule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === category);
  const suggestions: string[] = [];
  
  if (rule?.allowedIn.includes(WorkspaceContext.LOGIC)) {
    suggestions.push('可以在邏輯編輯器中使用');
  }
  
  if (rule?.allowedIn.includes(WorkspaceContext.FLEX)) {
    suggestions.push('可以在 Flex 設計器中使用');
  }
  
  if (rule?.dependencies) {
    suggestions.push(`可以與 ${rule.dependencies.join(', ')} 積木組合使用`);
  }
  
  if (rule?.restrictions?.requiresParent) {
    suggestions.push(`需要放置在 ${rule.restrictions.requiresParent.join(' 或 ')} 積木內`);
  }
  
  return suggestions;
}

/**
 * 驗證整個積木工作區的相容性
 */
export function validateWorkspace(
  blocks: UnifiedBlock[],
  context: WorkspaceContext
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  blocks.forEach((block, index) => {
    const validation = isBlockCompatible(block, context, blocks);
    if (!validation.isValid) {
      errors.push(`積木 ${index + 1} (${block.category}): ${validation.reason}`);
    }
  });
  
  // 檢查邏輯流程的完整性
  if (context === WorkspaceContext.LOGIC) {
    const hasEventBlock = blocks.some(b => b.category === BlockCategory.EVENT);
    if (!hasEventBlock) {
      warnings.push('建議添加事件積木作為邏輯的起點');
    }
    
    const hasReplyBlock = blocks.some(b => b.category === BlockCategory.REPLY);
    if (!hasReplyBlock) {
      warnings.push('建議添加回覆積木來回應用戶');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}