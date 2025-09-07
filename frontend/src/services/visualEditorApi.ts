/**
 * 視覺化編輯器 API 服務
 * 處理與後端的 Bot 選擇和儲存相關 API 通信
 * 集成 LocalStorage 快取機制以提升性能
 */

import { UnifiedApiClient } from './UnifiedApiClient';
import { UnifiedBlock } from '../types/block';
import { API_CONFIG } from '../config/apiConfig';
import LocalStorageCacheService from './LocalStorageCacheService';
import { CACHE_KEYS, CACHE_EXPIRY } from '../config/cacheConfig';

// 介面定義
export interface BotSummary {
  id: string;
  name: string;
  created_at: string;
}

export interface VisualEditorData {
  bot_id: string;
  logic_blocks: UnifiedBlock[];
  flex_blocks: UnifiedBlock[];
  generated_code?: string;
}

export interface VisualEditorResponse {
  bot_id: string;
  logic_blocks: UnifiedBlock[];
  flex_blocks: UnifiedBlock[];
  generated_code?: string;
  created_at: string;
  updated_at: string;
}

// 邏輯模板相關介面
export interface LogicTemplate {
  id: string;
  name: string;
  description?: string;
  logic_blocks: UnifiedBlock[];
  is_active: string;
  bot_id: string;
  user_id: string;
  generated_code?: string;
  created_at: string;
  updated_at: string;
}

export interface LogicTemplateSummary {
  id: string;
  name: string;
  description?: string;
  is_active: string;
  created_at: string;
}

export interface LogicTemplateCreate {
  bot_id: string;
  name: string;
  description?: string;
  logic_blocks: UnifiedBlock[];
  is_active?: string;
}

export interface LogicTemplateUpdate {
  name?: string;
  description?: string;
  logic_blocks?: UnifiedBlock[];
  is_active?: string;
  generated_code?: string;
}

// FLEX訊息相關介面
export interface FlexMessage {
  id: string;
  name: string;
  content: Record<string, unknown>;
  design_blocks?: unknown; // 新增：編輯器 blocks（可選）
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FlexMessageSummary {
  id: string;
  name: string;
  created_at: string;
}

export interface FlexMessageCreate {
  name: string;
  content: Record<string, unknown>;
  // 編輯器原始 blocks，與 content 併行保存（後端支援）
  design_blocks?: unknown;
}

export interface FlexMessageUpdate {
  name?: string;
  content?: Record<string, unknown>;
  // 編輯器原始 blocks，與 content 併行保存（後端支援）
  design_blocks?: unknown;
}

export class VisualEditorApi {
  private static apiClient = UnifiedApiClient.getInstance();
  private static cacheService = LocalStorageCacheService;

  /**
   * 取得用戶的 Bot 摘要列表（用於下拉選單）
   * 整合快取機制避免重複請求
   */
  static async getUserBotsSummary(useCache: boolean = true): Promise<BotSummary[]> {
    // 嘗試從快取獲取數據
    if (useCache) {
      const cachedData = await this.cacheService.get<BotSummary[]>(CACHE_KEYS.USER_BOTS_SUMMARY);
      if (cachedData) {
        console.debug('Bot 摘要列表：快取命中');
        return cachedData;
      }
    }

    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/visual-editor/summary`;
      const response = await this.apiClient.get<BotSummary[]>(endpoint);

      // 檢查回應狀態
      if (response.status === 404) {
        console.warn('Bot 摘要 API 端點不存在，可能後端尚未啟動');
        return [];
      }

      if (!response.success || response.status >= 400) {
        throw new Error(response.error || `API 錯誤 (${response.status})`);
      }

      const data = response.data || [];
      
      // 儲存到快取
      if (useCache && data.length > 0) {
        await this.cacheService.set(CACHE_KEYS.USER_BOTS_SUMMARY, data, CACHE_EXPIRY.LIST_DATA);
      }

      return data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      // 如果是網路錯誤或 404，返回空陣列而不是拋出錯誤
      if (_error instanceof Error && (_error.message.includes('404') || _error.message.includes('網路'))) {
        return [];
      }
      throw new Error('取得 Bot 列表失敗，請稍後再試');
    }
  }

  /**
   * 儲存視覺化編輯器數據到指定的 Bot
   */
  static async saveVisualEditorData(
    botId: string, 
    data: Omit<VisualEditorData, 'bot_id'>
  ): Promise<VisualEditorResponse> {
    try {
      const payload: VisualEditorData = {
        bot_id: botId,
        ...data
      };

      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/visual-editor/save`;
      const response = await this.apiClient.post<VisualEditorResponse>(
        endpoint,
        payload
      );

      if (!response.success) {
        throw new Error(response.error || '儲存失敗');
      }

      if (!response.data) {
        throw new Error('儲存回應格式錯誤');
      }

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('儲存失敗，請稍後再試');
    }
  }

