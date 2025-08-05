/**
 * 儲存用戶資料積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 儲存用戶資料積木配置
 */
export const saveUserDataBlockConfig: BlockConfig = {
  blockType: 'setting',
  category: BlockCategory.SETTING,
  name: '儲存用戶資料',
  description: '儲存或更新用戶的個人資料',
  color: 'bg-gray-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '儲存用戶資料',
    settingType: 'saveUserData',
    dataKey: '',
    dataValue: '',
    userId: ''
  },
  tooltip: '使用此積木儲存用戶的個人資料',
  priority: 3
};

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