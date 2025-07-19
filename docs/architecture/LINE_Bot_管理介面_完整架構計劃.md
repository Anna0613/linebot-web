# LINE Bot 管理介面 - 完整架構計劃

> 基於 LINE Messaging API 的進階 Bot 營運管理系統設計方案

## 📋 目錄

1. [專案概述](#專案概述)
2. [LINE Message API 能力分析](#line-message-api-能力分析)
3. [系統架構設計](#系統架構設計)
4. [功能模組規劃](#功能模組規劃)
5. [資料庫設計](#資料庫設計)
6. [技術實作策略](#技術實作策略)
7. [介面設計規劃](#介面設計規劃)
8. [開發階段規劃](#開發階段規劃)
9. [部署與維護](#部署與維護)

---

## 專案概述

### 🎯 專案目標
建立一個全功能的 LINE Bot 管理介面，提供進階的 Bot 營運管理功能，包括：
- 自動回覆設定與管理
- 關鍵字智慧配對系統
- 用戶分群與標籤管理
- 推播訊息與排程功能
- 完整的數據分析與報告系統

### 📊 預期效益
- **營運效率提升**: 自動化回覆減少人工介入
- **用戶體驗優化**: 智慧回覆和個性化服務
- **數據驅動決策**: 完整的分析報告支援營運決策
- **擴展性設計**: 支援多 Bot 管理和企業級應用

---

## LINE Message API 能力分析

### 🔍 可獲得的原始數據

#### 1. Webhook 事件數據
```json
{
  "events": [
    {
      "type": "message",
      "mode": "active",
      "timestamp": 1640995200000,
      "source": {
        "type": "user",
        "userId": "U4af4980629..."
      },
      "message": {
        "id": "444573844083572737",
        "type": "text",
        "text": "Hello, world"
      },
      "replyToken": "0f3779fba3b349968c5d07db31eab56f"
    }
  ]
}
```

**包含資訊**:
- 用戶訊息內容（文字、圖片、影片、音訊、位置、貼圖等）
- 用戶 ID、群組 ID、房間 ID
- 事件時間戳記
- 訊息類型和來源資訊
- Reply Token（用於回覆）

#### 2. 用戶基本資料（透過 Profile API）
```json
{
  "userId": "U4af4980629...",
  "displayName": "LINE taro",
  "pictureUrl": "https://obs.line-apps.com/...",
  "language": "en"
}
```

#### 3. Bot 發送記錄
- 發送的訊息內容
- 發送時間
- 發送對象（個人/群組/多播）
- 發送狀態（成功/失敗）
- 配額使用情況

#### 4. Rich Menu 與 LIFF 互動
- Rich Menu 點擊事件
- LIFF 應用開啟記錄
- 按鈕和動作觸發記錄

### 📈 可計算的衍生數據

#### 1. 用戶行為分析
- **活躍度指標**
  - 日活躍用戶 (DAU)
  - 月活躍用戶 (MAU)
  - 用戶留存率
  - 互動頻率分佈

- **使用模式分析**
  - 使用時段分析
  - 功能使用偏好
  - 訊息類型偏好
  - 會話長度統計

#### 2. Bot 效能指標
- **回應效能**
  - 平均回應時間
  - 回應成功率
  - 錯誤率統計
  - API 使用量監控

- **內容效能**
  - 訊息開啟率
  - 按鈕點擊率
  - Flex Message 互動率
  - 多媒體內容參與度

#### 3. 營運數據
- **推播效果**
  - 送達率
  - 開啟率
  - 點擊轉換率
  - 取消封鎖率

- **自動回覆效果**
  - 關鍵字命中率
  - 回覆滿意度（透過後續互動推算）
  - 自動解決率

---

## 系統架構設計

### 🏗 整體架構圖

```mermaid
graph TB
    subgraph "前端層 Frontend Layer"
        A[管理介面 Dashboard]
        B[用戶管理 User Management]
        C[訊息中心 Message Center]
        D[分析報告 Analytics]
    end
    
    subgraph "API 層 API Layer"
        E[認證 API]
        F[Bot 管理 API]
        G[用戶管理 API]
        H[訊息管理 API]
        I[分析 API]
        J[Webhook Handler]
    end
    
    subgraph "業務邏輯層 Business Logic Layer"
        K[自動回覆引擎]
        L[用戶分群引擎]
        M[數據分析引擎]
        N[推播管理器]
        O[事件處理器]
    end
    
    subgraph "資料層 Data Layer"
        P[(主資料庫<br/>PostgreSQL)]
        Q[(快取層<br/>Redis)]
        R[(檔案存儲<br/>MinIO/S3)]
    end
    
    subgraph "外部服務 External Services"
        S[LINE Messaging API]
        T[郵件服務]
        U[監控服務]
    end
    
    A --> E
    B --> F
    C --> H
    D --> I
    
    E --> K
    F --> L
    H --> M
    I --> N
    J --> O
    
    K --> P
    L --> Q
    M --> P
    N --> R
    O --> P
    
    J <--> S
    N --> T
    M --> U
```

### 🔄 數據流程設計

```mermaid
sequenceDiagram
    participant User as LINE 用戶
    participant LINE as LINE Platform
    participant Webhook as Webhook Handler
    participant Engine as 處理引擎
    participant DB as 資料庫
    participant Dashboard as 管理介面
    
    User->>LINE: 發送訊息
    LINE->>Webhook: 推送 Webhook 事件
    Webhook->>Engine: 解析事件
    Engine->>DB: 儲存用戶訊息
    Engine->>Engine: 分析關鍵字
    Engine->>LINE: 發送自動回覆
    Engine->>DB: 記錄回覆日誌
    DB->>Dashboard: 即時數據更新
```

---

## 功能模組規劃

### 📊 1. 儀表板模組 (Dashboard)

#### 核心功能
- **即時數據概覽**
  - 今日/本週/本月訊息統計
  - 活躍用戶數量
  - Bot 回應成功率
  - 系統健康狀態

- **趨勢分析**
  - 用戶增長趨勢圖
  - 訊息量趨勢圖
  - 互動率變化圖
  - 熱門關鍵字排行

#### 技術實作
```typescript
interface DashboardData {
  overview: {
    totalMessages: number;
    activeUsers: number;
    responseRate: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  };
  trends: {
    userGrowth: TimeSeriesData[];
    messageVolume: TimeSeriesData[];
    interactionRate: TimeSeriesData[];
  };
  topKeywords: KeywordStat[];
}
```

### 👥 2. 用戶管理模組 (User Management)

#### 核心功能
- **用戶列表與搜尋**
  - 分頁用戶列表
  - 多條件搜尋篩選
  - 用戶狀態標籤
  - 批量操作功能

- **用戶分群系統**
  - 自動分群（基於行為模式）
  - 手動標籤管理
  - 動態分群條件
  - 分群統計分析

- **用戶詳細檔案**
  - 基本資料顯示
  - 互動歷史記錄
  - 行為模式分析
  - 偏好標籤管理

#### 資料結構
```typescript
interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  avatarUrl?: string;
  language: string;
  status: 'active' | 'inactive' | 'blocked';
  tags: UserTag[];
  firstInteraction: Date;
  lastInteraction: Date;
  interactionCount: number;
  metadata: Record<string, any>;
}

interface UserTag {
  id: string;
  name: string;
  value: string;
  type: 'manual' | 'auto' | 'system';
  createdAt: Date;
}
```

### 💬 3. 訊息管理模組 (Message Management)

#### 核心功能
- **訊息歷史記錄**
  - 完整收發記錄
  - 訊息類型分類
  - 時間範圍篩選
  - 內容搜尋功能

- **Flex Message 編輯器**
  - 拖拽式視覺編輯
  - 即時預覽功能
  - 模板庫管理
  - 響應式設計支援

- **多媒體資源管理**
  - 圖片/影片/音訊上傳
  - 資源分類管理
  - 使用統計追蹤
  - 自動化壓縮優化

#### Flex Message 編輯器規劃
```typescript
interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexContainer;
  quickReply?: QuickReply;
}

interface FlexContainer {
  type: 'bubble' | 'carousel';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  header?: FlexBox;
  hero?: FlexComponent;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: FlexBubbleStyles;
}
```

### 🤖 4. 自動回覆模組 (Auto Reply)

#### 核心功能
- **關鍵字管理系統**
  - 精確匹配/模糊匹配
  - 正則表達式支援
  - 優先級設定
  - 條件式觸發

- **智慧回覆引擎**
  - 上下文感知
  - 用戶狀態判斷
  - 時間條件限制
  - A/B 測試支援

- **回覆內容管理**
  - 多種回覆類型（文字、圖片、Flex、Quick Reply）
  - 隨機回覆池
  - 動態內容插入
  - 多語言支援

#### 實作架構
```typescript
interface AutoReplyRule {
  id: string;
  botId: string;
  name: string;
  trigger: {
    type: 'keyword' | 'regex' | 'intent';
    pattern: string;
    matchType: 'exact' | 'contains' | 'startsWith' | 'endsWith';
  };
  conditions: {
    userTags?: string[];
    timeRange?: TimeRange;
    userStatus?: UserStatus[];
    cooldown?: number; // 秒
  };
  responses: AutoReplyResponse[];
  priority: number;
  isActive: boolean;
  analytics: {
    triggerCount: number;
    successRate: number;
    lastTriggered?: Date;
  };
}

interface AutoReplyResponse {
  type: 'text' | 'image' | 'flex' | 'quickReply';
  content: any;
  weight: number; // 隨機選擇權重
}
```

### 📢 5. 推播管理模組 (Broadcast Management)

#### 核心功能
- **推播訊息建立**
  - 豐富內容編輯器
  - 對象選擇器
  - 排程設定
  - 預覽測試

- **目標受眾管理**
  - 全體推播
  - 分群推播
  - 個別推播
  - 動態受眾篩選

- **推播效果追蹤**
  - 送達統計
  - 開啟率分析
  - 互動追蹤
  - ROI 計算

#### 資料結構
```typescript
interface BroadcastCampaign {
  id: string;
  botId: string;
  title: string;
  content: MessageContent;
  target: {
    type: 'all' | 'segment' | 'individual';
    conditions?: TargetConditions;
    userIds?: string[];
    estimatedReach: number;
  };
  schedule: {
    type: 'immediate' | 'scheduled';
    scheduledAt?: Date;
    timezone: string;
  };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  analytics: BroadcastAnalytics;
}
```

### 📈 6. 分析報告模組 (Analytics & Reporting)

#### 核心功能
- **多維度數據分析**
  - 用戶行為分析
  - 訊息效能分析
  - Bot 使用統計
  - 趨勢預測分析

- **自定義報告**
  - 報告模板管理
  - 自定義指標
  - 定期報告生成
  - 多格式匯出

- **即時監控**
  - 實時數據儀表板
  - 異常警報系統
  - 效能監控
  - 系統健康檢查

#### 分析指標定義
```typescript
interface AnalyticsMetrics {
  user: {
    dau: number; // 日活躍用戶
    mau: number; // 月活躍用戶
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
    churn: number; // 流失率
  };
  message: {
    totalMessages: number;
    averageLength: number;
    typeDistribution: MessageTypeStats;
  };
  engagement: {
    responseRate: number;
    averageSessionLength: number;
    interactionFrequency: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}
```

---

## 資料庫設計

### 🗄 完整 ERD 設計

```mermaid
erDiagram
    Bot ||--o{ LineUser : manages
    Bot ||--o{ AutoReplyRule : has
    Bot ||--o{ BroadcastCampaign : creates
    Bot ||--o{ Message : sends
    Bot ||--o{ Analytics : generates
    
    LineUser ||--o{ UserMessage : sends
    LineUser ||--o{ UserTag : has
    LineUser ||--o{ UserActivity : generates
    LineUser ||--o{ UserSession : creates
    
    AutoReplyRule ||--o{ AutoReplyLog : generates
    BroadcastCampaign ||--o{ BroadcastLog : creates
    Message ||--o{ MessageAnalytics : tracks
    
    Bot {
        uuid id PK
        uuid user_id FK
        string name
        string channel_token
        string channel_secret
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    
    LineUser {
        uuid id PK
        string line_user_id UK
        uuid bot_id FK
        string display_name
        string avatar_url
        string language
        enum status
        jsonb profile_data
        timestamp first_interaction
        timestamp last_interaction
        int total_interactions
        timestamp created_at
        timestamp updated_at
    }
    
    UserMessage {
        uuid id PK
        uuid user_id FK
        uuid bot_id FK
        string message_id
        enum direction
        enum message_type
        text content
        jsonb raw_data
        timestamp created_at
    }
    
    AutoReplyRule {
        uuid id PK
        uuid bot_id FK
        string name
        jsonb trigger_config
        jsonb condition_config
        jsonb response_config
        int priority
        boolean is_active
        int trigger_count
        timestamp created_at
        timestamp updated_at
    }
    
    UserTag {
        uuid id PK
        uuid user_id FK
        string tag_name
        string tag_value
        enum tag_type
        timestamp created_at
        timestamp expires_at
    }
    
    UserActivity {
        uuid id PK
        uuid user_id FK
        uuid bot_id FK
        string activity_type
        jsonb activity_data
        timestamp created_at
    }
    
    BroadcastCampaign {
        uuid id PK
        uuid bot_id FK
        string title
        jsonb content
        jsonb target_config
        jsonb schedule_config
        enum status
        int target_count
        int sent_count
        int success_count
        timestamp created_at
        timestamp scheduled_at
        timestamp sent_at
    }
    
    Analytics {
        uuid id PK
        uuid bot_id FK
        string metric_name
        jsonb metric_data
        enum time_period
        timestamp period_start
        timestamp period_end
        timestamp created_at
    }
    
    FlexTemplate {
        uuid id PK
        uuid bot_id FK
        string name
        string category
        jsonb content
        boolean is_public
        int usage_count
        timestamp created_at
        timestamp updated_at
    }
    
    MediaAsset {
        uuid id PK
        uuid bot_id FK
        string filename
        string file_type
        string file_url
        int file_size
        jsonb metadata
        int usage_count
        timestamp created_at
    }
```

### 📊 索引優化策略

```sql
-- 高頻查詢索引
CREATE INDEX idx_line_user_bot_id ON line_users(bot_id);
CREATE INDEX idx_line_user_line_user_id ON line_users(line_user_id);
CREATE INDEX idx_line_user_last_interaction ON line_users(last_interaction DESC);

CREATE INDEX idx_user_message_user_id_created ON user_messages(user_id, created_at DESC);
CREATE INDEX idx_user_message_bot_id_created ON user_messages(bot_id, created_at DESC);

CREATE INDEX idx_auto_reply_bot_id_active ON auto_reply_rules(bot_id, is_active);
CREATE INDEX idx_auto_reply_priority ON auto_reply_rules(priority DESC);

CREATE INDEX idx_user_activity_created ON user_activities(created_at DESC);
CREATE INDEX idx_analytics_bot_period ON analytics(bot_id, time_period, period_start);

-- 複合索引用於複雜查詢
CREATE INDEX idx_user_tag_user_name ON user_tags(user_id, tag_name);
CREATE INDEX idx_broadcast_status_scheduled ON broadcast_campaigns(status, scheduled_at);
```

---

## 技術實作策略

### 🔧 後端技術棧

#### 1. API 層擴展
基於現有的 FastAPI 架構，新增以下模組：

```python
# 新增 API 路由結構
/api/v1/
├── analytics/          # 分析數據 API
│   ├── dashboard/     # 儀表板數據
│   ├── users/         # 用戶分析
│   ├── messages/      # 訊息分析
│   └── reports/       # 報告生成
├── line-users/        # LINE 用戶管理
│   ├── list/          # 用戶列表
│   ├── profile/       # 用戶檔案
│   ├── tags/          # 標籤管理
│   └── segments/      # 分群管理
├── auto-reply/        # 自動回覆管理
│   ├── rules/         # 回覆規則
│   ├── keywords/      # 關鍵字管理
│   └── logs/          # 回覆日誌
├── broadcast/         # 推播管理
│   ├── campaigns/     # 推播活動
│   ├── templates/     # 訊息模板
│   └── analytics/     # 推播分析
└── webhook/           # Webhook 處理
    ├── receive/       # 接收事件
    └── process/       # 事件處理
```

#### 2. Webhook 事件處理系統

```python
from fastapi import FastAPI, Request, HTTPException
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import *

class WebhookEventProcessor:
    def __init__(self, bot_id: str):
        self.bot_id = bot_id
        self.line_bot_api = LineBotApi(channel_access_token)
        self.handler = WebhookHandler(channel_secret)
        
    async def process_event(self, event: dict):
        """處理 LINE Webhook 事件"""
        event_type = event.get('type')
        
        if event_type == 'message':
            await self._handle_message_event(event)
        elif event_type == 'follow':
            await self._handle_follow_event(event)
        elif event_type == 'unfollow':
            await self._handle_unfollow_event(event)
        elif event_type == 'postback':
            await self._handle_postback_event(event)
    
    async def _handle_message_event(self, event: dict):
        """處理訊息事件"""
        # 1. 儲存用戶訊息
        await self._save_user_message(event)
        
        # 2. 更新用戶活動
        await self._update_user_activity(event)
        
        # 3. 觸發自動回覆
        await self._trigger_auto_reply(event)
        
        # 4. 記錄分析數據
        await self._record_analytics(event)
```

#### 3. 自動回覆引擎

```python
class AutoReplyEngine:
    def __init__(self, bot_id: str):
        self.bot_id = bot_id
        
    async def find_matching_rules(self, message: str, user: LineUser) -> List[AutoReplyRule]:
        """找到匹配的自動回覆規則"""
        rules = await self._get_active_rules()
        matching_rules = []
        
        for rule in rules:
            if await self._check_rule_match(rule, message, user):
                matching_rules.append(rule)
        
        # 按優先級排序
        return sorted(matching_rules, key=lambda r: r.priority, reverse=True)
    
    async def _check_rule_match(self, rule: AutoReplyRule, message: str, user: LineUser) -> bool:
        """檢查規則是否匹配"""
        # 1. 檢查關鍵字/正則匹配
        if not self._check_trigger_match(rule.trigger, message):
            return False
        
        # 2. 檢查用戶條件
        if not self._check_user_conditions(rule.conditions, user):
            return False
        
        # 3. 檢查時間條件
        if not self._check_time_conditions(rule.conditions):
            return False
        
        # 4. 檢查冷卻時間
        if not await self._check_cooldown(rule, user):
            return False
        
        return True
```

#### 4. 用戶分群引擎

```python
class UserSegmentEngine:
    async def create_dynamic_segment(self, conditions: SegmentConditions) -> List[str]:
        """建立動態分群"""
        query = self._build_segment_query(conditions)
        users = await self._execute_query(query)
        return [user.line_user_id for user in users]
    
    def _build_segment_query(self, conditions: SegmentConditions) -> str:
        """建構分群查詢"""
        base_query = "SELECT line_user_id FROM line_users WHERE 1=1"
        
        if conditions.activity_level:
            base_query += f" AND total_interactions >= {conditions.activity_level.min_interactions}"
        
        if conditions.last_interaction:
            base_query += f" AND last_interaction >= '{conditions.last_interaction}'"
        
        if conditions.tags:
            tag_conditions = []
            for tag in conditions.tags:
                tag_conditions.append(f"EXISTS (SELECT 1 FROM user_tags WHERE user_id = line_users.id AND tag_name = '{tag}')")
            base_query += f" AND ({' AND '.join(tag_conditions)})"
        
        return base_query
```

### 🖥 前端技術架構

#### 1. 狀態管理架構

```typescript
// 使用 React Query + Zustand 組合
import { create } from 'zustand';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 全域狀態管理
interface AppState {
  currentBot: Bot | null;
  selectedUsers: string[];
  filters: FilterState;
  setCurrentBot: (bot: Bot) => void;
  setSelectedUsers: (users: string[]) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentBot: null,
  selectedUsers: [],
  filters: {},
  setCurrentBot: (bot) => set({ currentBot: bot }),
  setSelectedUsers: (users) => set({ selectedUsers: users }),
  updateFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
}));

// API 資料獲取 Hook
export const useUsers = (botId: string, filters: UserFilters) => {
  return useQuery({
    queryKey: ['users', botId, filters],
    queryFn: () => api.getUsers(botId, filters),
    enabled: !!botId,
    staleTime: 30000,
  });
};
```

#### 2. 即時數據更新

```typescript
// WebSocket 連接管理
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(botId: string) {
    const wsUrl = `${WS_BASE_URL}/ws/${botId}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealtimeUpdate(data);
    };
    
    this.ws.onclose = () => {
      this.handleReconnect();
    };
  }
  
  private handleRealtimeUpdate(data: RealtimeUpdate) {
    // 更新 React Query 快取
    queryClient.setQueryData(['dashboard', data.botId], (old: any) => {
      return { ...old, ...data.dashboard };
    });
    
    // 觸發相關組件重新渲染
    eventBus.emit('realtime-update', data);
  }
}
```

#### 3. 組件架構設計

```typescript
// 儀表板組件結構
const Dashboard: React.FC = () => {
  const { currentBot } = useAppStore();
  const { data: dashboardData, isLoading } = useDashboard(currentBot?.id);
  
  return (
    <div className="dashboard-container">
      <StatsOverview data={dashboardData?.overview} />
      <TrendCharts data={dashboardData?.trends} />
      <RecentActivity data={dashboardData?.recentActivity} />
      <QuickActions />
    </div>
  );
};

// 可重用的統計卡片組件
const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon }) => {
  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          {' from last month'}
        </p>
      </CardContent>
    </Card>
  );
};
```

### 🔐 安全性考量

#### 1. API 安全
- JWT Token 驗證
- API Rate Limiting
- 輸入驗證與消毒
- SQL 注入防護

#### 2. 資料安全
- 敏感資料加密存儲
- 資料庫連接加密
- 定期安全性審計
- 備份資料加密

#### 3. 權限控制
```python
class PermissionManager:
    def check_bot_access(self, user_id: str, bot_id: str) -> bool:
        """檢查用戶是否有權限存取特定 Bot"""
        return db.query(Bot).filter(
            Bot.id == bot_id,
            Bot.user_id == user_id
        ).first() is not None
    
    def check_feature_permission(self, user_id: str, feature: str) -> bool:
        """檢查用戶功能權限"""
        user_plan = self.get_user_plan(user_id)
        return feature in PLAN_FEATURES[user_plan]
```

---

## 介面設計規劃

### 🎨 設計系統

#### 1. 色彩配置
```css
:root {
  /* 主色調 - LINE 品牌色系 */
  --primary: #00B900;    /* LINE Green */
  --primary-dark: #009900;
  --primary-light: #E8F5E8;
  
  /* 輔助色彩 */
  --secondary: #0084FF;  /* Messenger Blue */
  --accent: #FF6B35;     /* Orange */
  --warning: #FFB800;    /* Amber */
  --error: #FF4757;      /* Red */
  --success: #2ED573;    /* Green */
  
  /* 中性色彩 */
  --neutral-100: #F8F9FA;
  --neutral-200: #E9ECEF;
  --neutral-300: #DEE2E6;
  --neutral-500: #6C757D;
  --neutral-700: #495057;
  --neutral-900: #212529;
}
```

#### 2. 響應式佈局
```typescript
// 響應式斷點定義
export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1280px',
  wide: '1536px',
};

// 響應式 Hook
export const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return { isMobile, isTablet };
};
```

### 📱 介面佈局設計

```mermaid
graph TD
    A[主導航列 Header] --> B[側邊選單 Sidebar]
    A --> C[主內容區 Main Content]
    A --> D[通知中心 Notifications]
    
    B --> E[儀表板]
    B --> F[用戶管理]
    B --> G[訊息中心]
    B --> H[自動回覆]
    B --> I[推播管理]
    B --> J[分析報告]
    B --> K[設定]
    
    C --> L[內容標題區]
    C --> M[工具列]
    C --> N[主要內容]
    C --> O[側邊資料面板]
```

#### 主要頁面佈局

```typescript
// 主要佈局組件
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isMobile } = useResponsive();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
        <main className={`flex-1 p-6 transition-all duration-300 ${
          sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'
        }`}>
          {children}
        </main>
      </div>
      <NotificationCenter />
    </div>
  );
};
```

### 🛠 組件庫設計

基於 shadcn/ui 擴展業務組件：

```typescript
// 專用業務組件
export const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => (
  <Card className="user-card hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="ml-3 flex-1">
        <h3 className="font-medium">{user.displayName}</h3>
        <p className="text-sm text-muted-foreground">
          最後互動: {formatDistanceToNow(user.lastInteraction)}
        </p>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex justify-between items-center">
        <UserStatusBadge status={user.status} />
        <div className="flex space-x-1">
          {user.tags.map(tag => (
            <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// 圖表組件
export const TrendChart: React.FC<TrendChartProps> = ({ data, title }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#00B900" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);
```

---

## 開發階段規劃

### 📅 開發時程規劃

#### 第一階段：基礎架構 (2-3 週)
- **後端基礎設施**
  - 資料庫 Schema 設計與建立
  - Webhook 事件處理系統
  - 基礎 API 端點開發
  - 認證授權系統整合

- **前端基礎設施**
  - 專案架構搭建
  - 路由系統設定
  - 狀態管理配置
  - 基礎組件庫建立

#### 第二階段：核心功能 (3-4 週)
- **用戶管理系統**
  - 用戶列表與搜尋功能
  - 用戶詳細資料頁面
  - 標籤管理系統
  - 基礎分群功能

- **訊息管理系統**
  - 訊息歷史記錄
  - 基礎 Flex Message 編輯
  - 多媒體資源管理

#### 第三階段：自動化功能 (3-4 週)
- **自動回覆引擎**
  - 關鍵字匹配系統
  - 回覆規則管理介面
  - 條件式回覆邏輯
  - 回覆效果統計

- **推播管理系統**
  - 推播訊息建立
  - 排程功能
  - 目標受眾選擇
  - 發送狀態追蹤

#### 第四階段：分析與優化 (2-3 週)
- **數據分析系統**
  - 儀表板開發
  - 報告生成功能
  - 即時數據更新
  - 效能監控

- **系統優化**
  - 效能優化
  - 使用者體驗改善
  - 錯誤處理完善
  - 安全性強化

#### 第五階段：測試與部署 (1-2 週)
- **系統測試**
  - 功能測試
  - 效能測試
  - 安全性測試
  - 使用者接受測試

- **部署準備**
  - 生產環境配置
  - 監控系統設定
  - 備份策略規劃
  - 文檔撰寫

### 🔄 開發流程

```mermaid
gitGraph
    commit id: "專案初始化"
    branch feature/backend-infrastructure
    checkout feature/backend-infrastructure
    commit id: "資料庫設計"
    commit id: "Webhook 系統"
    commit id: "基礎 API"
    checkout main
    merge feature/backend-infrastructure
    
    branch feature/frontend-infrastructure
    checkout feature/frontend-infrastructure
    commit id: "前端架構"
    commit id: "路由系統"
    commit id: "狀態管理"
    checkout main
    merge feature/frontend-infrastructure
    
    branch feature/user-management
    checkout feature/user-management
    commit id: "用戶列表"
    commit id: "用戶詳情"
    commit id: "標籤系統"
    checkout main
    merge feature/user-management
    
    branch feature/auto-reply
    checkout feature/auto-reply
    commit id: "關鍵字匹配"
    commit id: "回覆引擎"
    commit id: "管理介面"
    checkout main
    merge feature/auto-reply
    
    commit id: "版本發布 v1.0"
```

### 🧪 測試策略

#### 1. 單元測試
```typescript
// 自動回覆引擎測試
describe('AutoReplyEngine', () => {
  let engine: AutoReplyEngine;
  
  beforeEach(() => {
    engine = new AutoReplyEngine('test-bot-id');
  });
  
  test('should match exact keyword', async () => {
    const rule = {
      trigger: { type: 'keyword', pattern: 'hello', matchType: 'exact' },
      conditions: {},
      responses: [{ type: 'text', content: 'Hi there!' }]
    };
    
    const result = await engine.checkRuleMatch(rule, 'hello', mockUser);
    expect(result).toBe(true);
  });
  
  test('should respect cooldown period', async () => {
    const rule = { ...mockRule, conditions: { cooldown: 60 } };
    
    // 第一次觸發
    await engine.triggerRule(rule, mockUser);
    
    // 立即再次觸發應該被阻擋
    const result = await engine.checkRuleMatch(rule, 'hello', mockUser);
    expect(result).toBe(false);
  });
});
```

#### 2. 整合測試
```python
# API 整合測試
class TestAutoReplyAPI:
    def test_create_auto_reply_rule(self, client, auth_headers):
        """測試建立自動回覆規則"""
        rule_data = {
            "name": "Test Rule",
            "trigger": {"type": "keyword", "pattern": "test"},
            "responses": [{"type": "text", "content": "Test response"}]
        }
        
        response = client.post(
            "/api/v1/auto-reply/rules",
            json=rule_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        assert response.json()["name"] == "Test Rule"
    
    def test_webhook_event_processing(self, client):
        """測試 Webhook 事件處理"""
        webhook_data = {
            "events": [{
                "type": "message",
                "message": {"type": "text", "text": "hello"},
                "source": {"type": "user", "userId": "test-user"},
                "replyToken": "test-reply-token"
            }]
        }
        
        response = client.post("/api/v1/webhook", json=webhook_data)
        assert response.status_code == 200
```

#### 3. E2E 測試
```typescript
// Playwright E2E 測試
test.describe('用戶管理', () => {
  test('should display user list and allow filtering', async ({ page }) => {
    await page.goto('/users');
    
    // 等待用戶列表載入
    await page.waitForSelector('[data-testid="user-list"]');
    
    // 檢查是否顯示用戶
    const userCount = await page.locator('[data-testid="user-card"]').count();
    expect(userCount).toBeGreaterThan(0);
    
    // 測試搜尋功能
    await page.fill('[data-testid="search-input"]', 'test user');
    await page.waitForTimeout(500);
    
    const filteredCount = await page.locator('[data-testid="user-card"]').count();
    expect(filteredCount).toBeLessThanOrEqual(userCount);
  });
});
```

---

## 部署與維護

### 🚀 部署架構

#### 1. 容器化部署
```dockerfile
# 後端 Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# 前端 Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. Docker Compose 配置
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: linebot_web
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./Backend-v1
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/linebot_web
      - REDIS_URL=redis://redis:6379
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "443:443"
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
```

### 📊 監控與維護

#### 1. 系統監控
```python
# 健康檢查端點
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }
    
    # 資料庫連接檢查
    try:
        await db.execute("SELECT 1")
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = "unhealthy"
        health_status["status"] = "unhealthy"
    
    # Redis 連接檢查
    try:
        await redis.ping()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = "unhealthy"
        health_status["status"] = "unhealthy"
    
    # LINE API 連接檢查
    try:
        line_bot_api.get_bot_info()
        health_status["checks"]["line_api"] = "healthy"
    except Exception as e:
        health_status["checks"]["line_api"] = "unhealthy"
        health_status["status"] = "unhealthy"
    
    return health_status
```

#### 2. 日誌管理
```python
# 結構化日誌配置
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# 使用範例
logger.info("webhook_event_received", 
           bot_id=bot_id, 
           event_type=event.type,
           user_id=event.source.user_id)
```

#### 3. 效能監控
```python
# 請求追蹤中間件
import time
from starlette.middleware.base import BaseHTTPMiddleware

class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # 記錄慢查詢
        if process_time > 1.0:
            logger.warning("slow_request", 
                         path=request.url.path,
                         method=request.method,
                         duration=process_time)
        
        return response
```

### 🔒 安全維護

#### 1. 定期安全檢查
```bash
#!/bin/bash
# 安全檢查腳本

echo "檢查依賴套件安全性..."
pip-audit

echo "檢查程式碼安全性..."
bandit -r app/

echo "檢查 Docker 映像安全性..."
docker scan linebot-web:latest

echo "檢查 SSL 憑證..."
openssl x509 -in /etc/ssl/certs/linebot-web.crt -text -noout
```

#### 2. 備份策略
```bash
#!/bin/bash
# 資料庫備份腳本

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="linebot_web"

# 建立備份
pg_dump -h localhost -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

# 壓縮備份
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# 清理舊備份 (保留30天)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# 上傳到雲端存儲
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://linebot-backups/
```

---

## 📚 總結

這個完整的 LINE Bot 管理介面計劃涵蓋了：

### ✅ 核心功能
- **完整的用戶管理系統** - 分群、標籤、行為分析
- **智慧自動回覆引擎** - 關鍵字匹配、條件式回覆
- **強大的推播管理** - 排程推播、效果追蹤
- **深度數據分析** - 多維度報告、即時監控

### 🛠 技術亮點
- **現代化技術棧** - FastAPI + React + TypeScript
- **高效能架構** - 資料庫優化、快取策略
- **即時性支援** - WebSocket 即時更新
- **可擴展設計** - 模組化架構、容器化部署

### 📊 商業價值
- **提升運營效率** - 自動化減少人工成本
- **增強用戶體驗** - 智慧回覆、個性化服務
- **數據驅動決策** - 完整分析支援營運策略
- **企業級應用** - 安全、穩定、可擴展

這個計劃為 LINE Bot 管理提供了一個全面且實用的解決方案，能夠滿足從基礎管理到高級分析的各種需求。

---

*最後更新時間: 2024年12月30日*
*版本: v1.0*
*作者: Kilo Code - Architect Mode*