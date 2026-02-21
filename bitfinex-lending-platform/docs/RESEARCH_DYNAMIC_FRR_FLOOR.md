# 深度研究：動態 FRR Floor 機制設計

**日期**: 2025-12-21
**研究目的**: 解決 FRR Floor 保護機制導致的資金閒置問題
**研究方法**: 多 AI 模型分析 + 學術文獻 + 行業最佳實踐

---

## 1. 問題回顧

### 1.1 當前狀況
- **FRR**: 14.14% APR（活躍貸款加權平均）
- **best_ask**: 3.478% APR（order book 最低報價）
- **差距**: 4.07 倍（FRR / best_ask）
- **結果**: 20,000+ USDT 停在 14% 無法成交

### 1.2 問題代碼 (`repricer.go:261-268`)
```go
frrFloor := minRate
if cfg.UseFRRFloor && currentFRR > 0 {
    frrFloor = math.Max(minRate, currentFRR)  // = 14.14%
}
if downwardRate < frrFloor {
    downwardRate = frrFloor  // 強制使用 14.14%
}
```

---

## 2. 專家意見彙整

### 2.1 OpenAI Codex (GPT-5.2-Codex) 分析

**核心結論**:
> FRR Floor 這種「硬下限」在靜態市場有保護作用，但在當前 14% vs 3.5% 的極端差距下，已經成為「錯誤訊號的放大器」。

**關鍵觀點**:
1. **FRR 是滯後指標** - 反映「過去成交」而非「現在邊際成交價格」
2. **閒置資金的機會成本** - 若資金閒置，實際收益是 0，3.5% > 0
3. **真正要保護的** - 「極端錯價時不被拖死」，而非「永遠不低於 FRR」

**建議方案**:
1. 動態 FRR Floor（衰減或分段）
2. 深度加權的可成交價格（非 best_ask 單點）
3. 分層資金分配（inventory split）
4. FRR 作為「上限警戒」而非下限
5. 基於成交率的自適應

### 2.2 Gemini (未能成功獲取回應)

---

## 3. 學術與行業參考

### 3.1 Avellaneda-Stoikov 做市模型

