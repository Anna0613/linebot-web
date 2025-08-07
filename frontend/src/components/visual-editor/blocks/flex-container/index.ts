/**
 * Flex 容器積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有 Flex 容器積木組件
export { default as BubbleContainerBlock } from './BubbleContainerBlock';
export { default as CarouselContainerBlock } from './CarouselContainerBlock';
export { default as BoxContainerBlock } from './BoxContainerBlock';

// 匯入所有配置 (從統一常數檔案)
import { bubbleContainerBlockConfig, carouselContainerBlockConfig, boxContainerBlockConfig } from '../../../../constants/blockConstants';

/**
 * Flex 容器積木分組配置
 */
export const flexContainerBlockGroup: BlockGroupConfig = {
  groupId: 'flex-container',
  groupName: '容器',
  category: BlockCategory.FLEX_CONTAINER,
  icon: 'Square',
  blocks: [
    bubbleContainerBlockConfig,
    carouselContainerBlockConfig,
    boxContainerBlockConfig
  ],
  priority: 5
};

/**
 * 獲取所有 Flex 容器積木配置
 */
export const getAllFlexContainerBlockConfigs = () => [
  bubbleContainerBlockConfig,
  carouselContainerBlockConfig,
  boxContainerBlockConfig
];

/**
 * 根據容器類型獲取積木配置
 */
export const getFlexContainerBlockConfigByType = (containerType: string) => {
  const configs = getAllFlexContainerBlockConfigs();
  return configs.find(config => config.defaultData.containerType === containerType);
};