# ML 系統改進計劃

基於深度代碼分析和業界最佳實踐研究，本文檔詳細說明 Bitfinex 放貸機器人 ML 系統的改進方案。

---

## 執行摘要

### 當前狀態
| 項目 | 狀態 | 問題 |
|------|------|------|
| 嵌入式推理 | ⚠️ 簡化版 | 只用 2/70 個特徵 |
| 模型質量 | 🔴 差 | R² = -0.15（比隨機猜測更差）|
| 技術指標 | ✅ 完成 | 未連接到 ML |
| FRR 數據收集 | ✅ 運作中 | 未自動用於訓練 |
| 可見性 | ❌ 缺失 | 無法驗證 ML 效果 |

### 預期改進效果
- 模型 R² 從 -0.15 提升到 0.3+
- 完整特徵推理，提高預測準確度
- 建立持續學習管道，模型自動更新
- 可量化的 ML 投資回報

---

## 問題 1：嵌入式推理特徵不完整

### 問題描述
```go
// internal/ml/embedded.go:346-359
// 當前只用 2 個特徵
features[0] = recentRates[0]  // 最近利率
features[1] = currentFRR      // 當前 FRR
// 其他 68 個特徵 = 0（未計算）
```

訓練用 70 個特徵，推理只用 2 個，導致模型無法正確預測。

### 解決方案：實時特徵計算器

#### 架構設計
```
┌─────────────────────────────────────────────────────────────┐
│                   Feature Store 架構                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ PostgreSQL  │    │   Redis     │    │  Go Runtime │     │
│  │ (離線存儲)   │───▶│ (線上緩存)   │───▶│ (特徵計算)   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│        │                  │                  │              │
│        ▼                  ▼                  ▼              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              FeatureCalculator                       │   │
│  │  ├─ GetTimeFeatures()      // 時間週期特徵           │   │
│  │  ├─ GetLagFeatures()       // 滯後特徵 (需歷史)      │   │
│  │  ├─ GetStatFeatures()      // 統計特徵 (MA, STD)     │   │
│  │  ├─ GetTechnicalFeatures() // RSI, MACD              │   │
│  │  └─ GetBTCFeatures()       // BTC 價格相關           │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              XGBoost 推理 (70 特徵)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 實現步驟

**Phase 1: 核心特徵計算器** (預計 2-3 天)

建立 `internal/ml/features.go`:
```go
type FeatureCalculator struct {
    frrHistory    []FRRDataPoint  // 最近 168 小時 FRR
    btcHistory    []float64       // BTC 價格歷史
    redisClient   *redis.Client   // 快速讀取
    dbRepo        *FRRHistoryRepository  // 持久化讀取
}

// 計算完整 70 個特徵
func (fc *FeatureCalculator) Calculate(currentFRR float64) []float64 {
    features := make([]float64, 70)

    // 1. 時間特徵 (6個)
    fc.fillTimeFeatures(features, 0)

    // 2. 滯後特徵 (10個): lag_1, lag_2, ..., lag_168
    fc.fillLagFeatures(features, 6)

    // 3. 統計特徵 (32個): ma, std, min, max for各窗口
    fc.fillStatFeatures(features, 16)

    // 4. EMA + 動量 (10個)
    fc.fillMomentumFeatures(features, 48)

    // 5. 技術指標 (5個): RSI, MACD
    fc.fillTechnicalFeatures(features, 58)

    // 6. 相對位置 + 波動率 (4個)
    fc.fillPositionFeatures(features, 63)

    // 7. BTC 相關 (4個)
    fc.fillBTCFeatures(features, 67)

    return features
}
```

**Phase 2: 數據管道** (預計 1-2 天)

連接現有 FRRService 到特徵計算器:
```go
// platform/internal/monitoring/frr_service.go 已有:
// - FRR 實時更新
// - PostgreSQL 持久化
// - Redis 緩存

