/**
 * 取得變數積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { getVariableBlockConfig } from '../../../../constants/blockConstants';

/**
 * 取得變數積木組件
 */
export const GetVariableBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={getVariableBlockConfig}
      {...props}
    >
      取得變數
    </BaseBlock>
  );
};

export default GetVariableBlock;