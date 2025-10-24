import React from 'react';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import type { BlockRendererProps } from './types';

const SettingBlock: React.FC<BlockRendererProps> = ({ block, isEditing, blockData, setBlockData }) => {
  return (
    <div>
      <div className="font-medium">{block.blockData.title}</div>
      {isEditing && (
        <div className="mt-2 space-y-2">
          {block.blockData.settingType === 'setVariable' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Input
                  placeholder="變數名稱（例如: user_count）"
                  value={String((blockData as any).variableName || '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value) || value === '';
                    if (isValid) setBlockData({ ...blockData, variableName: value });
                  }}
                  className="text-black"
                />
                {(blockData as any).variableName && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String((blockData as any).variableName)) && (
                  <div className="text-xs text-red-400">⚠️ 變數名稱只能包含字母、數字、底線，且不能以數字開頭</div>
                )}
              </div>

              <Select value={String((blockData as any).variableType || 'string')} onValueChange={(value) => setBlockData({ ...blockData, variableType: value })}>
                <SelectTrigger className="text-black">
                  <SelectValue placeholder="變數類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">文字</SelectItem>
                  <SelectItem value="number">數字</SelectItem>
                  <SelectItem value="boolean">布林值</SelectItem>
                  <SelectItem value="array">陣列</SelectItem>
                  <SelectItem value="object">物件</SelectItem>
                </SelectContent>
              </Select>

              {(blockData as any).variableType === 'number' ? (
                <Input type="number" placeholder="數字值（例如: 0）" value={String((blockData as any).variableValue || '')} onChange={(e) => setBlockData({ ...blockData, variableValue: e.target.value })} className="text-black" />
              ) : (blockData as any).variableType === 'boolean' ? (
                <Select value={String((blockData as any).variableValue || 'false')} onValueChange={(value) => setBlockData({ ...blockData, variableValue: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="布林值" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True（真）</SelectItem>
                    <SelectItem value="false">False（假）</SelectItem>
                  </SelectContent>
                </Select>
              ) : (blockData as any).variableType === 'array' ? (
                <Input placeholder="陣列值（例如: [1, 2, 3]）" value={String((blockData as any).variableValue || '')} onChange={(e) => setBlockData({ ...blockData, variableValue: e.target.value })} className="text-black" />
              ) : (blockData as any).variableType === 'object' ? (
                <Input placeholder="物件值（例如: {'key': 'value'}）" value={String((blockData as any).variableValue || '')} onChange={(e) => setBlockData({ ...blockData, variableValue: e.target.value })} className="text-black" />
              ) : (
                <Input placeholder="文字值（例如: Hello）" value={String((blockData as any).variableValue || '')} onChange={(e) => setBlockData({ ...blockData, variableValue: e.target.value })} className="text-black" />
              )}

              <div className="text-xs text-white/60 bg-white/10 p-2 rounded">
                {(blockData as any).variableType === 'string' && '文字類型：用於儲存文字內容'}
                {(blockData as any).variableType === 'number' && '數字類型：用於儲存數值'}
                {(blockData as any).variableType === 'boolean' && '布林值類型：用於儲存真/假值'}
                {(blockData as any).variableType === 'array' && '陣列類型：用於儲存多個值的列表'}
                {(blockData as any).variableType === 'object' && '物件類型：用於儲存鍵值對'}
              </div>
            </div>
          )}

          {block.blockData.settingType === 'getVariable' && (
            <div className="space-y-2">
              <Select value={(blockData as any).variableSelectMode || 'select'} onValueChange={(value) => setBlockData({ ...blockData, variableSelectMode: value })}>
                <SelectTrigger className="text-black">
                  <SelectValue placeholder="選擇模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">從清單選擇</SelectItem>
                  <SelectItem value="custom">自訂變數名稱</SelectItem>
                </SelectContent>
              </Select>

              {(blockData as any).variableSelectMode === 'select' ? (
                <Select value={(blockData as any).variableName || ''} onValueChange={(value) => setBlockData({ ...blockData, variableName: value })}>
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="選擇變數" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user_count">user_count</SelectItem>
                    <SelectItem value="user_name">user_name</SelectItem>
                    <SelectItem value="message_count">message_count</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="變數名稱" value={(blockData as any).variableName || ''} onChange={(e) => setBlockData({ ...blockData, variableName: e.target.value })} className="text-black" />
              )}

              <Input placeholder="預設值（可選）" value={(blockData as any).defaultValue || ''} onChange={(e) => setBlockData({ ...blockData, defaultValue: e.target.value })} className="text-black" />

              {!(blockData as any).variableName && <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">⚠️ 請選擇或輸入變數名稱</div>}
            </div>
          )}

          {block.blockData.settingType === 'saveUserData' && (
            <div className="space-y-2">
              <Input placeholder="資料鍵名" value={(blockData as any).dataKey || ''} onChange={(e) => setBlockData({ ...blockData, dataKey: e.target.value })} className="text-black" />
              <Input placeholder="資料值" value={(blockData as any).dataValue || ''} onChange={(e) => setBlockData({ ...blockData, dataValue: e.target.value })} className="text-black" />
              <Input placeholder="用戶ID（可選，預設為當前用戶）" value={(blockData as any).userId || ''} onChange={(e) => setBlockData({ ...blockData, userId: e.target.value })} className="text-black" />
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="text-xs text-white/70 mt-1">
          {block.blockData.settingType === 'setVariable' && (
            <div>
              設定變數: {(blockData as any).variableName || '未設定'} = {(blockData as any).variableValue || '未設定'}
              {(blockData as any).variableType && (blockData as any).variableType !== 'string' && <span className="ml-1">({(blockData as any).variableType})</span>}
            </div>
          )}
          {block.blockData.settingType === 'getVariable' && (
            <div>
              取得變數: {(blockData as any).variableName || '未設定'}
              {(blockData as any).defaultValue && <span className="ml-1">預設值: {(blockData as any).defaultValue}</span>}
            </div>
          )}
          {block.blockData.settingType === 'saveUserData' && (
            <div>
              儲存資料: {(blockData as any).dataKey || '未設定'} = {(blockData as any).dataValue || '未設定'}
              {(blockData as any).userId && <div>目標用戶: {(blockData as any).userId}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingBlock;
