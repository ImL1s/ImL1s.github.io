# Telegram Bot API 完整指南

> 最後更新：2025-12-17
> 來源：https://core.telegram.org/bots/api

## 1. sendMessage API 參數和格式化選項

### 核心參數

| 參數 | 類型 | 必需 | 說明 |
|------|------|------|------|
| `chat_id` | Integer/String | 是 | 目標聊天 ID |
| `text` | String | 是 | 消息內容（1-4096 字符） |
| `parse_mode` | String | 否 | 文本格式模式（MarkdownV2、HTML 或 Markdown） |
| `reply_markup` | Object | 否 | 鍵盤或內聯按鈕 |
| `reply_parameters` | Object | 否 | 回復消息配置 |
| `disable_notification` | Boolean | 否 | 靜默發送 |
| `protect_content` | Boolean | 否 | 保護消息內容不被轉發/保存 |
| `message_thread_id` | Integer | 否 | 論壇主題 ID |

---

## 2. Markdown/HTML 格式化

### 2.1 MarkdownV2 語法

```markdown
*bold*                     - 粗體
_italic_                   - 斜體
__underline__              - 下劃線
~strikethrough~            - 刪除線
||spoiler||                - 劇透
*bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
[inline URL](http://www.example.com/)
[inline mention of a user](tg://user?id=123456789)
`inline fixed-width code`
```
pre-formatted fixed-width code block
```python
pre-formatted fixed-width code block written in Python
```
```

**轉義字符：** 所有特殊字符需在實體外進行反斜線轉義：
```
_ * [ ] ( ) ~ ` > # + - = | { } . !
```

### 2.2 HTML 標籤

```html
<b>粗體</b> 或 <strong>粗體</strong>
<i>斜體</i> 或 <em>斜體</em>
<u>下劃線</u> 或 <ins>下劃線</ins>
<s>刪除線</s> 或 <strike>刪除線</strike> 或 <del>刪除線</del>
<tg-spoiler>劇透文本</tg-spoiler> 或 <span class="tg-spoiler">劇透</span>
<code>內聯代碼</code>
<pre>預格式化文本</pre>
<pre><code class="language-python">預格式化 Python 代碼</code></pre>
<a href="URL">內聯超連結</a>
<a href="tg://user?id=123456789">提及用戶</a>
<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>
<blockquote>塊引用</blockquote>
<blockquote expandable>可展開塊引用</blockquote>
```

### 2.3 實體嵌套規則

- ✅ 粗體、斜體、下劃線、刪除線、劇透可以互相包含
- ❌ 代碼和預格式化文本不能包含其他實體
- ❌ 其他實體不能相互嵌套

---

## 3. 內聯鍵盤 (InlineKeyboardMarkup)

### 3.1 基本結構

```json
{
  "inline_keyboard": [
    [
      {"text": "按鈕 1", "callback_data": "btn1"},
      {"text": "按鈕 2", "callback_data": "btn2"}
    ],
    [
      {"text": "打開網站", "url": "https://example.com"},
      {"text": "分享", "switch_inline_query": "查詢"}
    ]
  ]
}
```

### 3.2 按鈕類型

| 類型 | 字段 | 說明 |
|------|------|------|
| 回調按鈕 | `callback_data` | 觸發 CallbackQuery，最多 64 字節 |
| URL 按鈕 | `url` | 打開指定 URL |
| Web App 按鈕 | `web_app` | 打開 Web App |
| 登錄按鈕 | `login_url` | 授權登錄 |
| 切換內聯 | `switch_inline_query` | 切換到內聯模式 |
| 支付按鈕 | `pay` | 發起支付 |

### 3.3 工作原理

1. 內聯鍵盤綁定到消息（在消息下方顯示）
2. 用戶點擊按鈕時不發送常規消息，而是觸發回調
3. 無法同時使用自定義鍵盤（ReplyKeyboardMarkup）和內聯鍵盤

---

## 4. 回調查詢 (CallbackQuery) 處理

### 4.1 CallbackQuery 結構

```json
{
  "id": "unique_id",
  "from": { /* User object */ },
  "message": { /* Message object (optional) */ },
  "inline_message_id": "string (optional)",
  "chat_instance": "string",
  "data": "callback_data_string",
  "game_short_name": "string (optional)"
}
```

### 4.2 處理流程

```
用戶點擊內聯按鈕
       ↓
Bot 接收包含 callback_data 的更新
       ↓
處理回調邏輯
       ↓
【必須】調用 answerCallbackQuery()
       ↓
可選：編輯原消息或發送新消息
```

### 4.3 answerCallbackQuery 參數

| 參數 | 類型 | 必需 | 說明 |
|------|------|------|------|
| `callback_query_id` | String | 是 | 回調查詢 ID |
| `text` | String | 否 | 顯示的通知文本（0-200 字符） |
| `show_alert` | Boolean | 否 | true = 彈窗提示，false = 頂部通知 |
| `url` | String | 否 | 打開的 URL |
| `cache_time` | Integer | 否 | 客戶端緩存時間（秒） |

