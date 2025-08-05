/**
 * 用戶關注事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 用戶關注事件積木配置
 */
export const followEventBlockConfig: BlockConfig = {
  blockType: 'event',
  category: BlockCategory.EVENT,
  name: '當用戶加入好友時',
  description: '當用戶加入為好友時觸發此事件',
  color: 'bg-orange-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '當用戶加入好友時',
    eventType: 'follow'
  },
  tooltip: '此積木會在用戶加入好友時執行',
  priority: 3
};

/**
 * 用戶關注事件積木組件
 */
export const FollowEventBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={followEventBlockConfig}
      {...props}
    >
      當用戶加入好友時
    </BaseBlock>
  );
};

export default FollowEventBlock;