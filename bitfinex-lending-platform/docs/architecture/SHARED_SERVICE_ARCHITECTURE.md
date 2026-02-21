# 共享服務架構設計文檔

## 概述

本文檔描述 Bitfinex 放貸機器人的共享服務架構重構方案。目標是將公共資源抽離成共享服務，同時支援個人模式和多租戶模式。

---

## ⚠️ 重要：代碼共用設計

### 問題：如何避免維護兩套代碼？

**錯誤的做法** (維護困難):
```
internal/shared/
├── embedded/
│   └── market_data.go    ← 實現 A
└── remote/
    └── market_data.go    ← 實現 B（重複邏輯！）
```

**正確的做法** (單一代碼庫):
```
internal/shared/
├── market_data.go        ← 核心邏輯（唯一一份）
├── transport/
│   ├── embedded.go       ← 薄包裝：直接調用
│   └── grpc.go           ← 薄包裝：網絡傳輸
└── client/
    └── market_data_client.go  ← 多租戶 Bot 用的客戶端
```

### 設計原則

```
┌─────────────────────────────────────────────────────────────┐
│                     代碼共用架構                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     MarketDataService (核心邏輯 - 只有這一份)        │   │
│  │     ════════════════════════════════════════════    │   │
│  │  type MarketDataService struct {                    │   │
│  │      wsClient    *WebSocketClient                   │   │
│  │      orderBook   *OrderBook                         │   │
│  │      subscribers []Subscriber                       │   │
│  │  }                                                  │   │
│  │                                                     │   │
│  │  func (s *MarketDataService) Subscribe(...)         │   │
│  │  func (s *MarketDataService) GetFRR() float64       │   │
│  │  func (s *MarketDataService) GetOrderBook() ...     │   │
│  │                                                     │   │
│  │  *** 修改這裡，兩種模式都會生效 ***                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│           ┌───────────────┴───────────────┐                │
│           │                               │                │
│           ▼                               ▼                │
│  ┌─────────────────┐            ┌─────────────────┐        │
│  │   個人模式       │            │   多租戶模式     │        │
│  │                 │            │                 │        │
│  │  Bot 進程內     │            │ ┌─────────────┐ │        │
│  │  直接持有       │            │ │gRPC Server  │ │        │
│  │  Service 實例   │            │ │包裝 Service │ │        │
│  │                 │            │ └──────┬──────┘ │        │
│  │  bot.svc.GetFRR │            │        │        │        │
│  │  (函數調用)     │            │        │ gRPC   │        │
│  │                 │            │        ▼        │        │
│  └─────────────────┘            │ ┌─────────────┐ │        │
│                                 │ │gRPC Client  │ │        │
│                                 │ │(Bot Worker) │ │        │
│                                 │ └─────────────┘ │        │
│                                 └─────────────────┘        │
│                                                             │
│  關鍵點：                                                    │
│  • MarketDataService 代碼只有一份                           │
│  • gRPC Server/Client 只是薄薄的傳輸層                      │
│  • 傳輸層幾乎沒有業務邏輯，只做序列化/反序列化              │
│  • 新增功能只需改 Service，傳輸層自動繼承                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 代碼示例

```go
// ============================================
// 核心服務 (唯一一份代碼)
// internal/shared/market_data.go
// ============================================
type MarketDataService struct {
    wsClient    *websocket.Client
    frr         float64
    orderBook   *OrderBook
    subscribers sync.Map
    mu          sync.RWMutex
}

func NewMarketDataService(cfg *Config) *MarketDataService {
    // 初始化 WebSocket 連接等
}

func (s *MarketDataService) GetFRR(currency string) float64 {
    s.mu.RLock()
    defer s.mu.RUnlock()
    return s.frr
}

func (s *MarketDataService) Subscribe(currency string, handler Handler) func() {
    // 訂閱邏輯
}

// ============================================
// 個人模式：直接使用
// cmd/bot/main.go
// ============================================
func main() {
    svc := shared.NewMarketDataService(cfg)
    bot := NewBot(svc)  // 直接傳入 service
    bot.Run()
}

// Bot 內部直接調用
frr := b.marketDataSvc.GetFRR("USD")  // 函數調用，零開銷

// ============================================
// 多租戶模式：加一層 gRPC
// cmd/market-data-svc/main.go (獨立進程)
// ============================================
func main() {
    svc := shared.NewMarketDataService(cfg)
    grpcServer := grpc.NewServer()
    pb.RegisterMarketDataServer(grpcServer, &grpcWrapper{svc: svc})
    grpcServer.Serve(lis)
}

// gRPC 包裝器 (極薄，幾乎無邏輯)
type grpcWrapper struct {
    svc *shared.MarketDataService
}

func (w *grpcWrapper) GetFRR(ctx context.Context, req *pb.GetFRRRequest) (*pb.FRRResponse, error) {
    frr := w.svc.GetFRR(req.Currency)  // 直接調用核心服務
    return &pb.FRRResponse{Frr: frr}, nil
}

// Bot Worker 使用 gRPC Client
frr := b.marketDataClient.GetFRR(ctx, "USD")  // 網絡調用
```

---

## ⚠️ 重要：抽離適合性分析

在抽離之前，必須確認每個服務是否真的適合共享。

### Bitfinex API 認證分析

從 `internal/client/interface.go` 分析：

| API 方法 | 需要認證？ | 可共享？ |
|---------|-----------|---------|
| GetMarketData() | ❌ 公共 | ✅ 是 |
| GetRecentTrades() | ❌ 公共 | ✅ 是 |
| OrderBook (WebSocket) | ❌ 公共 | ✅ 是 |
| Ticker/FRR (WebSocket) | ❌ 公共 | ✅ 是 |
| GetWalletBalances() | ✅ 需要 API Key | ❌ 否 |
| SubmitFundingOffer() | ✅ 需要 API Key | ❌ 否 |
| GetActiveFundingOffers() | ✅ 需要 API Key | ❌ 否 |
| GetFundingCredits() | ✅ 需要 API Key | ❌ 否 |
| GetLedgerEntries() | ✅ 需要 API Key | ❌ 否 |

### WebSocket 頻道認證分析

| 頻道 | 需要認證？ | 可共享？ |
|------|-----------|---------|
| book:fUSD | ❌ 公共 | ✅ 是 |
| trades:fUSD | ❌ 公共 | ✅ 是 |
| ticker:fUSD | ❌ 公共 | ✅ 是 |
| fon (funding offer new) | ✅ 私有 | ❌ 否 |
| fcs (funding credits snapshot) | ✅ 私有 | ❌ 否 |
| fcn/fcu/fcc (credit events) | ✅ 私有 | ❌ 否 |

### 服務抽離適合性總結

```
┌─────────────────────────────────────────────────────────────┐
│                     抽離適合性分析                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ 完全適合抽離                                             │
│  ══════════════                                             │
│  1. 公共市場數據 (FRR, OrderBook, Trades, Ticker)           │
│     - 100% 公共，不需認證                                    │
│     - 所有用戶看到完全相同的數據                             │
│     - 抽離後 N 用戶共用 1 個 WebSocket                       │
│                                                             │
│  2. 技術指標計算                                             │
│     - 基於公共市場數據                                       │
│     - 計算邏輯無用戶相關性                                   │
│     - 抽離後 N 用戶共用 1 次計算                             │
│                                                             │
│  3. 公共歷史數據 (FRR 歷史、成交歷史)                        │
│     - 公共數據的歷史記錄                                     │
│     - 抽離後只需存儲 1 份                                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ 部分適合抽離                                             │
│  ════════════════                                           │
│  4. ML 預測服務                                              │
│     ✅ 可共享：基於公共數據的預測結果                        │
│     ⚠️ 注意：用戶風險偏好調整在 Bot 策略層處理               │
│                                                             │
│  5. 通知服務                                                 │
│     ✅ 可共享：系統級警報 (FRR 突增、高波動)                 │
│     ❌ 不可共享：用戶訂單通知 (需要路由到特定用戶)           │
│                                                             │
│  6. Rate Limit 管理                                          │
│     ✅ 可共享：公共 API 限制 (基於 IP)                       │
│     ✅ 可共享：WebSocket 連接數限制 (基於 IP)                │
│     ❌ 不可共享：私有 API 限制 (基於 API Key，用戶各自獨立)  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ❌ 不適合抽離                                               │
│  ══════════════                                             │
│  7. 用戶錢包和餘額                                           │
│     - 需要用戶 API Key                                       │
│     - 每個用戶數據完全不同                                   │
│                                                             │
│  8. 用戶訂單操作 (提交/取消)                                 │
│     - 需要用戶 API Key                                       │
│     - 操作結果只影響該用戶                                   │
│                                                             │
│  9. 用戶持倉和收益                                           │
│     - 需要用戶 API Key                                       │
│     - 每個用戶數據完全不同                                   │
│                                                             │
│  10. 用戶策略配置和表現統計                                  │
│     - 用戶私有數據                                           │
│     - 不應跨用戶共享                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 潛在問題與解決方案

