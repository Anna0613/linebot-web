/**
 * 設定變數積木
 */

import React from 'react';
import { BaseBlock, BaseBlockProps } from '../common/BaseBlock';
import { BlockConfig } from '../common/BlockConfig';
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 設定變數積木配置
 */
export const setVariableBlockConfig: BlockConfig = {
  blockType: 'setting',
  category: BlockCategory.SETTING,
  name: '設定變數',
  description: '設定或更新變數的值',
  color: 'bg-gray-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '設定變數',
    settingType: 'setVariable',
    variableName: '',
    variableValue: '',
    variableType: 'string'
  },
  tooltip: '使用此積木設定變數值',
  priority: 1
};

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