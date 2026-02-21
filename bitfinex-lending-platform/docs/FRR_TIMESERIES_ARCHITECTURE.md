# FRR 時間序列存儲架構設計

## 問題背景

當前 FRR (Flash Return Rate) 趨勢圖的數據只存儲在記憶體中，導致：
- 伺服器重啟後數據丟失
- 圖表有時有數據、有時沒有
- 無法提供長期歷史趨勢分析

---

## 重要發現：Bitfinex 已提供 FRR 歷史 API！

### Bitfinex Funding Statistics API

**端點**: `GET https://api-pub.bitfinex.com/v2/funding/stats/{symbol}/hist`

**回應格式**:
| 索引 | 欄位 | 類型 | 說明 |
|------|------|------|------|
| [0] | MTS | int | 毫秒時間戳 |
| [3] | FRR | float | Flash Return Rate (需 ×365 得日利率) |
| [4] | AVG_PERIOD | float | 平均借貸週期 |
| [7] | FUNDING_AMOUNT | float | 總提供資金 |
| [8] | FUNDING_AMOUNT_USED | float | 已使用資金 |

**API 參數**:
| 參數 | 說明 | 限制 |
|------|------|------|
| limit | 回傳筆數 | **最大 250** (官方文檔說 10,000 但實測會 500 錯誤) |
| start | 開始時間戳 (毫秒) | 可選 |
| end | 結束時間戳 (毫秒) | 可選 |
| sort | 排序 (1=升序, -1=降序) | 可選 |

**範例調用**:
```bash
# 獲取 USD 最新 250 筆 FRR 歷史
curl "https://api-pub.bitfinex.com/v2/funding/stats/fUSD/hist?limit=250"

# 獲取 USDT 指定時間範圍
curl "https://api-pub.bitfinex.com/v2/funding/stats/fUST/hist?limit=250&start=1546300800000&end=1548979200000&sort=1"
```

**速率限制**:
- 公開 API: 10-30 req/min
- 建議間隔: 3 秒/請求

### 簡化架構方案 (推薦)

由於 Bitfinex 已提供歷史數據，我們可以採用更簡單的架構：

```
┌─────────────────────────────────────────────────────────────────┐
│                     簡化架構 (推薦)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Flutter App                                                   │
│       │                                                         │
│       ▼                                                         │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │              Platform API                                 │ │
│   │  GET /api/v1/frr/history?currency=USD&period=24h          │ │
│   └─────────────────────────┬─────────────────────────────────┘ │
│                             │                                   │
│              ┌──────────────┴──────────────┐                    │
│              ▼                              ▼                   │
│   ┌───────────────────┐          ┌────────────────────────────┐ │
│   │   Redis Cache     │          │   Bitfinex API             │ │
│   │   (Hot: 1小時)    │          │   /funding/stats/hist      │ │
│   │   TTL: 60秒       │          │   (Cold: 歷史數據)          │ │
│   └───────────────────┘          └────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**優點**:
- 無需自建 TimescaleDB
- 無需維護長期存儲
- 成本接近零
- 實作簡單

**實作方式**:
1. 短期數據 (1小時內): Redis 緩存，60秒 TTL
2. 長期數據 (24h+): 直接調用 Bitfinex API

---

## 完整架構方案 (如需自建數據)

如果需要更精細的數據控制或自定義分析，可採用以下完整架構：

## 推薦架構：Redis Streams + TimescaleDB 混合方案

### 資料層級設計

```
┌─────────────────────────────────────────────────────────────────┐
│                        資料流架構                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Bitfinex WebSocket                                            │
│         │                                                       │
│         ▼                                                       │
│   ┌───────────┐                                                 │
│   │ FRR Data  │ (每秒更新)                                       │
│   └─────┬─────┘                                                 │
│         │                                                       │
│         ▼                                                       │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │              Hot Layer: Redis Streams                     │ │
│   │  • 保留時間: 1 小時                                         │ │
│   │  • 延遲: < 1ms                                             │ │
│   │  • 用途: 即時圖表、最新數據查詢                               │ │
│   │  • Key: frr:stream:{currency}                             │ │
│   └─────────────────────────┬─────────────────────────────────┘ │
│                             │                                   │
│                             ▼ (每分鐘同步)                       │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │            Warm Layer: TimescaleDB Hypertable             │ │
│   │  • 保留時間: 7 天 (原始數據)                                 │ │
│   │  • 延遲: 1-10ms                                            │ │
│   │  • 用途: 日內趨勢分析、歷史查詢                               │ │
│   │  • 表名: frr_history                                       │ │
│   │  • 自動壓縮: 7 天後                                         │ │
│   └─────────────────────────┬─────────────────────────────────┘ │
│                             │                                   │
│                             ▼ (Continuous Aggregates)           │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │            Cold Layer: Aggregated Views                   │ │
│   │  • 保留時間: 90 天                                          │ │
│   │  • 粒度: 1 小時聚合                                         │ │
│   │  • 用途: 長期趨勢、報表分析                                   │ │
│   │  • 視圖: frr_hourly_stats                                  │ │
│   └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1. Hot Layer: Redis Streams