#### 問題 1: 技術指標參數自定義

**問題**: 如果用戶 A 想用 SMA-5，用戶 B 想用 SMA-10，怎麼辦？

**解決方案**:
```go
type IndicatorService struct {
    // 預計算常用指標
    precomputed map[string]float64  // "SMA_5", "SMA_10", "SMA_20"

    // 提供原始數據讓用戶自行計算
    rawFRRHistory []float64
}

// 策略層可以：
// 1. 使用預計算的常用指標
// 2. 用原始數據計算自定義指標
```

#### 問題 2: 多幣種處理

**問題**: USD 和 USDT 是不同的市場，需要分開嗎？

**解決方案**:
```go
type MarketDataService struct {
    // 每個幣種獨立的數據流
    streams map[string]*CurrencyStream  // "USD", "USDT"
}

func (s *MarketDataService) GetFRR(currency string) float64 {
    return s.streams[currency].GetFRR()
}
```

#### 問題 3: 服務不可用時的降級

**問題**: 多租戶模式下，如果共享服務掛了怎麼辦？

**解決方案**:
```go
type BotWithFallback struct {
    primary   MarketDataProvider  // 遠端服務
    fallback  MarketDataProvider  // 本地備份
}

func (b *BotWithFallback) GetFRR(currency string) (float64, error) {
    frr, err := b.primary.GetFRR(currency)
    if err != nil {
        logrus.Warn("Primary market data service unavailable, using fallback")
        return b.fallback.GetFRR(currency)
    }
    return frr, nil
}
```

---

## 問題分析

### 現有架構問題

```
┌─────────────────────────────────────────────────────────────┐
│                     現有架構 (問題)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Bot 1      │  │  Bot 2      │  │  Bot 3      │         │
│  │  (User A)   │  │  (User B)   │  │  (User C)   │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ WebSocket   │  │ WebSocket   │  │ WebSocket   │         │
│  │ - FRR       │  │ - FRR       │  │ - FRR       │  ← 重複！│
│  │ - OrderBook │  │ - OrderBook │  │ - OrderBook │         │
│  │ - Trades    │  │ - Trades    │  │ - Trades    │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ Indicators  │  │ Indicators  │  │ Indicators  │  ← 重複！│
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │ ML Service  │  │ ML Service  │  │ ML Service  │  ← 重複！│
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  問題：                                                      │
│  1. N 個用戶 = N 個 WebSocket 連接（浪費資源）               │
│  2. N 個用戶 = N 次重複計算指標（浪費 CPU）                  │
│  3. N 個用戶 = N 次 API 調用（可能觸發 Rate Limit）          │
│  4. 相同數據被儲存 N 份（浪費記憶體）                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 目標架構

```
┌─────────────────────────────────────────────────────────────┐
│                     目標架構 (共享服務)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Shared Services Layer                   │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐         │   │
│  │  │ Market    │ │ Indicator │ │ ML        │         │   │
│  │  │ Data Svc  │ │ Service   │ │ Service   │         │   │
│  │  │           │ │           │ │           │         │   │
│  │  │ • FRR     │ │ • SMA/EMA │ │ • Rate    │         │   │
│  │  │ • Book    │ │ • Vol     │ │   Predict │         │   │
│  │  │ • Trades  │ │ • Depth   │ │ • Trend   │         │   │
│  │  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘         │   │
│  │        │             │             │                │   │
│  │        └─────────────┴─────────────┘                │   │
│  │                      │                               │   │
│  │        ┌─────────────┴─────────────┐                │   │
│  │        │    Event Bus / Pub-Sub    │                │   │
│  │        └─────────────┬─────────────┘                │   │
│  └──────────────────────┼──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────┼──────────────────────────────┐   │
│  │                      │    Bot Layer                  │   │
│  │  ┌─────────────┐ ┌───┴───────┐ ┌─────────────┐      │   │
│  │  │  Bot 1      │ │  Bot 2    │ │  Bot 3      │      │   │
│  │  │  (User A)   │ │  (User B) │ │  (User C)   │      │   │
│  │  ├─────────────┤ ├───────────┤ ├─────────────┤      │   │
│  │  │ Strategy    │ │ Strategy  │ │ Strategy    │      │   │
│  │  │ Credentials │ │ Creds     │ │ Credentials │      │   │
│  │  │ User Config │ │ Config    │ │ User Config │      │   │
│  │  └─────────────┘ └───────────┘ └─────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  優點：                                                      │
│  1. 1 個 WebSocket 連接服務 N 個用戶                         │
│  2. 指標只計算 1 次，所有用戶共享                            │
│  3. API 調用集中管理，避免 Rate Limit                        │
│  4. 數據只儲存 1 份，大幅節省記憶體                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 可共享的服務元件

### 1. 市場數據服務 (Market Data Service)

| 數據類型 | 說明 | 更新頻率 | 共享效益 |
|---------|------|---------|---------|
| FRR (Flash Return Rate) | 當前市場利率 | ~30秒 | 高 |
| Order Book | 訂單簿深度 | 實時 | 高 |
| Trades | 成交記錄 | 實時 | 高 |
| Ticker | 價格/成交量 | ~1秒 | 中 |

**共享效益**: 1 個 WebSocket 連接取代 N 個，節省 99% 連接資源

### 2. 技術指標服務 (Indicator Service)

| 指標類別 | 指標數量 | 計算複雜度 | 共享效益 |
|---------|---------|-----------|---------|
| 訂單簿分析 | 6 個 | O(n) | 高 |
| 供需壓力 | 4 個 | O(1) | 中 |
| 波動率 | 4 個 | O(n) | 高 |
| 移動平均 | 6 個 | O(n) | 高 |
| 市場微結構 | 4 個 | O(n) | 高 |
| 價格水平 | 3 個 | O(n) | 高 |

**共享效益**: 32 個指標只需計算 1 次，節省 (N-1)/N 的 CPU

### 3. ML 預測服務 (ML Prediction Service)

| 預測類型 | 模型 | 計算資源 | 共享效益 |
|---------|------|---------|---------|
| 利率趨勢 | LSTM | GPU | 極高 |
| 波動率預測 | XGBoost | CPU | 高 |
| 最佳期限 | Random Forest | CPU | 高 |

**共享效益**: ML 推論只需執行 1 次，GPU 資源利用率最大化

### 4. 歷史數據服務 (History Service)

| 數據類型 | 保留時間 | 儲存大小 | 共享效益 |
|---------|---------|---------|---------|
| FRR 歷史 | 30 天 | ~10MB | 高 |
| 成交歷史 | 7 天 | ~50MB | 高 |
| 策略表現 | 90 天 | ~5MB/用戶 | 中 |

