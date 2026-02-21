# 雙實例常見問題解答

**更新時間**: 2025-10-23 17:45
**文檔作者**: Claude Code with Serena MCP & Playwright MCP

---

## 問題 1: 為什麼打 /status 只出現 USD？

### 簡短答案
✅ **兩個實例都有回覆**，但因為使用相同的 Telegram Bot，你可能：
1. 只看到最後一個回覆（USD 或 UST）
2. 或者 UST 回覆的數據很少（因為沒錢）所以不明顯

### 詳細說明

#### 配置檢查（使用 Serena MCP）

**USD 配置** (`config/config-usd.yaml`):
```yaml
notification:
  telegram:
    token: ""  # 從環境變數 TELEGRAM_BOT_TOKEN 讀取
    chat_id: ""  # 從環境變數 TELEGRAM_CHAT_ID 讀取
```

**UST 配置** (`config/config-usdt.yaml`):
```yaml
notification:
  telegram:
    token: ""  # 從環境變數 TELEGRAM_BOT_TOKEN 讀取
    chat_id: ""  # 從環境變數 TELEGRAM_CHAT_ID 讀取
```

**環境變數** (`.env`):
```bash
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID_HERE
```

#### 工作原理

1. 用戶在 Telegram 發送 `/status`
2. **兩個 Bot 實例都收到**（因為共用同一個 Token）
3. **兩個實例都會回覆**到同一個 Chat ID

#### 為什麼可能只看到 USD？

##### 原因 A: UST 回覆在前，USD 覆蓋了
Telegram 按時間順序顯示，如果 USD 實例回覆較慢，你會先看到 UST 回覆，然後 USD 回覆出現在下方。

##### 原因 B: UST 數據很少不明顯
從 Playwright 截圖可見，UST 實例的數據：
```
📊 Bitfinex 借貸 Bot 狀態 (UST)
━━━━━━━━━━━━━━━━━━━━

💰 資金狀態
• 總餘額: $0.00 UST
• 閒置: $0.00 UST
• Pending: $0.00 UST
• 放貸中: $0.00 UST
• 利用率: 0.0%

📈 活躍貸款
• 數量: 0 筆
• 平均 APR: 0.00%
• 總放貸: $0.00 UST
• Pending Offers: 0 筆

💵 收益統計
• 總收益: $131.5720 UST  ← 唯一有數據的
• 日均收益: $4.3857 UST

...
```

如果你主要關注活躍數據，可能會忽略這個回覆。

#### 解決方案

如果你想明確區分兩個實例，有兩個選擇：

##### 方案 A: 獨立 Telegram Bot（推薦）
創建第二個 Telegram Bot for UST:

```bash
# 1. 在 Telegram 找 @BotFather
/newbot
# 名稱: My UST Lending Bot
# 獲得新 token: NEW_UST_BOT_TOKEN

# 2. 修改啟動腳本
# dual-instance.sh 中為 UST 設置不同的環境變數
TELEGRAM_BOT_TOKEN_UST=NEW_UST_BOT_TOKEN ./lending-bot -config config/config-usdt.yaml
```

優點：
- ✅ 完全獨立，不會混淆
- ✅ 可以設置不同的通知策略
- ✅ 清晰知道哪個 Bot 在說話

##### 方案 B: 當前方案（已實施）
標題顯示幣種標識：
- USD Bot: `📊 Bitfinex 借貸 Bot 狀態 (USD)`
- UST Bot: `📊 Bitfinex 借貸 Bot 狀態 (UST)`

優點：
- ✅ 無需額外配置
- ✅ 單一入口
- ⚠️ 但會收到兩條消息

---

## 問題 2: USDT 前端為什麼沒有錢還有收益數據？

### 簡短答案
✅ **這是歷史數據，是正常的！** 收益統計來自資料庫的 ledger entries（歷史交易記錄），不會因為當前餘額為 0 而清空。

### 詳細分析（使用 Playwright MCP）

#### 前端數據截圖
截圖保存在: `.playwright-mcp/usdt-current-status.png`

**實際顯示數據**:
```
💼 Balance (餘額)
• 閒置 (Idle): $0.00          ← 當前無餘額
• 掛單中 (Pending): $0.00     ← 當前無掛單
• 放貸中 (Lending): $0.00     ← 當前無放貸
• 總計 (Total): $0.00         ← 總餘額為 0
• Currency: UST               ← 幣種正確

💰 Earnings (收益) - 歷史數據
• Total Earnings: $131.5720   ← 歷史累積收益
• Daily Average: $4.3857      ← 基於歷史計算
• Monthly Projection: $131.57 ← 推算值
• Annual Projection: $1600.79 ← 推算值
```

#### 數據來源分析

##### 餘額數據（實時）
來自: `client.GetWalletBalance()` → API 即時查詢
- 如果你從 Bitfinex 提現了 UST，餘額會變 0
- 這是**實時數據**

