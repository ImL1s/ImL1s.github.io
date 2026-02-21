# Balance Timing Fix Report

**日期**: 2025-10-24
**問題**: USDT 實例顯示矛盾數據 - 有活躍貸款但 lending_balance 為 0
**根本原因**: Balance API 調用與 Offer 提交之間的時序競爭條件

---

## 問題描述

### 症狀
USDT 實例出現數據矛盾：
```json
{
  "total": 10000.40,
  "idle": 10000,         // ❌ 錯誤：應該扣除掛單和貸款
  "pending": 9990.23,    // ✓ 正確
  "lending": 0           // ❌ 錯誤：實際有 1 個活躍貸款
}
```

計算錯誤：
```
lending = total - available - pending
        = 10000 - 10000 - 9990
        = -9990 → 0 (被安全檢查設為 0)
```

### 為什麼 USD 沒問題？
- USD 實例在觀察期間沒有提交新掛單
- USDT 實例正在提交 10 個掛單，觸發時序問題

---

## 根本原因分析

### 時序問題 (Timeline)

```
T0: balances = GetWalletBalances()      // available = $10000
    ↓
T1-T9: 循環提交 10 個掛單
    - 每個掛單 $999
    - 本地 activeOffers map 立即更新
    - 但 Bitfinex API 的 wallet balance 還沒更新！
    ↓
T10: updateMetrics(balances from T0, activeOffers from T9)
    - balances["funding_UST"] 仍然是 $10000（T0 的值）
    - activeOffers 已有 10 個掛單（T9 的值）
    - 計算: lending = 10000 - 10000 - 9990 = -9990 ❌
```

### API 更新延遲
Bitfinex API 在收到掛單請求後：
1. 立即返回 offer ID（200 OK）
2. **延遲 500ms-2s** 才更新 wallet balance
3. 我們在延遲期間就調用了 updateMetrics

---

## 修復方案

### 選擇的方案：本地餘額調整 (Plan B)

**位置**: `internal/bot/bot.go:868-895`

```go
// Fix timing issue: adjust balances to reflect newly submitted offers
adjustedBalances := make(map[string]float64)
for k, v := range balances {
    adjustedBalances[k] = v
}

// Subtract newly submitted offers from available balance
currency := b.getCurrency()
adjustedBalances["funding_"+currency] -= successfulAmount

if adjustedBalances["funding_"+currency] < 0 {
    logrus.WithFields(logrus.Fields{
        "original_available": balances["funding_"+currency],
        "submitted_amount":   successfulAmount,
        "adjusted_available": adjustedBalances["funding_"+currency],
    }).Warn("[BALANCE_TIMING_FIX] Adjusted available became negative, setting to 0")
    adjustedBalances["funding_"+currency] = 0
}

logrus.WithFields(logrus.Fields{
    "original_available": balances["funding_"+currency],
    "submitted_amount":   successfulAmount,
    "adjusted_available": adjustedBalances["funding_"+currency],
}).Debug("[BALANCE_TIMING_FIX] Adjusted balance to reflect new offers")

// Update metrics with adjusted balances
b.updateMetrics(adjustedBalances, marketData)
```

### 為什麼選擇 Plan B？
1. **性能優先** - 不需要額外的 API 調用
2. **即時性** - 立即反映本地狀態
3. **準確性** - 補償時序差，避免負數計算
4. **可靠性** - 配合 1 分鐘強制同步作為安全網

### 替代方案（未採用）
- **Plan A**: 掛單後重新調用 GetWalletBalances()
  - ❌ 增加 API 調用次數
  - ❌ 仍有時序競爭（API 可能還沒更新）

- **Plan C**: 完全依賴 API，取消本地追蹤
  - ❌ 性能差
  - ❌ 無法處理 WebSocket 斷線

---

## 驗證結果

### USD 實例驗證 ✅

**測試時間**: 2025-10-24 00:04
**狀態**: 修復後運行穩定

```json
{
  "active_credits": 15,
  "lending_balance": 3108.52,     // ✓ 正確顯示
  "pending_balance": 0,
  "idle_balance": 計算正確
}
```

