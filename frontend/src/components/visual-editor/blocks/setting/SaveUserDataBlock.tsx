/**
 * 儲存用戶資料積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { saveUserDataBlockConfig } from '../../../../constants/blockConstants';

/**
 * 儲存用戶資料積木組件
 */
export const SaveUserDataBlock: React.FC<BaseBlockProps> = (props) => {
  return (
    <BaseBlock 
      config={saveUserDataBlockConfig}
      {...props}
    >
      儲存用戶資料
    </BaseBlock>
  );
};

export default SaveUserDataBlock;