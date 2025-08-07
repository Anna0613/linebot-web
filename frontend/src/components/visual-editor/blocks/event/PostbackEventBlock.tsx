/**
 * 按鈕點擊事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { postbackEventBlockConfig } from '../../../../constants/blockConstants';

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