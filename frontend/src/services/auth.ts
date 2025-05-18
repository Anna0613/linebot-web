// JWT相關常量
const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'username';
const EMAIL_KEY = 'email';

export interface AuthUser {
  username: string;
  email: string;
}

export class AuthService {
  // 獲取token，優先從cookie獲取，如果沒有則從localStorage獲取
  static getToken(): string | null {
    // 嘗試從cookie獲取token
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
    
    // 如果cookie中沒有，則從localStorage獲取
    return localStorage.getItem(TOKEN_KEY);
  }

  // 設置token和用戶信息
  static setToken(token: string): void {
    // 同時保存在localStorage作為備用
    localStorage.setItem(TOKEN_KEY, token);
  }

  // 移除token和用戶信息
  static removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    // 同時清除cookie中的token
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // 檢查token是否有效
  private static isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // 檢查是否已認證
  static isAuthenticated(): boolean {
    const token = this.getToken();
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
