# 📖 Bitfinex 放貸機器人操作指南

## 部署

```bash
# 遠端部署（測試 → build → 上傳 GCE → 重啟 → 驗證）
./deploy.sh --remote

# Dry-run（只測試 + build）
./deploy.sh --dry-run

# 回滾
gcloud compute ssh lending-platform --zone=asia-east1-b -- \
  'cd ~/bitfinex-lending-bot && cp lending-bot.bak lending-bot && ./dual-instance.sh restart --no-build'
```


## 目錄
- [快速開始](#快速開始)
- [日常操作](#日常操作)
- [監控與管理](#監控與管理)
- [故障排除](#故障排除)
- [最佳實踐](#最佳實踐)

---

## 快速開始

### 1. 首次啟動檢查清單

#### ✅ 環境準備
- [ ] Go 1.21+ 已安裝
- [ ] Git 已安裝
- [ ] 網路連接正常
- [ ] 有效的 Bitfinex 帳戶

#### ✅ API 金鑰設置
1. 登入 Bitfinex
2. 前往 API Management
3. 創建新金鑰，勾選權限：
   - [x] Account Balance
   - [x] Margin Funding (Read/Write)
   - [ ] 其他權限（不需要）

#### ✅ 專案設置
```bash
# 1. 克隆專案
git clone https://github.com/ImL1s/bitfinex-lending-bot.git
cd bitfinex-lending-bot

# 2. 設置環境變數
cp .env.example .env
nano .env  # 編輯並填入 API 金鑰

# 3. 編譯程式
go build -o lending-bot cmd/bot/main.go

# 4. 啟動機器人
./lending-bot
```

### 2. 驗證運行狀態

#### 檢查日誌
```bash
# 查看即時日誌
tail -f bot_updated_web.log

# 檢查錯誤
grep ERROR bot_updated_web.log

# 查看 VAR 貸款狀態
grep "VAR\|FRR" bot_updated_web.log
```

#### 訪問監控介面
打開瀏覽器訪問：`http://localhost:8090`

應該看到：
- ✅ WebSocket 顯示 "Connected"
- ✅ 餘額資訊正確顯示
- ✅ 活躍貸款列表
- ✅ 掛單列表

---

## 日常操作

### 1. 啟動與停止

#### 正常啟動
```bash
# 前台運行（用於調試）
./lending-bot

# 後台運行（推薦）
nohup ./lending-bot > bot.log 2>&1 &
echo $! > bot.pid  # 保存 PID
```

#### 安全停止
```bash
# 使用 PID 停止
kill $(cat bot.pid)

# 或查找並停止
ps aux | grep lending-bot
kill [PID]
```

### 2. 資金管理

#### 資金狀態說明
| 狀態 | 說明 | 操作建議 |
|-----|------|---------|
| 🟢 閒置餘額 | 可立即用於放貸 | 機器人會自動使用 |
| 🟡 掛單中 | 已提交等待執行 | 耐心等待 |
| 🔵 已執行 | 正在賺取利息 | 等待到期返還 |
| 🟠 待結算 | 利息待入帳 | 系統自動處理 |

#### 餘額不足處理
當看到日誌：
```
Available balance 0.00 below absolute minimum ($150)
```

解決方案：
1. 等待貸款到期返還
2. 從 Exchange 錢包轉入資金
3. 調整最小金額設置

### 3. 策略調整

#### 修改配置文件
```yaml
# config/config.yaml
bot:
  min_loan_amount: 150    # 降低最小金額
  reserve_percentage: 0.05 # 減少保留金至 5%

strategy:
  aggressive_mode: true    # 啟用激進模式
  target_apr: 0.10        # 目標年化 10%
```

修改後重啟：
```bash
kill $(cat bot.pid)
./lending-bot
```

---

## 監控與管理

### 1. Web 監控介面使用

#### 主要指標解讀

**平均利率 (Average Rate)**
- 正常範圍：8-12% APR
- 包含 VAR 貸款的加權平均
- 實時更新

**風險評分 (Risk Score)**
- < 0.3：低風險，正常運作
- 0.3-0.6：中風險，謹慎操作
- > 0.6：高風險，暫停新單

**資金使用率**
```
使用率 = (已執行 + 掛單中) / 總資金 × 100%
目標：> 85%
```

### 2. API 監控端點

#### 獲取即時統計
```bash
curl http://localhost:8090/api/stats | jq
```

返回數據：
```json
{
  "active_offers": 5,
  "active_credits": 12,
  "total_lent": 3096.35,
  "average_rate": 0.000243,
  "total_earnings": 47.44,
  "daily_average": 1.58
}
```

#### 查看活躍貸款
```bash
curl http://localhost:8090/api/credits | jq
```

### 3. 效能監控

#### 系統資源
```bash
# CPU 使用率
top -p $(cat bot.pid)

# 內存使用
ps aux | grep lending-bot

# 網路連接
netstat -an | grep 8090
```

#### WebSocket 健康檢查
```javascript
// 瀏覽器控制台測試
const ws = new WebSocket('ws://localhost:8090/ws');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 故障排除

### 常見問題與解決

#### 1. WebSocket 斷線
**症狀**：介面顯示 "Disconnected"

**解決**：
```bash
# 檢查進程
ps aux | grep lending-bot

# 查看錯誤日誌
tail -100 lending-bot-usd.log | grep ERROR
tail -100 lending-bot-usdt.log | grep ERROR

# 重啟服務
./dual-instance.sh restart
```

#### 2. VAR 貸款顯示異常
**症狀**：VAR 貸款利率顯示 0.30%

**解決**：
- 確保使用最新版本代碼
- 檢查 FRR 更新：
```bash
grep "VAR loan rate" bot.log
```

#### 3. 無法創建新訂單
**症狀**：日誌顯示餘額不足

**診斷步驟**：
```bash
# 1. 檢查實際餘額
curl http://localhost:8090/api/stats | jq '.actual_available'

# 2. 檢查待結算利息
grep "unsettled_interest" bot.log

# 3. 查看保留金設置
grep "reserve" bot.log
```

#### 4. API 限流錯誤
**症狀**：`rate limit exceeded`

**解決**：
- 增加請求間隔
- 減少 API 調用頻率
- 使用 WebSocket 替代輪詢

### 錯誤代碼對照表

| 錯誤代碼 | 含義 | 解決方案 |
|---------|------|---------|
| 10114 | Nonce 太小 | 重啟機器人 |
| 10100 | API 金鑰無效 | 檢查 .env 配置 |
| 10300 | 餘額不足 | 等待資金返還 |
| 11010 | 速率限制 | 減少請求頻率 |

---

## 最佳實踐

### 1. 安全建議

#### API 金鑰管理
```bash
# 定期更換金鑰（每月）
# 1. 創建新金鑰
# 2. 更新 .env
# 3. 重啟機器人
# 4. 刪除舊金鑰
```

#### 備份重要文件
```bash
# 創建備份腳本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf backup_$DATE.tar.gz .env config/ *.log
EOF

chmod +x backup.sh
./backup.sh
```

### 2. 效能優化

#### 日誌管理
```bash
# 定期清理日誌（每週）
cat > clean_logs.sh << 'EOF'
#!/bin/bash
# 保留最近 7 天的日誌
find . -name "*.log" -mtime +7 -delete

# 壓縮當前日誌
gzip -k bot_updated_web.log
mv bot_updated_web.log.gz logs/
EOF

chmod +x clean_logs.sh
```

#### 系統調優
```yaml
# 優化配置
bot:
  update_interval: 60      # 減少更新頻率
  websocket_timeout: 30    # 增加超時時間
  max_retries: 5          # 增加重試次數
```

### 3. 監控告警

#### 設置告警規則
```bash
# 餘額過低告警
if [ $(curl -s http://localhost:8090/api/stats | jq '.actual_available') -lt 150 ]; then
  echo "Warning: Low balance!" | mail -s "Bot Alert" your@email.com
fi

# 風險過高告警
RISK=$(curl -s http://localhost:8090/api/stats | jq '.risk_score')
if (( $(echo "$RISK > 0.6" | bc -l) )); then
  echo "Warning: High risk detected!" | mail -s "Bot Alert" your@email.com
fi
```

### 4. 維護計劃

#### 每日檢查
- [ ] 查看餘額狀態
- [ ] 檢查平均利率
- [ ] 確認 WebSocket 連接

#### 每週維護
- [ ] 清理日誌文件
- [ ] 備份配置文件
- [ ] 檢查系統資源

#### 每月更新
- [ ] 更新程式碼
- [ ] 更換 API 金鑰
- [ ] 審查策略效果

---

## 進階操作

### 1. 多帳戶管理

```bash
# 為不同帳戶創建配置
cp .env .env.account1
cp .env .env.account2

# 啟動多個實例
./lending-bot --env .env.account1 --port 8090 &
./lending-bot --env .env.account2 --port 8091 &
```

### 2. 自動化部署

```bash
# 創建 systemd 服務
sudo nano /etc/systemd/system/lending-bot.service

[Unit]
Description=Bitfinex Lending Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bitfinex-lending-bot
ExecStart=/home/ubuntu/bitfinex-lending-bot/lending-bot
Restart=always

[Install]
WantedBy=multi-user.target

# 啟用服務
sudo systemctl enable lending-bot
sudo systemctl start lending-bot
```

### 3. 數據分析

```sql
-- 如果使用數據庫記錄
SELECT
  DATE(created_at) as date,
  AVG(rate) * 365 * 100 as avg_apr,
  SUM(amount) as total_amount,
  COUNT(*) as loan_count
FROM loans
WHERE status = 'EXECUTED'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 聯絡支援

遇到問題時：

1. **查看文檔**：本指南和 README.md
2. **搜索 Issues**：GitHub Issues 頁面
3. **提交問題**：創建新 Issue，附上：
   - 錯誤日誌
   - 配置文件（隱藏敏感信息）
   - 重現步驟

---

**最後更新**：2025-09-28 | **版本**：v2.0
