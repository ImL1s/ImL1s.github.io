# 實時市場響應改進 - 集成示例

本文檔提供將新的實時市場響應模組集成到現有 Bot 的詳細代碼示例。

## 步驟 1：更新 Bot 結構

```go
// 在 internal/bot/bot.go 中
type Bot struct {
    config          *config.Config
    client          client.Client
    strategy        strategy.Strategy
    riskManager     *risk.Manager
    metrics         *monitoring.Metrics
    db              *database.Database
    webServer       *web.Server
    notificationMgr *notification.Manager
    mu              sync.RWMutex
    activeOffers    map[string]interface{}
    fundingCredits  map[string]*client.FundingCredit
    fundingLoans    map[string]*client.FundingLoan
    lastSyncTime    time.Time

    // 暫停控制
    isPaused    bool
    pausedAt    time.Time
    pauseReason string

    // ===== 新增：實時響應模組 =====
    eventProcessor      *PriorityEventProcessor      // 優先級事件處理器
    opportunityDetector *MarketOpportunityDetector   // 市場機會檢測器
    orderBookProcessor  *IncrementalOrderBook        // 增量訂單簿處理器
    // ================================

    // 原有的防抖機制（保留作為降級方案）
    rebalanceChan     chan struct{}
    rebalanceMu       sync.Mutex
    lastRebalanceTime time.Time
    rebalanceCooldown time.Duration
}
```

## 步驟 2：修改 New 函數

```go
func New(cfg *config.Config, metrics *monitoring.Metrics) (*Bot, error) {
    // ... 現有的客戶端、策略、風險管理器初始化代碼 ...

    // 創建基本 Bot 實例
    bot := &Bot{
        config:          cfg,
        client:          bfxClient,
        strategy:        selectedStrategy,
        riskManager:     riskMgr,
        metrics:         metrics,
        db:              db,
        webServer:       webServer,
        notificationMgr: notificationMgr,
        activeOffers:    make(map[string]interface{}),
        fundingCredits:  make(map[string]*client.FundingCredit),
        fundingLoans:    make(map[string]*client.FundingLoan),
    }

    // ===== 新增：初始化實時響應模組 =====

    // 1. 創建市場機會檢測器
    bot.opportunityDetector = NewMarketOpportunityDetector()
    logrus.Info("Market opportunity detector initialized")

    // 2. 創建增量訂單簿處理器
    currency := bot.getCurrency()
    bot.orderBookProcessor = NewIncrementalOrderBook("f" + currency)
    logrus.Info("Incremental order book processor initialized")

    // 3. 註冊訂單簿變化回調
    bot.orderBookProcessor.RegisterChangeCallback(func(bestBid, bestAsk float64) {
        // 當最佳報價變化時，檢查是否有市場機會
        if marketData, err := bot.client.GetMarketData(currency); err == nil && marketData != nil {
            if bot.opportunityDetector.DetectMarketOpportunity(marketData.FRR, bestBid) {
                logrus.Info("[MARKET_OPPORTUNITY] Significant price change detected, requesting rebalance")
                bot.requestRebalance("best_price_change")
            }
        }
    })

    // 4. 創建優先級事件處理器（使用 4 個工作協程）
    // 注意：需要在 Run() 方法中傳入 context
    // 這裡先設為 nil，稍後在 Run() 中初始化
    bot.eventProcessor = nil

    // =====================================

    // Connect bot to web server
    webServer.SetBot(bot)

    // ... 其他現有初始化代碼 ...

    return bot, nil
}
```

## 步驟 3：修改 Run 方法