**為什麼選 Redis Streams 而不是 Sorted Sets？**
- Streams 專為時間序列設計，支持消費者群組
- 自動 ID 包含時間戳，天然有序
- 支持範圍查詢和 XTRIM 自動修剪
- 比 Sorted Sets 更節省記憶體

**實作方案：**

```go
// 寫入 FRR 數據到 Redis Stream
func (s *FRRService) WriteFRRToStream(ctx context.Context, currency string, frr float64) error {
    streamKey := fmt.Sprintf("frr:stream:%s", currency)

    _, err := s.redis.XAdd(ctx, &redis.XAddArgs{
        Stream: streamKey,
        MaxLen: 3600,  // 保留最近 1 小時 (假設每秒一條)
        Approx: true,  // 使用 ~3600 近似值，性能更好
        Values: map[string]interface{}{
            "rate":      frr,
            "timestamp": time.Now().Unix(),
        },
    }).Result()

    return err
}

// 讀取最近 N 條 FRR 數據
func (s *FRRService) GetRecentFRR(ctx context.Context, currency string, count int64) ([]FRRPoint, error) {
    streamKey := fmt.Sprintf("frr:stream:%s", currency)

    // XREVRANGE 從最新到最舊
    messages, err := s.redis.XRevRangeN(ctx, streamKey, "+", "-", count).Result()
    if err != nil {
        return nil, err
    }

    points := make([]FRRPoint, 0, len(messages))
    for _, msg := range messages {
        rate, _ := strconv.ParseFloat(msg.Values["rate"].(string), 64)
        ts, _ := strconv.ParseInt(msg.Values["timestamp"].(string), 10, 64)
        points = append(points, FRRPoint{
            Rate:      rate,
            Timestamp: time.Unix(ts, 0),
        })
    }

    return points, nil
}
```

### 2. Warm Layer: TimescaleDB Hypertable

**Schema 設計：**

```sql
-- 啟用 TimescaleDB 擴展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 創建 FRR 歷史表
CREATE TABLE frr_history (
    time        TIMESTAMPTZ NOT NULL,
    currency    VARCHAR(10) NOT NULL,
    rate        DOUBLE PRECISION NOT NULL,
    rate_daily  DOUBLE PRECISION,  -- 日化利率
    rate_annual DOUBLE PRECISION,  -- 年化利率
    source      VARCHAR(20) DEFAULT 'bitfinex'
);

-- 轉換為 Hypertable (按天分區)
SELECT create_hypertable('frr_history', 'time',
    chunk_time_interval => INTERVAL '1 day'
);

-- 創建索引
CREATE INDEX idx_frr_currency_time ON frr_history (currency, time DESC);

-- 設置保留策略 (7 天原始數據)
SELECT add_retention_policy('frr_history', INTERVAL '7 days');

-- 設置壓縮策略 (1 天後壓縮)
ALTER TABLE frr_history SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'currency'
);
SELECT add_compression_policy('frr_history', INTERVAL '1 day');
```

### 3. Cold Layer: Continuous Aggregates

**自動降採樣視圖：**

```sql
-- 創建每小時聚合視圖
CREATE MATERIALIZED VIEW frr_hourly_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    currency,
    AVG(rate) AS avg_rate,
    MIN(rate) AS min_rate,
    MAX(rate) AS max_rate,
    FIRST(rate, time) AS open_rate,
    LAST(rate, time) AS close_rate,
    STDDEV(rate) AS stddev_rate,
    COUNT(*) AS sample_count
FROM frr_history
GROUP BY bucket, currency;

-- 自動刷新策略 (每 30 分鐘刷新)
SELECT add_continuous_aggregate_policy('frr_hourly_stats',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '30 minutes',
    schedule_interval => INTERVAL '30 minutes'
);

-- 設置聚合數據保留策略 (90 天)
SELECT add_retention_policy('frr_hourly_stats', INTERVAL '90 days');
```

### 4. 數據同步服務

