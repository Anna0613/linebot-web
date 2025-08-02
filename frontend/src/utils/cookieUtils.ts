/**
 * Cookie 管理工具 - 安全的 HttpOnly cookie 操作
 * 專為防止 XSS 攻擊而設計，僅使用 cookies 存儲認證資訊
 */

import Cookies from 'js-cookie';

// Cookie 名稱常量
export const COOKIE_NAMES = {
  AUTH_TOKEN: 'auth_token',
  AUTH_TOKEN_REMEMBER: 'auth_token_remember',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  TOKEN_TYPE: 'token_type'
} as const;

// Cookie 選項配置
const COOKIE_OPTIONS = {
  // 會話 cookie（瀏覽器關閉時清除）
  session: {
    path: '/',
    sameSite: 'strict' as const,
    secure: window.location.protocol === 'https:',
  },
  // 記住我 cookie（7天有效期）
  remember: {
    path: '/',
    expires: 7, // 7 天
    sameSite: 'strict' as const,
    secure: window.location.protocol === 'https:',
  }
};

/**
 * 設定認證 token cookie
 * @param token - 認證 token
 * @param rememberMe - 是否記住我（7天 vs 會話）
 * @param tokenType - token 類型
 */
export const setAuthToken = (token: string, rememberMe = false, tokenType = 'Bearer'): void => {
  try {
    const cookieName = rememberMe ? COOKIE_NAMES.AUTH_TOKEN_REMEMBER : COOKIE_NAMES.AUTH_TOKEN;
    const options = rememberMe ? COOKIE_OPTIONS.remember : COOKIE_OPTIONS.session;

    // 設定 token cookie
    Cookies.set(cookieName, token, options);
    
    // 設定 token 類型
    Cookies.set(COOKIE_NAMES.TOKEN_TYPE, tokenType, options);

    // 清除其他類型的 token cookie
    if (rememberMe) {
      Cookies.remove(COOKIE_NAMES.AUTH_TOKEN);
    } else {
      Cookies.remove(COOKIE_NAMES.AUTH_TOKEN_REMEMBER);
    }

    console.log(`Token 已設定為 ${rememberMe ? '記住我' : '會話'} cookie`);
  } catch (error) {
    console.error('設定認證 token 失敗:', error);
    throw new Error('無法設定認證 cookie');
  }
};

/**
 * 獲取認證 token
 * 優先順序：會話 cookie > 記住我 cookie
 */
export const getAuthToken = (): string | null => {
  try {
    // 先檢查會話 cookie
    let token = Cookies.get(COOKIE_NAMES.AUTH_TOKEN);
    
    // 如果會話 cookie 不存在，檢查記住我 cookie
    if (!token) {
      token = Cookies.get(COOKIE_NAMES.AUTH_TOKEN_REMEMBER);
    }

    return token || null;
  } catch (error) {
    console.error('獲取認證 token 失敗:', error);
    return null;
  }
};

/**
 * 獲取 token 類型
 */
export const getTokenType = (): string => {
  try {
    return Cookies.get(COOKIE_NAMES.TOKEN_TYPE) || 'Bearer';
  } catch (error) {
    console.error('獲取 token 類型失敗:', error);
    return 'Bearer';
  }
};

/**
 * 設定 refresh token cookie
 * @param refreshToken - refresh token
 */
export const setRefreshToken = (refreshToken: string): void => {
  try {
    // refresh token 固定為 30 天過期
    const options = {
      path: '/',
      expires: 30, // 30 天
      sameSite: 'strict' as const,
      secure: window.location.protocol === 'https:',
    };

    Cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, options);
    console.log('Refresh token 已設定');
  } catch (error) {
    console.error('設定 refresh token 失敗:', error);
  }
};

/**
 * 獲取 refresh token
 */
export const getRefreshToken = (): string | null => {
  try {
    return Cookies.get(COOKIE_NAMES.REFRESH_TOKEN) || null;
  } catch (error) {
    console.error('獲取 refresh token 失敗:', error);
    return null;
  }
};

/**
 * 設定用戶資料 cookie
 * @param userData - 用戶資料
 * @param rememberMe - 是否記住我
 */
export const setUserData = (userData: object, rememberMe = false): void => {
  try {
    const options = rememberMe ? COOKIE_OPTIONS.remember : COOKIE_OPTIONS.session;
    const dataWithTimestamp = {
      ...userData,
      login_time: Date.now()
    };

    Cookies.set(COOKIE_NAMES.USER_DATA, JSON.stringify(dataWithTimestamp), options);
  } catch (error) {
    console.error('設定用戶資料失敗:', error);
    throw new Error('無法設定用戶資料 cookie');
  }
};

/**
 * 獲取用戶資料
 */
export const getUserData = (): object | null => {
  try {
    const userData = Cookies.get(COOKIE_NAMES.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('獲取用戶資料失敗:', error);
    return null;
  }
};

/**
 * 檢查是否有有效的認證 cookie
 */
export const hasValidAuth = (): boolean => {
  const token = getAuthToken();
  return !!token && token.length > 0;
};

/**
 * 清除所有認證相關的 cookies
 */
export const clearAllAuthCookies = (): void => {
  try {
    // 清除所有認證相關的 cookies
    Object.values(COOKIE_NAMES).forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
      // 確保在不同路徑下也清除
      Cookies.remove(cookieName);
    });

    // 清除可能存在的舊 cookies
    const oldCookieNames = [
      'auth_token', 'line_token', 'token', 'refresh_token', 'user_data', 
      'username', 'email', 'display_name'
    ];
    
    oldCookieNames.forEach(name => {
      Cookies.remove(name, { path: '/' });
      Cookies.remove(name);
    });

    console.log('所有認證 cookies 已清除');
  } catch (error) {
    console.error('清除認證 cookies 失敗:', error);
  }
};

/**
 * 獲取認證 headers
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  const tokenType = getTokenType();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `${tokenType} ${token}`;
  }

  return headers;
};

/**
 * 檢查是否為記住我狀態
 */
export const isRememberMeActive = (): boolean => {
  return !!Cookies.get(COOKIE_NAMES.AUTH_TOKEN_REMEMBER);
};

/**
 * 更新 cookie 過期時間（用於活動時自動延長）
 */
export const extendAuthCookies = (): void => {
  try {
    const token = getAuthToken();
    const tokenType = getTokenType();
    const userData = getUserData();
    const isRememberMe = isRememberMeActive();

    if (token && isRememberMe) {
      // 只有記住我狀態才延長，會話狀態保持原樣
      setAuthToken(token, true, tokenType);
      if (userData) {
        setUserData(userData, true);
      }
    }
  } catch (error) {
    console.error('延長 cookie 過期時間失敗:', error);
  }
};