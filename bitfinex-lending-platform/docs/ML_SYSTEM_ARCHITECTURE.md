# ML 放貸系統架構文檔

本文檔說明 Bitfinex 放貸機器人的 ML 系統運作原理。

## 系統架構總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        資料流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Bitfinex API │───▶│  特徵工程     │───▶│ XGBoost 模型 │      │
│  │ (FRR 歷史)   │    │ (70個特徵)    │    │ (預測未來FRR)│      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌──────────────┐                      ┌──────────────┐        │
│  │ 當前市場數據  │                      │  ML 訊號      │        │
│  │ - FRR        │                      │ - 風險調整    │        │
│  │ - Order Book │                      │ - 波動調整    │        │
│  │ - BTC 價格   │                      │ - 趨勢調整    │        │
│  └──────────────┘                      └──────────────┘        │
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              Grid Strategy (基礎策略)                │       │
│  │  生成報價: 金額分配 + 利率計算 + 期限設定            │       │
│  └─────────────────────────────────────────────────────┘       │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              ML Strategy Wrapper                     │       │
│  │  調整報價: 利率 × 風險係數, 期限 × 趨勢係數          │       │
│  └─────────────────────────────────────────────────────┘       │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              提交到 Bitfinex                         │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1. 訓練階段

### 資料來源
- **主要**: Bitfinex Funding Candles API（約一年份，6,000+ 條記錄）
- **輔助**: CryptoDataDownload BTC 價格歷史

### 特徵工程（70 個特徵）

| 類別 | 特徵 | 說明 |
|------|------|------|
| **時間特徵** | `hour`, `day_of_week`, `is_weekend`, `month` | 捕捉週期性模式 |
| **週期編碼** | `hour_sin`, `hour_cos`, `dow_sin`, `dow_cos` | 避免時間邊界問題 |
| **滯後特徵** | `frr_lag_1` ~ `frr_lag_168` | 過去 1 小時到 7 天的 FRR |
| **移動平均** | `frr_ma_3`, `frr_ma_6`, ..., `frr_ma_168` | 短中長期趨勢 |
| **標準差** | `frr_std_3`, `frr_std_6`, ..., `frr_std_168` | 波動性測量 |
| **極值** | `frr_min_*`, `frr_max_*` | 區間範圍 |
| **EMA** | `frr_ema_6`, `frr_ema_12`, `frr_ema_24`, `frr_ema_72` | 指數加權趨勢 |
| **動量** | `frr_momentum_6`, `frr_momentum_24`, `frr_momentum_72` | 變化速度 |
| **技術指標** | `rsi_14`, `rsi_24`, `macd`, `macd_signal`, `macd_hist` | 傳統技術分析 |
| **BTC 相關** | `btc_price`, `btc_ma_24`, `btc_pct_change_24`, `btc_volatility_24` | 市場關聯性 |
| **相對位置** | `frr_percentile_24`, `frr_percentile_72` | 當前利率在歷史中的位置 |

### 模型輸出
- **預測目標**: 下一小時的 FRR（日利率）
- **評估指標**: MAE ≈ 2.63% APR

### 訓練命令
```bash
cd ml && python3 train_model.py
cp model_dump.json model_info.json ../internal/ml/models/
```

## 2. 推理階段

### ML 調整因子

#### 風險調整 (Risk Adjustment) → 影響利率
```
ML 訊號           → 調整因子 → 效果
─────────────────────────────────────
AGGRESSIVE_LEND  → 1.3      → 利率 ×1.3（更高報價）
MODERATE_LEND    → 1.1      → 利率 ×1.1
CAUTIOUS         → 0.8      → 利率 ×0.8（更保守）
HOLD             → 0.6      → 利率 ×0.6（大幅降低）
```

#### 波動調整 (Volatility Adjustment)
```
波動狀態              → 調整因子
─────────────────────────────────
LOW_VOLATILITY       → 1.2 (可更激進)
NORMAL               → 1.0
HIGH_VOLATILITY      → 0.8 (縮小範圍)
EXTREME_VOLATILITY   → 0.5 (大幅保守)
```

#### 趨勢調整 (Trend Adjustment) → 影響期限
```
趨勢狀態           → 調整因子 → 效果
─────────────────────────────────────
STRONG_UPTREND    → 1.5      → 期限 ×1.5（鎖定高利率）
WEAK_UPTREND      → 1.2
NEUTRAL           → 1.0
WEAK_DOWNTREND    → 0.8      → 期限 ×0.8（保持靈活）
STRONG_DOWNTREND  → 0.5      → 期限 ×0.5
```

### 決策邏輯
```go
// internal/ml/embedded.go
if predictedRate > currentFRR * 1.05 {
    // 預測利率上升 5%+ → 積極放貸
    signal = "AGGRESSIVE_LEND"
} else if predictedRate < currentFRR * 0.95 {
    // 預測利率下降 5%+ → 保守
    signal = "CAUTIOUS"
}
```

### 實際範例

假設 Grid 策略生成報價：
```
原始報價: $500 @ 15% APR, 7天
```

ML 判斷：預測利率將上升、低波動、強勢上漲趨勢