// 新增: 特徵預計算任務
func (s *FRRService) PrecomputeFeatures() {
    // 每分鐘計算並緩存特徵向量
    features := s.featureCalc.Calculate(currentFRR)
    s.redis.Set("ml:features:USD", features, 1*time.Minute)
}
```

**Phase 3: 整合到推理** (預計 1 天)

修改 `embedded.go`:
```go
func (c *EmbeddedClient) adjustSignalWithModel(...) {
    // 從緩存獲取預計算特徵
    features := c.featureStore.GetFeatures(currency)

    // 或即時計算
    if features == nil {
        features = c.featureCalc.Calculate(currentFRR)
    }

    // 使用完整 70 個特徵進行預測
    predictions, err := c.model.PredictRegression(features, 0)
    // ...
}
```

---

## 問題 2：模型質量差 (R² = -0.15)

### 問題分析

負 R² 表示模型比簡單平均值預測還差，可能原因：
1. **過擬合**: 訓練集 R² 高，測試集 R² 負
2. **特徵工程問題**: 特徵未標準化、有噪音
3. **目標變量問題**: FRR 波動大、難以預測
4. **數據質量**: 異常值、缺失值處理不當

### 解決方案

#### 2.1 數據清洗 (Phase 1)

修改 `ml/train_model.py`:
```python
# 1. 移除異常值
df = df[df['frr_annual_pct'] < 300]  # 移除 >300% APR 異常

# 2. 檢查數據質量
print(f"Missing values: {df.isnull().sum()}")
print(f"FRR range: {df['frr'].min():.4f} - {df['frr'].max():.4f}")

# 3. 滾動窗口標準化 (避免未來信息洩漏)
df['frr_zscore'] = (df['frr'] - df['frr'].rolling(168).mean()) / df['frr'].rolling(168).std()
```

#### 2.2 特徵選擇 (Phase 2)

減少特徵數量，只保留重要特徵:
```python
# 當前 Top 15 重要特徵 (佔 80%+ 重要性)
important_features = [
    'frr_std_6',      # 15.99%
    'frr_lag_6',      # 13.92%
    'frr_ma_3',       # 7.83%
    'btc_price',      # 7.12%
    'hour_cos',       # 6.20%
    'frr_ema_6',      # 5.24%
    'frr_max_3',      # 4.47%
    'volatility_72',  # 4.19%
    'hour_sin',       # 4.07%
    'frr_lag_48',     # 3.80%
]

# 使用 Top 20 特徵重新訓練
X_selected = X[important_features[:20]]
```

#### 2.3 模型調參 (Phase 3)

參考 [XGBoost 調參指南](https://xgboost.readthedocs.io/en/stable/tutorials/param_tuning.html):

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'max_depth': [3, 5, 7],           # 降低複雜度
    'learning_rate': [0.01, 0.05, 0.1],
    'n_estimators': [100, 200, 300],
    'subsample': [0.7, 0.8, 0.9],     # 隨機採樣防過擬合
    'colsample_bytree': [0.7, 0.8, 0.9],
    'reg_alpha': [0, 0.1, 1],         # L1 正則化
    'reg_lambda': [0.1, 1, 10],       # L2 正則化
}

# 使用時間序列交叉驗證
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)

grid_search = GridSearchCV(
    XGBRegressor(objective='reg:squarederror', early_stopping_rounds=20),
    param_grid,
    cv=tscv,
    scoring='r2',
    verbose=2
)
```

#### 2.4 改變預測目標 (Phase 4)

預測「方向」而非「絕對值」可能更實用:
```python
# 方案 A: 預測漲跌方向 (分類問題)
df['target_direction'] = (df['frr'].shift(-1) > df['frr']).astype(int)

# 方案 B: 預測變化幅度區間
df['target_bucket'] = pd.cut(
    df['frr'].pct_change().shift(-1),
    bins=[-np.inf, -0.05, -0.01, 0.01, 0.05, np.inf],
    labels=['大跌', '小跌', '持平', '小漲', '大漲']
)

# 方案 C: 預測是否高於 FRR 移動平均
df['target_above_ma'] = (df['frr'].shift(-1) > df['frr_ma_24']).astype(int)
```

---

## 問題 3：技術指標未連接到 ML

