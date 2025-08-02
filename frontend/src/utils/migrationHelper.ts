/**
 * 遷移輔助工具 - 協助Token驗證系統平滑遷移
 * 提供數據遷移、回滾機制和相容性檢查
 */

import { authManager } from '../services/UnifiedAuthManager';

interface MigrationStatus {
  phase: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  currentStep: string;
  completedSteps: string[];
  errors: string[];
  startTime?: number;
  endTime?: number;
}

interface BackupData {
  timestamp: number;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: string[];
}

export class MigrationHelper {
  private static instance: MigrationHelper;
  private status: MigrationStatus;
  private backup: BackupData | null = null;

  private constructor() {
    this.status = {
      phase: 'not_started',
      currentStep: '',
      completedSteps: [],
      errors: [],
    };
  }

  public static getInstance(): MigrationHelper {
    if (!MigrationHelper.instance) {
      MigrationHelper.instance = new MigrationHelper();
    }
    return MigrationHelper.instance;
  }

  /**
   * 開始遷移過程
   */
  public async startMigration(): Promise<boolean> {
    try {
      this.updateStatus('in_progress', '開始遷移過程');

      // 1. 創建備份
      await this.createBackup();
      this.completeStep('backup_created');

      // 2. 檢查相容性
      const compatibilityCheck = await this.checkCompatibility();
      if (!compatibilityCheck.compatible) {
        throw new Error(`相容性檢查失敗: ${compatibilityCheck.issues.join(', ')}`);
      }
      this.completeStep('compatibility_checked');

      // 3. 遷移認證數據
      await this.migrateAuthData();
      this.completeStep('auth_data_migrated');

      // 4. 驗證遷移結果
      const validation = await this.validateMigration();
      if (!validation.valid) {
        throw new Error(`遷移驗證失敗: ${validation.issues.join(', ')}`);
      }
      this.completeStep('migration_validated');

      // 5. 清理舊數據
      await this.cleanupOldData();
      this.completeStep('old_data_cleaned');

      this.updateStatus('completed', '遷移完成');
      
      return true;
    } catch (_error) {
      this.addError(error instanceof Error ? error.message : '未知錯誤');
      this.updateStatus('failed', '遷移失敗');
      
      return false;
    }
  }

  /**
   * 回滾遷移
   */
  public async rollback(): Promise<boolean> {
    try {
      this.updateStatus('in_progress', '開始回滾');

      if (!this.backup) {
        throw new Error('沒有可用的備份數據');
      }

      // 1. 清除統一認證數據
      authManager.clearAuth();
      this.completeStep('unified_auth_cleared');

      // 2. 恢復舊數據
      await this.restoreFromBackup();
      this.completeStep('backup_restored');

      // 3. 驗證回滾結果
      const validation = await this.validateRollback();
      if (!validation.valid) {
        throw new Error(`回滾驗證失敗: ${validation.issues.join(', ')}`);
      }
      this.completeStep('rollback_validated');

      this.updateStatus('rolled_back', '回滾完成');
      
      return true;
    } catch (_error) {
      this.addError(error instanceof Error ? error.message : '未知錯誤');
      
      return false;
    }
  }

  /**
   * 檢查遷移狀態
   */
  public getStatus(): MigrationStatus {
    return { ...this.status };
  }

  /**
   * 檢查是否需要遷移
   */
  public needsMigration(): boolean {
    // 檢查是否存在舊的認證數據
    const oldTokens = [
      'auth_token',
      'line_token',
      'username',
      'email',
      'display_name'
    ];

    const hasOldData = oldTokens.some(key => localStorage.getItem(key) !== null);
    const hasNewData = authManager.getAccessToken() !== null;

    return hasOldData && !hasNewData;
  }

  /**
   * 自動遷移（如果需要）
   */
  public async autoMigrateIfNeeded(): Promise<boolean> {
    if (!this.needsMigration()) {
      return true;
    }

    
    try {
      // 簡化的自動遷移邏輯
      const oldAuthToken = localStorage.getItem('auth_token');
      const oldLineToken = localStorage.getItem('line_token');
      const oldUsername = localStorage.getItem('username');
      const oldEmail = localStorage.getItem('email');

      if (oldAuthToken) {
        // 遷移傳統認證
        authManager.setTokenInfo({
          access_token: oldAuthToken,
          token_type: 'Bearer'
        }, 'traditional');

        if (oldUsername) {
          authManager.setUserInfo({
            id: oldUsername,
            username: oldUsername,
            email: oldEmail || undefined,
            display_name: oldUsername,
            login_type: 'traditional'
          });
        }
      } else if (oldLineToken) {
        // 遷移LINE認證
        authManager.setTokenInfo({
          access_token: oldLineToken,
          token_type: 'LINE'
        }, 'line');

        if (oldUsername) {
          authManager.setUserInfo({
            id: oldUsername,
            username: oldUsername,
            display_name: oldUsername,
            login_type: 'line'
          });
        }
      }

      // 清理舊數據
      ['auth_token', 'line_token', 'username', 'email', 'display_name'].forEach(key => {
        localStorage.removeItem(key);
      });

      return true;
    } catch (_error) {
      return false;
    }
  }