  /**
   * 載入指定 Bot 的視覺化編輯器數據
   */
  static async loadVisualEditorData(botId: string): Promise<VisualEditorResponse> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/visual-editor`;
      const response = await this.apiClient.get<VisualEditorResponse>(
        endpoint
      );

      if (!response.success) {
        throw new Error(response.error || '載入失敗');
      }

      if (!response.data) {
        throw new Error('載入回應格式錯誤');
      }

      // 後端已修復雙重序列化問題，直接使用積木數據

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('載入失敗，請稍後再試');
    }
  }

  /**
   * 檢查 Bot 是否存在視覺化編輯器數據
   */
  static async hasVisualEditorData(botId: string): Promise<boolean> {
    try {
      const data = await this.loadVisualEditorData(botId);
      return !!(data.logic_blocks?.length || data.flex_blocks?.length);
    } catch (_error) {
      // 如果載入失敗，假設沒有數據
      return false;
    }
  }

  /**
   * 驗證 Bot ID 格式
   */
  static isValidBotId(botId: string): boolean {
    // UUID v4 格式驗證
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(botId);
  }

  // ===== 邏輯模板相關方法 =====

  /**
   * 取得Bot的所有邏輯模板
   */
  static async getBotLogicTemplates(botId: string): Promise<LogicTemplate[]> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/logic-templates`;
      const response = await this.apiClient.get<LogicTemplate[]>(endpoint);

      if (!response.success || response.status >= 400) {
        throw new Error(response.error || `API 錯誤 (${response.status})`);
      }

