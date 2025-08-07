/**
 * 設定變數積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { setVariableBlockConfig } from '../../../../constants/blockConstants';

/**
 * 設定變數積木組件
 */
export const SetVariableBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={setVariableBlockConfig}
      {...props}
    >
      設定變數
    </BaseBlock>
  );
};

export default SetVariableBlock;