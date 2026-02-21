# Bitfinex 放貸機器人問題修復報告

## 執行時間
2025-09-25 23:00 - 23:55 (UTC+8)

## 問題摘要
本次修復解決了兩個重大問題：
1. FRR Delta 訂單顯示利率錯誤（顯示為極低值）
2. Grid 策略產生超過配置最大值的高利率訂單

## 詳細問題分析

### 問題 1：FRR Delta 顯示錯誤
**症狀：**
- 訂單 ID 4423246801 在日誌中顯示為 0.0003% (0.000003)
- 實際在 Bitfinex UI 顯示為 0.035036% (0.00035036)
- 相差 11,678 倍

**根因分析：**
- FRR Delta 訂單類型（FRRDELTAVAR/FRRDELTAFIX）儲存的是 delta 值，而非實際利率
- 系統顯示時沒有將 delta 加上 FRR 基準值

**修復方案：**
在 `internal/client/bitfinex.go` 的 `GetActiveFundingOffers` 函數中加入邏輯：
```go
if (orderType == "FRRDELTAVAR" || orderType == "FRRDELTAFIX") && currentFRR > 0 {
    actualRate := currentFRR + rate
    offer.Rate = actualRate
    logrus.WithFields(logrus.Fields{
        "offer_id": fmt.Sprintf("%.0f", offerID),
        "type": orderType,
        "delta": rate,
        "frr": currentFRR,
        "actual_rate": actualRate,
    }).Debug("Calculated FRR Delta actual rate")
}
```

### 問題 2：Grid 策略超出利率上限
**症狀：**
- Grid 策略產生 0.039% 的訂單
- 超過配置的最大利率 0.035%

**根因分析：**
計算過程追蹤：
1. 基礎利率：0.00035 (配置最大值)
2. 市場調整：高需求時 ×1.3，中等需求時 ×1.15
3. RateAdjustFactor：×1.2
4. 最終：0.00035 × 1.114 ≈ 0.00039

**修復方案：**
在 `internal/strategy/grid.go` 中加入兩層保護：

1. 在 `CalculateOffers` 函數中加入最終檢查：
```go
if rate > s.config.MaxRate {
    logrus.WithFields(logrus.Fields{
        "level":         i,
        "original_rate": rate,
        "capped_to":     s.config.MaxRate,
    }).Warn("Rate exceeds configured maximum, capping")
    rate = s.config.MaxRate
}
```

2. 在 `adjustRateByMarketDepth` 函數中加入 FRR 倍數限制：
```go
if marketData.FRR > 0 && adjustedRate > marketData.FRR*1.5 {
    logrus.WithFields(logrus.Fields{
        "base_rate":     baseRate,
        "adjustment":    adjustment,
        "adjusted_rate": adjustedRate,
        "frr":           marketData.FRR,
        "capped_to":     marketData.FRR * 1.5,
    }).Debug("Rate exceeds 1.5x FRR, capping")
    adjustedRate = marketData.FRR * 1.5
}
```

## 已執行的清理動作

### 取消高利率訂單
- 成功取消訂單 4423627233：$255 @ 0.039% (14.24% APR)
- API 回應確認：狀態變更為 "CANCELED"
- 釋放資金重新分配給正常利率範圍

## 驗證結果

### 修復後的系統狀態
1. **FRR Delta 訂單顯示正確**
   - 訂單 4423246801 現在正確顯示為 0.0349%

2. **新產生的訂單都在範圍內**
   - Grid 策略產生的訂單受到利率上限保護
   - 日誌顯示："Rate exceeds configured maximum, capping"
   - 新訂單 4424320653：$255 @ 0.0311% (在範圍內)

3. **系統運行穩定**
   - 持續監控 23 分鐘無異常
   - WebSocket 連線穩定
   - 餘額計算正確

## 建議的後續改進

### 1. 增強配置驗證
```yaml
strategies:
  grid:
    max_rate: 0.00035  # 建議加入註解說明這是硬上限
    rate_adjust_factor: 1.0  # 建議降低到 1.0 避免超限
```

### 2. 加入運行時檢查
- 在機器人啟動時驗證所有利率配置
- 確保 max_rate × rate_adjust_factor × 1.3 不超過合理範圍

### 3. 改進日誌記錄
- 對所有利率調整記錄詳細的計算過程
- 加入利率範圍檢查的警告

### 4. 單元測試覆蓋
建議加入以下測試案例：
- FRR Delta 類型訂單的顯示測試
- Grid 策略在極端市場條件下的利率計算
- 利率上限保護機制

## 結論
本次修復成功解決了兩個關鍵問題，系統現在能夠：
1. 正確顯示 FRR Delta 訂單的實際利率
2. 確保所有新訂單都不會超過配置的利率上限

系統已恢復正常運作，建議持續監控並實施上述改進建議。