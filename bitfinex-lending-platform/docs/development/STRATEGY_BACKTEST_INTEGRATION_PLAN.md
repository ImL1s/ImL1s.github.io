# 策略模組回測整合方案

## 概述

本文檔規劃如何將三個新策略模組整合到回測框架中進行驗證：
- `Repricer` - 指數衰減重新定價
- `FrequencyManager` - 自適應更新頻率
- `FillPredictor` - 成交機率預測

## 1. 適配性分析

### 1.1 現有回測系統架構

```
Engine.Run() 主循環:
├── processEventsUntil()     # 處理事件隊列
├── checkOfferFills()        # 檢查成交 (使用 FillModel)
├── shouldRebalance()        # 判斷是否重平衡
└── executeRebalance()       # 全部取消 + 重新掛單
```

### 1.2 各模組適配性

| 模組 | 適配性 | 說明 |
|------|--------|------|
| **Repricer** | ❌ 需修改 | 現有引擎只支援「全部取消再重掛」，沒有單個 offer 重新定價 |
| **FrequencyManager** | ❌ 需修改 | 引擎固定按 5 分鐘快照處理，沒有動態間隔 |
| **FillPredictor** | ✅ 直接可用 | 可作為 `FillModel` 的替代實現 |

---

## 2. 整合方案

### 方案 A：最小修改方案 (推薦先做)

只整合 `FillPredictor`，不修改引擎核心：

```go
// internal/backtest/fill_predictor_adapter.go
type FillPredictorAdapter struct {
    predictor *strategy.FillPredictor
}

func (a *FillPredictorAdapter) CalculateFillProbability(
    offer *SimulatedOffer,
    market *MarketSnapshot,
) float64 {
    book := market.ToOrderBook()
    return a.predictor.PredictFillProbability(offer.Rate, book)
}
```

**優點**：改動最小，可快速驗證 FillPredictor 效果
**測試方式**：比較使用 SimpleFillModel vs FillPredictorAdapter 的回測結果

---

### 方案 B：增強引擎方案

修改引擎支持 Repricer 和 FrequencyManager：

#### B.1 新增 Reprice 事件類型

```go
// types.go
const (
    EventReprice EventType = iota + 10  // 重新定價事件
)

// engine.go
func (e *Engine) processEvent(event *Event) {
    switch event.Type {
    case EventReprice:
        offer := event.Payload.(*SimulatedOffer)
        e.handleReprice(offer)
    // ...
    }
}

func (e *Engine) handleReprice(offer *SimulatedOffer) {
    if _, exists := e.account.ActiveOffers[offer.ID]; !exists {
        return
    }

    book := e.currentSnapshot.ToOrderBook()
    if e.repricer.ShouldReprice(toClientOffer(offer), book, e.config.MinRate) {
        newRate := e.repricer.CalculateNewRate(toClientOffer(offer), book, e.config.MinRate)

        // 取消舊掛單
        e.account.Cash += offer.Amount
        e.account.Reserved -= offer.Amount
        delete(e.account.ActiveOffers, offer.ID)

        // 創建新掛單 (相同金額，新利率)
        e.createOffer(offer.Amount, newRate, offer.Period)
    }
}
```

#### B.2 整合 FrequencyManager

```go
// engine.go 修改
type Engine struct {
    // ...
    freqManager *strategy.FrequencyManager
    lastUpdate  time.Time
}

func (e *Engine) shouldRebalance(snapshotIndex int) bool {
    if e.freqManager == nil {
        return e.strategy.ShouldRebalance(e.account.ActiveOffersAsMap())
    }

    // 使用 FrequencyManager 決定間隔
    if len(e.account.ActiveOffers) == 0 {
        return true
    }

    // 獲取最老的掛單利率
    oldestRate := e.getOldestOfferRate()
    book := e.currentSnapshot.ToOrderBook()
    interval := e.freqManager.GetNextUpdateInterval(oldestRate, book)

    return e.currentTime.Sub(e.lastUpdate) >= interval
}
```

---

### 方案 C：獨立測試方案 (並行執行)

