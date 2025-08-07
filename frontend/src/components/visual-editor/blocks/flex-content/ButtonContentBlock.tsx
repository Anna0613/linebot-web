/**
 * 按鈕內容積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { buttonContentBlockConfig } from '../../../../constants/blockConstants';

/**
 * 按鈕內容積木組件
 */
export const ButtonContentBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={buttonContentBlockConfig}
      {...props}
    >
      按鈕
    </BaseBlock>
  );
};

export default ButtonContentBlock;