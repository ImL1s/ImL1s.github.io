# 共享服務架構設計 Review 報告

**Review 日期**: 2025-12-17
**Review 來源**: Claude Opus 4.5 分析 + Gemini 3 Pro 意見 + 官方文檔最佳實踐

---

## 總體評估

| 評估項目 | 評分 | 說明 |
|---------|------|------|
| 整體架構設計 | ⭐⭐⭐⭐ | 方向正確，解決了核心問題 |
| 代碼共用設計 | ⭐⭐⭐⭐⭐ | 單一代碼庫 + 薄傳輸層是正確選擇 |
| 抽離適合性分析 | ⭐⭐⭐⭐⭐ | 清楚區分公共/私有數據 |
| 可靠性設計 | ⭐⭐⭐ | 需要加強 (詳見下方) |
| 安全性設計 | ⭐⭐ | 缺少關鍵考量 |
| 可觀測性 | ⭐⭐ | 未提及 |

---

## 1. 關鍵問題與風險

### 🔴 P0: Redis Pub-Sub 可靠性問題

**問題**: 設計文檔使用 Redis Pub-Sub 作為多租戶模式的消息通道，但 **Redis Pub-Sub 是 Fire-and-Forget 機制**。

```
問題場景：
Bot Worker 重啟期間 (5秒)
    │
    ├── 10:00:01  MarketDataService 發布 FRR 更新
    ├── 10:00:02  MarketDataService 發布 OrderBook 更新
    ├── 10:00:03  Bot Worker 重啟完成
    │
    └── 結果：Bot 錯過了兩個更新，可能基於過時數據做決策
```

**影響**:
- Bot 可能使用過時的市場數據做決策
- 無法追蹤哪些消息被遺漏
- 可能導致放貸策略失效

**建議**: 改用 **Redis Streams** 取代 Pub-Sub

```go
// ❌ 現有設計 - Pub-Sub (不可靠)
func (s *MarketDataService) PublishFRR(frr float64) error {
    return s.redis.Publish(ctx, "market:frr:USD", frr).Err()
}

// ✅ 建議設計 - Streams (可追蹤、可重播)
func (s *MarketDataService) PublishFRR(frr float64) error {
    return s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: "market:frr:USD",
        MaxLen: 10000,  // 保留最近 10000 條
        Approx: true,
        Values: map[string]interface{}{
            "frr":       frr,
            "timestamp": time.Now().UnixMilli(),
        },
    }).Err()
}

// Bot Worker 可以從上次斷開的位置繼續消費
func (b *BotWorker) ConsumeMarketData() {
    lastID := b.getLastConsumedID()  // 從持久化存儲獲取

    for {
        streams, _ := b.redis.XRead(ctx, &redis.XReadArgs{
            Streams: []string{"market:frr:USD", lastID},
            Block:   5 * time.Second,
        }).Result()

        for _, msg := range streams[0].Messages {
            b.processMarketUpdate(msg)
            b.saveLastConsumedID(msg.ID)  // 持久化進度
        }
    }
}
```

---

### 🔴 P0: 單點故障 (SPOF)

**問題**: 多租戶模式下，`MarketDataService` 是單點故障。如果它崩潰，**所有用戶的 Bot 都會停止接收數據**。

```
┌─────────────────────────────────────────────────────────────┐
│  如果 MarketDataService 崩潰...                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                           │
│  │ MarketData  │ ← ❌ 崩潰                                  │
│  │ Service     │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ╳ 數據流中斷                                        │
│         │                                                   │
│  ┌──────┴──────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Bot 1      │  │  Bot 2      │  │  Bot 3      │        │
│  │  ❌ 停止     │  │  ❌ 停止     │  │  ❌ 停止     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  影響：所有用戶的放貸機器人全部失效                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**建議**: 實現 Leader Election 機制

```go
// 使用 Redis 實現簡單的 Leader Election
type MarketDataServiceHA struct {
    redis      *redis.Client
    instanceID string
    isLeader   bool
    svc        *MarketDataService
}

func (h *MarketDataServiceHA) TryBecomeLeader(ctx context.Context) bool {
    // 嘗試獲取鎖，TTL 10秒
    ok, err := h.redis.SetNX(ctx, "leader:market-data-service", h.instanceID, 10*time.Second).Result()
    if err != nil || !ok {
        return false
    }

    h.isLeader = true

    // 定期續約
    go func() {
        ticker := time.NewTicker(3 * time.Second)
        for range ticker.C {
            h.redis.Expire(ctx, "leader:market-data-service", 10*time.Second)
        }
    }()

    return true
}

