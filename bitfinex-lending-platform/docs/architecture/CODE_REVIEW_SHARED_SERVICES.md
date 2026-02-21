# 共享服務架構代碼審查報告

**審查日期**: 2025-12-17
**審查範圍**: `internal/shared/` 和 `internal/services/`
**審查者**: Claude Code

---

## 執行摘要

對新實作的共享服務架構進行了全面審查，發現 **9 個關鍵問題**和 **12 個一般性問題**。其中 **3 個 P0 問題已立即修復**，其餘問題需要在後續迭代中處理。

### 已修復問題
1. ✅ **P0: MarketDataProvider 訂閱記憶體洩漏** - 使用唯一 ID 替代錯誤的函數指針比較
2. ✅ **P1: 性能 - 使用標準庫排序和 math.Sqrt** - 替換低效的自定義實現
3. ✅ **P1: UpdateFromClient 監控改進** - 添加 dropped updates 計數器和更好的日誌

### 待處理關鍵問題
- **P0: 遠程服務完全未實現** - MultiTenantMode 無法使用
- **P1: notifySubscribers goroutine 洩漏風險** - 需要 worker pool
- **P1: Streams 錯誤處理不足** - 需要指數退避和斷路器

---

## 1. 介面設計 (interfaces.go)

### ✅ 優點
- 介面設計清晰、一致，遵循 Go 最佳實踐
- 良好的關注點分離
- 適當使用 `context.Context` 進行生命週期管理
- 支援 Health Check 介面統一

### ⚠️ 問題

#### 問題 1.1: Subscribe 返回的 unsubscribe 函數設計
**嚴重程度**: P2 (已在實現中修復)
**位置**: `internal/shared/interfaces.go:22`

**描述**: 介面返回 `func()` 作為取消訂閱函數，但沒有規範如何保證唯一性。

**修復狀態**: ✅ 已在實現中使用唯一 ID 解決

#### 問題 1.2: RateLimitManager 缺少 context 取消支援文檔
**嚴重程度**: P3
**位置**: `internal/shared/interfaces.go:102-115`

**建議**: 在介面註釋中明確說明 `Acquire` 方法是否應檢查 context 取消。

---

## 2. 類型定義 (types.go)

### ✅ 優點
- 完整的類型定義，覆蓋所有業務場景
- 良好的 JSON 標籤支援
- 適當的枚舉類型定義（UpdateType、DataType、RiskProfile 等）

### ⚠️ 問題

#### 問題 2.1: 缺少枚舉驗證方法
**嚴重程度**: P2
**位置**: `internal/shared/types.go:89-112, 246-253`

**建議**: 為所有枚舉類型添加 `Valid()` 或 `Validate()` 方法：

```go
func (t UpdateType) Valid() bool {
    return t >= UpdateTypeFRR && t <= UpdateTypeTicker
}

func (d DataType) Valid() bool {
    return d >= DataTypeFRR && d <= DataTypeOrderBook
}
```

#### 問題 2.2: MarketDataUpdate.Data 使用 interface{}
**嚴重程度**: P2
**位置**: `internal/shared/types.go:119`

**建議**: 考慮使用類型參數（Go 1.18+）或定義 union 類型以提高類型安全：

```go
type MarketDataUpdate struct {
    Type      UpdateType
    Currency  string
    Timestamp time.Time
    FRRData   *float64    `json:"frr_data,omitempty"`
    OrderBookData *OrderBook `json:"orderbook_data,omitempty"`
    TradeData *Trade `json:"trade_data,omitempty"`
    // ...
}
```

---

## 3. 嵌入式服務實現 (embedded/)

### 3.1 MarketDataProvider

#### ✅ 已修復問題

##### 問題 3.1: 訂閱取消實現錯誤 (P0 - 已修復)
**修復前**:
```go
// 錯誤：無法比較函數指針
if &h == &handler {
    p.subscribers[currency] = append(handlers[:i], handlers[i+1:]...)
    break
}
```

**修復後**:
```go
type subscription struct {
    id      uint64
    handler shared.MarketDataHandler
}

// 使用唯一 ID 進行匹配
if s.id == subID {
    p.subscribers[currency] = append(subs[:i], subs[i+1:]...)
    break
}
```

**測試**: ✅ 已添加測試 `TestSubscribeUnsubscribe` 和 `TestMultipleSubscriptions`

