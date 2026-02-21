# 🚀 快速開始指南

## 立即使用（雙實例模式）

### 1️⃣ 啟動機器人
```bash
# 啟動雙實例（USD + USDT）
./dual-instance.sh start

# 查看運行狀態
./dual-instance.sh status

# 或單獨運行單個實例
./lending-bot
```

### 2️⃣ 監控運行狀態
```bash
# Web 監控界面（推薦）
# USD:  http://localhost:8090
# USDT: http://localhost:8091

# 查看實時日誌
./dual-instance.sh logs usd   # USD 日誌
./dual-instance.sh logs usdt  # USDT 日誌

# 或直接查看日誌檔案
tail -f lending-bot-usd.log
tail -f lending-bot-usdt.log
```

### 3️⃣ 管理實例
```bash
# 重啟雙實例
./dual-instance.sh restart

# 停止雙實例
./dual-instance.sh stop

# 查看幫助
./dual-instance.sh help
```