func (h *MarketDataServiceHA) Run(ctx context.Context) {
    for {
        if h.TryBecomeLeader(ctx) {
            // 成為 Leader，開始工作
            h.svc.Start(ctx)
        } else {
            // 作為 Standby，等待 Leader 失敗
            h.watchLeader(ctx)
        }
    }
}
```

---

### 🟡 P1: 缺少服務間認證

**問題**: 設計文檔未提及 Bot Worker 如何向 Shared Services 認證身份。即使在 VPC 內部，**無認證的 gRPC 端點也是安全風險**。

**風險**:
- 惡意服務可以冒充 Bot Worker
- 沒有審計追蹤
- 不符合零信任安全模型

**建議**: 實現 mTLS 或 JWT 認證

```go
// 使用 gRPC Interceptor 進行 JWT 驗證
func AuthInterceptor(
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

    // 驗證 JWT
    claims, err := validateJWT(tokens[0])
    if err != nil {
        return nil, status.Error(codes.Unauthenticated, "invalid token")
    }

    // 將 claims 加入 context
    ctx = context.WithValue(ctx, "claims", claims)
    return handler(ctx, req)
}

// 安裝 Interceptor
server := grpc.NewServer(
    grpc.UnaryInterceptor(AuthInterceptor),
)
```

---

### 🟡 P1: 缺少分散式追蹤

**問題**: 當 Bot 做出錯誤決策時，很難追蹤問題來源：
- 是 MarketDataService 給的數據有問題？
- 是 IndicatorService 計算錯誤？
- 還是 Bot 策略邏輯有 bug？

**建議**: 加入 OpenTelemetry 追蹤

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

// MarketDataService 發布時附加 trace ID
func (s *MarketDataService) PublishFRR(ctx context.Context, frr float64) error {
    span := trace.SpanFromContext(ctx)
    traceID := span.SpanContext().TraceID().String()

    return s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: "market:frr:USD",
        Values: map[string]interface{}{
            "frr":      frr,
            "trace_id": traceID,  // 附加追蹤 ID
        },
    }).Err()
}

// Bot 消費時繼承 trace context
func (b *Bot) processMarketUpdate(msg redis.XMessage) {
    traceID := msg.Values["trace_id"].(string)
    ctx := injectTraceContext(context.Background(), traceID)

    // 後續所有操作都在同一個 trace 下
    _, span := otel.Tracer("bot").Start(ctx, "process-market-update")
    defer span.End()

    b.strategy.Calculate(ctx)
}
```

---

### 🟡 P1: Fallback 機制不完整

**問題**: 設計文檔提到了 `BotWithFallback`，但缺少關鍵細節：
1. 何時切換到 fallback？
2. 如何判斷主服務恢復？
3. 如何避免頻繁切換 (flapping)？

**建議**: 實現 Circuit Breaker 模式

```go
import "github.com/sony/gobreaker"

type MarketDataClientWithBreaker struct {
    primary  MarketDataProvider
    fallback MarketDataProvider
    cb       *gobreaker.CircuitBreaker
}

func NewMarketDataClientWithBreaker(primary, fallback MarketDataProvider) *MarketDataClientWithBreaker {
    settings := gobreaker.Settings{
        Name:        "market-data-service",
        MaxRequests: 3,                      // Half-Open 狀態最多嘗試 3 次
        Interval:    10 * time.Second,       // 統計窗口
        Timeout:     30 * time.Second,       // Open 狀態持續時間
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            // 連續 5 次失敗就斷開
            return counts.ConsecutiveFailures >= 5
        },
        OnStateChange: func(name string, from, to gobreaker.State) {
            logrus.WithFields(logrus.Fields{
                "from": from.String(),
                "to":   to.String(),
            }).Warn("Circuit breaker state changed")
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
        logrus.Warn("Using fallback market data provider")
        return c.fallback.GetFRR(ctx, currency)
    }

    return result.(float64), nil
}
```

---

## 2. 缺少的考量

### 🟡 多幣種 WebSocket 連接策略

**問題**: USD 和 USDT 是否應該用同一個 WebSocket 連接？

**分析**:
- Bitfinex 允許單一連接訂閱多個頻道
- 但連接過載可能影響所有幣種

**建議**: 可配置的連接策略

```go
type WebSocketStrategy int

const (
    SingleConnection WebSocketStrategy = iota  // 所有幣種共用一個連接
    PerCurrency                                 // 每個幣種一個連接
)

type MarketDataServiceConfig struct {
    Currencies       []string          // ["USD", "USDT"]
    WebSocketStrategy WebSocketStrategy
    MaxChannelsPerConn int             // 單連接最大頻道數
}
```

