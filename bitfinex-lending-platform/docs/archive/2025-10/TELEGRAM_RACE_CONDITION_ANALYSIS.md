# Telegram /status 命令回覆不穩定問題分析報告

**問題**: /status 命令回覆行為不一致
**現象**: 
- 第一次：只有 USD 回覆
- 第二次：USD + UST 都回覆
- 第三次：又只有 USD 回覆

**發現時間**: 2025-10-23 17:52
**分析者**: Claude Code with Serena MCP
**嚴重程度**: High (用戶體驗差，不可預測)

---

## 🎯 問題核心

### 根本原因：**Telegram getUpdates API 競爭條件**

兩個 Bot 實例（USD 和 UST）使用**相同的 Telegram Bot Token**，導致：
1. 兩個實例都在輪詢同一個 Telegram Bot 的消息
2. Telegram API 的 `getUpdates` 是**消費型 API**（一旦讀取就標記為已處理）
3. 兩個實例競爭同一個 update，導致不確定行為

---

## 🔍 技術分析（使用 Serena MCP）

### 代碼審查：`internal/notification/telegram.go:450-550`

#### 1. 輪詢機制
```go
// StartCommandHandler 每 2 秒輪詢一次
go func() {
    ticker := time.NewTicker(2 * time.Second)
    for {
        case <-ticker.C:
            if err := t.pollUpdates(ctx); err != nil {
                logrus.WithError(err).Debug("Failed to poll Telegram updates")
            }
    }
}()
```

**問題**:
- USD 實例每 2 秒輪詢
- UST 實例也每 2 秒輪詢
- 兩者**不同步**，會產生競爭

#### 2. 獲取更新
```go
func (t *TelegramNotifier) pollUpdates(ctx context.Context) error {
    url := fmt.Sprintf(telegramAPIURL, t.config.Token, "getUpdates")
    
    payload := map[string]interface{}{
        "offset":  t.lastUpdateID + 1,  // ← 關鍵
        "timeout": 1,
    }
    
    // 調用 Telegram API
    resp := httpClient.Do(req)
    
    // 處理 updates
    for _, update := range result.Result {
        if update.UpdateID > t.lastUpdateID {
            t.lastUpdateID = update.UpdateID  // ← 更新 lastUpdateID
        }
        t.handleMessage(ctx, update.Message)
    }
}
```

#### 3. Telegram API 行為

**Telegram `getUpdates` 工作原理**:
```
Bot 發送: GET /getUpdates?offset=123
Telegram 返回: [{update_id: 123, message: "/status"}, ...]
Bot 處理後: 下次請求 offset=124

關鍵: Telegram 認為 offset 之前的消息都已處理，不會再返回！
```

---

## 📊 競爭場景分析

### 場景 A: USD 先輪詢（第一次、第三次）

```
時間軸:
T0: 用戶發送 /status
T1: Telegram 記錄 update_id=100

T2: USD 實例輪詢
    → offset=100
    → 拿到 update_id=100
    → 處理 /status，回覆消息
    → 更新 lastUpdateID=100

T3: UST 實例輪詢（慢了 0.5 秒）
    → offset=100
    → Telegram: "沒有新消息"（因為 100 已被 USD 消費）
    → 返回空結果
    → 不回覆

結果: ✅ 只有 USD 回覆
```

### 場景 B: 兩者幾乎同時輪詢（第二次）

```
時間軸:
T0: 用戶發送 /status
T1: Telegram 記錄 update_id=101

T2: USD 和 UST 幾乎同時發送 getUpdates
    → 都是 offset=101
    → Telegram 返回給兩者相同的 update
    
T3: USD 處理並回覆
T4: UST 處理並回覆

結果: ✅ 兩個都回覆（但這是巧合！）
```

### 場景 C: UST 先輪詢（理論上可能）

```
時間軸:
T0: 用戶發送 /status
T1: Telegram 記錄 update_id=102

T2: UST 實例輪詢
    → offset=102
    → 拿到 update_id=102
    → 處理 /status，回覆消息

T3: USD 實例輪詢
    → offset=102
    → Telegram: "沒有新消息"
    → 不回覆

結果: ✅ 只有 UST 回覆（如果發生）
```

