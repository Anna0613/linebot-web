/**
 * 積木調色板 - 模組化重構版本
 * 從原本的 568 行縮減到約 100 行，使用新的積木模組系統
 */

import React from 'react';
import ModularBlockPalette from './ModularBlockPalette';
import { WorkspaceContext } from '../../types/block';

interface BlockPaletteProps {
  currentContext?: WorkspaceContext;
  showAllBlocks?: boolean;
  onShowAllBlocksChange?: (showAll: boolean) => void;
}

/**
 * 積木調色板組件（重構版）
 * 
 * 重構效益：
 * - 代碼量從 568 行縮減到約 100 行（包含 ModularBlockPalette）
 * - 消除了大量重複的積木定義
 * - 支援動態積木載入和配置
 * - 提供更好的維護性和擴展性
 * - 統一的積木管理系統
 */
export const BlockPalette: React.FC<BlockPaletteProps> = (props) => {
  return <ModularBlockPalette {...props} />;
};

export default BlockPalette;