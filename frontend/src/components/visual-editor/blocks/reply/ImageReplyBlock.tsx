/**
 * 圖片回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { imageReplyBlockConfig } from '../../../../constants/blockConstants';

/**
 * 圖片回覆積木組件
 */
export const ImageReplyBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={imageReplyBlockConfig}
      {...props}
    >
      回覆圖片訊息
    </BaseBlock>
  );
};

export default ImageReplyBlock;