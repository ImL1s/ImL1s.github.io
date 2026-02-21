# 共享服務快速參考指南

快速查閱共享服務 API 和最佳實踐。

---

## 快速開始

### Personal Mode (嵌入式服務)

```go
package main

import (
    "context"
    "github.com/iml1s/bitfinex-lending-bot/internal/services"
    "github.com/iml1s/bitfinex-lending-bot/internal/shared"
)

func main() {
    // 創建配置
    config := &shared.ContainerConfig{
        Mode:       shared.PersonalMode,
        Currencies: []string{"USD", "USDT"},
    }

    // 創建服務容器
    container, err := services.NewServiceContainer(config)
    if err != nil {
        panic(err)
    }

    ctx := context.Background()

    // 啟動服務
    if err := container.Start(ctx); err != nil {
        panic(err)
    }
    defer container.Stop(ctx)

    // 使用服務
    marketData := container.MarketData()
    indicators := container.Indicators()
    rateLimit := container.RateLimit()
}
```

---

## MarketDataProvider API

### 訂閱市場數據更新

```go
// 訂閱 USD 市場數據
unsubscribe, err := marketData.Subscribe(ctx, "USD", func(update shared.MarketDataUpdate) {
    switch update.Type {
    case shared.UpdateTypeFRR:
        fmt.Printf("FRR Update: %+v\n", update.Data)
    case shared.UpdateTypeOrderBook:
        fmt.Printf("OrderBook Update: %+v\n", update.Data)
    case shared.UpdateTypeTrade:
        fmt.Printf("Trade Update: %+v\n", update.Data)
    }
})
if err != nil {
    log.Fatal(err)
}

// 使用完畢後取消訂閱（重要！防止記憶體洩漏）
defer unsubscribe()
```

### 獲取當前市場數據

```go
md, err := marketData.GetMarketData(ctx, "USD")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("FRR: %.6f%%\n", md.FRR*100)
fmt.Printf("Best Bid: %.6f%%\n", md.BestBid*100)
fmt.Printf("Best Ask: %.6f%%\n", md.BestAsk*100)
fmt.Printf("Total Supply: %.2f\n", md.TotalSupply)
fmt.Printf("Total Demand: %.2f\n", md.TotalDemand)
```

### 獲取訂單簿

```go
ob, err := marketData.GetOrderBook(ctx, "USD")
if err != nil {
    log.Fatal(err)
}

fmt.Println("Top 5 Bids (Demand):")
for i := 0; i < 5 && i < len(ob.Bids); i++ {
    bid := ob.Bids[i]
    fmt.Printf("  Rate: %.6f%%, Amount: %.2f\n", bid.Rate*100, -bid.Amount)
}

fmt.Println("Top 5 Asks (Supply):")
for i := 0; i < 5 && i < len(ob.Asks); i++ {
    ask := ob.Asks[i]
    fmt.Printf("  Rate: %.6f%%, Amount: %.2f\n", ask.Rate*100, ask.Amount)
}
```

### 獲取最近交易

```go
trades, err := marketData.GetRecentTrades(ctx, "USD", 10)
if err != nil {
    log.Fatal(err)
}

for _, trade := range trades {
    fmt.Printf("Trade: %.2f @ %.6f%% (%s)\n",
        trade.Amount, trade.Rate*100, trade.Timestamp.Format("15:04:05"))
}
```

### 獲取 FRR 歷史

```go
// 獲取過去 24 小時的 FRR 歷史
history, err := marketData.GetFRRHistory(ctx, "USD", 24*time.Hour)
if err != nil {
    log.Fatal(err)
}

for _, point := range history {
    fmt.Printf("%s: %.6f%%\n", point.Timestamp.Format("15:04:05"), point.FRR*100)
}
```

---

## IndicatorProvider API

### 獲取技術指標

```go
indicators, err := indicatorProvider.GetIndicators(ctx, "USD")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("SMA-20: %.6f%%\n", indicators.SMA20*100)
fmt.Printf("SMA-50: %.6f%%\n", indicators.SMA50*100)
fmt.Printf("RSI: %.2f\n", indicators.RSI)
fmt.Printf("MACD: %.6f\n", indicators.MACD)
fmt.Printf("Volatility: %.6f%%\n", indicators.Volatility*100)
fmt.Printf("Trend: %s\n", indicators.Trend)
```

