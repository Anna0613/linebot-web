/**
 * 事件積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有事件積木組件
export { default as MessageEventBlock } from './MessageEventBlock';
export { default as ImageEventBlock } from './ImageEventBlock';
export { default as FollowEventBlock } from './FollowEventBlock';
export { default as PostbackEventBlock } from './PostbackEventBlock';

// 匯入所有配置 (從統一常數檔案)
import { messageEventBlockConfig, imageEventBlockConfig, followEventBlockConfig, postbackEventBlockConfig } from '../../../../constants/blockConstants';

/**
 * 事件積木分組配置
 */
export const eventBlockGroup: BlockGroupConfig = {
  groupId: 'event',
  groupName: '事件',
  category: BlockCategory.EVENT,
  icon: 'Zap',
  blocks: [
    messageEventBlockConfig,
    imageEventBlockConfig,
    followEventBlockConfig,
    postbackEventBlockConfig
  ],
  priority: 1
};

/**
 * 獲取所有事件積木配置
 */
export const getAllEventBlockConfigs = () => [
  messageEventBlockConfig,
  imageEventBlockConfig,
  followEventBlockConfig,
  postbackEventBlockConfig
];

/**
 * 根據事件類型獲取積木配置
 */
export const getEventBlockConfigByType = (eventType: string) => {
  const configs = getAllEventBlockConfigs();
  return configs.find(config => config.defaultData.eventType === eventType);
};