# 雙實例部署指南

**版本**: v2.2
**日期**: 2025-10-23
**功能**: 同時運行 USD 和 USDT 兩個放貸實例

---

## 📋 概述

此指南說明如何同時運行兩個獨立的 Bot 實例，分別處理 USD 和 USDT 放貸。

### 架構設計

```
┌─────────────────────────────────────────────┐
│          雙實例架構                          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌──────────────┐    │
│  │ USD Instance │      │ USDT Instance│    │
│  ├──────────────┤      ├──────────────┤    │
│  │ Config:      │      │ Config:      │    │
│  │  - USD only  │      │  - USDT only │    │
│  │  - Port 8090 │      │  - Port 8091 │    │
│  │  - Port 8081 │      │  - Port 8082 │    │
│  │  - PID: usd  │      │  - PID: usdt │    │
│  └──────────────┘      └──────────────┘    │
│         │                      │            │
│         └──────────┬───────────┘            │
│                    │                        │
│              Bitfinex API                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 端口配置

| 實例  | Web 界面 | Metrics | 配置文件               | PID 文件      | 日誌文件           |
|------|---------|---------|----------------------|--------------|------------------|
| USD  | 8090    | 8081    | config-usd.yaml      | bot-usd.pid  | bot-usd.log      |
| USDT | 8091    | 8082    | config-usdt.yaml     | bot-usdt.pid | bot-usdt.log     |

---

## 🚀 快速開始

### 1. 編譯程式

```bash
./dual-instance.sh build
```

或者手動編譯：
```bash
go build -o lending-bot cmd/bot/main.go
```

### 2. 配置 API 金鑰

```bash
# 編輯 .env 文件
vim .env
```

```env
BITFINEX_API_KEY=your_api_key_here
BITFINEX_API_SECRET=your_api_secret_here
TELEGRAM_BOT_TOKEN=your_telegram_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. 啟動雙實例

```bash
chmod +x dual-instance.sh
./dual-instance.sh start
```

預期輸出：
```
================================
  啟動雙實例 (USD + USDT)
================================

ℹ️  啟動 USD 實例...
✅ USD 實例啟動成功 (PID: 12345)
ℹ️  日誌文件: lending-bot-usd.log

ℹ️  啟動 USDT 實例...
✅ USDT 實例啟動成功 (PID: 12346)
ℹ️  日誌文件: lending-bot-usdt.log

✅ 雙實例啟動完成

ℹ️  USD Web 界面: http://localhost:8090
ℹ️  USDT Web 界面: http://localhost:8091
ℹ️  USD Metrics: http://localhost:8081/metrics
ℹ️  USDT Metrics: http://localhost:8082/metrics
```

---

## 📊 管理命令

### 查看狀態

```bash
./dual-instance.sh status
```

輸出：
```
================================
  實例狀態
================================

✅ USD 實例正在運行 (PID: 12345)
✅ USDT 實例正在運行 (PID: 12346)

ℹ️  端口使用情況:
  USD Web: 8090
  USD Metrics: 8081
  USDT Web: 8091
  USDT Metrics: 8082
```

### 停止實例

```bash
# 停止所有實例
./dual-instance.sh stop

# 停止單個實例（手動）
pkill -f "lending-bot -config config/config-usd.yaml"
```

### 重啟實例

```bash
./dual-instance.sh restart
```

### 查看日誌

```bash
# 查看 USD 最後 50 行日誌
./dual-instance.sh logs usd

# 查看 USDT 最後 100 行日誌
./dual-instance.sh logs usdt 100

# 查看所有實例日誌
./dual-instance.sh logs all

# 實時監控 USD 日誌
./dual-instance.sh tail usd

# 實時監控所有日誌
./dual-instance.sh tail all
```

---

## ⚙️ 配置說明

### USD 實例配置 (config/config-usd.yaml)

```yaml
# Bot Configuration - USD Instance
bot:
  currencies: ["USD"]  # 只放貸 USD
  min_lend_amount: 200.0
  update_interval: 300
  max_active_offers: 10
  auto_compound: true
  dry_run: false

# Monitoring - USD Instance Ports
monitoring:
  enabled: true
  port: 8081        # Prometheus metrics
  web_port: 8090    # Web dashboard
  metrics_path: "/metrics"
  health_path: "/health"
  update_interval: 10

# Logging
log:
  level: "info"
  format: "json"
  file: "logs/bot-usd.log"  # 獨立日誌
```

### USDT 實例配置 (config/config-usdt.yaml)

```yaml
# Bot Configuration - USDT Instance
bot:
  currencies: ["USDT"]  # 只放貸 USDT
  min_lend_amount: 150.0
  update_interval: 300
  max_active_offers: 10
  auto_compound: true
  dry_run: false

# Monitoring - USDT Instance Ports
monitoring:
  enabled: true
  port: 8082        # Prometheus metrics
  web_port: 8091    # Web dashboard (不同於 USD)
  metrics_path: "/metrics"
  health_path: "/health"
  update_interval: 10

# Logging
log:
  level: "info"
  format: "json"
  file: "logs/bot-usdt.log"  # 獨立日誌
```

---

## 🔍 監控與驗證

### 1. 檢查 Web 界面

```bash
# USD 界面
open http://localhost:8090

# USDT 界面
open http://localhost:8091
```

應該看到：
- 不同的幣種餘額
- 獨立的活躍訂單
- 各自的放貸歷史

### 2. 檢查 Metrics

```bash
# USD Metrics
curl http://localhost:8081/metrics | grep lending

# USDT Metrics
curl http://localhost:8082/metrics | grep lending
```