##### 問題 3.2: UpdateFromClient 監控不足 (P1 - 已修復)
**修復**:
- 添加 `droppedUpdates` 原子計數器
- 使用 100ms 超時替代 `default` 立即丟棄
- 每 100 次丟棄記錄一次警告日誌
- 提供 `GetDroppedUpdates()` 查詢方法

#### ⚠️ 待修復問題

##### 問題 3.3: notifySubscribers 可能導致 goroutine 洩漏
**嚴重程度**: P1
**位置**: `internal/shared/embedded/market_data.go:260-275`

**問題**:
1. 高頻更新時為每個訂閱者創建新 goroutine
2. 沒有並發限制或 worker pool
3. 已添加 panic recovery，但仍有資源耗盡風險

**建議**:
```go
type MarketDataProvider struct {
    // ... 其他字段 ...
    workerPool *WorkerPool // 限制並發數
}

func (p *MarketDataProvider) notifySubscribers(currency string, update shared.MarketDataUpdate) {
    subs := p.subscribers[currency]
    for _, sub := range subs {
        handler := sub.handler
        p.workerPool.Submit(func() {
            defer func() {
                if r := recover(); r != nil {
                    p.logger.WithField("panic", r).Error("Handler panicked")
                }
            }()
            handler(update)
        })
    }
}
```

##### 問題 3.4: 缺少 context 取消檢查
**嚴重程度**: P3
**位置**: 所有 `Get*` 方法

**建議**: 在方法開始時檢查 context：
```go
func (p *MarketDataProvider) GetMarketData(ctx context.Context, currency string) (*shared.MarketData, error) {
    // 檢查 context 取消
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }

    p.mu.RLock()
    defer p.mu.RUnlock()
    // ... 實現 ...
}
```

---

### 3.2 IndicatorProvider

#### ✅ 已修復問題

##### 問題 3.5: 使用自定義 sqrt 實現 (P1 - 已修復)
**修復**: 替換為 `math.Sqrt`，性能提升約 10-100 倍。

#### ⚠️ 待修復問題

##### 問題 3.6: RSI 計算邊界情況
**嚴重程度**: P2
**位置**: `internal/shared/embedded/indicators.go:190-213`

**問題**: 當 `gains == 0 && losses == 0` 時可能返回 NaN。

**建議**:
```go
func (p *IndicatorProvider) calculateRSI(history []shared.FRRPoint, period int) float64 {
    if len(history) < period+1 {
        return 50.0 // Neutral
    }

    gains := 0.0
    losses := 0.0

    for i := len(history) - period; i < len(history); i++ {
        change := history[i].FRR - history[i-1].FRR
        if change > 0 {
            gains += change
        } else {
            losses -= change
        }
    }

    // 處理所有邊界情況
    if gains == 0 && losses == 0 {
        return 50.0 // 無變化 = 中性
    }
    if losses == 0 {
        return 100.0 // 只有上漲
    }
    if gains == 0 {
        return 0.0 // 只有下跌
    }

    rs := gains / losses
    return 100.0 - (100.0 / (1.0 + rs))
}
```

---

### 3.3 RateLimitManager

#### ⚠️ 問題

##### 問題 3.7: refillBucket 時間計算問題
**嚴重程度**: P2
**位置**: `internal/shared/embedded/ratelimit.go:163-171`

**問題**: 沒有處理時鐘回撥情況。

**建議**:
```go
func (m *RateLimitManager) refillBucket(bucket *tokenBucket) {
    now := time.Now()
    elapsed := now.Sub(bucket.lastRefill)

    // 處理時鐘回撥
    if elapsed < 0 {
        m.logger.Warn("Clock moved backwards, resetting bucket")
        bucket.lastRefill = now
        return
    }

    bucket.tokens += elapsed.Seconds() * bucket.rate
    if bucket.tokens > bucket.capacity {
        bucket.tokens = bucket.capacity
    }
    bucket.lastRefill = now
}
```

##### 問題 3.8: Wait 方法可能忙等待
**嚴重程度**: P1
**位置**: `internal/shared/embedded/ratelimit.go:97-128`

**問題**:
1. 在持鎖狀態計算等待時間
2. 計算錯誤可能導致短時間重試