```go
func (b *Bot) Run(ctx context.Context) error {
    logrus.Info("Starting Bitfinex lending bot...")

    // ===== 新增：啟動事件處理器 =====
    b.eventProcessor = NewPriorityEventProcessor(ctx, 4)
    b.eventProcessor.Start()
    logrus.Info("Priority event processor started with 4 workers")
    // ===================================

    // 初始化原有的防抖機制（作為降級方案保留）
    b.rebalanceChan = make(chan struct{}, 100)
    b.rebalanceCooldown = 5 * time.Second
    b.lastRebalanceTime = time.Now().Add(-10 * time.Second)

    // 啟動防抖 worker
    go b.rebalanceDebounceWorker(ctx)
    logrus.Info("Rebalance debounce mechanism initialized")

    // ... 其他現有啟動代碼 ...

    // 訂閱 WebSocket 頻道
    currency := b.getCurrency()
    symbol := "f" + currency

    // 訂閱 ticker (FRR 數據)
    if err := b.client.SubscribeTicker(symbol); err != nil {
        return fmt.Errorf("failed to subscribe to ticker: %w", err)
    }

    // 訂閱 order book
    if err := b.client.SubscribeOrderBook(symbol); err != nil {
        return fmt.Errorf("failed to subscribe to order book: %w", err)
    }

    // 訂閱 trades
    if err := b.client.SubscribeTrades(symbol); err != nil {
        return fmt.Errorf("failed to subscribe to trades: %w", err)
    }

    // ... 啟動其他組件 ...

    return nil
}
```

## 步驟 4：修改 WebSocket 事件處理

### 4.1 處理 Ticker 更新（FRR）

```go
// 在現有的 handleTickerUpdate 方法中添加事件處理器邏輯
func (b *Bot) handleTickerUpdate(update client.TickerUpdate) {
    // ===== 新增：使用優先級事件處理器 =====
    if b.eventProcessor != nil {
        event := b.eventProcessor.CreateFRRUpdateEvent(&update, func(u *client.TickerUpdate) error {
            // 獲取完整市場數據
            currency := b.getCurrency()
            marketData, err := b.client.GetMarketData(currency)
            if err != nil {
                logrus.Errorf("Failed to get market data: %v", err)
                return err
            }

            // 更新市場機會檢測器
            if b.opportunityDetector != nil {
                b.opportunityDetector.UpdateMarketData(marketData)

                // 評估市場機會
                score := b.opportunityDetector.EvaluateOpportunity(marketData)
                if score != nil {
                    logrus.WithFields(logrus.Fields{
                        "score":            score.Score,
                        "should_rebalance": score.ShouldRebalance,
                        "reason":           score.Reason,
                    }).Debug("[OPPORTUNITY] Market opportunity evaluated")

                    // 如果分數夠高且應該重平衡
                    if score.ShouldRebalance {
                        if b.eventProcessor.ShouldRequestRebalance(score.Reason) {
                            logrus.WithFields(logrus.Fields{
                                "score":  score.Score,
                                "reason": score.Reason,
                            }).Info("[OPPORTUNITY] High opportunity score, requesting rebalance")
                            b.requestRebalance(score.Reason)
                        }
                    }
                }
            }

            return nil
        })

        b.eventProcessor.SubmitEvent(event)
    } else {
        // 降級方案：直接處理（舊邏輯）
        b.handleTickerUpdateLegacy(update)
    }
    // =========================================
}

// 保留舊的處理邏輯作為降級方案
func (b *Bot) handleTickerUpdateLegacy(update client.TickerUpdate) {
    // 原有的處理代碼...
    logrus.WithFields(logrus.Fields{
        "frr": update.FRR,
        "bid": update.Bid,
        "ask": update.Ask,
    }).Debug("Ticker update (legacy mode)")
}
```

### 4.2 處理訂單簿更新

```go
// 修改現有的訂單簿更新處理
func (b *Bot) handleOrderBookUpdate(update client.OrderBookUpdate) {
    // ===== 新增：使用增量訂單簿處理器 =====
    if b.orderBookProcessor != nil {
        // 增量處理訂單簿更新（高效）
        b.orderBookProcessor.ProcessIncremental(&update)

        // 如果使用事件處理器
        if b.eventProcessor != nil {
            event := b.eventProcessor.CreateOrderBookUpdateEvent(&update, func(u *client.OrderBookUpdate) error {
                // 更新策略的訂單簿
                if b.strategy != nil {
                    b.strategy.UpdateOrderBook(*u)
                }
                return nil
            })

            b.eventProcessor.SubmitEvent(event)
        } else {
            // 直接更新策略
            b.strategy.UpdateOrderBook(update)
        }
    } else {
        // 降級方案：使用舊的全量處理方式
        b.handleOrderBookUpdateLegacy(update)
    }
    // =========================================
}

// 舊的處理邏輯（保留作為降級方案）
func (b *Bot) handleOrderBookUpdateLegacy(update client.OrderBookUpdate) {
    // 原有的處理代碼...
    b.strategy.UpdateOrderBook(update)
}
```

