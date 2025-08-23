/**
 * 快取配置檔案
 * 定義各種數據的快取策略和安全設定
 */

// 快取金鑰前綴
export const CACHE_KEYS = {
  USER_BOTS_SUMMARY: 'user_bots_summary',
  LOGIC_TEMPLATES_SUMMARY: 'logic_templates_summary',
  FLEX_MESSAGES_SUMMARY: 'flex_messages_summary',
  LOGIC_TEMPLATE: 'logic_template',
  FLEX_MESSAGES: 'flex_messages',
  USER_INFO: 'user_info'
} as const;

// 快取過期時間 (毫秒)
export const CACHE_EXPIRY = {
  // 列表數據 - 較長快取時間 (30分鐘)
  LIST_DATA: 30 * 60 * 1000,
  
  // 個別數據 - 較短快取時間 (15分鐘)
  INDIVIDUAL_DATA: 15 * 60 * 1000,
  
  // 用戶資訊 - 中等快取時間 (20分鐘)
  USER_DATA: 20 * 60 * 1000,
  
  // 預設快取時間 (10分鐘)
  DEFAULT: 10 * 60 * 1000
} as const;

// 安全配置
export const CACHE_SECURITY = {
  // HMAC 密鑰 (在實際應用中應該從環境變數獲取)
  HMAC_SECRET: 'visual-editor-cache-secret-2024',
  
  // 允許的數據類型
  ALLOWED_TYPES: ['object', 'string', 'number', 'boolean'],
  
  // 最大快取大小 (5MB)
  MAX_CACHE_SIZE: 5 * 1024 * 1024,
  
  // 單個項目最大大小 (1MB)
  MAX_ITEM_SIZE: 1024 * 1024
} as const;

// 快取策略配置
export const CACHE_STRATEGIES = {
  [CACHE_KEYS.USER_BOTS_SUMMARY]: {
    expiry: CACHE_EXPIRY.LIST_DATA,
    autoRefresh: false,
    clearOnLogout: true
  },
  
  [CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY]: {
    expiry: CACHE_EXPIRY.LIST_DATA,
    autoRefresh: false,
    clearOnLogout: true
  },
  
  [CACHE_KEYS.FLEX_MESSAGES_SUMMARY]: {
    expiry: CACHE_EXPIRY.LIST_DATA,
    autoRefresh: false,
    clearOnLogout: true
  },
  
  [CACHE_KEYS.LOGIC_TEMPLATE]: {
    expiry: CACHE_EXPIRY.INDIVIDUAL_DATA,
    autoRefresh: false,
    clearOnLogout: true
  },
  
  [CACHE_KEYS.FLEX_MESSAGES]: {
    expiry: CACHE_EXPIRY.INDIVIDUAL_DATA,
    autoRefresh: false,
    clearOnLogout: true
  }
} as const;

// 敏感數據欄位 (不會被快取)
export const SENSITIVE_FIELDS = [
  'token',
  'password',
  'secret',
  'key',
  'auth',
  'credential'
];

// 快取失效觸發器
export const CACHE_INVALIDATION_TRIGGERS = {
  // 創建操作後清除的快取
  CREATE: {
    logic_template: [CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY],
    flex_message: [CACHE_KEYS.FLEX_MESSAGES_SUMMARY],
    bot: [CACHE_KEYS.USER_BOTS_SUMMARY]
  },
  
  // 更新操作後清除的快取
  UPDATE: {
    logic_template: [CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY, CACHE_KEYS.LOGIC_TEMPLATE],
    flex_message: [CACHE_KEYS.FLEX_MESSAGES_SUMMARY, CACHE_KEYS.FLEX_MESSAGES],
    bot: [CACHE_KEYS.USER_BOTS_SUMMARY]
  },
  
  // 刪除操作後清除的快取
  DELETE: {
    logic_template: [CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY, CACHE_KEYS.LOGIC_TEMPLATE],
    flex_message: [CACHE_KEYS.FLEX_MESSAGES_SUMMARY, CACHE_KEYS.FLEX_MESSAGES],
    bot: [CACHE_KEYS.USER_BOTS_SUMMARY]
  }
} as const;