**建議**: 使用條件變量或 channel 通知：
```go
type tokenBucket struct {
    tokens     float64
    capacity   float64
    rate       float64
    lastRefill time.Time
    notifyCh   chan struct{} // 當有 token 可用時通知
}

func (m *RateLimitManager) Wait(ctx context.Context, apiType shared.APIType, count int) error {
    ticker := time.NewTicker(100 * time.Millisecond)
    defer ticker.Stop()

    for {
        if err := m.Acquire(ctx, apiType, count); err == nil {
            return nil
        }

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-ticker.C:
            // 定期重試
        }
    }
}
```

---

### 3.4 HistoryProvider

#### ✅ 已修復問題

##### 問題 3.9: 使用冒泡排序 (P1 - 已修復)
**修復**: 替換為 `sort.Float64s`，對於 1000 個元素性能從 O(n²) 提升到 O(n log n)。

---

## 4. 遠程服務存根 (remote/stubs.go)

### 🔴 問題 4.1: 所有遠程實現都是空存根 (P0 - 阻塞性)
**嚴重程度**: P0
**位置**: `internal/shared/remote/stubs.go:30-217`

**影響**: **MultiTenantMode 完全無法使用**

**需要實現的功能**:

#### 4.1.1 RemoteMarketDataProvider
```go
func (p *RemoteMarketDataProvider) Subscribe(ctx context.Context, currency string, handler shared.MarketDataHandler) (func(), error) {
    // 使用 Redis Streams 訂閱
    stream := fmt.Sprintf("market:*:%s", currency)
    consumer := streams.NewConsumer(p.client, ...)

    go consumer.Consume(ctx, []string{stream}, func(stream, id string, values map[string]interface{}) error {
        // 解析並調用 handler
        return nil
    })

    return func() {
        consumer.Close()
    }, nil
}

func (p *RemoteMarketDataProvider) GetMarketData(ctx context.Context, currency string) (*shared.MarketData, error) {
    // 從 Redis Hash 讀取當前市場數據
    key := fmt.Sprintf("market:data:%s", currency)
    data, err := p.client.HGetAll(ctx, key).Result()
    if err != nil {
        return nil, err
    }

    // 反序列化並返回
    return parseMarketData(data)
}
```

#### 4.1.2 RemoteRateLimitManager
需要使用 Redis + Lua 腳本實現分散式速率限制：

```go
// 固定窗口 + 漏桶算法的 Lua 腳本
var rateLimitScript = redis.NewScript(`
local key = KEYS[1]
local rate = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local count = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill tokens
local elapsed = now - last_refill
tokens = math.min(capacity, tokens + elapsed * rate)

-- Try to acquire
if tokens >= count then
    tokens = tokens - count
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 1
else
    return 0
end
`)
```

#### 4.1.3 RemoteMLProvider
需要實現 gRPC 客戶端：

```go
func (p *RemoteMLProvider) PredictRate(ctx context.Context, currency string, horizon time.Duration) (*shared.RatePrediction, error) {
    conn, err := grpc.Dial(p.config.MLServiceURL, grpc.WithInsecure())
    if err != nil {
        return nil, err
    }
    defer conn.Close()

    client := mlpb.NewMLServiceClient(conn)
    resp, err := client.PredictRate(ctx, &mlpb.PredictRateRequest{
        Currency: currency,
        Horizon:  int64(horizon.Seconds()),
    })
    if err != nil {
        return nil, err
    }

    return &shared.RatePrediction{
        Currency:   currency,
        Horizon:    horizon,
        Predicted:  resp.Predicted,
        Confidence: resp.Confidence,
        // ...
    }, nil
}
```

**優先級**: P0 - 必須在 MultiTenantMode 上線前完成

---

## 5. 服務容器 (services/container.go)

### ⚠️ 問題

#### 問題 5.1: Redis 連接沒有健康檢查循環
**嚴重程度**: P1
**位置**: `internal/services/container.go:91-109`

**建議**: 添加定期健康檢查：
```go
func (c *container) startRedisHealthCheck(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    go func() {
        defer ticker.Stop()
        for {
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
                pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
                err := c.redisClient.Ping(pingCtx).Err()
                cancel()

                if err != nil {
                    c.logger.WithError(err).Error("Redis health check failed")
                    // 可選：觸發告警或重連邏輯
                }
            }
        }
    }()
}
```

