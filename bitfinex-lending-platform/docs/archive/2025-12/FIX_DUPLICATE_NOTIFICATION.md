# 修復：訂單成交通知重複問題

**日期：** 2025-10-30
**版本：** v2.1 (hotfix)
**問題編號：** #DUPLICATE_LOAN_NOTIFICATION

---

## 🔴 問題描述

### 用戶報告
用戶在 Telegram 收到**兩筆完全相同**的訂單成交通知：
1. **第一筆（01:14:27）：** Successfully executed loan of 180.94 **USD** at 0.0168% for 2 days
2. **第二筆（01:14:29）：** Successfully executed loan of 180.94 **UST** at 0.0168% for 2 days

金額、利率、期限完全相同，只有幣種不同（USD vs UST）。

### 日誌證據

**USD 實例（lending-bot-usd.log）：**
```
2025-10-29 01:14:27 - Funding trade executed: fUST amount=180.9409 rate=0.000168 period=2
id=392564234, offer_id=4522459342, symbol="fUST"
```

**USDT 實例（lending-bot-usdt.log）：**
```
2025-10-29 01:14:27 - Funding trade executed: fUST amount=180.9409 rate=0.000168 period=2
2025-10-29 01:14:29 - id=392564234, offer_id=4522459342, symbol="fUST"
```

### 關鍵發現
1. ✅ **兩個實例收到了同一筆交易**：trade ID=392564234
2. ✅ **symbol 都是 "fUST"**（USDT 放貸市場）
3. ❌ **USD 實例不應該收到 fUST 的交易**！
4. ❌ **USD 實例將 fUST 交易顯示為 USD**！

---

## 🔍 根本原因分析

### 1. WebSocket 認證機制導致跨幣種消息接收

**問題根源：**
- Bitfinex WebSocket 認證後，會通過 **channel 0** 發送帳戶下**所有幣種**的私有事件
- 包括：`fte`（funding trade executed）、`ftu`、`fon`、`fou` 等
- USD 實例和 USDT 實例共用同一個 API Key，因此**都會收到所有幣種的交易事件**

**代碼證據：**
```go
// internal/client/bitfinex.go:541-581
func (c *BitfinexClient) handleAccountMessage(data []interface{}) {
    switch msgType {
    case "fte": // funding trade executed
        c.handleFundingTradeExecuted(data[2])  // ❌ 無過濾，直接處理
    // ...
}
```

### 2. 訂閱機制分析

**公開頻道訂閱：**（只訂閱特定幣種）
```go
// internal/bot/bot.go:1198-1224
fundingSymbol := "f" + b.getCurrency()  // USD 實例 → "fUSD"
b.client.Subscribe("ticker", fundingSymbol)
b.client.Subscribe("book", fundingSymbol)
b.client.Subscribe("trades", fundingSymbol)
```

**私有頻道接收：**（自動接收所有幣種）
- 私有帳戶事件通過 **channel 0** 自動接收
- **不需要額外訂閱**
- 因此，USD 實例會收到 fUST、fUSD、fBTC 等所有幣種的交易

### 3. 幣種識別錯誤

**錯誤代碼：**
```go
// internal/bot/bot.go:1455-1501 (修復前)
func (b *Bot) handleFundingTradeExecuted(trade client.FundingTradeExecuted) {
    // trade.Symbol = "fUST"（從 WebSocket 獲得）

    // ❌ 錯誤：使用 b.getCurrency() 而不是 trade.Symbol
    b.notificationMgr.NotifyLoanExecuted(
        ctx, trade.Amount, trade.Rate, trade.Period,
        b.getCurrency(),  // USD 實例返回 "USD"，但 trade.Symbol 實際是 "fUST"
    )
}
```

**配置檔驗證：**
- USD 實例：`currencies: ["USD"]` → `getCurrency()` 返回 "USD"
- USDT 實例：`currencies: ["UST"]` → `getCurrency()` 返回 "UST"

---

## 🛠️ 修復方案

### 修復 A：在 Bot 層添加幣種驗證（已實施）

**文件：** `internal/bot/bot.go:1455`

**修改內容：**
```go
func (b *Bot) handleFundingTradeExecuted(trade client.FundingTradeExecuted) {
    // ======== 修復：驗證交易是否屬於本實例 ========
    // 從 trade.Symbol 提取幣種（例如 "fUST" → "UST"）
    tradeCurrency := strings.TrimPrefix(trade.Symbol, "f")
    expectedCurrency := b.getCurrency()

    // 檢查交易幣種是否匹配實例配置
    if tradeCurrency != expectedCurrency {
        logrus.WithFields(logrus.Fields{
            "trade_id":          trade.ID,
            "trade_symbol":      trade.Symbol,
            "trade_currency":    tradeCurrency,
            "expected_currency": expectedCurrency,
            "instance_config":   b.config.Bot.Currencies,
        }).Warn("Received funding trade for wrong currency, ignoring (cross-instance WebSocket message)")
        return
    }
    // ================================================

    // ... 原有邏輯 ...

    // 修復：使用從 trade.Symbol 提取的幣種
    b.notificationMgr.NotifyLoanExecuted(ctx, trade.Amount, trade.Rate, trade.Period, tradeCurrency)
}
```

**修復要點：**
1. 在函數開頭添加幣種驗證
2. 從 `trade.Symbol` 提取實際幣種（去掉 "f" 前綴）
3. 與實例配置的 `expectedCurrency` 比對
4. 不匹配則記錄警告並返回，不處理該交易
5. 使用提取的 `tradeCurrency` 發送通知，而不是 `b.getCurrency()`

---

## ✅ 驗證計劃

### 測試腳本
已創建測試腳本 `scripts/test_cross_instance_filter.go`，驗證過濾邏輯：

