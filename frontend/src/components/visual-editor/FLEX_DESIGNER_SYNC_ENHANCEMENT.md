# Flex 設計器同步增強

## 🎯 實現的功能

### 問題解決
**之前**：模擬器無法顯示 Flex 設計器中實際設計的內容
**現在**：模擬器完全同步 Flex 設計器的內容，根據邏輯積木設定顯示設計好的 Flex 訊息

## 🆕 核心改進

### 1. 設計器內容同步
- ✅ **即時同步**：模擬器使用 Flex 設計器中當前的設計內容
- ✅ **邏輯驅動**：根據邏輯積木的設定決定何時顯示 Flex 訊息
- ✅ **完整渲染**：使用 `FlexMessagePreview` 組件確保顯示效果一致
- ✅ **雙重備援**：支援設計器內容和手動 JSON 兩種方式

### 2. 智能優先級系統
- 🥇 **優先使用設計器**：首先檢查 Flex 設計器中是否有內容
- 🥈 **備用 JSON 內容**：如果設計器為空，使用積木中的 JSON 內容
- ⚠️ **友好提示**：當兩者都沒有時，提供清晰的指引訊息
- 🔄 **即時切換**：設計器內容變化時立即反映在模擬器中

### 3. 完整的工作流程整合
- 🎨 **設計階段**：在 Flex 設計器中拖拽組件設計 Flex 訊息
- 🧠 **邏輯階段**：在邏輯編輯器中設定觸發條件和回覆積木
- 🧪 **測試階段**：在模擬器中看到實際的設計效果
- 🔄 **迭代優化**：根據測試效果調整設計

## 🏗️ 技術實現

### 優先級邏輯
```typescript
} else if (replyBlock.blockData.replyType === 'flex') {
  // FLEX訊息回覆 - 使用 Flex 設計器中的內容
  if (flexBlocks && flexBlocks.length > 0) {
    // 優先：使用當前 Flex 設計器中設計的內容
    const currentFlexMessage = convertFlexBlocksToFlexMessage(flexBlocks);
    botResponse = {
      type: 'bot',
      content: `Flex 訊息`,
      messageType: 'flex',
      flexMessage: currentFlexMessage
    };
  } else if (replyBlock.blockData.flexContent && Object.keys(replyBlock.blockData.flexContent).length > 0) {
    // 備用：使用積木中設定的 Flex 內容
    botResponse = {
      type: 'bot',
      content: `Flex 訊息`,
      messageType: 'flex',
      flexMessage: {
        type: 'flex',
        contents: replyBlock.blockData.flexContent
      }
    };
  } else {
    botResponse = {
      type: 'bot',
      content: '請在 Flex 設計器中設計 Flex 訊息內容',
      messageType: 'text'
    };
  }
}
```

### 組件轉換系統
```typescript
const convertFlexBlocksToFlexMessage = (blocks: Block[]) => {
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
      case 'button':
        contents.push({
          type: 'button',
          action: {
            type: block.blockData.actionType || 'message',
            label: block.blockData.label || '按鈕',
            text: block.blockData.text || block.blockData.label || '按鈕'
          },
          style: block.blockData.style || 'primary'
        });
        break;
      // ... 支援更多組件類型
    }
  });

  return {
    type: 'flex',
    contents: {
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

## 🚀 完整的使用流程

### 1. 設計階段（Flex 設計器）
- 切換到「Flex 設計器」標籤
- 從左側面板拖拽組件到設計區域：
  - 📝 **文字組件**：設定內容、顏色、大小、對齊
  - 🖼️ **圖片組件**：設定 URL、比例、顯示模式
  - 🔘 **按鈕組件**：設定標籤、動作、樣式
  - ➖ **分隔線**：設定顏色、間距
  - 📏 **間距組件**：設定空白大小
- 在右側預覽區域即時查看設計效果

### 2. 邏輯階段（邏輯編輯器）
- 切換到「邏輯編輯器」標籤
- 拖拽「收到文字訊息」事件積木
- 設定觸發條件（例如：包含 "hello"）
- 拖拽「回覆 Flex 訊息」積木
- 不需要額外設定，會自動使用設計器中的內容

### 3. 測試階段（預覽與測試）
- 切換到「預覽與測試」標籤
- 在模擬器中輸入觸發條件（例如："hello"）
- 看到 Bot 回覆完整的 Flex 訊息
- 顯示的內容與 Flex 設計器中的設計完全一致

### 4. 迭代優化
- 根據測試效果回到 Flex 設計器調整設計
- 修改組件屬性、添加或移除組件
- 再次測試查看效果
- 重複直到滿意為止

## 🎨 支援的設計元素

### 文字組件
- **內容設定**：自由輸入文字內容
- **視覺樣式**：顏色、大小、粗細、對齊
- **即時預覽**：設定後立即在預覽區域顯示

### 圖片組件
- **圖片來源**：支援任意 URL
- **顯示控制**：長寬比、顯示模式
- **佔位處理**：無效 URL 時顯示佔位圖

### 按鈕組件
- **互動設定**：訊息、網址、回傳動作
- **視覺樣式**：主要、次要、連結樣式
- **標籤設定**：自定義按鈕文字

### 佈局組件
- **分隔線**：視覺分隔，可設定顏色和間距
- **間距控制**：精確控制組件間距
- **對齊方式**：支援各種對齊選項

## 🔧 技術特點

### 即時同步機制
- **狀態共享**：Workspace 組件將 flexBlocks 傳遞給模擬器
- **即時更新**：設計器變更立即反映在模擬器中
- **一致性保證**：使用相同的渲染組件確保顯示一致

### 智能備援系統
- **優先級明確**：設計器內容 > 手動 JSON > 錯誤提示
- **無縫切換**：根據內容可用性自動選擇最佳顯示方式
- **用戶友好**：提供清晰的指引和錯誤訊息

### 渲染引擎統一
- **組件復用**：模擬器和預覽使用相同的 FlexMessagePreview
- **格式標準**：確保數據格式符合組件期望
- **性能優化**：避免重複渲染和不必要的計算

## 🎯 使用指南

### 基本工作流程
1. **設計**：在 Flex 設計器中創建您的 Flex 訊息
2. **邏輯**：在邏輯編輯器中設定觸發條件和回覆
3. **測試**：在模擬器中驗證實際效果
4. **優化**：根據測試結果調整設計

### 最佳實踐
- **先設計後邏輯**：完成 Flex 設計後再設定邏輯
- **即時測試**：每次修改後都在模擬器中測試
- **保持簡潔**：避免過於複雜的 Flex 設計
- **考慮用戶體驗**：確保在不同設備上都能正常顯示

### 故障排除
- **沒有顯示**：檢查 Flex 設計器中是否有組件
- **顯示異常**：檢查組件設定是否正確
- **邏輯不觸發**：檢查事件積木的條件設定
- **格式錯誤**：檢查組件屬性是否有效

## 🔮 未來擴展

### 設計器增強
- 更多組件類型支援
- 拖拽排序功能
- 組件複製和貼上
- 設計模板庫

### 邏輯增強
- 條件式 Flex 訊息
- 動態內容插入
- 用戶狀態感知
- A/B 測試支援

### 測試增強
- 多設備預覽
- 互動測試
- 性能分析
- 自動化測試

這次的改進實現了真正的設計器與模擬器同步，讓您可以在視覺化環境中設計 Flex 訊息，並立即在模擬器中看到真實效果！🎊