```go
// FRR 同步服務 - 將 Redis Streams 數據同步到 TimescaleDB
type FRRSyncService struct {
    redis    *redis.Client
    db       *sql.DB
    logger   *logrus.Logger
    interval time.Duration
}

func (s *FRRSyncService) Start(ctx context.Context) {
    ticker := time.NewTicker(s.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            s.syncToTimescale(ctx)
        }
    }
}

func (s *FRRSyncService) syncToTimescale(ctx context.Context) error {
    currencies := []string{"USD", "USDT"}

    for _, currency := range currencies {
        streamKey := fmt.Sprintf("frr:stream:%s", currency)
        lastID := s.getLastSyncedID(currency)

        // 讀取自上次同步以來的新數據
        messages, err := s.redis.XRange(ctx, streamKey, lastID, "+").Result()
        if err != nil {
            s.logger.WithError(err).Error("Failed to read from Redis Stream")
            continue
        }

        if len(messages) == 0 {
            continue
        }

        // 批量插入到 TimescaleDB
        tx, _ := s.db.BeginTx(ctx, nil)
        stmt, _ := tx.PrepareContext(ctx, `
            INSERT INTO frr_history (time, currency, rate, rate_daily, rate_annual)
            VALUES ($1, $2, $3, $4, $5)
        `)

        for _, msg := range messages {
            rate, _ := strconv.ParseFloat(msg.Values["rate"].(string), 64)
            ts, _ := strconv.ParseInt(msg.Values["timestamp"].(string), 10, 64)

            stmt.ExecContext(ctx,
                time.Unix(ts, 0),
                currency,
                rate,
                rate * 100,        // 日化利率
                rate * 100 * 365,  // 年化利率
            )
        }

        tx.Commit()
        s.updateLastSyncedID(currency, messages[len(messages)-1].ID)
    }

    return nil
}
```

### API 端點設計

```go
// GET /api/v1/frr/history?currency=USD&period=1h
// GET /api/v1/frr/history?currency=USD&period=24h
// GET /api/v1/frr/history?currency=USD&period=7d
// GET /api/v1/frr/history?currency=USD&period=30d

func (h *FRRHandler) GetFRRHistory(w http.ResponseWriter, r *http.Request) {
    currency := r.URL.Query().Get("currency")
    period := r.URL.Query().Get("period")

    var data []FRRPoint
    var err error

    switch period {
    case "1h":
        // 從 Redis Streams 讀取 (最快)
        data, err = h.service.GetRecentFRR(r.Context(), currency, 3600)
    case "24h":
        // 從 TimescaleDB 原始數據讀取
        data, err = h.service.GetFRRFromDB(r.Context(), currency, 24*time.Hour)
    case "7d", "30d", "90d":
        // 從 Continuous Aggregates 讀取 (聚合數據)
        data, err = h.service.GetFRRAggregated(r.Context(), currency, period)
    }

    // ...
}
```

## 實施路線圖

### Phase 1: 快速修復 (已完成)
- [x] 在 main.go 中啟動 `StartPeriodicUpdate()`
- [x] 每分鐘更新 FRR 數據到記憶體

### Phase 2: Redis Streams 整合 (建議優先)
- [ ] 修改 `FRRService` 使用 Redis Streams 存儲
- [ ] 實作 `XTRIM` 自動清理舊數據
- [ ] 更新 API 從 Redis Streams 讀取

### Phase 3: TimescaleDB 整合
- [ ] 添加 TimescaleDB 到 Railway
- [ ] 創建 `frr_history` Hypertable
- [ ] 實作數據同步服務

### Phase 4: 長期優化
- [ ] 創建 Continuous Aggregates
- [ ] 設置壓縮和保留策略
- [ ] 添加 Grafana 監控面板

## 成本估算

| 組件 | Railway 方案 | 預估費用/月 |
|------|-------------|------------|
| Redis | Starter | $5 |
| TimescaleDB | PostgreSQL + Extension | $10-20 |
| 總計 | | ~$15-25 |

## 替代方案比較

| 方案 | 優點 | 缺點 |
|------|------|------|
| Redis Streams Only | 簡單、快速 | 長期存儲成本高 |
| PostgreSQL Only | 成本低 | 查詢性能較差 |
| TimescaleDB Only | 功能完整 | 即時查詢延遲較高 |
| **混合方案 (推薦)** | 兼顧性能和成本 | 複雜度較高 |
| InfluxDB | 專業時間序列 | 額外服務成本 |

---

## 競品分析：FRR/利率圖表功能比較

### 主要競品一覽

