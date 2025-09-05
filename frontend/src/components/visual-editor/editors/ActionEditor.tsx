/**
 * 動作編輯器組件
 * 用於編輯按鈕和圖片等元素的動作設定
 */

import React from 'react';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

export interface ActionData {
  type: 'postback' | 'uri' | 'message' | 'datetimepicker' | 'camera' | 'cameraRoll' | 'location';
  label?: string;
  data?: string;
  text?: string;
  uri?: string;
  altUri?: {
    desktop?: string;
  };
  displayText?: string;
  inputOption?: 'closeRichMenu' | 'openRichMenu' | 'openKeyboard' | 'openVoice';
  fillInText?: string;
  // DatetimePicker specific
  mode?: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
}

interface ActionEditorProps {
  value: ActionData;
  onChange: (action: ActionData) => void;
  label?: string;
  showLabel?: boolean;
}

export const ActionEditor: React.FC<ActionEditorProps> = ({
  value,
  onChange,
  label = "動作設定",
  showLabel = true
}) => {
  const updateAction = (updates: Partial<ActionData>) => {
    onChange({ ...value, ...updates });
  };

  const actionTypeOptions = [
    { value: 'postback', label: 'Postback（回傳資料）' },
    { value: 'uri', label: 'URI（開啟網址）' },
    { value: 'message', label: 'Message（發送訊息）' },
    { value: 'datetimepicker', label: 'DateTimePicker（日期時間選擇）' },
    { value: 'camera', label: 'Camera（開啟相機）' },
    { value: 'cameraRoll', label: 'Camera Roll（開啟相簿）' },
    { value: 'location', label: 'Location（分享位置）' }
  ];

  const inputOptions = [
    { value: 'closeRichMenu', label: '關閉圖文選單' },
    { value: 'openRichMenu', label: '開啟圖文選單' },
    { value: 'openKeyboard', label: '開啟鍵盤' },
    { value: 'openVoice', label: '開啟語音輸入' }
  ];

  return (
    <div className="space-y-3 p-3 bg-white/5 rounded-lg">
      {showLabel && (
        <div className="text-sm font-medium text-white/90">{label}</div>
      )}

      {/* 動作類型選擇 */}
      <div className="space-y-1">
        <label className="text-xs text-white/80">動作類型</label>
        <Select 
          value={value.type} 
          onValueChange={(type: ActionData['type']) => updateAction({ type })}
        >
          <SelectTrigger className="text-black">
            <SelectValue placeholder="選擇動作類型" />
          </SelectTrigger>
          <SelectContent>
            {actionTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 標籤文字 */}
      <div className="space-y-1">
        <label className="text-xs text-white/80">按鈕標籤</label>
        <Input
          type="text"
          placeholder="按鈕顯示文字"
          value={value.label || ''}
          onChange={(e) => updateAction({ label: e.target.value })}
          className="text-black"
        />
      </div>

      {/* 根據動作類型顯示不同的設定選項 */}
      {value.type === 'postback' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-white/80">回傳資料</label>
            <Input
              type="text"
              placeholder="傳送給機器人的資料"
              value={value.data || ''}
              onChange={(e) => updateAction({ data: e.target.value })}
              className="text-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/80">顯示文字（可選）</label>
            <Input
              type="text"
              placeholder="點擊後顯示在聊天室的文字"
              value={value.displayText || ''}
              onChange={(e) => updateAction({ displayText: e.target.value })}
              className="text-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/80">輸入選項</label>
            <Select
              value={value.inputOption || 'none'}
              onValueChange={(inputOption) => updateAction({ inputOption: inputOption === 'none' ? undefined : inputOption as ActionData['inputOption'] })}
            >
              <SelectTrigger className="text-black">
                <SelectValue placeholder="選擇輸入選項（可選）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">無特殊選項</SelectItem>
                {inputOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {value.type === 'uri' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-white/80">網址</label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={value.uri || ''}
              onChange={(e) => updateAction({ uri: e.target.value })}
              className="text-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/80">桌面版網址（可選）</label>
            <Input
              type="url"
              placeholder="https://desktop.example.com"
              value={value.altUri?.desktop || ''}
              onChange={(e) => updateAction({ 
                altUri: { ...value.altUri, desktop: e.target.value }
              })}
              className="text-black"
            />
          </div>
        </>
      )}

      {value.type === 'message' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-white/80">發送訊息</label>
            <Textarea
              placeholder="點擊後要發送的訊息內容"
              value={value.text || ''}
              onChange={(e) => updateAction({ text: e.target.value })}
              className="text-black"
              rows={3}
            />
          </div>
        </>
      )}

      {value.type === 'datetimepicker' && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-white/80">選擇模式</label>
            <Select 
              value={value.mode || 'date'} 
              onValueChange={(mode: ActionData['mode']) => updateAction({ mode })}
            >
              <SelectTrigger className="text-black">
                <SelectValue placeholder="選擇日期時間模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">僅日期</SelectItem>
                <SelectItem value="time">僅時間</SelectItem>
                <SelectItem value="datetime">日期和時間</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-white/80">初始值</label>
              <Input
                type={value.mode === 'time' ? 'time' : value.mode === 'date' ? 'date' : 'datetime-local'}
                value={value.initial || ''}
                onChange={(e) => updateAction({ initial: e.target.value })}
                className="text-black"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/80">最小值</label>
              <Input
                type={value.mode === 'time' ? 'time' : value.mode === 'date' ? 'date' : 'datetime-local'}
                value={value.min || ''}
                onChange={(e) => updateAction({ min: e.target.value })}
                className="text-black"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/80">最大值</label>
              <Input
                type={value.mode === 'time' ? 'time' : value.mode === 'date' ? 'date' : 'datetime-local'}
                value={value.max || ''}
                onChange={(e) => updateAction({ max: e.target.value })}
                className="text-black"
              />
            </div>
          </div>
        </>
      )}

      {/* 填充文字（適用於部分類型） */}
      {['camera', 'cameraRoll', 'location'].includes(value.type) && (
        <div className="space-y-1">
          <label className="text-xs text-white/80">填充文字（可選）</label>
          <Input
            type="text"
            placeholder="點擊後在輸入框中顯示的文字"
            value={value.fillInText || ''}
            onChange={(e) => updateAction({ fillInText: e.target.value })}
            className="text-black"
          />
        </div>
      )}
    </div>
  );
};

export default ActionEditor;