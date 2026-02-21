# 高利率通知系統規劃 (High Rate Notification System Plan)

## 1. 市場競品分析

### 更新頻率對比
| 機器人 | 檢查頻率 | 高利率反應 | 通知機制 |
|--------|----------|------------|----------|
| **我們的Bot** | 5分鐘 (正常) / 1分鐘 (高利率) | ✅ 動態調整 | ⚠️ 待實現 |
| **EarnUSD** | 5分鐘 | 固定頻率 | 未知 |
| **Willy** | 15分鐘 | 固定頻率 | Telegram |
| **FULY** | 20分鐘 | 未知 | 未知 |

### 我們的優勢
- **最快反應速度**: 高利率時自動切換到1分鐘更新
- **智能檢測**: 多層級高利率檢測機制
- **動態調度**: 根據市場情況自動調整策略

## 2. 現有高利率檢測機制

### 2.1 檢測層級
```go
// 利率等級定義
EXTREME:    > 20% APY (0.0548% daily)
VERY_HIGH:  > 15% APY (0.0411% daily)
HIGH:       > 12% APY (0.0329% daily)
MEDIUM:     > 8%  APY (0.0219% daily)
LOW:        < 8%  APY
```

### 2.2 觸發條件
- FRR超過閾值 (預設 0.01 = 1% daily)
- 最佳賣價超過閾值
- 利率突升檢測 (10分鐘內上升50%)
- 需求量激增檢測

### 2.3 響應策略
```
EXTREME/VERY_HIGH:
- 切換到1分鐘更新頻率
- 釋放所有保留資金
- 最大化長期鎖定 (70% 資金30天期)
- 發送緊急通知

HIGH:
- 切換到3分鐘更新頻率
- 釋放50%保留資金
- 增加中長期配置
- 發送高優先級通知

MEDIUM:
- 維持5分鐘更新
- 正常資金配置
- 記錄但不通知
```

## 3. 通知系統設計

### 3.1 Telegram 整合
```yaml
notification:
  telegram:
    enabled: true
    token: "${TELEGRAM_BOT_TOKEN}"
    chat_id: "${TELEGRAM_CHAT_ID}"

    # 高利率通知設定
    high_rate_alerts:
      enabled: true
      min_rate: 0.0329  # 12% APY
      channels:
        - type: "personal"
          chat_id: "${PERSONAL_CHAT_ID}"
        - type: "group"
          chat_id: "${GROUP_CHAT_ID}"

      # 通知模板
      templates:
        extreme: |
          🚨 極端高利率警報！
          當前FRR: {frr_rate} ({apy}% APY)
          建議行動: {actions}
          預計收益: ${expected_profit}

        high: |
          📈 高利率機會！
          當前FRR: {frr_rate} ({apy}% APY)
          已自動調整策略
```

### 3.2 Discord 整合
```go
type DiscordNotifier struct {
    WebhookURL string
    Embeds     []DiscordEmbed
}

// Discord 富文本訊息
type DiscordEmbed struct {
    Title       string
    Description string
    Color       int    // 顏色代碼
    Fields      []EmbedField
    Timestamp   time.Time
}
```

### 3.3 LINE Notify 整合
```go
type LineNotifier struct {
    AccessToken string
    ApiURL      string // https://notify-api.line.me/api/notify
}

// LINE 訊息格式
func (l *LineNotifier) SendHighRateAlert(rate float64) error {
    message := fmt.Sprintf("\n💰 高利率通知\n利率: %.2f%%\n年化: %.2f%%",
        rate*100, rate*365*100)

    // 可附加圖片
    if rate > 0.05 { // 極端高利率
        l.AttachChart(generateRateChart())
    }
}
```

## 4. 前端網頁顯示設計

### 4.1 高利率通知面板
```html
<!-- 新增通知面板 -->
<div class="notification-panel">
    <h2>📢 高利率通知</h2>

    <!-- 當前狀態指示器 -->
    <div class="rate-indicator">
        <div class="status-light" :class="rateLevel"></div>
        <span>{{ rateStatus }}</span>
        <span class="current-rate">{{ currentAPY }}% APY</span>
    </div>

    <!-- 歷史通知列表 -->
    <div class="notification-history">
        <div v-for="notification in notifications" class="notification-item">
            <span class="timestamp">{{ notification.time }}</span>
            <span class="level" :class="notification.level">
                {{ notification.level }}
            </span>
            <span class="message">{{ notification.message }}</span>
        </div>
    </div>

    <!-- 策略決策顯示 -->
    <div class="strategy-decisions">
        <h3>自動策略調整</h3>
        <ul>
            <li v-for="decision in strategyDecisions">
                {{ decision.action }} - {{ decision.reason }}
            </li>
        </ul>
    </div>
</div>
```