### 🟡 歷史數據容量規劃

**問題**: 文檔提到保留 30 天 FRR 歷史，但未說明：
- 數據如何清理？
- 儲存增長速度預估？
- 多租戶環境下的隔離？

**建議**: 使用 Redis TTL 或 TimescaleDB

```go
// Redis Streams 自動限制長度
func (s *HistoryService) StoreFRR(ctx context.Context, currency string, frr float64) error {
    return s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: fmt.Sprintf("history:frr:%s", currency),
        MaxLen: 86400 * 30,  // 保留 30 天 (假設每秒一條)
        Approx: true,        // 近似裁剪，性能更好
        Values: map[string]interface{}{
            "frr": frr,
            "ts":  time.Now().UnixMilli(),
        },
    }).Err()
}
```

### 🟡 Rate Limit 同步精度

**問題**: 分散式 Rate Limit 有網絡延遲，可能導致短暫超限。

**建議**: 使用 Redis Lua 腳本確保原子性

```lua
-- rate_limit.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- 移除過期的請求記錄
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- 獲取當前計數
local count = redis.call('ZCARD', key)

if count < limit then
    -- 允許請求，記錄時間戳
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return 1  -- 允許
else
    return 0  -- 拒絕
end
```

---

## 3. 替代方案比較

### 消息中間件選擇

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|---------|
| Redis Pub-Sub | 簡單、低延遲 | 無持久化、無回放 | 非關鍵通知 |
| **Redis Streams** | 持久化、消費者組、可回放 | 稍複雜 | ✅ 市場數據 |
| NATS | 高性能、Request-Reply | 需額外運維 | 大規模部署 |
| Kafka | 極高吞吐、持久化 | 重量級、高延遲 | 超大規模 |

**建議**: 使用 **Redis Streams**，理由：
1. 已有 Redis 依賴，無需額外組件
2. 支持消息持久化和消費者組
3. go-redis 原生支持

### Sidecar vs 集中式服務

| 方案 | 優點 | 缺點 |
|------|------|------|
| 集中式服務 (設計文檔方案) | 資源最優、單一 WebSocket | SPOF、需要 HA |
| Sidecar (每 Pod 一個) | 故障隔離、簡單 | 更多 WebSocket 連接 |

**建議**: 保持 **集中式服務**，但必須實現 HA (Leader Election)。

---

## 4. 實施建議優先級

| 優先級 | 項目 | 影響 | 工作量 |
|-------|------|------|-------|
| 🔴 P0 | Redis Pub-Sub → Streams | 可靠性 | 中 |
| 🔴 P0 | 實現 Leader Election | 高可用 | 中 |
| 🟡 P1 | 加入 gRPC 認證 | 安全性 | 低 |
| 🟡 P1 | 實現 Circuit Breaker | 容錯 | 低 |
| 🟡 P1 | 加入 OpenTelemetry | 可觀測 | 中 |
| 🟢 P2 | 配置化 WebSocket 策略 | 靈活性 | 低 |
| 🟢 P2 | 分散式 Rate Limit 優化 | 精確性 | 低 |

---

## 5. Gemini 3 Pro 補充意見

> **Gemini 意見**: "The architecture is fundamentally sound. The biggest improvement you can make immediately is to **swap Redis Pub-Sub for Redis Streams** and defining a clear **Circuit Breaker** strategy for the Fallback mechanism."

Gemini 與我的分析一致，主要關注點：
1. ✅ Redis Pub-Sub 可靠性問題
2. ✅ SPOF 需要 Leader Election
3. ✅ Circuit Breaker 模式
4. ✅ 分散式追蹤 (OpenTelemetry)

---

## 6. 結論

### 設計優點
1. **代碼共用設計正確** - 單一核心邏輯 + 薄傳輸層
2. **抽離分析準確** - 清楚區分公共/私有數據
3. **兩種模式統一** - 個人/多租戶使用相同介面

### 需要改進
1. **P0**: 將 Redis Pub-Sub 改為 Redis Streams
2. **P0**: 實現 MarketDataService 的高可用 (Leader Election)
3. **P1**: 加入服務間認證 (mTLS 或 JWT)
4. **P1**: 實現 Circuit Breaker 模式
5. **P1**: 加入分散式追蹤 (OpenTelemetry)

### 下一步行動

1. 更新設計文檔，加入上述改進
2. 先實現 P0 項目，確保基礎可靠性
3. 建立 POC 驗證 Redis Streams 性能
4. 制定詳細的實施計劃

---

**Review 完成**: 2025-12-17
**審核者**: Claude Opus 4.5 + Gemini 3 Pro
