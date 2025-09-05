/**
 * 積木實用工具函數和組件
 */

/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { 
  Zap, 
  MessageSquare, 
  ArrowRight, 
  Settings, 
  Square, 
  Type, 
  MousePointer,
  Info 
} from 'lucide-react';
import { BlockCategory, WorkspaceContext } from '../types/block';

/**
 * 積木類別圖示組件
 */
interface CategoryIconProps {
  category: BlockCategory;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  category, 
  className = "w-3 h-3" 
}) => {
  switch (category) {
    case BlockCategory.EVENT:
      return <Zap className={className} />;
    case BlockCategory.REPLY:
      return <MessageSquare className={className} />;
    case BlockCategory.CONTROL:
      return <ArrowRight className={className} />;
    case BlockCategory.SETTING:
      return <Settings className={className} />;
    case BlockCategory.FLEX_CONTAINER:
      return <Square className={className} />;
    case BlockCategory.FLEX_CONTENT:
      return <Type className={className} />;
    case BlockCategory.FLEX_LAYOUT:
      return <MousePointer className={className} />;
    default:
      return <Info className={className} />;
  }
};

/**
 * 獲取積木類別對應的圖示組件 (向後相容)
 */
export const getCategoryIcon = (category: BlockCategory, className: string = "w-3 h-3") => {
  return <CategoryIcon category={category} className={className} />;
};

/**
 * 獲取相容性描述文字
 */
export const getCompatibilityText = (compatibility: WorkspaceContext[]): string => {
  if (compatibility.length === 2) {
    return "通用";
  } else if (compatibility.includes(WorkspaceContext.LOGIC)) {
    return "邏輯";
  } else if (compatibility.includes(WorkspaceContext.FLEX)) {
    return "Flex";
  }
  return "未知";
};

/**
 * 獲取積木預設顏色
 */
export const getDefaultBlockColor = (category: BlockCategory): string => {
  switch (category) {
    case BlockCategory.EVENT:
      return "bg-orange-500";
    case BlockCategory.REPLY:
      return "bg-green-500";
    case BlockCategory.CONTROL:
      return "bg-purple-500";
    case BlockCategory.SETTING:
      return "bg-gray-500";
    case BlockCategory.FLEX_CONTAINER:
      return "bg-indigo-500";
    case BlockCategory.FLEX_CONTENT:
      return "bg-blue-500";
    case BlockCategory.FLEX_LAYOUT:
      return "bg-teal-500";
    default:
      return "bg-gray-400";
  }
};
