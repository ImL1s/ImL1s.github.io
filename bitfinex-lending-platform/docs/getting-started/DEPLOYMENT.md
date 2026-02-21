# 部署指南

## 🚀 快速部署

### 方法一：直接執行

```bash
# 1. 克隆專案
git clone https://github.com/iml1s/bitfinex-lending-bot.git
cd bitfinex-lending-bot

# 2. 執行設定腳本
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. 編輯配置
vim .env                    # 設定 API 金鑰
vim config/config.yaml      # 調整策略參數

# 4. 啟動機器人
make run
```

### 方法二：Docker 部署

```bash
# 1. 建構映像
docker build -t bitfinex-lending-bot .

# 2. 執行容器
docker run -d \
  --name lending-bot \
  --env-file .env \
  -v $(pwd)/config:/app/config:ro \
  -v $(pwd)/logs:/app/logs \
  -p 8080:8080 \
  bitfinex-lending-bot
```

### 方法三：Docker Compose

```bash
# 啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f lending-bot

# 停止服務
docker-compose down
```

## 🔧 生產環境部署

### 1. 系統需求

**最低配置：**
- CPU: 1 核心
- RAM: 512MB
- 儲存: 10GB
- 網路: 穩定連接

**建議配置：**
- CPU: 2 核心
- RAM: 2GB
- 儲存: 20GB SSD
- 網路: 低延遲連接

### 2. 環境準備

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y \
  build-essential \
  git \
  wget \
  curl \
  docker.io \
  docker-compose

# CentOS/RHEL
sudo yum update
sudo yum install -y \
  git \
  wget \
  curl \
  docker \
  docker-compose
```

### 3. 安裝 Go

```bash
# 下載 Go
wget https://go.dev/dl/go1.21.linux-amd64.tar.gz

# 解壓縮
sudo tar -C /usr/local -xzf go1.21.linux-amd64.tar.gz

# 設定環境變數
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 驗證安裝
go version
```

## 📦 容器化部署

### Docker 映像建構

```dockerfile
# 多階段建構優化
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o lending-bot cmd/bot/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/lending-bot .
ENTRYPOINT ["./lending-bot"]
```

### Kubernetes 部署

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lending-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: lending-bot
  template:
    metadata:
      labels:
        app: lending-bot
    spec:
      containers:
      - name: bot
        image: bitfinex-lending-bot:latest
        env:
        - name: BITFINEX_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-credentials
              key: api-key
        - name: BITFINEX_API_SECRET
          valueFrom:
            secretKeyRef:
              name: api-credentials
              key: api-secret
        volumeMounts:
        - name: config
          mountPath: /app/config
        ports:
        - containerPort: 8080
      volumes:
      - name: config
        configMap:
          name: bot-config
```

## 🔐 安全配置

### 1. API 金鑰管理

**使用 Kubernetes Secrets：**
```bash
kubectl create secret generic api-credentials \
  --from-literal=api-key=$BITFINEX_API_KEY \
  --from-literal=api-secret=$BITFINEX_API_SECRET
```

**使用 Docker Secrets：**
```bash
echo "$BITFINEX_API_KEY" | docker secret create api_key -
echo "$BITFINEX_API_SECRET" | docker secret create api_secret -
```

### 2. 網路安全

```nginx
# nginx 反向代理配置
server {
    listen 443 ssl http2;
    server_name bot.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /metrics {
        proxy_pass http://localhost:8080;
        allow 10.0.0.0/8;  # 內網存取
        deny all;
    }

    location /health {
        proxy_pass http://localhost:8080;
    }
}
```

### 3. 防火牆規則

```bash
# UFW 配置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 443/tcp # HTTPS
sudo ufw allow from 10.0.0.0/8 to any port 8080  # 監控
sudo ufw enable
```

## 📊 監控部署

### Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'lending-bot'
    static_configs:
      - targets: ['lending-bot:8080']
```

### Grafana 設定

```bash
# 匯入儀表板
curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana-dashboard.json
```

### 告警配置

```yaml
# alertmanager.yml
route:
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: 'YOUR_BOT_TOKEN'
        chat_id: YOUR_CHAT_ID
        parse_mode: 'Markdown'
