# ML 系統完整重建計畫

> **整合分析來源**: Claude Opus 4.5 + Gemini 3 Pro + OpenAI Codex GPT-5.2
> **最後更新**: 2025-12-25

---

## 執行摘要

本計畫旨在解決 Bitfinex 放貸機器人 ML 系統的根本問題：**訓練-推理特徵不一致 (Training-Serving Skew)**。

### 問題診斷 (三方 AI 一致認同)

| 問題 | 影響 | 根本原因 |
|------|------|----------|
| 推理只用 2/70 特徵 | 模型輸出無效 | `embedded.go` 硬編碼 |
| 特徵位置錯誤 | 語義完全錯位 | index 0 應是 btc_price，實際填入 recentRates[0] |
| R² = -0.15 | 比隨機猜測還差 | 上述兩個問題導致 |
| 回歸目標不適合 | FRR 絕對值難預測 | 應改為方向分類 |

### 解決方案核心理念

**「邏輯解耦，數據同源」** — Gemini

訓練與推理必須使用**完全相同的特徵定義**，只是數據源不同。

---

## 系統架構設計

### 總體架構圖 (Gemini 設計)

```
┌───────────────────────────────────────────────────────────────────────┐
│                       OFFLINE LAYER (Training)                        │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [PostgreSQL]              [Feature Spec]           [Model Registry]  │
│  (Offline Store)     ────▶  (spec.yaml)  ────▶     (model_v2.json)   │
│       │                         │                        │            │
│       ▼                         ▼                        ▼            │
│  [Python Training Pipeline]                                           │
│  ├── 1. Load Historical FRR Data                                      │
│  ├── 2. Feature Calc (Shared Spec)  ◀─────────────────────────────┐  │
│  ├── 3. Labeling (6h Horizon, ±5%)                                │  │
│  └── 4. Train XGBoost Classifier                                  │  │
│                                                                   │  │
└───────────────────────────────────────────────────────────────────│──┘
                                                                    │
    ════════════════════════════════════════════════════════════════│═══
                                                                    │
┌───────────────────────────────────────────────────────────────────│──┐
│                       ONLINE LAYER (Inference)                    │  │
├───────────────────────────────────────────────────────────────────│──┤
│                                                                   │  │
│  [Bitfinex WebSocket] ──▶ [Go Data Collector] ──▶ [Redis Pub/Sub] │  │
│                                   │                               │  │
│                                   ▼                               │  │
│                      [Feature Processor Service]                  │  │
│                      (Go Worker, Uses SAME Spec) ◀────────────────┘  │
│                                   │                                   │
│                                   ▼                                   │
│                         [Redis KV Store]                              │
│                         Key: "ml:features:latest"                     │
│                         Value: {feature_vector}                       │
│                                   │                                   │
└───────────────────────────────────│───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       LENDING BOT (Go Core)                           │
├───────────────────────────────────────────────────────────────────────┤
│  [Strategy Loop]                                                      │
│      │                                                                │
│      ├──▶ 1. Fetch Features from Redis (<5ms)                         │
│      ├──▶ 2. XGBoost Inference (leaves lib) (<10ms)                   │
│      ├──▶ 3. Get Prediction: UP / DOWN / NEUTRAL                      │
│      └──▶ 4. Adjust Lending Strategy                                  │
│                                                                       │
│  [Total Latency: <20ms, well under 100ms requirement]                 │
└───────────────────────────────────────────────────────────────────────┘
```

### 特徵規格驅動設計 (Codex 設計)