**共享效益**: 公共數據只存 1 份，節省 (N-1) × 60MB 儲存

### 5. 通知服務 (Notification Service)

| 通知類型 | 渠道 | Rate Limit | 共享效益 |
|---------|------|-----------|---------|
| 市場警報 | Telegram/Email | 有限制 | 高 |
| 系統通知 | Push/WebSocket | 無限制 | 中 |

**共享效益**: 批量發送、統一 Rate Limit 管理

### 6. Rate Limit 管理器 (Rate Limit Manager)

| API 類型 | 限制 | 共享效益 |
|---------|------|---------|
| Bitfinex REST | 10 req/min | 極高 |
| Bitfinex WS | 連接數限制 | 極高 |
| Telegram | 30 msg/sec | 高 |

**共享效益**: 統一管理 API 配額，防止超限

## 部署模式

### 模式 1: 個人模式 (Personal Mode)

```
┌─────────────────────────────────────────────────────────────┐
│                     個人模式部署                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Single Process                       │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │         Embedded Shared Services             │    │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │   │
│  │  │  │Market   │ │Indicator│ │History  │        │    │   │
│  │  │  │Data Svc │ │Service  │ │Service  │        │    │   │
│  │  │  │(gorout.)│ │(gorout.)│ │(in-mem) │        │    │   │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘        │    │   │
│  │  │       │           │           │              │    │   │
│  │  │       └───────────┼───────────┘              │    │   │
│  │  │                   │                          │    │   │
│  │  │       ┌───────────┴───────────┐              │    │   │
│  │  │       │    Channel Pub-Sub    │              │    │   │
│  │  │       └───────────┬───────────┘              │    │   │
│  │  └───────────────────┼───────────────────────────┘   │   │
│  │                      │                               │   │
│  │  ┌───────────────────┴───────────────────────────┐   │   │
│  │  │              Bot (Single User)                │   │   │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐   │   │   │
│  │  │  │ Strategy  │ │ Executor  │ │ Web UI    │   │   │   │
│  │  │  └───────────┘ └───────────┘ └───────────┘   │   │   │
│  │  └───────────────────────────────────────────────┘   │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  特點：                                                      │
│  • 零配置，單一二進制執行檔                                  │
│  • 共享服務以 goroutine 形式內嵌                             │
│  • 使用 Go channel 進行進程內通訊                            │
│  • 與多租戶模式使用相同的介面抽象                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**關鍵設計**: 個人模式使用 **內嵌實現 (Embedded Implementation)**，所有服務在同一進程內以 goroutine 形式運行，通過 Go channel 通訊。這保持了零配置的簡潔性，同時代碼架構與多租戶模式完全兼容。

### 模式 2: 多租戶模式 (Multi-Tenant Mode)

```
┌─────────────────────────────────────────────────────────────┐
│                     多租戶模式部署                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Shared Services (獨立進程)              │   │
│  │                                                      │   │
│  │  ┌─────────────┐                                    │   │
│  │  │ Market Data │ ← 單一 WebSocket 連接               │   │
│  │  │ Service     │                                    │   │
│  │  │ (Container) │                                    │   │
│  │  └──────┬──────┘                                    │   │
│  │         │                                            │   │
│  │  ┌──────┴──────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ Indicator   │ │ ML          │ │ History     │   │   │
│  │  │ Service     │ │ Service     │ │ Service     │   │   │
│  │  │ (Container) │ │ (Container) │ │ (Container) │   │   │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │   │
│  │         │               │               │           │   │
│  │         └───────────────┼───────────────┘           │   │
│  │                         │                            │   │
│  │         ┌───────────────┴───────────────┐           │   │
│  │         │    Redis Pub-Sub / NATS       │           │   │
│  │         └───────────────┬───────────────┘           │   │
│  └─────────────────────────┼───────────────────────────┘   │
│                            │                                │
│  ┌─────────────────────────┼───────────────────────────┐   │
│  │                         │    Bot Workers             │   │
│  │  ┌──────────┐  ┌────────┴──┐  ┌──────────┐          │   │
│  │  │ Worker 1 │  │ Worker 2  │  │ Worker 3 │          │   │
│  │  │ (User A) │  │ (User B)  │  │ (User C) │          │   │
│  │  │          │  │           │  │          │          │   │
│  │  │ Bot Pool │  │ Bot Pool  │  │ Bot Pool │          │   │
│  │  └──────────┘  └───────────┘  └──────────┘          │   │
│  │                                                      │   │
│  │  每個 Worker 可運行多個用戶的 Bot                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  特點：                                                      │
│  • 服務獨立部署，可水平擴展                                  │
│  • 使用 Redis/NATS 進行進程間通訊                            │
│  • 共享服務高可用 (多副本)                                   │
│  • 支援數百/數千個用戶                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 介面定義

### 1. MarketDataProvider 介面

```go
// MarketDataProvider defines the interface for market data access
// Both embedded and remote implementations satisfy this interface
type MarketDataProvider interface {
    // Subscribe to real-time market data updates
    Subscribe(currency string, handler MarketDataHandler) (unsubscribe func(), err error)

    // Get current market data snapshot
    GetMarketData(currency string) (*MarketData, error)

    // Get order book
    GetOrderBook(currency string) (*OrderBook, error)

    // Get recent trades
    GetRecentTrades(currency string, limit int) ([]Trade, error)

    // Get FRR history
    GetFRRHistory(currency string, duration time.Duration) ([]FRRPoint, error)
}

// MarketDataHandler handles real-time market data updates
type MarketDataHandler func(update MarketDataUpdate)

// MarketDataUpdate represents a real-time update
type MarketDataUpdate struct {
    Type      UpdateType  // FRR, OrderBook, Trade
    Currency  string
    Timestamp time.Time
    Data      interface{}
}
```

### 2. IndicatorProvider 介面

```go
// IndicatorProvider defines the interface for technical indicator access
type IndicatorProvider interface {
    // Get all calculated indicators
    GetIndicators(currency string) (*TechnicalIndicators, error)

    // Subscribe to indicator updates
    Subscribe(currency string, handler IndicatorHandler) (unsubscribe func(), err error)

    // Get specific indicator value
    GetIndicator(currency string, name IndicatorName) (float64, error)

    // Get indicator history
    GetIndicatorHistory(currency string, name IndicatorName, duration time.Duration) ([]IndicatorPoint, error)
}
```

### 3. MLPredictionProvider 介面

```go
// MLPredictionProvider defines the interface for ML predictions
type MLPredictionProvider interface {
    // Get rate prediction
    PredictRate(currency string, horizon time.Duration) (*RatePrediction, error)

    // Get volatility prediction
    PredictVolatility(currency string) (*VolatilityPrediction, error)

    // Get optimal period recommendation
    RecommendPeriod(currency string, riskProfile RiskProfile) (int, error)

    // Subscribe to prediction updates
    Subscribe(currency string, handler PredictionHandler) (unsubscribe func(), err error)
}
```

### 4. HistoryProvider 介面

```go
// HistoryProvider defines the interface for historical data access
type HistoryProvider interface {
    // Store data point
    Store(currency string, dataType DataType, data interface{}) error

    // Query historical data
    Query(currency string, dataType DataType, start, end time.Time) ([]DataPoint, error)

    // Get aggregated statistics
    GetStats(currency string, dataType DataType, period time.Duration) (*Stats, error)
}
```

### 5. NotificationProvider 介面

```go
// NotificationProvider defines the interface for sending notifications
type NotificationProvider interface {
    // Send notification to user
    Send(userID string, notification Notification) error

    // Send batch notifications
    SendBatch(notifications []UserNotification) error

    // Subscribe to system notifications
    SubscribeSystem(handler NotificationHandler) (unsubscribe func(), err error)
}
```