### 現狀
`internal/strategy/indicators.go` 已實現 20+ 指標，但未傳遞給 ML。

### 解決方案：指標橋接

```go
// internal/ml/indicator_bridge.go

type IndicatorBridge struct {
    indicators *strategy.TechnicalIndicators
}

// 將策略指標轉換為 ML 特徵
func (b *IndicatorBridge) ToFeatures() map[string]float64 {
    return map[string]float64{
        // 訂單簿指標
        "orderbook_imbalance": b.indicators.OrderBookImbalance,
        "bid_depth":           b.indicators.BidDepth,
        "ask_depth":           b.indicators.AskDepth,

        // 供需指標
        "supply_pressure":     b.indicators.SupplyPressure,
        "demand_pressure":     b.indicators.DemandPressure,

        // 已有的技術指標
        "frr_momentum":        b.indicators.FRR_Momentum,
        "bullish_score":       b.indicators.BullishScore,
        "bearish_score":       b.indicators.BearishScore,
    }
}
```

---

## 問題 4：缺乏持續學習管道

### 解決方案：自動化訓練管道

#### 架構
```
┌─────────────────────────────────────────────────────────────┐
│                   持續學習管道                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ PostgreSQL  │    │ 數據導出     │    │ 模型訓練     │     │
│  │ frr_history │───▶│ (每週一次)   │───▶│ train.py    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                              │              │
│                                              ▼              │
│                     ┌─────────────────────────────────┐    │
│                     │         模型評估                 │    │
│                     │  if R² > threshold:             │    │
│                     │    deploy_new_model()           │    │
│                     │  else:                          │    │
│                     │    alert_and_keep_old()         │    │
│                     └─────────────────────────────────┘    │
│                                              │              │
│                                              ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ GitHub      │◀───│ 模型文件     │◀───│ 模型驗證     │     │
│  │ (版本控制)   │    │ model.json  │    │ (回測驗證)   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 實現：GitHub Actions 自動訓練

`.github/workflows/ml-retrain.yml`:
```yaml
name: Weekly ML Model Retrain

on:
  schedule:
    - cron: '0 0 * * 0'  # 每週日
  workflow_dispatch:  # 手動觸發

jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Export FRR data from Railway PostgreSQL
        env:
          DATABASE_URL: ${{ secrets.RAILWAY_DATABASE_URL }}
        run: |
          python ml/export_data.py --output ml/data_cache/

      - name: Train model
        run: |
          cd ml && python train_model.py

      - name: Evaluate model
        run: |
          python ml/evaluate.py --threshold 0.1

      - name: Deploy if improved
        if: success()
        run: |
          cp ml/model_dump.json internal/ml/models/
          cp ml/model_info.json internal/ml/models/
          git add internal/ml/models/
          git commit -m "chore: auto-update ML model $(date +%Y-%m-%d)"
          git push
```

---

## 問題 5：缺乏 ML 效果驗證

### 解決方案：AB 測試 + 可見性

#### 5.1 ML 決策日誌強化

修改 `internal/strategy/ml_wrapper.go`:
```go
func (w *MLStrategyWrapper) applyMLAdjustments(...) {
    // 詳細日誌
    w.logger.WithFields(logrus.Fields{
        "original_rate":     originalRate,
        "predicted_rate":    predictedRate,
        "ml_signal":         signal.Signal,
        "ml_confidence":     signal.Confidence,
        "risk_adjust":       riskAdjust,
        "volatility_adjust": volatilityAdjust,
        "trend_adjust":      trendAdjust,
        "final_rate":        adjustedRate,
        "rate_change_pct":   (adjustedRate/originalRate - 1) * 100,
    }).Info("ML adjustment applied")
}
```

#### 5.2 效果追蹤 Dashboard

新增 Redis 指標:
```go
// ML 效果追蹤
type MLPerformanceMetrics struct {
    // 預測準確度
    PredictedUp      int     // 預測上漲次數
    ActualUp         int     // 實際上漲次數
    DirectionAccuracy float64 // 方向準確率

    // 收益影響
    MLAdjustedOffers int     // ML 調整的報價數
    MLFilledOffers   int     // ML 調整後成交的報價
    MLFillRate       float64 // ML 報價成交率

    // 對比基準
    AvgRateWithML    float64 // ML 啟用時平均利率
    AvgRateWithoutML float64 // ML 關閉時平均利率 (歷史)
}
```

#### 5.3 AB 測試框架

```go
// 簡易 AB 測試：隨機啟用/關閉 ML
type ABTestManager struct {
    enabledRatio float64  // ML 啟用比例 (0.0-1.0)
    results      map[string]*ABTestResult
}