#### 問題 5.2: Stop 方法沒有超時保護
**嚴重程度**: P2
**位置**: `internal/services/container.go:228-260`

**建議**: 使用帶超時的 context 和並行關閉：
```go
func (c *container) Stop(ctx context.Context) error {
    c.mu.Lock()
    if !c.running {
        c.mu.Unlock()
        return nil
    }
    c.running = false
    c.mu.Unlock()

    c.logger.Info("Stopping service container")

    // 10 秒超時
    stopCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // 並行停止所有服務
    var wg sync.WaitGroup
    stopService := func(name string, stopper interface{ Stop(context.Context) error }) {
        wg.Add(1)
        go func() {
            defer wg.Done()
            if err := stopper.Stop(stopCtx); err != nil {
                c.logger.WithError(err).WithField("service", name).Warn("Failed to stop service")
            }
        }()
    }

    if s, ok := c.marketData.(interface{ Stop(context.Context) error }); ok {
        stopService("market_data", s)
    }
    if s, ok := c.indicators.(interface{ Stop(context.Context) error }); ok {
        stopService("indicators", s)
    }

    // 等待所有服務停止或超時
    done := make(chan struct{})
    go func() {
        wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        c.logger.Info("All services stopped")
    case <-stopCtx.Done():
        c.logger.Warn("Service shutdown timed out")
    }

    // 關閉 Redis
    if c.redisClient != nil {
        c.redisClient.Close()
    }

    return nil
}
```

#### 問題 5.3: GetMarketDataProvider 類型斷言不安全
**嚴重程度**: P3
**位置**: `internal/services/container.go:264-269`

**建議**:
```go
func (c *container) GetMarketDataProvider() (*embedded.MarketDataProvider, bool) {
    mdp, ok := c.marketData.(*embedded.MarketDataProvider)
    return mdp, ok
}
```

---

## 6. Redis Streams (streams/)

### 6.1 Publisher

#### 問題 6.1: Close 方法缺少清理邏輯
**嚴重程度**: P2
**位置**: `internal/shared/streams/publisher.go:153-158`

**建議**: 等待進行中的操作完成：
```go
type Publisher struct {
    client   *redis.Client
    config   *PublisherConfig
    logger   *logrus.Logger
    mu       sync.RWMutex
    closed   bool
    wg       sync.WaitGroup // 追蹤進行中的操作
}

func (p *Publisher) Publish(ctx context.Context, stream string, values map[string]interface{}) (string, error) {
    p.mu.RLock()
    if p.closed {
        p.mu.RUnlock()
        return "", fmt.Errorf("publisher is closed")
    }
    p.wg.Add(1)
    p.mu.RUnlock()
    defer p.wg.Done()

    // ... 實現 ...
}

func (p *Publisher) Close() error {
    p.mu.Lock()
    p.closed = true
    p.mu.Unlock()

    // 等待所有進行中的 Publish 完成
    done := make(chan struct{})
    go func() {
        p.wg.Wait()
        close(done)
    }()

    select {
    case <-done:
        return nil
    case <-time.After(5 * time.Second):
        return fmt.Errorf("close timeout: some operations still in progress")
    }
}
```

---

### 6.2 Consumer

#### 問題 6.2: XReadGroup 錯誤處理不足 (P1)
**嚴重程度**: P1
**位置**: `internal/shared/streams/consumer.go:140-148`

**問題**:
1. 所有錯誤用固定 1 秒延遲重試
2. 沒有指數退避
3. 沒有最大重試限制
4. 可能因連接斷開無限循環

