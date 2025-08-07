/**
 * 圖片訊息事件積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { imageEventBlockConfig } from '../../../../constants/blockConstants';

/**
 * 圖片訊息事件積木組件
 */
export const ImageEventBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={imageEventBlockConfig}
      {...props}
    >
      當收到圖片訊息時
    </BaseBlock>
  );
};

export default ImageEventBlock;