### 獲取單個指標值

```go
rsi, err := indicatorProvider.GetIndicator(ctx, "USD", "rsi")
if err != nil {
    log.Fatal(err)
}
fmt.Printf("RSI: %.2f\n", rsi)
```

### 訂閱指標更新

```go
unsubscribe, err := indicatorProvider.Subscribe(ctx, "USD", func(update shared.IndicatorUpdate) {
    fmt.Printf("Indicators updated at %s\n", update.Timestamp)
    fmt.Printf("  RSI: %.2f\n", update.Indicators.RSI)
    fmt.Printf("  Trend: %s\n", update.Indicators.Trend)
})
defer unsubscribe()
```

---

## RateLimitManager API

### 獲取 API 配額

```go
// 嘗試獲取 1 個 REST API 調用配額
err := rateLimit.Acquire(ctx, shared.APITypeBitfinexREST, 1)
if err == shared.ErrRateLimitExceeded {
    fmt.Println("Rate limit exceeded, waiting...")
    // 等待配額可用
    if err := rateLimit.Wait(ctx, shared.APITypeBitfinexREST, 1); err != nil {
        log.Fatal(err)
    }
}
```

### 檢查剩餘配額

```go
remaining, err := rateLimit.Remaining(ctx, shared.APITypeBitfinexREST)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Remaining API calls: %d\n", remaining)
```

### 等待配額

```go
// 等待 5 個調用的配額可用（會阻塞）
err := rateLimit.Wait(ctx, shared.APITypeBitfinexREST, 5)
if err != nil {
    log.Fatal(err)
}

// 現在可以安全地進行 5 次 API 調用
```

### API 類型

```go
shared.APITypeBitfinexREST  // Bitfinex REST API (10 req/s, burst 30)
shared.APITypeBitfinexWS    // Bitfinex WebSocket (20 msg/s, burst 60)
shared.APITypeTelegram      // Telegram Bot API (1 msg/s, burst 30)
shared.APITypeInternal      // 內部服務調用 (100 req/s, burst 500)
```

---

## HistoryProvider API

### 存儲數據點

```go
// 存儲 FRR 數據
err := history.Store(ctx, "USD", shared.DataTypeFRR, shared.FRRPoint{
    FRR:       0.0012,
    Timestamp: time.Now(),
})

// 存儲交易數據
err := history.Store(ctx, "USD", shared.DataTypeTrade, shared.Trade{
    ID:        "12345",
    Currency:  "USD",
    Rate:      0.0012,
    Amount:    1000,
    Period:    2,
    Timestamp: time.Now(),
})
```

### 查詢歷史數據

```go
// 查詢過去 1 小時的 FRR 數據
start := time.Now().Add(-time.Hour)
end := time.Now()

dataPoints, err := history.Query(ctx, "USD", shared.DataTypeFRR, start, end)
if err != nil {
    log.Fatal(err)
}

for _, point := range dataPoints {
    frr := point.Value.(shared.FRRPoint)
    fmt.Printf("%s: %.6f%%\n", point.Timestamp.Format("15:04:05"), frr.FRR*100)
}
```

### 獲取統計數據

```go
// 獲取過去 24 小時的統計
stats, err := history.GetStats(ctx, "USD", shared.DataTypeFRR, 24*time.Hour)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Count: %d\n", stats.Count)
fmt.Printf("Mean: %.6f%%\n", stats.Mean*100)
fmt.Printf("Min: %.6f%%\n", stats.Min*100)
fmt.Printf("Max: %.6f%%\n", stats.Max*100)
fmt.Printf("StdDev: %.6f%%\n", stats.StdDev*100)
fmt.Printf("P50: %.6f%%\n", stats.P50*100)
fmt.Printf("P95: %.6f%%\n", stats.P95*100)
fmt.Printf("P99: %.6f%%\n", stats.P99*100)
```

---

## MLPredictionProvider API

### 預測利率

