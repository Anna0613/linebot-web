/**
 * 文字內容積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { textContentBlockConfig } from '../../../../constants/blockConstants';

/**
 * 文字內容積木組件
 */
export const TextContentBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={textContentBlockConfig}
      {...props}
    >
      文字
    </BaseBlock>
  );
};

export default TextContentBlock;