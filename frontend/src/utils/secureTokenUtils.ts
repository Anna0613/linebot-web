const obfuscateToken = (token: string): string => {
  if (!token || token.length < 10) return '***';
  
  return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
};

/**
 * 清理敏感的console輸出
 */
export const secureLog = (message: string, data?: unknown): void => {
  if (process.env.NODE_ENV === 'development') {
    if (data && typeof data === 'object' && data !== null) {
      // 清理敏感信息
      const cleanData = { ...data } as Record<string, unknown>;
      
      // 混淆token相關字段
      const sensitiveFields = ['token', 'access_token', 'refresh_token', 'authorization'];
      sensitiveFields.forEach(field => {
        if (cleanData[field] && typeof cleanData[field] === 'string') {
          cleanData[field] = obfuscateToken(cleanData[field] as string);
        }
      });
      
      console.log(message, cleanData);
    } else {
      console.log(message, data);
    }
  }
  // 生產環境不輸出任何敏感信息
};