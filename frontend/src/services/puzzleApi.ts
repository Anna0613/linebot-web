import { UnifiedAuthManager } from "./UnifiedAuthManager";
import { API_CONFIG, getApiUrl } from "../config/apiConfig";

export interface Bot {
  id: string; // UUID as string
  name: string;
  description?: string;
  channel_token: string;
  channel_secret: string;
  user_id: string; // UUID as string
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotCreate {
  name: string;
  channel_token: string;
  channel_secret: string;
}

export interface BotUpdate {
  name?: string;
  channel_token?: string;
  channel_secret?: string;
}

export class PuzzleApiService {
  private static baseUrl = API_CONFIG.PUZZLE.BASE_URL;

  // 獲取認證headers
  private static getHeaders(): Headers {
    // 不再附帶 Authorization header，統一依賴 Cookie
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    return headers;
  }

  // 解析錯誤訊息
  private static async parseErrorMessage(response: Response): Promise<string> {
    try {
      const errorData = await response.json();

      // 根據不同的錯誤狀態碼返回友好的訊息
      switch (response.status) {
        case 400:
          // 檢查具體的錯誤訊息
          if (errorData.detail && errorData.detail.includes("duplicate key")) {
            return "此 Bot 名稱已被使用，請選擇其他名稱";
          }
          if (errorData.detail && (errorData.detail.includes("Maximum 3 bots") || errorData.detail.includes("每個用戶最多只能建立 3 個 Bot"))) {
            return "每個用戶最多只能創建 3 個 Bot，請先刪除不需要的 Bot";
          }
          if (
            errorData.detail &&
            errorData.detail.includes("Username already registered")
          ) {
            return "此用戶名已被註冊";
          }
          return errorData.detail || "請求參數錯誤，請檢查輸入的資料";

        case 401:
          return "登入已過期，請重新登入";

        case 403:
          return "沒有權限執行此操作";

        case 404:
          return "找不到指定的資源";

        case 409:
          return "資料衝突，請檢查是否重複";

        case 422:
          return "輸入的資料格式不正確，請檢查所有欄位";

        case 429:
          return "操作過於頻繁，請稍後再試";

        case 500:
          return "伺服器發生錯誤，請稍後再試或聯繫管理員";

        case 502:
        case 503:
        case 504:
          return "伺服器暫時無法使用，請稍後再試";

        default:
          return errorData.detail || `發生未知錯誤 (${response.status})`;
      }
    } catch {
      // 如果無法解析JSON，返回基於狀態碼的錯誤訊息
      switch (response.status) {
        case 400:
          return "請求參數錯誤，請檢查輸入的資料";
        case 401:
          return "登入已過期，請重新登入";
        case 403:
          return "沒有權限執行此操作";
        case 404:
          return "找不到指定的資源";
        case 500:
          return "伺服器發生錯誤，請稍後再試";
        default:
          return `網路錯誤 (${response.status})，請檢查網路連線`;
      }
    }
  }

  // 創建新的 Bot
  static async createBot(botData: BotCreate): Promise<Bot> {
    try {
      const response = await fetch(
        getApiUrl(this.baseUrl, API_CONFIG.PUZZLE.ENDPOINTS.CREATE_BOT),
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(botData),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorMessage = await this.parseErrorMessage(response);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      // 網路錯誤或其他非預期錯誤
      throw new Error("網路連線失敗，請檢查您的網路連線並重試");
    }
  }

  // 獲取用戶的所有 Bot
  static async getBots(): Promise<Bot[]> {
    try {
      const response = await fetch(
        getApiUrl(this.baseUrl, API_CONFIG.PUZZLE.ENDPOINTS.GET_BOTS),
        {
          method: "GET",
          headers: this.getHeaders(),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorMessage = await this.parseErrorMessage(response);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("無法載入 Bot 列表，請檢查網路連線");
    }
  }

  // 獲取單個 Bot
  static async getBot(botId: string): Promise<Bot> {
    try {
      const response = await fetch(getApiUrl(this.baseUrl, `/${botId}`), {
        method: "GET",
        headers: this.getHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorMessage = await this.parseErrorMessage(response);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("無法載入 Bot 資訊，請檢查網路連線");
    }
  }

  // 更新 Bot
  static async updateBot(botId: string, botData: BotUpdate): Promise<Bot> {
    try {
      const response = await fetch(
        getApiUrl(this.baseUrl, API_CONFIG.PUZZLE.ENDPOINTS.UPDATE_BOT(botId)),
        {
          method: "PUT",
          headers: this.getHeaders(),
          body: JSON.stringify(botData),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorMessage = await this.parseErrorMessage(response);
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("更新 Bot 失敗，請檢查網路連線");
    }
  }

  // 刪除 Bot
  static async deleteBot(botId: string): Promise<void> {
    try {
      const response = await fetch(
        getApiUrl(this.baseUrl, API_CONFIG.PUZZLE.ENDPOINTS.DELETE_BOT(botId)),
        {
          method: "DELETE",
          headers: this.getHeaders(),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorMessage = await this.parseErrorMessage(response);
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("刪除 Bot 失敗，請檢查網路連線");
    }
  }
}