**來源**: [Hummingbot 實作指南](https://hummingbot.org/blog/guide-to-the-avellaneda--stoikov-strategy/)

**核心公式**:
```
Reservation Price = s - q * γ * σ² * (T-t)
Optimal Spread = γ * σ² * (T-t) + (2/γ) * ln(1 + γ/κ)
```

**關鍵參數**:
| 參數 | 含義 | 建議值 |
|------|------|--------|
| γ (gamma) | 庫存風險厭惡 | 越高越保守，越低越激進 |
| σ | 市場波動率 | 動態計算 |
| T-t | 剩餘交易時間 | 影響緊迫程度 |
| κ (kappa) | Order book 流動性 | 高 = 小 spread，低 = 大 spread |

**對我們的啟示**:
- γ 參數可對應「FRR 信任度」
- 當 FRR vs best_ask 差距大時，降低 γ（更激進）
- 時間因素（T-t）對應「閒置時間衰減」

### 3.2 指數衰減半衰期研究

**來源**: Applied Financial Mathematics - Optimal Trade Execution

**關鍵發現**:
```
半衰期公式: t₁/₂ = ln(2) / ρ

案例: ρ = 2.035×10⁻⁵
半衰期 = 34,055 秒 ≈ 9.5 小時
```

**對我們的啟示**:
- 當前 DecayLambda = 0.03（半衰期 ≈ 23 分鐘）適用於「價格衰減」
- FRR Floor 衰減應該更慢：6-24 小時半衰期
- 建議 IdleDecayLambda = 0.001-0.002

### 3.3 DeFi 動態利率模型

**來源**: Berkeley DeFi Research, Bank of Canada Working Paper

**關鍵概念**:
- Variable rate models 根據 utilization ratio 動態調整
- 高 utilization = 高利率，低 utilization = 低利率
- **啟示**: 閒置資金 = 0 utilization，應該降低要價

---

## 4. 設計方案：Dynamic FRR Floor

### 4.1 核心理念

```
當 FRR 與 best_ask 差距過大時，
FRR 的權重隨閒置時間指數衰減，
逐漸過渡到跟隨市場報價。
```

### 4.2 新增配置參數

```go
type RepricerConfig struct {
    // ... 現有參數 ...

    // 動態 FRR Floor（新增）
    UseDynamicFRRFloor bool    `mapstructure:"use_dynamic_frr_floor"` // 啟用動態 FRR Floor
    GapThresholdRatio  float64 `mapstructure:"gap_threshold_ratio"`   // FRR/bestAsk 觸發閾值 (default: 2.0)
    IdleDecayLambda    float64 `mapstructure:"idle_decay_lambda"`     // FRR 權重衰減係數 (default: 0.001)
    MinFRRWeight       float64 `mapstructure:"min_frr_weight"`        // FRR 最低權重 (default: 0.25)
    MarketBuffer       float64 `mapstructure:"market_buffer"`         // 市場價格緩衝 (default: 1.02 = 2%)
}
```

### 4.3 參數計算

| 參數 | 值 | 計算/理由 |
|------|-----|----------|
| GapThresholdRatio | 2.0 | 當 FRR > 2x best_ask 時視為「異常差距」 |
| IdleDecayLambda | 0.001 | 半衰期 = ln(2)/0.001 = 693 分鐘 ≈ **11.5 小時** |
| MinFRRWeight | 0.25 | 無論多久，FRR 仍貢獻 25% 權重（保護性） |
| MarketBuffer | 1.02 | 跟隨市場時，報價 = best_ask × 1.02 |

### 4.4 衰減曲線

```
時間      FRR權重    市場權重    說明
0 小時    100%       0%         剛掛單，完全信任 FRR
6 小時    66%        34%        開始偏向市場
11.5 小時 50%        50%        半衰期，各佔一半
23 小時   25%        75%        接近最低 FRR 權重
48 小時+  25%        75%        穩定在最低權重
```

### 4.5 實作邏輯

```go
// CheckReprice 中替換 FRR Floor 邏輯

func (r *Repricer) calculateDynamicFRRFloor(
    offer *client.FundingOffer,
    currentFRR, bestAskRate, minRate float64,
    cfg RepricerConfig,
) float64 {
    // 如果沒啟用動態 FRR Floor，使用原邏輯
    if !cfg.UseDynamicFRRFloor {
        if cfg.UseFRRFloor && currentFRR > 0 {
            return math.Max(minRate, currentFRR)
        }
        return minRate
    }

    // 計算差距比例
    if bestAskRate <= 0 {
        bestAskRate = minRate
    }
    gapRatio := currentFRR / bestAskRate

    // 如果差距不大，正常使用 FRR Floor
    if gapRatio <= cfg.GapThresholdRatio {
        if cfg.UseFRRFloor && currentFRR > 0 {
            return math.Max(minRate, currentFRR)
        }
        return minRate
    }

    // 差距過大，啟用動態衰減
    now := r.getNow()
    idleMinutes := now.Sub(offer.Created).Minutes()
    if idleMinutes < 0 {
        idleMinutes = 0
    }

    // FRR 權重隨時間衰減: weight = exp(-λ * t)，但不低於 MinFRRWeight
    frrWeight := math.Exp(-cfg.IdleDecayLambda * idleMinutes)
    frrWeight = math.Max(cfg.MinFRRWeight, frrWeight)
    marketWeight := 1.0 - frrWeight

    // 動態 Floor = 加權平均
    // FRR 部分 + 市場部分（帶緩衝）
    marketTarget := bestAskRate * cfg.MarketBuffer
    dynamicFloor := frrWeight*currentFRR + marketWeight*marketTarget

    // 記錄日誌（調試用）
    logrus.WithFields(logrus.Fields{
        "gap_ratio":      gapRatio,
        "idle_minutes":   idleMinutes,
        "frr_weight":     frrWeight,
        "frr":            currentFRR,
        "best_ask":       bestAskRate,
        "dynamic_floor":  dynamicFloor,
    }).Debug("[REPRICER] Dynamic FRR Floor calculated")

    return math.Max(minRate, dynamicFloor)
}
```

### 4.6 預期效果模擬

**場景**: FRR = 14.14%, best_ask = 3.478%

| 閒置時間 | FRR權重 | Dynamic Floor | 說明 |
|----------|---------|---------------|------|
| 0 分鐘   | 100%    | 14.14%        | 剛掛單 |
| 120 分鐘 | 89%     | 12.87%        | 2 小時後 |
| 360 分鐘 | 70%     | 10.96%        | 6 小時後 |
| 693 分鐘 | 50%     | 8.84%         | 半衰期 |
| 1386 分鐘| 25%     | 6.20%         | 最低權重 |

**vs 原方案**: 永遠卡在 14.14%，無法成交

---

## 5. 風險評估

### 5.1 潛在風險

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 被低價誤導 | 中 | MinFRRWeight = 25% 保留 FRR 影響 |
| 價格崩盤時追跌 | 中 | MarketBuffer = 2% 提供緩衝 |
| 錯過高利率機會 | 低 | UpwardReprice 機制可以追漲 |

### 5.2 安全保障

1. **GapThresholdRatio = 2.0**: 只在極端差距時啟動
2. **MinFRRWeight = 25%**: FRR 永遠有發言權
3. **MarketBuffer = 2%**: 不完全貼著 best_ask
4. **與 ML 整合**: 可結合市場狀態分類調整參數

---

## 6. 實作計劃

### Phase 1: 核心功能（本週）
- [ ] 新增 RepricerConfig 參數
- [ ] 實作 calculateDynamicFRRFloor 函數
- [ ] 整合到 CheckReprice 流程
- [ ] 單元測試

### Phase 2: 監控與調優（下週）
- [ ] 新增 Prometheus metrics（gap_ratio, frr_weight, dynamic_floor）
- [ ] Web Dashboard 顯示
- [ ] 日誌分析腳本

### Phase 3: ML 整合（中期）
- [ ] 在 ML 信號中加入 FRR vs best_ask 特徵
- [ ] 訓練模型預測最佳 GapThresholdRatio
- [ ] 動態調整 IdleDecayLambda

---

## 7. 配置建議

### 7.1 保守模式（推薦起步）
```yaml
repricer:
  use_dynamic_frr_floor: true
  gap_threshold_ratio: 2.5      # 2.5x 差距才觸發
  idle_decay_lambda: 0.0007     # 半衰期 ~16.5 小時
  min_frr_weight: 0.30          # FRR 至少 30% 權重
  market_buffer: 1.03           # 3% 緩衝
```

### 7.2 積極模式（資金利用優先）
```yaml
repricer:
  use_dynamic_frr_floor: true
  gap_threshold_ratio: 1.5      # 1.5x 差距就觸發
  idle_decay_lambda: 0.002      # 半衰期 ~5.8 小時
  min_frr_weight: 0.20          # FRR 最低 20% 權重
  market_buffer: 1.01           # 1% 緩衝
```

---

## 8. 結論

### 8.1 核心發現
1. **FRR Floor 硬下限在市場轉換時失效** - 需要動態機制
2. **閒置資金是隱性損失** - 必須平衡保護 vs 機會成本
3. **時間衰減是關鍵** - 類似 Avellaneda-Stoikov 的 (T-t) 因素
4. **25% 最低權重** - 保留 FRR 的參考價值

### 8.2 行動建議
1. **立即**: 實作 Dynamic FRR Floor（保守模式）
2. **短期**: 監控效果，調整參數
3. **中期**: 整合 ML，實現智能調參

---

## 參考資料

1. OpenAI Codex (GPT-5.2-Codex) Analysis - 2025-12-21
2. Hummingbot - Guide to Avellaneda & Stoikov Strategy
3. Applied Financial Mathematics - Portfolio Liquidation under Transient Price Impact
4. Bank of Canada - On the Fragility of DeFi Lending
5. Berkeley DeFi Research - DeFi Protocols for Loanable Funds
