/**
 * 統一積木類型系統
 * 支援邏輯積木和 Flex 積木的互操作性
 */

// 積木類別枚舉
export enum BlockCategory {
  EVENT = 'event',           // 事件積木
  REPLY = 'reply',          // 回覆積木
  CONTROL = 'control',      // 控制積木
  SETTING = 'setting',      // 設定積木
  FLEX_CONTAINER = 'flex-container', // Flex 容器積木
  FLEX_CONTENT = 'flex-content',     // Flex 內容積木
  FLEX_LAYOUT = 'flex-layout'        // Flex 佈局積木
}

// 積木相容性上下文
export enum WorkspaceContext {
  LOGIC = 'logic',          // 邏輯編輯器上下文
  FLEX = 'flex'             // Flex 設計器上下文
}

// 基礎積木數據介面
export interface BlockData {
  [key: string]: unknown;
}

// 統一積木介面
export interface UnifiedBlock {
  id: string;                           // 唯一識別符
  blockType: string;                    // 積木類型（保持向後相容）
  category: BlockCategory;              // 積木類別
  blockData: BlockData;                 // 積木數據
  compatibility: WorkspaceContext[];    // 相容的工作區上下文
  parentId?: string;                    // 父積木 ID（用於嵌套）
  children?: string[];                  // 子積木 ID 列表
  position?: { x: number; y: number };  // 積木位置
  isNested?: boolean;                   // 是否為嵌套積木
}

// 積木相容性規則
export interface CompatibilityRule {
  category: BlockCategory;
  allowedIn: WorkspaceContext[];
  dependencies?: BlockCategory[];       // 依賴的積木類別
  restrictions?: {
    maxCount?: number;                  // 最大數量限制
    requiresParent?: BlockCategory[];   // 需要特定父積木
    forbiddenWith?: BlockCategory[];    // 不能與某些積木共存
  };
}

// 預定義的積木相容性規則
export const BLOCK_COMPATIBILITY_RULES: CompatibilityRule[] = [
  // 事件積木：僅在邏輯編輯器中使用
  {
    category: BlockCategory.EVENT,
    allowedIn: [WorkspaceContext.LOGIC]
  },
  
  // 回覆積木：主要在邏輯編輯器中，但可以包含 Flex 元素
  {
    category: BlockCategory.REPLY,
    allowedIn: [WorkspaceContext.LOGIC],
    dependencies: [BlockCategory.FLEX_CONTAINER] // 可以依賴 Flex 容器
  },
  
  // 控制積木：兩個上下文都可以使用
  {
    category: BlockCategory.CONTROL,
    allowedIn: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX]
  },
  
  // 設定積木：僅在邏輯編輯器中使用
  {
    category: BlockCategory.SETTING,
    allowedIn: [WorkspaceContext.LOGIC]
  },
  
  // Flex 容器積木：兩個上下文都可以使用
  {
    category: BlockCategory.FLEX_CONTAINER,
    allowedIn: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX]
  },
  
  // Flex 內容積木：兩個上下文都可以使用，但在邏輯上下文中需要容器
  {
    category: BlockCategory.FLEX_CONTENT,
    allowedIn: [WorkspaceContext.LOGIC, WorkspaceContext.FLEX],
    restrictions: {
      requiresParent: [BlockCategory.FLEX_CONTAINER, BlockCategory.REPLY]
    }
  },
  
  // Flex 佈局積木：主要在 Flex 設計器中，但可以在邏輯編輯器的 Flex 相關積木中使用
  {
    category: BlockCategory.FLEX_LAYOUT,
    allowedIn: [WorkspaceContext.FLEX, WorkspaceContext.LOGIC],
    restrictions: {
      requiresParent: [BlockCategory.FLEX_CONTAINER]
    }
  }
];

// 拖拽項目介面（擴展現有的 DropItem）
export interface UnifiedDropItem {
  blockType: string;
  category: BlockCategory;
  blockData: BlockData;
  compatibility: WorkspaceContext[];
}

// 積木驗證結果
export interface BlockValidationResult {
  isValid: boolean;
  reason?: string;
  suggestions?: string[];
}

// 積木轉換規則（用於從舊格式轉換到新格式）
export interface BlockMigrationRule {
  oldBlockType: string;
  newCategory: BlockCategory;
  dataTransform?: (oldData: BlockData) => BlockData;
}

// 預定義的積木遷移規則
export const BLOCK_MIGRATION_RULES: BlockMigrationRule[] = [
  // 事件積木遷移
  {
    oldBlockType: 'event',
    newCategory: BlockCategory.EVENT
  },
  {
    oldBlockType: 'message_event',
    newCategory: BlockCategory.EVENT
  },
  {
    oldBlockType: 'postback_event',
    newCategory: BlockCategory.EVENT
  },
  
  // 回覆積木遷移
  {
    oldBlockType: 'reply',
    newCategory: BlockCategory.REPLY
  },
  {
    oldBlockType: 'text_reply',
    newCategory: BlockCategory.REPLY
  },
  {
    oldBlockType: 'flex_reply',
    newCategory: BlockCategory.REPLY
  },
  {
    oldBlockType: 'image_reply',
    newCategory: BlockCategory.REPLY
  },
  
  // 控制積木遷移
  {
    oldBlockType: 'control',
    newCategory: BlockCategory.CONTROL
  },
  {
    oldBlockType: 'condition',
    newCategory: BlockCategory.CONTROL
  },
  {
    oldBlockType: 'loop',
    newCategory: BlockCategory.CONTROL
  },
  {
    oldBlockType: 'if',
    newCategory: BlockCategory.CONTROL
  },
  
  // 設定積木遷移
  {
    oldBlockType: 'setting',
    newCategory: BlockCategory.SETTING
  },
  {
    oldBlockType: 'config',
    newCategory: BlockCategory.SETTING
  },
  {
    oldBlockType: 'webhook_setting',
    newCategory: BlockCategory.SETTING
  },
  
  // Flex 容器積木遷移
  {
    oldBlockType: 'flex-container',
    newCategory: BlockCategory.FLEX_CONTAINER
  },
  {
    oldBlockType: 'bubble',
    newCategory: BlockCategory.FLEX_CONTAINER
  },
  {
    oldBlockType: 'carousel',
    newCategory: BlockCategory.FLEX_CONTAINER
  },
  {
    oldBlockType: 'flex_bubble',
    newCategory: BlockCategory.FLEX_CONTAINER
  },
  {
    oldBlockType: 'flex_carousel',
    newCategory: BlockCategory.FLEX_CONTAINER
  },
  
  // Flex 內容積木遷移
  {
    oldBlockType: 'flex-content',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'text',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'image',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'button',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'icon',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'flex_text',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'flex_image',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'flex_button',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  {
    oldBlockType: 'flex_icon',
    newCategory: BlockCategory.FLEX_CONTENT
  },
  
  // Flex 佈局積木遷移
  {
    oldBlockType: 'flex-layout',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'box',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'separator',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'spacer',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'filler',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'flex_box',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'flex_separator',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'flex_spacer',
    newCategory: BlockCategory.FLEX_LAYOUT
  },
  {
    oldBlockType: 'flex_filler',
    newCategory: BlockCategory.FLEX_LAYOUT
  }
];