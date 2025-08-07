/**
 * Flex 內容積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有 Flex 內容積木組件
export { default as TextContentBlock } from './TextContentBlock';
export { default as ImageContentBlock } from './ImageContentBlock';
export { default as ButtonContentBlock } from './ButtonContentBlock';
export { default as SeparatorBlock } from './SeparatorBlock';

// 匯入所有配置 (從統一常數檔案)
import { textContentBlockConfig, imageContentBlockConfig, buttonContentBlockConfig, separatorBlockConfig } from '../../../../constants/blockConstants';

/**
 * Flex 內容積木分組配置
 */
export const flexContentBlockGroup: BlockGroupConfig = {
  groupId: 'flex-content',
  groupName: '內容',
  category: BlockCategory.FLEX_CONTENT,
  icon: 'Type',
  blocks: [
    textContentBlockConfig,
    imageContentBlockConfig,
    buttonContentBlockConfig,
    separatorBlockConfig
  ],
  priority: 6
};

/**
 * 獲取所有 Flex 內容積木配置
 */
export const getAllFlexContentBlockConfigs = () => [
  textContentBlockConfig,
  imageContentBlockConfig,
  buttonContentBlockConfig,
  separatorBlockConfig
];

/**
 * 根據內容類型獲取積木配置
 */
export const getFlexContentBlockConfigByType = (contentType: string) => {
  const configs = getAllFlexContentBlockConfigs();
  return configs.find(config => config.defaultData.contentType === contentType);
};