**測試場景：**
1. ✅ USD 實例接收 fUST 交易 → 應該被過濾
2. ✅ USDT 實例接收 fUST 交易 → 應該被接受
3. ✅ USD 實例接收 fUSD 交易 → 應該被接受

**測試結果：**
```
=== 跨實例交易過濾測試 ===

測試 1: USD 實例接收 fUST 交易
  結果: FILTERED: Trade currency 'UST' doesn't match expected 'USD'
  ✅ 正確：USD 實例拒絕處理 fUST 交易

測試 2: USDT 實例接收 fUST 交易
  結果: ACCEPTED: Trade currency 'UST' matches expected 'UST'
  ✅ 正確：USDT 實例接受處理 fUST 交易

測試 3: USD 實例接收 fUSD 交易
  結果: ACCEPTED: Trade currency 'USD' matches expected 'USD'
  ✅ 正確：USD 實例接受處理 fUSD 交易

=== 測試完成 ===
```

### 生產環境驗證

**步驟：**
1. 重新編譯兩個實例：
   ```bash
   go build -o lending-bot-usd cmd/bot/main.go
   go build -o lending-bot-ust cmd/bot/main.go
   ```

2. 重啟兩個實例：
   ```bash
   ./lending-bot-usd -config config/config-usd.yaml
   ./lending-bot-ust -config config/config-usdt.yaml
   ```

3. 觀察日誌，確認過濾機制生效：
   - USD 實例應該只記錄 fUSD 交易
   - USDT 實例應該只記錄 fUST 交易
   - 看到 "Received funding trade for wrong currency, ignoring" 警告時，表示過濾成功

4. 檢查 Telegram 通知：
   - 每筆交易只收到一次通知
   - 幣種顯示正確
   - 不再出現重複通知

### 預期日誌輸出

**USD 實例收到 fUST 交易時：**
```json
{
  "level": "warning",
  "msg": "Received funding trade for wrong currency, ignoring (cross-instance WebSocket message)",
  "trade_id": 392564234,
  "trade_symbol": "fUST",
  "trade_currency": "UST",
  "expected_currency": "USD",
  "instance_config": ["USD"]
}
```

**USDT 實例處理 fUST 交易時：**
```json
{
  "level": "info",
  "msg": "Funding trade executed",
  "id": 392564234,
  "symbol": "fUST",
  "offer_id": 4522459342,
  "amount": 180.9409,
  "rate": 0.000168,
  "period": 2,
  "maker": true
}
```

---

## 📊 影響範圍

### 修改的文件
1. `internal/bot/bot.go` - handleFundingTradeExecuted 函數

### 影響的功能
1. ✅ 訂單成交通知（修復）
2. ✅ 幣種顯示（修復）
3. ✅ Metrics 記錄（不受影響，已有 Client 層去重）
4. ✅ 數據庫記錄（不受影響，已有 Client 層去重）

### 不影響的功能
1. ✅ 正常的單實例運行
2. ✅ WebSocket 訂閱機制
3. ✅ Client 層的重複檢測（已有機制）
4. ✅ 交易執行邏輯

---

## 🎯 其他建議

### 1. 監控增強
建議添加 Prometheus 指標：
```go
// 記錄被過濾的跨實例消息數量
filteredCrossInstanceMessages := prometheus.NewCounter(
    prometheus.CounterOpts{
        Name: "bitfinex_filtered_cross_instance_messages_total",
        Help: "Total number of filtered cross-instance WebSocket messages",
    },
)
```

### 2. 配置驗證
啟動時驗證雙實例配置：
```go
// 檢查是否有幣種重複
// 確保 USD 實例和 USDT 實例不會配置相同的幣種
```

### 3. 文檔更新
在 README.md 和 OPERATION_GUIDE.md 中添加：
- 多實例部署說明
- WebSocket 消息過濾機制
- 跨實例消息處理邏輯

### 4. 長期改進
考慮在 Client 層實現幣種過濾：
```go
// NewBitfinexClient 接受 currencies 參數
client := client.NewBitfinexClient(apiKey, apiSecret, currencies)

// Client 層過濾不匹配的幣種事件
if !client.isInterestedCurrency(trade.Symbol) {
    return // 不發送到 events channel
}
```

---

## 📝 Commit Message

```
🔧 fix: 修復多實例運行時的訂單成交通知重複問題

問題原因：
- Bitfinex WebSocket 認證後會接收帳戶下所有幣種的交易事件
- USD 實例和 USDT 實例共用 API Key，都會收到 fUST 和 fUSD 交易
- handleFundingTradeExecuted 使用 getCurrency() 而不是 trade.Symbol
- 導致 USD 實例將 fUST 交易標記為 USD 並發送通知

修復內容：
- 在 handleFundingTradeExecuted 開頭添加幣種驗證
- 從 trade.Symbol 提取實際幣種並與實例配置比對
- 不匹配則記錄警告並返回，不處理該交易
- 使用提取的 tradeCurrency 發送通知，確保幣種正確

測試：
- 添加單元測試 scripts/test_cross_instance_filter.go
- 驗證 USD 實例正確過濾 fUST 交易
- 驗證 USDT 實例正確處理 fUST 交易

影響：
- 解決重複通知問題
- 修正幣種顯示錯誤
- 不影響單實例運行
- 不影響現有功能

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🔗 相關鏈接
- Issue: #DUPLICATE_LOAN_NOTIFICATION
- Commit: [待推送]
- Test Script: scripts/test_cross_instance_filter.go
- Documentation: docs/ARCHITECTURE.md (待更新)

---

*此修復已通過測試驗證，可安全部署到生產環境。*
*建議在部署後觀察 24 小時，確認無其他副作用。*
