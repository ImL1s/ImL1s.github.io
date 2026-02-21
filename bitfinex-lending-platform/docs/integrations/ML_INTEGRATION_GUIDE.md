# ML 整合指南

本指南說明如何在 Bitfinex 放貸機器人中啟用和使用 ML (機器學習) 增強功能。

## 概述

ML 整合為 Adaptive 策略提供實時市場分析和智能決策支持,包括:

- **市場狀態分類**: 自動識別波動性、趨勢和異常情況
- **交易信號生成**: 基於模型預測提供操作建議 (AGGRESSIVE_LEND, MODERATE_LEND, CAUTIOUS, HOLD)
- **動態參數調整**: 根據市場條件自動調整風險係數、利率範圍和期限
- **優雅降級**: ML 服務不可用時自動回退到基礎策略

## 架構

```
┌─────────────┐         gRPC          ┌──────────────┐
│   Bot       │ ◄────────────────────► │ ML Service   │
│ (Go)        │   Port 50051           │ (Python)     │
└─────────────┘                        └──────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│  AdaptiveMLStrategy                 │
│  - Market Regime Classification     │
│  - Trading Signal Generation        │
│  - Dynamic Risk Adjustment          │
│  - Allocation Optimization          │
└─────────────────────────────────────┘
```

## 配置步驟

### 1. 啟用 ML 配置

編輯 `config/config.yaml`:

```yaml
strategy:
  type: "adaptive"  # 必須使用 adaptive 策略

  adaptive:
    min_rate: 0.00005
    max_rate: 0.002
    target_utilization: 0.85
    risk_factor: 0.5           # 會被 ML 動態調整
    learning_rate: 0.1
    segment_count: 3
    history_window: 24

ml:
  enabled: true                # 啟用 ML 信號
  address: "localhost:50051"   # ML 服務地址
  timeout: 5s                  # 請求超時
  cache_expiration: 1m         # 信號緩存時間
```

### 2. 啟動 ML 服務 (Python)

```bash
# 假設您已經有 ML 服務實現
cd ml/
python grpc_server.py
```

ML 服務應實現以下 gRPC 接口 (定義在 `internal/ml/ml_signal.proto`):

```protobuf
service MLSignalService {
  // 市場狀態分類
  rpc ClassifyMarketRegime(MarketRegimeRequest) returns (MarketRegimeResponse);

  // 交易信號生成
  rpc GetTradingSignal(TradingSignalRequest) returns (TradingSignalResponse);

  // 健康檢查
  rpc HealthCheck(HealthCheckRequest) returns (HealthCheckResponse);
}
```

### 3. 啟動機器人

```bash
./lending-bot -config config/config.yaml
```

## 工作流程

### 啟動階段

1. Bot 讀取配置,檢查 `ml.enabled`
2. 如果啟用,初始化 ML 客戶端並連接到 gRPC 服務
3. 執行健康檢查,驗證 ML 服務狀態和模型載入情況
4. 創建 `AdaptiveMLStrategy` (ML 增強版 Adaptive 策略)

### 運行階段

每次重平衡時:

1. **獲取市場數據**: FRR, 訂單簿, 歷史利率
2. **請求 ML 信號**:
   - 市場狀態分類 (波動性、趨勢、異常)
   - 交易信號 (AGGRESSIVE_LEND, MODERATE_LEND, etc.)
3. **應用動態調整**:
   - 風險係數調整 (0.6x - 1.3x)
   - 利率範圍調整 (0.5x - 2.0x)
   - 期限調整 (0.5x - 2.0x)
   - 資金分配調整 (50% - 100%)
4. **生成優化後的報價**
5. **提交訂單**

### 異常處理

- **ML 服務離線**: 自動回退到基礎 Adaptive 策略
- **請求超時**: 使用緩存信號或默認參數
- **連接失敗**: 後台自動重試連接 (3次,指數退避)
- **模型未載入**: 記錄警告但繼續運行

## ML 信號類型

### 1. 市場狀態 (Market Regime)

#### 波動性 (Volatility)
- `LOW_VOLATILITY`: 低波動,可更激進 (+20% 利率範圍)
- `NORMAL`: 正常波動,使用默認策略
- `HIGH_VOLATILITY`: 高波動,縮小範圍 (-20%)
- `EXTREME_VOLATILITY`: 極端波動,大幅縮小 (-50%),可能暫停交易

#### 趨勢 (Trend)
- `STRONG_UPTREND`: 強上漲,延長期限鎖定高利率 (+50%)
- `WEAK_UPTREND`: 弱上漲,適度延長 (+20%)
- `NEUTRAL`: 中性,使用默認期限
- `WEAK_DOWNTREND`: 弱下跌,縮短期限保持靈活 (-20%)
- `STRONG_DOWNTREND`: 強下跌,短期為主 (-50%)

#### 異常 (Anomaly)
- `NORMAL`: 正常市場
- `RATE_SPIKE`: 利率飆升,建議全力放貸
- `RATE_CRASH`: 利率暴跌,建議暫停交易

### 2. 交易信號 (Trading Signal)

| 信號 | 含義 | 資金分配 | 風險調整 |
|------|------|----------|----------|
| AGGRESSIVE_LEND | 高利率機會 | 100% | 1.3x (更激進) |
| MODERATE_LEND | 適度放貸 | 90% | 1.1x |
| CAUTIOUS | 謹慎操作 | 70% | 0.8x (更保守) |
| HOLD | 觀望等待 | 50% | 0.6x |
| NEUTRAL | 中性 | 90% | 1.0x |