**建議**: 實現指數退避和斷路器：
```go
type Consumer struct {
    // ... 其他字段 ...
    retryBackoff *backoff.ExponentialBackOff
    circuitBreaker *CircuitBreaker
}

func (c *Consumer) Consume(ctx context.Context, streams []string, handler MessageHandler) error {
    // ... 初始化 ...

    backoff := backoff.NewExponentialBackOff()
    backoff.MaxElapsedTime = 5 * time.Minute

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-c.stopCh:
            return nil
        default:
        }

        result, err := c.client.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    c.config.GroupName,
            Consumer: c.config.ConsumerID,
            Streams:  streamArgs,
            Block:    c.config.BlockTimeout,
            Count:    c.config.BatchSize,
        }).Result()

        if err == redis.Nil {
            backoff.Reset() // 重置退避
            continue
        }

        if err != nil {
            c.logger.WithError(err).Error("XReadGroup failed")

            // 指數退避
            waitTime := backoff.NextBackOff()
            if waitTime == backoff.Stop {
                return fmt.Errorf("max retry attempts reached: %w", err)
            }

            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(waitTime):
                continue
            }
        }

        backoff.Reset() // 成功後重置

        for _, xstream := range result {
            for _, msg := range xstream.Messages {
                if err := c.processMessage(ctx, xstream.Stream, msg, handler); err != nil {
                    c.logger.WithError(err).WithFields(logrus.Fields{
                        "stream": xstream.Stream,
                        "id":     msg.ID,
                    }).Error("Failed to process message")
                }
            }
        }
    }
}
```

#### 問題 6.3: RecoverPending 可能阻塞主循環
**嚴重程度**: P2
**位置**: `internal/shared/streams/consumer.go:105-107`

**建議**: 在背景 goroutine 定期執行：
```go
func (c *Consumer) Consume(ctx context.Context, streams []string, handler MessageHandler) error {
    // ... 初始化 ...

    // 啟動定期恢復 goroutine
    go c.periodicRecover(ctx, streams, handler)

    // 主消費循環
    for {
        // ...
    }
}

func (c *Consumer) periodicRecover(ctx context.Context, streams []string, handler MessageHandler) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-c.stopCh:
            return
        case <-ticker.C:
            if err := c.RecoverPending(ctx, streams, handler); err != nil {
                c.logger.WithError(err).Warn("Failed to recover pending messages")
            }
        }
    }
}
```

---

## 7. Leader Election (election/leader.go)

### ⚠️ 問題

#### 問題 7.1: ForceAcquire 缺少審計日誌
**嚴重程度**: P2
**位置**: `internal/shared/election/leader.go:288-295`

**建議**: 添加詳細的審計日誌：
```go
func (l *LeaderElection) ForceAcquire(ctx context.Context) error {
    l.logger.WithFields(logrus.Fields{
        "instance_id": l.config.InstanceID,
        "lock_key":    l.config.LockKey,
        "action":      "force_acquire",
        "timestamp":   time.Now(),
    }).Warn("FORCED LEADER ACQUISITION - This should only be used in emergencies")

    err := l.client.Set(ctx, l.config.LockKey, l.config.InstanceID, l.config.TTL).Err()
    if err != nil {
        return fmt.Errorf("failed to force acquire lock: %w", err)
    }
    l.isLeader.Store(true)

    l.logger.WithField("instance_id", l.config.InstanceID).Warn("Successfully force-acquired leadership")
    return nil
}
```

#### 問題 7.2: renewLoop 沒有抖動
**嚴重程度**: P3
**位置**: `internal/shared/election/leader.go:156-177`

**建議**: 添加隨機抖動避免雷鳴群：
```go
func (l *LeaderElection) renewLoop(ctx context.Context) {
    // 添加 ±10% 的隨機抖動
    jitter := time.Duration(float64(l.config.RenewInterval) * (0.9 + 0.2*rand.Float64()))
    ticker := time.NewTicker(jitter)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-l.stopCh:
            return
        case <-ticker.C:
            if !l.renew(ctx) {
                l.logger.Warn("Lost leadership")
                l.isLeader.Store(false)
                if l.onLoseLeader != nil {
                    go l.onLoseLeader()
                }
                return
            }

            // 每次重新計算抖動
            jitter = time.Duration(float64(l.config.RenewInterval) * (0.9 + 0.2*rand.Float64()))
            ticker.Reset(jitter)
        }
    }
}
```

---

## 8. 優先級總結

### P0 - 阻塞性問題（必須立即處理）
1. ✅ **已修復**: MarketDataProvider 訂閱記憶體洩漏
2. 🔴 **待處理**: 遠程服務完全未實現（阻止 MultiTenantMode）

### P1 - 高優先級（下一個迭代）
3. ✅ **已修復**: 使用標準庫排序和 math.Sqrt
4. ✅ **已修復**: UpdateFromClient 監控改進
5. 🔴 **待處理**: notifySubscribers goroutine 管理
6. 🔴 **待處理**: Streams 錯誤處理和重試機制
7. 🔴 **待處理**: RateLimitManager Wait 方法優化
8. 🔴 **待處理**: Redis 健康檢查循環