### 3. 檢查進程

```bash
ps aux | grep lending-bot
```

應該看到兩個進程：
```
user  12345  lending-bot -config config/config-usd.yaml
user  12346  lending-bot -config config/config-usdt.yaml
```

### 4. 檢查 PID 文件

```bash
ls -la bot-*.pid
cat bot-usd.pid
cat bot-usdt.pid
```

---

## 🐛 故障排除

### 問題 1: 端口已被占用

**錯誤**: `bind: address already in use`

**解決方案**:
```bash
# 查找占用端口的進程
lsof -i:8090
lsof -i:8091

# 停止占用進程
kill <PID>

# 或使用管理腳本
./dual-instance.sh stop
```

### 問題 2: 實例無法啟動

**檢查步驟**:

1. 查看日誌
```bash
./dual-instance.sh logs usd 100
./dual-instance.sh logs usdt 100
```

2. 檢查配置文件
```bash
# 驗證 YAML 語法
yamllint config/config-usd.yaml
yamllint config/config-usdt.yaml
```

3. 檢查 API 金鑰
```bash
# 確認環境變量已設置
env | grep BITFINEX
```

### 問題 3: PID 文件衝突

**錯誤**: `another instance is already running`

**解決方案**:
```bash
# 清理陳舊的 PID 文件
rm -f bot-usd.pid bot-usdt.pid

# 或使用腳本自動清理
./dual-instance.sh stop
```

### 問題 4: 兩個實例使用相同幣種

**症狀**: 兩個實例都顯示 USD 或 USDT

**解決方案**:
```bash
# 檢查配置文件
grep "currencies:" config/config-usd.yaml
grep "currencies:" config/config-usdt.yaml

# 應該分別顯示：
# USD:  currencies: ["USD"]
# USDT: currencies: ["USDT"]
```

---

## 📈 性能建議

### 資源需求

| 資源   | 單實例 | 雙實例 | 建議值 |
|-------|--------|--------|--------|
| 記憶體 | ~50MB  | ~100MB | 256MB+ |
| CPU   | <1%    | <2%    | 2核心+ |
| 網路   | 低     | 低     | 穩定連線|

### 優化建議

1. **更新間隔**
   - 建議保持 300 秒（5分鐘）
   - 避免過度頻繁查詢 API

2. **日誌級別**
   - 生產環境使用 `info`
   - 調試時使用 `debug`

3. **監控設置**
   - 定期檢查兩個實例的健康狀態
   - 設置 Prometheus 告警

---

## 🔄 升級流程

### 更新代碼

```bash
# 1. 停止所有實例
./dual-instance.sh stop

# 2. 拉取最新代碼
git pull origin main

# 3. 重新編譯
./dual-instance.sh build

# 4. 啟動實例
./dual-instance.sh start
```

### 配置變更

```bash
# 1. 停止相應實例
./dual-instance.sh stop

# 2. 修改配置
vim config/config-usd.yaml

# 3. 重啟實例
./dual-instance.sh start
```

---

## 📝 系統服務（可選）

### 創建 systemd 服務

**USD 服務** (`/etc/systemd/system/lending-bot-usd.service`):

```ini
[Unit]
Description=Bitfinex Lending Bot - USD Instance
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/bitfinex-lending-bot
ExecStart=/path/to/lending-bot -config config/config-usd.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**USDT 服務** (`/etc/systemd/system/lending-bot-usdt.service`):

```ini
[Unit]
Description=Bitfinex Lending Bot - USDT Instance
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/bitfinex-lending-bot
ExecStart=/path/to/lending-bot -config config/config-usdt.yaml
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**啟用服務**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lending-bot-usd
sudo systemctl enable lending-bot-usdt
sudo systemctl start lending-bot-usd
sudo systemctl start lending-bot-usdt
sudo systemctl status lending-bot-usd
sudo systemctl status lending-bot-usdt
```

---

## ✅ 檢查清單

部署前檢查：

- [ ] 已編譯最新版本 (`./dual-instance.sh build`)
- [ ] API 金鑰已設置（`.env` 文件）
- [ ] config-usd.yaml 配置正確（currencies: ["USD"]）
- [ ] config-usdt.yaml 配置正確（currencies: ["USDT"]）
- [ ] 端口未被占用（8090, 8091, 8081, 8082）
- [ ] logs/ 目錄存在且可寫
- [ ] 執行權限已設置 (`chmod +x dual-instance.sh`)

部署後驗證：

- [ ] 兩個實例都成功啟動
- [ ] USD Web 界面可訪問 (http://localhost:8090)
- [ ] USDT Web 界面可訪問 (http://localhost:8091)
- [ ] USD 顯示 USD 餘額和訂單
- [ ] USDT 顯示 USDT 餘額和訂單
- [ ] 日誌正常記錄
- [ ] Metrics 端點正常響應

---

## 🔗 相關文檔

- [多幣種支援指南](MULTI_CURRENCY_GUIDE.md)
- [單幣種運行說明](../IMPORTANT_SINGLE_CURRENCY.md)
- [部署指南](DEPLOYMENT.md)
- [操作指南](OPERATION_GUIDE.md)

---

## 📞 支援

如遇問題：

1. 查看日誌: `./dual-instance.sh logs all`
2. 檢查狀態: `./dual-instance.sh status`
3. 查閱文檔: `docs/` 目錄
4. 提交 Issue: GitHub Issues

---

**最後更新**: 2025-10-23
**版本**: v2.2 (Dual Instance Support)
