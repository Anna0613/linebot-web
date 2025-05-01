export const API_CONFIG = {
  LINE_LOGIN: {
    BASE_URL: 'https://line-login.jkl921102.org/api',
    ENDPOINTS: {
      LINE_LOGIN: '/line-login',
      VERIFY_TOKEN: '/verify-token'
    }
  },
  AUTH: {
    BASE_URL: 'https://login-api.jkl921102.org',
    ENDPOINTS: {
      LOGIN: '/login',
      REGISTER: '/register',
      LOGOUT: '/logout',
      CHECK_LOGIN: '/check_login',
      VERIFY_EMAIL: '/verify-email',
      FORGOT_PASSWORD: '/forgot_password',
      RESET_PASSWORD: (token: string) => `/reset_password/${token}`
    }
  }
} as const;

// 輔助函數，用於生成完整的API URL
export const getApiUrl = (baseUrl: string, endpoint: string): string => {
  return `${baseUrl}${endpoint}`;
};
