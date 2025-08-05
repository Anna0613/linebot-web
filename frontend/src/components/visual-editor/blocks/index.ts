/**
 * 積木系統統一匯出入口
 * 提供完整的模組化積木系統
 */

// 共用模組
export * from './common';

// 事件積木模組
export * from './event';

// 回覆積木模組
export * from './reply';

// 控制積木模組
export * from './control';

// 設定積木模組
export * from './setting';

// Flex 容器積木模組
export * from './flex-container';

// Flex 內容積木模組
export * from './flex-content';

// Flex 佈局積木模組
export * from './flex-layout';

// 匯入所有積木分組配置
import { eventBlockGroup } from './event';
import { replyBlockGroup } from './reply';
import { controlBlockGroup } from './control';
import { settingBlockGroup } from './setting';
import { flexContainerBlockGroup } from './flex-container';
import { flexContentBlockGroup } from './flex-content';
import { flexLayoutBlockGroup } from './flex-layout';

import { BlockFactoryConfig } from './common/BlockConfig';
import { globalBlockFactory } from './common/BlockFactory';

/**
 * 所有積木分組配置
 */
export const allBlockGroups = [
  eventBlockGroup,
  replyBlockGroup,
  controlBlockGroup,
  settingBlockGroup,
  flexContainerBlockGroup,
  flexContentBlockGroup,
  flexLayoutBlockGroup
];

/**
 * 完整的積木工廠配置
 */
export const completeBlockFactoryConfig: BlockFactoryConfig = {
  groups: allBlockGroups,
  globalSettings: {
    defaultShowCompatibilityBadge: true,
    defaultColor: 'bg-gray-400',
    debugMode: process.env.NODE_ENV === 'development'
  }
};

/**
 * 初始化積木工廠
 */
export const initializeBlockFactory = () => {
  try {
    globalBlockFactory.loadConfig(completeBlockFactoryConfig);
    console.log('🏭 積木工廠初始化成功', {
      groupCount: allBlockGroups.length,
      totalBlocks: allBlockGroups.reduce((sum, group) => sum + group.blocks.length, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 積木工廠初始化失敗:', error);
    throw error;
  }
};

/**
 * 獲取積木統計資訊
 */
export const getBlockStatistics = () => {
  const totalBlocks = allBlockGroups.reduce((sum, group) => sum + group.blocks.length, 0);
  
  return {
    totalGroups: allBlockGroups.length,
    totalBlocks,
    groupDetails: allBlockGroups.map(group => ({
      groupId: group.groupId,
      groupName: group.groupName,
      category: group.category,
      blockCount: group.blocks.length,
      blocks: group.blocks.map(block => ({
        blockType: block.blockType,
        name: block.name,
        compatibility: block.compatibility
      }))
    }))
  };
};

// 注意：自動初始化已移至 ModularBlockPalette 組件中
// 避免在模組載入時執行副作用

export default {
  allBlockGroups,
  completeBlockFactoryConfig,
  initializeBlockFactory,
  getBlockStatistics
};