# Telegram Bot 雙實例命令處理解決方案

## 📋 問題陳述

### 背景
- 兩個 Go Bot 實例（USD 和 UST）
- 使用相同的 Telegram Bot Token 和 Chat ID
- 都在輪詢 Telegram `getUpdates` API（每 2 秒）
- 用戶希望兩個實例都能回覆 `/status` 命令

### 當前問題
由於 Telegram `getUpdates` 是**消費型 API**，導致：
- Update 被第一個讀取的實例消費
- 第二個實例永遠無法獲取相同的 update
- 結果：只有一個實例能回覆（隨機）

---

## 🔍 技術深度分析

### Telegram getUpdates API 限制

根據官方文檔和研究：

1. **消費型設計（Consume Pattern）**
   - `offset` 參數確認機制：一旦使用大於 `update_id` 的 offset 調用，該 update 就被標記為已處理
   - 已確認的 update 會從 Telegram 伺服器隊列中永久移除
   - 其他客戶端無法再次獲取

2. **單一控制器假設（Single Controller）**
   - Telegram 設計假設只有一個客戶端輪詢
   - 多個客戶端同時輪詢會導致 409 Conflict
   - 即使不報錯，updates 也會隨機分配

3. **Webhook 互斥**
   - `getUpdates` 和 `setWebhook` 不能同時使用
   - 限制了某些架構方案的可行性

### 為什麼無法直接解決

**用戶需求**：兩個獨立實例都能收到並回覆

**技術障礙**：
- ❌ 不可能讓多個客戶端通過 `getUpdates` 收到相同的 update
- ❌ 這是 API 的設計限制，不是 bug
- ❌ 必須通過架構創新來繞過此限制

---

## 💡 解決方案對比表

| 方案 | 可行性 | 複雜度 | 可靠性 | 推薦度 | 依賴 |
|------|--------|--------|--------|--------|------|
| **方案 1：中央調度器** | ✅ | 中 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Redis/IPC |
| **方案 2：Webhook + LB** | ✅ | 中 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Nginx, SSL |
| **方案 3：主從模式** | ✅ | 低 | ⭐⭐⭐ | ⭐⭐⭐ | HTTP |
| **方案 4：命令去重** | ⚠️ | 中 | ⭐⭐ | ⭐⭐ | Redis |
| **方案 5：雙 Token** | ✅ | 低 | ⭐⭐⭐⭐ | ❌ | 無（已拒絕） |

---

## 🏆 推薦方案詳解

### **方案 1：中央調度器模式（最推薦）**

#### 架構圖
```
┌─────────────────────────────────────────────────┐
│              Telegram Server                    │
│         (api.telegram.org)                      │
└────────────────────┬────────────────────────────┘
                     │
                     │ getUpdates (Long Polling)
                     │ 只有 Router 調用
                     ↓
┌─────────────────────────────────────────────────┐
│          Telegram Router Service                │
│  - 唯一輪詢 Telegram API                        │
│  - 接收所有 updates                             │
│  - 序列化並廣播到 Redis Pub/Sub                 │
└────────────────────┬────────────────────────────┘
                     │
                     │ Redis Pub/Sub
                     │ Channel: "telegram:commands"
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│ USD Bot  │  │ UST Bot  │  │ Future   │
│ Instance │  │ Instance │  │ Instances│
│          │  │          │  │          │
│ 訂閱 +   │  │ 訂閱 +   │  │ 訂閱 +   │
│ 回覆     │  │ 回覆     │  │ 回覆     │
└──────────┘  └──────────┘  └──────────┘
```

#### 工作流程

1. **Router 輪詢 Telegram**
   ```
   Router → Telegram: getUpdates(offset=last_id+1)
   Telegram → Router: [Update1, Update2, ...]
   ```

2. **廣播到 Redis**
   ```
   Router → Redis: PUBLISH telegram:commands {update_json}
   ```

3. **Bot 實例訂閱並處理**
   ```
   USD Bot ← Redis: {update_json}
   UST Bot ← Redis: {update_json}  (同時收到)

   USD Bot → Telegram: sendMessage(USD 狀態)
   UST Bot → Telegram: sendMessage(UST 狀態)
   ```

#### 優點
- ✅ **完全解決問題**：所有實例都能收到並回覆
- ✅ **符合 API 設計**：只有一個客戶端輪詢
- ✅ **高擴展性**：輕鬆添加更多實例
- ✅ **可靠性高**：Router 掛了只影響新消息
- ✅ **性能好**：Redis Pub/Sub 毫秒級延遲

