# 通知系統設置指南 / Notification System Setup Guide

## 🚀 快速開始 Quick Start

### 1. 複製設定檔 Copy Configuration
```bash
cp config/notification.example.yaml config/config.yaml
```

### 2. 設定通知平台 Configure Notification Platforms

選擇您想使用的通知平台並按照以下步驟設定：

---

## 📱 Telegram 設定

### 步驟 1: 創建 Telegram Bot
1. 在 Telegram 搜尋 **@BotFather**
2. 發送 `/newbot` 命令
3. 輸入機器人名稱 (例如: Bitfinex Lending Bot)
4. 輸入機器人用戶名 (必須以 bot 結尾，例如: `bitfinex_lending_bot`)
5. 複製 **Token** (格式: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 步驟 2: 獲取 Chat ID
1. 發送任意訊息給您剛創建的機器人
2. 在瀏覽器訪問：
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
3. 找到 `"chat":{"id":` 後面的數字，這就是您的 Chat ID

### 步驟 3: 配置環境變數
```bash
export TELEGRAM_BOT_TOKEN="your-token-here"
export TELEGRAM_CHAT_ID="your-chat-id"
```

---

## 💬 Discord 設定

### 步驟 1: 創建 Webhook
1. 打開 Discord，進入您想接收通知的頻道
2. 點擊頻道名稱旁的齒輪圖標 (頻道設定)
3. 選擇左側選單的「整合」(Integrations)
4. 點擊「Webhooks」→「新增 Webhook」
5. 設定名稱 (例如: Bitfinex Bot)
6. 複製 **Webhook URL**

### 步驟 2: 配置環境變數
```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

---

## 📣 LINE Notify 設定

### 步驟 1: 生成 Access Token
1. 訪問 [LINE Notify](https://notify-bot.line.me/)
2. 使用您的 LINE 帳號登入
3. 點擊右上角的用戶名，選擇「個人頁面」
4. 點擊「發行權杖」(Generate token)
5. 輸入權杖名稱 (例如: Bitfinex Bot)
6. 選擇要接收通知的聊天室：
   - **1對1聊天**: LINE Notify 會直接發送給您
   - **群組**: 選擇特定群組接收通知
7. 複製生成的 **Access Token** (只會顯示一次!)

### 步驟 2: 配置環境變數
```bash
export LINE_ACCESS_TOKEN="your-token-here"
```

---

## 🧪 測試通知 Test Notifications

### 編譯測試工具
```bash
go build -o test-notify cmd/test-notify/main.go
```

### 測試所有平台
```bash
./test-notify -config config/config.yaml -type all
```

### 測試特定平台
```bash
# 只測試 Telegram
./test-notify -config config/config.yaml -platform telegram -type high_rate

# 只測試 Discord
./test-notify -config config/config.yaml -platform discord -type high_rate

# 只測試 LINE
./test-notify -config config/config.yaml -platform line -type high_rate
```

### 測試特定事件
```bash
# 高利率警報
./test-notify -config config/config.yaml -type high_rate

# 貸款執行
./test-notify -config config/config.yaml -type loan

# 錯誤通知
./test-notify -config config/config.yaml -type error

# 自定義訊息
./test-notify -config config/config.yaml -type custom -message "測試訊息"
```

---

## 📊 通知事件類型 Notification Event Types

| 事件類型 | 說明 | 優先級 | 觸發條件 |
|---------|------|--------|---------|
| `high_rate_alert` | 高利率警報 | 🔴 Critical/High | APR > 10% |
| `loan_executed` | 貸款執行成功 | 🟡 Medium | 成功放貸 |
| `error` | 錯誤訊息 | 🔴 High | 系統錯誤 |
| `warning` | 警告訊息 | 🟡 Medium | 餘額不足等 |
| `bot_started` | 機器人啟動 | 🟢 Low | 啟動時 |
| `bot_stopped` | 機器人停止 | 🟡 Medium | 停止時 |
| `daily_summary` | 每日統計 | 🟢 Low | 每日定時 |

---

## ⚡ 高利率自動響應 High Rate Auto-Response

系統會根據利率水平自動調整策略：

### 利率等級 Rate Levels

| 等級 | APR 範圍 | 日利率範圍 | 響應策略 | 通知優先級 |
|------|----------|-----------|----------|-----------|
| **EXTREME** | > 30% | > 0.0822% | 緊急模式 | 🔴 Critical |
| **VERY_HIGH** | 20-30% | 0.0548-0.0822% | 激進模式 | 🔴 Critical |
| **HIGH** | 15-20% | 0.0411-0.0548% | 積極模式 | 🟡 High |
| **MEDIUM** | 10-15% | 0.0274-0.0411% | 適度模式 | 🟢 Medium |
| **NORMAL** | < 10% | < 0.0274% | 標準模式 | ⚪ Low |

### 緊急模式行動 Emergency Mode Actions

當檢測到 **EXTREME** 等級利率時：

1. **立即通知** - 發送到所有已配置的通知平台
2. **取消低利率訂單** - 取消所有低於當前利率的掛單
3. **釋放保留資金** - 使用 95% 總資金 (包括保留資金)
4. **期限分配策略**：
   - 20% 短期 (2-7天) - 快速周轉捕捉尖峰
   - 50% 中期 (7-14天) - 平衡策略
   - 30% 長期 (14-30天) - 鎖定高利率
5. **加速更新** - 從 5 分鐘切換到 1 分鐘更新頻率

---

## 🔧 進階設定 Advanced Configuration

### 使用環境變數檔案 Using .env File

創建 `.env` 文件：
```bash
# Bitfinex API
BITFINEX_API_KEY=your-api-key
BITFINEX_API_SECRET=your-api-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-token
TELEGRAM_CHAT_ID=your-chat-id

# Discord
DISCORD_WEBHOOK_URL=your-discord-webhook

# LINE
LINE_ACCESS_TOKEN=your-line-token
```

載入環境變數：
```bash
source .env
./lending-bot
```

### Docker 設定

使用 Docker Compose：
```yaml
version: '3.8'
services:
  lending-bot:
    build: .
    env_file: .env
    volumes:
      - ./config:/app/config
    restart: unless-stopped
```

---

## 🛠️ 故障排除 Troubleshooting

### Telegram 無法收到通知
- 確認已發送訊息給機器人 (必須先主動發送)
- 檢查 Chat ID 是否正確
- 確認 Token 格式正確

### Discord 通知失敗
- 檢查 Webhook URL 是否完整
- 確認頻道仍存在且 Webhook 未被刪除
- 檢查網路連線

### LINE 通知失敗
- 確認 Access Token 未過期
- 檢查是否已加入指定的聊天室
- Token 只會顯示一次，遺失需重新生成

### 一般問題
- 查看日誌: `tail -f logs/bot.log`
- 檢查環境變數: `env | grep -E "TELEGRAM|DISCORD|LINE"`
- 測試網路連線: `curl -I https://api.telegram.org`

---

## 📝 範例通知訊息 Example Notifications

### Telegram 格式
```
💰 High Rate Alert (EXTREME)

High lending rate detected!

📊 Current Rate: 0.1000% daily
📈 APY: 36.50%
⚡ Level: EXTREME

🎯 Recommended Actions:
1. 立即取消所有低於 0.1000% 的掛單
2. 釋放保留資金參與高利率放貸
3. 建議將放貸期限設為 30 天
4. 考慮從其他平台調入資金

🕐 14:35:22

‼️ CRITICAL PRIORITY
```

### Discord 格式
Rich Embed 格式，包含顏色編碼和欄位顯示

### LINE 格式
簡潔文字格式，支援貼圖增強視覺效果

---

## 📚 相關文件 Related Documents

- [操作指南](OPERATION_GUIDE.md) - 完整操作說明
- [高利率通知計劃](HIGH_RATE_NOTIFICATION_PLAN.md) - 詳細實作計劃
- [系統架構](ARCHITECTURE.md) - 系統設計文檔

---

## 💡 小提示 Tips

1. **多平台備份** - 建議至少設定 2 個通知平台以防單一平台故障
2. **優先級過濾** - 可在配置中調整 `events` 來過濾不需要的通知
3. **金額門檻** - 設定 `min_amount` 避免小額貸款通知打擾
4. **測試優先** - 正式使用前務必測試所有通知管道
5. **保護憑證** - 永遠不要將 Token/Key 提交到 Git

---

## 🆘 需要協助？ Need Help?

如有問題請提交 [GitHub Issue](https://github.com/ImL1s/bitfinex-lending-bot/issues) 或查看 [FAQ](FAQ.md)。

---

*Last Updated: 2025-09-29*