# Bitfinex 放貸機器人回測框架設計

## 設計理念

### 放貸市場 vs 現貨市場的差異

| 特性 | 現貨市場 | 放貸市場 |
|------|---------|---------|
| 撮合方式 | 價格-時間優先 | 借款人主動選擇 |
| 競爭程度 | 激烈（毫秒級） | 較低（分鐘級） |
| 成交決定因素 | 佇列位置 | 利率相對於 FRR |
| 數據需求 | L2 訂單簿 + Tick | FRR + 供需比即可 |

### 核心假設（我的判斷）

1. **利率 ≤ FRR**: 成交率 90-100%，平均 5 分鐘內成交
2. **利率 = FRR × 1.05**: 成交率 60-80%，需等待需求波動
3. **利率 = FRR × 1.15**: 成交率 30-50%，需等待需求激增
4. **利率 > FRR × 1.3**: 成交率 < 20%，可能不會成交

成交率還需乘以 **供需調整因子**:
- 供需比 < 0.8 (需求 > 供給): 成交率 × 1.2
- 供需比 0.8-1.2: 成交率 × 1.0
- 供需比 > 1.2 (供給 > 需求): 成交率 × 0.7

---

## 架構設計

```
┌─────────────────────────────────────────────────────────────────┐
│                    Backtesting Framework                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  DataLoader  │───▶│   Engine     │───▶│   Reporter   │       │
│  │  (CSV/SQLite)│    │ (Event Loop) │    │  (Metrics)   │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  MarketData  │    │  FillModel   │    │   Charts     │       │
│  │   Replayer   │    │ (成交模擬)   │    │  (視覺化)    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │   Strategy   │ ◀── 複用現有 GridStrategy │
│                      │  (不需修改)   │                           │
│                      └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 數據收集層

### 需要收集的數據（每 5 分鐘）

```go
type MarketSnapshot struct {
    Timestamp    time.Time `json:"ts"`
    FRR          float64   `json:"frr"`           // Flash Return Rate
    TotalSupply  float64   `json:"supply"`        // 總供給量
    TotalDemand  float64   `json:"demand"`        // 總需求量
    TopAskRate   float64   `json:"top_ask"`       // 最低賣出利率
    TopBidRate   float64   `json:"top_bid"`       // 最高買入利率
    AskDepth5    float64   `json:"ask_depth_5"`   // 前5層賣盤深度
    BidDepth5    float64   `json:"bid_depth_5"`   // 前5層買盤深度
}
```

### 數據存儲格式

**選擇: CSV (簡單起步) → SQLite (進階)**

```csv
timestamp,frr,supply,demand,top_ask,top_bid,ask_depth_5,bid_depth_5
2024-01-15T10:00:00Z,0.00015,5000000,4500000,0.00014,0.00016,1000000,800000
2024-01-15T10:05:00Z,0.00016,4800000,4600000,0.00015,0.00017,950000,820000
```

### 增強現有數據收集器

目前 `ml/scripts/collect_data.py` 收集:
- FRR ✓
- 訂單簿 ✓

需要增加:
- 供需比計算
- 深度統計

---

## 模擬引擎

### 事件類型

```go
type EventType int

const (
    EventMarketData EventType = iota  // 市場數據更新
    EventOfferPlace                    // 掛單
    EventOfferCancel                   // 取消掛單
    EventOfferFill                     // 掛單成交
    EventLoanExpire                    // 貸款到期
    EventRebalance                     // 策略重平衡
)

type Event struct {
    Time    time.Time
    Type    EventType
    Payload interface{}
}
```

### 成交模型（簡化版 - 我的設計）

```go
// FillModel 決定掛單是否成交
type FillModel interface {
    // 計算成交機率 (0-1)
    CalculateFillProbability(offer *Offer, market *MarketSnapshot) float64

    // 計算預期成交時間
    EstimateFillTime(offer *Offer, market *MarketSnapshot) time.Duration
}

// SimpleFillModel 基於利率差和供需比的簡單模型
type SimpleFillModel struct{}

