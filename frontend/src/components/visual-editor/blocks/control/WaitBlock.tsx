/**
 * 等待延遲積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { waitBlockConfig } from '../../../../constants/blockConstants';

/**
 * 等待延遲積木組件
 */
export const WaitBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={waitBlockConfig}
      {...props}
    >
      等待
    </BaseBlock>
  );
};

export default WaitBlock;