### 6. RateLimitManager 介面

```go
// RateLimitManager defines the interface for rate limit management
type RateLimitManager interface {
    // Acquire permission to make API call
    Acquire(apiType APIType, count int) error

    // Check remaining quota
    Remaining(apiType APIType) int

    // Wait until quota is available
    Wait(ctx context.Context, apiType APIType, count int) error
}
```

## 實現架構

### 個人模式實現

```go
// EmbeddedServices provides in-process shared services for personal mode
type EmbeddedServices struct {
    marketData  *EmbeddedMarketDataService
    indicators  *EmbeddedIndicatorService
    history     *EmbeddedHistoryService
    rateLimit   *EmbeddedRateLimitManager

    // Internal communication
    marketChan    chan MarketDataUpdate
    indicatorChan chan IndicatorUpdate
}

// NewEmbeddedServices creates embedded services for personal mode
func NewEmbeddedServices(config *Config) (*EmbeddedServices, error) {
    svc := &EmbeddedServices{
        marketChan:    make(chan MarketDataUpdate, 100),
        indicatorChan: make(chan IndicatorUpdate, 100),
    }

    // Initialize embedded services (all in-process)
    svc.marketData = NewEmbeddedMarketDataService(config.Bitfinex)
    svc.indicators = NewEmbeddedIndicatorService(svc.marketChan)
    svc.history = NewEmbeddedHistoryService() // In-memory storage
    svc.rateLimit = NewEmbeddedRateLimitManager()

    return svc, nil
}

// GetMarketDataProvider returns the market data provider
func (s *EmbeddedServices) GetMarketDataProvider() MarketDataProvider {
    return s.marketData
}

// GetIndicatorProvider returns the indicator provider
func (s *EmbeddedServices) GetIndicatorProvider() IndicatorProvider {
    return s.indicators
}
```

### 多租戶模式實現

```go
// RemoteServices provides remote shared services for multi-tenant mode
type RemoteServices struct {
    marketData  *RemoteMarketDataClient
    indicators  *RemoteIndicatorClient
    history     *RemoteHistoryClient
    rateLimit   *RemoteRateLimitClient

    // Redis pub-sub for real-time updates
    redis *redis.Client
}

// NewRemoteServices creates remote service clients for multi-tenant mode
func NewRemoteServices(config *RemoteConfig) (*RemoteServices, error) {
    svc := &RemoteServices{
        redis: redis.NewClient(&redis.Options{
            Addr: config.RedisAddr,
        }),
    }

    // Initialize remote clients
    svc.marketData = NewRemoteMarketDataClient(config.MarketDataURL)
    svc.indicators = NewRemoteIndicatorClient(config.IndicatorURL)
    svc.history = NewRemoteHistoryClient(config.HistoryURL)
    svc.rateLimit = NewRemoteRateLimitClient(svc.redis)

    return svc, nil
}

// GetMarketDataProvider returns the market data provider (remote implementation)
func (s *RemoteServices) GetMarketDataProvider() MarketDataProvider {
    return s.marketData
}
```

### 統一服務容器

```go
// ServiceContainer provides unified access to shared services
// Works transparently with both embedded and remote implementations
type ServiceContainer struct {
    MarketData   MarketDataProvider
    Indicators   IndicatorProvider
    ML           MLPredictionProvider
    History      HistoryProvider
    Notification NotificationProvider
    RateLimit    RateLimitManager
}

// NewServiceContainer creates a service container based on deployment mode
func NewServiceContainer(mode DeploymentMode, config *Config) (*ServiceContainer, error) {
    switch mode {
    case PersonalMode:
        embedded, err := NewEmbeddedServices(config)
        if err != nil {
            return nil, err
        }
        return &ServiceContainer{
            MarketData: embedded.GetMarketDataProvider(),
            Indicators: embedded.GetIndicatorProvider(),
            History:    embedded.GetHistoryProvider(),
            RateLimit:  embedded.GetRateLimitManager(),
        }, nil

    case MultiTenantMode:
        remote, err := NewRemoteServices(config.Remote)
        if err != nil {
            return nil, err
        }
        return &ServiceContainer{
            MarketData: remote.GetMarketDataProvider(),
            Indicators: remote.GetIndicatorProvider(),
            History:    remote.GetHistoryProvider(),
            RateLimit:  remote.GetRateLimitManager(),
        }, nil

    default:
        return nil, fmt.Errorf("unknown deployment mode: %v", mode)
    }
}
```

## 數據流

### 個人模式數據流

```
┌──────────────────────────────────────────────────────────────┐
│                     個人模式數據流                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Bitfinex                                                    │
│     │                                                        │
│     │ WebSocket                                              │
│     ▼                                                        │
│  ┌─────────────────────┐                                    │
│  │ EmbeddedMarketData  │                                    │
│  │ Service (goroutine) │                                    │
│  └──────────┬──────────┘                                    │
│             │                                                │
│             │ chan MarketDataUpdate                          │
│             ▼                                                │
│  ┌──────────┴──────────┐                                    │
│  │                     │                                    │
│  ▼                     ▼                                    │
│ ┌──────────────┐  ┌───────────────┐                         │
│ │ Indicator    │  │ History       │                         │
│ │ Service      │  │ Service       │                         │
│ │ (goroutine)  │  │ (in-memory)   │                         │
│ └──────┬───────┘  └───────────────┘                         │
│        │                                                     │
│        │ chan IndicatorUpdate                                │
│        ▼                                                     │
│  ┌─────────────────────┐                                    │
│  │        Bot          │                                    │
│  │  ┌───────────────┐  │                                    │
│  │  │   Strategy    │  │                                    │
│  │  └───────┬───────┘  │                                    │
│  │          │          │                                    │
│  │          ▼          │                                    │
│  │  ┌───────────────┐  │                                    │
│  │  │   Executor    │──┼──► Bitfinex REST API               │
│  │  └───────────────┘  │                                    │
│  └─────────────────────┘                                    │
│                                                              │
│  特點：                                                       │
│  • 所有通訊使用 Go channel (零網絡開銷)                       │
│  • 數據存儲在進程內存中                                       │
│  • 單進程，單二進制，零配置                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 多租戶模式數據流

```
┌──────────────────────────────────────────────────────────────┐
│                     多租戶模式數據流                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Bitfinex                                                    │
│     │                                                        │
│     │ WebSocket (單一連接)                                   │
│     ▼                                                        │
│  ┌─────────────────────┐                                    │
│  │ Market Data Service │ (獨立容器)                          │
│  │ • 接收市場數據       │                                    │
│  │ • 發布到 Redis      │                                    │
│  └──────────┬──────────┘                                    │
│             │                                                │
│             │ Redis Pub-Sub: market:usd, market:usdt         │
│             ▼                                                │
│  ┌──────────┴───────────────────────────────────────────┐   │
│  │                    Redis Cluster                      │   │
│  │  • Pub-Sub channels                                   │   │
│  │  • Cached data (TTL: 1min)                           │   │
│  │  • Rate limit counters                                │   │
│  └──────────┬───────────────────────────────────────────┘   │
│             │                                                │
│   ┌─────────┼─────────┬─────────────┐                       │
│   │         │         │             │                       │
│   ▼         ▼         ▼             ▼                       │
│ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐            │
│ │Indicat.│ │History │ │ Bot      │ │ Bot      │            │
│ │Service │ │Service │ │ Worker 1 │ │ Worker 2 │            │
│ │(訂閱)  │ │(訂閱)  │ │(User A)  │ │(User B,C)│            │
│ └───┬────┘ └────────┘ └────┬─────┘ └────┬─────┘            │
│     │                      │            │                   │
│     │ Redis Pub-Sub:       │            │                   │
│     │ indicator:usd        │            │                   │
│     └──────────────────────┼────────────┘                   │
│                            │                                 │
│                            ▼                                 │
│                   Bitfinex REST API                          │
│                   (Rate Limited via Redis)                   │
│                                                              │
│  特點：                                                       │
│  • 服務獨立部署，可水平擴展                                   │
│  • 使用 Redis Streams 實現可靠的跨進程通訊                   │
│  • 單一 WebSocket 連接服務所有用戶                            │
│  • 統一的 Rate Limit 管理                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚠️ 關鍵設計改進 (Review 後更新)

