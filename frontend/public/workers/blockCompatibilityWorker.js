/**
 * Web Worker for Block Compatibility Checking
 * 處理積木相容性檢查的 Web Worker，避免阻塞主線程
 */

// 積木類別枚舉
const BlockCategory = {
  EVENT: 'event',
  REPLY: 'reply',
  CONTROL: 'control',
  SETTING: 'setting',
  FLEX_CONTAINER: 'flex-container',
  FLEX_CONTENT: 'flex-content',
  FLEX_LAYOUT: 'flex-layout'
};

// 工作區上下文枚舉
const WorkspaceContext = {
  LOGIC: 'logic',
  FLEX: 'flex'
};

// 積木相容性規則（簡化版本）
const BLOCK_COMPATIBILITY_RULES = [
  {
    category: BlockCategory.EVENT,
    allowedIn: [WorkspaceContext.LOGIC],
    restrictions: {
      maxCount: 1
    }
  },
  {
    category: BlockCategory.REPLY,
    allowedIn: [WorkspaceContext.LOGIC],
    restrictions: {}
  },
  {
    category: BlockCategory.CONTROL,
    allowedIn: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
    restrictions: {}
  },
  {
    category: BlockCategory.SETTING,
    allowedIn: [WorkspaceContext.LOGIC],
    restrictions: {}
  },
  {
    category: BlockCategory.FLEX_CONTAINER,
    allowedIn: [WorkspaceContext.FLEX, WorkspaceContext.LOGIC],
    restrictions: {}
  },
  {
    category: BlockCategory.FLEX_CONTENT,
    allowedIn: [WorkspaceContext.FLEX],
    restrictions: {
      requiresParent: [BlockCategory.FLEX_CONTAINER]
    }
  },
  {
    category: BlockCategory.FLEX_LAYOUT,
    allowedIn: [WorkspaceContext.FLEX],
    restrictions: {}
  }
];

// 積木遷移規則（簡化版本）
const BLOCK_MIGRATION_RULES = [
  { oldBlockType: 'message', newCategory: BlockCategory.EVENT },
  { oldBlockType: 'postback', newCategory: BlockCategory.EVENT },
  { oldBlockType: 'follow', newCategory: BlockCategory.EVENT },
  { oldBlockType: 'image_event', newCategory: BlockCategory.EVENT },
  { oldBlockType: 'text', newCategory: BlockCategory.REPLY },
  { oldBlockType: 'image', newCategory: BlockCategory.REPLY },
  { oldBlockType: 'sticker', newCategory: BlockCategory.REPLY },
  { oldBlockType: 'flex', newCategory: BlockCategory.REPLY },
  { oldBlockType: 'if_then', newCategory: BlockCategory.CONTROL },
  { oldBlockType: 'loop', newCategory: BlockCategory.CONTROL },
  { oldBlockType: 'wait', newCategory: BlockCategory.CONTROL },
  { oldBlockType: 'set_variable', newCategory: BlockCategory.SETTING },
  { oldBlockType: 'get_variable', newCategory: BlockCategory.SETTING },
  { oldBlockType: 'save_user_data', newCategory: BlockCategory.SETTING },
  { oldBlockType: 'bubble', newCategory: BlockCategory.FLEX_CONTAINER },
  { oldBlockType: 'carousel', newCategory: BlockCategory.FLEX_CONTAINER },
  { oldBlockType: 'box', newCategory: BlockCategory.FLEX_CONTAINER },
  { oldBlockType: 'text_content', newCategory: BlockCategory.FLEX_CONTENT },
  { oldBlockType: 'image_content', newCategory: BlockCategory.FLEX_CONTENT },
  { oldBlockType: 'button_content', newCategory: BlockCategory.FLEX_CONTENT },
  { oldBlockType: 'separator', newCategory: BlockCategory.FLEX_LAYOUT },
  { oldBlockType: 'spacer', newCategory: BlockCategory.FLEX_LAYOUT },
  { oldBlockType: 'filler', newCategory: BlockCategory.FLEX_LAYOUT }
];

/**
 * 根據舊的 blockType 獲取對應的類別
 */
function getCategoryFromBlockType(blockType) {
  const migrationRule = BLOCK_MIGRATION_RULES.find(rule => rule.oldBlockType === blockType);
  return migrationRule?.newCategory || BlockCategory.SETTING;
}

/**
 * 智能推斷積木類別
 */
function inferCategoryFromBlockType(blockType) {
  if (!blockType || typeof blockType !== 'string') {
    return null;
  }
  
  const lowerType = blockType.toLowerCase();
  
  if (lowerType.includes('event') || lowerType.includes('trigger')) {
    return BlockCategory.EVENT;
  }
  
  if (lowerType.includes('reply') || lowerType.includes('message') || lowerType.includes('send')) {
    return BlockCategory.REPLY;
  }
  
  if (lowerType.includes('control') || lowerType.includes('if') || lowerType.includes('loop')) {
    return BlockCategory.CONTROL;
  }
  
  if (lowerType.includes('flex-container') || lowerType.includes('bubble') || lowerType.includes('carousel')) {
    return BlockCategory.FLEX_CONTAINER;
  }
  
  if (lowerType.includes('flex-content') || lowerType.includes('text') || lowerType.includes('image')) {
    return BlockCategory.FLEX_CONTENT;
  }
  
  if (lowerType.includes('flex-layout') || lowerType.includes('separator') || lowerType.includes('spacer')) {
    return BlockCategory.FLEX_LAYOUT;
  }
  
  if (lowerType.includes('setting') || lowerType.includes('config')) {
    return BlockCategory.SETTING;
  }
  
  return null;
}

