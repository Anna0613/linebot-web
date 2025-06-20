import { parseJWTToken, isTokenExpired } from '../utils/tokenUtils';

// JWT相關常量
const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'username';
const EMAIL_KEY = 'email';

export interface AuthUser {
  username: string;
  email: string;
}

export class AuthService {
  // 獲取token，統一使用localStorage
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // 設置token和用戶信息
  static setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  // 移除token和用戶信息
  static removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    // 清除cookie中的token以確保不會有舊token留在cookies中
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // 檢查token是否有效
  private static isTokenValid(token: string): boolean {
    try {
      return !isTokenExpired(token);
    } catch {
      return false;
    }
  }

  // 從 cookie 中獲取 token
  static getTokenFromCookie(): string | null {
    if (!document.cookie) {
      console.log('沒有任何 cookies');
      return null;
    }
    
    console.log('所有 cookies:', document.cookie);
    console.log('當前域名:', window.location.hostname);
    console.log('當前端口:', window.location.port);
    
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      console.log(`檢查 cookie: ${name} = ${value}`);
      if (name === 'token' && value) {
        const decodedValue = decodeURIComponent(value);
        console.log('找到 token cookie:', decodedValue);
        return decodedValue;
      }
    }
    console.log('未找到 token cookie');
    return null;
  }

  // 檢查是否已認證（包括檢查 cookie）
  static isAuthenticated(): boolean {
    let token = this.getToken();
    
    // 如果 localStorage 沒有 token，檢查 cookie
    if (!token) {
      token = this.getTokenFromCookie();
      if (token) {
        // 將 cookie 中的 token 同步到 localStorage
        this.setToken(token);
      }
    }
    
    if (!token) return false;
    
    // 檢查token是否有效
    if (!this.isTokenValid(token)) {
      this.removeToken();  // 如果token無效，清除所有認證信息
      return false;
    }
    
    return true;
  }

  // 獲取認證headers
  static getAuthHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    const token = this.getToken();
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // 獲取用戶信息
  static getUser(): AuthUser | null {
    const username = localStorage.getItem(USERNAME_KEY);
    const email = localStorage.getItem(EMAIL_KEY);

    if (!username) return null;

    return {
      username,
      email: email || '',
    };
  }

  // 設置用戶信息
  static setUser(user: AuthUser): void {
    localStorage.setItem(USERNAME_KEY, user.username);
    if (user.email) {
      localStorage.setItem(EMAIL_KEY, user.email);
    }
  }

  // 清除所有認證信息
  static clearAuth(): void {
    this.removeToken();
  }
}
