/**
 * 積木工廠系統
 * 負責創建、註冊和管理所有積木配置
 */

import { 
  BlockConfig, 
  BlockGroupConfig, 
  BlockFactoryConfig, 
  BlockConfigValidator,
  BlockTemplateConfig
} from './BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 積木工廠類
 */
export class BlockFactory {
  private groups: Map<string, BlockGroupConfig> = new Map();
  private blocks: Map<string, BlockConfig> = new Map();
  private templates: Map<string, BlockTemplateConfig> = new Map();
  private validator: BlockConfigValidator;
  private debugMode: boolean = false;

  constructor(config?: BlockFactoryConfig) {
    this.validator = new BlockConfigValidator();
    
    if (config) {
      this.loadConfig(config);
    }
  }

  /**
   * 載入工廠配置
   */
  loadConfig(config: BlockFactoryConfig): void {
    // 載入全域設定
    if (config.globalSettings) {
      this.debugMode = config.globalSettings.debugMode || false;
    }

    // 載入積木分組
    config.groups.forEach(group => {
      this.registerGroup(group);
    });

    // 載入積木模板
    if (config.templates) {
      config.templates.forEach(template => {
        this.registerTemplate(template);
      });
    }

    this.log('BlockFactory 初始化完成', {
      groupCount: this.groups.size,
      blockCount: this.blocks.size,
      templateCount: this.templates.size
    });
  }

  /**
   * 註冊積木分組
   */
  registerGroup(group: BlockGroupConfig): void {
    // 驗證分組中的所有積木
    const invalidBlocks = group.blocks.filter(block => {
      const validation = this.validator.validate(block);
      if (!validation.isValid) {
        console.error(`積木 ${block.blockType} 驗證失敗:`, validation.errors);
        return true;
      }
      return false;
    });

    if (invalidBlocks.length > 0) {
      throw new Error(`分組 ${group.groupId} 包含 ${invalidBlocks.length} 個無效積木`);
    }

    // 註冊分組
    this.groups.set(group.groupId, group);

    // 註冊分組中的所有積木
    group.blocks.forEach(block => {
      this.blocks.set(block.blockType, block);
    });

    this.log(`註冊積木分組: ${group.groupName}`, {
      groupId: group.groupId,
      blockCount: group.blocks.length
    });
  }

  /**
   * 註冊單個積木
   */
  registerBlock(block: BlockConfig): void {
    const validation = this.validator.validate(block);
    if (!validation.isValid) {
      throw new Error(`積木 ${block.blockType} 驗證失敗: ${validation.errors.join(', ')}`);
    }

    this.blocks.set(block.blockType, block);
    this.log(`註冊積木: ${block.name}`, { blockType: block.blockType });
  }

  /**
   * 註冊積木模板
   */
  registerTemplate(template: BlockTemplateConfig): void {
    // 驗證模板中的所有積木
    const invalidBlocks = template.blocks.filter(block => {
      const validation = this.validator.validate(block);
      return !validation.isValid;
    });

    if (invalidBlocks.length > 0) {
      throw new Error(`模板 ${template.templateId} 包含 ${invalidBlocks.length} 個無效積木`);
    }

    this.templates.set(template.templateId, template);
    this.log(`註冊積木模板: ${template.templateName}`, {
      templateId: template.templateId,
      blockCount: template.blocks.length
    });
  }

  /**
   * 獲取積木配置
   */
  getBlock(blockType: string): BlockConfig | undefined {
    return this.blocks.get(blockType);
  }

  /**
   * 獲取所有積木配置
   */
  getAllBlocks(): BlockConfig[] {
    return Array.from(this.blocks.values());
  }

  /**
   * 根據類別獲取積木
   */
  getBlocksByCategory(category: BlockCategory): BlockConfig[] {
    return Array.from(this.blocks.values()).filter(block => block.category === category);
  }

  /**
   * 根據相容性獲取積木
   */
  getBlocksByCompatibility(context: WorkspaceContext): BlockConfig[] {
    return Array.from(this.blocks.values()).filter(block => 
      block.compatibility.includes(context)
    );
  }

  /**
   * 獲取積木分組
   */
  getGroup(groupId: string): BlockGroupConfig | undefined {
    return this.groups.get(groupId);
  }

