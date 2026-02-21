# 開源 Bitfinex Lending Bot 實現、策略與最佳實踐

> 最後更新：2025-12-17
> 來源：GitHub 開源專案研究

## 1. 開源 Lending Bot 實現概覽

### Go 語言實現

#### 1.1 BitfinexLendingBot (eAndrius)
**GitHub**: [eAndrius/BitfinexLendingBot](https://github.com/eAndrius/BitfinexLendingBot)

**特點**:
- 100% Go 實現，無需數據庫
- 支持 USD、BTC、LTC 等多種貨幣
- 配置驅動（JSON 配置文件）
- 支持 cron 或 screen 定時執行
- 個人使用免費

**策略實現**:
- **MarginBot 策略**: 在價格範圍內分散多個訂單，使用 `GapBottom` 和 `GapTop` 參數控制深度，支持特殊 "HighHold" 訂單
- **CascadeBot 策略**: 基於 FRR 相對位置，使用增量（可為負數），每隔 `ReductionIntervalMinutes` 分鐘遞減現有訂單

#### 1.2 bitfinex-auto-lender (askmike)
**GitHub**: [askmike/bitfinex-auto-lender](https://github.com/askmike/bitfinex-auto-lender)

**特點**:
- Go 實現，創建於 2017 年
- 自動放貸所有資金
- FRR 定位策略：確保訂單在訂單簿頂部

---

### Python 語言實現

#### 1.3 MikaLendingBot (BitBotFactory)
**GitHub**: [BitBotFactory/MikaLendingBot](https://github.com/BitBotFactory/MikaLendingBot)

**特點**:
- 支持 Poloniex 和 Bitfinex
- 支持 Docker 部署
- 基於幣種配置不同策略
- 多配置文件支持多賬戶

#### 1.4 bf-lending-bot (cryptic-core)
**GitHub**: [cryptic-core/bf-lending-bot](https://github.com/cryptic-core/bf-lending-bot)

**特點**:
- 動態網格策略優化
- 利率管理和資金分配
- 教育用途（自行承擔風險）

---

### JavaScript/Node.js 實現

#### 1.5 funding-bot (instabot42)
**GitHub**: [instabot42/funding-bot](https://github.com/instabot42/funding-bot)

**特點**:
- Bitfinex API v2 + WebSocket
- 高效率實現
- 支持 webhook 預警（Alertatron、IFTTT、Zapier 集成）

#### 1.6 loan-manager (anders94)
**GitHub**: [anders94/loan-manager](https://github.com/anders94/loan-manager)

**特點**:
- 支持 Bitfinex 和 Poloniex
- Funding wallet = Deposit wallet 概念
- 配置驅動

#### 1.7 官方 Node.JS 庫
**GitHub**: [bitfinexcom/bitfinex-api-node](https://github.com/bitfinexcom/bitfinex-api-node)

**特點**:
- Bitfinex 官方參考實現
- 可作為 lending bot 基礎

---

## 2. 策略算法分析

### 2.1 FRR (Flash Return Rate) 策略

**FRR 概念**:
- 基於所有活躍固定利率放貸的成交量加權平均
- 每小時更新一次
- 不是最優方式，有時利率不夠競爭

**優化策略**:
| 目標 | 策略 | 說明 |
|------|------|------|
| 快速匹配 | FRR 或低固定利率 | 確保資金快速借出 |
| 更高回報 | FRR + 浮動邊際 | +0.002–0.005% |
| 可預測收入 | FRR + 固定差價 | 7–30 天期限 |
| 較低維護 | 完全自動化 | 自動續期 |

### 2.2 動態網格策略 (Dynamic Grid Strategy)

**三階段動態調整流程**:

```
階段 1: adjustRateRange（速率範圍調整）
    ↓
    FRR 基礎範圍：0.5x 至 2.0x FRR
    根據市場條件動態調整
    ↓
階段 2: adjustRateByMarketDepth（市場深度調整）
    ↓
    供需比率調整
    高借入需求 → 提高利率
    低借入需求 → 降低利率
    ↓
階段 3: CalculateOffers（訂單分配）
    ↓
    選擇分佈類型：對數型、指數型、線性型
    將資金分散到多個訂單中
```

**數據流程**:
```
1. WebSocket 接收市場數據 (FRR, 訂單簿, 成交)
2. 策略計算最優訂單 (基於 MarketData)
3. 機器人通過 REST API 提交訂單
4. WebSocket 接收執行確認
5. Web UI 通過內部 WebSocket 實時更新
```

### 2.3 CascadeBot 策略

**工作機制**:
```
起始: FRR + Delta
    ↓
每隔 ReductionIntervalMinutes 分鐘
    ↓
應用指數衰減（可配置乘數）
    ↓
減至最小閾值
```

### 2.4 智能 ML 動態調整

**機器學習方法**:
- 動態調整不依賴固定規則
- 基於短期利率變化進行調整
- 考慮匹配機會和風險偏好
- 從結果中持續學習，逐步改進

**關鍵實現組件**:
1. **數據獲取**: 實時錢包餘額、FRR、訂單簿深度
2. **策略引擎**: 根據目標 APY、風險偏好計算最優利率
3. **自動執行**: 根據市場變化自動調整或續期訂單

---

## 3. WebSocket 重連機制

### 3.1 核心最佳實踐

**重連後必須重新訂閱**:
```go
func onReconnect(ws *WebSocket) {
    // 1. 檢測重連事件（監聽 Info Stream）
    // 2. 進行身份認證
    ws.Authenticate(apiKey, apiSecret)
    // 3. 重新訂閱所有頻道
    ws.SubscribeFundingOffers()
    ws.SubscribeFundingCredits()
}
```

**依賴事件代碼而非文字**:
- 只依賴事件消息代碼（數字）
- 不要依賴文字描述（可能變化）

**心跳監控**:
- WebSocket 伺服器每 15 秒發送一次心跳消息
- 用於檢測連接問題

### 3.2 重連配置建議

```go
config := WebSocketConfig{
    AutoReconnect:     true,
    SeqAudit:          true,
    ReconnectInterval: 10 * time.Second,
    PingTimeout:       120 * time.Second,
}
```

### 3.3 常見斷線問題解決

**症狀**: WebSocket 在數小時後斷開（即使設置 autoReconnect=true）

**解決方案**:
```go
func monitorConnection(ws *WebSocket) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    var lastMessage time.Time

    for {
        select {
        case <-ticker.C:
            if time.Since(lastMessage) > 60*time.Second {
                // 超時，手動重連
                ws.Reconnect()
            }
        case msg := <-ws.Messages:
            lastMessage = time.Now()
            handleMessage(msg)
        }
    }
}
```

---

## 4. 避免重複提交訂單

### 4.1 幂等性密鑰 (Idempotency Key)

**工作流程**:
```
客戶端 生成唯一幂等性密鑰 (UUID/隨機字符串)
     ↓
發送訂單請求 (包含密鑰)
     ↓
伺服器存儲幂等性密鑰 + 訂單數據
     ↓
若收到相同密鑰 → 返回原始結果 (無重複訂單)
```

### 4.2 Redis 基礎重複數據刪除

```go
func submitOffer(ctx context.Context, offer *FundingOffer) error {
    // 構造唯一密鑰
    key := fmt.Sprintf("offer:%s:%f:%f:%d",
        offer.Currency, offer.Amount, offer.Rate, offer.Period)

    // 檢查 Redis
    exists, err := redis.SetNX(ctx, key, "1", 5*time.Minute).Result()
    if err != nil {
        return err
    }
    if !exists {
        return ErrDuplicateOffer
    }

    // 執行訂單
    return client.SubmitOffer(offer)
}
```

### 4.3 狀態管理策略

```go
type OrderTracker struct {
    mu     sync.Mutex
    active map[string]*FundingOffer // offerID -> offer
}

func (t *OrderTracker) CanSubmit(offer *FundingOffer) bool {
    t.mu.Lock()
    defer t.mu.Unlock()

    // 檢查是否已有相同參數的活躍訂單
    for _, existing := range t.active {
        if existing.Currency == offer.Currency &&
           existing.Amount == offer.Amount &&
           existing.Rate == offer.Rate {
            return false
        }
    }
    return true
}
```

---

## 5. 利率計算優化

### 5.1 監測關鍵指標

| 指標 | 說明 | 用途 |
|------|------|------|
| 訂單簿深度 | 借入需求積壓 | 預測利率走勢 |
| 平均利率差異 | 大差異 = 借入需求激增 | 調整策略時機 |
| FRR 趨勢 | FRR 變化方向 | 決定固定/浮動利率 |

### 5.2 利率設置策略

| 陷阱 | 後果 | 解決方案 |
|------|------|----------|
| 利率過低 (0.01%) | 3% 年回報，風險敞口大 | 最低設置 0.03% (10% 年回報) |
| 利率過高 | 無人借，資金閒置 | 監控 FRR，設置競爭性利率 |
| 頻繁切換幣種 | 0.25–0.5% 成本/次 | 僅在利率差異明顯時切換 |

### 5.3 動態利率調整機制

```go
func calculateOptimalRate(frr float64, orderBook *OrderBook) float64 {
    // 基礎利率
    rate := frr

    // 根據供需調整
    supplyDemandRatio := orderBook.TotalAsks / orderBook.TotalBids
    if supplyDemandRatio < 0.5 {
        // 高需求，提高利率
        rate *= 1.2
    } else if supplyDemandRatio > 2.0 {
        // 低需求，降低利率
        rate *= 0.9
    }

    // 邊界檢查
    if rate < minRate {
        rate = minRate
    }
    if rate > maxRate {
        rate = maxRate
    }

    return rate
}
```

### 5.4 資金分割策略

```go
func splitFunds(total float64, count int) []float64 {
    if count <= 1 {
        return []float64{total}
    }

    amounts := make([]float64, count)
    perOffer := total / float64(count)

    for i := 0; i < count; i++ {
        amounts[i] = perOffer
    }

    return amounts
}
```

---

## 6. 風險管理機制

### 6.1 倉位規模調整

**核心公式**:
```
Position = (Account × Risk%) / (Volatility × Stop Distance)
```

**波動率調整**:
- 動態調整交易大小基於波動率指標
- 市場波動期間減少風險敞口

### 6.2 相關性管理

- 減少高度相關資產的聚合倉位
- 防止單一風險因素過度敞口
- 限制主題敞口，明確監控相關性

### 6.3 提取控制機制

```
距最高點下跌 5%  → 每筆交易風險 -25%
距最高點下跌 10-15% → 每筆交易風險 -50% + 僅 A 級設置
距最高點下跌 >15% → 暫停 24-72 小時並審查
```

### 6.4 Bitfinex 特定風險

| 風險 | 說明 | 緩解措施 |
|------|------|----------|
| 借方清算 | 保證金跌至 15% 以下自動清算 | Bitfinex 內建保護 |
| 平台安全 | 2016 年曾遭黑客攻擊 | 只授予最低 API 許可權 |
| 流動性風險 | 無法提前收回資金 | 分散期限，保持流動性 |

### 6.5 費用結構

| 訂單類型 | 費用 |
|----------|------|
| 標準訂單 | 15% 利息 |
| 隱藏訂單 | 18% 利息 |
| 持有 LEO | 最多減免 5% |

---

## 7. 錢包和訂單匹配機制

### 7.1 錢包區分

| 錢包類型 | 用途 |
|----------|------|
| Funding Wallet | 專用於提供 margin funding |
| Margin Wallet | 用於 margin 交易 |
| Exchange Wallet | 現貨交易 |

**轉帳流程**:
```
Exchange/Margin 錢包 --免費轉帳--> Funding 錢包 --> 放貸
```

### 7.2 訂單匹配規則

**匹配條件**:
```
Bid: 尋求 N 天期限
必須匹配 Offer: 期限 ≥ N 天

Rate: 手動設置的日利率
Period: 2–120 天
```

**三種利率選項**:

| 類型 | 說明 |
|------|------|
| 固定利率 | 手動設置特定日利率 |
| FRR | 跟隨市場利率，匹配時鎖定 |
| FRR + 變動 | 隨 FRR 自動上下調整 |
| FRR + Delta | 基於 FRR 加自定義偏移 |

---

## 8. API 速率限制和重試策略

### 8.1 速率限制

| 端點類型 | 限制 |
|----------|------|
| REST API | 10–90 requests/minute |
| WebSocket 認證 | 5 個/15 秒 |
| WebSocket 公開 | 20 個/分鐘 |

### 8.2 指數退避重試策略

```go
func withRetry(fn func() error) error {
    var lastErr error
    baseDelay := time.Second

    for i := 0; i < maxRetries; i++ {
        err := fn()
        if err == nil {
            return nil
        }
        lastErr = err

        // 指數退避 + 抖動
        delay := baseDelay * time.Duration(1<<i)
        jitter := time.Duration(rand.Int63n(int64(delay / 2)))
        time.Sleep(delay + jitter)
    }

    return lastErr
}
```

### 8.3 最佳實踐檢查清單

- [ ] 監控 HTTP 429 (Too Many Requests) 響應
- [ ] 從基礎延遲開始 (如 1 秒)
- [ ] 失敗時延遲翻倍
- [ ] 添加隨機抖動防止同步
- [ ] 設置最大重試次數 (通常 5 次)
- [ ] 設置最大延遲上限 (30–60 秒)

---

## 9. 完整實現檢查清單

### 9.1 核心功能

- [ ] WebSocket 連接帶自動重連
- [ ] 心跳監控 (15 秒)
- [ ] 重新訂閱頻道邏輯
- [ ] 幂等性密鑰實現
- [ ] 狀態管理防重複提交
- [ ] 動態利率計算引擎
- [ ] 資金分割策略
- [ ] 多訂單管理

### 9.2 風險管理

- [ ] 倉位規模動態調整
- [ ] 波動率監測
- [ ] 相關性檢查
- [ ] 提取控制機制
- [ ] 預警系統
- [ ] 緊急暫停機制

### 9.3 API 集成

- [ ] 速率限制處理
- [ ] 指數退避重試
- [ ] Jitter 實現
- [ ] 錯誤處理和日誌
- [ ] 監控和警報

### 9.4 測試和監控

- [ ] 單元測試策略
- [ ] 集成測試
- [ ] 性能基準
- [ ] 實時儀表板
- [ ] 審計日誌

---

## 10. 選擇建議

### 10.1 選擇合適的實現

| 開發者類型 | 推薦專案 | 原因 |
|------------|----------|------|
| Go 開發者 | BitfinexLendingBot (eAndrius) | 架構清晰，支持多策略 |
| Python 開發者 | MikaLendingBot | 成熟，支持多交易所 |
| Node.js 開發者 | funding-bot (instabot42) | WebSocket 高效 |
| 快速開始 | 官方 Bitfinex API 庫 | 官方支持 |

### 10.2 關鍵優化領域

| 領域 | 優化建議 |
|------|----------|
| 利率優化 | 實現動態網格策略、實時監控訂單簿深度 |
| 資金利用 | 分割為多個小訂單、自動續期機制 |
| 風險控制 | 多層倉位限制、波動率調整 |
| 系統穩定 | 強大的 WebSocket 重連、完整的幂等性檢查 |

---

## 11. 參考連結

### GitHub 專案
- [BitfinexLendingBot by eAndrius](https://github.com/eAndrius/BitfinexLendingBot)
- [bitfinex-auto-lender by askmike](https://github.com/askmike/bitfinex-auto-lender)
- [MikaLendingBot by BitBotFactory](https://github.com/BitBotFactory/MikaLendingBot)
- [funding-bot by instabot42](https://github.com/instabot42/funding-bot)
- [loan-manager by anders94](https://github.com/anders94/loan-manager)
- [Bitfinex API Node.js](https://github.com/bitfinexcom/bitfinex-api-node)

### 參考文章
- [Is Bitfinex FRR Lending the Best Choice? - ALTINVEST](https://medium.com/@altinvestbot/is-bitfinex-frr-lending-the-best-choice-a-deep-dive-into-automated-lending-bots-ad42d0c5b3f1)
- [How Bitfinex Matches Lending Funds - ALTINVEST](https://medium.com/@altinvestbot/how-bitfinex-matches-lending-funds-behind-the-scenes-of-the-p2p-funding-market-531e081fc34b)
- [What Makes a Good Bitfinex Lending Bot - ALTINVEST](https://medium.com/@altinvestbot/what-makes-a-good-bitfinex-lending-bot-9e69d5016893)