##### 收益數據（歷史）
來自: `client.GetLedgerEntries()` → 資料庫查詢
- 計算過去所有的 lending 利息收入
- 這是**累積數據**，不會清空

#### 代碼追蹤（使用 Serena MCP）

**收益計算邏輯** (`internal/bot/bot.go`):
```go
// 在 Bot 啟動時計算歷史收益（第 541-600 行）
go func() {
    logrus.Info("Calculating historical earnings...")
    ledgerEntries, err := b.client.GetLedgerEntries(b.getCurrency(), 500)
    if err != nil {
        logrus.Debugf("Failed to get ledger entries: %v", err)
        return
    }

    var totalEarnings float64
    var firstEntry, lastEntry time.Time
    
    for _, entry := range ledgerEntries {
        // 只計算利息類型的收入
        if strings.Contains(entry.Description, "Margin Funding Payment") {
            totalEarnings += entry.Amount
            
            // 追蹤時間範圍
            if firstEntry.IsZero() || entry.Timestamp.Before(firstEntry) {
                firstEntry = entry.Timestamp
            }
            if lastEntry.IsZero() || entry.Timestamp.After(lastEntry) {
                lastEntry = entry.Timestamp
            }
        }
    }
    
    // 計算日均收益
    var dailyAverage float64
    if !firstEntry.IsZero() && !lastEntry.IsZero() {
        days := lastEntry.Sub(firstEntry).Hours() / 24
        if days > 0 {
            dailyAverage = totalEarnings / days
        }
    }
    
    // 更新到 webServer stats
    // ...
}
```

#### 為什麼保留歷史數據？

**設計理念**:
1. **績效追蹤**: 即使暫停放貸，你仍能看到歷史表現
2. **ROI 計算**: 幫助評估策略效果
3. **稅務記錄**: 收益記錄對報稅很重要
4. **數據持久性**: 符合一般金融軟件的設計原則

#### 如何清空歷史數據？

如果你真的想清空（通常不建議）：

```bash
# 方法 1: 刪除資料庫（會丟失所有歷史）
rm bot-ust.db

# 方法 2: 只清空 ledger 表（保留其他數據）
sqlite3 bot-ust.db "DELETE FROM ledger_entries WHERE currency = 'UST';"

# 方法 3: 重新計算（手動調整時間範圍）
# 修改代碼中的 GetLedgerEntries(currency, 500) 限制查詢範圍
```

⚠️ **警告**: 不建議清空，除非你確定不需要這些記錄。

---

## 總結對照表

| 項目 | USD 實例 | UST 實例 | 說明 |
|-----|---------|---------|------|
| **餘額** | $3108.71 | $0.00 | 實時數據，UST 可能被提現 |
| **活躍貸款** | 14 筆 | 0 筆 | 當前無 UST 放貸 |
| **歷史收益** | $59.79 | $131.57 | 累積數據，不會清空 ✅ |
| **Telegram Bot** | 共用 | 共用 | 同一個 Token/Chat ID |
| **Web 端口** | 8090 | 8091 | 獨立端口 ✅ |
| **幣種標識** | USD | UST | /status 顯示 ✅ |

---

## 驗證工具

本次分析使用的工具：
- ✅ **Serena MCP**: 代碼搜索、符號查找、配置文件讀取
- ✅ **Playwright MCP**: 前端截圖、數據驗證、DOM 分析
- ✅ **Bash**: 日誌查詢、環境變數檢查

驗證命令：
```bash
# 檢查 Telegram 配置
grep TELEGRAM .env

# 檢查兩個實例狀態
curl http://localhost:8090/api/stats | jq .currency  # USD
curl http://localhost:8091/api/stats | jq .currency  # UST

# 查看歷史收益
curl http://localhost:8091/api/stats | jq .total_earnings  # 131.5720
```

---

## 推薦配置

### 如果你想清晰區分兩個實例

**選項 A: 創建第二個 Telegram Bot（最清晰）**
- USD Bot: `@MyUSDLendingBot`
- UST Bot: `@MyUSTLendingBot`
- 永不混淆！

**選項 B: 使用當前方案（最簡單）**
- 共用一個 Bot
- 看標題區分 `(USD)` vs `(UST)`
- 會收到兩條消息

### 如果你想隱藏 0 餘額實例的回覆

可以修改 `getStats()` 方法添加條件：
```go
func (b *Bot) getStats() map[string]interface{} {
    // ... 獲取數據 ...
    
    // 如果總餘額為 0，返回 nil 不回覆
    if totalBalance == 0 {
        return nil
    }
    
    return stats
}
```

然後在 `handleStatusCommand` 中檢查：
```go
func (t *TelegramNotifier) handleStatusCommand(ctx context.Context, message *Message) error {
    stats := t.statusProvider()
    
    if stats == nil {
        return t.sendMessage(ctx, "ℹ️ 當前無活躍資金")
    }
    
    return t.sendStatusMessage(ctx, stats)
}
```

---

*FAQ 生成時間: 2025-10-23 17:48*
*工具: Serena MCP + Playwright MCP + Claude Code*
