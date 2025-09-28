// 統一的 API 端點 - 現在所有服務都通過一個後端提供
const UNIFIED_API_URL =
  import.meta.env.VITE_UNIFIED_API_URL || "http://localhost:8000";

// Webhook 域名配置
const WEBHOOK_DOMAIN = 
  import.meta.env.VITE_WEBHOOK_DOMAIN || 
  import.meta.env.VITE_DOMAIN || 
  import.meta.env.REACT_APP_DOMAIN || 
  UNIFIED_API_URL;

// 向後相容：保留原有環境變數支持
const LINE_LOGIN_API_URL =
  import.meta.env.VITE_LINE_LOGIN_API_URL || UNIFIED_API_URL;
const PUZZLE_API_URL = import.meta.env.VITE_PUZZLE_API_URL || UNIFIED_API_URL;
const SETTING_API_URL = import.meta.env.VITE_SETTING_API_URL || UNIFIED_API_URL;

export const API_CONFIG = {
  // 統一基礎 URL
  UNIFIED: {
    BASE_URL: `${UNIFIED_API_URL}/api/v1`,
    FULL_URL: UNIFIED_API_URL,
  },

  // Webhook 配置
  WEBHOOK: {
    DOMAIN: WEBHOOK_DOMAIN,
    BASE_URL: `${WEBHOOK_DOMAIN}/api/v1/webhooks`,
  },

  LINE_LOGIN: {
    BASE_URL: `${LINE_LOGIN_API_URL}/api/v1/auth`,
    FULL_URL: LINE_LOGIN_API_URL,
    ENDPOINTS: {
      LINE_LOGIN: "/line-login",
      DISCONNECT: "/disconnect",
    },
  },
  AUTH: {
    BASE_URL: `${UNIFIED_API_URL}/api/v1/auth`,
    ENDPOINTS: {
      LOGIN: "/login",
      REGISTER: "/register",
      LOGOUT: "/logout",
      CHECK_LOGIN: "/check-login",
      REFRESH: "/refresh",
      VERIFY_EMAIL: "/verify-email",
      FORGOT_PASSWORD: "/forgot_password",
      RESET_PASSWORD: (token: string) => `/reset_password/${token}`,
      RESEND_VERIFICATION: "/resend-verification",
    },
  },
  SETTING: {
    BASE_URL: `${SETTING_API_URL}/api/v1/users`,
    ENDPOINTS: {
      GET_PROFILE: "/profile",
      UPDATE_PROFILE: "/profile",
      GET_AVATAR: "/avatar",
      UPDATE_AVATAR: "/avatar",
      DELETE_AVATAR: "/avatar",
      CHANGE_PASSWORD: "/change-password",
      DELETE_ACCOUNT: "/delete-account",
      RESEND_EMAIL_VERIFICATION: "/resend-email-verification",
      CHECK_EMAIL_VERIFICATION: "/check-email-verification",
    },
  },
  PUZZLE: {
    BASE_URL: `${PUZZLE_API_URL}/api/v1/bots`,
    FULL_URL: PUZZLE_API_URL,
    ENDPOINTS: {
      GET_BOTS: "/",
      GET_BOT: (botId: string) => `/${botId}`,
      CREATE_BOT: "/",
      UPDATE_BOT: (botId: string) => `/${botId}`,
      DELETE_BOT: (botId: string) => `/${botId}`,
      CREATE_FLEX_MESSAGE: "/messages",
      UPDATE_FLEX_MESSAGE: (flexMessageId: string) =>
        `/messages/${flexMessageId}`,
      DELETE_FLEX_MESSAGE: (flexMessageId: string) =>
        `/messages/${flexMessageId}`,
      GET_FLEX_MESSAGES: "/messages",
      CREATE_BOT_CODE: "/codes",
      UPDATE_BOT_CODE: (codeId: string) => `/codes/${codeId}`,
      DELETE_BOT_CODE: (codeId: string) => `/codes/${codeId}`,
      GET_BOT_CODES: "/codes",
    },
  },
} as const;

// Helper function to construct API URLs
export function getApiUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}

// Helper function to generate webhook URL for a specific bot
export function getWebhookUrl(botId: string): string {
  return `${API_CONFIG.WEBHOOK.BASE_URL}/${botId}`;
}
