/**
 * 顏色選擇器組件
 * 提供顏色選擇功能，支援預設顏色和自定義輸入
 */

import React, { useState } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Palette, Check } from 'lucide-react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  placeholder?: string;
  showPresets?: boolean;
}

// 預設顏色選項
const COLOR_PRESETS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  placeholder = "輸入顏色代碼 (例如: #FF0000)",
  showPresets = true
}) => {
  const [showPalette, setShowPalette] = useState(false);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setShowPalette(false);
  };

  const isValidColor = (color: string) => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color) || CSS.supports('color', color);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs text-white/80 font-medium">{label}</label>
      )}
      
      <div className="flex items-center space-x-2">
        {/* 顏色輸入框 */}
        <div className="flex-1 relative">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`text-black pr-10 ${
              value && !isValidColor(value) ? 'border-red-500' : ''
            }`}
          />
          
          {/* 顏色預覽 */}
          {value && isValidColor(value) && (
            <div
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: value }}
            />
          )}
        </div>

        {/* 調色盤按鈕 */}
        {showPresets && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPalette(!showPalette)}
            className="px-3"
          >
            <Palette className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 顏色驗證提示 */}
      {value && !isValidColor(value) && (
        <div className="text-xs text-red-400">
          請輸入有效的顏色代碼（例如：#FF0000）
        </div>
      )}

      {/* 預設顏色面板 */}
      {showPresets && showPalette && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-lg">
          <div className="text-xs text-gray-600 mb-2">選擇預設顏色：</div>
          <div className="grid grid-cols-10 gap-1">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`
                  w-6 h-6 rounded border-2 relative
                  ${value === color ? 'border-blue-500' : 'border-gray-300'}
                  hover:border-blue-400 transition-colors
                `}
                style={{ backgroundColor: color }}
                onClick={() => handlePresetClick(color)}
                title={color}
              >
                {value === color && (
                  <Check 
                    className={`w-3 h-3 absolute inset-0 m-auto ${
                      ['#000000', '#000080', '#800080'].includes(color) 
                        ? 'text-white' 
                        : 'text-black'
                    }`} 
                  />
                )}
              </button>
            ))}
          </div>
          
          {/* 常用透明度選項 */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">透明度選項：</div>
            <div className="flex space-x-2">
              {['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.5)'].map((color, index) => (
                <button
                  key={color}
                  type="button"
                  className={`
                    px-2 py-1 text-xs rounded border
                    ${value === color ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    hover:border-blue-400 transition-colors
                  `}
                  onClick={() => handlePresetClick(color)}
                >
                  {['透明', '淺灰', '中灰', '深灰', '淺白'][index]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;