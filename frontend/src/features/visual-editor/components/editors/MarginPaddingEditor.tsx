/**
 * 邊距和內邊距編輯器組件
 * 提供四方向邊距設定功能
 */

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link, Unlink } from 'lucide-react';

export interface MarginPaddingData {
  all?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

interface MarginPaddingEditorProps {
  type: 'margin' | 'padding';
  value: MarginPaddingData;
  onChange: (value: MarginPaddingData) => void;
  label?: string;
  showUnifiedMode?: boolean;
}

const SIZE_OPTIONS = [
  { value: 'none', label: '無 (0)' },
  { value: 'xs', label: '極小 (4px)' },
  { value: 'sm', label: '小 (8px)' },
  { value: 'md', label: '中 (16px)' },
  { value: 'lg', label: '大 (24px)' },
  { value: 'xl', label: '極大 (32px)' },
  { value: 'xxl', label: '極極大 (40px)' }
];

export const MarginPaddingEditor: React.FC<MarginPaddingEditorProps> = ({
  type,
  value,
  onChange,
  label,
  showUnifiedMode = true
}) => {
  const [isUnified, setIsUnified] = React.useState(
    value.all !== undefined || 
    (value.top === value.right && value.right === value.bottom && value.bottom === value.left)
  );

  const displayLabel = label || (type === 'margin' ? '邊距設定' : '內邊距設定');

  const handleUnifiedChange = (newValue: string) => {
    onChange({
      all: newValue,
      top: undefined,
      right: undefined,
      bottom: undefined,
      left: undefined
    });
  };

  const handleIndividualChange = (direction: keyof MarginPaddingData, newValue: string) => {
    onChange({
      ...value,
      all: undefined,
      [direction]: newValue
    });
  };

  const toggleUnifiedMode = () => {
    if (isUnified) {
      // 切換到分別設定模式
      const currentValue = value.all || value.top || 'none';
      onChange({
        top: currentValue,
        right: currentValue,
        bottom: currentValue,
        left: currentValue,
        all: undefined
      });
    } else {
      // 切換到統一設定模式
      const commonValue = value.top || 'none';
      onChange({
        all: commonValue,
        top: undefined,
        right: undefined,
        bottom: undefined,
        left: undefined
      });
    }
    setIsUnified(!isUnified);
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-800">{displayLabel}</label>
        {showUnifiedMode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleUnifiedMode}
            className="h-6 px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title={isUnified ? "分別設定各邊" : "統一設定所有邊"}
          >
            {isUnified ? <Unlink className="w-3 h-3" /> : <Link className="w-3 h-3" />}
            <span className="ml-1 text-xs">
              {isUnified ? "分別設定" : "統一設定"}
            </span>
          </Button>
        )}
      </div>

      {isUnified ? (
        /* 統一設定模式 */
        <div className="space-y-1">
          <label className="text-xs text-slate-600">所有邊距</label>
          <Select 
            value={value.all || 'none'} 
            onValueChange={handleUnifiedChange}
          >
            <SelectTrigger className="text-black">
              <SelectValue placeholder="選擇邊距大小" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        /* 分別設定模式 */
        <div className="grid grid-cols-2 gap-3">
          {([
            ['top', '上'],
            ['right', '右'],
            ['bottom', '下'],
            ['left', '左'],
          ] as Array<[keyof MarginPaddingData, string]>).map(([direction, directionLabel]) => (
            <div key={direction} className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">{directionLabel}</label>
              <Select 
                value={value[direction] || 'none'} 
                onValueChange={(val) => handleIndividualChange(direction, val)}
              >
                <SelectTrigger className="text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* 預覽說明 */}
      <div className="rounded bg-slate-50 p-2 text-xs text-slate-500">
        {isUnified ? (
          <span>所有邊都設定為: {SIZE_OPTIONS.find(opt => opt.value === (value.all || 'none'))?.label}</span>
        ) : (
          <span>
            上:{SIZE_OPTIONS.find(opt => opt.value === (value.top || 'none'))?.label.split(' ')[0]} | 
            右:{SIZE_OPTIONS.find(opt => opt.value === (value.right || 'none'))?.label.split(' ')[0]} | 
            下:{SIZE_OPTIONS.find(opt => opt.value === (value.bottom || 'none'))?.label.split(' ')[0]} | 
            左:{SIZE_OPTIONS.find(opt => opt.value === (value.left || 'none'))?.label.split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  );
};

export default MarginPaddingEditor;
