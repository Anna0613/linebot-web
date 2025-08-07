/**
 * Flex 佈局積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有 Flex 佈局積木組件
export { default as SpacerBlock } from './SpacerBlock';
export { default as FillerBlock } from './FillerBlock';
export { default as AlignBlock } from './AlignBlock';

// 匯入所有配置 (從統一常數檔案)
import { spacerBlockConfig, fillerBlockConfig, alignBlockConfig } from '../../../../constants/blockConstants';

/**
 * Flex 佈局積木分組配置
 */
export const flexLayoutBlockGroup: BlockGroupConfig = {
  groupId: 'flex-layout',
  groupName: '佈局',
  category: BlockCategory.FLEX_LAYOUT,
  icon: 'MousePointer',
  blocks: [
    spacerBlockConfig,
    fillerBlockConfig,
    alignBlockConfig
  ],
  priority: 7
};

/**
 * 獲取所有 Flex 佈局積木配置
 */
export const getAllFlexLayoutBlockConfigs = () => [
  spacerBlockConfig,
  fillerBlockConfig,
  alignBlockConfig
];

/**
 * 根據佈局類型獲取積木配置
 */
export const getFlexLayoutBlockConfigByType = (layoutType: string) => {
  const configs = getAllFlexLayoutBlockConfigs();
  return configs.find(config => config.defaultData.layoutType === layoutType);
};