### 4.2 即時圖表顯示
```javascript
// 利率趨勢圖表
const rateChart = {
    type: 'line',
    data: {
        labels: timeLabels,
        datasets: [{
            label: 'FRR',
            data: frrHistory,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }, {
            label: '高利率閾值',
            data: Array(timeLabels.length).fill(12), // 12% APY
            borderColor: 'rgba(255, 99, 132, 0.5)',
            borderDash: [5, 5]
        }]
    },
    options: {
        responsive: true,
        plugins: {
            annotation: {
                annotations: {
                    // 標記高利率事件
                    ...highRateEvents.map(event => ({
                        type: 'line',
                        xMin: event.time,
                        xMax: event.time,
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2,
                    }))
                }
            }
        }
    }
}
```

### 4.3 WebSocket 即時更新
```javascript
// 新增高利率通知的 WebSocket 事件
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);

    switch(data.type) {
        case 'high_rate_alert':
            showHighRateNotification(data);
            updateStrategyPanel(data.strategy);
            playAlertSound(data.level);
            break;

        case 'rate_trend_update':
            updateRateChart(data.history);
            updatePrediction(data.nextHighRate);
            break;

        case 'strategy_decision':
            addStrategyDecision(data.decision);
            break;
    }
}
```

## 5. 實施計劃

### Phase 1: 後端通知系統 (1-2天)
- [ ] 實現 Telegram 通知
- [ ] 實現 Discord webhook
- [ ] 實現 LINE Notify
- [ ] 整合到 HighRateManager

### Phase 2: 前端顯示 (2-3天)
- [ ] 新增通知面板
- [ ] 實現即時圖表
- [ ] WebSocket 事件處理
- [ ] 策略決策顯示

### Phase 3: 測試與優化 (1天)
- [ ] 測試各通知渠道
- [ ] 優化通知頻率
- [ ] 調整閾值設定
- [ ] 壓力測試

## 6. 配置範例

```yaml
# 高利率通知配置
high_rate_notification:
  enabled: true

  # 通知閾值
  thresholds:
    extreme: 0.0548  # 20% APY
    very_high: 0.0411 # 15% APY
    high: 0.0329      # 12% APY
    medium: 0.0219    # 8% APY

  # 通知頻率限制
  rate_limit:
    extreme: 0       # 無限制
    very_high: 300   # 5分鐘一次
    high: 900        # 15分鐘一次
    medium: 3600     # 1小時一次

  # 通知渠道
  channels:
    telegram:
      enabled: true
      priority: ["extreme", "very_high", "high"]

    discord:
      enabled: true
      priority: ["extreme", "very_high"]

    line:
      enabled: true
      priority: ["extreme"]

    web:
      enabled: true
      priority: ["all"]
```

## 7. 預期效果

### 7.1 反應速度提升
- 高利率檢測: 1分鐘內
- 通知發送: 10秒內
- 策略調整: 即時

### 7.2 收益優化
- 預計提升 2-5% 年化收益
- 減少錯過高利率機會
- 自動化決策降低人工成本

### 7.3 風險控制
- 避免過度集中
- 保持流動性
- 緊急停損機制

## 8. 監控指標

```go
// 高利率監控指標
type HighRateMetrics struct {
    TotalAlerts      int       // 總通知數
    SuccessfulLoans  int       // 成功放貸數
    MissedOpportunities int    // 錯過機會數
    AverageResponse  Duration  // 平均響應時間
    ProfitIncrease   float64   // 收益提升
}
```

## 9. 注意事項

1. **通知頻率控制**: 避免過度通知造成干擾
2. **隱私保護**: 不在群組顯示敏感資訊
3. **故障恢復**: 通知服務異常不影響主要功能
4. **合規性**: 遵守各平台API使用規範

## 10. 未來優化方向

- AI預測模型整合
- 多交易所套利通知
- 自定義通知規則引擎
- 社群共享高利率資訊