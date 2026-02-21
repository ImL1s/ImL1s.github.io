# Telegram 放貸控制功能開發記錄

> 日期: 2025-12-15  
> 分支: `feature/telegram-lending-control`

---

## 1. 功能需求

透過 Telegram 指令控制放貸機器人的暫停/恢復功能。

---

## 2. 實作摘要

### 新增 Telegram 指令

| 指令 | 功能 |
|------|------|
| `/pause` | 暫停放貸策略執行 |
| `/resume` | 恢復放貸策略執行 |
| `/status` | 顯示狀態（含暫停狀態） |

### 修改的檔案

#### `internal/bot/bot.go`
- 新增 `isPaused`, `pausedAt`, `pauseReason` 欄位
- 實作 `Pause()`, `Resume()`, `IsPaused()`, `GetPausedAt()` 方法
- 在 `executeStrategy()` 開頭加入暫停檢查
- 在 `getStats()` 加入暫停狀態資訊

#### `internal/notification/telegram.go`
- 新增 `BotController` 介面
- 新增 `botController` 欄位
- 註冊 `/pause` 和 `/resume` 命令處理器
- 實作 `handlePauseCommand()` 和 `handleResumeCommand()`

#### `internal/notification/notifier.go`
- 新增 `SetBotController()` 方法

---

## 3. 架構設計

```
Telegram 用戶發送 /pause
         │
         ▼
TelegramNotifier.pollUpdates() (輪詢)
         │
         ▼
TelegramNotifier.handlePauseCommand()
         │
         ▼
Bot.Pause() ← 設定 isPaused = true
         │
         ▼
Bot.executeStrategy() ← 檢查 IsPaused()，跳過執行
```

### BotController 介面
```go
type BotController interface {
    Pause(reason string)
    Resume()
    IsPaused() bool
    GetPausedAt() time.Time
}
```

---

## 4. 設計評估

### 優點
- ✅ 介面抽象良好，解耦 TelegramNotifier 和 Bot
- ✅ 並發安全 (使用 sync.RWMutex)
- ✅ 符合現有架構模式
- ✅ 邊界情況處理完整

### 可改進方向
- 暫停時可選擇取消所有掛單
- 持久化暫停狀態 (跨重啟)
- 新增 `/help` 指令
- 定時恢復功能 (如 `/pause 2h`)

---

## 5. Git 記錄

```bash
# 建立分支
git checkout -b feature/telegram-lending-control

# Commit
git commit -m "feat: add Telegram /pause and /resume commands for lending control"

# Push
git push -u origin feature/telegram-lending-control
```

---

## 6. 放貸策略研究

### 開源項目

| 項目 | 語言 | 策略特點 |
|------|------|----------|
| MikaLendingBot | Python | 激進/保守策略、分散掛單 |
| BitfinexLendingBot | Go | CascadeBot, MarginBot 靈感 |
| bf-lending-bot | Python | 動態 Grid 策略 |
| funding-bot | Node.js | API v2 + WebSocket |

### 主流策略

| 策略 | 原理 |
|------|------|
| **FRR** | 使用每小時加權平均利率 |
| **Grid** | 分散資金於不同利率層級 |
| **FRR Delta** | FRR ± 基點調整 |
| **Top Book** | 略低於最佳買價掛單 |
| **Adaptive/ML** | 機器學習預測最佳利率 |

### 最佳實踐
- 動態利率調整
- 短期貸款優先 (2-7 天)
- USD + USDT 雙幣種分散
- 分層掛單
- 24/7 自動化
- 閒置資金最小化

---

## 7. 測試步驟

```bash
# 啟動 Bot
make run

# Telegram 測試
1. 發送 /pause → 確認收到 "⏸️ 放貸已暫停"
2. 發送 /status → 確認顯示暫停狀態
3. 發送 /resume → 確認收到 "▶️ 放貸已恢復"
```
