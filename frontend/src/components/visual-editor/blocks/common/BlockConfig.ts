/**
 * 積木配置系統
 * 提供積木的統一配置接口和類型定義
 */

import React from 'react';
import { BlockCategory, WorkspaceContext, BlockData } from '../../../../types/block';

/**
 * 積木配置接口
 */
export interface BlockConfig {
  /** 積木類型標識符 */
  blockType: string;
  /** 積木類別 */
  category: BlockCategory;
  /** 積木名稱（顯示用） */
  name: string;
  /** 積木描述 */
  description?: string;
  /** 積木顏色 */
  color: string;
  /** 相容的工作區上下文 */
  compatibility: WorkspaceContext[];
  /** 預設積木數據 */
  defaultData: BlockData;
  /** 積木圖示組件名稱 */
  iconName?: string;
  /** 是否顯示相容性標籤 */
  showCompatibilityBadge?: boolean;
  /** 積木提示資訊 */
  tooltip?: string;
  /** 積木排序優先級 */
  priority?: number;
}

/**
 * 積木分組配置接口
 */
export interface BlockGroupConfig {
  /** 分組標識符 */
  groupId: string;
  /** 分組名稱 */
  groupName: string;
  /** 分組類別 */
  category: BlockCategory;
  /** 分組圖示 */
  icon: string;
  /** 分組中的積木配置 */
  blocks: BlockConfig[];
  /** 分組排序優先級 */
  priority?: number;
}

/**
 * 積木模板配置接口
 */
export interface BlockTemplateConfig {
  /** 模板標識符 */
  templateId: string;
  /** 模板名稱 */
  templateName: string;
  /** 模板描述 */
  description?: string;
  /** 模板包含的積木配置 */
  blocks: BlockConfig[];
  /** 模板標籤 */
  tags?: string[];
}

/**
 * 積木渲染屬性接口
 */
export interface BlockRenderProps {
  /** 積木配置 */
  config: BlockConfig;
  /** 是否顯示相容性標籤 */
  showCompatibilityBadge?: boolean;
  /** 自定義樣式類 */
  className?: string;
  /** 點擊事件處理 */
  onClick?: () => void;
  /** 自定義子元素 */
  children?: React.ReactNode;
}

/**
 * 積木工廠配置接口
 */
export interface BlockFactoryConfig {
  /** 所有註冊的積木分組 */
  groups: BlockGroupConfig[];
  /** 積木模板庫 */
  templates?: BlockTemplateConfig[];
  /** 全域設定 */
  globalSettings?: {
    /** 預設顯示相容性標籤 */
    defaultShowCompatibilityBadge?: boolean;
    /** 預設積木顏色 */
    defaultColor?: string;
    /** 啟用調試模式 */
    debugMode?: boolean;
  };
}

/**
 * 積木驗證規則接口
 */
export interface BlockValidationRule {
  /** 規則名稱 */
  ruleName: string;
  /** 驗證函數 */
  validate: (config: BlockConfig) => boolean;
  /** 錯誤訊息 */
  errorMessage: string;
}

/**
 * 預設的積木驗證規則
 */
export const DEFAULT_VALIDATION_RULES: BlockValidationRule[] = [
  {
    ruleName: 'blockType_required',
    validate: (config) => !!config.blockType && config.blockType.trim().length > 0,
    errorMessage: '積木類型不能為空'
  },
  {
    ruleName: 'name_required',
    validate: (config) => !!config.name && config.name.trim().length > 0,
    errorMessage: '積木名稱不能為空'
  },
  {
    ruleName: 'category_valid',
    validate: (config) => Object.values(BlockCategory).includes(config.category),
    errorMessage: '積木類別無效'
  },
  {
    ruleName: 'compatibility_valid',
    validate: (config) => config.compatibility.length > 0 && 
      config.compatibility.every(ctx => Object.values(WorkspaceContext).includes(ctx)),
    errorMessage: '相容性配置無效'
  },
  {
    ruleName: 'defaultData_required',
    validate: (config) => !!config.defaultData && typeof config.defaultData === 'object',
    errorMessage: '預設數據不能為空'
  }
];

/**
 * 積木配置驗證器
 */
export class BlockConfigValidator {
  private rules: BlockValidationRule[];

  constructor(customRules: BlockValidationRule[] = []) {
    this.rules = [...DEFAULT_VALIDATION_RULES, ...customRules];
  }

  /**
   * 驗證積木配置
   */
  validate(config: BlockConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(config)) {
        errors.push(`[${rule.ruleName}] ${rule.errorMessage}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 驗證多個積木配置
   */
  validateBatch(configs: BlockConfig[]): { isValid: boolean; results: Array<{ config: BlockConfig; isValid: boolean; errors: string[] }> } {
    const results = configs.map(config => ({
      config,
      ...this.validate(config)
    }));

    return {
      isValid: results.every(result => result.isValid),
      results
    };
  }
}