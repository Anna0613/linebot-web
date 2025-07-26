/**
 * 視覺化編輯器 API 服務
 * 處理與後端的 Bot 選擇和儲存相關 API 通信
 */

import { UnifiedApiClient } from './UnifiedApiClient';
import { UnifiedBlock } from '../types/block';
import { API_CONFIG } from '../config/apiConfig';

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

export class VisualEditorApi {
  private static apiClient = UnifiedApiClient.getInstance();

  /**
   * 取得用戶的 Bot 摘要列表（用於下拉選單）
   */
  static async getUserBotsSummary(): Promise<BotSummary[]> {
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

      return response.data || [];
    } catch (error) {
      console.error('取得 Bot 摘要列表失敗:', error);
      // 如果是網路錯誤或 404，返回空陣列而不是拋出錯誤
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('網路'))) {
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
    } catch (error) {
      console.error('儲存視覺化編輯器數據失敗:', error);
      if (error instanceof Error) {
        throw error;
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

      return response.data;
    } catch (error) {
      console.error('載入視覺化編輯器數據失敗:', error);
      if (error instanceof Error) {
        throw error;
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
    } catch (error) {
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
}

export default VisualEditorApi;