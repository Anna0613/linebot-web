/**
 * 按鈕點擊事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 按鈕點擊事件積木配置
 */
export const postbackEventBlockConfig: BlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當按鈕被點擊時',
  description: '當用戶點擊按鈕時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當按鈕被點擊時',
    eventType: 'postback'
  },
  tooltip: '此積木會在用戶點擊按鈕時執行',
  priority: 4
};

/**
 * 按鈕點擊事件積木組件
 */
export const PostbackEventBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={postbackEventBlockConfig}
      {...props}
    >
      當按鈕被點擊時
    </BaseBlock>
  );
};

export default PostbackEventBlock;