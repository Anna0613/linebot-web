/**
 * 基礎積木組件
 * 提供所有積木的共用功能和標準化接口
 */

import React from 'react';
import { BlockConfig, BlockRenderProps } from './BlockConfig';
import { Badge } from '../../../ui/badge';
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
import { BlockCategory, WorkspaceContext } from '../../../../types/block';

/**
 * 基礎積木組件屬性接口
 */
export interface BaseBlockProps extends BlockRenderProps {
  /** 是否處於拖拽狀態 */
  isDragging?: boolean;
  /** 是否禁用拖拽 */
  disabled?: boolean;
  /** 自定義事件處理 */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * 獲取積木類別對應的圖示組件
 */
export const getCategoryIcon = (category: BlockCategory, className: string = "w-3 h-3") => {
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

/**
 * 基礎積木組件
 */
export const BaseBlock: React.FC<BaseBlockProps> = ({
  config,
  showCompatibilityBadge = true,
  className = "",
  isDragging = false,
  disabled = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  children
}) => {
  // 使用配置中的顏色，或根據類別獲取預設顏色
  const blockColor = config.color || getDefaultBlockColor(config.category);
  
  // 組合樣式類
  const baseClasses = `
    ${blockColor} 
    text-white 
    px-3 
    py-2 
    rounded-lg 
    cursor-move 
    text-sm 
    shadow-sm 
    hover:shadow-md 
    transition-all 
    duration-200
    ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
    ${disabled ? 'cursor-not-allowed opacity-60' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // 積木內容：優先使用 children，否則使用配置中的名稱
  const blockContent = children || config.name;

  return (
    <div 
      className={baseClasses}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={config.tooltip || config.description}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* 積木圖示 */}
          {getCategoryIcon(config.category)}
          
          {/* 積木名稱/內容 */}
          <span>{blockContent}</span>
        </div>
        
        {/* 相容性標籤 */}
        {showCompatibilityBadge && config.compatibility && (
          <Badge 
            variant="secondary" 
            className="ml-2 text-xs bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            {getCompatibilityText(config.compatibility)}
          </Badge>
        )}
      </div>
      
      {/* 拖拽時的視覺提示 */}
      {isDragging && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-white/50 bg-white/10 pointer-events-none" />
      )}
    </div>
  );
};

/**
 * 積木容器組件
 * 用於包裝積木分組
 */
export interface BlockContainerProps {
  /** 容器標題 */
  title: string;
  /** 容器圖示 */
  icon: React.ComponentType<{ className?: string }>;
  /** 子元素 */
  children: React.ReactNode;
  /** 是否摺疊 */
  collapsed?: boolean;
  /** 摺疊狀態改變回調 */
  onToggleCollapse?: () => void;
  /** 容器類別（用於相容性檢查） */
  categoryType?: BlockCategory;
  /** 當前工作區上下文 */
  context?: WorkspaceContext;
  /** 自定義樣式類 */
  className?: string;
}

export const BlockContainer: React.FC<BlockContainerProps> = ({
  title,
  icon: Icon,
  children,
  collapsed = false,
  onToggleCollapse,
  categoryType,
  context,
  className = ""
}) => {
  // 檢查是否相容（簡化版，完整版應使用 blockCompatibility.ts）
  const isCompatible = !categoryType || !context || true; // 暫時設為總是相容

  return (
    <div className={`mb-4 ${!isCompatible ? 'opacity-50' : ''} ${className}`}>
      {/* 容器標題 */}
      <div 
        className="flex items-center justify-between mb-2 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 mr-2" />
          {title}
          {!isCompatible && (
            <div className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              其他模式專用
            </div>
          )}
        </div>
        
        {/* 摺疊指示器 */}
        {onToggleCollapse && (
          <div className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>
            <ArrowRight className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* 容器內容 */}
      {!collapsed && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default BaseBlock;