func (m *SimpleFillModel) CalculateFillProbability(offer *Offer, market *MarketSnapshot) float64 {
    // 1. 基礎成交率：基於利率相對於 FRR
    ratePremium := offer.Rate / market.FRR

    var baseFillRate float64
    switch {
    case ratePremium <= 1.0:
        baseFillRate = 0.95  // 低於市場價，幾乎必成交
    case ratePremium <= 1.05:
        baseFillRate = 0.75  // 略高於市場
    case ratePremium <= 1.15:
        baseFillRate = 0.45  // 明顯高於市場
    case ratePremium <= 1.30:
        baseFillRate = 0.20  // 高價層
    default:
        baseFillRate = 0.05  // 極高價，很難成交
    }

    // 2. 供需調整因子
    supplyDemandRatio := market.TotalSupply / market.TotalDemand
    var sdFactor float64
    switch {
    case supplyDemandRatio < 0.8:
        sdFactor = 1.3  // 需求旺盛
    case supplyDemandRatio < 1.0:
        sdFactor = 1.1
    case supplyDemandRatio < 1.2:
        sdFactor = 0.9
    default:
        sdFactor = 0.6  // 供給過剩
    }

    return math.Min(1.0, baseFillRate * sdFactor)
}
```

### 引擎主循環

```go
type BacktestEngine struct {
    events     *EventQueue       // 優先佇列（按時間排序）
    account    *Account          // 帳戶狀態
    strategy   Strategy          // 策略（複用現有）
    fillModel  FillModel         // 成交模型
    metrics    *MetricsCollector // 指標收集
}

func (e *BacktestEngine) Run(data []MarketSnapshot) *BacktestResult {
    for _, snapshot := range data {
        // 1. 注入市場數據事件
        e.events.Push(Event{Time: snapshot.Timestamp, Type: EventMarketData, Payload: snapshot})

        // 2. 處理所有到時的事件
        for e.events.Peek().Time <= snapshot.Timestamp {
            event := e.events.Pop()
            e.processEvent(event)
        }

        // 3. 檢查是否需要重平衡
        if e.strategy.ShouldRebalance(e.account.ActiveOffers) {
            newOffers := e.strategy.CalculateOffers(e.account.AvailableBalance, snapshot)
            e.scheduleOffers(newOffers, snapshot.Timestamp)
        }
    }

    return e.metrics.GenerateReport()
}
```

---

## 評估指標

### 核心指標

| 指標 | 計算公式 | 目標 |
|------|----------|------|
| **年化收益率 (APR)** | `總利息 / 平均資金 × 365` | > 10% |
| **資金利用率** | `Σ(被借出時間×金額) / Σ(總時間×總金額)` | > 80% |
| **掛單成交率** | `成交金額 / 掛單金額` | > 60% |
| **利率捕獲率** | `實際成交利率 / FRR 平均值` | > 95% |
| **平均成交延遲** | `Σ(成交時間-掛單時間) / N` | < 30 分鐘 |

### 風險指標

| 指標 | 說明 |
|------|------|
| **最大閒置時間** | 資金完全未被借出的最長連續時間 |
| **利率波動暴露** | FRR 大幅變動時的機會成本 |
| **流動性鎖定風險** | 長期貸款佔比 × 平均剩餘天數 |

---

## 實作計劃

### Phase 1: 數據收集增強 (1-2 天)

```bash
# 修改現有收集器，增加字段
ml/scripts/collect_market_data.py
```

### Phase 2: 回測引擎核心 (3-4 天)

```
internal/backtest/
├── engine.go       # 事件循環
├── event.go        # 事件定義
├── account.go      # 帳戶模擬
├── fill_model.go   # 成交模型
└── metrics.go      # 指標計算
```

### Phase 3: 策略適配 (1 天)

```go
// 複用現有策略，只需實現 MarketDataProvider 接口
type BacktestMarketDataProvider struct {
    currentSnapshot *MarketSnapshot
}

func (p *BacktestMarketDataProvider) GetMarketData(currency string) (*client.MarketData, error) {
    return convertToClientMarketData(p.currentSnapshot), nil
}
```

### Phase 4: 報告生成 (1-2 天)

- 控制台輸出關鍵指標
- 可選: HTML 報告 + 圖表

---

## 與 Codex 建議的差異

| Codex 建議 | 我的選擇 | 原因 |
|-----------|---------|------|
| L2 訂單簿 deltas | 5 分鐘快照 | 放貸市場變化慢，不需要高頻數據 |
| Queue position 追蹤 | 利率-供需模型 | 放貸成交主要看利率，不是佇列位置 |
| 複雜的 QueuePolicy | 簡單機率模型 | 先驗證策略，再增加複雜度 |
| Slippage 模擬 | 不考慮 | 放貸市場沒有滑點概念 |

---

## 後續優化方向

1. **機器學習成交預測**: 用歷史數據訓練模型預測成交機率
2. **Monte Carlo 模擬**: 隨機生成市場情境測試策略穩健性
3. **參數優化**: 網格搜索最佳策略參數
4. **A/B 測試框架**: 同時模擬多個策略變體比較效果
