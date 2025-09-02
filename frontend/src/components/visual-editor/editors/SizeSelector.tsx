/**
 * 尺寸選擇器組件
 * 提供多種類型的尺寸選擇功能
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export type SizeType = 
  | 'text-size'
  | 'image-size' 
  | 'margin-padding'
  | 'spacing'
  | 'button-height'
  | 'border-width'
  | 'corner-radius';

interface SizeOption {
  value: string;
  label: string;
  description?: string;
}

// 不同類型的尺寸選項
const SIZE_OPTIONS: Record<SizeType, SizeOption[]> = {
  'text-size': [
    { value: 'xxs', label: '極極小 (XXS)', description: '10px' },
    { value: 'xs', label: '極小 (XS)', description: '12px' },
    { value: 'sm', label: '小 (SM)', description: '14px' },
    { value: 'md', label: '中 (MD)', description: '16px' },
    { value: 'lg', label: '大 (LG)', description: '18px' },
    { value: 'xl', label: '極大 (XL)', description: '20px' },
    { value: 'xxl', label: '極極大 (XXL)', description: '24px' },
    { value: '3xl', label: '超大 (3XL)', description: '28px' },
    { value: '4xl', label: '超超大 (4XL)', description: '32px' },
    { value: '5xl', label: '巨大 (5XL)', description: '36px' }
  ],
  'image-size': [
    { value: 'xxs', label: '極極小' },
    { value: 'xs', label: '極小' },
    { value: 'sm', label: '小' },
    { value: 'md', label: '中' },
    { value: 'lg', label: '大' },
    { value: 'xl', label: '極大' },
    { value: 'xxl', label: '極極大' },
    { value: '3xl', label: '超大' },
    { value: '4xl', label: '超超大' },
    { value: '5xl', label: '巨大' },
    { value: 'full', label: '滿寬' }
  ],
  'margin-padding': [
    { value: 'none', label: '無 (0px)' },
    { value: 'xs', label: '極小 (4px)' },
    { value: 'sm', label: '小 (8px)' },
    { value: 'md', label: '中 (16px)' },
    { value: 'lg', label: '大 (24px)' },
    { value: 'xl', label: '極大 (32px)' },
    { value: 'xxl', label: '極極大 (40px)' }
  ],
  'spacing': [
    { value: 'none', label: '無間距' },
    { value: 'xs', label: '極小間距' },
    { value: 'sm', label: '小間距' },
    { value: 'md', label: '中間距' },
    { value: 'lg', label: '大間距' },
    { value: 'xl', label: '極大間距' },
    { value: 'xxl', label: '極極大間距' }
  ],
  'button-height': [
    { value: 'sm', label: '小按鈕' },
    { value: 'md', label: '中按鈕' }
  ],
  'border-width': [
    { value: 'none', label: '無邊框' },
    { value: 'light', label: '細邊框' },
    { value: 'normal', label: '一般邊框' },
    { value: 'medium', label: '中邊框' },
    { value: 'semi-bold', label: '半粗邊框' },
    { value: 'bold', label: '粗邊框' }
  ],
  'corner-radius': [
    { value: 'none', label: '直角' },
    { value: 'xs', label: '極小圓角' },
    { value: 'sm', label: '小圓角' },
    { value: 'md', label: '中圓角' },
    { value: 'lg', label: '大圓角' },
    { value: 'xl', label: '極大圓角' },
    { value: 'xxl', label: '極極大圓角' }
  ]
};

interface SizeSelectorProps {
  type: SizeType;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showDescription?: boolean;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  type,
  value,
  onChange,
  label,
  placeholder,
  showDescription = true
}) => {
  const options = SIZE_OPTIONS[type] || [];
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-white/80 font-medium">{label}</label>
      )}
      
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="text-black">
          <SelectValue placeholder={placeholder || "選擇尺寸"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span>{option.label}</span>
                {showDescription && option.description && (
                  <span className="text-xs text-gray-500">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 顯示當前選擇的描述 */}
      {showDescription && selectedOption?.description && (
        <div className="text-xs text-white/60">
          當前值: {selectedOption.description}
        </div>
      )}
    </div>
  );
};

export default SizeSelector;