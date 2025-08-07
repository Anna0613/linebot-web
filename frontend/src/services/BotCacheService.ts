/**
 * Bot 資料快取服務 - 專門處理 Bot 相關資料的快取邏輯
 */

import { cacheService, CACHE_KEYS, CACHE_TTL } from './CacheService';
import { Bot } from '../services/puzzleApi';

export interface BotCacheConfig {
  enableCache: boolean;
  listTTL: number;
  detailTTL: number;
  maxBots: number;
}

export class BotCacheService {
  private static instance: BotCacheService;
  private config: BotCacheConfig;

  private constructor(config?: Partial<BotCacheConfig>) {
    this.config = {
      enableCache: true,
      listTTL: CACHE_TTL.BOTS_LIST,
      detailTTL: CACHE_TTL.BOT_DETAIL,
      maxBots: 50,
      ...config
    };
  }

  public static getInstance(config?: Partial<BotCacheConfig>): BotCacheService {
    if (!BotCacheService.instance) {
      BotCacheService.instance = new BotCacheService(config);
    }
    return BotCacheService.instance;
  }

  /**
   * 快取 Bot 清單
   */
  public setBotsList(bots: Bot[]): void {
    if (!this.config.enableCache) return;

    try {
      // 限制快取的 Bot 數量
      const botsToCache = bots.slice(0, this.config.maxBots);
      cacheService.set(CACHE_KEYS.BOTS_LIST, botsToCache, this.config.listTTL);
      
      // 同時快取每個 Bot 的詳細資料
      botsToCache.forEach(bot => {
        const detailKey = CACHE_KEYS.BOT_DETAIL(bot.id);
        cacheService.set(detailKey, bot, this.config.detailTTL);
      });

      console.debug(`已快取 ${botsToCache.length} 個 Bot 到清單`);
    } catch (error) {
      console.error('快取 Bot 清單失敗:', error);
    }
  }

  /**
   * 獲取 Bot 清單快取
   */
  public getBotsList(): Bot[] | null {
    if (!this.config.enableCache) return null;

    try {
      const cachedBots = cacheService.get<Bot[]>(CACHE_KEYS.BOTS_LIST);
      if (cachedBots) {
        console.debug(`從快取獲取 ${cachedBots.length} 個 Bot`);
      }
      return cachedBots;
    } catch (error) {
      console.error('獲取 Bot 清單快取失敗:', error);
      return null;
    }
  }

  /**
   * 快取單個 Bot 詳情
   */
  public setBotDetail(bot: Bot): void {
    if (!this.config.enableCache) return;

    try {
      const detailKey = CACHE_KEYS.BOT_DETAIL(bot.id);
      cacheService.set(detailKey, bot, this.config.detailTTL);
      console.debug(`已快取 Bot 詳情: ${bot.name}`);
    } catch (error) {
      console.error('快取 Bot 詳情失敗:', error);
    }
  }

  /**
   * 獲取單個 Bot 詳情快取
   */
  public getBotDetail(botId: string): Bot | null {
    if (!this.config.enableCache) return null;

    try {
      const detailKey = CACHE_KEYS.BOT_DETAIL(botId);
      const cachedBot = cacheService.get<Bot>(detailKey);
      if (cachedBot) {
        console.debug(`從快取獲取 Bot 詳情: ${cachedBot.name}`);
      }
      return cachedBot;
    } catch (error) {
      console.error('獲取 Bot 詳情快取失敗:', error);
      return null;
    }
  }

  /**
   * 新增 Bot 到快取（增量更新）
   */
  public addBotToCache(newBot: Bot): void {
    if (!this.config.enableCache) return;

    try {
      // 更新 Bot 清單快取
      const cachedBots = this.getBotsList();
      if (cachedBots) {
        const updatedBots = [...cachedBots, newBot];
        this.setBotsList(updatedBots);
      }

      // 快取新 Bot 的詳情
      this.setBotDetail(newBot);
      
      console.debug(`已新增 Bot 到快取: ${newBot.name}`);
    } catch (error) {
      console.error('新增 Bot 到快取失敗:', error);
    }
  }

  /**
   * 更新快取中的 Bot
   */
  public updateBotInCache(updatedBot: Bot): void {
    if (!this.config.enableCache) return;

    try {
      // 更新 Bot 清單快取
      const cachedBots = this.getBotsList();
      if (cachedBots) {
        const updatedBots = cachedBots.map(bot => 
          bot.id === updatedBot.id ? updatedBot : bot
        );
        this.setBotsList(updatedBots);
      }

      // 更新 Bot 詳情快取
      this.setBotDetail(updatedBot);
      
      console.debug(`已更新快取中的 Bot: ${updatedBot.name}`);
    } catch (error) {
      console.error('更新快取中的 Bot 失敗:', error);
    }
  }

  /**
   * 從快取中移除 Bot
   */
  public removeBotFromCache(botId: string): void {
    if (!this.config.enableCache) return;

    try {
      // 從 Bot 清單快取中移除
      const cachedBots = this.getBotsList();
      if (cachedBots) {
        const filteredBots = cachedBots.filter(bot => bot.id !== botId);
        this.setBotsList(filteredBots);
      }

      // 移除 Bot 詳情快取
      const detailKey = CACHE_KEYS.BOT_DETAIL(botId);
      cacheService.delete(detailKey);
      
      console.debug(`已從快取中移除 Bot: ${botId}`);
    } catch (error) {
      console.error('從快取中移除 Bot 失敗:', error);
    }
  }

  /**
   * 檢查 Bot 清單快取是否存在且有效
   */
  public hasFreshBotsList(): boolean {
    if (!this.config.enableCache) return false;
    return cacheService.has(CACHE_KEYS.BOTS_LIST);
  }

  /**
   * 檢查特定 Bot 詳情快取是否存在且有效
   */
  public hasFreshBotDetail(botId: string): boolean {
    if (!this.config.enableCache) return false;
    const detailKey = CACHE_KEYS.BOT_DETAIL(botId);
    return cacheService.has(detailKey);
  }

  /**
   * 清除所有 Bot 相關快取
   */
  public clearAllBotCache(): void {
    try {
      cacheService.clearPattern('^bots:');
      console.debug('已清除所有 Bot 快取');
    } catch (error) {
      console.error('清除 Bot 快取失敗:', error);
    }
  }

  /**
   * 強制重新載入 Bot 清單（清除快取）
   */
  public invalidateBotsList(): void {
    try {
      cacheService.delete(CACHE_KEYS.BOTS_LIST);
      console.debug('已失效 Bot 清單快取');
    } catch (error) {
      console.error('失效 Bot 清單快取失敗:', error);
    }
  }

  /**
   * 強制重新載入特定 Bot 詳情（清除快取）
   */
  public invalidateBotDetail(botId: string): void {
    try {
      const detailKey = CACHE_KEYS.BOT_DETAIL(botId);
      cacheService.delete(detailKey);
      console.debug(`已失效 Bot 詳情快取: ${botId}`);
    } catch (error) {
      console.error('失效 Bot 詳情快取失敗:', error);
    }
  }

  /**
   * 獲取快取統計資訊
   */
  public getCacheStats(): {
    hasBotsList: boolean;
    botsCount: number;
    cachedDetails: number;
  } {
    const hasList = this.hasFreshBotsList();
    const bots = this.getBotsList();
    const botsCount = bots?.length || 0;
    
    // 計算有多少個 Bot 詳情被快取
    const allKeys = cacheService.getStats().keys;
    const detailKeys = allKeys.filter(key => key.startsWith('bots:detail:'));
    
    return {
      hasBotsList: hasList,
      botsCount,
      cachedDetails: detailKeys.length
    };
  }

  /**
   * 預熱快取 - 預先載入常用資料
   */
  public async preloadCache(bots: Bot[]): Promise<void> {
    if (!this.config.enableCache) return;

    try {
      // 預先快取 Bot 清單
      this.setBotsList(bots);
      
      // 預先快取前幾個 Bot 的詳情（通常用戶會先看到的）
      const preloadCount = Math.min(10, bots.length);
      for (let i = 0; i < preloadCount; i++) {
        this.setBotDetail(bots[i]);
      }
      
      console.debug(`已預熱快取: ${bots.length} 個 Bot 清單，${preloadCount} 個 Bot 詳情`);
    } catch (error) {
      console.error('預熱快取失敗:', error);
    }
  }

  /**
   * 啟用/停用快取
   */
  public setEnableCache(enable: boolean): void {
    this.config.enableCache = enable;
    if (!enable) {
      this.clearAllBotCache();
    }
    console.debug(`Bot 快取已${enable ? '啟用' : '停用'}`);
  }

  /**
   * 獲取快取配置
   */
  public getConfig(): BotCacheConfig {
    return { ...this.config };
  }
}

// 預設 Bot 快取服務實例
export const botCacheService = BotCacheService.getInstance();