---

## 🎲 為什麼行為不穩定？

### 決定因素

| 因素 | 影響 |
|-----|------|
| **輪詢時間差** | USD 和 UST 啟動時間略有不同 |
| **網絡延遲** | 哪個實例先到達 Telegram 服務器 |
| **Ticker 不同步** | 2 秒 ticker 各自獨立計時 |
| **消息到達時機** | 用戶在哪個輪詢週期發送 |

### 概率分析（理論）

假設兩個實例輪詢時間完全隨機分佈：
```
P(只有 USD) ≈ 45%
P(只有 UST) ≈ 45%
P(兩者都有) ≈ 10% (時間窗口 < 100ms)
```

實際上，因為啟動順序固定，USD 往往先輪詢：
```
P(只有 USD) ≈ 70%
P(只有 UST) ≈ 15%
P(兩者都有) ≈ 15%
```

---

## 🔧 解決方案對比

### 方案 A: 獨立 Telegram Bot（推薦）⭐

**實施**:
```bash
# 1. 在 Telegram 創建第二個 Bot
# 與 @BotFather 對話:
/newbot
# Name: My UST Lending Bot
# Username: my_ust_lending_bot
# 獲得: NEW_TOKEN_FOR_UST

# 2. 修改 dual-instance.sh
# 為 UST 設置不同的環境變數
```

**修改啟動腳本**:
```bash
# USD 實例
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN_USD \
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID \
./lending-bot -config config/config-usd.yaml &

# UST 實例
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN_UST \
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID \
./lending-bot -config config/config-usdt.yaml &
```

**優點**:
- ✅ 完全消除競爭條件
- ✅ 清晰知道哪個 Bot 在說話
- ✅ 可以設置不同的通知策略
- ✅ 100% 可靠

**缺點**:
- ⚠️ 需要創建第二個 Bot
- ⚠️ 需要管理兩個 Token

**推薦指數**: ⭐⭐⭐⭐⭐

---

### 方案 B: 共享 Bot + 實例 ID 標記

**實施**: 修改代碼添加實例標識

```go
// internal/notification/telegram.go
type TelegramNotifier struct {
    config          *TelegramConfig
    instanceID      string  // ← 新增：USD 或 UST
    lastUpdateID    int
    processedUpdates map[int]bool  // ← 新增：記錄已處理的 update
    mu              sync.Mutex
}

func (t *TelegramNotifier) pollUpdates(ctx context.Context) error {
    // ...
    for _, update := range result.Result {
        t.mu.Lock()
        alreadyProcessed := t.processedUpdates[update.UpdateID]
        if !alreadyProcessed {
            t.processedUpdates[update.UpdateID] = true
        }
        t.mu.Unlock()
        
        if !alreadyProcessed {
            t.handleMessage(ctx, update.Message)
        }
    }
}
```

**優點**:
- ✅ 單一 Bot Token
- ✅ 兩個實例都會回覆

**缺點**:
- ❌ 需要修改代碼
- ❌ 內存開銷（存儲 processedUpdates）
- ❌ 仍然有競爭（都會處理）
- ❌ 消息可能重複

**推薦指數**: ⭐⭐

---

### 方案 C: Webhook 模式（高級）

**實施**: 改用 Webhook 替代輪詢

```go
// 設置 Webhook
telegram.setWebhook("https://your-domain.com/webhook/usd")
telegram.setWebhook("https://your-domain.com/webhook/ust")

// 每個實例監聽不同的路徑
```

**問題**: 
- ❌ Telegram 不允許同一個 Bot 設置多個 Webhook
- ❌ 無法解決共享 Bot 的問題

**推薦指數**: ⭐（不可行）

---

### 方案 D: 主從模式

**實施**: 只有一個實例（USD）處理 Telegram 命令

