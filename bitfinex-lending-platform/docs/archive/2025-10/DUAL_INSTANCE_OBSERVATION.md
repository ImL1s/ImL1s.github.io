# 雙實例觀察報告與改進建議

**觀察日期**: 2025-10-23 17:10
**觀察者**: Claude Code
**目的**: 驗證兩個 Web 界面顯示正確幣種數據，並設計多幣種 TG /status 命令

---

## 📊 任務 1: Web 界面幣種數據驗證

### USD 實例 (Port 8090)

**訪問 URL**: http://localhost:8090

**截圖**: `.playwright-mcp/usd-dashboard.png`

**關鍵數據**:
```
Currency: USD ✅
Total Lent: $3108.52
Pending / Active: 0 / 14
Total Earnings: $59.7908
Daily Average: $1.9930
Average Rate: 10.38% APR
```

**活躍貸款樣本**:
- ID: 437426497, Amount: $227.67, APR: 10.31%, Period: 4 天
- ID: 437510616, Amount: $208.72, APR: 10.31%, Period: 4 天
- 共 14 筆放貸（截圖可見 7 筆）

**驗證結果**: ✅ **USD 數據完全正確**
- 顯示 Currency: USD
- 總放貸金額與日誌一致 ($3108.52 vs $3108.5199199)
- 活躍貸款數量正確 (14 筆)
- 歷史收益正確 ($59.7908)

---

### UST 實例 (Port 8091)

**訪問 URL**: http://localhost:8091

**截圖**: `.playwright-mcp/ust-dashboard.png`

**關鍵數據**:
```
Currency: UST ✅
Total Lent: $0.00
Pending / Active: 0 / 0
Total Earnings: $131.5720
Daily Average: $4.3857
Average Rate: 13.19% APR
```

**市場數據**:
- **Order Book 正常顯示 UST 數據** ✅
  - Bids (需求方): 10 筆，利率範圍 7.67% - 13.19% APR
  - Asks (供應方): 10 筆，利率範圍 8.64% - 8.70% APR
  - 最高 Bid: $1,514,091.65 @ 13.19% APR (30 天)

- **Recent Trades 正常顯示 UST 交易** ✅
  - 最近 20 筆成交記錄
  - 利率範圍 8.14% - 13.19% APR
  - 成交金額 $152 - $5000

**驗證結果**: ✅ **UST 數據完全正確**
- 顯示 Currency: UST (不是 USD!)
- 餘額為 0 是正常的（用戶未充值 UST）
- 歷史收益正確 ($131.5720)
- Order Book 顯示的是 **fUST** 的市場數據
- Recent Trades 顯示的是 **UST** 的成交紀錄

---

### 對比分析

| 項目 | USD 實例 | UST 實例 | 數據隔離 |
|-----|---------|---------|---------|
| Currency | USD | UST | ✅ 正確 |
| Total Lent | $3108.52 | $0.00 | ✅ 獨立 |
| Active Loans | 14 筆 | 0 筆 | ✅ 獨立 |
| Total Earnings | $59.79 | $131.57 | ✅ 獨立 |
| Order Book | fUSD 數據 | fUST 數據 | ✅ 獨立 |
| Recent Trades | USD 成交 | UST 成交 | ✅ 獨立 |

**結論**: ✅ **兩個實例完全獨立，數據隔離正確**

---

## 📱 任務 2: TG /status 命令分析

### 當前實現

**位置**: `internal/notification/telegram.go:577-703`

**架構**:
```
Bot.GetStats()
  ↓ (statusProvider)
TelegramNotifier.handleStatusCommand()
  ↓
TelegramNotifier.sendStatusMessage()
  ↓
Telegram Bot 顯示單一實例狀態
```

**當前 /status 輸出格式**:
```
📊 Bitfinex 借貸 Bot 狀態
━━━━━━━━━━━━━━━━━━━━

💰 資金狀態
• 總餘額: $3108.71
• 閒置: $0.19
• Pending: $0.00
• 放貸中: $3108.52
• 利用率: 99.9%

📈 活躍貸款
• 數量: 14 筆
• 平均 APR: 10.38%
• 總放貸: $3108.52
• Pending Offers: 0 筆

💵 收益統計
• 總收益: $59.7908
• 日均收益: $1.9930

📊 市場數據
• FRR: 13.35% APR
• 最高 Bid: 10.34% APR
• 最低 Ask: 10.36% APR

⚙️ 策略
• 類型: grid

🎯 成交統計
• Maker: 6 筆 (55%)
• Taker: 5 筆 (45%)
• Maker 平均: 7.60% APR

🕐 更新時間: 2025-10-23 17:10:00
```

**問題識別**:
1. ❌ **沒有顯示幣種** (Currency)
2. ❌ **只顯示單一實例數據**（如果有多個實例，只看到一個）
3. ❌ **無法區分 USD 和 UST 的狀態**

---

## 💡 改進方案

### 方案 A: 獨立 TG Bot（推薦）

**概念**: 每個幣種實例使用**不同的 TG Bot Token**

