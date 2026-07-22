# Botlyn 前端

> Vite + React + TypeScript - 現代化的 LINE Bot 管理介面

## 📋 目錄

- [專案特色](#專案特色)
- [技術架構](#技術架構)
- [核心功能](#核心功能)
- [快速開始](#快速開始)
- [開發指南](#開發指南)
- [建置與部署](#建置與部署)

## ✨ 專案特色

### 低門檻管理介面
專為非工程背景的營運/行銷人員設計，提供直覺的視覺化操作介面：
- ✅ **無需撰寫程式碼**：透過拖曳積木即可建立 Bot 邏輯
- ✅ **即時預覽**：所見即所得的 Flex 訊息設計
- ✅ **友善的使用體驗**：清晰的導航與操作流程
- ✅ **完整的說明文件**：內建使用指南與範例

### 現代化技術棧
採用最新的前端技術，提供極致的開發體驗與效能：
- **Vite 5**：極速的開發伺服器與建置工具
- **React 18**：最新的 React 特性與效能優化
- **TypeScript 5**：完整的型別安全與 IDE 支援
- **Tailwind CSS 3**：高效的 Utility-First CSS 框架
- **shadcn-ui**：精美的 UI 元件庫（基於 Radix UI）

### 豐富的功能模組
- **儀表板**：一目了然的 Bot 活動概覽
- **Bot 管理**：完整的 CRUD 操作與設定
- **視覺化編輯器**：積木式邏輯編排
- **Flex 訊息設計**：可視化卡片設計工具
- **Rich Menu 管理**：圖形化選單設定
- **使用者分析**：對話記錄與互動統計
- **AI 知識庫**：知識管理與 AI 設定

### 優異的效能表現
- **程式碼分割**：按需載入，減少初始載入時間
- **圖片優化**：自動壓縮與格式轉換
- **快取策略**：React Query 智能快取
- **懶加載**：路由與元件按需載入

## 🏗️ 技術架構

### 核心技術棧

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **建置工具** | Vite | 5.x | 開發伺服器與建置 |
| **框架** | React | 18.x | UI 框架 |
| **語言** | TypeScript | 5.x | 型別安全 |
| **樣式** | Tailwind CSS | 3.x | CSS 框架 |
| **UI 元件** | shadcn-ui | - | 元件庫 |
| **狀態管理** | React Query | 5.x | 伺服器狀態管理 |
| **路由** | React Router | 6.x | 路由管理 |
| **表單** | React Hook Form | 7.x | 表單處理 |
| **驗證** | Zod | 3.x | Schema 驗證 |

### 服務埠號

| 環境 | 埠號 | 說明 |
|------|------|------|
| **開發伺服器** | 8080 | Vite 開發模式 |
| **預覽伺服器** | 3000 | Vite 預覽模式 |
| **Docker 容器** | 3000 | 生產環境 |

### 目錄結構

```
frontend/
├── src/                        # 原始碼
│   ├── components/            # React 元件
│   │   ├── ui/               # shadcn-ui 元件
│   │   ├── layout/           # 佈局元件
│   │   ├── bot/              # Bot 相關元件
│   │   ├── flex/             # Flex 訊息元件
│   │   └── ...
│   ├── pages/                 # 頁面元件
│   │   ├── DashboardPage.tsx      # 儀表板
│   │   ├── BotManagementPage.tsx  # Bot 管理
│   │   ├── VisualBotEditorPage.tsx # 視覺化編輯器
│   │   ├── FlexMessageDesigner.tsx # Flex Message 編輯
│   │   ├── BotUsersPage.tsx       # 使用者清單
│   │   ├── AIKnowledgePage.tsx    # AI 知識庫
│   │   ├── LoginPage.tsx          # 登入
│   │   ├── Register.tsx           # 註冊
│   │   └── ...
│   ├── services/              # API 服務
│   │   ├── api.ts            # API 客戶端
│   │   ├── authService.ts    # 認證服務
│   │   ├── botService.ts     # Bot 服務
│   │   └── ...
│   ├── hooks/                 # 自訂 Hooks
│   │   ├── useAuth.ts        # 認證 Hook
│   │   ├── useBots.ts        # Bot Hook
│   │   └── ...
│   ├── types/                 # TypeScript 型別
│   │   ├── bot.ts            # Bot 型別
│   │   ├── user.ts           # User 型別
│   │   └── ...
│   ├── utils/                 # 工具函式
│   │   ├── api.ts            # API 工具
│   │   ├── validation.ts     # 驗證工具
│   │   └── ...
│   ├── styles/                # 全域樣式
│   ├── App.tsx                # 主應用元件
│   ├── main.tsx               # 應用入口
│   └── vite-env.d.ts          # Vite 型別定義
├── public/                     # 靜態資源
│   ├── favicon.ico
│   └── ...
├── tests/                      # 測試檔案
├── vite-plugins/              # Vite 插件
├── env.example                 # 環境變數範例
├── .env.local                  # 本地環境變數
├── vite.config.ts             # Vite 配置
├── tailwind.config.ts         # Tailwind 配置
├── tsconfig.json              # TypeScript 配置
├── package.json               # 專案配置
├── pnpm-lock.yaml             # 依賴鎖定
├── Dockerfile                 # Docker 映像檔
└── README.md                  # 本文件
```

## 🚀 核心功能

### 1. 儀表板
- **綜合概覽**
  - Bot 列表與狀態
  - 近期活動統計
  - 快速操作入口
- **數據視覺化**
  - 訊息量趨勢圖
  - 活躍用戶統計
  - 回應時間分析

### 2. Bot 管理
- **完整 CRUD**
  - 建立新 Bot
  - 編輯 Bot 設定
  - 刪除 Bot
  - Bot 列表檢視
- **Channel 設定**
  - Channel ID 設定
  - Channel Secret 設定
  - Access Token 設定
  - Token 驗證
- **Webhook 管理**
  - Webhook URL 顯示
  - 一鍵複製
  - 連線狀態檢查

### 3. 視覺化 Bot 編輯器
- **積木式編輯**
  - 拖曳式介面
  - 事件觸發設定
  - 條件邏輯配置
  - 回覆內容設定
- **即時預覽**
  - 邏輯流程視覺化
  - 測試模式
  - 錯誤提示
- **模板管理**
  - 儲存邏輯模板
  - 載入模板
  - 模板分享

### 4. Flex 訊息設計器
- **可視化設計**
  - 拖曳式佈局
  - 元件庫
  - 樣式編輯器
  - 即時預覽
- **模板系統**
  - 內建模板
  - 自訂模板
  - 模板匯入/匯出
- **JSON 編輯**
  - 程式碼編輯器
  - 語法高亮
  - 格式驗證
  - 一鍵複製

### 5. Rich Menu 管理
- **選單設計**
  - 區域劃分
  - 圖片上傳
  - 動作設定
  - 預覽功能
- **選單管理**
  - 建立選單
  - 編輯選單
  - 啟用/停用
  - 刪除選單

### 6. AI 知識庫
- **知識管理**
  - 文件上傳（文字/檔案）
  - 知識片段檢視
  - 編輯與刪除
  - 批次操作
- **AI 設定**
  - AI 提供者選擇
  - 參數調整（閾值、top_k）
  - 系統提示詞設定
  - 測試 AI 回覆

### 7. 使用者分析
- **使用者清單**
  - LINE 用戶列表
  - 基本資料顯示
  - 互動統計
- **對話記錄**
  - 時間軸檢視
  - 訊息內容
  - 事件類型
  - 搜尋與篩選

### 8. 認證系統
- **多重登入**
  - 一般帳密登入
  - LINE Login
  - 記住我功能
- **帳號管理**
  - 註冊新帳號
  - Email 驗證
  - 個人資料編輯
  - 密碼變更

## 🚀 快速開始

### 環境需求
- Node.js 18+
- pnpm 8+ (推薦) 或 npm 9+

### 安裝步驟

1. **進入前端目錄**
   ```powershell
   cd botlyn/frontend
   ```

2. **安裝依賴**
   ```powershell
   pnpm install
   ```

3. **設定環境變數**
   ```powershell
   Copy-Item env.example .env.local
   # 使用編輯器編輯 .env.local 設定 API URL
   ```

4. **啟動開發伺服器**
   ```powershell
   pnpm dev
   ```

   前端將在 `http://localhost:8080` 啟動。

5. **訪問應用**
   - 開啟瀏覽器訪問 `http://localhost:8080`

### 環境變數配置

**開發環境** (`.env.local`)
```ini
# 後端 API URL
VITE_UNIFIED_API_URL=http://localhost:8000

# Webhook 網域（部署後設定）
VITE_WEBHOOK_DOMAIN=https://your-domain.com
```

**Docker 環境**
```ini
# 容器間通訊
VITE_UNIFIED_API_URL=http://backend:8005

# 外部訪問網域
VITE_WEBHOOK_DOMAIN=https://your-domain.com
```

### 開發指令

**啟動開發伺服器**
```powershell
pnpm dev
```

**建置生產版本**
```powershell
pnpm build
```

**預覽生產版本**
```powershell
pnpm preview
```

**型別檢查**
```powershell
pnpm type-check
```

**Lint 檢查**
```powershell
pnpm lint
```

**格式化程式碼**
```powershell
pnpm format
```

**分析 Bundle 大小**
```powershell
pnpm analyze
```

**效能測試（Lighthouse）**
```powershell
pnpm lighthouse
```

## 🛠️ 開發指南

### 專案結構說明

**元件組織**
- `components/ui/` - 基礎 UI 元件（shadcn-ui）
- `components/layout/` - 佈局元件（Header、Sidebar 等）
- `components/bot/` - Bot 相關元件
- `components/flex/` - Flex 訊息相關元件

**頁面路由**
- 所有頁面元件放在 `pages/` 目錄
- 使用 React Router 進行路由管理
- 支援懶加載優化

**狀態管理**
- 使用 React Query 管理伺服器狀態
- 使用 React Context 管理全域狀態
- 使用 React Hook Form 管理表單狀態

**API 呼叫**
- 統一使用 `services/api.ts` 中的 API 客戶端
- 使用 React Query 的 hooks 進行資料獲取
- 自動處理錯誤與載入狀態

### 新增頁面

1. **建立頁面元件** (`src/pages/NewPage.tsx`)
   ```tsx
   import { useAuth } from '@/hooks/useAuth';

   export default function NewPage() {
     const { user } = useAuth();

     return (
       <div className="container mx-auto p-6">
         <h1 className="text-2xl font-bold">新頁面</h1>
       </div>
     );
   }
   ```

2. **新增路由** (`src/App.tsx`)
   ```tsx
   import NewPage from '@/pages/NewPage';

   <Route path="/new-page" element={<NewPage />} />
   ```

3. **新增導航連結** (如需要)
   ```tsx
   <Link to="/new-page">新頁面</Link>
   ```

### 使用 shadcn-ui 元件

**安裝元件**
```powershell
npx shadcn-ui@latest add button
```

**使用元件**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">點擊我</Button>
```

### API 整合

**建立 Service** (`src/services/newService.ts`)
```typescript
import api from './api';

export const newService = {
  getItems: async () => {
    const response = await api.get('/api/v1/items');
    return response.data;
  },

  createItem: async (data: ItemCreate) => {
    const response = await api.post('/api/v1/items', data);
    return response.data;
  }
};
```

**建立 Hook** (`src/hooks/useItems.ts`)
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { newService } from '@/services/newService';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: newService.getItems
  });
}

export function useCreateItem() {
  return useMutation({
    mutationFn: newService.createItem
  });
}
```

**在元件中使用**
```tsx
import { useItems, useCreateItem } from '@/hooks/useItems';

function ItemList() {
  const { data: items, isLoading } = useItems();
  const createItem = useCreateItem();

  if (isLoading) return <div>載入中...</div>;

  return (
    <div>
      {items?.map(item => <div key={item.id}>{item.name}</div>)}
    </div>
  );
}
```

### 樣式指南

**使用 Tailwind CSS**
```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-semibold">標題</h2>
  <Button>操作</Button>
</div>
```

**自訂樣式**
- 全域樣式放在 `src/styles/`
- 使用 CSS Modules 或 Tailwind 的 `@apply`
- 遵循 Tailwind 的設計系統

### 型別定義

**定義型別** (`src/types/item.ts`)
```typescript
export interface Item {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ItemCreate {
  name: string;
  description?: string;
}
```

**使用型別**
```typescript
import { Item, ItemCreate } from '@/types/item';

const item: Item = {
  id: '1',
  name: 'Item 1',
  createdAt: new Date().toISOString()
};
```

## 📦 建置與部署

### 生產建置

```powershell
pnpm build
```

建置產物位於 `dist/` 目錄。

### Docker 部署

**單獨建置前端容器**
```powershell
docker build -t botlyn-frontend . `
  --build-arg VITE_UNIFIED_API_URL=http://backend:8005
```

**啟動容器**
```powershell
docker run -p 3000:3000 botlyn-frontend
```

**使用 Docker Compose（推薦）**

詳細的 Docker 部署說明請參考 [主 README - Docker 部署章節](../README.md#docker-部署)。

```powershell
# 回到專案根目錄
cd ..

# 啟動所有服務
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f frontend
```

前端將在 `http://localhost:3000` 啟動。

### 效能優化

**程式碼分割**
- 路由層級的程式碼分割已自動啟用
- 使用 `React.lazy()` 進行元件懶加載

**圖片優化**
```powershell
pnpm optimize-images
```

**Bundle 分析**
```powershell
pnpm analyze
```

## 📖 相關文件

- [系統架構圖](../docs/diagrams/system-architecture.md)
- [系統流程圖](../docs/diagrams/system-flows.md)
- [使用案例圖](../docs/diagrams/use-cases.md)
- [主 README](../README.md)
- [後端 README](../backend/README.md)

## 🔧 常見問題

**Q: 如何連接後端 API？**
A: 在 `.env.local` 中設定 `VITE_UNIFIED_API_URL=http://localhost:8000`

**Q: CORS 錯誤怎麼辦？**
A: 確認後端 `.env` 中的 `EXTRA_ALLOWED_ORIGINS` 包含前端網址

**Q: 如何新增 shadcn-ui 元件？**
A: 使用 `npx shadcn-ui@latest add <component-name>`

**Q: 開發伺服器啟動失敗？**
A: 檢查埠號 8080 是否被佔用，或修改 `vite.config.ts` 中的埠號設定

**Q: 建置後靜態資源 404？**
A: 確認 `copy-assets.js` 腳本已執行，或檢查 `public/` 目錄

**Q: 如何使用 pnpm 而非 npm？**
A: 安裝 pnpm：`npm install -g pnpm`，然後使用 `pnpm install` 安裝依賴

---

*本文件由 Botlyn 專案團隊維護*
*最後更新: 2025-10-24*
