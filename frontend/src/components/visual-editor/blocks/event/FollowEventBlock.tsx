/**
 * 用戶關注事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { followEventBlockConfig } from '../../../../constants/blockConstants';

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