```

## 🔄 自動化部署

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker image
        run: docker build -t lending-bot:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag lending-bot:${{ github.sha }} \
            registry.yourdomain.com/lending-bot:latest
          docker push registry.yourdomain.com/lending-bot:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            docker pull registry.yourdomain.com/lending-bot:latest
            docker-compose up -d
```

### Ansible Playbook

```yaml
# deploy.yml
---
- hosts: production
  vars:
    app_name: lending-bot
  tasks:
    - name: Pull latest code
      git:
        repo: https://github.com/iml1s/bitfinex-lending-bot.git
        dest: /opt/{{ app_name }}

    - name: Build application
      command: make build
      args:
        chdir: /opt/{{ app_name }}

    - name: Restart service
      systemd:
        name: {{ app_name }}
        state: restarted
        daemon_reload: yes
```

## 🏥 健康檢查

### Systemd 服務

```ini
# /etc/systemd/system/lending-bot.service
[Unit]
Description=Bitfinex Lending Bot
After=network.target

[Service]
Type=simple
User=bot
WorkingDirectory=/opt/lending-bot
ExecStart=/opt/lending-bot/lending-bot
Restart=always
RestartSec=10
Environment="BITFINEX_API_KEY=xxx"
Environment="BITFINEX_API_SECRET=xxx"

[Install]
WantedBy=multi-user.target
```

### 健康檢查腳本

```bash
#!/bin/bash
# health_check.sh

HEALTH_URL="http://localhost:8080/health"
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

    if [ $STATUS -eq 200 ]; then
        echo "Health check passed"
        exit 0
    fi

    RETRY_COUNT=$((RETRY_COUNT+1))
    sleep 5
done

echo "Health check failed"
exit 1
```

## 🔄 更新流程

### 零停機更新

```bash
#!/bin/bash
# rolling_update.sh

# 1. 建構新版本
docker build -t lending-bot:new .

# 2. 啟動新容器
docker run -d \
  --name lending-bot-new \
  --env-file .env \
  -p 8081:8080 \
  lending-bot:new

# 3. 健康檢查
sleep 10
if curl -f http://localhost:8081/health; then
    # 4. 切換流量
    docker stop lending-bot
    docker rm lending-bot
    docker rename lending-bot-new lending-bot

    # 5. 更新端口
    docker run -d \
      --name lending-bot \
      --env-file .env \
      -p 8080:8080 \
      lending-bot:new
else
    # 回滾
    docker stop lending-bot-new
    docker rm lending-bot-new
    echo "Update failed, rollback"
fi
```

## 🔍 故障排查

### 常見問題

**1. API 連接失敗**
```bash
# 檢查網路連接
ping api.bitfinex.com

# 檢查 DNS
nslookup api.bitfinex.com

# 測試 API
curl https://api.bitfinex.com/v2/platform/status
```

**2. 記憶體不足**
```bash
# 檢查記憶體使用
docker stats lending-bot

# 增加記憶體限制
docker run -m 2g lending-bot
```

**3. 日誌分析**
```bash
# 查看即時日誌
docker logs -f lending-bot

# 搜尋錯誤
grep ERROR logs/bot.log

# 統計錯誤頻率
grep ERROR logs/bot.log | wc -l
```

## 📈 效能優化

### 1. 資源限制

```yaml
# docker-compose.yml
services:
  lending-bot:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '1.0'
        memory: 512M
```

### 2. 日誌輪轉

```yaml
# docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

### 3. 監控優化

```bash
# 減少監控頻率
MONITORING_UPDATE_INTERVAL=30  # 增加到 30 秒

# 調整 Prometheus 保留期
--storage.tsdb.retention.time=7d  # 只保留 7 天
```

## 🌐 多區域部署

### 主從架構

```yaml
# 主節點配置
bot:
  mode: primary
  region: us-east

# 從節點配置
bot:
  mode: secondary
  region: ap-southeast
  primary_url: https://primary.example.com
```

### 負載均衡

```nginx
upstream lending_bots {
    server bot1.example.com:8080;
    server bot2.example.com:8080;
    server bot3.example.com:8080;
}

server {
    location /metrics {
        proxy_pass http://lending_bots;
    }
}
```