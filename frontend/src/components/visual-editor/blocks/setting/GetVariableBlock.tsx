/**
 * 取得變數積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 取得變數積木配置
 */
export const getVariableBlockConfig: BlockConfig = {
  blockType: 'setting',
  category: BlockCategory.SETTING,
  name: '取得變數',
  description: '取得變數的值',
  color: 'bg-gray-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '取得變數',
    settingType: 'getVariable',
    variableName: '',
    defaultValue: ''
  },
  tooltip: '使用此積木取得變數值',
  priority: 2
};

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