### 4.3 處理交易執行

```go
func (b *Bot) handleFundingTradeExecuted(trade client.FundingTradeExecuted) {
    // 驗證交易幣種
    tradeCurrency := strings.TrimPrefix(trade.Symbol, "f")
    expectedCurrency := b.getCurrency()

    if tradeCurrency != expectedCurrency {
        return // 跳過其他實例的交易
    }

    // ===== 新增：使用優先級事件處理器 =====
    if b.eventProcessor != nil {
        event := b.eventProcessor.CreateTradeExecutedEvent(&trade, func(t *client.FundingTradeExecuted) error {
            // 記錄交易
            logrus.WithFields(logrus.Fields{
                "id":     t.ID,
                "amount": t.Amount,
                "rate":   t.Rate,
                "period": t.Period,
                "maker":  t.Maker,
            }).Info("Funding trade executed")

            // 更新 metrics
            if b.metrics != nil {
                b.metrics.RecordLoanExecuted(t.Rate, t.Amount, t.Period)
            }

            // 發送通知
            if b.notificationMgr != nil && b.notificationMgr.IsEnabled() {
                go func() {
                    ctx := context.Background()
                    b.notificationMgr.NotifyLoanExecuted(ctx, t.Amount, t.Rate, t.Period, tradeCurrency)
                }()
            }

            // 記錄到資料庫
            if b.db != nil {
                earnings := t.Amount * t.Rate * float64(t.Period) / 365.0
                b.db.RecordExecution(fmt.Sprintf("%d", t.ID), t.Amount, t.Rate, earnings)
            }

            // 從活躍報價中移除
            b.mu.Lock()
            offerIDStr := fmt.Sprintf("%d", t.OfferID)
            delete(b.activeOffers, offerIDStr)
            b.mu.Unlock()

            // 請求重平衡
            b.requestRebalance(fmt.Sprintf("trade_executed:%d", t.ID))

            return nil
        })

        b.eventProcessor.SubmitEvent(event)
    } else {
        // 降級方案：直接處理
        b.handleFundingTradeExecutedLegacy(trade)
    }
    // =========================================
}
```

## 步驟 5：添加監控端點

```go
// 在 web server 中添加新的統計端點
func (s *Server) handleStats(w http.ResponseWriter, r *http.Request) {
    stats := make(map[string]interface{})

    if s.bot != nil {
        // 現有統計數據
        stats["balance"] = s.getBalanceStats()
        stats["offers"] = s.getOfferStats()
        stats["credits"] = s.getCreditStats()

        // ===== 新增：實時響應模組統計 =====
        if s.bot.eventProcessor != nil {
            stats["event_processor"] = s.bot.eventProcessor.GetStats()
        }

        if s.bot.opportunityDetector != nil {
            stats["opportunity_detector"] = s.bot.opportunityDetector.GetStatistics()

            // 當前機會分數
            if lastScore := s.bot.opportunityDetector.GetLastScore(); lastScore != nil {
                stats["current_opportunity"] = map[string]interface{}{
                    "score":            lastScore.Score,
                    "rate_score":       lastScore.RateScore,
                    "volume_score":     lastScore.VolumeScore,
                    "volatility_score": lastScore.VolatilityScore,
                    "spread_score":     lastScore.SpreadScore,
                    "trend_score":      lastScore.TrendScore,
                    "should_rebalance": lastScore.ShouldRebalance,
                    "reason":           lastScore.Reason,
                    "timestamp":        lastScore.Timestamp,
                }
            }
        }

        if s.bot.orderBookProcessor != nil {
            stats["orderbook"] = s.bot.orderBookProcessor.GetStats()
        }
        // =========================================
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(stats)
}
```

## 步驟 6：配置文件更新

在 `config/config.yaml` 中添加新的配置選項：

