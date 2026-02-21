# 🚀 Bitfinex 放貸機器人設置指南

## 📋 目錄
1. [前置準備](#前置準備)
2. [API 密鑰設置](#api-密鑰設置)
3. [環境變數配置](#環境變數配置)
4. [策略配置](#策略配置)
5. [啟動機器人](#啟動機器人)
6. [監控與管理](#監控與管理)

## 🔧 前置準備

### 系統需求
- Go 1.21 或以上版本
- Docker & Docker Compose（可選）
- Git

### 克隆專案
```bash
git clone https://github.com/iml1s/bitfinex-lending-bot.git
cd bitfinex-lending-bot
```

## 🔑 API 密鑰設置

### 1. 在 Bitfinex 創建 API 密鑰

1. 登入 [Bitfinex](https://www.bitfinex.com)
2. 前往 **Account** → **API Keys**
3. 點擊 **Create New Key**
4. 設置權限（**重要**）：
   ```
   ✅ Account Balance (Read)
   ✅ Margin Funding (Read, Write)
   ❌ Exchange Trading (不需要)
   ❌ Margin Trading (不需要)
   ❌ Wallets (Transfer 不需要)
   ```
5. 保存 **API Key** 和 **API Secret**

### 2. API 權限說明
| 權限 | 需要 | 說明 |
|-----|------|------|
| Account Balance | ✅ | 讀取餘額資訊 |
| Margin Funding Read | ✅ | 讀取放貸訂單 |
| Margin Funding Write | ✅ | 創建/取消放貸訂單 |
| Exchange Trading | ❌ | 不需要交易權限 |
| Wallets Transfer | ❌ | 不需要轉帳權限 |

⚠️ **安全提醒**：只授予必要權限，降低風險

## 📝 環境變數配置

### 方法一：使用 .env 文件（推薦）

1. 複製範例文件：
```bash
cp .env.example .env
```

2. 編輯 `.env` 文件：
```bash
nano .env  # 或使用任何文字編輯器
```

3. 填入你的 API 密鑰：
```env
# 必要設置
BITFINEX_API_KEY=你的API密鑰
BITFINEX_API_SECRET=你的API密鑰

# 策略設置（可選，會覆蓋 config.yaml）
BFX_STRATEGY_TYPE=hybrid        # 使用混合策略
BFX_BOT_CURRENCY=USD            # 放貸幣種
BFX_BOT_MIN_LEND_AMOUNT=50.0    # 最小放貸金額
BFX_BOT_UPDATE_INTERVAL=60      # 更新間隔（秒）
BFX_BOT_DRY_RUN=false           # false=實盤, true=模擬

# Telegram 通知（可選）
TELEGRAM_BOT_TOKEN=你的機器人Token
TELEGRAM_CHAT_ID=你的ChatID
```

### 方法二：使用系統環境變數

```bash
# Linux/Mac
export BITFINEX_API_KEY="你的API密鑰"
export BITFINEX_API_SECRET="你的API密鑰"

# Windows PowerShell
$env:BITFINEX_API_KEY="你的API密鑰"
$env:BITFINEX_API_SECRET="你的API密鑰"
```

## ⚙️ 策略配置

### 1. 創建配置文件

```bash
cp config/config.example.yaml config/config.yaml
cp config/strategies.yaml config/strategies.yaml
```

### 2. 選擇策略模式

#### 選項 A：使用 GPT 建議的混合策略（推薦）
編輯 `config/config.yaml`：
```yaml
strategy:
  type: "hybrid"  # 使用混合策略
```

然後在 `config/strategies.yaml` 中已有預設的三模板配置：
- 被動收益（40%）：FRR Delta +2 bps
- 主動交易（30%）：頂簿壓價
- 利率鎖定（30%）：階梯分佈

#### 選項 B：使用單一策略
編輯 `config/config.yaml`：
```yaml
strategy:
  type: "grid"  # 或 "adaptive", "frr", "frr_delta", "top_book"

  grid:
    grid_levels: 5
    min_rate: 0.0001  # 0.01% 日利率
    max_rate: 0.001   # 0.1% 日利率
    period: 14        # 14 天
```

### 3. 風險管理設置

```yaml
risk:
  max_exposure: 0.9         # 最多使用 90% 資金
  min_reserve: 0.1          # 保留 10% 準備金
  max_single_offer_pct: 0.2 # 單筆最大 20%
```

## 🚀 啟動機器人

### 方法一：直接運行（開發模式）

```bash
# 安裝依賴
go mod download

# 編譯
go build -o lending-bot cmd/bot/main.go

# 運行（模擬模式）
BFX_BOT_DRY_RUN=true ./lending-bot

# 運行（實盤模式）
./lending-bot
```

### 方法二：使用 Docker（推薦生產環境）

```bash
# 構建 Docker 映像
docker build -t bitfinex-lending-bot .

# 運行容器
docker run -d \
  --name lending-bot \
  --env-file .env \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  -p 8080:8080 \
  bitfinex-lending-bot
```

### 方法三：使用 Docker Compose（完整套件）

```bash
# 啟動所有服務（包括監控）
docker-compose up -d

# 查看日誌
docker-compose logs -f bot

# 停止服務
docker-compose down
```

## 📊 監控與管理

### 1. 查看機器人狀態

```bash
# 查看日誌
tail -f logs/bot.log

# Docker 容器日誌
docker logs -f lending-bot
```

### 2. Prometheus 指標

訪問 `http://localhost:8080/metrics` 查看指標：
- `lending_bot_balance_total` - 總餘額
- `lending_bot_active_offers` - 活躍訂單數
- `lending_bot_average_rate` - 平均利率
- `lending_bot_utilization` - 資金利用率

### 3. Grafana 儀表板

如果使用 Docker Compose：
1. 訪問 `http://localhost:3000`
2. 登入（默認：admin/admin）
3. 導入儀表板 `monitoring/grafana/dashboards/lending-bot.json`

### 4. 健康檢查

```bash
# API 健康檢查
curl http://localhost:8080/health

# 期望返回
{"status":"healthy","version":"2.0.0"}
```

## 🔐 安全建議

### 1. API 密鑰安全
- ✅ 只授予必要權限（Funding Read/Write）
- ✅ 使用 `.env` 文件，不要硬編碼
- ✅ 將 `.env` 加入 `.gitignore`
- ✅ 定期輪換 API 密鑰
- ❌ 永遠不要分享或提交 API 密鑰

### 2. 系統安全
```bash
# 設置適當的文件權限
chmod 600 .env
chmod 644 config/config.yaml

# 使用非 root 用戶運行
useradd -m lending-bot
chown -R lending-bot:lending-bot /path/to/bot
su - lending-bot -c "./lending-bot"
```

### 3. 網絡安全
- 使用防火牆限制監控端口訪問
- 考慮使用 VPN 或 SSH 隧道
- 啟用 HTTPS（如果暴露監控界面）

## 🧪 測試與驗證

### 1. 模擬模式測試

```bash
# 設置模擬模式
export BFX_BOT_DRY_RUN=true

# 運行測試
./lending-bot

# 檢查日誌確認模擬交易
grep "DRY RUN" logs/bot.log
```

### 2. 小額實盤測試

1. 設置小額資金（如 $50）
2. 配置最小放貸金額：
   ```yaml
   bot:
     min_lend_amount: 50.0
   ```
3. 運行 24 小時觀察

### 3. 驗證清單

- [ ] API 連接成功
- [ ] 餘額正確顯示
- [ ] 策略正常計算
- [ ] 訂單成功創建
- [ ] 通知正常發送
- [ ] 監控指標更新

## 🆘 常見問題

### Q1: API 連接失敗
```
錯誤：API connection failed
解決：
1. 檢查 API 密鑰是否正確
2. 確認網絡連接
3. 檢查 Bitfinex API 狀態
```

### Q2: 權限不足
```
錯誤：Insufficient permissions
解決：
1. 確認 API 密鑰有 Funding Read/Write 權限
2. 重新生成 API 密鑰
```

### Q3: 餘額為零
```
問題：Bot 顯示餘額為 0
解決：
1. 確認資金在 Funding 錢包
2. 從 Exchange 錢包轉移資金到 Funding
```

### Q4: 策略不生效
```
問題：策略似乎沒有運作
解決：
1. 檢查 dry_run 是否為 false
2. 確認最小放貸金額設置
3. 查看日誌了解詳情
```

## 📚 進階配置

### 1. 多幣種放貸

```yaml
# 在 config/strategies.yaml 中
multi_asset:
  enabled: true
  currencies:
    - USD
    - USDT
    - BTC
    - ETH
```

### 2. 高頻模式

```yaml
# 1 分鐘更新（高利率時）
performance:
  update_intervals:
    turbo: 60  # 秒
```

### 3. 自動複利

```yaml
advanced:
  auto_compound:
    enabled: true
    compound_interval: 3600  # 每小時
```

## 📞 支援

- 📖 [完整文檔](docs/)
- 🐛 [回報問題](https://github.com/iml1s/bitfinex-lending-bot/issues)
- 💬 [社群討論](https://discord.gg/lending-bot)

---

**重要提醒**：加密貨幣放貸有風險，請謹慎投資。本軟體不提供投資建議。

*最後更新：2025-01-19*