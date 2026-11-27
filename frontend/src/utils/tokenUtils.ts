/**
 * Token 和用戶訊息解析工具函數
 */

export interface TokenPayload {
  login_type?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * 安全地解析 JWT token
 * @param token JWT token 字串
 * @returns 解析後的 payload 或 null
 */
export const parseJWTToken = (token: string): TokenPayload | null => {
  try {
    // 驗證 token 格式
    if (!token || typeof token !== "string") {
      throw new Error("無效的 token 格式");
    }

    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
      throw new Error("無效的 JWT token 格式");
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    return payload;
  } catch (_error) {
    console.error("Error occurred:", _error);
    return null;
  }
};
