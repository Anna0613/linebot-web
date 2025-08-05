/**
 * 控制積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有控制積木組件
export { default as IfThenBlock, ifThenBlockConfig } from './IfThenBlock';
export { default as LoopBlock, loopBlockConfig } from './LoopBlock';
export { default as WaitBlock, waitBlockConfig } from './WaitBlock';

// 匯入所有配置
import { ifThenBlockConfig } from './IfThenBlock';
import { loopBlockConfig } from './LoopBlock';
import { waitBlockConfig } from './WaitBlock';

/**
 * 控制積木分組配置
 */
export const controlBlockGroup: BlockGroupConfig = {
  groupId: 'control',
  groupName: '控制',
  category: BlockCategory.CONTROL,
  icon: 'ArrowRight',
  blocks: [
    ifThenBlockConfig,
    loopBlockConfig,
    waitBlockConfig
  ],
  priority: 3
};

/**
 * 獲取所有控制積木配置
 */
export const getAllControlBlockConfigs = () => [
  ifThenBlockConfig,
  loopBlockConfig,
  waitBlockConfig
];

/**
 * 根據控制類型獲取積木配置
 */
export const getControlBlockConfigByType = (controlType: string) => {
  const configs = getAllControlBlockConfigs();
  return configs.find(config => config.defaultData.controlType === controlType);
};