# 📁 專案結構說明

## 整理後的目錄結構

```
bitfinex-lend/
│
├── 📂 bin/                    # 執行檔
│   └── lending-bot            # 編譯後的主程式
│
├── 📂 scripts/                # 所有腳本
│   ├── start.sh              # 互動式啟動器
│   ├── monitor.sh            # 實時監控面板
│   ├── switch_strategy.sh    # 策略切換工具
│   ├── diagnose.sh           # 診斷工具
│   ├── setup.sh              # 初始設置
│   ├── compile_and_test.sh   # 編譯測試
│   ├── test_all_strategies.sh # 策略測試
│   ├── test_strategies.sh    # 詳細測試
│   ├── quick_test.sh         # 快速測試
│   └── run_bot.sh            # 直接運行
│
├── 📂 docs/                   # 文檔
│   ├── USER_GUIDE.md         # 使用指南
│   ├── QUICK_START.md        # 快速開始
│   ├── STRATEGY_TEST_REPORT.md # 策略測試報告
│   ├── SDK_IMPLEMENTATION_GUIDE.md # SDK 實現指南
│   └── AGENT_A_TEST_REPORT.md # 測試報告
│
├── 📂 internal/               # 內部程式碼
│   ├── bot/                  # 機器人核心
│   ├── client/               # API 客戶端
│   ├── config/               # 配置管理
│   ├── strategy/             # 策略實現
│   ├── risk/                 # 風險管理
│   └── utils/                # 工具函數
│
├── 📂 cmd/                    # 命令入口
│   └── bot/main.go           # 主程式入口
│
├── 📂 config/                 # 配置檔案
│   ├── config.yaml           # 主配置
│   └── config.example.yaml   # 配置範例
│
├── 📂 monitoring/             # 監控相關
│   └── prometheus.go         # Prometheus 指標
│
├── 🔧 快捷命令（根目錄）
│   ├── start                 # → scripts/start.sh
│   ├── monitor               # → scripts/monitor.sh
│   ├── switch-strategy       # → scripts/switch_strategy.sh
│   └── diagnose              # → scripts/diagnose.sh
│
└── 📄 根目錄檔案
    ├── .env                  # 環境變數（API 密鑰等）
    ├── .env.example          # 環境變數範例
    ├── README.md             # 專案說明
    ├── go.mod                # Go 模組
    ├── go.sum                # Go 依賴
    ├── Dockerfile            # Docker 配置
    ├── docker-compose.yml    # Docker Compose
    └── Makefile              # 建構腳本

```

## 🚀 使用方式

### 在根目錄直接使用快捷命令

```bash
# 啟動機器人
./start

# 監控運行狀態
./monitor

# 切換策略
./switch-strategy hybrid

# 診斷問題
./diagnose
```

### 或進入 scripts 目錄使用完整功能

```bash
cd scripts

# 初始設置
./setup.sh

# 編譯和測試
./compile_and_test.sh

# 測試所有策略
./test_all_strategies.sh
```

## 📝 路徑說明

### 腳本中的相對路徑

從 `scripts/` 目錄執行時：
- `../bin/lending-bot` - 執行檔
- `../.env` - 環境配置
- `../test_*.log` - 日誌文件（保存在根目錄）
- `../docs/` - 文檔目錄

### 日誌文件位置

所有日誌文件都保存在**根目錄**，方便查看：
- `test_hybrid.log` - 混合策略日誌
- `test_frr_delta.log` - FRR Delta 日誌
- `test_top_book.log` - Top Book 日誌
- `bot_*.log` - 運行日誌

## ✅ 優點

1. **結構清晰** - 不同類型文件分類存放
2. **易於維護** - 腳本集中管理
3. **快速訪問** - 根目錄提供快捷命令
4. **版本控制** - 乾淨的根目錄結構

## 🔧 維護提示

- 新增腳本請放在 `scripts/` 目錄
- 新增文檔請放在 `docs/` 目錄
- 編譯後的執行檔放在 `bin/` 目錄
- 日誌文件保留在根目錄便於訪問