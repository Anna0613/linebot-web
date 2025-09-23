# 系統架構圖（LineBot-Web）

```mermaid
flowchart TB
  subgraph Client[Client]
    U[使用者 (Web)]
  end

  subgraph Frontend[Frontend (Vite React)]
    FE[前端應用<br/>Vite Dev: :8080<br/>Preview/Docker: :3000]
  end

  subgraph Backend[Backend (FastAPI)]
    BE[統一 API /api/v1<br/>Uvicorn Dev: :8000<br/>Docker 內部: :8005]
    WS[(WebSocket)]
    MEDIA[[/media 靜態]]
  end

  subgraph Data[資料層/外部服務]
    PG[(PostgreSQL)]
    R[(Redis)]
    M[(MongoDB 可選)]
    MINIO[(MinIO)]
    LINE[(LINE Platform)]
  end

  U -->|HTTP(S)| FE
  FE -->|REST /api/v1<br/>VITE_UNIFIED_API_URL| BE
  FE <-->|WebSocket| WS

  BE --- MEDIA
  BE --> PG
  BE --> R
  BE --> M
  BE --> MINIO

  LINE -->|Webhook 事件<br/>/api/v1/webhooks/{bot_id}| BE

  classDef note fill:#f7f7f7,stroke:#bbb,stroke-width:1px,color:#333;
  class FE,BE,PG,R,M,MINIO,LINE,WS,MEDIA note;
```

備註
- 本機開發：前端 8080、後端 8000；前端以 `VITE_UNIFIED_API_URL=http://localhost:8000` 連線
- Docker Compose：前端 3000 對外、後端 8001 對外（映射到容器內 8005）；容器間建議使用 `http://backend:8005`
- 所有 API 皆走 `/api/v1`，並提供 `/media` 靜態與 WebSocket（路由詳見後端程式）