```yaml
# ml/features/spec.yaml
version: "2.0.0"
prediction_target: "direction"  # UP / DOWN / NEUTRAL
prediction_horizon: "6h"
threshold: 0.05  # ±5%

feature_names:  # 固定順序，Top 15
  - frr_std_6
  - frr_lag_6
  - frr_ma_3
  - btc_price
  - hour_cos
  - frr_ema_6
  - frr_max_3
  - volatility_72
  - hour_sin
  - frr_lag_48
  - frr_max_48
  - frr_lag_2
  - frr_percentile_72
  - frr_std_3
  - frr_ema_12

feature_definitions:
  frr_std_6:
    type: rolling_std
    window: 6
    input: frr
  frr_lag_6:
    type: lag
    periods: 6
    input: frr
  frr_ma_3:
    type: rolling_mean
    window: 3
    input: frr
  btc_price:
    type: external
    source: btc_ticker
  hour_cos:
    type: cyclic
    formula: "cos(2 * pi * hour / 24)"
  hour_sin:
    type: cyclic
    formula: "sin(2 * pi * hour / 24)"
  frr_ema_6:
    type: ema
    span: 6
    input: frr
  frr_max_3:
    type: rolling_max
    window: 3
    input: frr
  volatility_72:
    type: rolling_std
    window: 72
    input: frr
  frr_lag_48:
    type: lag
    periods: 48
    input: frr
  frr_max_48:
    type: rolling_max
    window: 48
    input: frr
  frr_lag_2:
    type: lag
    periods: 2
    input: frr
  frr_percentile_72:
    type: percentile_rank
    window: 72
    input: frr
  frr_std_3:
    type: rolling_std
    window: 3
    input: frr
  frr_ema_12:
    type: ema
    span: 12
    input: frr

missing_value_handling: forward_fill
normalization: none  # XGBoost 不需要標準化
```

---

## 實施階段

### Phase 0: 影子模式準備 (1 天)

**目標**: 禁用失效的 XGBoost 預測，純依賴統計分類

```go
// internal/ml/embedded.go 修改
func (c *EmbeddedClient) GetRatePrediction(...) (*RatePrediction, error) {
    // 暫時禁用 XGBoost 預測
    // 純依賴 ClassifyMarketRegime（統計分類，已驗證有效）

    regime, err := c.ClassifyMarketRegime(currency, currentFRR, recentRates)
    if err != nil {
        return nil, err
    }

    // 基於 regime 生成預測
    return &RatePrediction{
        Signal:     regime.TrendRegime,  // 使用趨勢分類
        Confidence: regime.TrendConfidence,
        Source:     "statistical",  // 標記來源
    }, nil
}
```

**交付物**:
- [x] embedded.go 禁用 XGBoost
- [x] 部署到 Railway 驗證
- [x] 確認統計分類正常運作

---

### Phase 1: 特徵規格與訓練 (3 天)

#### 1.1 建立特徵規格 (Day 1)

```
ml/
├── features/
│   ├── spec.yaml           # 特徵定義（見上）
│   ├── registry.py         # 特徵計算函數註冊
│   ├── builder.py          # 特徵向量生成器
│   └── validators.py       # 驗證函數
├── train_classifier.py     # 新的分類模型訓練腳本
└── tests/
    └── test_feature_parity.py  # Python/Go 一致性測試
```

#### 1.2 訓練分類模型 (Day 2-3)

```python
# ml/train_classifier.py

import xgboost as xgb
from features.builder import build_features
from features.spec import load_spec

def create_labels(df, horizon=6, threshold=0.05):
    """
    創建 3 類標籤
    - 0: DOWN (< -5%)
    - 1: NEUTRAL (-5% ~ +5%)
    - 2: UP (> +5%)
    """
    future_frr = df['frr'].shift(-horizon)
    pct_change = (future_frr - df['frr']) / df['frr']

    labels = pd.Series(1, index=df.index)  # Default: NEUTRAL
    labels[pct_change > threshold] = 2      # UP
    labels[pct_change < -threshold] = 0     # DOWN

    return labels

def train_classifier(df, spec):
    X = build_features(df, spec)
    y = create_labels(df)

    # 時間序列分割（避免 leakage）
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]

    model = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=3,
        max_depth=5,          # 降低複雜度
        learning_rate=0.05,
        n_estimators=150,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        early_stopping_rounds=20,
        eval_metric='mlogloss',
        random_state=42
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=True
    )

    return model
```

**交付物**:
- [ ] spec.yaml 特徵規格
- [ ] train_classifier.py 分類訓練腳本
- [ ] 模型評估報告 (Accuracy, F1, Confusion Matrix)

---

### Phase 2: Go 特徵計算器 (3 天)

#### 2.1 特徵計算模組