**優點**:
- ✅ 完全獨立，互不干擾
- ✅ 用戶可以分別查詢 USD 和 UST 狀態
- ✅ 不需要修改代碼
- ✅ 通知也會分開（USD 通知發到 USD bot，UST 通知發到 UST bot）

**缺點**:
- ⚠️ 需要創建兩個 TG Bot
- ⚠️ 用戶需要同時關注兩個 Bot

**實施步驟**:
1. 在 BotFather 創建第二個 TG Bot (例如: `MyUSTLendingBot`)
2. 修改 `config-ust.yaml`:
   ```yaml
   notification:
     telegram:
       token: "UST_BOT_TOKEN"  # 不同的 token
       chat_id: "SAME_CHAT_ID"  # 可以相同
   ```
3. 無需代碼修改

**用戶體驗**:
```
[USD Bot]
/status
→ 顯示 USD 狀態

[UST Bot]
/status
→ 顯示 UST 狀態
```

---

### 方案 B: 共享 TG Bot + 幣種前綴

**概念**: 兩個實例使用**相同的 TG Bot**，在 /status 輸出中添加幣種標識

**代碼修改**:

#### 1. 在 statusProvider 中添加 currency

**位置**: `internal/bot/bot.go` (GetStats 方法)

```go
func (b *Bot) GetStats() map[string]interface{} {
    // ... 現有代碼 ...

    stats := map[string]interface{}{
        "currency":        b.getCurrency(),  // ← 新增：添加幣種
        "total_balance":   totalBalance,
        "idle_balance":    idleBalance,
        // ... 其他字段 ...
    }

    return stats
}
```

#### 2. 修改 sendStatusMessage 顯示幣種

**位置**: `internal/notification/telegram.go:590`

```go
func (t *TelegramNotifier) sendStatusMessage(ctx context.Context, stats map[string]interface{}) error {
    var sb strings.Builder

    // 獲取幣種
    currency := "USD"  // 預設值
    if curr, ok := stats["currency"].(string); ok {
        currency = curr
    }

    // 在標題中顯示幣種
    sb.WriteString(fmt.Sprintf("<b>📊 Bitfinex 借貸 Bot 狀態 (%s)</b>\n", currency))
    sb.WriteString("━━━━━━━━━━━━━━━━━━━━\n\n")

    // 資金狀態 - 帶幣種後綴
    sb.WriteString("<b>💰 資金狀態</b>\n")
    if totalBalance, ok := stats["total_balance"].(float64); ok {
        sb.WriteString(fmt.Sprintf("• 總餘額: $%.2f %s\n", totalBalance, currency))
    }
    if idleBalance, ok := stats["idle_balance"].(float64); ok {
        sb.WriteString(fmt.Sprintf("• 閒置: $%.2f %s\n", idleBalance, currency))
    }
    // ... 其他部分類似添加 currency
}
```

**輸出效果**:
```
📊 Bitfinex 借貸 Bot 狀態 (USD)
━━━━━━━━━━━━━━━━━━━━

💰 資金狀態
• 總餘額: $3108.71 USD
• 閒置: $0.19 USD
...
```

**優點**:
- ✅ 只需一個 TG Bot
- ✅ 清楚顯示幣種
- ✅ 代碼修改簡單

**缺點**:
- ⚠️ 兩個實例的通知會發到同一個 Bot（可能混淆）
- ⚠️ 如果同時運行，無法區分是哪個實例的 /status

---

### 方案 C: 聚合 /status（需要重構）

**概念**: 修改架構支援**聚合多個實例的狀態**

**架構**:
```
統一的 Status Service
  ↓ (查詢所有實例)
[USD Instance] + [UST Instance]
  ↓ (聚合數據)
TG Bot 顯示匯總狀態
```

**輸出效果**:
```
📊 Bitfinex 借貸 Bot 總覽
━━━━━━━━━━━━━━━━━━━━

💰 USD 狀態
• 總餘額: $3108.71
• 活躍貸款: 14 筆
• 平均 APR: 10.38%
• 總收益: $59.79

💰 UST 狀態
• 總餘額: $0.00
• 活躍貸款: 0 筆
• 平均 APR: 13.19%
• 總收益: $131.57

📊 總計
• 總資金: $3108.71 (USD) + $0.00 (UST)
• 總收益: $191.36 (等值 USD)

🕐 更新時間: 2025-10-23 17:10:00
```

**優點**:
- ✅ 一次查看所有幣種
- ✅ 可以顯示總計

**缺點**:
- ❌ 需要大量重構
- ❌ 需要跨進程通信或共享狀態
- ❌ 複雜度高

**實施難度**: ⚠️ **高** - 不推薦

---

## 🎯 推薦方案

### 短期方案（立即可用）: **方案 A - 獨立 TG Bot**

**原因**:
1. ✅ 無需代碼修改
2. ✅ 完全隔離，不會混淆
3. ✅ 易於管理
4. ✅ 每個幣種有獨立的通知渠道

