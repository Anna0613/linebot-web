import { UnifiedApiClient } from '@/services/UnifiedApiClient';
import { API_CONFIG } from '@/config/apiConfig';

export type Scope = 'project' | 'global';

export interface AIToggle {
  bot_id: string;
  ai_takeover_enabled: boolean;
  provider?: string;
  model?: string;
  history_messages?: number;
  system_prompt?: string;
}

export interface KnowledgeChunkItem {
  id: string;
  document_id: string;
  bot_id?: string | null;
  source_type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocumentItem {
  id: string;
  bot_id?: string | null;
  source_type: string;  // text | file | bulk
  title?: string | null;
  original_file_name?: string | null;
  ai_summary?: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocumentList {
  items: KnowledgeDocumentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface KnowledgeSearchItem {
  id: string;
  document_id: string;
  bot_id?: string | null;
  content: string;
  score: number;
}

export class AIKnowledgeApi {
  private static api = UnifiedApiClient.getInstance();

  static async getAIToggle(botId: string) {
    const res = await this.api.get<AIToggle>(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/ai/settings`);
    if (!res.success) throw new Error(res.error || '取得 AI 設定失敗');
    return res.data as AIToggle;
  }

  static async setAIToggle(botId: string, enabled: boolean, provider?: string, model?: string) {
    const res = await this.api.post<AIToggle>(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/ai/settings`, { enabled, provider, model });
    if (!res.success) throw new Error(res.error || '更新 AI 設定失敗');
    return res.data as AIToggle;
  }

  static async setAIAdvanced(
    botId: string,
    params: { history_messages?: number; provider?: string; model?: string; enabled?: boolean; system_prompt?: string }
  ) {
    const res = await this.api.post<AIToggle>(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/ai/settings`, params);
    if (!res.success) throw new Error(res.error || '更新 AI 設定失敗');
    return res.data as AIToggle;
  }

  static async addText(botId: string, scope: Scope, content: string, autoChunk = false, chunkSize = 800, overlap = 80) {
    const res = await this.api.post<KnowledgeChunkItem>(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/text`, {
      scope, content, auto_chunk: autoChunk, chunk_size: chunkSize, overlap,
    });
    if (!res.success) throw new Error(res.error || '新增文字知識失敗');
    return res.data as KnowledgeChunkItem;
  }

  static async search(botId: string, q: string) {
    const params = new URLSearchParams({ q });
    const res = await this.api.get<{ items: KnowledgeSearchItem[] }>(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/search?${params.toString()}`);
    if (!res.success) throw new Error(res.error || '搜尋失敗');
    return res.data?.items || [];
  }

  // ========== 文件列表 API（新增）==========

  static async listDocuments(botId: string, scope: Scope = 'project', q = '', page = 1, pageSize = 20) {
    const params = new URLSearchParams({ scope, page: String(page), page_size: String(pageSize) });
    if (q) params.append('q', q);
    const res = await this.api.get<KnowledgeDocumentList>(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/documents?${params.toString()}`);
    if (!res.success) throw new Error(res.error || '取得文件列表失敗');
    return res.data as KnowledgeDocumentList;
  }

  static async batchDeleteDocuments(botId: string, documentIds: string[]) {
    const res = await this.api.post(`${API_CONFIG.UNIFIED.BASE_URL}/bots/${botId}/knowledge/documents/batch-delete`, { document_ids: documentIds });
    if (!res.success) throw new Error(res.error || '批次刪除文件失敗');
  }
}

export default AIKnowledgeApi;
