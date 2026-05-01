import { UnifiedApiClient } from '@/services/UnifiedApiClient';
import { API_CONFIG, getApiUrl } from '@/config/apiConfig';
import type { CreateRichMenuPayload, UpdateRichMenuPayload, RichMenu } from '../types/richMenu';

export class RichMenuApi {
  private static api = UnifiedApiClient.getInstance();

  private static normalizeImageUrl(imageUrl?: string): string | undefined {
    if (!imageUrl || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    const buildProxyUrl = (objectPath: string) => {
      const params = new URLSearchParams({ object_path: objectPath });
      return `${API_CONFIG.UNIFIED.BASE_URL}/minio/proxy?${params.toString()}`;
    };

    try {
      const parsed = new URL(imageUrl);
      const objectPath = parsed.searchParams.get('object_path');
      if (parsed.pathname.endsWith('/api/v1/minio/proxy') && objectPath) {
        return buildProxyUrl(objectPath);
      }
      return imageUrl;
    } catch {
      if (imageUrl.startsWith('/api/v1/minio/proxy')) {
        const parsed = new URL(imageUrl, API_CONFIG.UNIFIED.FULL_URL);
        const objectPath = parsed.searchParams.get('object_path');
        return objectPath ? buildProxyUrl(objectPath) : imageUrl;
      }

      if (!imageUrl.startsWith('/') && !imageUrl.includes('://')) {
        return buildProxyUrl(imageUrl);
      }

      return imageUrl;
    }
  }

  private static normalizeMenu(menu: RichMenu): RichMenu {
    return {
      ...menu,
      image_url: this.normalizeImageUrl(menu.image_url),
    };
  }

  static async list(botId: string): Promise<RichMenu[]> {
    const url = getApiUrl(API_CONFIG.UNIFIED.BASE_URL, `/bots/${botId}/richmenus`);
    const res = await this.api.get<RichMenu[]>(url);
    // 若後端尚未提供端點或無資料，回傳空陣列，避免以錯誤中斷流程
    if (res.status === 404) return [];
    if (!res.success) throw new Error(res.error || `取得 Rich Menu 失敗 (HTTP ${res.status})`);
    return ((res.data || []) as RichMenu[]).map(menu => this.normalizeMenu(menu));
  }

  static async create(botId: string, payload: CreateRichMenuPayload): Promise<RichMenu> {
    const url = getApiUrl(API_CONFIG.UNIFIED.BASE_URL, `/bots/${botId}/richmenus`);
    const res = await this.api.post<RichMenu>(url, payload);
    if (!res.success || !res.data) throw new Error(res.error || '建立失敗');
    return this.normalizeMenu(res.data as RichMenu);
  }

  static async update(botId: string, menuId: string, payload: UpdateRichMenuPayload): Promise<RichMenu> {
    const url = getApiUrl(API_CONFIG.UNIFIED.BASE_URL, `/bots/${botId}/richmenus/${menuId}`);
    const res = await this.api.put<RichMenu>(url, payload);
    if (!res.success || !res.data) throw new Error(res.error || '更新失敗');
    return this.normalizeMenu(res.data as RichMenu);
  }

  static async remove(botId: string, menuId: string) {
    const url = getApiUrl(API_CONFIG.UNIFIED.BASE_URL, `/bots/${botId}/richmenus/${menuId}`);
    return this.api.delete(url);
  }

  static async uploadImage(botId: string, menuId: string, file: Blob | File): Promise<RichMenu> {
    const url = getApiUrl(API_CONFIG.UNIFIED.BASE_URL, `/bots/${botId}/richmenus/${menuId}/image`);
    const form = new FormData();
    const filename = (file as File).name || 'richmenu.jpg';
    form.append('image', file, filename);
    const res = await this.api.postFormData<RichMenu>(url, form);
    if (!res.success || !res.data) throw new Error(res.error || '上傳圖片失敗');
    return this.normalizeMenu(res.data as RichMenu);
  }

  static async publish(botId: string, menuId: string): Promise<RichMenu> {
    const url = getApiUrl(API_CONFIG.UNIFIED.BASE_URL, `/bots/${botId}/richmenus/${menuId}/publish`);
    const res = await this.api.post<RichMenu>(url, {});
    if (!res.success || !res.data) throw new Error(res.error || '重新發佈失敗');
    return this.normalizeMenu(res.data as RichMenu);
  }
}

export default RichMenuApi;
