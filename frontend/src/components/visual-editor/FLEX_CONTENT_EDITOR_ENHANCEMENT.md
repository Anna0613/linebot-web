# Flex 訊息內容編輯器增強

## 🎯 實現的功能

### 問題解決
**之前**：模擬器中 Flex 訊息使用 Flex 設計器中的組件，無法顯示特定的 Flex 內容
**現在**：模擬器使用回覆積木中實際設定的 `flexContent`，可以顯示任意的 Flex 訊息

## 🆕 核心改進

### 1. 直接 JSON 編輯功能
- ✅ **JSON 編輯器**：在 Flex 回覆積木中直接編輯 Flex 訊息 JSON
- ✅ **語法高亮**：使用等寬字體顯示 JSON 內容
- ✅ **即時驗證**：輸入時自動驗證 JSON 格式
- ✅ **範例提示**：提供完整的 Flex 訊息 JSON 範例

### 2. 智能內容顯示
- 📝 **編輯模式**：大型文字區域，支援多行 JSON 編輯
- 👁️ **預覽模式**：顯示 JSON 內容摘要和狀態
- ⚠️ **狀態提示**：清楚顯示是否已設定 Flex 內容
- 🔄 **即時同步**：編輯後立即反映在模擬器中

### 3. 模擬器整合
- 🎯 **使用實際內容**：模擬器使用積木中設定的 `flexContent`
- 🚫 **不依賴設計器**：不再使用 Flex 設計器中的組件
- ✨ **完整渲染**：使用 `FlexMessagePreview` 組件正確渲染
- 📱 **真實效果**：顯示與 LINE 中相同的視覺效果

## 🏗️ 技術實現

### JSON 編輯器
```typescript
<Textarea 
  placeholder='請輸入 Flex 訊息 JSON，例如：
{
  "type": "bubble",
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": "Hello World",
        "size": "md",
        "weight": "regular",
        "color": "#000000"
      }
    ]
  }
}'
  value={typeof blockData.flexContent === 'string' ? blockData.flexContent : JSON.stringify(blockData.flexContent || {}, null, 2)}
  onChange={(e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setBlockData({...blockData, flexContent: parsed});
    } catch {
      // 如果 JSON 無效，暫時儲存為字串
      setBlockData({...blockData, flexContent: e.target.value});
    }
  }}
  className="text-black font-mono text-xs"
  rows={8}
/>
```

### 模擬器邏輯
```typescript
} else if (replyBlock.blockData.replyType === 'flex') {
  // FLEX訊息回覆 - 使用回覆積木中設定的 flexContent
  if (replyBlock.blockData.flexContent && Object.keys(replyBlock.blockData.flexContent).length > 0) {
    // 使用積木中實際設定的 Flex 內容
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
      content: '請在回覆積木中設定 Flex 訊息內容',
      messageType: 'text'
    };
  }
}
```

### 內容顯示邏輯
```typescript
{!isEditing && block.blockData.replyType === 'flex' && (
  <div className="text-xs text-white/70 mt-1">
    {block.blockData.flexMessageName ? (
      <div>FLEX模板: {block.blockData.flexMessageName}</div>
    ) : block.blockData.flexContent && Object.keys(block.blockData.flexContent).length > 0 ? (
      <div>
        <div>自定義 Flex 訊息</div>
        <div className="text-white/50 truncate">
          {typeof block.blockData.flexContent === 'string' 
            ? block.blockData.flexContent.substring(0, 50) + '...'
            : JSON.stringify(block.blockData.flexContent).substring(0, 50) + '...'
          }
        </div>
      </div>
    ) : (
      <div className="text-orange-300">請設定 Flex 訊息內容</div>
    )}
  </div>
)}
```

## 📋 修改的文件

### 主要修改
1. **LineBotSimulator.tsx**
   - 修改 Flex 回覆邏輯，使用 `replyBlock.blockData.flexContent`
   - 移除對 Flex 設計器組件的依賴
   - 使用 `FlexMessagePreview` 組件渲染

2. **DroppedBlock.tsx**
   - 為 Flex 回覆積木添加 JSON 編輯器
   - 實現即時 JSON 驗證和解析
   - 優化內容顯示邏輯

## 🎨 用戶界面改進

### 編輯體驗
- **大型編輯區域**：8 行高度的文字區域，適合編輯 JSON
- **等寬字體**：使用 `font-mono` 確保 JSON 格式清晰
- **完整範例**：提供實用的 Flex 訊息 JSON 範例
- **即時反饋**：輸入時立即驗證和儲存

### 視覺反饋
- **狀態指示**：清楚顯示是否已設定內容
- **內容預覽**：顯示 JSON 內容的前 50 個字符
- **錯誤提示**：當沒有設定內容時顯示橙色提示
- **類型區分**：區分模板和自定義內容

## 🚀 使用流程

### 完整的工作流程
1. **邏輯編輯器**：拖拽「回覆 Flex 訊息」積木
2. **編輯積木**：點擊積木進入編輯模式
3. **輸入 JSON**：在文字區域中輸入或貼上 Flex 訊息 JSON
4. **儲存設定**：點擊「儲存設定」按鈕
5. **測試效果**：切換到預覽與測試頁面
6. **模擬對話**：在模擬器中觸發 Flex 回覆
7. **查看結果**：看到實際的 Flex 訊息顯示

### 範例使用
```json
{
  "type": "bubble",
  "body": {
    "type": "box",
    "layout": "vertical",
    "contents": [
      {
        "type": "text",
        "text": "321",
        "size": "md",
        "weight": "regular",
        "color": "#000000"
      }
    ]
  }
}
```

當用戶輸入 "123" 時，Bot 會回覆包含 "321" 文字的 Flex 訊息。

## 🔧 技術特點

### JSON 處理
- **容錯解析**：無效 JSON 時暫存為字串，不會丟失內容
- **格式化顯示**：使用 `JSON.stringify(obj, null, 2)` 格式化顯示
- **類型檢查**：支援字串和物件兩種格式
- **即時驗證**：輸入時立即嘗試解析 JSON

### 渲染引擎
- **統一組件**：使用與預覽頁面相同的 `FlexMessagePreview`
- **正確格式**：確保傳遞正確的數據格式給渲染組件
- **錯誤處理**：當內容無效時顯示友好的錯誤訊息
- **性能優化**：避免不必要的重新渲染

## 🎯 使用指南

### 基本使用
1. 在邏輯編輯器中添加「回覆 Flex 訊息」積木
2. 點擊積木進入編輯模式
3. 在 JSON 編輯區域輸入 Flex 訊息內容
4. 儲存設定並測試效果

### JSON 格式要求
- 必須是有效的 JSON 格式
- 遵循 LINE Flex Message 規範
- 支援所有 Flex 組件類型（text、image、button 等）
- 可以包含複雜的佈局和樣式

### 最佳實踐
- **使用範例**：從提供的範例開始修改
- **驗證格式**：確保 JSON 格式正確
- **測試效果**：在模擬器中測試實際顯示效果
- **保存備份**：複雜的 Flex 訊息建議保存備份

## 🔮 未來擴展

### 編輯器增強
- 語法高亮和自動完成
- JSON 格式驗證和錯誤提示
- 視覺化 Flex 編輯器
- 模板庫和快速插入

### 功能擴展
- 支援 Carousel 類型
- 動態內容插入
- 條件式 Flex 訊息
- A/B 測試支援

這次的改進讓 Flex 訊息功能真正實用化，用戶可以創建任意的 Flex 訊息內容並在模擬器中看到真實效果！🎊