      return response.data || [];
    } catch (_error) {
      console.error("Error occurred:", _error);
      throw new Error('取得邏輯模板列表失敗，請稍後再試');
    }
  }

  /**
   * 取得Bot邏輯模板摘要列表（用於下拉選單）
   * 整合快取機制避免重複請求
   */
  static async getBotLogicTemplatesSummary(botId: string, useCache: boolean = true): Promise<LogicTemplateSummary[]> {
    const cacheKey = `${CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY}_${botId}`;
    
    // 嘗試從快取獲取數據
    if (useCache) {
      const cachedData = await this.cacheService.get<LogicTemplateSummary[]>(cacheKey);
      if (cachedData) {
        console.debug(`Bot ${botId} 邏輯模板摘要列表：快取命中`);
        return cachedData;
      }
    }

    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/logic-templates/summary`;
      const response = await this.apiClient.get<LogicTemplateSummary[]>(endpoint);

      if (!response.success || response.status >= 400) {
        throw new Error(response.error || `API 錯誤 (${response.status})`);
      }

      const data = response.data || [];
      
      // 儲存到快取
      if (useCache && data.length > 0) {
        await this.cacheService.set(cacheKey, data, CACHE_EXPIRY.LIST_DATA);
      }

      return data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error && _error.message.includes('404')) {
        return [];
      }
      throw new Error('取得邏輯模板摘要列表失敗，請稍後再試');
    }
  }

  /**
   * 創建邏輯模板
   */
  static async createLogicTemplate(botId: string, data: Omit<LogicTemplateCreate, 'bot_id'>): Promise<LogicTemplate> {
    try {
      const payload: LogicTemplateCreate = {
        bot_id: botId,
        ...data
      };

      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/logic-templates`;
      const response = await this.apiClient.post<LogicTemplate>(endpoint, payload);

      if (!response.success) {
        throw new Error(response.error || '創建邏輯模板失敗');
      }

      if (!response.data) {
        throw new Error('創建邏輯模板回應格式錯誤');
      }

      // 創建後清除相關快取
      this.cacheService.invalidateCache('CREATE', 'logic_template');
      // 也清除該 Bot 的模板摘要列表快取
      this.cacheService.remove(`${CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY}_${botId}`);

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('創建邏輯模板失敗，請稍後再試');
    }
  }

  /**
   * 取得特定邏輯模板
   * 整合快取機制避免重複請求
   */
  static async getLogicTemplate(templateId: string, useCache: boolean = true): Promise<LogicTemplate> {
    const cacheKey = `${CACHE_KEYS.LOGIC_TEMPLATE}_${templateId}`;
    
    // 嘗試從快取獲取數據
    if (useCache) {
      const cachedData = await this.cacheService.get<LogicTemplate>(cacheKey);
      if (cachedData) {
        console.debug(`邏輯模板 ${templateId}：快取命中`);
        return cachedData;
      }
    }

    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/logic-templates/${templateId}`;
      console.log(`🌐 ${useCache ? '使用快取' : '強制重新載入'} 邏輯模板:`, templateId);
      
      const response = await this.apiClient.get<LogicTemplate>(endpoint);

      if (!response.success) {
        throw new Error(response.error || '取得邏輯模板失敗');
      }

      if (!response.data) {
        throw new Error('邏輯模板不存在');
      }

      // 後端已修復雙重序列化問題，直接使用邏輯積木數據
      const blockCount = response.data.logic_blocks ? response.data.logic_blocks.length : 0;
      console.log(`📦 API 回傳邏輯模板 "${response.data.name}" - 積木數量: ${blockCount}`);

      // 儲存到快取
      if (useCache) {
        await this.cacheService.set(cacheKey, response.data, CACHE_EXPIRY.INDIVIDUAL_DATA);
      }

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('取得邏輯模板失敗，請稍後再試');
    }
  }

  /**
   * 更新邏輯模板
   */
  static async updateLogicTemplate(templateId: string, data: LogicTemplateUpdate): Promise<LogicTemplate> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/logic-templates/${templateId}`;
      const response = await this.apiClient.put<LogicTemplate>(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || '更新邏輯模板失敗');
      }

      if (!response.data) {
        throw new Error('更新邏輯模板回應格式錯誤');
      }

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('更新邏輯模板失敗，請稍後再試');
    }
  }

  /**
   * 刪除邏輯模板
   */
  static async deleteLogicTemplate(templateId: string): Promise<void> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/logic-templates/${templateId}`;
      const response = await this.apiClient.delete(endpoint);

      if (!response.success) {
        throw new Error(response.error || '刪除邏輯模板失敗');
      }
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('刪除邏輯模板失敗，請稍後再試');
    }
  }

  /**
   * 激活邏輯模板
   */
  static async activateLogicTemplate(templateId: string): Promise<void> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/logic-templates/${templateId}/activate`;
      const response = await this.apiClient.post(endpoint, {});

      if (!response.success) {
        throw new Error(response.error || '激活邏輯模板失敗');
      }
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('激活邏輯模板失敗，請稍後再試');
    }
  }

  // ===== FLEX訊息相關方法 =====

  /**
   * 取得用戶的所有FLEX訊息
   * 整合快取機制避免重複請求
   */
  static async getUserFlexMessages(useCache: boolean = true): Promise<FlexMessage[]> {
    console.log(`🌐 ${useCache ? '使用快取' : '強制重新載入'} FlexMessage 列表`);
    
    // 嘗試從快取獲取數據
    if (useCache) {
      const cachedData = await this.cacheService.get<FlexMessage[]>(CACHE_KEYS.FLEX_MESSAGES);
      if (cachedData) {
        console.debug('FLEX訊息列表：快取命中');
        return cachedData;
      }
    }

    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/messages`;
      
      // 確保使用認證的 API 呼叫
      const response = await this.apiClient.get<FlexMessage[]>(endpoint, false); // skipAuth = false

      if (!response.success || response.status >= 400) {
        const errorMsg = response.error || `API 錯誤 (${response.status})`;
        console.error('API 錯誤詳情:', { status: response.status, error: response.error, endpoint });
        throw new Error(errorMsg);
      }

      const data = response.data || [];
      console.log(`📦 API 回傳 ${data.length} 個 FlexMessage`);
      
      // 儲存到快取
      if (useCache && data.length > 0) {
        await this.cacheService.set(CACHE_KEYS.FLEX_MESSAGES, data, CACHE_EXPIRY.INDIVIDUAL_DATA);
      }

      return data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      
      // 提供更詳細的錯誤資訊
      if (_error instanceof Error) {
        if (_error.message.includes('400')) {
          throw new Error('請求格式錯誤，請檢查認證狀態或重新登入');
        } else if (_error.message.includes('401')) {
          throw new Error('認證失敗，請重新登入');
        } else if (_error.message.includes('403')) {
          throw new Error('權限不足，無法存取此資源');
        }
      }
      
      throw new Error('取得FLEX訊息列表失敗，請稍後再試');
    }
  }

  /**
   * 取得用戶FLEX訊息摘要列表（用於下拉選單）
   * 整合快取機制避免重複請求
   */
  static async getUserFlexMessagesSummary(useCache: boolean = true): Promise<FlexMessageSummary[]> {
    // 嘗試從快取獲取數據
    if (useCache) {
      const cachedData = await this.cacheService.get<FlexMessageSummary[]>(CACHE_KEYS.FLEX_MESSAGES_SUMMARY);
      if (cachedData) {
        console.debug('FLEX訊息摘要列表：快取命中');
        return cachedData;
      }
    }

    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/messages/summary`;
      const response = await this.apiClient.get<FlexMessageSummary[]>(endpoint);

      if (!response.success || response.status >= 400) {
        throw new Error(response.error || `API 錯誤 (${response.status})`);
      }

      const data = response.data || [];
      
      // 儲存到快取
      if (useCache && data.length > 0) {
        await this.cacheService.set(CACHE_KEYS.FLEX_MESSAGES_SUMMARY, data, CACHE_EXPIRY.LIST_DATA);
      }

      return data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error && _error.message.includes('404')) {
        return [];
      }
      throw new Error('取得FLEX訊息摘要列表失敗，請稍後再試');
    }
  }

  /**
   * 創建FLEX訊息
   */
  static async createFlexMessage(data: FlexMessageCreate): Promise<FlexMessage> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/messages`;
      const response = await this.apiClient.post<FlexMessage>(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || '創建FLEX訊息失敗');
      }

      if (!response.data) {
        throw new Error('創建FLEX訊息回應格式錯誤');
      }

      // 創建後清除相關快取
      this.cacheService.invalidateCache('CREATE', 'flex_message');

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('創建FLEX訊息失敗，請稍後再試');
    }
  }

  /**
   * 更新FLEX訊息
   */
  static async updateFlexMessage(messageId: string, data: FlexMessageUpdate): Promise<FlexMessage> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/messages/${messageId}`;
      const response = await this.apiClient.put<FlexMessage>(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || '更新FLEX訊息失敗');
      }

      if (!response.data) {
        throw new Error('更新FLEX訊息回應格式錯誤');
      }

      return response.data;
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('更新FLEX訊息失敗，請稍後再試');
    }
  }

  /**
   * 刪除FLEX訊息
   */
  static async deleteFlexMessage(messageId: string): Promise<void> {
    try {
      const endpoint = `${API_CONFIG.UNIFIED.BASE_URL}/bots/messages/${messageId}`;
      const response = await this.apiClient.delete(endpoint);

      if (!response.success) {
        throw new Error(response.error || '刪除FLEX訊息失敗');
      }
    } catch (_error) {
      console.error("Error occurred:", _error);
      if (_error instanceof Error) {
        throw _error;
      }
      throw new Error('刪除FLEX訊息失敗，請稍後再試');
    }
  }

  // ===== 快取管理工具方法 =====

  /**
   * 清除所有快取
   */
  static clearAllCache(): boolean {
    return this.cacheService.clear();
  }

  /**
   * 清除特定 Bot 相關的快取
   */
  static clearBotCache(botId: string): void {
    this.cacheService.remove(`${CACHE_KEYS.LOGIC_TEMPLATES_SUMMARY}_${botId}`);
    // 清除該 Bot 的所有邏輯模板快取
    this.cacheService.getStats();
    Object.keys(localStorage).forEach(key => {
      if (key.includes(`${CACHE_KEYS.LOGIC_TEMPLATE}_`) || key.includes(botId)) {
        this.cacheService.remove(key.replace('visual_editor_cache_', ''));
      }
    });
  }

  /**
   * 獲取快取統計資訊
   */
  static getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * 手動刷新所有列表數據（不使用快取）
   */
  static async refreshAllData() {
    const promises = [
      this.getUserBotsSummary(false),
      this.getUserFlexMessagesSummary(false),
      this.getUserFlexMessages(false)
    ];
    
    try {
      await Promise.all(promises);
      console.log('所有數據已刷新');
    } catch (error) {
      console.error('數據刷新失敗:', error);
      throw error;
    }
  }
}

export default VisualEditorApi;