| 競品 | 類型 | FRR/利率圖表 | 歷史數據 | 價格 |
|------|------|-------------|---------|------|
| **Bitfinex Lending Pro** | 官方工具 | ❌ 無 | ❌ 無 | 免費 |
| **CryptoLend.net** | 付費 Bot | ✅ 有 (30-150天) | ✅ 有 | 3% 利潤抽成 |
| **Coinlend.org** | 免費 Bot | ❌ 無 | ❌ 無 | $8/月 或 5% 抽成 |
| **EarnUSD** | 付費 Bot | ✅ 有 (付費功能) | ✅ 有 | $3/月 + 0% 抽成 |
| **Altinvest** | 付費 Bot | ❓ 不明 | ❓ 不明 | $3/月 + 3% 抽成 |
| **CoinGlass** | 數據平台 | ✅ 有 (永續合約) | ✅ 有 | 免費 |

### 詳細功能分析

#### 1. Bitfinex Lending Pro (官方)
- **優點**: 免費、官方整合、自動化借貸
- **缺點**: 無利率圖表、無歷史數據視覺化、功能較基礎
- **FRR 圖表**: ❌ 無

#### 2. CryptoLend.net
- **優點**: 運營最久 (2014年起)、$380M+ AUM、多種策略
- **利率圖表**: ✅ 有「Historical Lending Rates」頁面
  - 支持 30/60/90/120/150 天歷史
  - 可切換日利率/年化利率顯示
  - 支持 USD/ETH/BTC 等幣種
- **策略功能**: Spread Durations、Adaptive Min Rate、Iceberg、Auto-Boost 等
- **價格**: 3% 利潤抽成

#### 3. Coinlend.org
- **優點**: 有 iOS/Android App、AI 優化算法
- **缺點**: 無公開的利率歷史圖表
- **FRR 圖表**: ❌ 無 (或僅限 App 內)
- **價格**: $8/月 或 5% 抽成

#### 4. EarnUSD (台灣)
- **優點**: 最便宜 ($3/月 + 0% 抽成)、執行速度快 (5分鐘)
- **利率圖表**: ✅ 有「Lending Rates」頁面
  - 過去一年 USD/USDT/BTC 日均利率
  - 扣除手續費後的實際收益
  - **但需付費訂閱才能查看**
- **獨特功能**: Long/Short Period Ratio、BTC DCA
- **價格**: $3/月 + 0% 抽成

#### 5. CoinGlass (數據平台)
- **類型**: 市場數據平台 (非借貸 Bot)
- **功能**: 永續合約 Funding Rate 圖表
- **注意**: 這是期貨 Funding Rate，非 Bitfinex Margin Lending FRR
- **參考價值**: 視覺化設計可參考

### 競品 FRR 圖表功能總結

| 功能 | CryptoLend | EarnUSD | 我們目標 |
|------|-----------|---------|---------|
| 即時 FRR | ✅ | ✅ | ✅ |
| 24小時歷史 | ✅ | ✅ | ✅ |
| 7天歷史 | ✅ | ✅ | ✅ |
| 30天歷史 | ✅ | ✅ | ✅ |
| 90天歷史 | ✅ | ❓ | ✅ (Phase 2) |
| 多幣種比較 | ✅ | ✅ | ✅ |
| 日/年化切換 | ✅ | ✅ | ✅ |
| 免費查看 | ✅ | ❌ (需訂閱) | ✅ |
| API 數據 | ❌ | ❌ | ✅ |

### 我們的差異化優勢

1. **免費公開**: 不像 EarnUSD 需要訂閱才能看歷史圖表
2. **API 支持**: 提供 REST API 讓進階用戶整合
3. **即時更新**: 利用 Bitfinex WebSocket 實現秒級更新
4. **多時間範圍**: 1h/24h/7d/30d/90d 完整覆蓋
5. **技術指標**: 可加入 MA、標準差等分析工具

### 實作優先級建議

#### MVP (Phase 1) - 趕上競品
- [ ] 整合 Bitfinex `/funding/stats/hist` API
- [ ] Redis 緩存即時數據 (1小時)
- [ ] Flutter 圖表組件 (fl_chart)
- [ ] 支持 1h/24h/7d 時間範圍

#### 進階 (Phase 2) - 超越競品
- [ ] 30天/90天歷史 (TimescaleDB)
- [ ] 多幣種比較視圖
- [ ] 利率異動推播通知
- [ ] 技術指標疊加 (MA、Bollinger Bands)

#### 差異化 (Phase 3)
- [ ] 公開 API 端點
- [ ] 利率預測模型
- [ ] 與交易量/市場情緒關聯分析

---

## 參考資料

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Redis Streams](https://redis.io/docs/data-types/streams/)
- [Time Series Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/schema-management/best-practices/)
- [Bitfinex Funding Statistics API](https://docs.bitfinex.com/reference/rest-public-funding-stats)
- [CryptoLend.net](https://cryptolend.net/) - 競品參考
- [EarnUSD](https://earn-usd.com/) - 競品參考
- [CoinGlass Funding Rates](https://www.coinglass.com/FundingRate) - 視覺化參考