```go
// internal/ml/features/calculator.go

package features

import (
    "math"
    "gopkg.in/yaml.v3"
)

type FeatureSpec struct {
    Version      string            `yaml:"version"`
    FeatureNames []string          `yaml:"feature_names"`
    Definitions  map[string]FeatureDef `yaml:"feature_definitions"`
}

type FeatureDef struct {
    Type   string `yaml:"type"`
    Window int    `yaml:"window,omitempty"`
    Input  string `yaml:"input,omitempty"`
    Span   int    `yaml:"span,omitempty"`
}

type Calculator struct {
    spec *FeatureSpec
}

func NewCalculator(specPath string) (*Calculator, error) {
    // 加載 spec.yaml
    spec, err := loadSpec(specPath)
    if err != nil {
        return nil, err
    }
    return &Calculator{spec: spec}, nil
}

func (c *Calculator) BuildFeatureVector(
    frrHistory []float64,  // 至少 72 期
    btcPrice float64,
    hour int,
) ([]float64, error) {

    features := make([]float64, len(c.spec.FeatureNames))

    for i, name := range c.spec.FeatureNames {
        def := c.spec.Definitions[name]

        switch def.Type {
        case "rolling_std":
            features[i] = rollingStd(frrHistory, def.Window)
        case "rolling_mean":
            features[i] = rollingMean(frrHistory, def.Window)
        case "rolling_max":
            features[i] = rollingMax(frrHistory, def.Window)
        case "lag":
            features[i] = lag(frrHistory, def.Periods)
        case "ema":
            features[i] = ema(frrHistory, def.Span)
        case "percentile_rank":
            features[i] = percentileRank(frrHistory, def.Window)
        case "cyclic":
            if name == "hour_cos" {
                features[i] = math.Cos(2 * math.Pi * float64(hour) / 24)
            } else if name == "hour_sin" {
                features[i] = math.Sin(2 * math.Pi * float64(hour) / 24)
            }
        case "external":
            features[i] = btcPrice
        }
    }

    return features, nil
}
```

#### 2.2 修改 embedded.go

```go
// internal/ml/embedded.go 修改

func (c *EmbeddedClient) GetRatePrediction(
    currency string,
    currentFRR float64,
    recentRates []float64,
    btcPrice float64,
) (*RatePrediction, error) {

    // 使用新的特徵計算器
    features, err := c.featureCalculator.BuildFeatureVector(
        recentRates,
        btcPrice,
        time.Now().Hour(),
    )
    if err != nil {
        return nil, fmt.Errorf("feature calculation failed: %w", err)
    }

    // 驗證特徵數量
    if len(features) != c.modelInfo.FeatureCount {
        return nil, fmt.Errorf("feature count mismatch: got %d, expected %d",
            len(features), c.modelInfo.FeatureCount)
    }

    // XGBoost 推理
    probs, err := c.model.Predict(features)
    if err != nil {
        return nil, err
    }

    // 解析分類結果
    class := argmax(probs)
    confidence := probs[class]

    signal := map[int]string{
        0: "DOWN",
        1: "NEUTRAL",
        2: "UP",
    }[class]

    return &RatePrediction{
        Signal:      signal,
        Confidence:  confidence,
        Probabilities: probs,
    }, nil
}
```

**交付物**:
- [ ] internal/ml/features/calculator.go
- [ ] internal/ml/features/calculator_test.go
- [ ] embedded.go 修改完成
- [ ] Golden Test 通過（Python/Go 輸出一致）

---

### Phase 3: 整合與測試 (2 天)

#### 3.1 Feature Parity 測試

```python
# ml/tests/test_feature_parity.py

def test_feature_parity():
    """確保 Python 和 Go 計算結果一致"""

    # 固定測試數據
    test_data = load_test_fixtures("fixtures/feature_test.json")

    # Python 計算
    py_features = build_features(test_data, load_spec())

    # Go 計算 (透過 subprocess 或 gRPC)
    go_features = call_go_calculator(test_data)

    # 比對
    for i, (py, go) in enumerate(zip(py_features, go_features)):
        assert abs(py - go) < 1e-6, f"Feature {i} mismatch: {py} vs {go}"
```

#### 3.2 端對端測試

```bash
# 回測驗證
./backtest -days 90 -ml-model models/classifier_v2.json -output ml_backtest.json

# 評估指標
python ml/evaluate_backtest.py ml_backtest.json
```

