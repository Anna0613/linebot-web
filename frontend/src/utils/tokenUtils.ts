/**
 * Token 和用戶訊息解析工具函數
 */

export interface TokenPayload {
  login_type?: string;
  exp?: number;
  [key: string]: any;
}

export interface ParsedUserMessage {
  username: string;
}

/**
 * 安全地解析 JWT token
 * @param token JWT token 字串
 * @returns 解析後的 payload 或 null
 */
export const parseJWTToken = (token: string): TokenPayload | null => {
  try {
    // 驗證 token 格式
    if (!token || typeof token !== 'string') {
      throw new Error('無效的 token 格式');
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('無效的 JWT token 格式');
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    return payload;
  } catch (error) {
    console.error('解析 JWT token 失敗:', error);
    return null;
  }
};

/**
 * 檢查 token 是否已過期
 * @param token JWT token 字串
 * @returns boolean
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = parseJWTToken(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  return payload.exp * 1000 <= Date.now();
};

/**
 * 從 API 回應中解析用戶資訊
 * @param apiResponse API 回應資料
 * @returns 解析後的用戶資訊或 null
 */
export const parseUserFromApiResponse = (apiResponse: any): ParsedUserMessage | null => {
  try {
    // 檢查新的 API 回應格式 (authenticated + user)
    if (apiResponse.authenticated && apiResponse.user) {
      return {
        username: apiResponse.user.username
      };
    }
    
    // 相容舊格式：檢查 message 欄位
    if (apiResponse.message && typeof apiResponse.message === 'string') {
      const messagePattern = /User (.+?) is logged in/;
      const match = apiResponse.message.match(messagePattern);
      
      if (match && match[1]) {
        return {
          username: match[1]
        };
      }
    }

    throw new Error('無效的 API 回應格式');
  } catch (error) {
    console.error('解析用戶資訊失敗:', error);
    return null;
  }
};

/**
 * 從 API 回應訊息中解析用戶名稱（舊版相容）
 * @param message API 回應中的 message 欄位
 * @returns 解析後的用戶資訊或 null
 * @deprecated 請使用 parseUserFromApiResponse 代替
 */
export const parseUserMessage = (message: any): ParsedUserMessage | null => {
  try {
    // 檢查 message 是否存在且格式正確
    if (!message || typeof message !== 'string') {
      throw new Error('無效的 API 回應格式');
    }

    const messagePattern = /User (.+?) is logged in/;
    const match = message.match(messagePattern);
    
    if (!match || !match[1]) {
      throw new Error('無法從回應中解析用戶名稱');
    }

    return {
      username: match[1]
    };
  } catch (error) {
    console.error('解析用戶訊息失敗:', error);
    return null;
  }
}; 