根據架構 Review 的建議，以下是關鍵改進設計：

### 改進 1: Redis Streams 取代 Pub-Sub (P0)

**問題**: Redis Pub-Sub 是 Fire-and-Forget 機制，Bot Worker 重啟期間會遺漏消息。

**解決方案**: 使用 Redis Streams 實現可靠消息傳遞。

```go
// ============================================
// 消息發布端 (MarketDataService)
// ============================================
func (s *MarketDataService) PublishFRR(ctx context.Context, frr float64) error {
    return s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: "market:frr:USD",
        MaxLen: 10000,  // 保留最近 10000 條消息
        Approx: true,   // 近似裁剪，性能更好
        Values: map[string]interface{}{
            "frr":       frr,
            "timestamp": time.Now().UnixMilli(),
            "source":    "bitfinex-ws",
        },
    }).Err()
}

func (s *MarketDataService) PublishOrderBook(ctx context.Context, book *OrderBook) error {
    data, _ := json.Marshal(book)
    return s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: "market:orderbook:USD",
        MaxLen: 1000,
        Approx: true,
        Values: map[string]interface{}{
            "data":      string(data),
            "timestamp": time.Now().UnixMilli(),
        },
    }).Err()
}

// ============================================
// 消息消費端 (Bot Worker)
// ============================================
type StreamConsumer struct {
    redis      *redis.Client
    groupName  string           // "bot-workers"
    consumerID string           // "worker-1"
    lastID     map[string]string // 每個 stream 的消費進度
}

func (c *StreamConsumer) ConsumeMarketData(ctx context.Context) {
    streams := []string{
        "market:frr:USD", ">",       // ">" 表示只讀取新消息
        "market:orderbook:USD", ">",
    }

    for {
        // 使用消費者組，確保消息只被一個 consumer 處理
        result, err := c.redis.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    c.groupName,
            Consumer: c.consumerID,
            Streams:  streams,
            Block:    5 * time.Second,
            Count:    100,
        }).Result()

        if err == redis.Nil {
            continue // 超時，繼續等待
        }
        if err != nil {
            logrus.WithError(err).Error("XReadGroup failed")
            time.Sleep(time.Second)
            continue
        }

        for _, stream := range result {
            for _, msg := range stream.Messages {
                if err := c.processMessage(ctx, stream.Stream, msg); err != nil {
                    logrus.WithError(err).Error("Process message failed")
                    continue
                }
                // 確認消息已處理
                c.redis.XAck(ctx, stream.Stream, c.groupName, msg.ID)
            }
        }
    }
}

// 重啟後從斷點恢復
func (c *StreamConsumer) RecoverPendingMessages(ctx context.Context) error {
    // 讀取所有未確認的消息
    pending, _ := c.redis.XPendingExt(ctx, &redis.XPendingExtArgs{
        Stream:   "market:frr:USD",
        Group:    c.groupName,
        Consumer: c.consumerID,
        Start:    "-",
        End:      "+",
        Count:    1000,
    }).Result()

    for _, p := range pending {
        // 重新處理未確認的消息
        msgs, _ := c.redis.XRange(ctx, "market:frr:USD", p.ID, p.ID).Result()
        for _, msg := range msgs {
            c.processMessage(ctx, "market:frr:USD", msg)
            c.redis.XAck(ctx, "market:frr:USD", c.groupName, msg.ID)
        }
    }
    return nil
}
```

**數據流圖**:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Redis Streams 可靠消息傳遞                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MarketDataService                                              │
│       │                                                         │
│       │ XADD market:frr:USD                                     │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Redis Streams                               │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ market:frr:USD                                  │    │   │
│  │  │ ├── 1702800000001-0: {frr: 0.00025, ts: ...}   │    │   │
│  │  │ ├── 1702800000002-0: {frr: 0.00026, ts: ...}   │    │   │
│  │  │ └── 1702800000003-0: {frr: 0.00024, ts: ...}   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  Consumer Group: "bot-workers"                           │   │
│  │  ├── worker-1: lastID = 1702800000002-0                 │   │
│  │  ├── worker-2: lastID = 1702800000003-0                 │   │
│  │  └── worker-3: lastID = 1702800000001-0 (落後！)        │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  優點：                                                          │
│  • 消息持久化，重啟不丟失                                        │
│  • 消費者組支持負載均衡                                          │
│  • ACK 機制確保消息被處理                                        │
│  • 落後的 consumer 可以追趕                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 改進 2: Leader Election 高可用 (P0)

**問題**: MarketDataService 是單點故障 (SPOF)，如果崩潰，所有 Bot 都會停止接收數據。

**解決方案**: 使用 Redis 實現 Leader Election。

```go
// ============================================
// Leader Election 實現
// ============================================
type LeaderElection struct {
    redis       *redis.Client
    lockKey     string
    instanceID  string
    ttl         time.Duration
    renewTicker *time.Ticker
    isLeader    atomic.Bool
    onBecomeLeader func()
    onLoseLeader   func()
}

func NewLeaderElection(redis *redis.Client, lockKey, instanceID string) *LeaderElection {
    return &LeaderElection{
        redis:      redis,
        lockKey:    lockKey,
        instanceID: instanceID,
        ttl:        10 * time.Second,
    }
}

func (l *LeaderElection) Run(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            l.release(ctx)
            return
        default:
            if l.tryAcquire(ctx) {
                l.isLeader.Store(true)
                if l.onBecomeLeader != nil {
                    l.onBecomeLeader()
                }
                l.startRenewing(ctx)
            } else {
                l.isLeader.Store(false)
                l.watchLeader(ctx)
            }
        }
    }
}

func (l *LeaderElection) tryAcquire(ctx context.Context) bool {
    ok, err := l.redis.SetNX(ctx, l.lockKey, l.instanceID, l.ttl).Result()
    return err == nil && ok
}

func (l *LeaderElection) startRenewing(ctx context.Context) {
    l.renewTicker = time.NewTicker(l.ttl / 3)
    defer l.renewTicker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-l.renewTicker.C:
            // 使用 Lua 腳本確保只有當前 leader 能續約
            script := redis.NewScript(`
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("expire", KEYS[1], ARGV[2])
                else
                    return 0
                end
            `)
            result, err := script.Run(ctx, l.redis, []string{l.lockKey},
                l.instanceID, int(l.ttl.Seconds())).Int()

            if err != nil || result == 0 {
                // 失去 leader 身份
                l.isLeader.Store(false)
                if l.onLoseLeader != nil {
                    l.onLoseLeader()
                }
                return
            }
        }
    }
}

func (l *LeaderElection) watchLeader(ctx context.Context) {
    // 等待 leader 釋放
    for {
        select {
        case <-ctx.Done():
            return
        case <-time.After(time.Second):
            exists, _ := l.redis.Exists(ctx, l.lockKey).Result()
            if exists == 0 {
                return // Leader 已釋放，嘗試成為新 leader
            }
        }
    }
}

// ============================================
// 在 MarketDataService 中使用
// ============================================
type MarketDataServiceHA struct {
    election *LeaderElection
    svc      *MarketDataService
}

func NewMarketDataServiceHA(redis *redis.Client, instanceID string) *MarketDataServiceHA {
    ha := &MarketDataServiceHA{}
    ha.election = NewLeaderElection(redis, "leader:market-data-service", instanceID)
    ha.svc = NewMarketDataService()

    ha.election.onBecomeLeader = func() {
        logrus.Info("Became leader, starting market data service")
        ha.svc.Start(context.Background())
    }

    ha.election.onLoseLeader = func() {
        logrus.Warn("Lost leadership, stopping market data service")
        ha.svc.Stop()
    }

    return ha
}
```

