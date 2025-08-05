/**
 * 回覆積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有回覆積木組件
export { default as TextReplyBlock, textReplyBlockConfig } from './TextReplyBlock';
export { default as ImageReplyBlock, imageReplyBlockConfig } from './ImageReplyBlock';
export { default as FlexReplyBlock, flexReplyBlockConfig } from './FlexReplyBlock';
export { default as StickerReplyBlock, stickerReplyBlockConfig } from './StickerReplyBlock';

// 匯入所有配置
import { textReplyBlockConfig } from './TextReplyBlock';
import { imageReplyBlockConfig } from './ImageReplyBlock';
import { flexReplyBlockConfig } from './FlexReplyBlock';
import { stickerReplyBlockConfig } from './StickerReplyBlock';

/**
 * 回覆積木分組配置
 */
export const replyBlockGroup: BlockGroupConfig = {
  groupId: 'reply',
  groupName: '回覆',
  category: BlockCategory.REPLY,
  icon: 'MessageSquare',
  blocks: [
    textReplyBlockConfig,
    imageReplyBlockConfig,
    flexReplyBlockConfig,
    stickerReplyBlockConfig
  ],
  priority: 2
};

/**
 * 獲取所有回覆積木配置
 */
export const getAllReplyBlockConfigs = () => [
  textReplyBlockConfig,
  imageReplyBlockConfig,
  flexReplyBlockConfig,
  stickerReplyBlockConfig
];

/**
 * 根據回覆類型獲取積木配置
 */
export const getReplyBlockConfigByType = (replyType: string) => {
  const configs = getAllReplyBlockConfigs();
  return configs.find(config => config.defaultData.replyType === replyType);
};