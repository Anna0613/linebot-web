/**
 * 事件積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有事件積木組件
export { default as MessageEventBlock, messageEventBlockConfig } from './MessageEventBlock';
export { default as ImageEventBlock, imageEventBlockConfig } from './ImageEventBlock';
export { default as FollowEventBlock, followEventBlockConfig } from './FollowEventBlock';
export { default as PostbackEventBlock, postbackEventBlockConfig } from './PostbackEventBlock';

// 匯入所有配置
import { messageEventBlockConfig } from './MessageEventBlock';
import { imageEventBlockConfig } from './ImageEventBlock';
import { followEventBlockConfig } from './FollowEventBlock';
import { postbackEventBlockConfig } from './PostbackEventBlock';

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