**重要：** 所有 CallbackQuery 都必須被應答，即使不向用戶發送通知。未應答可能導致客戶端出現問題（加載動畫不停止）。

---

## 5. 消息編輯和刪除

### 5.1 編輯方法

| 方法 | 說明 |
|------|------|
| `editMessageText` | 編輯消息文本 |
| `editMessageCaption` | 編輯圖片/視頻標題 |
| `editMessageMedia` | 替換媒體文件 |
| `editMessageReplyMarkup` | 更新鍵盤按鈕 |
| `editMessageLiveLocation` | 更新實時位置 |
| `stopMessageLiveLocation` | 停止實時位置分享 |

### 5.2 editMessageText 參數

```json
{
  "chat_id": 123456789,
  "message_id": 100,
  "text": "更新後的文本",
  "parse_mode": "HTML",
  "reply_markup": { /* InlineKeyboardMarkup */ }
}
```

### 5.3 刪除方法

| 方法 | 說明 |
|------|------|
| `deleteMessage` | 刪除消息（48 小時內） |
| `deleteMessages` | 批量刪除消息 |

---

## 6. 速率限制和最佳實踐

### 6.1 官方限制

| 場景 | 限制 |
|------|------|
| 單聊 | **每秒 1 條消息** |
| 群組 | **每分鐘 20 條消息** |
| 廣播 | **每秒 ~30 用戶**（~30 消息/秒） |
| 付費廣播 | **每秒 1000 條消息**（需 Telegram Stars） |

### 6.2 429 錯誤處理

當超過速率限制時，API 返回 HTTP 429 錯誤，包含 `retry_after` 參數指示等待秒數。

```json
{
  "ok": false,
  "error_code": 429,
  "description": "Too Many Requests: retry after 35",
  "parameters": {
    "retry_after": 35
  }
}
```

### 6.3 最佳實踐

1. **請求節流和隊列**
   - 排隊請求並分散調用
   - 使用令牌桶或漏桶算法

2. **指數退避重試**
   ```
   第 1 次失敗 → 等待 1 秒
   第 2 次失敗 → 等待 2 秒
   第 3 次失敗 → 等待 4 秒
   ...
   ```

3. **批量處理**
   - 將多個消息分組發送
   - 使用 `sendMediaGroup` 發送多個媒體

4. **監測流量**
   - 記錄 API 調用頻率
   - 設置警報閾值

5. **廣播分散**
   - 若不使用付費廣播，將大量消息分散到 8-12 小時
   - 維持安全緩衝區

### 6.4 重要警告

- Telegram 不公開精確的限制值
- 限制可能因機器人而異，且隨時間變化
- 持續忽視 API 錯誤重試可能導致機器人被暫時封禁

---

## 7. Webhook vs Long Polling

### 7.1 比較表

| 特性 | Long Polling | Webhook |
|------|-------------|---------|
| 設置複雜度 | 簡單 | 較複雜 |
| 需要公開 URL | 否 | 是 |
| 需要 SSL 證書 | 否 | 是（HTTPS） |
| 資源效率 | 較低 | 較高 |
| 延遲性 | 接近即時 | 即時 |
| 控制能力 | 完全控制消息處理 | 被動接收 |
| 適用場景 | 開發、中小型機器人 | 生產、高流量機器人 |
| 支持無服務器 | 否 | 是 |

### 7.2 Long Polling

**getUpdates 參數：**

| 參數 | 類型 | 說明 |
|------|------|------|
| `offset` | Integer | 確認已處理的更新 ID + 1 |
| `limit` | Integer | 獲取的更新數量（1-100，默認 100） |
| `timeout` | Integer | 長輪詢超時秒數（0-50，推薦 ≥ 10） |
| `allowed_updates` | Array | 接收的更新類型列表 |

**優點：**
- 無需公開 URL 或 SSL
- 完全控制消息處理速率
- 在高負載下表現穩定
- 適合本地開發

**實現示例：**
```go
for {
    updates, err := bot.GetUpdates(offset, 100, 30, nil)
    if err != nil {
        time.Sleep(time.Second)
        continue
    }
    for _, update := range updates {
        handleUpdate(update)
        offset = update.UpdateID + 1
    }
}
```

### 7.3 Webhook

**setWebhook 參數：**

| 參數 | 類型 | 說明 |
|------|------|------|
| `url` | String | HTTPS URL |
| `certificate` | InputFile | 自簽名證書公鑰 |
| `ip_address` | String | 固定 IP 地址 |
| `max_connections` | Integer | 最大並發連接數（1-100，默認 40） |
| `allowed_updates` | Array | 接收的更新類型列表 |
| `drop_pending_updates` | Boolean | 丟棄待處理的更新 |
| `secret_token` | String | 驗證請求的密鑰（1-256 字符） |

**優點：**
- 資源效率高，減少冗余請求
- 低延遲即時推送
- 適合高流量、需要快速響應的場景
- 支持無服務器平台（AWS Lambda、Cloudflare Workers 等）

