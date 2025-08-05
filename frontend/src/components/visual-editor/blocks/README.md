# LINE Bot 視覺編輯器積木模組系統

## 📋 概述

這是一個完全模組化的積木系統，將原本 568 行的 `BlockPalette.tsx` 重構為可維護的模組化架構。

## 🏗️ 架構概覽

```
blocks/
├── common/                    # 共用系統
│   ├── BlockConfig.ts        # 積木配置介面和驗證
│   ├── BlockFactory.ts       # 積木工廠和管理系統
│   ├── BaseBlock.tsx         # 基礎積木組件
│   └── index.ts              # 統一匯出
├── event/                    # 事件積木模組
├── reply/                    # 回覆積木模組
├── control/                  # 控制積木模組
├── setting/                  # 設定積木模組
├── flex-container/           # Flex 容器積木模組
├── flex-content/             # Flex 內容積木模組
├── flex-layout/              # Flex 佈局積木模組
├── test-blocks.ts            # 測試檔案
├── README.md (此檔案)
└── index.ts                  # 主要匯出入口
```

## 🎯 重構效益

### 程式碼改善
- **代碼量減少 85%**: 從 568 行縮減到約 100 行
- **消除重複**: 移除積木定義的重複代碼
- **提升維護性**: 每個積木模組獨立維護
- **增強擴展性**: 新增積木只需要在對應模組中添加

### 系統優勢
- **配置化管理**: 積木定義完全配置化
- **動態載入**: 支援動態積木註冊和管理
- **類型安全**: 完整的 TypeScript 類型支援
- **錯誤處理**: 內建驗證和錯誤恢復機制

## 🚀 使用方式

### 基本使用
```typescript
import { BlockPalette } from './BlockPalette';
import { WorkspaceContext } from '../../types/block';

// 在組件中使用
<BlockPalette 
  currentContext={WorkspaceContext.LOGIC}
  showAllBlocks={true}
  onShowAllBlocksChange={(showAll) => setShowAll(showAll)}
/>
```

### 初始化積木系統
```typescript
import { initializeBlockFactory, getBlockStatistics } from './blocks';

// 手動初始化（通常不需要，系統會自動初始化）
initializeBlockFactory();

// 獲取統計資訊
const stats = getBlockStatistics();
console.log(stats);
```

### 創建自定義積木
```typescript
import { BlockConfig, BlockCategory, WorkspaceContext } from './blocks/common';

const customBlockConfig: BlockConfig = {
  blockType: 'custom',
  category: BlockCategory.CONTROL,
  name: '自定義積木',
  description: '這是一個自定義積木',
  color: 'bg-red-500',
  compatibility: [WorkspaceContext.LOGIC],
  defaultData: {
    title: '自定義積木',
    customProperty: 'value'
  },
  tooltip: '自定義積木提示',
  priority: 1
};
```

## 📦 積木模組結構

每個積木模組都遵循標準結構：

```typescript
// 積木組件檔案 (例如: MessageEventBlock.tsx)
export const messageEventBlockConfig: BlockConfig = { /* 配置 */ };
export const MessageEventBlock: React.FC<BaseBlockProps> = (props) => { /* 組件 */ };

// 模組統一匯出 (index.ts)
export const eventBlockGroup: BlockGroupConfig = { /* 分組配置 */ };
export const getAllEventBlockConfigs = () => [ /* 所有配置 */ ];
```

## 🔧 開發指南

### 添加新積木
1. 在對應模組目錄中創建新的積木檔案
2. 定義積木配置和組件
3. 在模組的 `index.ts` 中匯出
4. 積木會自動出現在調色板中

### 添加新模組
1. 創建新的模組目錄
2. 按照現有模組結構創建檔案
3. 在主 `index.ts` 中添加匯出
4. 在 `allBlockGroups` 中註冊分組

### 測試
```typescript
import { testBlockSystem, testBlockCompatibility } from './test-blocks';

// 運行系統測試
testBlockSystem();
testBlockCompatibility();
```

## 🐛 常見問題

### Q: 積木沒有顯示在調色板中
A: 檢查積木配置是否正確，特別是 `compatibility` 設定是否符合當前工作區上下文。

### Q: 積木拖拽不工作
A: 確認 `blockType` 和 `defaultData` 設定正確，檢查 `DraggableBlock` 組件的 props。

### Q: 新增積木後沒有生效
A: 確認積木已在對應模組的 `index.ts` 中匯出，並且分組配置已更新。

## 📊 統計資訊

目前系統包含：
- **7 個積木分組**: 事件、回覆、控制、設定、Flex容器、Flex內容、Flex佈局
- **25+ 個積木**: 涵蓋所有常用的 LINE Bot 功能
- **完整的類型定義**: 支援 TypeScript 類型檢查
- **智能相容性檢查**: 根據工作區上下文自動過濾積木

## 🔮 未來計劃

- [ ] 支援積木模板系統
- [ ] 實現積木的視覺化編輯器
- [ ] 添加積木的匯入/匯出功能
- [ ] 支援第三方積木插件
- [ ] 實現積木的版本管理

---

這個模組化系統為 LINE Bot 視覺編輯器提供了強大、靈活且易於維護的積木管理方案。