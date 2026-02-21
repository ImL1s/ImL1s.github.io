# 雙實例支援實施報告

**實施日期**: 2025-10-23
**版本**: v2.2 (Dual Instance Support)
**實施者**: Claude Code

---

## 📊 實施摘要

成功實現同時運行 USD 和 USDT 兩個獨立 Bot 實例的功能。

### 實施狀態

| 項目 | 狀態 | 說明 |
|-----|------|------|
| 代碼修改 | ✅ 完成 | 支援動態 Web 端口配置 |
| 配置文件 | ✅ 完成 | USD 和 USDT 配置分離 |
| 管理腳本 | ✅ 完成 | 一鍵管理雙實例 |
| 文檔 | ✅ 完成 | 完整部署和使用指南 |
| 測試 | ⏸️ 待執行 | 等待用戶編譯和測試 |

---

## 🔧 技術實施

### 1. 代碼修改

#### internal/config/config.go

**新增字段**: `WebPort int` 到 `MonitoringConfig`

```go
type MonitoringConfig struct {
    Enabled       bool   `mapstructure:"enabled"`
    Port          int    `mapstructure:"port"`           // Prometheus metrics port
    WebPort       int    `mapstructure:"web_port"`       // Web dashboard port
    MetricsPath   string `mapstructure:"metrics_path"`
    HealthPath    string `mapstructure:"health_path"`
    UpdateInterval int   `mapstructure:"update_interval"`
}
```

#### internal/bot/bot.go (lines 360-374)

**修改前**:
```go
if b.webServer != nil {
    go func() {
        if err := b.webServer.Start(":8090"); err != nil {
            logrus.Errorf("Failed to start web server: %v", err)
        }
    }()
    logrus.Info("Web interface available at http://localhost:8090")
}
```

**修改後**:
```go
if b.webServer != nil {
    webPort := b.config.Monitoring.WebPort
    if webPort == 0 {
        webPort = 8090 // Default web port
    }
    webAddr := fmt.Sprintf(":%d", webPort)
    go func() {
        logrus.Infof("Starting web server on %s", webAddr)
        if err := b.webServer.Start(webAddr); err != nil {
            logrus.Errorf("Failed to start web server: %v", err)
        }
    }()
    logrus.Infof("Web interface available at http://localhost:%d", webPort)
}
```

**優勢**:
- ✅ 向後兼容（未配置時使用預設 8090）
- ✅ 支援動態端口配置
- ✅ 改進的日誌輸出

---

### 2. 配置文件更新

#### config/config-usd.yaml

**關鍵變更**:
```yaml
bot:
  currencies: ["USD"]  # 從 currency: "USD" 改為新格式

monitoring:
  port: 8081           # Metrics port
  web_port: 8090       # Web dashboard port (新增)

log:
  file: "logs/bot-usd.log"  # 獨立日誌文件
```

#### config/config-usdt.yaml

**關鍵變更**:
```yaml
bot:
  currencies: ["USDT"]  # USDT 專用

monitoring:
  port: 8082            # 不同的 Metrics port
  web_port: 8091        # 不同的 Web port (新增)

log:
  file: "logs/bot-usdt.log"  # 獨立日誌文件
```

---

### 3. 雙實例管理腳本

**文件**: `dual-instance.sh`

**功能**:
- ✅ 啟動/停止/重啟雙實例
- ✅ 查看實例狀態
- ✅ 查看和實時監控日誌
- ✅ 編譯 Bot 程式
- ✅ 彩色輸出和友好提示
- ✅ 自動清理陳舊 PID 文件

**主要命令**:
```bash
./dual-instance.sh start    # 啟動雙實例
./dual-instance.sh stop     # 停止雙實例
./dual-instance.sh status   # 查看狀態
./dual-instance.sh logs usd # 查看 USD 日誌
./dual-instance.sh tail all # 實時監控所有日誌
./dual-instance.sh build    # 編譯程式
```

---

## 🎯 端口分配