**Webhook 請求驗證：**
```go
func webhookHandler(w http.ResponseWriter, r *http.Request) {
    // 驗證 secret token
    token := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
    if token != secretToken {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    // 處理更新
    var update Update
    json.NewDecoder(r.Body).Decode(&update)
    handleUpdate(update)

    w.WriteHeader(http.StatusOK)
}
```

### 7.4 選擇建議

| 場景 | 推薦 |
|------|------|
| 開發測試 | Long Polling |
| 小型機器人 | Long Polling |
| 生產環境高流量 | Webhook |
| 無服務器部署 | Webhook |
| 不確定 | Long Polling（無重大缺點） |

---

## 8. 錯誤處理

### 8.1 常見錯誤代碼

| 代碼 | 說明 | 處理方式 |
|------|------|----------|
| 400 | Bad Request - 參數錯誤 | 檢查請求參數 |
| 401 | Unauthorized - 無效的 Bot Token | 驗證 Token |
| 403 | Forbidden - 機器人無權執行操作 | 檢查權限或用戶是否封鎖 |
| 404 | Not Found - 聊天或消息不存在 | 驗證 chat_id/message_id |
| 409 | Conflict - Webhook/Long Polling 衝突 | 刪除 Webhook 或等待 |
| 429 | Too Many Requests - 超過速率限制 | 使用 retry_after 重試 |

### 8.2 錯誤響應結構

```json
{
  "ok": false,
  "error_code": 400,
  "description": "Bad Request: message text is empty"
}
```

### 8.3 錯誤處理最佳實踐

1. **實現自動重試機制**（帶指數退避）
2. **記錄所有 API 錯誤**便於調試
3. **尊重 retry_after 頭部值**
4. **避免持續忽視 RetryAfter 錯誤**
5. **監測應用的速率限制觸發頻率**
6. **區分可重試和不可重試錯誤**

---

## 9. 更新類型 (Update Types)

### 9.1 allowed_updates 可用值

```json
[
  "message",              // 新消息
  "edited_message",       // 編輯的消息
  "channel_post",         // 新頻道帖子
  "edited_channel_post",  // 編輯的頻道帖子
  "inline_query",         // 內聯查詢
  "chosen_inline_result", // 選擇的內聯結果
  "callback_query",       // 回調查詢
  "shipping_query",       // 配送查詢
  "pre_checkout_query",   // 預結賬查詢
  "poll",                 // 投票
  "poll_answer",          // 投票答案
  "my_chat_member",       // 機器人的聊天成員狀態變化
  "chat_member",          // 其他聊天成員狀態變化
  "chat_join_request"     // 加入請求
]
```

### 9.2 Update 結構

```json
{
  "update_id": 123456789,
  "message": { /* Message object */ },
  "edited_message": { /* Message object */ },
  "callback_query": { /* CallbackQuery object */ },
  // ... 其他字段
}
```

---

## 10. 實用代碼片段

### 10.1 發送帶格式的消息

```go
// HTML 格式
text := `
<b>賬戶狀態</b>

💰 <b>餘額:</b> <code>$10,000.00</code>
📈 <b>收益:</b> <code>+$50.00</code> (0.5%)
⏰ <b>更新時間:</b> <i>2025-12-17 10:30</i>

<a href="https://example.com">查看詳情</a>
`

bot.SendMessage(chatID, text, "HTML", nil)
```

### 10.2 發送帶內聯按鈕的消息

```go
keyboard := &InlineKeyboardMarkup{
    InlineKeyboard: [][]InlineKeyboardButton{
        {
            {Text: "💰 餘額", CallbackData: "balance"},
            {Text: "📊 統計", CallbackData: "stats"},
        },
        {
            {Text: "⚙️ 設置", CallbackData: "settings"},
            {Text: "❓ 幫助", CallbackData: "help"},
        },
    },
}

bot.SendMessage(chatID, "請選擇操作:", "", keyboard)
```

### 10.3 處理回調查詢

```go
func handleCallback(query *CallbackQuery) {
    switch query.Data {
    case "balance":
        bot.AnswerCallbackQuery(query.ID, "正在獲取餘額...", false)
        // 更新消息
        bot.EditMessageText(query.Message.Chat.ID, query.Message.MessageID,
            "💰 當前餘額: $10,000.00", "HTML", nil)
    case "stats":
        bot.AnswerCallbackQuery(query.ID, "", false)
        bot.EditMessageText(query.Message.Chat.ID, query.Message.MessageID,
            "📊 統計信息...", "HTML", nil)
    default:
        bot.AnswerCallbackQuery(query.ID, "未知操作", true)
    }
}
```

---

## 11. 官方文檔參考連結

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Bot Features](https://core.telegram.org/bots/features)
- [格式化選項](https://core.telegram.org/bots/api#formatting-options)
- [InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup)
- [CallbackQuery](https://core.telegram.org/bots/api#callbackquery)
- [answerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery)
- [setWebhook](https://core.telegram.org/bots/api#setwebhook)
- [getUpdates](https://core.telegram.org/bots/api#getupdates)
- [Update](https://core.telegram.org/bots/api#update)
