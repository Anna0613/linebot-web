export const API_CONFIG = {
  LINE_LOGIN: {
    BASE_URL: 'https://line-login.jkl921102.org/api',
    ENDPOINTS: {
      LINE_LOGIN: '/line-login',
      VERIFY_TOKEN: '/verify-token'
    }
  },
  AUTH: {
    //login-api.jkl921102.org
    BASE_URL: 'http://127.0.0.1:5501',
    ENDPOINTS: {
      LOGIN: '/login',
      REGISTER: '/register',
      LOGOUT: '/logout',
      CHECK_LOGIN: '/check_login',
      VERIFY_EMAIL: '/verify-email',
      FORGOT_PASSWORD: '/forgot_password',
      RESET_PASSWORD: (token: string) => `/reset_password/${token}`
    }
  },
  PUZZLE: {
    BASE_URL: 'https://puzzle-api.jkl921102.org/api',
    ENDPOINTS: {
      GET_BOTS: (userId: number) => `/bots/${userId}`,
      CREATE_BOT: '/bots',
      UPDATE_BOT: (botId: string) => `/bots/${botId}`,
      DELETE_BOT: (botId: string) => `/bots/${botId}`,
      CREATE_FLEX_MESSAGE: '/flex-messages',
      UPDATE_FLEX_MESSAGE: (flexMessageId: string) => `/flex-messages/${flexMessageId}`,
      DELETE_FLEX_MESSAGE: (flexMessageId: string) => `/flex-messages/${flexMessageId}`,
      SEND_MESSAGE: '/send-message'
    }
  }
} as const;

// 輔助函數，用於生成完整的API URL
export const getApiUrl = (baseUrl: string, endpoint: string): string => {
  return `${baseUrl}${endpoint}`;
};
