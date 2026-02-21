# ML Service Railway 操作手冊

本文檔說明 Railway 上 ML 服務的部署、維護和故障排除。

## 服務概覽

| 項目 | 值 |
|------|-----|
| 服務名稱 | `ml-service` |
| 技術棧 | Python 3.11 + XGBoost + gRPC |
| 內部網路 | `ml-service.railway.internal:50051` |
| 公開 URL | `ml-service-production-*.up.railway.app` |
| Volume | `/data` (持久化儲存) |
| Region | asia-southeast1 |

## 架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐         gRPC          ┌─────────────────┐ │
│  │ api service │ ◄──────────────────► │   ml-service    │ │
│  │   (Go)      │   :50051 internal     │   (Python)      │ │
│  └─────────────┘                       └────────┬────────┘ │
│        │                                        │          │
│        │ ML_ADDRESS=                            │          │
│        │ ml-service.railway.internal:50051      │          │
│                                        ┌────────▼────────┐ │
│                                        │  ml-service     │ │
│                                        │  -volume        │ │
│                                        │  (/data)        │ │
│                                        │  - model.json   │ │
│                                        │  - model_info   │ │
│                                        │  - .last_train  │ │
│                                        └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 自動訓練機制

### 訓練週期

- **Cron 排程**: `0 4 * * 0` (每週日 04:00 UTC)
- **訓練間隔**: 7 天

### 啟動流程 (start.sh)

```bash
#!/bin/bash
# 1. 檢查模型是否存在
# 2. 檢查訓練標記 (.last_train)
# 3. 如果需要訓練，執行 train_model.py
# 4. 啟動 gRPC 服務
```

### 訓練觸發條件

| 條件 | 結果 |
|------|------|
| `/data/model.json` 不存在 | 訓練 |
| `/data/.last_train` 不存在 | 訓練 |
| 距離上次訓練 > 7 天 | 訓練 |
| 其他 | 直接啟動服務 |

## 關鍵檔案

### ml/ 目錄結構

```
ml/
├── Dockerfile          # Docker 構建配置
├── railway.toml        # Railway 部署配置
├── start.sh            # 啟動腳本（訓練檢查 + 服務啟動）
├── ml_service.py       # gRPC 服務主程式
├── train_model.py      # 模型訓練腳本
├── collect_data.py     # 數據收集腳本
├── model.json          # 本地模型（備份）
├── model_info.json     # 模型資訊（備份）
├── ml_signal.proto     # gRPC 定義
├── ml_signal_pb2.py    # 生成的 protobuf
├── ml_signal_pb2_grpc.py
└── requirements.txt    # Python 依賴
```

### railway.toml 配置

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "bash start.sh"
healthcheckPath = "/"
healthcheckTimeout = 60
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
cronSchedule = "0 4 * * 0"  # 每週日 04:00 UTC
```

## 常用操作

### 查看服務狀態

```bash
# 列出所有服務
railway status

# 查看 ML 服務日誌
railway logs --service ml-service -n 100

# 查看 API 服務的 ML 相關日誌
railway logs --service api -n 200 | grep -iE "(ML|ml-service)"
```

### 手動觸發訓練

```bash
# 方法 1: 重新部署服務（會觸發 start.sh）
cd /path/to/bitfinex_lend
railway up ml --path-as-root --detach

# 方法 2: 刪除訓練標記後重啟
# (需要進入容器或通過其他方式)
```

### 檢查訓練狀態

在 Railway Dashboard 查看：
1. 進入 `ml-service` 服務
2. 點擊 "Cron Runs" 標籤
3. 查看最近的執行記錄

### 更新 ML 地址

```bash
# 設定 API 服務的 ML 連接地址
railway variables --set "ML_ADDRESS=ml-service.railway.internal:50051" --service api
```

## 故障排除

### 問題: ML 服務無日誌輸出

**可能原因**: gRPC 服務正常運行但沒有請求

**檢查方法**:
```bash
# 確認服務是 Online 狀態
# 在 Railway Dashboard 查看 ml-service 是否顯示綠色 "Online"

# 檢查 API 是否有連接嘗試
railway logs --service api -n 200 | grep -i "grpc\|ml-service"
```

### 問題: 訓練失敗

**檢查 Cron Runs**:
1. Railway Dashboard → ml-service → Cron Runs
2. 查看失敗的執行記錄和錯誤訊息

**常見原因**:
- 資料收集 API 超時
- Volume 空間不足
- Python 依賴問題

### 問題: API 無法連接 ML 服務

**檢查**:
```bash
# 確認 ML_ADDRESS 設定正確
railway variables --service api | grep ML_ADDRESS

# 應該顯示:
# ML_ADDRESS = ml-service.railway.internal:50051
```

**解決方案**:
```bash
railway variables --set "ML_ADDRESS=ml-service.railway.internal:50051" --service api
```

### 問題: start.sh 找不到

**原因**: `.dockerignore` 排除了 `*.sh`

**解決方案**: 確保 `.dockerignore` 包含：
```
# Shell scripts (except start.sh)
collect_data.sh
!start.sh
```

## 監控指標

### API 服務 ML 相關日誌

```bash
# ML 決策追蹤
railway logs --service api -n 200 | grep "ML Decision Tracking"

# ML 調整應用
railway logs --service api -n 200 | grep "ML adjustment"

# ML 增強訂單
railway logs --service api -n 200 | grep "ML-Enhanced"
```

### 正常運作標誌

```
ML Decision Tracking Started (ml_enabled=true)
ML adjusted balance allocation
ML adjustment factors applied
Submitted offer: ... [ML-Enhanced]
```

## 部署注意事項

### 從專案根目錄部署

```bash
# 正確做法
cd /path/to/bitfinex_lend
railway up ml --path-as-root --detach

# 錯誤做法 (會失敗)
cd ml
railway up --detach
```

### Volume 持久化

- 模型檔案存放在 `/data/` Volume
- Volume 在服務重啟後保留
- 訓練標記 `.last_train` 也存放在 Volume

## 相關文檔

- [ML 系統架構](../ML_SYSTEM_ARCHITECTURE.md)
- [生產機器人檢查](PRODUCTION_BOT_CHECK.md)
