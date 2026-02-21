# Bitfinex 放貸機器人雲端部署指南 ☁️

本指南將幫助你把 Bitfinex 放貸機器人部署到雲端伺服器上，實現 24/7 穩定運行。

---

## 📋 目錄

1. [平台選擇建議](#平台選擇建議)
2. [Oracle Cloud 部署（免費方案）](#oracle-cloud-部署免費方案)
3. [Hetzner 部署（付費穩定方案）](#hetzner-部署付費穩定方案)
4. [通用部署步驟](#通用部署步驟)
5. [運維監控](#運維監控)
6. [故障排除](#故障排除)

---

## 🎯 平台選擇建議

| 平台 | 月費 | 規格 | 穩定性 | 推薦場景 |
|------|------|------|-------|---------|
| **Oracle Cloud PAYG** | $0 | 4 OCPU, 24GB RAM (ARM) | ⭐⭐⭐⭐ | 預算有限、願意折騰 |
| **Hetzner** | €3.79 (~$4) | 2 vCPU, 4GB RAM | ⭐⭐⭐⭐⭐ | 穩定優先、省心 |
| **Vultr** | $2.5+ | 1 vCPU, 0.5GB RAM | ⭐⭐⭐⭐ | 簡單快速 |

---

## ☁️ Oracle Cloud 部署（免費方案）

### 第一步：註冊 Oracle Cloud 帳戶

1. 前往 [Oracle Cloud 免費註冊頁面](https://www.oracle.com/cloud/free/)
2. 點擊 **Start for free**
3. 填寫註冊資訊：
   - 使用真實姓名和地址
   - 選擇 **Home Region**（建議：Japan East Tokyo 或 South Korea Chuncheon）
   - 需要綁定信用卡（僅驗證，不會扣款）

> ⚠️ **注意**：不接受虛擬卡、預付卡。不要使用 VPN。

### 第二步：升級到 Pay As You Go（重要！）

升級後仍可使用免費資源，但可避免「閒置回收」問題：

1. 登入 [Oracle Cloud Console](https://cloud.oracle.com/)
2. 點擊右上角頭像 → **Billing & Subscription**
3. 選擇 **Upgrade to Pay As You Go**
4. 確認信用卡資訊

> 💡 升級後，你依然只使用免費資源，不會產生費用。

### 第三步：建立 ARM 實例

1. 進入 **Compute** → **Instances** → **Create Instance**
2. 設定：
   - **Name**: `bitfinex-lending-bot`
   - **Image**: Oracle Linux 8 或 Ubuntu 22.04
   - **Shape**: 選擇 **Ampere** → **VM.Standard.A1.Flex**
     - OCPUs: 1（免費額度內）
     - Memory: 6GB（免費額度內）
   - **Networking**: 使用預設 VCN 或新建
   - **SSH Key**: 上傳你的公鑰或讓系統生成

3. 點擊 **Create**

> ⚠️ 如遇 "Out of capacity" 錯誤，嘗試不同的 Availability Domain 或稍後再試。

### 第四步：設定防火牆規則

1. 進入 **Networking** → **Virtual Cloud Networks**
2. 選擇你的 VCN → **Security Lists** → **Default Security List**
3. 新增 Ingress Rules：

| 來源 | 協議 | 目標埠 | 說明 |
|------|------|-------|------|
| 0.0.0.0/0 | TCP | 8080 | Prometheus 指標 |
| 0.0.0.0/0 | TCP | 8090 | USD Web UI |
| 0.0.0.0/0 | TCP | 8091 | USDT Web UI |

> 🔒 **安全建議**：生產環境建議限制來源 IP，僅允許你的 IP 訪問。

### 第五步：SSH 連接並安裝

```bash
# 連接到實例
ssh -i ~/.ssh/your_key ubuntu@<PUBLIC_IP>

# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Go 1.21+
wget https://go.dev/dl/go1.21.5.linux-arm64.tar.gz
sudo tar -C /usr/local -xzf go1.21.5.linux-arm64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 驗證安裝
go version
```

---

## 🖥️ Hetzner 部署（付費穩定方案）

### 第一步：註冊 Hetzner 帳戶

1. 前往 [Hetzner Cloud](https://www.hetzner.com/cloud)
2. 點擊 **Sign Up** 建立帳戶
3. 完成身份驗證（可能需要上傳 ID）

### 第二步：建立伺服器

1. 進入 [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. 點擊 **Add Server**
3. 設定：
   - **Location**: Falkenstein 或 Helsinki（歐洲節點穩定）
   - **Image**: Ubuntu 22.04
   - **Type**: **CX22**（€3.79/月，2 vCPU, 4GB RAM）
   - **SSH Key**: 上傳你的公鑰
   - **Name**: `bitfinex-bot`

4. 點擊 **Create & Buy Now**

### 第三步：設定防火牆

1. 進入 **Firewalls** → **Create Firewall**
2. 新增規則：

| 方向 | 協議 | 埠 | 來源 |
|------|------|-----|------|
| Inbound | TCP | 22 | 0.0.0.0/0 |
| Inbound | TCP | 8080 | 你的 IP |
| Inbound | TCP | 8090-8091 | 你的 IP |

3. 將防火牆應用到你的伺服器

### 第四步：SSH 連接並安裝

```bash
# 連接到伺服器
ssh root@<SERVER_IP>

# 更新系統
apt update && apt upgrade -y

# 安裝 Go 1.21+
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 安裝其他工具
apt install -y git tmux htop
```

---

## 🚀 通用部署步驟

以下步驟適用於所有雲端平台。

### 1. 克隆專案

```bash
# 建立工作目錄
mkdir -p ~/apps && cd ~/apps

# 克隆專案（如果是私有 repo，需設定 SSH key）
git clone https://github.com/ImL1s/bitfinex-lending-bot.git
cd bitfinex-lending-bot
```

### 2. 設定環境變數

```bash
# 複製範例檔案
cp .env.example .env

# 編輯 .env 填入你的 API Keys
nano .env
```

填入以下內容：
```bash
BITFINEX_API_KEY=你的_API_Key
BITFINEX_API_SECRET=你的_API_Secret
TELEGRAM_BOT_TOKEN=你的_Telegram_Bot_Token
TELEGRAM_CHAT_ID=你的_Telegram_Chat_ID
```

### 3. 設定配置檔案

```bash
# 複製 USD 和 USDT 配置
cp config/config.example.yaml config/config-usd.yaml
cp config/config.example.yaml config/config-usdt.yaml

# 編輯 USD 配置
nano config/config-usd.yaml
# 確認 currencies: ["USD"]

# 編輯 USDT 配置
nano config/config-usdt.yaml
# 修改 currencies: ["USDT"]
# 修改 web.port: 8091
```

### 4. 編譯專案

```bash
# 下載依賴
go mod download

# 編譯
go build -o lending-bot cmd/bot/main.go

# 給執行腳本權限
chmod +x dual-instance.sh
```

### 5. 使用 systemd 設定自動啟動

建立 USD 服務：
```bash
sudo nano /etc/systemd/system/lending-bot-usd.service
```

內容：
```ini
[Unit]
Description=Bitfinex Lending Bot - USD
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apps/bitfinex-lending-bot
ExecStart=/home/ubuntu/apps/bitfinex-lending-bot/lending-bot -config config/config-usd.yaml
Restart=always
RestartSec=10
EnvironmentFile=/home/ubuntu/apps/bitfinex-lending-bot/.env

[Install]
WantedBy=multi-user.target
```

建立 USDT 服務：
```bash
sudo nano /etc/systemd/system/lending-bot-usdt.service
```

內容（類似，改為 config-usdt.yaml）：
```ini
[Unit]
Description=Bitfinex Lending Bot - USDT
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apps/bitfinex-lending-bot
ExecStart=/home/ubuntu/apps/bitfinex-lending-bot/lending-bot -config config/config-usdt.yaml
Restart=always
RestartSec=10
EnvironmentFile=/home/ubuntu/apps/bitfinex-lending-bot/.env

[Install]
WantedBy=multi-user.target
```

啟動服務：
```bash
# 重載 systemd
sudo systemctl daemon-reload

# 啟動並設定開機自動啟動
sudo systemctl enable --now lending-bot-usd
sudo systemctl enable --now lending-bot-usdt

# 檢查狀態
sudo systemctl status lending-bot-usd
sudo systemctl status lending-bot-usdt
```

### 6. 驗證部署

```bash
# 查看日誌
sudo journalctl -u lending-bot-usd -f
sudo journalctl -u lending-bot-usdt -f

# 測試 Web UI（從本機或開放防火牆後）
curl http://localhost:8090/health
curl http://localhost:8091/health
```

---

## 📊 運維監控

### 查看狀態

```bash
# 服務狀態
sudo systemctl status lending-bot-usd lending-bot-usdt

# 即時日誌
sudo journalctl -u lending-bot-usd -f --since "1 hour ago"

# 資源使用
htop
```

### 常用管理命令

```bash
# 重啟服務
sudo systemctl restart lending-bot-usd lending-bot-usdt

# 停止服務
sudo systemctl stop lending-bot-usd lending-bot-usdt

# 查看最近錯誤
sudo journalctl -u lending-bot-usd --since "1 hour ago" | grep -i error
```

### 設定日誌輪替

```bash
sudo nano /etc/logrotate.d/lending-bot
```

內容：
```
/home/ubuntu/apps/bitfinex-lending-bot/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 ubuntu ubuntu
}
```

---

## 🔧 故障排除

### 問題：服務無法啟動

```bash
# 檢查詳細日誌
sudo journalctl -u lending-bot-usd -n 50 --no-pager

# 常見原因：
# 1. .env 檔案路徑錯誤
# 2. API Key 不正確
# 3. 配置檔案格式錯誤
```

### 問題：WebSocket 連接失敗

```bash
# 檢查網路連通性
curl -I https://api.bitfinex.com

# 檢查 DNS
nslookup api.bitfinex.com

# 如果在中國或有網路限制，可能需要設定代理
```

### 問題：Oracle Cloud 實例被停止

如果收到閒置警告：
1. 確認已升級到 PAYG 帳戶
2. 檢查 CPU 使用率是否 > 20%
3. Bot 正常運行時應該不會有此問題

### 問題：記憶體不足

```bash
# 檢查記憶體使用
free -h

# 如果記憶體不足，可以設定 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🔐 安全建議

1. **限制 SSH 訪問**
   ```bash
   # 只允許特定 IP
   sudo ufw allow from YOUR_IP to any port 22
   ```

2. **設定 Bitfinex API IP 白名單**
   - 登入 Bitfinex → API Keys → 設定允許的 IP

3. **定期更新系統**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **備份配置**
   ```bash
   # 定期備份 .env 和配置檔到安全位置
   tar -czf backup-$(date +%Y%m%d).tar.gz .env config/
   ```

---

## 📞 需要幫助？

- 查看專案 [README.md](../README.md)
- 提交 [GitHub Issue](https://github.com/ImL1s/bitfinex-lending-bot/issues)
- 檢查 [Bitfinex API 文件](https://docs.bitfinex.com/)

---

**祝你放貸順利！💰**