**高可用架構圖**:

```
┌─────────────────────────────────────────────────────────────────┐
│               MarketDataService 高可用部署                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Redis (Leader Lock)                    │   │
│  │                                                          │   │
│  │  KEY: "leader:market-data-service"                      │   │
│  │  VALUE: "instance-1"                                     │   │
│  │  TTL: 10 seconds                                         │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         │                 │                 │                  │
│         ▼                 ▼                 ▼                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │ Instance 1  │   │ Instance 2  │   │ Instance 3  │          │
│  │             │   │             │   │             │          │
│  │ 🟢 LEADER   │   │ ⚪ STANDBY  │   │ ⚪ STANDBY  │          │
│  │ (Active)    │   │ (Watching)  │   │ (Watching)  │          │
│  │             │   │             │   │             │          │
│  │ - WebSocket │   │ - 監控鎖    │   │ - 監控鎖    │          │
│  │ - 發布數據  │   │ - 準備接管  │   │ - 準備接管  │          │
│  └─────────────┘   └─────────────┘   └─────────────┘          │
│         │                                                       │
│         │ 如果 Instance 1 崩潰...                                │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. Redis 鎖 TTL 過期 (10秒)                             │   │
│  │  2. Instance 2 獲取鎖，成為新 Leader                     │   │
│  │  3. 連接 Bitfinex WebSocket                              │   │
│  │  4. 繼續發布市場數據                                      │   │
│  │                                                          │   │
│  │  故障轉移時間: < 15 秒                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 改進 3: 服務間認證 (P1)

**問題**: gRPC 端點無認證，存在安全風險。

**解決方案**: 使用 gRPC Interceptor + JWT 認證。

```go
// ============================================
// 服務端 JWT 驗證 Interceptor
// ============================================
type AuthInterceptor struct {
    jwtSecret []byte
    validServices map[string]bool  // 允許的服務列表
}

func NewAuthInterceptor(jwtSecret string) *AuthInterceptor {
    return &AuthInterceptor{
        jwtSecret: []byte(jwtSecret),
        validServices: map[string]bool{
            "bot-worker":       true,
            "indicator-service": true,
            "ml-service":       true,
        },
    }
}

func (i *AuthInterceptor) Unary() grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // 從 metadata 提取 token
        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Error(codes.Unauthenticated, "missing metadata")
        }

        tokens := md.Get("authorization")
        if len(tokens) == 0 {
            return nil, status.Error(codes.Unauthenticated, "missing token")
        }

        // Bearer token
        tokenStr := strings.TrimPrefix(tokens[0], "Bearer ")

        // 驗證 JWT
        token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
            return i.jwtSecret, nil
        })
        if err != nil || !token.Valid {
            return nil, status.Error(codes.Unauthenticated, "invalid token")
        }

        claims := token.Claims.(jwt.MapClaims)
        serviceID := claims["service_id"].(string)

        if !i.validServices[serviceID] {
            return nil, status.Error(codes.PermissionDenied, "service not authorized")
        }

        // 將 claims 加入 context
        ctx = context.WithValue(ctx, "service_id", serviceID)
        return handler(ctx, req)
    }
}

// ============================================
// 客戶端添加 Token Interceptor
// ============================================
func TokenInterceptor(token string) grpc.UnaryClientInterceptor {
    return func(
        ctx context.Context,
        method string,
        req, reply interface{},
        cc *grpc.ClientConn,
        invoker grpc.UnaryInvoker,
        opts ...grpc.CallOption,
    ) error {
        ctx = metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+token)
        return invoker(ctx, method, req, reply, cc, opts...)
    }
}

// ============================================
// 使用示例
// ============================================
// Server
authInterceptor := NewAuthInterceptor(os.Getenv("JWT_SECRET"))
server := grpc.NewServer(
    grpc.UnaryInterceptor(authInterceptor.Unary()),
)

// Client
token := generateServiceToken("bot-worker")
conn, _ := grpc.Dial(
    "market-data-service:8080",
    grpc.WithUnaryInterceptor(TokenInterceptor(token)),
)
```

---

### 改進 4: Circuit Breaker 容錯 (P1)

**問題**: Fallback 機制缺少狀態管理，可能頻繁切換。

**解決方案**: 實現 Circuit Breaker 模式。

```go
import "github.com/sony/gobreaker"

// ============================================
// Circuit Breaker 包裝
// ============================================
type MarketDataClientWithBreaker struct {
    primary  MarketDataProvider
    fallback MarketDataProvider
    cb       *gobreaker.CircuitBreaker
}

func NewMarketDataClientWithBreaker(primary, fallback MarketDataProvider) *MarketDataClientWithBreaker {
    settings := gobreaker.Settings{
        Name:        "market-data-service",
        MaxRequests: 3,                       // Half-Open 狀態最多嘗試 3 次
        Interval:    10 * time.Second,        // 統計窗口
        Timeout:     30 * time.Second,        // Open 狀態持續時間
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            // 連續 5 次失敗或失敗率 > 60% 就斷開
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.ConsecutiveFailures >= 5 ||
                   (counts.Requests >= 10 && failureRatio > 0.6)
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            logrus.WithFields(logrus.Fields{
                "breaker": name,
                "from":    from.String(),
                "to":      to.String(),
            }).Warn("Circuit breaker state changed")

            // 發送告警
            if to == gobreaker.StateOpen {
                alerting.SendAlert("Circuit breaker opened for " + name)
            }
        },
    }

    return &MarketDataClientWithBreaker{
        primary:  primary,
        fallback: fallback,
        cb:       gobreaker.NewCircuitBreaker(settings),
    }
}

func (c *MarketDataClientWithBreaker) GetFRR(ctx context.Context, currency string) (float64, error) {
    result, err := c.cb.Execute(func() (interface{}, error) {
        return c.primary.GetFRR(ctx, currency)
    })

    if err != nil {
        // Circuit 打開或請求失敗，使用 fallback
        logrus.WithError(err).Warn("Primary failed, using fallback")
        return c.fallback.GetFRR(ctx, currency)
    }

    return result.(float64), nil
}

func (c *MarketDataClientWithBreaker) GetOrderBook(ctx context.Context, currency string) (*OrderBook, error) {
    result, err := c.cb.Execute(func() (interface{}, error) {
        return c.primary.GetOrderBook(ctx, currency)
    })

    if err != nil {
        return c.fallback.GetOrderBook(ctx, currency)
    }

    return result.(*OrderBook), nil
}
```

**Circuit Breaker 狀態圖**:

```
┌─────────────────────────────────────────────────────────────────┐
│                 Circuit Breaker 狀態機                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     失敗次數 >= 5      ┌─────────────┐        │
│  │             │ ──────────────────────► │             │        │
│  │   CLOSED    │                         │    OPEN     │        │
│  │  (正常使用)  │ ◄────────────────────── │  (使用備援)  │        │
│  │             │     Half-Open 成功      │             │        │
│  └──────┬──────┘                         └──────┬──────┘        │
│         │                                       │                │
│         │ 請求正常處理                            │ 30秒超時      │
│         │                                       │                │
│         ▼                                       ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      HALF-OPEN                          │   │
│  │                   (嘗試恢復中)                           │   │
│  │                                                          │   │
│  │  • 最多嘗試 3 次請求                                     │   │
│  │  • 成功 → 回到 CLOSED                                   │   │
│  │  • 失敗 → 回到 OPEN                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 改進 5: OpenTelemetry 分散式追蹤 (P1)