不修改回測引擎，為新模組寫獨立的測試場景：

```go
// internal/strategy/integration_test.go
func TestRepricer_HistoricalScenarios(t *testing.T) {
    // 載入歷史數據
    data, _ := backtest.LoadCSV("../../ml/data_cache/funding_candles_USD_persistent.parquet")

    repricer := NewRepricer(nil)

    for i := 1; i < len(data); i++ {
        prev := data[i-1]
        curr := data[i]

        // 模擬一個掛在 prev 時間點的 offer
        offer := &client.FundingOffer{
            Rate:    prev.FRR * 1.1,  // 高於 FRR 10%
            Created: prev.Timestamp,
        }

        book := curr.ToOrderBook()

        // 測試 Repricer 行為
        shouldReprice := repricer.ShouldReprice(offer, book, 0.0001)
        if shouldReprice {
            newRate := repricer.CalculateNewRate(offer, book, 0.0001)
            // 記錄統計...
        }
    }
}
```

---

## 3. 實施計劃

### 階段 1：FillPredictor 整合 (1-2 小時)

1. 創建 `FillPredictorAdapter` 適配器
2. 在 `MarketSnapshot` 添加 `ToOrderBook()` 方法
3. 運行對比回測：SimpleFillModel vs FillPredictorAdapter
4. 分析成交率和利率捕獲差異

### 階段 2：獨立場景測試 (2-3 小時)

1. 載入歷史 Parquet 數據
2. 為 Repricer 寫歷史場景測試
3. 為 FrequencyManager 寫歷史場景測試
4. 生成統計報告

### 階段 3：引擎增強 (可選，4-6 小時)

1. 添加 `EventReprice` 事件類型
2. 實現 `handleReprice()` 邏輯
3. 整合 FrequencyManager 到 `shouldRebalance()`
4. 全面回測驗證

---

## 4. 預期產出

### 4.1 FillPredictor 對比報告

```
=== FillModel 對比 ===
                    SimpleFillModel    FillPredictorAdapter
成交率              52.3%              58.1%  (+5.8%)
平均成交時間        14.2 min           11.8 min  (-17%)
利率捕獲率          1.02x FRR          1.05x FRR  (+3%)
資金利用率          71.2%              74.8%  (+3.6%)
```

### 4.2 Repricer 歷史場景報告

```
=== Repricer 歷史分析 (90 天) ===
總掛單數            15,234
觸發重新定價        4,821 (31.6%)
平均衰減時間        45.2 分鐘
平均利率調整        -3.2 bps

按市場狀態:
  - 平穩期: 觸發率 18%, 平均衰減 62 min
  - 波動期: 觸發率 58%, 平均衰減 23 min
  - Churn 期: 觸發率 72%, 平均衰減 15 min
```

---

## 5. 數據需求

### 5.1 現有數據

| 檔案 | 大小 | 內容 |
|------|------|------|
| `funding_candles_USD_persistent.parquet` | 270 KB | FRR K 線 |
| `funding_candles_USD_90d.parquet` | 77 KB | 90 天 FRR |

### 5.2 缺失數據

現有數據只有 FRR，缺少完整訂單簿快照。

**解決方案**：
1. 從 FRR 合成訂單簿 (簡化版)
2. 開始收集真實訂單簿數據供未來使用

```go
func (s *MarketSnapshot) ToOrderBook() *client.OrderBook {
    // 基於 FRR 合成簡化訂單簿
    return &client.OrderBook{
        Asks: []client.BookEntry{
            {Rate: s.TopAskRate, Amount: s.AskDepth5},
            {Rate: s.FRR, Amount: s.TotalSupply * 0.1},
        },
    }
}
```

---

## 6. 成功標準

| 指標 | 基準 (SimpleFillModel) | 目標 |
|------|------------------------|------|
| 成交率 | 50-55% | ≥ 55% |
| 利率捕獲率 | 1.0x FRR | ≥ 1.03x FRR |
| 資金利用率 | 70% | ≥ 75% |
| Sharpe Ratio | 1.5 | ≥ 1.8 |

如果回測結果達到目標，則可以進入生產整合階段。