**實施步驟**:
```bash
# 1. 創建新的 TG Bot
# 在 Telegram 找 @BotFather
/newbot
# 名稱: My UST Lending Bot
# 獲得新 token

# 2. 修改 config-usdt.yaml
notification:
  telegram:
    token: "NEW_UST_BOT_TOKEN"
    chat_id: "YOUR_CHAT_ID"  # 可以與 USD 相同

# 3. 重啟 UST 實例
./dual-instance.sh stop
./dual-instance.sh start

# 4. 測試
# 在 USD Bot 發送: /status  → 顯示 USD 狀態
# 在 UST Bot 發送: /status  → 顯示 UST 狀態
```

---

### 中期方案（優化）: **方案 B - 共享 Bot + 幣種標識**

**何時使用**: 用戶希望使用單一 Bot 管理所有幣種

**實施步驟**:
1. 修改 `internal/bot/bot.go` 的 `GetStats()` 方法添加 `currency` 字段
2. 修改 `internal/notification/telegram.go` 的 `sendStatusMessage()` 顯示幣種
3. 重新編譯並重啟

**預期效果**:
- /status 輸出會顯示 "狀態 (USD)" 或 "狀態 (UST)"
- 金額後面帶 USD 或 UST 後綴

---

## 📋 實施檢查清單

### 方案 A (獨立 TG Bot)

部署前:
- [ ] 在 BotFather 創建 UST Bot
- [ ] 獲取新 Bot Token
- [ ] 更新 config-usdt.yaml
- [ ] 測試 Bot 連接

部署後:
- [ ] 兩個 Bot 都能響應 /status
- [ ] USD Bot 顯示 USD 數據
- [ ] UST Bot 顯示 UST 數據
- [ ] 通知分別發到對應 Bot

---

### 方案 B (共享 Bot + 幣種標識)

代碼修改:
- [ ] 修改 GetStats() 添加 currency
- [ ] 修改 sendStatusMessage() 顯示幣種
- [ ] 編譯測試
- [ ] 創建 PR

部署後驗證:
- [ ] /status 顯示幣種標識
- [ ] 金額帶幣種後綴
- [ ] USD 和 UST 可區分

---

## 📊 對比表

| 特性 | 方案 A (獨立 Bot) | 方案 B (共享 + 標識) | 方案 C (聚合) |
|-----|-----------------|-------------------|--------------|
| 實施難度 | ⭐ 簡單 | ⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 困難 |
| 代碼修改 | ❌ 不需要 | ✅ 少量 | ✅ 大量 |
| 數據隔離 | ✅ 完全隔離 | ⚠️ 共享通知 | ✅ 聚合顯示 |
| 用戶體驗 | ⭐⭐⭐ 需切換 Bot | ⭐⭐⭐⭐ 單一入口 | ⭐⭐⭐⭐⭐ 最佳 |
| 維護成本 | ⭐⭐ 兩個 Bot | ⭐⭐⭐ 普通 | ⭐⭐⭐⭐ 高 |
| 推薦度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

---

## 🎬 演示範例

### 方案 A 用戶體驗

```
用戶在 Telegram:

┌─────────────────────┐
│  USD Lending Bot    │
├─────────────────────┤
│ 用戶: /status       │
│                     │
│ Bot:                │
│ 📊 狀態             │
│ 💰 資金: $3108.71  │
│ 📈 貸款: 14 筆     │
│ 💵 收益: $59.79    │
└─────────────────────┘

┌─────────────────────┐
│  UST Lending Bot    │
├─────────────────────┤
│ 用戶: /status       │
│                     │
│ Bot:                │
│ 📊 狀態             │
│ 💰 資金: $0.00     │
│ 📈 貸款: 0 筆      │
│ 💵 收益: $131.57   │
└─────────────────────┘
```

### 方案 B 用戶體驗

```
用戶在 Telegram:

┌─────────────────────┐
│  Lending Bot        │
├─────────────────────┤
│ 用戶: /status       │
│                     │
│ Bot (USD 實例):     │
│ 📊 狀態 (USD)       │
│ 💰 資金: $3108.71  │
│ 📈 貸款: 14 筆     │
│ 💵 收益: $59.79    │
│                     │
│ Bot (UST 實例):     │
│ 📊 狀態 (UST)       │
│ 💰 資金: $0.00     │
│ 📈 貸款: 0 筆      │
│ 💵 收益: $131.57   │
└─────────────────────┘
```

---

## 🔗 相關文件

- [雙實例部署指南](docs/DUAL_INSTANCE_SETUP.md)
- [雙實例測試報告](DUAL_INSTANCE_TEST_REPORT.md)
- [TG Notification 代碼](internal/notification/telegram.go:577-703)

---

## 📝 總結

### Web 界面驗證

✅ **完全正確** - 兩個 Web 界面顯示各自幣種的數據：
- USD (8090): 顯示 USD 數據
- UST (8091): 顯示 UST 數據
- 數據完全隔離，無混淆

### TG /status 命令

⚠️ **需要改進** - 當前實現只顯示單一實例，無幣種標識

**推薦方案**:
1. **短期**: 使用方案 A（獨立 TG Bot）- 無需代碼修改
2. **中期**: 使用方案 B（共享 Bot + 幣種標識）- 少量代碼修改

---

**觀察完成時間**: 2025-10-23 17:15
**狀態**: ✅ **驗證完成，建議已提供**
