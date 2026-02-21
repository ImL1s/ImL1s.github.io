# 安全配置指南

## ⚠️ 重要安全通知

由於之前在 git 歷史中不小心洩露了 Telegram Bot Token，已執行以下緊急措施：

### ✅ 已完成的安全措施

1. **Git 歷史清理** (2025-10-23)
   - ✅ 使用 `git-filter-repo` 重寫整個 git 歷史
   - ✅ 替換所有出現的敏感 token 為佔位符
   - ✅ 使用 `gitleaks` 驗證無洩露
   - ✅ 強制推送到 GitHub 覆蓋歷史
   - ✅ 創建備份分支: `backup-before-filter-20251023-185037`

2. **洩露的 Token**
   ```
   Commit: 25959b95c1d9b2bbb316a3895c1eb783e1a2c626
   文件: DUAL_INSTANCE_FAQ.md, TELEGRAM_RACE_CONDITION_ANALYSIS.md
   Token: YOUR_TELEGRAM_BOT_TOKEN_HERE (已失效)
   ```

### 🔒 必須立即執行的操作

#### 1. 重新生成 Telegram Bot Token

**步驟**:
1. 訪問 Telegram，找到 @BotFather
2. 發送 `/mybots`
3. 選擇你的 bot
4. 點擊 **API Token** → **Revoke current token**
5. 生成新的 token
6. 複製新 token 並保存到安全的地方

#### 2. 設置環境變量

**方法 1: 使用 .env 文件** (推薦)

```bash
# 複製示例文件
cp .env.example .env

# 編輯 .env 文件，填入實際值
vim .env
```

**.env 文件內容**:
```bash
BITFINEX_API_KEY=your_actual_bitfinex_api_key
BITFINEX_API_SECRET=your_actual_bitfinex_api_secret
TELEGRAM_BOT_TOKEN=your_new_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

**方法 2: 使用系統環境變量**

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export BITFINEX_API_KEY="your_actual_bitfinex_api_key"
export BITFINEX_API_SECRET="your_actual_bitfinex_api_secret"
export TELEGRAM_BOT_TOKEN="your_new_telegram_bot_token"
export TELEGRAM_CHAT_ID="your_telegram_chat_id"

# 重新載入配置
source ~/.zshrc
```

#### 3. 驗證配置

```bash
# 檢查環境變量是否設置
echo $BITFINEX_API_KEY
echo $TELEGRAM_BOT_TOKEN

# 測試 bot
./lending-bot -config config/config-usd.yaml
```

### 🛡️ 安全最佳實踐

1. **永遠不要在代碼中硬編碼敏感信息**
   - ❌ 錯誤: `token: "1234567890:ABCDEFG..."`
   - ✅ 正確: `token: ""  # Set via TELEGRAM_BOT_TOKEN env var`

2. **使用 .gitignore 保護敏感文件**
   ```gitignore
   .env
   .env.local
   .env.*.local
   config/config.yaml
   config/config-*.yaml
   !config/config.example.yaml
   ```

3. **定期輪換 API Keys**
   - 建議每 3-6 個月更換一次
   - 發現任何異常活動立即更換

4. **使用 Gitleaks 預提交檢查**
   ```bash
   # 安裝 pre-commit hook
   brew install pre-commit
   
   # 創建 .pre-commit-config.yaml
   cat > .pre-commit-config.yaml << 'YAML'
   repos:
     - repo: https://github.com/gitleaks/gitleaks
       rev: v8.28.0
       hooks:
         - id: gitleaks
   YAML
   
   # 安裝 hook
   pre-commit install
   ```

### 📊 洩露檢測報告

- **掃描工具**: Gitleaks v8.28.0
- **掃描時間**: 2025-10-23 18:49
- **掃描提交數**: 27
- **掃描數據量**: 1.33 MB
- **發現洩露**: 2 個（已清理）
- **清理後掃描**: ✅ 無洩露

### 🔍 如何驗證歷史已清理

```bash
# 使用 gitleaks 掃描
gitleaks detect --source . --verbose

# 預期輸出: "no leaks found"
```

### 📝 後續監控

1. **啟用 GitHub Secret Scanning**
   - 前往 Repository Settings → Security → Code security and analysis
   - 啟用 "Secret scanning"

2. **設置 GitHub Actions 自動檢查**
   ```yaml
   # .github/workflows/security.yml
   name: Security Scan
   on: [push, pull_request]
   jobs:
     gitleaks:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: gitleaks/gitleaks-action@v2
   ```

---

**最後更新**: 2025-10-23  
**責任人**: Claude Code with Serena MCP
