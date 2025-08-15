# 組件工具庫自動切換功能

## 功能概述

ModularBlockPalette 組件現在支援根據當前工作區上下文自動切換顯示的積木類型，提供更流暢的用戶體驗。

## 主要變更

### 1. 智能左側面板切換
- **邏輯編輯器**：顯示積木工具庫（邏輯積木）
- **Flex 設計器**：顯示積木工具庫（Flex 組件）
- **預覽與測試**：顯示預覽控制面板（模擬控制、設備預覽、積木統計、測試場景）
- **程式碼**：顯示程式碼控制面板（格式選擇、顯示選項、程式碼統計、品質檢查）

### 2. 新增專用控制面板

#### PreviewControlPanel（預覽控制面板）
- **模擬控制**：開始/暫停/重置模擬，調整模擬速度
- **設備預覽**：手機/平板/桌面視圖切換
- **積木統計**：總積木數、事件數、回覆數、控制數
- **測試場景**：快速測試常見場景（新用戶加入、發送訊息等）

#### CodeControlPanel（程式碼控制面板）
- **格式選擇**：JSON/YAML/JavaScript 格式切換
- **操作功能**：複製程式碼、下載檔案
- **顯示選項**：行號顯示、註解顯示、主題切換
- **程式碼統計**：積木數、行數、檔案大小、複雜度
- **品質檢查**：積木連接、事件處理、回覆邏輯檢查

### 3. 用戶界面調整
- 移除了手動切換標籤的功能
- 隱藏了標籤導航列
- 添加了「自動切換」指示器
- 保留了「顯示全部/僅顯示相容」的過濾功能
- 保持一致的左側面板寬度（320px）

### 3. 實現細節

```typescript
// 根據當前上下文自動決定活動標籤
const getActiveTab = () => {
  switch (currentContext) {
    case WorkspaceContext.LOGIC:
      return 'logic';
    case WorkspaceContext.FLEX:
      return 'flex';
    default:
      return 'all';
  }
};
```

## 用戶體驗改進

### 之前的行為
1. 用戶點擊「邏輯編輯器」標籤
2. 需要手動切換到「邏輯積木」標籤
3. 容易忘記切換，導致使用錯誤的積木

### 現在的行為
1. 用戶點擊「邏輯編輯器」標籤
2. 組件工具庫自動顯示邏輯積木
3. 用戶可以直接開始拖拽相關積木

### 同樣適用於 Flex 設計器
1. 用戶點擊「Flex 設計器」標籤
2. 組件工具庫自動顯示 Flex 組件
3. 用戶可以直接開始設計 Flex 訊息

### 預覽和程式碼模式
1. 用戶點擊「預覽與測試」或「程式碼」標籤
2. 組件工具庫自動隱藏（向左收起）
3. 提供更大的預覽/程式碼顯示空間

## 技術實現

### Workspace 組件改進
```typescript
// 判斷是否應該顯示積木選擇面板
const shouldShowBlockPalette = activeTab === 'logic' || activeTab === 'flex';

// 條件渲染 BlockPalette
{shouldShowBlockPalette && (
  <BlockPalette
    currentContext={getCurrentContext()}
    showAllBlocks={showAllBlocks}
    onShowAllBlocksChange={setShowAllBlocks}
  />
)}
```

### ModularBlockPalette 自動切換
- 使用 `value={getActiveTab()}` 控制 Tabs 組件
- 移除 `onValueChange` 處理器，禁用手動切換
- 保持所有標籤內容完整，確保功能正常

### 組件屬性
- `currentContext`: 當前工作區上下文（由 Workspace 組件傳入）
- `showAllBlocks`: 是否顯示所有積木（保留原有功能）
- `onShowAllBlocksChange`: 切換顯示模式的回調函數

## 測試覆蓋

- 驗證邏輯上下文時顯示邏輯積木
- 驗證 Flex 上下文時顯示 Flex 組件
- 驗證標籤導航被正確隱藏
- 驗證自動切換指示器顯示

## 向後兼容性

- 保持所有現有的 API 接口不變
- 所有積木定義和分類保持原樣
- 過濾功能繼續正常工作
- 拖拽功能不受影響