#### 缺點
- ⚠️ **架構複雜**：需要額外的 Router 進程
- ⚠️ **依賴 Redis**：需要 Redis 服務
- ⚠️ **部署成本**：多一個服務需要監控

#### 實施步驟

**第 1 步：安裝 Redis**
```bash
# macOS
brew install redis
brew services start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

**第 2 步：創建 Router 服務**

已創建：`cmd/telegram-router/main.go`

**第 3 步：修改 Telegram Notifier 以支持 Router**

在 `internal/notification/telegram.go` 添加：
```go
// PollUpdatesForRouter 返回 updates 而不是處理（給 Router 使用）
func (t *TelegramNotifier) PollUpdatesForRouter(ctx context.Context) ([]Update, error) {
	url := fmt.Sprintf(telegramAPIURL, t.config.Token, "getUpdates")

	payload := map[string]interface{}{
		"offset":  t.lastUpdateID + 1,
		"timeout": 1,
	}

	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Ok     bool     `json:"ok"`
		Result []Update `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// 更新 lastUpdateID
	for _, update := range result.Result {
		if update.UpdateID > t.lastUpdateID {
			t.lastUpdateID = update.UpdateID
		}
	}

	return result.Result, nil
}
```

**第 4 步：修改 Bot 實例訂閱 Redis**

在 `internal/bot/bot.go` 添加：
```go
import "github.com/go-redis/redis/v8"

// 在 Bot 結構體添加
type Bot struct {
	// ... 現有字段
	redisClient *redis.Client
	redisSub    *redis.PubSub
}

// 初始化 Redis 客戶端
func (b *Bot) initRedis() error {
	b.redisClient = redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   0,
	})

	if err := b.redisClient.Ping(b.ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return nil
}

// 訂閱 Telegram 命令
func (b *Bot) SubscribeToTelegramCommands(ctx context.Context) {
	b.redisSub = b.redisClient.Subscribe(ctx, "telegram:commands")

	go func() {
		for msg := range b.redisSub.Channel() {
			var update notification.Update
			if err := json.Unmarshal([]byte(msg.Payload), &update); err != nil {
				logrus.WithError(err).Error("Failed to unmarshal update")
				continue
			}

			// 處理命令
			b.handleTelegramCommand(ctx, &update)
		}
	}()

	logrus.Info("Subscribed to Telegram commands via Redis")
}

// 處理 Telegram 命令
func (b *Bot) handleTelegramCommand(ctx context.Context, update *notification.Update) {
	if update.Message == nil {
		return
	}

	// 只處理來自授權聊天的消息
	chatID := fmt.Sprintf("%d", update.Message.Chat.ID)
	if chatID != b.config.Notification.Telegram.ChatID {
		return
	}

	// 處理 /status 命令
	if update.Message.Text == "/status" {
		stats := b.GetStatus()
		b.notificationManager.SendStatusUpdate(ctx, stats)
	}
}
```

**第 5 步：創建 Router 配置檔案**

`config/router-config.yaml`:
```yaml
redis:
  address: "localhost:6379"
  password: ""
  db: 0

telegram:
  poll_interval: 2  # seconds

log:
  level: "info"
  format: "json"
  file: "logs/telegram-router.log"
```

**第 6 步：編譯和運行**

```bash
# 編譯 Router
go build -o bin/telegram-router cmd/telegram-router/main.go

# 編譯 Bot（已有）
go build -o bin/lending-bot cmd/bot/main.go

# 啟動 Redis
brew services start redis

# 啟動 Router
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_CHAT_ID="your_chat_id"
./bin/telegram-router &

# 啟動 USD Bot
./bin/lending-bot -config config/config-usd.yaml &

# 啟動 UST Bot
./bin/lending-bot -config config/config-usdt.yaml &
```

**第 7 步：測試**

```bash
# 在 Telegram 發送
/status

# 預期：兩個 Bot 都回覆狀態
```

---

### **方案 3：主從模式（備選方案）**

如果不想引入 Redis，可以使用更簡單的主從模式。

#### 架構圖
```
┌─────────────────┐
│  Telegram API   │
└────────┬────────┘
         │ getUpdates (只有主實例)
         ↓
┌────────────────────────┐
│  USD Bot (Master)      │
│  - 輪詢 Telegram       │
│  - 處理命令            │
│  - 回覆 USD 狀態       │
│  - 通知從實例          │
└────────┬───────────────┘
         │ HTTP POST /trigger-status
         ↓
┌────────────────────────┐
│  UST Bot (Slave)       │
│  - 不輪詢 Telegram     │
│  - 監聽觸發請求        │
│  - 收到通知時回覆狀態  │
└────────────────────────┘
```

#### 實施步驟

**第 1 步：配置主從關係**

`config/config-usd.yaml` (主實例):
```yaml
bot:
  is_master: true
  slave_instances:
    - "http://localhost:8091/api/trigger-status"  # UST Bot 地址
```

`config/config-usdt.yaml` (從實例):
```yaml
bot:
  is_master: false
```

**第 2 步：主實例修改**

在 `internal/notification/telegram.go`:
```go
// handleStatusCommand 處理 /status 命令
func (t *TelegramNotifier) handleStatusCommand(ctx context.Context, message *Message) error {
	logrus.Info("Processing /status command (Master)")

	// 1. 回覆自己的狀態
	if t.statusProvider != nil {
		stats := t.statusProvider()
		t.sendStatusMessage(ctx, stats)
	}

	// 2. 通知從實例
	if t.config.SlaveInstances != nil {
		t.notifySlaves(ctx, message.Chat.ID)
	}

	return nil
}

// notifySlaves 通知所有從實例
func (t *TelegramNotifier) notifySlaves(ctx context.Context, chatID int64) {
	payload := map[string]interface{}{
		"chat_id": chatID,
		"command": "status",
	}

	data, _ := json.Marshal(payload)

	for _, slaveURL := range t.config.SlaveInstances {
		go func(url string) {
			req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(data))
			req.Header.Set("Content-Type", "application/json")

			client := &http.Client{Timeout: 5 * time.Second}
			resp, err := client.Do(req)
			if err != nil {
				logrus.WithError(err).WithField("slave", url).Error("Failed to notify slave")
				return
			}
			defer resp.Body.Close()

			logrus.WithField("slave", url).Debug("Notified slave instance")
		}(slaveURL)
	}
}
```

**第 3 步：從實例添加觸發端點**

在 `internal/web/server.go`:
```go
// 添加路由
func (s *Server) setupRoutes() {
	// ... 現有路由

	s.router.HandleFunc("/api/trigger-status", s.handleTriggerStatus).Methods("POST")
}

// handleTriggerStatus 處理狀態觸發請求
func (s *Server) handleTriggerStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChatID  int64  `json:"chat_id"`
		Command string `json:"command"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	logrus.WithFields(logrus.Fields{
		"chat_id": req.ChatID,
		"command": req.Command,
	}).Info("Received status trigger from master")

	// 發送狀態到 Telegram
	if s.bot.notificationManager != nil {
		stats := s.bot.GetStatus()

		// 直接發送消息（不通過命令處理器）
		ctx := r.Context()
		for _, notifier := range s.bot.notificationManager.GetNotifiers() {
			if tgNotifier, ok := notifier.(*notification.TelegramNotifier); ok {
				go tgNotifier.SendStatusMessage(ctx, stats)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

**第 4 步：修改啟動邏輯**

在 `cmd/bot/main.go`:
```go
// 只有主實例啟動命令處理器
if cfg.Bot.IsMaster {
	notificationManager.StartCommandHandler(ctx)
	logrus.Info("Started Telegram command handler (Master mode)")
} else {
	logrus.Info("Running in Slave mode, not polling Telegram")
}
```

#### 優點
- ✅ **實施簡單**：最小代碼改動
- ✅ **無外部依賴**：只需 HTTP 通信
- ✅ **快速部署**：半天即可完成

#### 缺點
- ⚠️ **單點故障**：主實例掛了無法收到命令
- ⚠️ **耦合度高**：需配置從實例地址
- ⚠️ **擴展性差**：添加實例需修改配置

---

## 📊 方案對比與選擇指南

### 選擇決策樹

```
是否願意引入 Redis？
├─ 是 → 【方案 1：中央調度器】
│       優點：完美解決 + 高可靠性
│       成本：需要 Redis
│
└─ 否 → 是否能接受主從架構？
        ├─ 是 → 【方案 3：主從模式】
        │       優點：簡單快速
        │       缺點：主實例單點
        │
        └─ 否 → 【方案 2：Webhook + LB】
                優點：生產級方案
                成本：需要域名 + SSL
```

### 各場景推薦

| 場景 | 推薦方案 | 理由 |
|------|----------|------|
| **生產環境** | 方案 1 或 2 | 高可靠性、易監控 |
| **開發測試** | 方案 3 | 快速實施、低成本 |
| **小規模部署** | 方案 3 | 夠用且簡單 |
| **大規模部署** | 方案 1 | 易擴展、高性能 |
| **已有 Redis** | 方案 1 | 零額外成本 |
| **已有域名** | 方案 2 | Webhook 更快 |

---

## ⚠️ 風險評估

### 方案 1 風險

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| Redis 掛掉 | 無法收到新命令 | 低 | Redis 持久化 + 監控 |
| Router 掛掉 | 無法輪詢 Telegram | 低 | Systemd 自動重啟 |
| 消息廣播延遲 | 回覆延遲 | 極低 | Redis < 5ms |
| 實例回覆沖突 | Telegram 頻率限制 | 中 | 添加回覆間隔 |

### 方案 3 風險

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| 主實例掛掉 | 無法收到命令 | 中 | 監控 + 自動切換主從 |
| 從實例掛掉 | 部分狀態缺失 | 低 | 監控 + 告警 |
| 網絡分區 | 從實例收不到觸發 | 低 | 超時重試 |

---

## 🧪 測試策略

### 功能測試

1. **基本命令測試**
   ```bash
   # 發送 /status
   # 驗證：兩個 Bot 都回覆
   # 驗證：回覆內容正確
   ```

2. **並發測試**
   ```bash
   # 快速連續發送 5 次 /status
   # 驗證：每次都有兩個回覆
   # 驗證：無重複或遺漏
   ```

3. **錯誤恢復測試**
   ```bash
   # 方案 1：停止 Redis → 重啟 → 測試
   # 方案 3：停止主實例 → 重啟 → 測試
   ```

### 性能測試

1. **延遲測試**
   - 測量從發送命令到收到第一個回覆的時間
   - 目標：< 2 秒

2. **吞吐量測試**
   - 每分鐘發送 10 次命令
   - 驗證無遺漏

### 壓力測試

1. **長時間運行**
   - 連續運行 24 小時
   - 每 5 分鐘發送一次命令
   - 驗證無內存泄漏

---

## 📝 實施時間表

### 方案 1（中央調度器）

| 階段 | 任務 | 時間 |
|------|------|------|
| Day 1 | 安裝 Redis + 創建 Router | 4 小時 |
| Day 1 | 修改 Telegram Notifier | 2 小時 |
| Day 2 | 修改 Bot 訂閱邏輯 | 3 小時 |
| Day 2 | 測試和調優 | 3 小時 |
| **總計** | | **12 小時** |

### 方案 3（主從模式）

| 階段 | 任務 | 時間 |
|------|------|------|
| Day 1 | 修改配置結構 | 1 小時 |
| Day 1 | 實現主實例通知邏輯 | 2 小時 |
| Day 1 | 實現從實例觸發端點 | 2 小時 |
| Day 1 | 測試和調優 | 2 小時 |
| **總計** | | **7 小時** |

---

## 🎯 推薦決策

基於你的場景（兩個實例，可能未來擴展），我的推薦順序：

1. **首選：方案 3（主從模式）**
   - ✅ 快速實施（半天）
   - ✅ 無額外依賴
   - ✅ 足夠滿足當前需求
   - ⚠️ 如未來需要 3+ 實例，再升級到方案 1

2. **備選：方案 1（中央調度器）**
   - ✅ 完美解決方案
   - ✅ 易於擴展
   - ⚠️ 需要 Redis（如已有則零成本）

3. **不推薦：方案 2**
   - 需要公網域名和 SSL
   - 開發環境測試不便

---

## 🚀 快速開始（方案 3）

如果你現在就想開始，我建議先用**方案 3**：

```bash
# 1. 修改配置
vim config/config-usd.yaml  # 添加 slave_instances
vim config/config-usdt.yaml # 設置 is_master: false

# 2. 修改代碼（見上文實施步驟）
# 3. 編譯測試
go build -o bin/lending-bot cmd/bot/main.go

# 4. 啟動測試
./bin/lending-bot -config config/config-usd.yaml &
./bin/lending-bot -config config/config-usdt.yaml &

# 5. Telegram 測試
# 發送 /status → 應該收到兩個回覆
```

---

## 📞 後續支援

如需進一步幫助：
1. 選擇方案並告訴我，我可以提供詳細代碼實現
2. 遇到問題時提供錯誤日誌
3. 需要優化時分享性能數據

---

**文檔版本**：v1.0
**更新時間**：2025-10-23
**作者**：Claude (Omniscient Solver)
