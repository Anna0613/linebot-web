/**
 * 設定積木模組統一匯出
 */

import { BlockGroupConfig } from '../common/BlockConfig';
import { BlockCategory } from '../../../../types/block';

// 匯出所有設定積木組件
export { default as SetVariableBlock, setVariableBlockConfig } from './SetVariableBlock';
export { default as GetVariableBlock, getVariableBlockConfig } from './GetVariableBlock';
export { default as SaveUserDataBlock, saveUserDataBlockConfig } from './SaveUserDataBlock';

// 匯入所有配置
import { setVariableBlockConfig } from './SetVariableBlock';
import { getVariableBlockConfig } from './GetVariableBlock';
import { saveUserDataBlockConfig } from './SaveUserDataBlock';

/**
 * 設定積木分組配置
 */
export const settingBlockGroup: BlockGroupConfig = {
  groupId: 'setting',
  groupName: '設定',
  category: BlockCategory.SETTING,
  icon: 'Settings',
  blocks: [
    setVariableBlockConfig,
    getVariableBlockConfig,
    saveUserDataBlockConfig
  ],
  priority: 4
};

/**
 * 獲取所有設定積木配置
 */
export const getAllSettingBlockConfigs = () => [
  setVariableBlockConfig,
  getVariableBlockConfig,
  saveUserDataBlockConfig
];

/**
 * 根據設定類型獲取積木配置
 */
export const getSettingBlockConfigByType = (settingType: string) => {
  const configs = getAllSettingBlockConfigs();
  return configs.find(config => config.defaultData.settingType === settingType);
};