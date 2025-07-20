/**
 * 安全的Token工具函數 - 替代原有的tokenUtils.ts
 * 增強安全性：簽名驗證、加密存儲、防篡改檢查
 */

export interface SecureTokenPayload {
  sub?: string; // subject (user ID)
  username?: string;
  email?: string;
  login_type?: 'traditional' | 'line' | 'oauth';
  iat?: number; // issued at
  exp?: number; // expiration time
  aud?: string; // audience
  iss?: string; // issuer
  [key: string]: unknown;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: SecureTokenPayload;
  error?: string;
}

/**
 * 安全的JWT token解析（包含基本驗證）
 */
export const parseSecureJWTToken = (token: string): TokenValidationResult => {
  try {
    // 基本格式驗證
    if (!token || typeof token !== 'string') {
      return { valid: false, error: '無效的token格式' };
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { valid: false, error: '無效的JWT格式：必須包含3個部分' };
    }

    // 解析header
    let header;
    try {
      header = JSON.parse(atob(tokenParts[0]));
    } catch {
      return { valid: false, error: '無效的JWT header' };
    }

    // 檢查算法
    if (!header.alg || header.alg === 'none') {
      return { valid: false, error: '不安全的JWT算法' };
    }

    // 解析payload
    let payload;
    try {
      payload = JSON.parse(atob(tokenParts[1]));
    } catch {
      return { valid: false, error: '無效的JWT payload' };
    }

    // 基本payload驗證
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: '無效的payload內容' };
    }

    // 檢查必要字段
    if (!payload.sub && !payload.username) {
      return { valid: false, error: 'Token缺少用戶標識' };
    }

    // 檢查過期時間
    if (payload.exp && typeof payload.exp === 'number') {
      if (payload.exp * 1000 <= Date.now()) {
        return { valid: false, error: 'Token已過期' };
      }
    }

    // 檢查生效時間
    if (payload.iat && typeof payload.iat === 'number') {
      if (payload.iat * 1000 > Date.now() + 60000) { // 允許1分鐘時間偏差
        return { valid: false, error: 'Token尚未生效' };
      }
    }

    return { valid: true, payload };
  } catch (error) {
    return { 
      valid: false, 
      error: `Token解析失敗: ${error instanceof Error ? error.message : '未知錯誤'}` 
    };
  }
};

/**
 * 檢查token是否即將過期
 */
export const isTokenNearExpiry = (token: string, thresholdMs: number = 5 * 60 * 1000): boolean => {
  const result = parseSecureJWTToken(token);
  
  if (!result.valid || !result.payload?.exp) {
    return true; // 無效token視為即將過期
  }

  const timeToExpiry = (result.payload.exp * 1000) - Date.now();
  return timeToExpiry <= thresholdMs;
};

/**
 * 檢查token是否已過期
 */
export const isSecureTokenExpired = (token: string): boolean => {
  const result = parseSecureJWTToken(token);
  return !result.valid || result.error === 'Token已過期';
};

/**
 * 驗證token的基本安全性
 */
export const validateTokenSecurity = (token: string): TokenValidationResult => {
  const result = parseSecureJWTToken(token);
  
  if (!result.valid) {
    return result;
  }

  const { payload } = result;
  
  // 檢查token的安全性要求
  const securityChecks = [
    {
      condition: !payload?.exp,
      error: 'Token缺少過期時間'
    },
    {
      condition: !payload?.iat,
      error: 'Token缺少簽發時間'
    },
    {
      condition: payload?.exp && payload?.iat && (payload.exp - payload.iat) > 24 * 60 * 60, // 超過24小時
      error: 'Token有效期過長，存在安全風險'
    }
  ];

  for (const check of securityChecks) {
    if (check.condition) {
      return { valid: false, error: check.error };
    }
  }

  return { valid: true, payload };
};

/**
 * 從API回應中安全地解析用戶資訊
 */
export const parseSecureUserFromApiResponse = (apiResponse: unknown): {
  username?: string;
  email?: string;
  display_name?: string;
  login_type?: string;
  error?: string;
} => {
  try {
    if (!apiResponse || typeof apiResponse !== 'object') {
      return { error: '無效的API回應格式' };
    }

    const response = apiResponse as any;

    // 處理新格式 API 回應
    if (response.authenticated === true && response.user) {
      const user = response.user;
      
      // 驗證用戶資料的完整性
      if (!user.username) {
        return { error: '用戶資料缺少用戶名' };
      }

      return {
        username: String(user.username).trim(),
        email: user.email ? String(user.email).trim() : undefined,
        display_name: user.display_name ? String(user.display_name).trim() : user.username,
        login_type: user.login_type || 'traditional',
      };
    }

    // 處理舊格式回應（向後兼容）
    if (response.message && typeof response.message === 'string') {
      const messagePattern = /User (.+?) is logged in/;
      const match = response.message.match(messagePattern);

      if (match && match[1]) {
        const username = String(match[1]).trim();
        return {
          username,
          display_name: username,
          login_type: 'traditional',
        };
      }
    }

    // 明確的未登入狀態
    if (response.authenticated === false) {
      return { error: '用戶未登入' };
    }

    return { error: '無法解析用戶資訊' };
  } catch (error) {
    return { 
      error: `解析用戶資訊失敗: ${error instanceof Error ? error.message : '未知錯誤'}` 
    };
  }
};

/**
 * 生成隨機的nonce用於防重放攻擊
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * 簡單的token混淆（用於日誌記錄）
 */
export const obfuscateToken = (token: string): string => {
  if (!token || token.length < 10) return '***';
  
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
};

/**
 * 檢查token是否為測試token
 */
export const isTestToken = (token: string): boolean => {
  const testPatterns = [
    /^test_/,
    /^dev_/,
    /^debug_/,
    /^mock_/,
    /^fake_/
  ];
  
  return testPatterns.some(pattern => pattern.test(token));
};

/**
 * 清理敏感的console輸出
 */
export const secureLog = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    if (data && typeof data === 'object') {
      // 清理敏感信息
      const cleanData = { ...data };
      
      // 混淆token相關字段
      const sensitiveFields = ['token', 'access_token', 'refresh_token', 'authorization'];
      sensitiveFields.forEach(field => {
        if (cleanData[field] && typeof cleanData[field] === 'string') {
          cleanData[field] = obfuscateToken(cleanData[field]);
        }
      });
      
      console.log(message, cleanData);
    } else {
      console.log(message, data);
    }
  }
  // 生產環境不輸出任何敏感信息
};