# 📊 Bitfinex 放貸機器人 - 網頁通知與監控系統指南

## 🚀 功能總覽

本次更新為 Bitfinex 放貸機器人增加了完整的網頁即時通知和策略監控功能。

### ✨ 新增功能

1. **即時通知系統** 🔔
   - WebSocket 即時推送
   - 四種通知類型（成交、釋放、警告、高利率）
   - 通知歷史記錄
   - 視覺化 Toast 通知

2. **策略執行面板** 📈
   - 即時策略狀態顯示
   - 市場數據監控
   - 決策日誌追蹤
   - 關鍵指標展示

3. **雙向通知整合** 🌐
   - Telegram + 網頁同步通知
   - 統一的通知格式
   - 中文化介面

## 📁 檔案結構

```
bitfinex-lending-bot/
├── internal/
│   ├── bot/bot.go                    # 增加網頁通知推送
│   └── web/server.go                  # 新增 WebSocket 廣播方法
├── web/templates/
│   ├── index.html                     # 原始監控面板
│   └── enhanced_index.html            # 增強版監控面板 (新增)
├── test_web_notification.html         # 通知測試工具
└── open_dashboard.sh                  # 快速開啟腳本
```

## 🔧 技術實現

### 後端 WebSocket 訊息結構

```go
// 通知訊息
type NotificationData struct {
    Type      string                 `json:"type"`      // success, warning, info, high-rate
    Title     string                 `json:"title"`
    Message   string                 `json:"message"`
    Timestamp time.Time              `json:"timestamp"`
    Details   map[string]interface{} `json:"details,omitempty"`
}

// 策略狀態
type StrategyStatusData struct {
    Name         string                 `json:"name"`
    Status       string                 `json:"status"`
    Parameters   map[string]interface{} `json:"parameters"`
    MarketData   map[string]float64     `json:"market_data"`
    Statistics   map[string]interface{} `json:"statistics"`
    LastDecision string                 `json:"last_decision"`
    UpdatedAt    time.Time              `json:"updated_at"`
}
```

### 前端接收處理

```javascript
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);

    if (data.type === 'notification') {
        // 顯示通知
        notificationSystem.addNotification(data.data);
    } else if (data.type === 'strategy_status') {
        // 更新策略面板
        strategyPanel.updateStatus(data.data);
    } else {
        // 傳統統計更新
        updateStats(data);
    }
};
```

## 🎯 使用方法

### 1. 啟動機器人

```bash
# 編譯並啟動
go build -o lending-bot cmd/bot/main.go
./lending-bot
```

### 2. 訪問監控面板

- **標準版**: http://localhost:8090
- **增強版**: 將 `enhanced_index.html` 內容替換到 `server.go` 中

### 3. 測試通知功能

打開 `test_web_notification.html` 進行測試：

```bash
open test_web_notification.html
```

點擊按鈕發送測試通知，觀察主面板的反應。

## 📊 通知觸發時機

| 事件 | 通知類型 | 觸發條件 |
|------|---------|---------|
| 訂單成交 | `success` | 當 funding offer 被接受時 |
| 資金釋放 | `info` | 當貸款到期資金返還時 |
| 高利率警報 | `high-rate` | 當利率超過 15% APR 時 |
| 餘額不足 | `warning` | 當可用餘額低於 $150 時 |

## 🎨 介面功能說明

### 通知顯示區
- **位置**: 右上角
- **特性**:
  - 自動滑入動畫
  - 10秒後自動消失
  - 點擊可手動關閉
  - 不同類型不同顏色

### 策略狀態面板
- **位置**: 頁面頂部
- **內容**:
  - 策略名稱和描述
  - 運行狀態指示燈
  - 市場數據（FRR、深度）
  - 決策日誌（最近10條）

### 通知歷史
- **位置**: 右下角按鈕
- **功能**:
  - 保留最近50條通知
  - 可展開/收合
  - 顯示完整時間戳

## 🔄 即時更新流程

```
事件發生 → Bot 處理 → 同時推送到：
                        ├─> Telegram (NotificationManager)
                        └─> 網頁 (WebServer.BroadcastNotification)
```

## 🛠️ 配置說明

### WebSocket 端點
- **URL**: `ws://localhost:8090/ws`
- **自動重連**: 3秒延遲
- **心跳**: 每30秒更新數據

### 通知設定
在 `config/config.yaml` 中：

```yaml
notification:
  enabled: true
  events:
    - "loan_executed"      # 訂單成交通知
    - "loan_released"      # 資金釋放通知
    - "high_rate_alert"    # 高利率警報
```

## 📈 效能優化

- WebSocket 連接池管理
- 非阻塞通知發送（goroutine）
- 客戶端自動重連機制
- 歷史記錄本地儲存（localStorage）

## 🔍 除錯方法

### 查看 Bot 日誌
```bash
tail -f /tmp/bot.log
```

### 瀏覽器開發者工具
```javascript
// 在 Console 中查看 WebSocket 訊息
console.log('WebSocket state:', ws.readyState);
```

### 手動發送測試訊息
使用 `test_web_notification.html` 或在 Console 中：

```javascript
ws.send(JSON.stringify({
    type: 'notification',
    data: {
        type: 'success',
        title: '測試',
        message: '這是測試訊息'
    }
}));
```

## 📝 注意事項

1. **模板更新**: Go 使用 embed，修改模板需重新編譯
2. **WebSocket 限制**: 同時連接數受系統限制
3. **通知頻率**: 避免過度頻繁的通知影響效能
4. **瀏覽器相容性**: 建議使用現代瀏覽器（Chrome/Firefox/Safari）

## 🎉 總結

透過這次更新，Bitfinex 放貸機器人現在擁有：

- ✅ **全方位監控**: 網頁 + Telegram 雙重通知
- ✅ **即時互動**: WebSocket 即時推送
- ✅ **視覺化介面**: 策略狀態一目瞭然
- ✅ **歷史追蹤**: 完整的通知記錄
- ✅ **中文體驗**: 統一的中文介面

現在你可以在網頁上即時看到：
- 每筆訂單成交
- 資金釋放情況
- 高利率警報
- 策略執行決策

享受更智能、更視覺化的放貸體驗！🚀