```yaml
# 現有配置...
bot:
  currency: "USD"
  # ...

# ===== 新增：實時響應配置 =====
realtime_response:
  # 事件處理器配置
  event_processor:
    enabled: true
    worker_count: 4          # 工作協程數量（建議為 CPU 核心數的 50-100%）
    queue_buffer: 500        # 事件隊列緩衝大小
    max_queue_size: 2000     # 最大隊列大小（過載保護）

  # 市場機會檢測器配置
  opportunity_detector:
    enabled: true
    high_rate_threshold: 0.0003        # 0.03% 日利率（約 11% 年化）
    high_volatility_threshold: 0.15    # 15% 標準差
    significant_spread_threshold: 0.00002  # 2 基點
    min_score_for_rebalance: 65.0      # 最低重平衡分數
    rebalance_cooldown: 180            # 重平衡冷卻期（秒）

  # 訂單簿處理器配置
  orderbook_processor:
    enabled: true
    max_history_size: 200    # 最大歷史記錄數
    use_incremental: true    # 使用增量更新
# =========================================
```

## 步驟 7：讀取配置

```go
// 在 config/config.go 中添加新的配置結構
type Config struct {
    // 現有字段...
    API          APIConfig          `yaml:"api"`
    Bot          BotConfig          `yaml:"bot"`
    Strategy     StrategyConfig     `yaml:"strategy"`
    Risk         RiskConfig         `yaml:"risk"`
    Notification NotificationConfig `yaml:"notification"`

    // ===== 新增 =====
    RealtimeResponse RealtimeResponseConfig `yaml:"realtime_response"`
    // ================
}

// 新增的配置結構
type RealtimeResponseConfig struct {
    EventProcessor       EventProcessorConfig       `yaml:"event_processor"`
    OpportunityDetector  OpportunityDetectorConfig  `yaml:"opportunity_detector"`
    OrderBookProcessor   OrderBookProcessorConfig   `yaml:"orderbook_processor"`
}

type EventProcessorConfig struct {
    Enabled      bool `yaml:"enabled"`
    WorkerCount  int  `yaml:"worker_count"`
    QueueBuffer  int  `yaml:"queue_buffer"`
    MaxQueueSize int  `yaml:"max_queue_size"`
}

type OpportunityDetectorConfig struct {
    Enabled                      bool    `yaml:"enabled"`
    HighRateThreshold            float64 `yaml:"high_rate_threshold"`
    HighVolatilityThreshold      float64 `yaml:"high_volatility_threshold"`
    SignificantSpreadThreshold   float64 `yaml:"significant_spread_threshold"`
    MinScoreForRebalance         float64 `yaml:"min_score_for_rebalance"`
    RebalanceCooldown            int     `yaml:"rebalance_cooldown"`
}

type OrderBookProcessorConfig struct {
    Enabled         bool `yaml:"enabled"`
    MaxHistorySize  int  `yaml:"max_history_size"`
    UseIncremental  bool `yaml:"use_incremental"`
}
```

## 步驟 8：在 New 函數中使用配置