**交付物**:
- [ ] Feature Parity 測試通過
- [ ] 回測報告 (收益對比 ML vs 非 ML)
- [ ] 混淆矩陣分析

---

### Phase 4: 灰度發布 (3 天)

#### 4.1 影子模式 (Day 1)

```go
// 同時運行新舊模型，僅記錄新模型輸出
type DualModelPredictor struct {
    oldPredictor *StatisticalPredictor
    newPredictor *MLPredictor
}

func (p *DualModelPredictor) Predict(...) *Prediction {
    // 舊模型用於實際決策
    result := p.oldPredictor.Predict(...)

    // 新模型僅記錄
    newResult := p.newPredictor.Predict(...)
    log.Info("ML shadow prediction",
        "old", result.Signal,
        "new", newResult.Signal,
        "agree", result.Signal == newResult.Signal,
    )

    return result
}
```

#### 4.2 灰度切換 (Day 2)

```yaml
# config/config.yaml
ml:
  model_version: "v2"
  enable_new_model: true
  canary_percentage: 10  # 先用 10% 資金
```

#### 4.3 全量切換 (Day 3)

```yaml
ml:
  enable_new_model: true
  canary_percentage: 100
  fallback_enabled: true  # 保留回退機制
```

**交付物**:
- [ ] 影子模式日誌分析
- [ ] 灰度切換成功
- [ ] 全量上線

---

## 技術選型建議

### 三方一致推薦

| 組件 | 選型 | 理由 |
|------|------|------|
| **Go XGBoost 推理** | `github.com/dmitryikh/leaves` | 純 Go，無 CGO，部署簡單 |
| **Online Feature Store** | Redis Hash | 延遲 <1ms，已有基礎設施 |
| **Offline Store** | PostgreSQL | 已有 FRR 歷史表 |
| **模型格式** | XGBoost JSON | 跨語言兼容 |
| **特徵規格** | YAML | 人類可讀，版本控制友好 |

### 推理延遲預估

| 步驟 | 預估延遲 |
|------|----------|
| Redis HGETALL | <1ms |
| 解析特徵向量 | <1ms |
| XGBoost Predict (leaves) | 5-10ms |
| **總計** | **<15ms** (遠低於 100ms 要求) |

---

## 風險與緩解

| 風險 | 緩解措施 |
|------|----------|
| Python/Go 特徵不一致 | Golden Test + CI 強制驗證 |
| 新模型效果不如預期 | 影子模式 + 灰度發布 + 回退機制 |
| FRR 數據不足 72 期 | 降級為 24 期特徵子集 |
| BTC 價格 API 失效 | 備用數據源 + 特徵降級 |

---

## 成本評估

| 項目 | 工時 | 難度 |
|------|------|------|
| Phase 0: 影子準備 | 0.5 天 | 低 |
| Phase 1: 特徵規格與訓練 | 3 天 | 中 |
| Phase 2: Go 特徵計算器 | 3 天 | 中高 |
| Phase 3: 整合測試 | 2 天 | 中 |
| Phase 4: 灰度發布 | 3 天 | 低 |
| **總計** | **11.5 天** | - |

---

## 參考資料

### 網路搜索結果
- [XGBoost Time Series Forecasting - Analytics Vidhya](https://www.analyticsvidhya.com/blog/2024/01/xgboost-for-time-series-forecasting/)
- [Feature Stores with Redis](https://redis.io/blog/feature-stores-for-real-time-artificial-intelligence-and-machine-learning/)
- [Classification vs Regression for Financial Time Series](https://medium.com/m2xinvest/predicting-interest-rate-with-classification-models-part-1-c7d6f82b739a)

### AI 分析來源
- **Gemini 3 Pro**: 系統架構設計、Feature Store Pattern
- **Codex GPT-5.2**: 具體實作方案、測試策略、遷移計畫
- **Claude Opus 4.5**: 問題診斷、整合規劃、最終決策

---

## 下一步行動

1. **立即執行 Phase 0** — 禁用失效的 XGBoost，純用統計分類
2. **創建 spec.yaml** — 定義 Top 15 特徵規格
3. **訓練分類模型** — 使用新的標籤定義
4. **實現 Go 特徵計算器** — 確保與 Python 一致
5. **灰度發布** — 漸進式上線

**預計完成時間**: 2 週
