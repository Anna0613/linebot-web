/**
 * 圖片內容積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { imageContentBlockConfig } from '../../../../constants/blockConstants';

/**
 * 圖片內容積木組件
 */
export const ImageContentBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={imageContentBlockConfig}
      {...props}
    >
      圖片
    </BaseBlock>
  );
};

export default ImageContentBlock;