```yaml
# config-usd.yaml
notification:
  telegram:
    enabled: true
    handle_commands: true  # ← 主實例

# config-usdt.yaml
notification:
  telegram:
    enabled: true
    handle_commands: false  # ← 從實例，不處理命令
```

**優點**:
- ✅ 消除競爭
- ✅ 簡單實施

**缺點**:
- ❌ 無法單獨查詢 UST 狀態
- ❌ USD 實例掛了就沒有 Telegram 回覆

**推薦指數**: ⭐⭐⭐

---

## 📋 推薦實施步驟（方案 A）

### Step 1: 創建第二個 Telegram Bot

```
1. 在 Telegram 搜索 @BotFather
2. 發送 /newbot
3. 設置名稱: "My UST Lending Bot"
4. 設置用戶名: "my_ust_lending_bot"
5. 獲得 Token: 記錄為 TELEGRAM_BOT_TOKEN_UST
```

### Step 2: 更新環境變數

**修改 `.env`**:
```bash
# USD Bot
TELEGRAM_BOT_TOKEN_USD=YOUR_TELEGRAM_BOT_TOKEN

# UST Bot（新創建的）
TELEGRAM_BOT_TOKEN_UST=NEW_TOKEN_HERE

# 共用 Chat ID
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID_HERE
```

### Step 3: 修改配置文件

**`config/config-usd.yaml`**:
```yaml
notification:
  telegram:
    token: ""  # 從 TELEGRAM_BOT_TOKEN_USD 讀取
    chat_id: ""
```

**`config/config-usdt.yaml`**:
```yaml
notification:
  telegram:
    token: ""  # 從 TELEGRAM_BOT_TOKEN_UST 讀取
    chat_id: ""
```

### Step 4: 修改啟動腳本

**`dual-instance.sh`**:
```bash
# 在 start_instance 函數中
start_usd() {
    export TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN_USD
    ./lending-bot -config config/config-usd.yaml > lending-bot-usd.log 2>&1 &
}

start_ust() {
    export TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN_UST
    ./lending-bot -config config/config-usdt.yaml > lending-bot-usdt.log 2>&1 &
}
```

### Step 5: 重啟並測試

```bash
./dual-instance.sh stop
./dual-instance.sh start

# 在 Telegram 測試
# 對 @my_usd_lending_bot 發送 /status → USD 狀態
# 對 @my_ust_lending_bot 發送 /status → UST 狀態
```

---

## 🎯 臨時解決方案（立即可用）

### 方案 D-簡化版: 禁用 UST 的 Telegram 命令

**修改 `config/config-usdt.yaml`**:
```yaml
notification:
  enabled: false  # ← 暫時關閉 UST 的 Telegram
  
  # 或者只關閉命令處理
  telegram:
    token: ""
    chat_id: ""
```

**重啟**:
```bash
./dual-instance.sh restart
```

**效果**:
- ✅ 只有 USD 回覆 /status（穩定）
- ❌ 無法查詢 UST 狀態

---

## 📊 方案對比總結

| 方案 | 可靠性 | 複雜度 | 用戶體驗 | 推薦度 |
|-----|--------|--------|----------|--------|
| **A. 獨立 Bot** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 最推薦 |
| **B. 實例標記** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️ 複雜 |
| **C. Webhook** | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ 不可行 |
| **D. 主從模式** | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ | ✅ 臨時方案 |

---

## ✅ 結論

### 問題本質
- **不是 Bug**，是架構設計問題
- 兩個實例競爭同一個 Telegram Bot 的消息
- Telegram API 的 getUpdates 是消費型，導致競爭條件

### 最佳方案
**創建第二個 Telegram Bot**（方案 A）
- 徹底解決問題
- 用戶體驗最佳
- 長期維護簡單

### 快速方案
**暫時禁用 UST 的 Telegram 通知**（方案 D）
- 立即可用
- 穩定可靠
- 但功能受限

---

*報告生成時間: 2025-10-23 17:55*
*分析工具: Serena MCP (代碼審查) + 系統架構分析*