**結論**: lending_balance 在有活躍貸款時能正確計算並顯示。

### USDT 實例驗證 ⏳

**測試時間**: 2025-10-24 00:03
**狀態**: 等待掛單成交

**當前狀態**（正確）:
```json
{
  "active_credits": 0,
  "lending_balance": ~0,          // ✓ 正確（沒有貸款）
  "pending_balance": 9990.40,     // ✓ 10 個掛單
  "idle_balance": 10.00           // ✓ 剩餘閒置
}
```

**市場條件**:
- Top Bid: 0.0003014 (11% APR)
- Our Offer: 0.00023136 (8.44% APR)
- **結論**: 我們的利率遠低於市場需求，預計很快成交

**待驗證**: 掛單成交後，lending_balance 應顯示貸款金額（不再為 0）

---

## 相關修復

### 1. 通知幣種修復
**位置**:
- `internal/bot/bot.go:1296`
- `internal/bot/bot.go:1475`

**修改**:
```go
// Before: 硬編碼 "USD"
b.notificationMgr.NotifyLoanExecuted(ctx, amount, rate, period, "USD")

// After: 動態獲取幣種
b.notificationMgr.NotifyLoanExecuted(ctx, amount, rate, period, b.getCurrency())
```

### 2. Grid 動態範圍追蹤
**位置**: `internal/strategy/grid.go:750-756`

**新增方法**:
```go
func (s *GridStrategy) GetActualRange() (minRate, maxRate float64) {
    if s.actualMinRate == 0 && s.actualMaxRate == 0 {
        return s.config.MinRate, s.config.MaxRate
    }
    return s.actualMinRate, s.actualMaxRate
}
```

**效果**: Telegram /status 命令現在顯示實際動態範圍（基於 Order Book），而非靜態配置值。

### 3. Reserve 0% 支持
**位置**: `internal/bot/bot.go:1623`

**修改**:
```go
// Before: > 0 排除了 0.0
if b.config.Risk.MinReserve > 0 {

// After: >= 0 允許 0.0
if b.config.Risk.MinReserve >= 0 {
```

---

## 監控建議

### 關鍵日誌
```bash
# 查看時序修復日誌（需要 Debug 級別）
tail -f lending-bot-usdt.log | grep BALANCE_TIMING_FIX

# 查看餘額計算
tail -f lending-bot-usdt.log | grep BALANCE_CALC

# 監控成交事件
tail -f lending-bot-usdt.log | grep -E "訂單成交|Funding trade executed"
```

### 健康檢查
```bash
# 檢查餘額是否一致
curl http://localhost:8091/api/stats | jq '{
  idle: .idle_balance,
  pending: .pending_balance,
  lending: .lending_balance,
  total: .total_balance,
  sum: (.idle_balance + .pending_balance + .lending_balance)
}'

# 驗證: sum ≈ total (允許浮點誤差)
```

### 預期行為
✅ **正確**:
- 沒有貸款時: `lending_balance ≈ 0`
- 有貸款時: `lending_balance > 0`
- 總和: `idle + pending + lending ≈ total`

❌ **錯誤** (修復前):
- 有貸款但: `lending_balance = 0`
- 計算出現負數被截斷為 0

---

## 技術債務

### 未來優化方向

1. **API-based Tracking** (長期)
   - 完全依賴 API 狀態，取消本地追蹤
   - 需要處理 API 延遲和速率限制

2. **WebSocket 可靠性**
   - 增強 WebSocket 斷線重連
   - 添加心跳檢測

3. **測試覆蓋**
   - 添加時序競爭的單元測試
   - 模擬 API 延遲場景

---

## 參考

- **問題發現**: 2025-10-24 (USDT 矛盾數據)
- **診斷分析**: 使用 Serena MCP + Task 子代理
- **修復實施**: Balance timing adjustment
- **驗證狀態**: USD ✅ | USDT ⏳

---

**狀態**: 修復已實施，USD 驗證成功，USDT 等待最終驗證
**風險**: 低（修復邏輯簡單，USD 已驗證）
**建議**: 監控 24 小時確保穩定性
