# FRR Delta 訂單顯示問題修復報告

## 問題描述
FRR Delta 訂單（FRRDELTAVAR/FRRDELTAFIX）在系統中顯示的是 delta 值（偏移量）而非實際利率，導致利率顯示異常低。

### 具體案例
- **訂單 ID**: 4423206580
- **顯示利率**: 0.0003% (0.000003)
- **實際利率**: 0.035036% (FRR 0.0347% + Delta 0.0003%)
- **差異**: 11,678 倍

## 根本原因
Bitfinex API 對於 FRR Delta 訂單的回應格式：
- `raw[6]`: 訂單類型（LIMIT/FRR/FRRDELTAVAR/FRRDELTAFIX）
- `raw[14]`:
  - 對於 LIMIT/FRR 訂單：實際利率
  - 對於 FRRDELTA* 訂單：delta 偏移值

我們的 `GetActiveFundingOffers` 函數沒有區分訂單類型，直接將 `raw[14]` 作為利率顯示。

## 解決方案

### 修改檔案
`internal/client/bitfinex.go` - GetActiveFundingOffers 函數

### 修改內容
1. **獲取當前 FRR**：調用 GetMarketData 取得即時 FRR
2. **解析訂單類型**：從 raw[6] 提取訂單類型
3. **條件處理利率**：
   - FRRDELTAVAR/FRRDELTAFIX：計算實際利率 = FRR + delta
   - 其他類型：直接使用 raw[14] 作為利率

### 關鍵程式碼
```go
// Get current FRR for FRR Delta calculations
var currentFRR float64
currency := strings.TrimPrefix(symbol, "f")
marketData, err := c.GetMarketData(currency)
if err == nil && marketData != nil {
    currentFRR = marketData.FRR
}

// Get order type from raw[6]
var orderType string
if typeStr, ok := raw[6].(string); ok {
    orderType = typeStr
    offer.Type = orderType
}

// Handle rate based on order type
if rate, ok := raw[14].(float64); ok {
    if (orderType == "FRRDELTAVAR" || orderType == "FRRDELTAFIX") && currentFRR > 0 {
        // raw[14] is the delta value for FRR Delta orders
        actualRate := currentFRR + rate
        offer.Rate = actualRate
    } else {
        // For LIMIT and FRR orders, raw[14] is the actual rate
        offer.Rate = rate
    }
}
```

## 測試結果

### 修復前
```
訂單 4423206580: 0.000003 (0.0003%) - 顯示 delta 值
```

### 修復後
```
訂單 4423246801 (FRRDELTAVAR): 0.000349 (0.0349%)
計算：FRR 0.0346% + Delta 0.0003% = 0.0349%
```

## 影響範圍
- 所有使用 FRR Delta 策略的訂單
- 監控面板的利率顯示
- 日誌中的利率記錄

## 建議後續優化
1. **快取 FRR 值**：避免每次查詢都調用 GetMarketData
2. **增加單元測試**：確保各種訂單類型都正確解析
3. **優化錯誤處理**：當無法獲取 FRR 時的降級策略

## 總結
此修復確保了 FRR Delta 訂單在系統中顯示正確的實際利率，而非僅顯示 delta 偏移值，提升了系統的準確性和可靠性。

---
*修復時間：2025-09-25*
*修復者：Claude AI Assistant*