func (m *ABTestManager) ShouldUseML() bool {
    return rand.Float64() < m.enabledRatio
}

func (m *ABTestManager) RecordResult(usedML bool, filled bool, rate float64) {
    group := "control"
    if usedML {
        group = "treatment"
    }
    m.results[group].Record(filled, rate)
}
```

---

## 實施優先級

### P0 - 立即修復（1-2 週）

| 任務 | 預計時間 | 影響 |
|------|----------|------|
| 1. 修復 R² = -0.15（數據清洗 + 調參）| 2-3 天 | 模型基本可用 |
| 2. 實現 Top 20 特徵計算器 | 2-3 天 | 推理準確度提升 |
| 3. 連接特徵計算器到嵌入式推理 | 1 天 | 完整特徵推理 |

### P1 - 功能完善（2-4 週）

| 任務 | 預計時間 | 影響 |
|------|----------|------|
| 4. 連接 indicators.go 到 ML | 2 天 | 更多市場信號 |
| 5. 改變預測目標（方向預測）| 2-3 天 | 更實用的預測 |
| 6. 實現 ML 效果日誌 | 1 天 | 可驗證效果 |
| 7. 建立 Redis Feature Store | 3-4 天 | 低延遲特徵 |

### P2 - 長期優化（1-2 月）

| 任務 | 預計時間 | 影響 |
|------|----------|------|
| 8. 自動化訓練管道 | 1 週 | 持續改進 |
| 9. AB 測試框架 | 3-4 天 | 量化 ML ROI |
| 10. 混合模型（XGBoost + LSTM）| 2-3 週 | 更強預測能力 |
| 11. Flutter ML Dashboard | 1 週 | 用戶可見性 |

---

## 成功指標

| 指標 | 當前 | 目標（P0）| 目標（P1）|
|------|------|----------|----------|
| 模型 R² | -0.15 | > 0.1 | > 0.3 |
| 推理特徵數 | 2/70 | 20/70 | 70/70 |
| 方向預測準確率 | N/A | > 55% | > 60% |
| ML 調整可見性 | 無 | 日誌級 | Dashboard |
| 模型更新頻率 | 手動 | 每月 | 每週 |

---

## 參考資料

### Feature Store 架構
- [Redis Feature Stores](https://redis.io/solutions/feature-stores/)
- [AWS ElastiCache Feature Store](https://aws.amazon.com/blogs/database/build-an-ultra-low-latency-online-feature-store-for-real-time-inferencing-using-amazon-elasticache-for-redis/)
- [DoorDash Feature Store](https://doordash.engineering/2020/11/19/building-a-gigascale-ml-feature-store-with-redis/)

### XGBoost 最佳實踐
- [XGBoost 調參指南](https://xgboost.readthedocs.io/en/stable/tutorials/param_tuning.html)
- [Early Stopping 防過擬合](https://machinelearningmastery.com/avoid-overfitting-by-early-stopping-with-xgboost-in-python/)
- [XGBoost 特徵工程](https://www.geeksforgeeks.org/machine-learning/feature-engineering-for-xgboost-models/)

### 金融時間序列
- [Deep Learning for Financial Forecasting](https://www.sciencedirect.com/science/article/pii/S1059056025008822)
- [XGBoost Time Series](https://www.analyticsvidhya.com/blog/2024/01/xgboost-for-time-series-forecasting/)
- [P2P Lending Credit Risk](https://www.tandfonline.com/doi/full/10.1080/08839514.2024.2358661)
