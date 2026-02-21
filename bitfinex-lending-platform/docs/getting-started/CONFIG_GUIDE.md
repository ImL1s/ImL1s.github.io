# Bitfinex 放貸機器人配置指南

## 配置檔案結構

本專案使用單一配置檔案 `config/config.yaml`，包含所有必要設定。

### 重要配置檔案說明
- **config/config.yaml** - 主配置檔（機器人實際使用）
- **config/config.example.yaml** - 範例配置（參考用）
- **config/config.test.yaml** - 測試配置（開發用）

## Grid 策略配置優化建議

### 當前設定（已優化）
```yaml
strategy:
  type: "grid"
  grid:
    grid_levels: 7           # 分散到 7 個層級，平衡風險與收益
    min_rate: 0.00018        # 0.018% 日利率（年化 6.57%）
    max_rate: 0.00035        # 0.035% 日利率（年化 12.78%）
    min_period: 2            # 最短 2 天（保持流動性）
    max_period: 7            # 最長 7 天（避免資金鎖定過久）
    distribution: "adaptive"  # 自適應分配，根據市場動態調整
    rebalance_interval: 300  # 每 5 分鐘重新平衡
    rate_adjust_factor: 1.0  # 調整因子設為 1.0（避免超出上限）
```

### 參數說明

#### grid_levels (網格層級數)
- **作用**：將資金分散到多個利率層級
- **建議值**：5-10
- **原理**：層級越多，風險越分散，但單筆金額越小

#### min_rate / max_rate (利率範圍)
- **作用**：設定放貸利率的上下限
- **市場參考**：
  - FRR 通常在 0.0003-0.0004 (0.03%-0.04%)
  - 極端情況可達 0.001 (0.1%) 以上
- **建議**：保持在 FRR ±50% 範圍內

#### distribution (分配模式)
- **linear**：線性分配，均勻分布
- **exponential**：指數分配，低利率訂單較多
- **logarithmic**：對數分配，高利率訂單較多
- **adaptive**：自適應，根據市場供需動態調整（推薦）

#### rate_adjust_factor (調整因子)
- **作用**：根據市場情況調整利率的倍數
- **重要**：必須 ≤ 1.0，否則會造成利率超過 max_rate
- **公式**：實際利率 = 基礎利率 × 市場調整 × rate_adjust_factor

## 最佳實踐建議

### 1. 保守策略（穩定收益）
```yaml
grid_levels: 5
min_rate: 0.00020   # 0.020%
max_rate: 0.00030   # 0.030%
rate_adjust_factor: 0.9
```

### 2. 平衡策略（當前配置）
```yaml
grid_levels: 7
min_rate: 0.00018   # 0.018%
max_rate: 0.00035   # 0.035%
rate_adjust_factor: 1.0
```

### 3. 激進策略（追求高收益）
```yaml
grid_levels: 10
min_rate: 0.00015   # 0.015%
max_rate: 0.00040   # 0.040%
rate_adjust_factor: 1.0
```

## 風險管理設定

```yaml
risk:
  max_exposure: 0.9          # 最多使用 90% 資金
  min_reserve: 0.1           # 保留 10% 應急資金
  max_single_offer_pct: 0.2  # 單筆訂單不超過 20%
```

## 重要提醒

1. **定期監控**：即使使用自動化，也要定期查看運行狀況
2. **市場變化**：極端市場時考慮手動介入
3. **測試先行**：修改配置後先用小額測試
4. **備份配置**：重要修改前備份 config.yaml

## 故障排除

### 問題：訂單利率超過設定上限
**解決方案**：
1. 確認 rate_adjust_factor ≤ 1.0
2. 檢查 grid.go 中的利率上限保護是否生效

### 問題：FRR Delta 訂單顯示錯誤
**解決方案**：
已在 bitfinex.go 中修復，確保 delta 值正確加上 FRR 基準值

## 監控指標

重要指標：
- **資金使用率**：目標 > 85%
- **平均利率**：目標年化 8-12%
- **訂單成交率**：目標 > 70%
- **空閒時間**：目標 < 10%