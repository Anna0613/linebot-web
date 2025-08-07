/**
 * 貼圖回覆積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { stickerReplyBlockConfig } from '../../../../constants/blockConstants';

/**
 * 貼圖回覆積木組件
 */
export const StickerReplyBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={stickerReplyBlockConfig}
      {...props}
    >
      回覆貼圖
    </BaseBlock>
  );
};

export default StickerReplyBlock;