```go
// 預測 1 小時後的利率
prediction, err := mlProvider.PredictRate(ctx, "USD", time.Hour)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Current: %.6f%%\n", prediction.Predicted*100)
fmt.Printf("Predicted: %.6f%%\n", prediction.Predicted*100)
fmt.Printf("Confidence: %.2f%%\n", prediction.Confidence*100)
fmt.Printf("Direction: %s\n", prediction.Direction)
fmt.Printf("Range: %.6f%% - %.6f%%\n", prediction.Lower*100, prediction.Upper*100)
```

### 預測波動率

```go
volatility, err := mlProvider.PredictVolatility(ctx, "USD")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Current Volatility: %.6f%%\n", volatility.Current*100)
fmt.Printf("Predicted Volatility: %.6f%%\n", volatility.Predicted*100)
fmt.Printf("Trend: %s\n", volatility.Trend)
fmt.Printf("Regime: %s\n", volatility.Regime)
```

### 推薦借出期限

```go
// 根據風險偏好推薦期限
period, err := mlProvider.RecommendPeriod(ctx, "USD", shared.RiskProfileModerate)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Recommended period: %d days\n", period)
```

---

## 健康檢查

### 檢查單個服務

```go
health, err := marketData.Health(ctx)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Service: %s\n", health.ServiceName)
fmt.Printf("Status: %s\n", health.Status)
fmt.Printf("Latency: %dms\n", health.Latency)
fmt.Printf("Message: %s\n", health.Message)
```

### 檢查所有服務

```go
healthMap, err := container.Health(ctx)
if err != nil {
    log.Fatal(err)
}

for name, health := range healthMap {
    status := "✅"
    if health.Status != "healthy" {
        status = "❌"
    }
    fmt.Printf("%s %s: %s\n", status, name, health.Status)
}
```

---

## 最佳實踐

### 1. 總是取消訂閱

```go
✅ 正確：
unsubscribe, err := marketData.Subscribe(ctx, "USD", handler)
if err != nil {
    return err
}
defer unsubscribe() // 確保清理

❌ 錯誤：
marketData.Subscribe(ctx, "USD", handler) // 沒有取消訂閱 = 記憶體洩漏
```

### 2. 使用 Context 控制生命週期

```go
✅ 正確：
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

md, err := marketData.GetMarketData(ctx, "USD")

❌ 錯誤：
md, err := marketData.GetMarketData(context.Background(), "USD") // 無法控制超時
```

### 3. 處理速率限制

```go
✅ 正確：
if err := rateLimit.Acquire(ctx, shared.APITypeBitfinexREST, 1); err != nil {
    if err == shared.ErrRateLimitExceeded {
        log.Warn("Rate limit exceeded, waiting...")
        rateLimit.Wait(ctx, shared.APITypeBitfinexREST, 1)
    } else {
        return err
    }
}

❌ 錯誤：
// 直接調用 API，可能違反速率限制
client.GetTicker()
```

### 4. 錯誤處理

```go
✅ 正確：
md, err := marketData.GetMarketData(ctx, "USD")
if err != nil {
    if err == shared.ErrServiceUnavailable {
        // 服務暫時不可用，使用備用方案
        return fallbackData()
    }
    return fmt.Errorf("failed to get market data: %w", err)
}

❌ 錯誤：
md, _ := marketData.GetMarketData(ctx, "USD") // 忽略錯誤
```

### 5. 訂閱 Handler 不要阻塞

```go
✅ 正確：
unsubscribe, _ := marketData.Subscribe(ctx, "USD", func(update shared.MarketDataUpdate) {
    // Handler 會在 goroutine 中執行，但仍應快速返回
    go processUpdate(update) // 如果處理耗時，啟動新 goroutine
})

❌ 錯誤：
unsubscribe, _ := marketData.Subscribe(ctx, "USD", func(update shared.MarketDataUpdate) {
    time.Sleep(10 * time.Second) // 阻塞會影響其他訂閱者
    processUpdate(update)
})
```

### 6. 優雅關閉

```go
✅ 正確：
func main() {
    container, _ := services.NewServiceContainer(config)
    ctx := context.Background()
    container.Start(ctx)

    // 捕獲信號
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

    <-sigCh
    fmt.Println("Shutting down...")

    // 給 10 秒時間優雅關閉
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := container.Stop(shutdownCtx); err != nil {
        log.Printf("Shutdown error: %v\n", err)
    }
}

❌ 錯誤：
func main() {
    container, _ := services.NewServiceContainer(config)
    container.Start(context.Background())

    select {} // 沒有優雅關閉邏輯
}
```