**問題**: 難以追蹤問題來源（數據服務？計算服務？Bot 策略？）

**解決方案**: 加入 OpenTelemetry 追蹤。

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
    "go.opentelemetry.io/otel/trace"
)

// ============================================
// 初始化 OpenTelemetry
// ============================================
func InitTracer(serviceName string) (func(), error) {
    ctx := context.Background()

    // 連接 OTLP Collector (如 Jaeger, Tempo)
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
            attribute.String("environment", os.Getenv("ENV")),
        )),
    )

    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    return func() { tp.Shutdown(ctx) }, nil
}

// ============================================
// MarketDataService 發布時附加 Trace ID
// ============================================
func (s *MarketDataService) PublishFRR(ctx context.Context, frr float64) error {
    tracer := otel.Tracer("market-data-service")
    ctx, span := tracer.Start(ctx, "PublishFRR")
    defer span.End()

    span.SetAttributes(
        attribute.Float64("frr", frr),
        attribute.String("currency", "USD"),
    )

    // 從 span 提取 trace context
    traceID := trace.SpanFromContext(ctx).SpanContext().TraceID().String()
    spanID := trace.SpanFromContext(ctx).SpanContext().SpanID().String()

    return s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: "market:frr:USD",
        MaxLen: 10000,
        Approx: true,
        Values: map[string]interface{}{
            "frr":       frr,
            "timestamp": time.Now().UnixMilli(),
            "trace_id":  traceID,  // 附加追蹤 ID
            "span_id":   spanID,
        },
    }).Err()
}

// ============================================
// Bot Worker 消費時繼承 Trace Context
// ============================================
func (b *Bot) processMarketUpdate(ctx context.Context, msg redis.XMessage) {
    // 從消息恢復 trace context
    traceID := msg.Values["trace_id"].(string)
    spanID := msg.Values["span_id"].(string)

    // 創建 span 作為子 span
    tracer := otel.Tracer("bot-worker")
    ctx, span := tracer.Start(ctx, "ProcessMarketUpdate",
        trace.WithLinks(trace.Link{
            SpanContext: createSpanContext(traceID, spanID),
        }),
    )
    defer span.End()

    // 處理市場數據更新
    frr, _ := strconv.ParseFloat(msg.Values["frr"].(string), 64)
    span.SetAttributes(attribute.Float64("frr", frr))

    // 計算策略
    b.strategy.Calculate(ctx, frr)
}

// ============================================
// gRPC Interceptor 自動傳播 Trace
// ============================================
import "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"

// Server
server := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
)

// Client
conn, _ := grpc.Dial(
    "market-data-service:8080",
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
)
```

**追蹤鏈路示例**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    分散式追蹤示例                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Trace ID: abc123...                                            │
│  ├── Span: Bitfinex WebSocket Receive     [market-data-svc]     │
│  │   └── Span: PublishFRR                 [market-data-svc]     │
│  │       ├── Span: Redis XADD             [market-data-svc]     │
│  │       │                                                      │
│  │       └── (消息傳遞)                                          │
│  │                                                              │
│  ├── Span: ProcessMarketUpdate            [bot-worker-1]        │
│  │   ├── Span: GetIndicators (gRPC)       [indicator-svc]       │
│  │   │   └── Span: CalculateSMA           [indicator-svc]       │
│  │   │                                                          │
│  │   ├── Span: Strategy.Calculate         [bot-worker-1]        │
│  │   │   └── Span: GetMLPrediction (gRPC) [ml-service]          │
│  │   │                                                          │
│  │   └── Span: SubmitOffer (REST)         [bot-worker-1]        │
│  │       └── Span: Bitfinex API Call      [bot-worker-1]        │
│  │                                                              │
│  總耗時: 150ms                                                   │
│  ├── market-data-svc: 10ms                                      │
│  ├── indicator-svc: 5ms                                         │
│  ├── ml-service: 30ms                                           │
│  └── bitfinex-api: 100ms                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 遷移計劃 (已更新)

根據 Review 建議，重新規劃遷移順序，優先實現可靠性和安全性改進。

### 階段 1: 基礎設施 + P0 改進 (2 週)

**目標**: 確保可靠性基礎

1. **定義共享服務介面**
   - `MarketDataProvider`
   - `IndicatorProvider`
   - `HistoryProvider`
   - 創建 `ServiceContainer` 抽象

2. **實現 Redis Streams 通訊層 (P0)**
   - 取代 Pub-Sub
   - 實現消費者組
   - 實現消息確認 (ACK)
   - 實現斷點恢復

3. **實現 Leader Election (P0)**
   - Redis 分散式鎖
   - 自動故障轉移
   - 監控告警

```go
// 重構前
func (b *Bot) run() {
    marketData, _ := b.client.GetMarketData(currency)
}

// 重構後
func (b *Bot) run() {
    marketData, _ := b.services.MarketData.GetMarketData(currency)
}
```

### 階段 2: 內嵌實現 + P1 安全 (2 週)

**目標**: 個人模式可用 + 安全基礎

1. **實現內嵌服務**
   - `EmbeddedMarketDataService`
   - `EmbeddedIndicatorService`
   - `EmbeddedHistoryService`
   - `EmbeddedRateLimitManager`

2. **實現 gRPC 認證 (P1)**
   - JWT Token 生成
   - Server Interceptor
   - Client Interceptor
   - 服務白名單

3. **實現 Circuit Breaker (P1)**
   - gobreaker 整合
   - 狀態監控
   - Fallback 邏輯

### 階段 3: 遠端實現 + 可觀測性 (3 週)

**目標**: 多租戶模式可用

1. **創建獨立服務容器**
   - Market Data Service (含 HA)
   - Indicator Service
   - History Service

2. **實現遠端客戶端**
   - gRPC Client with Circuit Breaker
   - 連接池管理
   - 重試邏輯

3. **實現 OpenTelemetry 追蹤 (P1)**
   - Tracer 初始化
   - Span 傳播
   - Redis Streams trace ID 注入
   - Jaeger/Tempo 整合

### 階段 4: 整合測試 + 性能調優 (1 週)

**目標**: 生產就緒

1. **功能測試**
   - 個人模式端到端測試
   - 多租戶模式端到端測試
   - 故障轉移測試
   - Circuit Breaker 測試

2. **性能測試**
   - Redis Streams 吞吐量基準
   - gRPC 延遲基準
   - 負載測試 (100+ Bot)

3. **監控部署**
   - Prometheus metrics
   - Grafana dashboards
   - 告警規則

### 遷移里程碑

| 階段 | 完成標準 | 風險等級 |
|------|---------|---------|
| 階段 1 | Redis Streams + Leader Election 通過測試 | 中 |
| 階段 2 | 個人模式可正常運行 | 低 |
| 階段 3 | 多租戶模式可正常運行 | 高 |
| 階段 4 | 性能達標，監控完備 | 低 |

## 配置示例

### 個人模式配置

```yaml
# config/config.yaml
deployment:
  mode: personal  # 使用內嵌服務

bitfinex:
  api_key: "xxx"
  api_secret: "xxx"

strategy:
  type: grid
  # ...

# 無需額外的服務配置
```

### 多租戶模式配置

```yaml
# config/platform.yaml
deployment:
  mode: multi-tenant

services:
  market_data:
    url: "http://market-data-svc:8080"

  indicator:
    url: "http://indicator-svc:8080"

  history:
    url: "http://history-svc:8080"

  redis:
    addr: "redis:6379"
    password: "${REDIS_PASSWORD}"

