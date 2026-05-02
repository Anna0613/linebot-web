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
    blockType: 'blockType' in block ? block.blockType : 'unknown',
    context: context,
    contextType: typeof context,
    isValidContext: Object.values(WorkspaceContext).includes(context),
    existingBlocksCount: existingBlocks.length,
    timestamp: new Date().toISOString()
  });

  // 增強的上下文驗證邏輯
  if (!context || context === null || context === undefined) {
    console.warn('⚠️ 上下文為空、null 或未定義:', context);
    return {
      isValid: false,
      reason: '工作區上下文未正確初始化',
      suggestions: [
        '請重新整理頁面',
        '確認是否正確選擇了邏輯編輯器或 Flex Message 編輯標籤',
        '檢查瀏覽器控制台是否有其他錯誤'
      ]
    };
  }

  // 檢查上下文是否為有效的枚舉值，使用更嚴格的驗證
  const validContexts = Object.values(WorkspaceContext);
  if (!validContexts.includes(context)) {
    console.error('❌ 無效的上下文值:', context, '有效值:', validContexts);
    
    // 智能上下文修復：根據當前頁面狀態選擇適當的上下文
    let fallbackContext: WorkspaceContext;
    
    // 檢查當前 URL 或其他線索來決定上下文
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash;
      const currentURL = window.location.href;
      
      if (currentHash.includes('flex') || currentURL.includes('flex')) {
        fallbackContext = WorkspaceContext.FLEX;
      } else {
        fallbackContext = WorkspaceContext.LOGIC;
      }
    } else {
      fallbackContext = WorkspaceContext.LOGIC; // 服務器端預設
    }
    
    console.log('🔧 使用智能修復的上下文:', fallbackContext);
    return isBlockCompatible(block, fallbackContext, existingBlocks);
  }

  const category = 'category' in block ? block.category : getCategoryFromBlockType(block.blockType);
  const blockType = 'blockType' in block ? block.blockType : 'unknown';
  
  console.log('📦 積木類別檢查:', {
    blockType: blockType,
    category: category,
    hasCategory: 'category' in block,
    isValidCategory: Object.values(BlockCategory).includes(category)
  });
  
  const rule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === category);
  
  if (!rule) {
    // 對於未定義的積木類別，給予更寬鬆且智能的處理
    console.warn(`⚠️ 未找到積木類別 ${category} 的相容性規則，使用智能預設規則`);
    console.log('📋 可用的積木類別規則:', BLOCK_COMPATIBILITY_RULES.map(r => r.category));
    
    // 檢查是否為有效的 BlockCategory 枚舉值
    if (Object.values(BlockCategory).includes(category)) {
      console.log('✅ 積木類別有效，但缺少相容性規則，使用寬鬆政策允許放置');
      
      // 根據積木類型提供智能建議
      const smartSuggestions = [];
      if (category.includes('flex')) {
        smartSuggestions.push('Flex 相關積木通常可以在兩種模式下使用');
      }
      if (context === WorkspaceContext.FLEX) {
        smartSuggestions.push('Flex Message 編輯支援大多數積木類型');
      }
      smartSuggestions.push('如果積木無法正常工作，請檢查積木的具體配置');
      
      return {
        isValid: true,
        reason: `積木類別 ${category} 使用寬鬆相容性規則（在 ${context} 上下文中允許）`,
        suggestions: smartSuggestions
      };
    } else {
      console.error('❌ 無效的積木類別:', category, '有效類別:', Object.values(BlockCategory));
      
      // 嘗試從積木類型推斷正確的類別
      const inferredCategory = inferCategoryFromBlockType(blockType);
      if (inferredCategory && inferredCategory !== category) {
        console.log('🔧 嘗試使用推斷的積木類別:', inferredCategory);
        const modifiedBlock = { ...block };
        if ('category' in modifiedBlock) {
          modifiedBlock.category = inferredCategory;
        }
        return isBlockCompatible(modifiedBlock, context, existingBlocks);
      }
      
      return {
        isValid: false,
        reason: `無法識別的積木類別: ${category}`,
        suggestions: [
          '檢查積木定義是否正確',
          '確認 getCategoryFromBlockType 函數是否正常工作',
          '嘗試重新整理頁面或清除緩存'
        ]
      };
    }
  }
  
  // 檢查基本相容性
  console.log('🔒 檢查基本相容性:', {
    category: category,
    allowedIn: rule.allowedIn,
    currentContext: context,
    isAllowed: rule.allowedIn.includes(context),
    blockType: blockType
  });
  
  if (!rule.allowedIn.includes(context)) {
    console.log('❌ 積木不相容於當前上下文 - 嘗試寬鬆政策');
    
    // 對於 Flex Message 編輯，採用更寬鬆的政策
    if (context === WorkspaceContext.FLEX) {
      // 在 Flex Message 編輯中，允許大多數積木類型
      if (category === BlockCategory.FLEX_CONTAINER || 
          category === BlockCategory.FLEX_CONTENT || 
          category === BlockCategory.FLEX_LAYOUT ||
          category === BlockCategory.CONTROL) {
        console.log('✅ Flex Message 編輯寬鬆政策：允許此積木');
        return {
          isValid: true,
          reason: `Flex Message 編輯支援 ${category} 積木（寬鬆政策）`,
          suggestions: [
            'Flex Message 編輯支援多種積木類型來創建豐富的介面',
            '如果積木表現異常，請檢查具體的配置參數'
          ]
        };
      }
    }
    
    // 對於邏輯編輯器，也採用適度寬鬆的政策
    if (context === WorkspaceContext.LOGIC) {
      // 在邏輯編輯器中，允許 Flex 容器積木，因為它們經常用於回覆中
      if (category === BlockCategory.FLEX_CONTAINER) {
        console.log('✅ 邏輯編輯器寬鬆政策：允許 Flex 容器積木');
        return {
          isValid: true,
          reason: `邏輯編輯器支援 Flex 容器積木用於豐富回覆（寬鬆政策）`,
          suggestions: [
            'Flex 容器積木可以用來創建豐富的回覆訊息',
            '請確保在回覆積木中使用 Flex 容器'
          ]
        };
      }
    }
    
    // 如果寬鬆政策也不適用，則返回原始錯誤
    console.log('❌ 即使使用寬鬆政策也不相容');
    return {
      isValid: false,
      reason: `${category} 積木不適合在 ${context} 上下文中使用`,
      suggestions: [
        `此積木主要設計用於 ${rule.allowedIn.join(', ')} 上下文`,
        context === WorkspaceContext.LOGIC ? '嘗試切換到 Flex Message 編輯標籤' : '嘗試切換到邏輯編輯器標籤',
        '查看積木說明了解正確的使用方式'
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
  
  // 檢查父積木依賴（優化後的寬鬆檢查）
  if (rule.restrictions?.requiresParent) {
    const hasValidParent = existingBlocks.some(existingBlock => 
      rule.restrictions!.requiresParent!.includes(existingBlock.category)
    );
    
    if (!hasValidParent) {
      // 在 Flex Message 編輯中，放寬父積木依賴要求
      if (context === WorkspaceContext.FLEX) {
        console.log('🎨 Flex Message 編輯：放寬父積木依賴要求');
        return {
          isValid: true,
          reason: `${category} 積木在 Flex Message 編輯中可獨立使用`,
          suggestions: [
            'Flex Message 編輯允許更靈活的積木組合',
            '建議按照 Flex Message 的結構來組織積木',
            `完整結構中建議包含 ${rule.restrictions.requiresParent.join(' 或 ')} 積木`
          ]
        };
      }
      
      // 在邏輯編輯器中，提供友善的建議而不是直接阻止
      console.log('📋 邏輯編輯器：父積木依賴檢查 - 提供建議');
      return {
        isValid: true, // 改為允許，但提供建議
        reason: `${category} 積木已放置，建議添加相關的父積木以確保完整功能`,
        suggestions: [
          `建議添加 ${rule.restrictions.requiresParent.join(' 或 ')} 積木來提供完整的功能`,
          '您可以稍後重新組織積木順序',
          '積木功能可能需要適當的父積木才能正常運作'
        ]
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
 * 根據 blockType 獲取對應的類別
 */
export function getCategoryFromBlockType(blockType: string): BlockCategory {
  if (!blockType || typeof blockType !== 'string') {
    console.warn('⚠️ getCategoryFromBlockType: 無效的 blockType:', blockType);
    return BlockCategory.SETTING; // 預設值
  }
  
  const lowerType = blockType.toLowerCase();
  
  // 根據積木類型名稱進行精確映射
  if (lowerType.includes('event') || lowerType.includes('trigger')) {
    return BlockCategory.EVENT;
  }
  
  if (lowerType.includes('reply') || lowerType.includes('message') || lowerType.includes('send')) {
    return BlockCategory.REPLY;
  }
  
  if (lowerType.includes('control') || lowerType.includes('if') || lowerType.includes('loop') || lowerType.includes('condition') || lowerType.includes('wait')) {
    return BlockCategory.CONTROL;
  }
  
  if (lowerType.includes('flex-container') || lowerType.includes('bubble') || lowerType.includes('carousel') || lowerType.includes('box')) {
    return BlockCategory.FLEX_CONTAINER;
  }
  
  if (lowerType.includes('flex-content') || (lowerType.includes('flex') && (lowerType.includes('text') || lowerType.includes('image') || lowerType.includes('button') || lowerType.includes('separator')))) {
    return BlockCategory.FLEX_CONTENT;
  }
  
  if (lowerType.includes('flex-layout') || (lowerType.includes('flex') && (lowerType.includes('spacer') || lowerType.includes('filler') || lowerType.includes('align')))) {
    return BlockCategory.FLEX_LAYOUT;
  }
  
  if (lowerType.includes('setting') || lowerType.includes('config') || lowerType.includes('variable') || lowerType.includes('userdata')) {
    return BlockCategory.SETTING;
  }
  
  // 無法推斷時的後備處理
  console.warn('⚠️ getCategoryFromBlockType: 無法推斷積木類別，使用預設 SETTING:', blockType);
  return BlockCategory.SETTING;
}

/**
 * 智能推斷積木類別（當標準遷移規則失效時使用）
 */
export function inferCategoryFromBlockType(blockType: string): BlockCategory | null {
  if (!blockType || typeof blockType !== 'string') {
    return null;
  }
  
  const lowerType = blockType.toLowerCase();
  
  // 根據積木類型名稱的模式進行推斷
  if (lowerType.includes('event') || lowerType.includes('trigger')) {
    return BlockCategory.EVENT;
  }
  
  if (lowerType.includes('reply') || lowerType.includes('message') || lowerType.includes('send')) {
    return BlockCategory.REPLY;
  }
  
  if (lowerType.includes('control') || lowerType.includes('if') || lowerType.includes('loop') || lowerType.includes('condition')) {
    return BlockCategory.CONTROL;
  }
  
  if (lowerType.includes('flex-container') || lowerType.includes('bubble') || lowerType.includes('carousel')) {
    return BlockCategory.FLEX_CONTAINER;
  }
  
  if (lowerType.includes('flex-content') || lowerType.includes('text') || lowerType.includes('image') || lowerType.includes('button')) {
    return BlockCategory.FLEX_CONTENT;
  }
  
  if (lowerType.includes('flex-layout') || lowerType.includes('box') || lowerType.includes('separator') || lowerType.includes('spacer')) {
    return BlockCategory.FLEX_LAYOUT;
  }
  
  if (lowerType.includes('flex')) {
    // 一般性的 Flex 積木，預設為容器類型
    return BlockCategory.FLEX_CONTAINER;
  }
  
  if (lowerType.includes('setting') || lowerType.includes('config')) {
    return BlockCategory.SETTING;
  }
  
  // 無法推斷，返回 null
  console.log('🤔 無法推斷積木類別，blockType:', blockType);
  return null;
}

/**
 * 獲取積木的相容性上下文
 */
export function getBlockCompatibility(category: BlockCategory): WorkspaceContext[] {
  const rule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === category);
  return rule?.allowedIn || [];
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
    suggestions.push('可以在 Flex Message 編輯中使用');
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