/**
 * 對齊選擇器組件
 * 提供文字和元素對齊選項
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Button } from '../../ui/button';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export type AlignType = 'start' | 'end' | 'center' | 'justify';
export type GravityType = 'top' | 'bottom' | 'center';

interface AlignmentSelectorProps {
  type: 'align' | 'gravity' | 'both';
  alignValue?: AlignType;
  gravityValue?: GravityType;
  onAlignChange?: (value: AlignType) => void;
  onGravityChange?: (value: GravityType) => void;
  label?: string;
  showVisual?: boolean;
}

const ALIGN_OPTIONS = [
  { value: 'start', label: '左對齊', icon: AlignLeft },
  { value: 'center', label: '置中對齊', icon: AlignCenter },
  { value: 'end', label: '右對齊', icon: AlignRight },
  { value: 'justify', label: '兩端對齊', icon: AlignJustify }
];

const GRAVITY_OPTIONS = [
  { value: 'top', label: '頂部對齊' },
  { value: 'center', label: '垂直置中' },
  { value: 'bottom', label: '底部對齊' }
];

export const AlignmentSelector: React.FC<AlignmentSelectorProps> = ({
  type,
  alignValue,
  gravityValue,
  onAlignChange,
  onGravityChange,
  label,
  showVisual = true
}) => {
  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-white/90">{label}</label>
      )}

      {/* 水平對齊 */}
      {(type === 'align' || type === 'both') && (
        <div className="space-y-2">
          <label className="text-xs text-white/80">水平對齊</label>
          
          {showVisual ? (
            /* 視覺化按鈕組 */
            <div className="flex space-x-1 bg-white/10 rounded p-1">
              {ALIGN_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = alignValue === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onAlignChange?.(option.value as AlignType)}
                    className={`flex-1 h-8 ${
                      isSelected 
                        ? 'bg-white text-black hover:bg-white/90' 
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    title={option.label}
                  >
                    <Icon className="w-3 h-3" />
                  </Button>
                );
              })}
            </div>
          ) : (
            /* 下拉選單 */
            <Select 
              value={alignValue || 'start'} 
              onValueChange={(value: AlignType) => onAlignChange?.(value)}
            >
              <SelectTrigger className="text-black">
                <SelectValue placeholder="選擇水平對齊" />
              </SelectTrigger>
              <SelectContent>
                {ALIGN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <option.icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* 垂直對齊 */}
      {(type === 'gravity' || type === 'both') && (
        <div className="space-y-2">
          <label className="text-xs text-white/80">垂直對齊</label>
          
          <Select 
            value={gravityValue || 'top'} 
            onValueChange={(value: GravityType) => onGravityChange?.(value)}
          >
            <SelectTrigger className="text-black">
              <SelectValue placeholder="選擇垂直對齊" />
            </SelectTrigger>
            <SelectContent>
              {GRAVITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 對齊預覽 */}
      {showVisual && type === 'both' && (
        <div className="bg-white/5 p-3 rounded-lg">
          <div className="text-xs text-white/60 mb-2">對齊預覽:</div>
          <div 
            className={`
              border-2 border-dashed border-white/30 h-16 w-full rounded flex items-${gravityValue || 'top'} 
              ${alignValue === 'start' ? 'justify-start' : 
                alignValue === 'center' ? 'justify-center' : 
                alignValue === 'end' ? 'justify-end' : 'justify-between'}
            `}
          >
            <div className="bg-white/20 px-2 py-1 rounded text-xs text-white">
              內容
            </div>
          </div>
          <div className="text-xs text-white/50 mt-1">
            水平: {ALIGN_OPTIONS.find(opt => opt.value === alignValue)?.label} | 
            垂直: {GRAVITY_OPTIONS.find(opt => opt.value === gravityValue)?.label}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlignmentSelector;