# 回測與 ML 系統文檔

本文檔記錄專案中的回測框架和機器學習系統架構。

## 1. 回測框架 (`internal/backtest/`)

### 1.1 核心架構

```
internal/backtest/
├── engine.go       # 事件驅動模擬引擎
├── types.go        # 核心數據結構
├── fill_model.go   # 成交機率模型
├── loader.go       # 數據載入器 (CSV/JSON/Parquet)
├── optimizer.go    # 參數優化器 (Grid Search + 遺傳演算法)
└── reporter.go     # 報告生成器
```

### 1.2 事件驅動引擎 (`engine.go`)

引擎採用事件驅動架構，模擬真實的市場行為：

```go
type Engine struct {
    config    *SimConfig       // 模擬配置
    account   *Account         // 帳戶狀態
    strategy  Strategy         // 策略實例
    fillModel FillModel        // 成交模型
    events    *EventQueue      // 事件優先隊列 (按時間排序)
    metrics   *MetricsCollector // 指標收集器
}
```

**主循環流程**：
```
for each MarketSnapshot (每 5 分鐘):
  1. processEventsUntil(timestamp)  # 處理到期事件
  2. updateLoanInterest()           # 更新利息
  3. checkOfferFills()              # 檢查成交
  4. recordMetrics()                # 記錄指標
  5. if shouldRebalance():          # 重平衡判斷
       executeRebalance()           # 取消舊掛單 + 創建新掛單
```

**事件類型**：
| 類型 | 說明 |
|------|------|
| `EventLoanExpire` | 貸款到期，返還本金+利息 |
| `EventOfferCancel` | 掛單取消/過期 |
| `EventRebalance` | 強制重平衡觸發 |

### 1.3 成交模型 (`fill_model.go`)

```go
type FillModel interface {
    CalculateFillProbability(offer, market) float64  // 0-1
    EstimateFillTime(offer, market) time.Duration
}
```

**SimpleFillModel 成交機率公式**：
```
finalRate = baseFillRate × sdFactor × periodFactor

baseFillRate 基於利率溢價:
  - ≤ 0.95 FRR → 98%
  - ≤ 1.00 FRR → 92%
  - ≤ 1.05 FRR → 70%
  - ≤ 1.10 FRR → 50%
  - ≤ 1.35 FRR → 8%
  - > 1.35 FRR → 3%

sdFactor 基於供需比:
  - < 0.7  → 1.4 (需求 > 供給)
  - > 1.5  → 0.45 (供給過剩)
```

### 1.4 數據載入 (`loader.go`)

支援格式：
- CSV (必須有 `timestamp`, `frr` 欄位)
- JSON / JSON Lines
- Parquet (透過 pandas 轉換)

**合成數據生成**：
```go
loader.GenerateSyntheticData(days int, seed int64) []MarketSnapshot
```
- 基於真實市場特性的隨機數據
- 固定種子確保可重現性

### 1.5 策略接口

```go
type Strategy interface {
    CalculateOffers(balance float64, marketData *client.MarketData) []FundingOffer
    ShouldRebalance(activeOffers map[string]interface{}) bool
    GetName() string
}
```

---

## 2. ML 系統

### 2.1 架構概覽

```
ml/                           # Python ML 服務
├── ml_service.py             # gRPC 服務 (市場分類 + 信號生成)
├── train_model.py            # XGBoost 模型訓練
├── collect_data.py           # 增量數據收集
└── data_cache/               # 歷史數據緩存
    ├── funding_candles_USD_persistent.parquet
    └── btcusd_1h.csv

internal/ml/                  # Go 集成層
├── client.go                 # gRPC 客戶端
└── models/model_dump.json    # 嵌入式模型

internal/strategy/
├── adaptive_ml.go            # ML 增強策略
└── ml_wrapper.go             # ML 包裝器
```

### 2.2 數據收集管道

**數據來源優先級**：
1. Bitfinex Funding Trades API (成交利率)
2. Bitfinex Funding Candles API (1 小時 K 線)
3. Bitfinex Funding Stats API (FRR + 供需)
4. CryptoDataDownload (BTC 價格參考)

**特徵工程 (72 個特徵)**：
- 時間特徵 (10): hour, weekday, sin/cos 編碼
- 滯後特徵 (10): frr_lag_{1,2,3,4,6,12,24,48,72,168}
- 移動平均 (28): 7 窗口 × 4 統計量
- 技術指標 (5): RSI, MACD
- 供需特徵 (3): supply_demand_ratio

### 2.3 自動刷新機制

| 機制 | 時間表 | 位置 |
|------|--------|------|
| 數據收集 | 每小時 (crontab) | `ml/collect_data.py` |
| 參數優化 | 每日 02:00 UTC | `platform/cmd/optimizer/main.go` |
| 市場分析 | 實時 gRPC | `ml/ml_service.py` |
| Redis 緩存 | 5-10 分鐘 TTL | `platform/internal/cache/ml_cache.go` |

**Railway Cron 配置** (`platform/railway-cron.toml`):
```toml
[deploy]
cronSchedule = "0 2 * * *"
startCommand = "./optimizer -currency USD && ./optimizer -currency USDT"
```

### 2.4 模型性能

| 指標 | 值 |
|------|-----|
| MAE | 0.000041 (1.50% APR) |
| R² | 0.352 |
| Top 特徵 | frr_min_3 (30.6%), supply_demand_ratio (20.3%) |

---

## 3. 歷史數據位置

```
ml/data_cache/
├── funding_candles_USD_90d.parquet        # 90 天 FRR K線
├── funding_candles_USD_persistent.parquet # 持久化數據 (自動增量)
└── btcusd_1h.csv                          # BTC 1H K線 (6.2 MB)
```

---

## 4. 使用方式

### 4.1 運行回測

```bash
# 使用合成數據 (7 天，可重現種子)
go build -o backtest ./cmd/backtest/main.go
./backtest -days 7 -seed 42 -balance 10000

# 使用真實數據
./backtest -data ml/data_cache/funding_candles_USD_90d.parquet

# 參數優化
./backtest -optimize -optimize-iterations 50
```

### 4.2 收集新數據

```bash
cd ml
python collect_data.py           # 收集數據
python collect_data.py --train   # 收集並重新訓練
```

### 4.3 啟動 ML 服務

```bash
cd ml
python ml_service.py  # gRPC 服務運行在 :50051
```

---

## 5. CLI 參數參考

| 參數 | 說明 | 默認值 |
|------|------|--------|
| `-data` | CSV/JSON 數據路徑 | (合成數據) |
| `-days` | 合成數據天數 | 30 |
| `-seed` | 隨機種子 | (隨機) |
| `-balance` | 初始餘額 | 10000 |
| `-strategy` | 策略名稱 | grid |
| `-levels` | Grid 層數 | 5 |
| `-format` | 輸出格式 (text/json/csv) | text |
| `-output` | 輸出檔案路徑 | (stdout) |
| `-optimize` | 啟用參數優化 | false |