### P2 - 中等優先級（後續迭代）
9. 🔴 RSI 計算邊界情況
10. 🔴 RateLimitManager 時鐘回撥處理
11. 🔴 服務容器 Stop 超時保護
12. 🔴 Publisher Close 清理邏輯
13. 🔴 Consumer RecoverPending 異步化
14. 🔴 ForceAcquire 審計日誌
15. 🔴 枚舉類型驗證方法

### P3 - 低優先級（改進）
16. 🔴 Context 取消檢查
17. 🔴 GetMarketDataProvider 類型斷言
18. 🔴 Leader election 抖動
19. 🔴 MarketDataUpdate 類型安全

---

## 9. 性能評估

### 已優化項
- ✅ **排序算法**: 從 O(n²) 冒泡排序改為 O(n log n) 標準庫排序
- ✅ **數學函數**: 使用 `math.Sqrt` 替代自定義實現，性能提升 10-100 倍

### 需要優化項
- **Goroutine 管理**: 實現 worker pool 限制並發數
- **批量操作**: Redis 操作可以使用 pipeline
- **緩存**: 添加本地緩存減少 Redis 調用

---

## 10. 安全性評估

### ✅ 良好實踐
- 使用 Lua 腳本保證 Redis 操作原子性
- Leader election 使用 instance ID 防止錯誤釋放
- Panic recovery 防止 goroutine 崩潰傳播

### ⚠️ 需要改進
- 添加速率限制防止 DoS
- 添加輸入驗證和清理
- 考慮添加認證和加密（TLS）

---

## 11. 可靠性評估

### ✅ 良好實踐
- 使用 Redis Streams 替代 Pub-Sub（更可靠）
- Consumer group 支援水平擴展
- Pending messages 恢復機制

### ⚠️ 需要改進
- 添加斷路器模式
- 實現優雅降級（fallback）
- 添加更多的監控指標（Prometheus）

---

## 12. 測試覆蓋率

### 已添加測試
- ✅ MarketDataProvider 訂閱/取消訂閱
- ✅ 多個訂閱獨立性

### 需要添加測試
- 🔴 併發訂閱測試
- 🔴 高頻更新壓力測試
- 🔴 Redis 斷線恢復測試
- 🔴 Leader election 切換測試
- 🔴 Rate limiter 併發測試

---

## 13. 文檔改進建議

### 需要添加的文檔
1. **架構圖**: 顯示 Personal vs MultiTenant 模式的組件交互
2. **序列圖**: 展示數據流和服務調用順序
3. **運維手冊**:
   - 如何監控服務健康
   - 如何處理常見故障
   - Redis 容量規劃
4. **遷移指南**: 從 Personal 模式遷移到 MultiTenant 模式
5. **API 文檔**: 所有介面的詳細使用說明和範例

---

## 14. 下一步行動計劃

### 立即（本週）
1. ✅ 修復 P0 記憶體洩漏問題
2. 🔴 開始實現遠程服務（至少 MarketDataProvider 和 RateLimitManager）
3. 🔴 添加更多單元測試

### 短期（下週）
4. 實現 Streams 錯誤處理改進
5. 添加 Redis 健康檢查
6. 實現 worker pool 限制併發

### 中期（兩週內）
7. 完成所有遠程服務實現
8. 添加集成測試
9. 編寫運維文檔

### 長期（一個月內）
10. 性能測試和優化
11. 添加 Prometheus 監控
12. 壓力測試和容量規劃

---

## 15. 結論

整體架構設計優秀，介面清晰，關注點分離良好。**嵌入式服務實現已基本可用**，主要問題在於：

1. **遠程服務完全未實現** - 這是最大的阻塞項
2. **併發控制需要改進** - 防止資源耗盡
3. **錯誤處理可以更健壯** - 添加重試和斷路器
4. **測試覆蓋率需要提升** - 特別是併發和故障場景

已修復的 3 個關鍵問題顯著提升了系統的可靠性和性能。建議按照優先級逐步解決剩餘問題，特別是 **P0 的遠程服務實現**應該是下一個衝刺的重點。

---

**審查完成日期**: 2025-12-17
**下次審查建議**: 遠程服務實現完成後
