// 從環境變數中獲取 API 端點
const LINE_LOGIN_API_URL = import.meta.env.VITE_LINE_LOGIN_API_URL || 'https://line-login.jkl921102.org';
const LOGIN_API_URL = import.meta.env.VITE_LOGIN_API_URL || 'https://login-api.jkl921102.org';
const PUZZLE_API_URL = import.meta.env.VITE_PUZZLE_API_URL || 'https://puzzle-api.jkl921102.org';
const SETTING_API_URL = import.meta.env.VITE_SETTING_API_URL || 'https://setting-api.jkl921102.org';

export const API_CONFIG = {
  LINE_LOGIN: {
    BASE_URL: `${LINE_LOGIN_API_URL}/api`,
    FULL_URL: LINE_LOGIN_API_URL,
    ENDPOINTS: {
      LINE_LOGIN: '/line-login',
      VERIFY_TOKEN: '/verify-token',
      DISCONNECT: '/disconnect',
    },
  },
  AUTH: {
    BASE_URL: LOGIN_API_URL,
    ENDPOINTS: {
      LOGIN: '/login',
      REGISTER: '/register',
      LOGOUT: '/logout',
      CHECK_LOGIN: '/check_login',
      VERIFY_EMAIL: '/verify-email',
      FORGOT_PASSWORD: '/forgot_password',
      RESET_PASSWORD: (token: string) => `/reset_password/${token}`,
    },
  },
  SETTING: {
    BASE_URL: SETTING_API_URL,
    ENDPOINTS: {
      GET_PROFILE: '/profile',
      UPDATE_PROFILE: '/profile',
      GET_AVATAR: '/avatar',
      UPDATE_AVATAR: '/avatar',
      DELETE_AVATAR: '/avatar',
    },
  },
  PUZZLE: {
    BASE_URL: `${PUZZLE_API_URL}/api`,
    FULL_URL: PUZZLE_API_URL,
    ENDPOINTS: {
      GET_BOTS: (userId: number) => `/bots/${userId}`,
      CREATE_BOT: '/bots',
      UPDATE_BOT: (botId: string) => `/bots/${botId}`,
      DELETE_BOT: (botId: string) => `/bots/${botId}`,
      CREATE_FLEX_MESSAGE: '/flex-messages',
      UPDATE_FLEX_MESSAGE: (flexMessageId: string) => `/flex-messages/${flexMessageId}`,
      DELETE_FLEX_MESSAGE: (flexMessageId: string) => `/flex-messages/${flexMessageId}`,
      SEND_MESSAGE: '/send-message',
    },
  },
} as const;

// Helper function to construct API URLs
export function getApiUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl}${endpoint}`;
}