# 用戶配置存儲在資料庫中
```

## 性能預估

### 資源節省

| 指標 | 現有架構 (100 用戶) | 新架構 (100 用戶) | 節省 |
|------|-------------------|------------------|------|
| WebSocket 連接 | 100 | 1 | 99% |
| CPU (指標計算) | 100x | 1x | 99% |
| 記憶體 (市場數據) | 100 × 10MB | 10MB | 99% |
| API 調用風險 | 高 | 低 | - |

### 延遲影響

| 場景 | 現有延遲 | 新架構延遲 | 備註 |
|------|---------|----------|------|
| 個人模式 | ~1ms | ~1ms | 無變化 (內嵌) |
| 多租戶模式 | - | ~5-10ms | Redis Pub-Sub 延遲 |

## 總結

### 回答用戶問題

**Q1: 個人模式也會使用共享服務嗎？**

是的，但使用**內嵌實現 (Embedded Implementation)**：
- 所有服務在同一進程內以 goroutine 形式運行
- 使用 Go channel 進行進程內通訊
- 零網絡開銷，保持零配置的簡潔性
- 代碼架構與多租戶模式完全兼容

**Q2: 還有什麼可以抽出來共享？**

除了市場數據，還有 6 大類服務可以共享：
1. **技術指標服務** - 32 個指標只需計算 1 次
2. **ML 預測服務** - GPU 資源最大化利用
3. **歷史數據服務** - 公共數據只存 1 份
4. **通知服務** - 批量發送，統一管理
5. **Rate Limit 管理器** - 防止 API 超限
6. **認證/授權服務** - 統一的身份驗證 (多租戶專用)

### 架構優勢

1. **統一的代碼架構** - 個人模式和多租戶模式使用相同的介面
2. **資源高效** - 共享服務大幅減少重複資源消耗
3. **易於擴展** - 新增服務只需實現對應介面
4. **向後兼容** - 現有配置繼續有效

### 下一步行動

基於 Review 結果，按優先級執行：

#### 立即執行 (P0)
1. **Redis Streams POC** - 驗證消息吞吐量和延遲
2. **Leader Election 原型** - 測試故障轉移時間
3. **定義 `MarketDataProvider` 介面** - 作為第一個抽象目標

#### 短期執行 (P1)
4. **實現 gRPC 認證 Interceptor**
5. **整合 gobreaker Circuit Breaker**
6. **配置 OpenTelemetry 導出器**

#### 中期執行 (P2)
7. **重構 `Bot` 使用 `ServiceContainer`**
8. **添加單元測試驗證介面抽象**
9. **逐步遷移其他服務**

---

## 附錄：依賴套件

實現本設計需要添加以下 Go 依賴：

```bash
# Redis Streams 支援 (已有)
go get github.com/redis/go-redis/v9

# Circuit Breaker
go get github.com/sony/gobreaker

# OpenTelemetry
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc

# JWT (如果還未安裝)
go get github.com/golang-jwt/jwt/v5
```

---

## 附錄：參考資料

- [Redis Streams 官方文檔](https://redis.io/docs/data-types/streams/)
- [go-redis Streams 範例](https://github.com/redis/go-redis/blob/master/example/stream-example/main.go)
- [gobreaker Circuit Breaker](https://github.com/sony/gobreaker)
- [OpenTelemetry Go 入門](https://opentelemetry.io/docs/instrumentation/go/)
- [gRPC Go Interceptors](https://grpc.io/docs/languages/go/interceptors/)

---

文檔版本: 3.0
創建日期: 2025-12-17
更新日期: 2025-12-17
狀態: 實現完成

---

## 實現狀態摘要 (v3.0)

### 已完成的實現

| 組件 | 檔案位置 | 狀態 |
|------|---------|------|
| **ServiceContainer** | `internal/services/container.go` | ✅ 完成 |
| **共享類型定義** | `internal/shared/types.go` | ✅ 完成 |
| **共享介面定義** | `internal/shared/interfaces.go` | ✅ 完成 |
| **配置結構** | `internal/shared/container.go` | ✅ 完成 |

#### 內嵌服務 (Personal Mode)

| 服務 | 檔案位置 | 狀態 |
|------|---------|------|
| MarketDataProvider | `internal/shared/embedded/market_data.go` | ✅ 完成 |
| IndicatorProvider | `internal/shared/embedded/indicators.go` | ✅ 完成 |
| HistoryProvider | `internal/shared/embedded/history.go` | ✅ 完成 |
| RateLimitManager | `internal/shared/embedded/ratelimit.go` | ✅ 完成 |
| NoOpMLProvider | `internal/shared/embedded/ml.go` | ✅ 完成 |

#### 遠端服務 (Multi-Tenant Mode)

| 服務 | 檔案位置 | 狀態 |
|------|---------|------|
| MarketDataProvider | `internal/shared/remote/market_data.go` | ✅ 完成 |
| IndicatorProvider | `internal/shared/remote/indicators.go` | ✅ 完成 |
| HistoryProvider | `internal/shared/remote/history.go` | ✅ 完成 |
| RateLimitManager | `internal/shared/remote/ratelimit.go` | ✅ 完成 |
| MLProvider | `internal/shared/remote/ml.go` | ✅ 完成 |

#### Redis Streams 通訊層

| 組件 | 檔案位置 | 狀態 |
|------|---------|------|
| Publisher | `internal/shared/streams/publisher.go` | ✅ 完成 |
| Consumer | `internal/shared/streams/consumer.go` | ✅ 完成 |

#### 彈性和可觀測性

| 組件 | 檔案位置 | 狀態 |
|------|---------|------|
| Circuit Breaker | `internal/shared/resilience/circuit_breaker.go` | ✅ 完成 |
| OpenTelemetry Tracer | `internal/shared/observability/tracer.go` | ✅ 完成 |
| OpenTelemetry Metrics | `internal/shared/observability/metrics.go` | ✅ 完成 |
| Leader Election | `internal/shared/election/leader.go` | ✅ 完成 |

### 單元測試

| 測試 | 檔案位置 | 狀態 |
|------|---------|------|
| Circuit Breaker 測試 | `internal/shared/resilience/circuit_breaker_test.go` | ✅ 通過 |
| Tracer 測試 | `internal/shared/observability/tracer_test.go` | ✅ 通過 |
| Metrics 測試 | `internal/shared/observability/metrics_test.go` | ✅ 通過 |
| Remote Services 測試 | `internal/shared/remote/remote_test.go` | ✅ 通過 |
| Embedded Services 測試 | `internal/shared/embedded/*_test.go` | ✅ 通過 |

### 開發環境配置

| 配置 | 檔案位置 | 說明 |
|------|---------|------|
| Docker Compose (生產) | `docker-compose.yml` | 包含 Redis、Prometheus、Grafana |
| Docker Compose (開發) | `docker-compose.dev.yml` | Redis + Redis Commander + Jaeger |

### 使用方式

```go
// 創建 ServiceContainer
config := &shared.ContainerConfig{
    Mode:       shared.PersonalMode,  // 或 shared.MultiTenantMode
    Currencies: []string{"USD", "USDT"},
    Observability: shared.ObservabilityConfig{
        TracingEnabled:  true,
        MetricsEnabled:  true,
        ServiceName:     "bitfinex-lending-bot",
    },
    Resilience: shared.ResilienceConfig{
        CircuitBreakerEnabled: true,
        CircuitBreakerTimeout: 30 * time.Second,
    },
}

container, err := services.NewServiceContainer(config)
if err != nil {
    log.Fatal(err)
}

// 使用服務
marketData, err := container.MarketData().GetMarketData(ctx, "USD")
indicators, err := container.Indicators().GetIndicators(ctx, "USD")
```

### 變更記錄

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| 1.0 | 2025-12-17 | 初始設計 |
| 2.0 | 2025-12-17 | 整合架構 Review 改進：Redis Streams、Leader Election、gRPC 認證、Circuit Breaker、OpenTelemetry |
| 3.0 | 2025-12-17 | 實現完成：所有核心組件已實現並通過測試 |