---

## 常見錯誤和解決方案

### 錯誤 1: "rate limit exceeded"

**原因**: 超過 API 速率限制

**解決**:
```go
// 方法 1: 使用 Wait
err := rateLimit.Wait(ctx, shared.APITypeBitfinexREST, 1)

// 方法 2: 指數退避重試
backoff := time.Second
for i := 0; i < 5; i++ {
    if err := rateLimit.Acquire(ctx, shared.APITypeBitfinexREST, 1); err == nil {
        break
    }
    time.Sleep(backoff)
    backoff *= 2
}
```

### 錯誤 2: "service unavailable"

**原因**: 服務暫時不可用（如 Redis 連接斷開）

**解決**:
```go
md, err := marketData.GetMarketData(ctx, "USD")
if err == shared.ErrServiceUnavailable {
    // 使用緩存或備用數據源
    return getCachedMarketData("USD")
}
```

### 錯誤 3: Context 超時

**原因**: 操作超時

**解決**:
```go
// 增加超時時間
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// 或使用重試
for i := 0; i < 3; i++ {
    md, err := marketData.GetMarketData(ctx, "USD")
    if err == nil {
        return md, nil
    }
    time.Sleep(time.Second)
}
```

---

## 監控指標

### 獲取 dropped updates 計數

```go
// 僅適用於 embedded MarketDataProvider
if mdp, ok := container.GetMarketDataProvider(); ok {
    dropped := mdp.GetDroppedUpdates()
    if dropped > 0 {
        log.Warnf("Dropped %d updates", dropped)
    }
}
```

### 記錄健康檢查

```go
// 定期檢查服務健康
ticker := time.NewTicker(30 * time.Second)
defer ticker.Stop()

for range ticker.C {
    healthMap, _ := container.Health(context.Background())
    for name, health := range healthMap {
        if health.Status != "healthy" {
            log.Warnf("Service %s unhealthy: %s", name, health.Message)
            // 觸發告警
        }
    }
}
```

---

## 進階用法

### 自定義速率限制

```go
// 僅適用於 embedded RateLimitManager
if rlm, ok := container.RateLimit().(*embedded.RateLimitManager); ok {
    // 設置自定義限制：每秒 5 個請求，burst 15
    rlm.SetLimit(shared.APITypeBitfinexREST, 5.0, 15)
}
```

### 批量操作

```go
// 同時查詢多個貨幣的市場數據
currencies := []string{"USD", "USDT", "EUR"}
results := make(map[string]*shared.MarketData)
var wg sync.WaitGroup

for _, currency := range currencies {
    wg.Add(1)
    go func(cur string) {
        defer wg.Done()
        md, err := marketData.GetMarketData(ctx, cur)
        if err == nil {
            results[cur] = md
        }
    }(currency)
}

wg.Wait()
```

---

## 故障排除

### 問題: 訂閱沒有收到更新

**檢查清單**:
1. 確認服務已啟動: `container.Start(ctx)`
2. 確認 Bot 正在推送更新到 MarketDataProvider
3. 檢查日誌中是否有錯誤
4. 驗證 handler 沒有 panic

### 問題: 記憶體持續增長

**可能原因**:
1. 忘記取消訂閱
2. History 數據沒有清理
3. Goroutine 洩漏

**排查方法**:
```bash
# 使用 pprof 分析
go tool pprof http://localhost:6060/debug/pprof/heap
```

### 問題: 服務啟動失敗

**檢查**:
1. Redis 連接（MultiTenant 模式）
2. 配置是否正確
3. 端口是否被占用

---

## 更多資源

- 📄 [詳細審查報告](./CODE_REVIEW_SHARED_SERVICES.md)
- 📝 [執行摘要](./CODE_REVIEW_SUMMARY.md)
- 🏗️ [架構文檔](./ARCHITECTURE.md)
- 🧪 [測試範例](../internal/shared/embedded/market_data_test.go)

---

**最後更新**: 2025-12-17