```go
func New(cfg *config.Config, metrics *monitoring.Metrics) (*Bot, error) {
    // ... 現有代碼 ...

    // ===== 使用配置創建模組 =====
    var eventProcessor *PriorityEventProcessor
    var opportunityDetector *MarketOpportunityDetector
    var orderBookProcessor *IncrementalOrderBook

    // 1. 市場機會檢測器
    if cfg.RealtimeResponse.OpportunityDetector.Enabled {
        opportunityDetector = NewMarketOpportunityDetector()

        // 應用配置
        opportunityDetector.highRateThreshold = cfg.RealtimeResponse.OpportunityDetector.HighRateThreshold
        opportunityDetector.highVolatilityThreshold = cfg.RealtimeResponse.OpportunityDetector.HighVolatilityThreshold
        opportunityDetector.significantSpreadThreshold = cfg.RealtimeResponse.OpportunityDetector.SignificantSpreadThreshold
        opportunityDetector.minScoreForRebalance = cfg.RealtimeResponse.OpportunityDetector.MinScoreForRebalance

        logrus.Info("Market opportunity detector initialized with custom config")
    }

    // 2. 訂單簿處理器
    if cfg.RealtimeResponse.OrderBookProcessor.Enabled {
        currency := bot.getCurrency()
        orderBookProcessor = NewIncrementalOrderBook("f" + currency)

        // 註冊回調
        if opportunityDetector != nil {
            orderBookProcessor.RegisterChangeCallback(func(bestBid, bestAsk float64) {
                if marketData, err := bot.client.GetMarketData(currency); err == nil && marketData != nil {
                    if opportunityDetector.DetectMarketOpportunity(marketData.FRR, bestBid) {
                        bot.requestRebalance("best_price_change")
                    }
                }
            })
        }

        logrus.Info("Incremental order book processor initialized")
    }

    // 3. 事件處理器（在 Run 中初始化，這裡只保存配置）
    bot.eventProcessorConfig = &cfg.RealtimeResponse.EventProcessor

    // 設置到 bot
    bot.eventProcessor = nil // 稍後在 Run 中初始化
    bot.opportunityDetector = opportunityDetector
    bot.orderBookProcessor = orderBookProcessor
    // ===============================

    return bot, nil
}
```

## 步驟 9：測試

### 單元測試示例

```go
// internal/bot/event_priority_test.go
package bot

import (
    "context"
    "testing"
    "time"
)

func TestPriorityEventProcessor(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    pep := NewPriorityEventProcessor(ctx, 2)
    pep.Start()
    defer pep.Stop()

    processed := make([]string, 0)
    mu := sync.Mutex{}

    // 提交不同優先級的事件
    lowEvent := &MarketEvent{
        Type:      "low_priority",
        Priority:  PriorityLow,
        Timestamp: time.Now(),
        Processor: func() error {
            mu.Lock()
            processed = append(processed, "low")
            mu.Unlock()
            return nil
        },
    }

    highEvent := &MarketEvent{
        Type:      "high_priority",
        Priority:  PriorityCritical,
        Timestamp: time.Now(),
        Processor: func() error {
            mu.Lock()
            processed = append(processed, "high")
            mu.Unlock()
            return nil
        },
    }

    pep.SubmitEvent(lowEvent)
    time.Sleep(10 * time.Millisecond)
    pep.SubmitEvent(highEvent)

    time.Sleep(100 * time.Millisecond)

    mu.Lock()
    defer mu.Unlock()

    if len(processed) != 2 {
        t.Fatalf("Expected 2 processed events, got %d", len(processed))
    }

    // 驗證高優先級事件先處理
    if processed[1] != "high" {
        t.Errorf("High priority event should be processed second, got: %v", processed)
    }
}
```

## 步驟 10：部署檢查清單

- [ ] 在測試網測試所有功能
- [ ] 監控事件處理延遲（應 <50ms）
- [ ] 檢查內存使用（不應持續增長）
- [ ] 驗證重平衡觸發合理性
- [ ] 確認降級方案正常工作
- [ ] 查看日誌確認無錯誤
- [ ] 比較新舊版本的收益率

## 常見問題排查

### Q1: 事件處理器報告大量丟棄事件
**原因**：隊列過載
**解決**：增加 `queue_buffer` 或 `worker_count`

### Q2: 重平衡過於頻繁
**原因**：`min_score_for_rebalance` 閾值過低
**解決**：提高閾值到 70-75

### Q3: 訂單簿不同步
**原因**：增量更新錯誤累積
**解決**：定期重新快照（添加定時任務）

### Q4: 內存持續增長
**原因**：歷史數據未限制
**解決**：確認 `maxHistorySize` 配置正確

## 性能調優建議

1. **CPU 密集型場景**：增加 `worker_count` 到 6-8
2. **高消息量場景**：增加 `queue_buffer` 到 1000
3. **低波動市場**：提高 `min_score_for_rebalance` 到 70
4. **高波動市場**：降低 `min_score_for_rebalance` 到 60

---

**集成完成後，您的機器人將具備：**
- ✅ 亞毫秒級事件響應
- ✅ 智能市場機會檢測
- ✅ 高效的訂單簿維護
- ✅ 詳細的性能監控
- ✅ 優雅的降級機制
