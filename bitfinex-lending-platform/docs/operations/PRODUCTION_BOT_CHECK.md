# 生產環境機器人檢查指南

## 快速指令

當用戶說「檢查生產機器人」或類似指令時，執行以下步驟：

## 1. 檢查 Railway 狀態

```bash
# 確認連接
railway status

# 獲取最新日誌
railway logs --service api -n 200
```

## 2. 關鍵日誌過濾

```bash
# 策略執行日誌
railway logs --service api -n 500 2>&1 | grep -E "(strategy|offer|rebalance|SMART|rate|FRR|技術指標)" | tail -100

# 錯誤和警告
railway logs --service api -n 500 2>&1 | grep -E "(error|warning|ERROR|WARNING)" | tail -50

# 訂單提交
railway logs --service api -n 500 2>&1 | grep -E "(Submitted|executed|closed)" | tail -50
```

## 3. 正常運作標誌

### 策略正常
- `Strategy initialized successfully`
- `Strategy generated X offers`
- `Submitted offer: XXX @ X.XX% for X days`

### 技術指標正常
- `技術指標計算完成`
- `overall_sentiment` 有值（看漲/看跌/中性）
- `bullish_score` 和 `bearish_score` 有數值

### 餘額狀態
- `Available balance calculation` 顯示正確餘額
- 當餘額 < $150 時：`Available balance X below minimum 150.00, skipping offer creation`

## 4. 常見問題

### 問題 1: loan not found 警告
```
Failed to close loan in database: loan not found
```
- **原因**：貸款在機器人重啟前就已存在，資料庫無記錄
- **影響**：無，僅警告
- **處理**：可忽略

### 問題 2: 長時間無法下單
```
Available balance X below minimum 150.00, skipping offer creation
```
- **原因**：所有資金都已借出
- **處理**：等待貸款到期返還，這是正常狀態

### 問題 3: WebSocket 斷線
```
WebSocket connection closed
WebSocket reconnecting...
```
- **處理**：自動重連，通常無需處理

## 5. 報價分析指標

### 健康的利率範圍
- 最低層：5-10% APR（快速成交）
- 中間層：10-20% APR
- 最高層：20-30% APR（捕捉高利率）

### 健康的期限分配
- 低利率：2-3 天
- 中利率：7 天
- 高利率：7-14 天

### 金額分配
- 每層應 ≥ $150（Bitfinex 最低要求）
- 動態調整：層數會根據可用餘額自動調整

## 6. ML 決策驗證

### 檢查 ML 是否運作

```bash
# 查看 ML 相關日誌
railway logs --service api -n 300 | grep -E "(ML adjustment|ML-Enhanced|rate_change|ml_allocation)"
```

### ML 正常運作的日誌

當有足夠餘額（≥$150）下單時，會看到：

```log
# 1. ML 餘額分配調整
INFO ML adjusted balance allocation  strategy=Hybrid  original_balance=500  ml_allocation=0.9  adjusted_balance=450

# 2. ML 調整因子
INFO ML adjustment factors applied  risk_adjust=1.1  volatility_adjust=0.85  trend_adjust=1.2  offers_count=5

# 3. 每個訂單的具體調整
INFO ML rate/period adjustment applied to offer  offer_index=0  original_rate=0.00042  adjusted_rate=0.000462  rate_change_pct=10.00%  original_period=7  adjusted_period=8

# 4. 提交確認（帶 ML-Enhanced 標記）
INFO Submitted offer: 150.00 @ 16.89% for 8 days (ID: xxx) [ML-Enhanced]
```

### ML 日誌解讀

| 欄位 | 說明 |
|------|------|
| `ml_allocation` | ML 建議的資金配置比例（0.0-1.0） |
| `risk_adjust` | 風險調整因子（>1 更激進，<1 更保守） |
| `volatility_adjust` | 波動性調整 |
| `trend_adjust` | 趨勢調整（影響期限） |
| `rate_change_pct` | 利率變化百分比 |
| `[ML-Enhanced]` | 訂單已套用 ML 調整 |

### 為何看不到 ML 日誌？

1. **餘額不足**：可用餘額 < $150，不會創建訂單，也就沒有 ML 日誌
2. **ML 未啟用**：檢查 Bot 設定是否啟用 ML
3. **剛部署**：需等待下一個交易週期

### ML Admin Dashboard

瀏覽器訪問：
```
https://api-production-041c.up.railway.app/admin/ml/dashboard
```

### ML API 端點

```bash
# 最近 ML 決策
curl https://api-production-041c.up.railway.app/admin/ml/api/decisions

# Bot ML 統計
curl https://api-production-041c.up.railway.app/admin/ml/api/bot-stats

# 市場分析
curl https://api-production-041c.up.railway.app/admin/ml/api/markets
```

## 7. 用戶資訊查詢

如果用戶提供 email（如 aa22396584@gmail.com），這是 Firebase 認證帳號：
- 對應 Railway 平台的多租戶用戶
- tenant_id 和 bot_id 可在日誌中找到

## 7. Railway 專案資訊

- Project: `bitfinex-lending-platform`
- Environment: `production`
- Service: `api`
- Port: 8080
- Health Check: `/health`