## 監控和日誌

### 啟動日誌

```
INFO[2025-12-17 23:00:00] 初始化 ML 服務客戶端...
INFO[2025-12-17 23:00:01] ML 服務狀態: SERVING, 模型已載入: true
INFO[2025-12-17 23:00:01] 使用 ML 增強的 Adaptive 策略
```

### 運行日誌 (DEBUG level)

```
DEBUG[2025-12-17 23:05:00] ML 調整因子 risk_adjust=1.2 volatility_adjust=0.8 trend_adjust=1.5
DEBUG[2025-12-17 23:05:00] ML 調整資金分配 original_balance=10000 ml_allocation=0.9 adjusted_balance=9000
INFO[2025-12-17 23:05:01] 市場狀態分類完成 volatility=NORMAL trend=WEAK_UPTREND anomaly=NORMAL confidence=0.87
INFO[2025-12-17 23:05:01] 交易信號獲取完成 signal=MODERATE_LEND confidence=0.82 risk=0.45
```

### 健康檢查

通過 Prometheus metrics 查看 ML 狀態:

```
ml_enabled 1
ml_connected 1
ml_requests_total 1234
ml_request_errors_total 5
ml_cache_hits_total 890
```

## 故障排除

### 問題: ML 服務連接失敗

```
WARN[2025-12-17 23:00:01] ML 服務連接失敗 (將在後台重試): connection refused
```

**解決方案**:
1. 確認 ML 服務正在運行: `ps aux | grep grpc_server`
2. 檢查端口是否被佔用: `lsof -i :50051`
3. 檢查防火牆設置
4. 驗證配置中的地址是否正確

### 問題: 模型未載入

```
WARN[2025-12-17 23:00:01] ML 模型尚未載入,信號可能不可用
```

**解決方案**:
1. 檢查 ML 服務日誌
2. 確認模型文件路徑正確
3. 驗證模型版本兼容性

### 問題: 請求超時

```
WARN[2025-12-17 23:05:01] 交易信號請求失敗: context deadline exceeded
```

**解決方案**:
1. 增加 `ml.timeout` 配置值
2. 檢查 ML 服務性能
3. 考慮增加 `ml.cache_expiration` 減少請求頻率

### 問題: Bot 降級到基礎策略

```
INFO[2025-12-17 23:00:01] Adaptive 策略未啟用 ML (將使用默認行為)
```

**原因**: ML 客戶端初始化失敗或 `ml.enabled=false`

**解決方案**:
1. 檢查 ML 配置
2. 確認 ML 服務可訪問
3. 查看更早的錯誤日誌

## 性能考慮

### 緩存策略

- ML 信號會被緩存 (默認 1 分鐘)
- 重複請求會直接返回緩存結果
- 過期後自動刷新

### 非阻塞設計

- 所有 ML 請求都有超時保護
- 失敗不會阻塞主流程
- 後台自動重連機制

### 資源使用

- gRPC 連接複用,低開銷
- 每次重平衡約 2-3 次 ML 請求
- 典型延遲: 10-50ms (LAN), 50-200ms (WAN)

## 禁用 ML 功能

如需暫時禁用 ML:

```yaml
ml:
  enabled: false  # 設置為 false
```

或保持 `enabled: true` 但停止 ML 服務,Bot 會自動降級。

## 開發和測試

### 本地測試

```bash
# 使用測試配置 (ML disabled)
./lending-bot -config config/config.test.yaml

# 啟用 ML 的測試
./lending-bot -config config/config-ml-example.yaml
```

### Mock ML 服務

如需測試但無 ML 服務,可使用 mock server:

```bash
cd ml/
python mock_server.py  # 返回固定的測試信號
```

### 單元測試

```bash
# 測試 ML 客戶端
go test ./internal/ml/...

# 測試 ML 策略
go test ./internal/strategy/... -run TestAdaptiveML
```

## 參考資料

- **Protobuf 定義**: `internal/ml/ml_signal.proto`
- **ML 客戶端**: `internal/ml/client.go`
- **信號整合器**: `internal/ml/integration.go`
- **ML 增強策略**: `internal/strategy/adaptive_ml.go`
- **配置範例**: `config/config-ml-example.yaml`

## 常見問題

### Q: ML 功能對所有策略都有效嗎?

A: 目前僅支持 `adaptive` 策略。未來可能擴展到其他策略。

### Q: ML 服務必須用 Python 實現嗎?

A: 不是。任何實現 `ml_signal.proto` 定義的 gRPC 服務都可以,語言不限。

### Q: 如何驗證 ML 是否正常工作?

A: 查看日誌中的 "使用 ML 增強的 Adaptive 策略" 和定期的 "市場狀態分類完成" 信息。

### Q: ML 失敗會影響正常交易嗎?

A: 不會。ML 失敗時自動回退到基礎 Adaptive 策略,確保連續性。

### Q: 可以只用部分 ML 功能嗎?

A: 可以。ML 服務可以選擇只實現部分 RPC 方法,Bot 會相應調整。

## 技術支持

如有問題,請檢查:
1. Bot 日誌: `logs/bot.log`
2. ML 服務日誌
3. 配置文件語法
4. 網絡連接

或查看項目文檔:
- `docs/ML_INTEGRATION_SUMMARY.md` - 技術總結
- `docs/TECHNICAL_INDICATORS.md` - 指標說明
- `examples/` - 示例代碼