| 實例  | Web 界面 | Prometheus | 配置文件          | PID 文件      | 日誌文件      |
|------|---------|-----------|------------------|--------------|--------------|
| USD  | 8090    | 8081      | config-usd.yaml  | bot-usd.pid  | bot-usd.log  |
| USDT | 8091    | 8082      | config-usdt.yaml | bot-usdt.pid | bot-usdt.log |

---

## 📝 文件清單

### 新增文件

1. **dual-instance.sh**
   - 雙實例管理腳本
   - 246 行完整功能

2. **docs/DUAL_INSTANCE_SETUP.md**
   - 完整部署和使用指南
   - 包含故障排除和優化建議

3. **DUAL_INSTANCE_IMPLEMENTATION.md** (本文件)
   - 實施報告和技術文檔

### 修改文件

1. **internal/config/config.go**
   - 添加 `WebPort` 字段到 `MonitoringConfig`

2. **internal/bot/bot.go**
   - 修改 Web server 啟動邏輯支援動態端口

3. **config/config-usd.yaml**
   - 更新為新格式 `currencies: ["USD"]`
   - 添加 `web_port: 8090`
   - 修改日誌文件路徑

4. **config/config-usdt.yaml**
   - 添加 `web_port: 8091`

---

## 🚀 快速開始指南

### 步驟 1: 編譯

```bash
chmod +x dual-instance.sh
./dual-instance.sh build
```

或手動：
```bash
go build -o lending-bot cmd/bot/main.go
```

### 步驟 2: 配置 API 金鑰

確保 `.env` 文件包含：
```env
BITFINEX_API_KEY=your_key
BITFINEX_API_SECRET=your_secret
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 步驟 3: 啟動

```bash
./dual-instance.sh start
```

### 步驟 4: 驗證

```bash
# 查看狀態
./dual-instance.sh status

# 訪問 Web 界面
open http://localhost:8090  # USD
open http://localhost:8091  # USDT
```

---

## ✅ 驗證檢查清單

### 編譯驗證
- [ ] 代碼成功編譯無錯誤
- [ ] 生成 `lending-bot` 二進制文件

### 啟動驗證
- [ ] USD 實例成功啟動
- [ ] USDT 實例成功啟動
- [ ] 無端口衝突錯誤
- [ ] 無 PID 文件衝突

### 功能驗證
- [ ] USD Web 界面可訪問 (http://localhost:8090)
- [ ] USDT Web 界面可訪問 (http://localhost:8091)
- [ ] USD 顯示 USD 餘額
- [ ] USDT 顯示 USDT 餘額
- [ ] 兩個實例獨立運作

### 日誌驗證
- [ ] USD 日誌正確記錄 (logs/bot-usd.log)
- [ ] USDT 日誌正確記錄 (logs/bot-usdt.log)
- [ ] 日誌顯示正確的幣種和端口

### Metrics 驗證
- [ ] USD Metrics 可訪問 (http://localhost:8081/metrics)
- [ ] USDT Metrics 可訪問 (http://localhost:8082/metrics)
- [ ] Metrics 數據正確區分

---

## 🔍 測試建議

### 基礎測試

1. **啟動測試**
   ```bash
   ./dual-instance.sh start
   ./dual-instance.sh status
   ```

2. **Web 界面測試**
   - 訪問 http://localhost:8090
   - 訪問 http://localhost:8091
   - 確認顯示不同幣種

3. **日誌測試**
   ```bash
   ./dual-instance.sh logs usd 20
   ./dual-instance.sh logs usdt 20
   ```

4. **停止測試**
   ```bash
   ./dual-instance.sh stop
   ./dual-instance.sh status  # 應顯示未運行
   ```

### 進階測試

1. **重啟測試**
   ```bash
   ./dual-instance.sh restart
   ./dual-instance.sh status
   ```

2. **單實例停止測試**
   ```bash
   pkill -f "config-usd.yaml"
   ./dual-instance.sh status  # 應顯示只有 USDT 運行
   ```

3. **負載測試**
   - 觀察兩個實例同時運行 24 小時
   - 監控記憶體和 CPU 使用率
   - 檢查是否有記憶體洩漏

---

## 🐛 已知問題

### 問題 1: Bash 編譯命令失敗

**症狀**: `unsupported shell: "-zsh"`

**影響**: 管理腳本中的 `build` 命令可能無法使用

**解決方案**:
```bash
# 手動編譯
go build -o lending-bot cmd/bot/main.go
```

**狀態**: 不影響核心功能，用戶可手動編譯

---

## 📈 性能指標

### 預期資源使用

| 指標       | 單實例 | 雙實例 | 建議配置 |
|-----------|--------|--------|---------|
| 記憶體     | 50MB   | 100MB  | 256MB+  |
| CPU       | <1%    | <2%    | 2核心+  |
| 網路頻寬   | 低     | 低     | 穩定連線 |
| 磁碟 I/O  | 低     | 中低   | 標準 SSD|

### 監控建議

```bash
# 記憶體監控
watch -n 5 'ps aux | grep lending-bot'

