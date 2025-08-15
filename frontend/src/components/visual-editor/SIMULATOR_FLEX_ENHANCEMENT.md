# 模擬器 Flex 訊息顯示增強

## 🎯 實現的功能

### 問題解決
**之前**：模擬器中 Flex 訊息回覆只顯示 `[FLEX訊息: test]` 文字
**現在**：模擬器中實際渲染完整的 Flex 訊息內容，顯示真實的視覺效果

## 🆕 核心改進

### 1. 實際 Flex 訊息渲染
- ✅ **真實顯示**：在模擬器對話中顯示實際的 Flex 訊息佈局
- ✅ **即時同步**：使用當前 Flex 設計器中的組件內容
- ✅ **完整支援**：支援 Text、Image、Button、Separator、Spacer 等組件
- ✅ **視覺一致**：與 LINE 中的實際顯示效果保持一致

### 2. 智能組件轉換
- 🔄 **自動轉換**：將 flexBlocks 自動轉換為標準 FlexMessage 格式
- 📝 **屬性映射**：正確映射所有組件屬性（顏色、大小、對齊等）
- 🎨 **樣式保持**：保持設計器中設定的所有視覺樣式
- 🔧 **預設值處理**：為未設定的屬性提供合理的預設值

### 3. 優化的用戶體驗
- 💬 **自然對話**：Flex 訊息在對話中自然顯示，不再是純文字
- 🔄 **即時更新**：修改 Flex 設計後，模擬器中的回覆立即更新
- 📱 **移動端適配**：模擬器中的 Flex 訊息適配移動端顯示
- ⚠️ **友好提示**：當沒有 Flex 組件時提供清晰的指引

## 🏗️ 技術實現

### 組件轉換邏輯
```typescript
const convertFlexBlocksToFlexMessage = (blocks: Block[]): FlexMessage => {
  const contents: Record<string, unknown>[] = [];
  
  blocks.forEach(block => {
    switch (block.blockType) {
      case 'text':
        contents.push({
          type: 'text',
          text: block.blockData.text || '文字內容',
          color: block.blockData.color || '#000000',
          size: block.blockData.size || 'md',
          weight: block.blockData.weight || 'regular',
          align: block.blockData.align || 'start'
        });
        break;
      case 'image':
        contents.push({
          type: 'image',
          url: block.blockData.url || 'https://via.placeholder.com/300x200',
          aspectRatio: block.blockData.aspectRatio || '20:13',
          aspectMode: block.blockData.aspectMode || 'cover'
        });
        break;
      // ... 其他組件類型
    }
  });

  return {
    id: 'current-design',
    name: '當前設計',
    content: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: contents
      }
    }
  };
};
```

### 模擬器回覆邏輯
```typescript
} else if (replyBlock.blockData.replyType === 'flex') {
  // FLEX訊息回覆 - 使用當前設計的 flexBlocks
  if (flexBlocks && flexBlocks.length > 0) {
    const currentFlexMessage = convertFlexBlocksToFlexMessage(flexBlocks);
    botResponse = {
      type: 'bot',
      content: `Flex 訊息`,
      messageType: 'flex',
      flexMessage: currentFlexMessage
    };
  } else {
    botResponse = {
      type: 'bot',
      content: '請先在 Flex 設計器中添加組件來設計 Flex 訊息',
      messageType: 'text'
    };
  }
}
```

## 📋 修改的文件

### 主要修改
1. **LineBotSimulator.tsx**
   - 添加 `flexBlocks` 參數
   - 實現 `convertFlexBlocksToFlexMessage` 函數
   - 修改 Flex 回覆邏輯，使用當前設計而非 API 數據
   - 優化錯誤處理和用戶提示

2. **Workspace.tsx**
   - 修改 `LineBotSimulator` 調用，傳遞 `flexBlocks`
   - 確保模擬器能夠訪問當前的 Flex 設計

3. **PreviewControlPanel.tsx**
   - 移除重複的 Flex 預覽功能
   - 簡化為純粹的控制面板
   - 保持積木統計和測試功能

## 🎨 支援的組件類型

### Text 組件
- **文字內容**：顯示設定的文字
- **顏色**：支援自定義顏色
- **大小**：xs, sm, md, lg, xl, xxl
- **粗細**：regular, bold
- **對齊**：start, center, end

### Image 組件
- **圖片 URL**：顯示設定的圖片
- **長寬比**：支援各種比例設定
- **顯示模式**：cover, contain
- **預設圖片**：未設定時使用佔位圖

### Button 組件
- **按鈕文字**：顯示設定的標籤
- **動作類型**：message, uri, postback
- **樣式**：primary, secondary, link
- **互動效果**：支援點擊效果

### Layout 組件
- **Separator**：分隔線，支援顏色和間距設定
- **Spacer**：空白間距，支援不同大小
- **Box**：容器佈局，支援垂直排列

## 🚀 用戶體驗流程

### 設計到測試的完整流程
1. **Flex 設計器**：添加和配置 Flex 組件
2. **邏輯編輯器**：設定事件和 Flex 回覆積木
3. **預覽與測試**：在模擬器中測試實際效果
4. **即時反饋**：看到真實的 Flex 訊息顯示

### 測試場景
```
用戶輸入：「hello」
Bot 回覆：[顯示完整的 Flex 訊息]
├── 標題文字（大字體、粗體）
├── 描述文字（普通字體）
├── 圖片（如果有設定）
├── 分隔線
└── 按鈕（如果有設定）
```

## 🔧 技術特點

### 即時同步
- **零延遲**：Flex 設計器的變更立即反映在模擬器中
- **狀態一致**：確保設計器和模擬器顯示相同內容
- **屬性完整**：所有設定的屬性都正確傳遞和顯示

### 錯誤處理
- **空狀態處理**：沒有 Flex 組件時提供友好提示
- **預設值**：為未設定的屬性提供合理預設值
- **容錯機制**：即使部分組件有問題也能正常顯示其他組件

### 性能優化
- **按需轉換**：只在需要時才進行組件轉換
- **記憶體效率**：避免不必要的數據複製
- **渲染優化**：使用高效的 HTML 渲染方式

## 🎯 使用指南

### 基本使用
1. 在 Flex 設計器中設計 Flex 訊息
2. 在邏輯編輯器中添加事件和 Flex 回覆積木
3. 切換到預覽與測試頁面
4. 在模擬器中輸入觸發條件
5. 查看實際的 Flex 訊息顯示效果

### 最佳實踐
- **先設計後測試**：完成 Flex 設計後再進行測試
- **即時調整**：根據模擬器效果調整設計
- **多場景測試**：測試不同的觸發條件
- **視覺檢查**：確認所有組件都正確顯示

## 🔮 未來擴展

### 功能增強
- 支援更多 Flex 組件類型（Carousel、複雜佈局等）
- 添加互動功能（按鈕點擊回應）
- 支援動畫效果預覽

### 測試工具
- 自動化測試場景
- 多設備尺寸預覽
- 性能測試工具

這次的改進讓模擬器真正具備了 Flex 訊息的完整顯示能力，大幅提升了設計和測試的效率！🎊