調整後：
```
利率: 15% × 1.3 (AGGRESSIVE) = 19.5% APR
期限: 7天 × 1.5 (STRONG_UPTREND) = 10天

最終報價: $500 @ 19.5% APR, 10天 [ML-Enhanced]
```

## 3. 關鍵檔案

| 檔案 | 功能 |
|------|------|
| `ml/train_model.py` | XGBoost 模型訓練腳本 |
| `internal/ml/models/model_dump.json` | 訓練好的 XGBoost 模型 |
| `internal/ml/models/model_info.json` | 模型元數據（特徵、指標） |
| `internal/ml/embedded.go` | 嵌入式 XGBoost 推理 |
| `internal/ml/integration.go` | ML 訊號整合器 |
| `internal/strategy/ml_wrapper.go` | 策略 ML 包裝器 |

## 4. FRR 歷史數據收集

### 資料庫結構
```sql
CREATE TABLE frr_history (
    time              TIMESTAMPTZ NOT NULL,
    currency          VARCHAR(10) NOT NULL,
    frr               DOUBLE PRECISION,    -- 日利率（小數）
    frr_daily_pct     DOUBLE PRECISION,    -- 日利率（百分比）
    frr_annual_pct    DOUBLE PRECISION,    -- 年利率 APR
    avg_period        DOUBLE PRECISION,    -- 平均貸款期限
    funding_amount    DOUBLE PRECISION,    -- 總資金量
    funding_amount_used DOUBLE PRECISION,  -- 已借出資金
    PRIMARY KEY (time, currency)
);
```

### 收集服務
- **位置**: `platform/internal/monitoring/frr_service.go`
- **頻率**: 每分鐘更新
- **持久化**: PostgreSQL + Redis 緩存

### ML 用途
這些即時收集的 FRR 數據可用於：
1. **線上特徵計算**: 計算 `frr_lag_*`, `frr_ma_*` 等特徵
2. **模型再訓練**: 定期用新數據更新模型
3. **異常檢測**: 監控利率突變

## 5. 已知限制與改進方向

### 當前限制
⚠️ **嵌入式推理簡化問題** (`internal/ml/embedded.go:346-354`):
```go
// 準備特徵（簡化版本，只使用部分關鍵特徵）
// 完整實現需要計算所有 70 個特徵
features := make([]float64, c.modelInfo.FeatureCount)
features[0] = recentRates[0] // 最近利率
features[1] = currentFRR
```
目前只用了 2 個特徵，沒有計算完整的 70 個特徵！

### 改進方向
1. **完整特徵計算**: 使用 FRR 歷史數據計算所有 70 個特徵
2. **線上學習**: 根據最新數據動態更新模型
3. **多模型融合**: 結合 XGBoost + LSTM 進行預測

## 6. 驗證 ML 運作

### 檢查初始化
```bash
railway logs --service api -n 500 | grep -E "(ML.*init|ML.*enabled|wrapped.*ML)"
```

預期輸出：
```
ML wrapper enabled for strategy (base_strategy="Grid Strategy")
Grid strategy wrapped with ML signal integration
ML client initialized and connected successfully
```

### 檢查決策日誌
```bash
railway logs --service api -n 500 | grep -E "(ML adjustment|rate_change_pct|ML-Enhanced)"
```

預期輸出（當餘額 ≥$150 時）：
```
ML adjustment factors applied (risk_adjust=1.3, volatility_adjust=1.0, trend_adjust=1.2)
ML rate/period adjustment applied to offer (rate_change_pct=30.00%)
Submitted offer: 500.00 @ 19.50% [ML-Enhanced]
```

## 7. Railway 生產環境部署

### 架構圖

```
┌─────────────────┐      gRPC (50051)      ┌─────────────────┐
│   api service   │ ◄───────────────────► │   ml-service    │
│   (Go)          │    Railway Internal    │   (Python)      │
└─────────────────┘                        └────────┬────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │  /data Volume   │
                                           │  - model.json   │
                                           │  - model_info   │
                                           │  - .last_train  │
                                           └─────────────────┘
```

### 服務配置

| 項目 | 值 |
|------|-----|
| 服務名稱 | `ml-service` |
| 內部網路 | `ml-service.railway.internal:50051` |
| Volume 路徑 | `/data` |
| Cron 排程 | `0 4 * * 0` (每週日 04:00 UTC) |

### API 連接設定

在 `api` 服務設定環境變數：
```
ML_ADDRESS=ml-service.railway.internal:50051
```

### 自動訓練邏輯

`ml/start.sh` 在服務啟動時執行：

1. 檢查 `/data/model.json` 是否存在
2. 檢查 `/data/.last_train` 訓練標記
3. 如果超過 7 天未訓練，執行 `train_model.py`
4. 更新訓練標記並啟動 gRPC 服務

詳細操作指南請參考: [ML Service Railway 操作手冊](operations/ML_SERVICE_RAILWAY.md)

## 參考資料

- [XGBoost for Time-Series Forecasting](https://www.analyticsvidhya.com/blog/2024/01/xgboost-for-time-series-forecasting/)
- [Machine Learning Mastery - XGBoost Time Series](https://machinelearningmastery.com/xgboost-for-time-series-forecasting/)
- [Forecasting time series with XGBoost](https://cienciadedatos.net/documentos/py56-forecasting-time-series-with-xgboost)