# 日誌大小監控
watch -n 60 'du -sh logs/'

# 端口監控
watch -n 10 'lsof -i:8090 -i:8091 -i:8081 -i:8082'
```

---

## 🔄 版本歷史

### v2.2 (2025-10-23) - 雙實例支援
- ✅ 添加動態 Web 端口配置
- ✅ 創建雙實例管理腳本
- ✅ 更新配置文件支援獨立實例
- ✅ 完整文檔和使用指南

### v2.1 (之前) - 單幣種切換
- ✅ 支援 `currencies` 配置數組
- ✅ 添加 `getCurrency()` 方法
- ✅ 向後兼容舊配置格式

---

## 📚 相關文檔

1. **DUAL_INSTANCE_SETUP.md**
   - 完整部署指南
   - 故障排除
   - 性能優化

2. **MULTI_CURRENCY_GUIDE.md**
   - 多幣種支援概述
   - 配置遷移指南

3. **IMPORTANT_SINGLE_CURRENCY.md**
   - 單幣種運行原理
   - 常見問題解答

4. **CLAUDE.md**
   - 項目概覽
   - 開發指南

---

## 🎓 技術亮點

### 設計原則

1. **向後兼容**:
   - 保留舊配置格式支援
   - WebPort 預設值 8090
   - 不破壞現有部署

2. **關注點分離**:
   - USD 和 USDT 完全獨立
   - 不同的配置、日誌、PID
   - 獨立的監控端點

3. **易用性**:
   - 一鍵管理腳本
   - 彩色友好輸出
   - 完整錯誤處理

4. **可維護性**:
   - 清晰的代碼結構
   - 詳細的註釋
   - 完整的文檔

### 架構優勢

```
優點:
✅ 簡單直接 - 兩個獨立進程
✅ 容錯性高 - 一個實例崩潰不影響另一個
✅ 易於調試 - 獨立的日誌和監控
✅ 資源隔離 - CPU、記憶體完全分離
✅ 易於擴展 - 可輕鬆添加更多幣種

考慮:
⚠️ 記憶體使用略高 - 兩個完整的 Bot 實例
⚠️ 管理略複雜 - 需要管理多個進程
```

---

## 🚀 未來改進

### 短期 (v2.3)
- [ ] 添加單實例管理命令到 dual-instance.sh
- [ ] 自動化測試腳本
- [ ] 健康檢查端點

### 中期 (v2.4)
- [ ] Docker Compose 支援
- [ ] Kubernetes 部署配置
- [ ] 集中化日誌收集

### 長期 (v3.0)
- [ ] 原生多幣種並行支援（單進程）
- [ ] 動態幣種添加/移除
- [ ] 統一監控儀表板

---

## 🙏 致謝

本實施基於用戶的明確需求：
> "我需要同時可以有 USD USDT"

採用了穩健、向後兼容的雙實例架構，確保：
- ✅ 不破壞現有 USD 功能
- ✅ 完全隔離 USD 和 USDT
- ✅ 易於部署和管理
- ✅ 完整的文檔支援

---

**實施完成日期**: 2025-10-23
**測試狀態**: 待用戶執行
**文檔狀態**: 完整

**下一步**: 用戶編譯和測試雙實例功能 🚀