/**
 * 檢查積木相容性（Worker 版本）
 */
function checkBlockCompatibility(block, context, existingBlocks = []) {
  // 驗證上下文
  if (!context || !Object.values(WorkspaceContext).includes(context)) {
    return {
      isValid: false,
      reason: '工作區上下文無效',
      suggestions: ['請重新整理頁面或檢查系統狀態']
    };
  }

  // 獲取積木類別
  const category = 'category' in block ? block.category : getCategoryFromBlockType(block.blockType);
  const blockType = 'blockType' in block ? block.blockType : 'unknown';
  
  // 查找相容性規則
  const rule = BLOCK_COMPATIBILITY_RULES.find(r => r.category === category);
  
  if (!rule) {
    // 嘗試智能推斷
    const inferredCategory = inferCategoryFromBlockType(blockType);
    if (inferredCategory && Object.values(BlockCategory).includes(inferredCategory)) {
      return {
        isValid: true,
        reason: `積木類別 ${inferredCategory} 使用智能推斷規則`,
        suggestions: ['如果積木無法正常工作，請檢查積木配置']
      };
    }
    
    return {
      isValid: false,
      reason: `無法識別的積木類別: ${category}`,
      suggestions: ['檢查積木定義是否正確', '嘗試重新整理頁面']
    };
  }
  
  // 檢查基本相容性
  if (!rule.allowedIn.includes(context)) {
    // Flex 設計器寬鬆政策
    if (context === WorkspaceContext.FLEX) {
      if ([BlockCategory.FLEX_CONTAINER, BlockCategory.FLEX_CONTENT, 
           BlockCategory.FLEX_LAYOUT, BlockCategory.CONTROL].includes(category)) {
        return {
          isValid: true,
          reason: `Flex 設計器支援 ${category} 積木（寬鬆政策）`,
          suggestions: ['Flex 設計器支援多種積木類型來創建豐富的介面']
        };
      }
    }
    
    // 邏輯編輯器寬鬆政策
    if (context === WorkspaceContext.LOGIC && category === BlockCategory.FLEX_CONTAINER) {
      return {
        isValid: true,
        reason: '邏輯編輯器支援 Flex 容器積木用於豐富回覆',
        suggestions: ['Flex 容器積木可以用來創建豐富的回覆訊息']
      };
    }
    
    return {
      isValid: false,
      reason: `${category} 積木不適合在 ${context} 上下文中使用`,
      suggestions: [
        `此積木主要設計用於 ${rule.allowedIn.join(', ')} 上下文`,
        context === WorkspaceContext.LOGIC ? '嘗試切換到 Flex 設計器標籤' : '嘗試切換到邏輯編輯器標籤'
      ]
    };
  }
  
  // 檢查數量限制
  if (rule.restrictions?.maxCount !== undefined) {
    const existingCount = existingBlocks.filter(b => {
      const blockCategory = 'category' in b ? b.category : getCategoryFromBlockType(b.blockType);
      return blockCategory === category;
    }).length;
    
    if (existingCount >= rule.restrictions.maxCount) {
      return {
        isValid: false,
        reason: `${category} 積木數量已達上限 (${rule.restrictions.maxCount})`,
        suggestions: ['請移除現有的同類積木再添加新的']
      };
    }
  }
  
  // 檢查父積木依賴
  if (rule.restrictions?.requiresParent) {
    const hasValidParent = existingBlocks.some(existingBlock => {
      const blockCategory = 'category' in existingBlock ? 
        existingBlock.category : getCategoryFromBlockType(existingBlock.blockType);
      return rule.restrictions.requiresParent.includes(blockCategory);
    });
    
    if (!hasValidParent) {
      // Flex 設計器放寬要求
      if (context === WorkspaceContext.FLEX) {
        return {
          isValid: true,
          reason: `${category} 積木在 Flex 設計器中可獨立使用`,
          suggestions: [
            'Flex 設計器允許更靈活的積木組合',
            `完整結構中建議包含 ${rule.restrictions.requiresParent.join(' 或 ')} 積木`
          ]
        };
      }
      
      // 邏輯編輯器提供友善建議
      return {
        isValid: true,
        reason: `${category} 積木已放置，建議添加相關的父積木以確保完整功能`,
        suggestions: [
          `建議添加 ${rule.restrictions.requiresParent.join(' 或 ')} 積木來提供完整的功能`,
          '您可以稍後重新組織積木順序'
        ]
      };
    }
  }
  
  return {
    isValid: true,
    reason: `${category} 積木可以在 ${context} 上下文中使用`
  };
}

// Worker 消息處理
self.onmessage = function(e) {
  const { id, type, data } = e.data;
  
  try {
    switch (type) {
      case 'CHECK_COMPATIBILITY':
        const { block, context, existingBlocks } = data;
        const result = checkBlockCompatibility(block, context, existingBlocks);
        
        self.postMessage({
          id,
          type: 'COMPATIBILITY_RESULT',
          data: result
        });
        break;
        
      case 'BATCH_CHECK':
        const { blocks, context: batchContext, existingBlocks: batchExisting } = data;
        const results = blocks.map(block => 
          checkBlockCompatibility(block, batchContext, batchExisting)
        );
        
        self.postMessage({
          id,
          type: 'BATCH_RESULT',
          data: results
        });
        break;
        
      default:
        self.postMessage({
          id,
          type: 'ERROR',
          data: { error: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      data: { error: error.message }
    });
  }
};