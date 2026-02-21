# 技術指標分析模組

## 概述

本模組為 Bitfinex 放貸機器人添加了完整的技術指標分析功能，幫助策略做出更智能的決策。

## 新增文件

### 核心模組
- `internal/strategy/indicators.go` - 技術指標計算引擎
- `internal/strategy/indicators_report.go` - 指標可視化報告生成器

### 整合代碼
- `internal/strategy/grid.go` - Grid 策略已整合技術指標
- `internal/strategy/frr.go` - FRR 策略已整合技術指標

## 技術指標列表

### 1. 訂單簿深度指標
基於市場微觀結構理論，分析訂單簿的供需狀態。

- **OrderBookImbalance** (訂單簿不平衡度)
  - 範圍: -1 到 +1
  - 正值表示需求主導，負值表示供應主導
  - 公式: `(BidDepth - AskDepth) / (BidDepth + AskDepth)`
  - 來源: [Market Making with Alpha - Order Book Imbalance](https://hftbacktest.readthedocs.io/)

- **DepthRatio** (深度比率)
  - 需求深度 / 供應深度
  - 比率 > 1.5 表示強勁需求

- **LiquidityScore** (流動性評分)
  - 範圍: 0-100
  - 綜合考慮訂單數量、總深度、雙邊均衡度
  - 高流動性 > 70，低流動性 < 30

- **WeightedMidPrice** (加權中間價格/VAMP)
  - Volume Adjusted Mid Price
  - 基於訂單量加權的公平價格

### 2. 供需壓力指標

- **DemandPressure** (需求壓力)
  - 範圍: 0-100
  - 衡量借款需求強度

- **SupplyPressure** (供應壓力)
  - 範圍: 0-100
  - 衡量放貸供應強度

- **NetPressure** (淨壓力)
  - 範圍: -100 到 +100
  - 正值 = 需求主導，負值 = 供應主導

- **PressureIntensity** (壓力強度)
  - 不論方向，衡量市場失衡程度

### 3. 利率波動率指標
參考傳統金融市場的波動率分析方法。

- **RateVolatility** (利率標準差)
  - 衡量利率變化的離散程度

- **RateATR** (平均真實範圍)
  - Average True Range 簡化版
  - 衡量利率變動幅度

- **VolatilityPercentile** (波動率百分位)
  - 當前波動率在歷史中的位置

- **IsHighVolatility** (高波動標記)
  - 波動率 > 平均值 1.5 倍時觸發

### 4. 移動平均和動量指標
經典技術分析指標，用於趨勢識別。

- **FRR_SMA_5** (5期簡單移動平均)
- **FRR_SMA_20** (20期簡單移動平均)
- **FRR_EMA_5** (5期指數移動平均)
- **FRR_Momentum** (動量)
  - 變化率百分比
  - 正值 = 上漲，負值 = 下跌

- **FRR_Acceleration** (加速度)
  - 動量的二階導數
  - 衡量趨勢加速或減速

- **FRR_Trend** (趨勢方向)
  - "上升"、"下降"、"盤整"

### 5. 市場微觀結構指標
來自學術研究的市場質量指標。

- **BidAskSpread** (買賣價差)
  - 市場效率指標
  - 價差越小，市場效率越高

- **SpreadPercentage** (價差百分比)
  - 相對於中間價的價差比例

- **OrderFlowImbalance** (訂單流不平衡)
  - 基於訂單簿的流量分析

- **MarketImpact** (市場衝擊)
  - 估計大額交易的價格影響

### 6. 價格水平指標

- **SupportLevel** (支撐位)
  - 基於訂單簿識別的需求集中區域

- **ResistanceLevel** (阻力位)
  - 基於訂單簿識別的供應集中區域

- **PricePosition** (價格位置)
  - 當前價格在支撐-阻力範圍中的位置 (0-100%)

### 7. 綜合信號

- **BullishScore** (看漲評分)
  - 範圍: 0-100
  - 綜合多個看漲因素

- **BearishScore** (看跌評分)
  - 範圍: 0-100
  - 綜合多個看跌因素

- **OverallSentiment** (綜合情緒)
  - "強烈看漲"、"看漲"、"中性"、"看跌"、"強烈看跌"

## 策略整合

### Grid 策略整合

Grid 策略使用技術指標調整利率範圍：

```go
// 自動計算技術指標
indicators := s.indicatorCalc.Calculate(marketData)

// 基於指標調整利率範圍
minRate, maxRate := s.adjustRateRangeWithIndicators(marketData, indicators)
```

**調整邏輯：**

1. **市場情緒調整**
   - 強烈看漲：上調利率範圍 15%
   - 看漲：上調 8%
   - 強烈看跌：下調 10%
   - 看跌：下調 5%

2. **供需壓力調整**
   - 需求壓力 > 70：上調 10%
   - 供應壓力 > 70：下調 8%

3. **流動性調整**
   - 流動性 < 30：保守下調 5%

4. **波動率調整**
   - 高波動環境：擴大利率範圍 10%

### FRR 策略整合

FRR 策略使用技術指標優化期限選擇：

```go
// 計算技術指標
indicators := s.indicatorCalc.Calculate(marketData)

// 結合指標檢測 FRR 突增
if s.isFRRSpike() || (indicators != nil && indicators.FRR_Momentum > 20) {
    // 使用更長期限鎖定高利率
}

// 使用指標調整期限
period := s.adjustPeriodWithIndicators(basePeriod, indicators)
```

**調整邏輯：**

1. **趨勢調整**
   - 上升趨勢：縮短期限 15-30%（快速調整以追隨上漲）
   - 下降趨勢：縮短期限 20-40%（避免鎖定低利率）

2. **波動率調整**
   - 高波動：縮短期限 20%（提高靈活性）

3. **市場情緒調整**
   - 強烈看漲 + 高需求：延長期限 30%（鎖定高利率）

## 使用示例

### 查看技術指標

在策略中獲取當前指標：

```go
// Grid 策略
indicators := gridStrategy.GetTechnicalIndicators()

// FRR 策略
indicators := frrStrategy.GetTechnicalIndicators()
```

### 生成指標報告

```go
// 創建報告生成器
report := NewIndicatorReport(indicators)

// 生成詳細文字報告
textReport := report.GenerateTextReport()
fmt.Println(textReport)

// 生成簡短摘要（適合日誌）
summary := report.GenerateSummary()
logrus.Info(summary)

// 生成 JSON 格式（適合 API）
jsonData := report.GenerateJSON()
```

### 示例輸出

#### 文字報告示例

```
═══════════════════════════════════════════════════════════════
                    技術指標分析報告
═══════════════════════════════════════════════════════════════
生成時間: 2025-12-17 14:30:00
數據質量: 95.0/100

┌─ 綜合評估 ────────────────────────────────────────────────┐
│ 市場情緒: 看漲 📈
│ 看漲評分: 65.0/100 ██████░░░░
│ 看跌評分: 25.0/100 ██░░░░░░░░
└────────────────────────────────────────────────────────────┘

┌─ 訂單簿深度分析 ──────────────────────────────────────────┐
│ 不平衡度: +0.250 需求主導 ⬆️
│ 需求深度: $1250000.00
│ 供應深度: $850000.00
│ 深度比率: 1.47 (需求/供應)
│ 流動性評分: 72.5/100 高
└────────────────────────────────────────────────────────────┘

┌─ 供需壓力分析 ────────────────────────────────────────────┐
│ 需求壓力: 68.0/100 ██████░░░░
│ 供應壓力: 32.0/100 ███░░░░░░░
│ 淨壓力: +36.0 需求優勢 ⬆️
│ 壓力強度: 36.0/100
└────────────────────────────────────────────────────────────┘

┌─ FRR 趨勢與動量 ──────────────────────────────────────────┐
│ 趨勢方向: 上升 ↗️
│ 動量: +12.50% 上漲
│ 加速度: +2.30
│ SMA(5): 0.000420 (15.33% APR)
│ SMA(20): 0.000385 (14.05% APR)
│ EMA(5): 0.000428 (15.62% APR)
└────────────────────────────────────────────────────────────┘

┌─ 策略建議 ────────────────────────────────────────────────┐
│ ✓ 建議：可以設置較高的利率目標
│   市場需求強勁，利率有上行空間
│ 📈 FRR 快速上升：可考慮延長期限鎖定高利率
└────────────────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════
```

#### 日誌摘要示例

```
情緒:看漲 | 看漲:65 看跌:25 | 訂單簿不平衡:+0.25 | 需求壓力:68 供應壓力:32 | FRR趨勢:上升 動量:+12.5% | 波動率:0.000035 | 流動性:73
```

## 日誌輸出

啟用技術指標後，策略會自動輸出指標日誌：

### Grid 策略日誌

```json
{
  "level": "info",
  "msg": "使用技術指標調整利率範圍",
  "adjusted_min_rate": 0.000350,
  "adjusted_max_rate": 0.000580,
  "adjustment_factor": 1.08,
  "sentiment": "看漲",
  "bullish_score": 65.0,
  "bearish_score": 25.0,
  "demand_pressure": 68.0,
  "supply_pressure": 32.0,
  "liquidity_score": 72.5,
  "orderbook_imbalance": 0.250,
  "is_high_volatility": false
}
```

### FRR 策略日誌

```json
{
  "level": "info",
  "msg": "FRR 策略技術指標",
  "frr_trend": "上升",
  "frr_momentum": "+12.50%",
  "frr_acceleration": "2.30",
  "frr_sma_5": "0.000420 (15.33% APR)",
  "overall_sentiment": "看漲",
  "demand_pressure": "68.0",
  "liquidity_score": "72.5",
  "is_high_volatility": false
}
```

## 性能考量

### 歷史數據存儲

- Grid 策略：保留 100 個數據點
- FRR 策略：保留 24 個數據點（與 FRR_HISTORY_SIZE 一致）

### 計算頻率

技術指標在每次 `CalculateOffers` 時計算，通常每 2-5 分鐘一次。

### 內存使用

每個策略實例約增加 ~50KB 內存用於存儲歷史數據和指標計算。

## 學術參考

本模組實現基於以下研究和行業實踐：

1. **Order Book Analysis**
   - [Order Book Depth Analysis](https://liquidity-provider.com/articles/order-book-depth-what-it-is-and-why-it-matters/)
   - CME Group: [Reassessing Liquidity Beyond Order Book Depth](https://www.cmegroup.com/articles/2025/reassessing-liquidity-beyond-order-book-depth.html)

2. **Market Microstructure**
   - [Bid Ask Imbalance Trading](https://tradefundrr.com/bid-ask-imbalance-trading/)
   - [Order Flow Imbalance in Market Microstructure](https://www.emergentmind.com/topics/order-flow-imbalance)

3. **Interest Rate Volatility**
   - [Interest Rate Volatility Analysis](https://russellinvestments.com/us/blog/interest-rate-volatility-surge)
   - Federal Reserve: [Drivers of Option-Implied Interest Rate Volatility](https://www.federalreserve.gov/econres/notes/feds-notes/drivers-of-option-implied-interest-rate-volatility-20241024.html)

## 配置選項

技術指標自動啟用，無需額外配置。如果需要調整行為：

```yaml
strategy:
  type: "grid"  # 或 "frr"
  # 技術指標會自動使用現有的市場數據
  # 無需額外配置
```

## 未來擴展

計劃中的功能：

1. **機器學習預測**
   - 基於歷史指標訓練預測模型
   - 預測未來 FRR 走勢

2. **多時間框架分析**
   - 支持 5分鐘、15分鐘、1小時等不同時間框架

3. **自定義指標**
   - 允許用戶定義自己的技術指標公式

4. **回測系統**
   - 使用歷史數據測試指標效果

## 故障排除

### 指標值全為 0

**原因：** 歷史數據不足

**解決：** 等待至少 10-20 分鐘讓系統積累足夠的歷史數據

### 數據質量低

**原因：** WebSocket 連接不穩定或市場數據缺失

**解決：** 檢查網絡連接和 Bitfinex API 狀態

### 日誌過多

**解決：** 調整日誌級別：

```bash
export LOG_LEVEL=warn  # 只顯示警告和錯誤
```

## 總結

技術指標模組為放貸機器人提供了：

✅ 全面的市場狀態分析
✅ 基於數據的決策支持
✅ 自動化的利率和期限優化
✅ 詳細的可視化報告
✅ 零額外配置，開箱即用

所有指標計算都是實時的，基於最新的市場數據和訂單簿狀態。
