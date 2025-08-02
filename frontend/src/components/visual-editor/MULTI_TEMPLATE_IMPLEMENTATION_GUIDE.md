# 多邏輯模板與 FlexMessage 功能實作指南

## 功能概述

本次實作為 visual-editor 新增了支援同個機器人創建與運行多個邏輯模板和 FlexMessage 的功能。

## 主要功能

### 1. 多邏輯模板管理
- 用戶可以為單個 Bot 創建多個邏輯模板
- 支援邏輯模板的選擇、創建、編輯和儲存
- 顯示邏輯模板的啟用狀態
- 每個邏輯模板可以獨立編輯和儲存

### 2. 多 FlexMessage 管理
- 用戶可以創建多個 FlexMessage
- 支援 FlexMessage 的選擇、創建、編輯和儲存
- FlexMessage 與邏輯模板獨立管理

### 3. 用戶界面改進
- ProjectManager 組件新增了邏輯模板和 FlexMessage 選擇器
- Workspace 組件的標籤頁顯示當前編輯的模板/訊息名稱
- 改進的創建和管理界面

## 實作的組件修改

### ProjectManager.tsx
- 新增邏輯模板選擇器和管理功能
- 新增 FlexMessage 選擇器和管理功能
- 支援創建新的邏輯模板和 FlexMessage
- 分離的儲存功能（邏輯模板儲存、FlexMessage 儲存）

### VisualBotEditor.tsx
- 新增多邏輯模板和 FlexMessage 的狀態管理
- 實作邏輯模板和 FlexMessage 的選擇、載入、創建、儲存邏輯
- 整合現有的 API 服務

### Workspace.tsx
- 在標籤頁顯示當前編輯的邏輯模板和 FlexMessage 名稱
- 在 DropZone 標題中顯示當前模板/訊息名稱

## API 整合

使用現有的 VisualEditorApi 服務：

### 邏輯模板相關
- `getBotLogicTemplatesSummary()` - 取得邏輯模板列表
- `getLogicTemplate()` - 取得特定邏輯模板
- `createLogicTemplate()` - 創建新邏輯模板
- `updateLogicTemplate()` - 更新邏輯模板
- `activateLogicTemplate()` - 啟用邏輯模板

### FlexMessage 相關
- `getUserFlexMessagesSummary()` - 取得 FlexMessage 列表
- `getUserFlexMessages()` - 取得完整 FlexMessage 資料
- `createFlexMessage()` - 創建新 FlexMessage
- `updateFlexMessage()` - 更新 FlexMessage

## 使用流程

1. **選擇 Bot**: 用戶首先選擇要編輯的 Bot
2. **選擇邏輯模板**: 從邏輯模板下拉選單中選擇或創建新的邏輯模板
3. **選擇 FlexMessage**: 從 FlexMessage 下拉選單中選擇或創建新的 FlexMessage
4. **編輯積木**: 在對應的標籤頁（邏輯編輯器/Flex 設計器）中編輯積木
5. **儲存**: 使用分別的儲存按鈕儲存邏輯模板或 FlexMessage

## 數據隔離

- 每個邏輯模板的積木數據獨立儲存
- 每個 FlexMessage 的積木數據獨立儲存
- 切換模板/訊息時會自動載入對應的積木數據
- 修改不會影響其他模板/訊息

## 兼容性

- 保持與現有積木系統的完全兼容
- 支援舊格式積木的自動遷移
- 保留原有的專案匯入/匯出功能

## 後續擴展建議

1. **邏輯模板激活功能**: 實作邏輯模板的啟用/停用切換
2. **模板複製功能**: 支援複製現有模板
3. **模板重命名功能**: 支援模板重命名
4. **模板刪除功能**: 支援模板刪除（需要確認對話框）
5. **批次操作**: 支援批次管理多個模板
6. **版本控制**: 為模板添加版本控制功能

## 錯誤處理

- API 錯誤的友善提示
- 載入失敗時的回退機制
- 儲存失敗時的重試機制
- 網路錯誤的處理

## 效能考量

- 延遲載入模板數據（僅在選擇時載入）
- 快取已載入的模板數據
- 最小化不必要的 API 請求