  /**
   * 獲取所有積木分組
   */
  getAllGroups(): BlockGroupConfig[] {
    return Array.from(this.groups.values()).sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  /**
   * 根據類別獲取積木分組
   */
  getGroupsByCategory(category: BlockCategory): BlockGroupConfig[] {
    return Array.from(this.groups.values()).filter(group => group.category === category);
  }

  /**
   * 獲取積木模板
   */
  getTemplate(templateId: string): BlockTemplateConfig | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 獲取所有積木模板
   */
  getAllTemplates(): BlockTemplateConfig[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根據標籤獲取積木模板
   */
  getTemplatesByTag(tag: string): BlockTemplateConfig[] {
    return Array.from(this.templates.values()).filter(template => 
      template.tags?.includes(tag)
    );
  }

  /**
   * 創建積木實例（返回積木數據）
   */
  createBlock(blockType: string, customData?: Record<string, unknown>): Record<string, unknown> | null {
    const config = this.getBlock(blockType);
    if (!config) {
      this.log(`積木類型 ${blockType} 未找到`, { blockType }, 'error');
      return null;
    }

    const blockData = {
      blockType: config.blockType,
      blockData: {
        ...config.defaultData,
        ...customData
      }
    };

    this.log(`創建積木實例: ${config.name}`, { blockType, blockData });
    return blockData;
  }

  /**
   * 搜尋積木
   */
  searchBlocks(query: string): BlockConfig[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.blocks.values()).filter(block => 
      block.name.toLowerCase().includes(lowercaseQuery) ||
      block.blockType.toLowerCase().includes(lowercaseQuery) ||
      (block.description && block.description.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * 驗證積木類型是否存在
   */
  hasBlock(blockType: string): boolean {
    return this.blocks.has(blockType);
  }

  /**
   * 獲取統計資訊
   */
  getStatistics(): {
    totalBlocks: number;
    totalGroups: number;
    totalTemplates: number;
    blocksByCategory: Record<BlockCategory, number>;
    blocksByCompatibility: Record<WorkspaceContext, number>;
  } {
    const blocksByCategory = {} as Record<BlockCategory, number>;
    const blocksByCompatibility = {} as Record<WorkspaceContext, number>;

    // 初始化計數器
    Object.values(BlockCategory).forEach(category => {
      blocksByCategory[category] = 0;
    });
    Object.values(WorkspaceContext).forEach(context => {
      blocksByCompatibility[context] = 0;
    });

    // 統計積木
    Array.from(this.blocks.values()).forEach(block => {
      blocksByCategory[block.category]++;
      block.compatibility.forEach(context => {
        blocksByCompatibility[context]++;
      });
    });

    return {
      totalBlocks: this.blocks.size,
      totalGroups: this.groups.size,
      totalTemplates: this.templates.size,
      blocksByCategory,
      blocksByCompatibility
    };
  }

  /**
   * 調試日誌
   */
  private log(message: string, data?: unknown, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.debugMode) return;

    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    const prefix = `[BlockFactory]`;
    
    if (data) {
      logMethod(`${prefix} ${message}`, data);
    } else {
      logMethod(`${prefix} ${message}`);
    }
  }

  /**
   * 清除所有註冊的內容
   */
  clear(): void {
    this.groups.clear();
    this.blocks.clear();
    this.templates.clear();
    this.log('BlockFactory 已清除所有內容');
  }

  /**
   * 匯出配置（用於序列化）
   */
  exportConfig(): BlockFactoryConfig {
    return {
      groups: Array.from(this.groups.values()),
      templates: Array.from(this.templates.values()),
      globalSettings: {
        debugMode: this.debugMode
      }
    };
  }
}

/**
 * 全域積木工廠實例
 */
export const globalBlockFactory = new BlockFactory();

/**
 * 便利函數：獲取積木配置
 */
export const getBlockConfig = (blockType: string): BlockConfig | undefined => {
  return globalBlockFactory.getBlock(blockType);
};

/**
 * 便利函數：創建積木實例
 */
export const createBlockInstance = (blockType: string, customData?: Record<string, unknown>): Record<string, unknown> | null => {
  return globalBlockFactory.createBlock(blockType, customData);
};

/**
 * 便利函數：搜尋積木
 */
export const searchBlocks = (query: string): BlockConfig[] => {
  return globalBlockFactory.searchBlocks(query);
};

export default BlockFactory;