  // 私有方法
  private async createBackup(): Promise<void> {
    this.backup = {
      timestamp: Date.now(),
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
      cookies: document.cookie.split(';').map(c => c.trim()),
    };
    
  }

  private async checkCompatibility(): Promise<{ compatible: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 檢查瀏覽器支持
    if (!window.localStorage) {
      issues.push('瀏覽器不支持localStorage');
    }

    if (!window.fetch) {
      issues.push('瀏覽器不支持fetch API');
    }

    // 檢查必要的API端點
    try {
      // 這裡可以添加API端點可用性檢查
    } catch (_error) {
      issues.push('API端點檢查失敗');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  private async migrateAuthData(): Promise<void> {
    // 檢查並遷移舊的認證數據
    const oldTokens = {
      auth_token: localStorage.getItem('auth_token'),
      line_token: localStorage.getItem('line_token'),
      username: localStorage.getItem('username'),
      email: localStorage.getItem('email'),
      display_name: localStorage.getItem('display_name'),
    };

    if (oldTokens.auth_token) {
      authManager.setTokenInfo({
        access_token: oldTokens.auth_token,
        token_type: 'Bearer'
      }, 'traditional');

      if (oldTokens.username) {
        authManager.setUserInfo({
          id: oldTokens.username,
          username: oldTokens.username,
          email: oldTokens.email || undefined,
          display_name: oldTokens.display_name || oldTokens.username,
          login_type: 'traditional'
        });
      }
    } else if (oldTokens.line_token) {
      authManager.setTokenInfo({
        access_token: oldTokens.line_token,
        token_type: 'LINE'
      }, 'line');

      if (oldTokens.username || oldTokens.display_name) {
        authManager.setUserInfo({
          id: oldTokens.username || oldTokens.display_name!,
          username: oldTokens.username || oldTokens.display_name!,
          display_name: oldTokens.display_name || oldTokens.username!,
          login_type: 'line'
        });
      }
    }
  }

  private async validateMigration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 檢查統一認證數據是否正確設置
    const token = authManager.getAccessToken();
    const user = authManager.getUserInfo();

    if (!token) {
      issues.push('統一認證token未設置');
    }

    if (!user) {
      issues.push('統一認證用戶信息未設置');
    }

    // 檢查認證狀態
    const isAuthenticated = authManager.isAuthenticatedSync();
    if (!isAuthenticated) {
      issues.push('統一認證狀態檢查失敗');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private async cleanupOldData(): Promise<void> {
    const oldKeys = [
      'auth_token',
      'line_token', 
      'username',
      'email',
      'display_name',
      'user_data',
      'token_type'
    ];

    oldKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // 清理cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }

  private async restoreFromBackup(): Promise<void> {
    if (!this.backup) {
      throw new Error('沒有備份數據可恢復');
    }

    // 清理當前數據
    localStorage.clear();
    sessionStorage.clear();

    // 恢復localStorage
    Object.entries(this.backup.localStorage).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    // 恢復sessionStorage
    Object.entries(this.backup.sessionStorage).forEach(([key, value]) => {
      sessionStorage.setItem(key, value);
    });
  }

  private async validateRollback(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 檢查舊認證數據是否恢復
    const oldToken = localStorage.getItem('auth_token') || localStorage.getItem('line_token');
    if (!oldToken) {
      issues.push('舊認證token未恢復');
    }

    // 檢查統一認證數據是否清除
    const newToken = authManager.getAccessToken();
    if (newToken) {
      issues.push('統一認證數據未完全清除');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private updateStatus(phase: MigrationStatus['phase'], currentStep: string): void {
    this.status.phase = phase;
    this.status.currentStep = currentStep;
    
    if (phase === 'in_progress' && !this.status.startTime) {
      this.status.startTime = Date.now();
    }
    
    if (phase === 'completed' || phase === 'failed' || phase === 'rolled_back') {
      this.status.endTime = Date.now();
    }
  }

  private completeStep(step: string): void {
    this.status.completedSteps.push(step);
    this.status.currentStep = `${step} completed`;
  }

  private addError(error: string): void {
    this.status.errors.push(error);
  }
}

// 導出單例實例
export const migrationHelper = MigrationHelper.getInstance();