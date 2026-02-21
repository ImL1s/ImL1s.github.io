# 📚 Bitfinex 放貸機器人使用指南

## 🚀 快速開始

### 1️⃣ 確認環境設置
```bash
# 檢查配置
cat .env | grep -E "(STRATEGY|CURRENCY|DRY_RUN)"
```

當前配置：
- **策略**: `hybrid` (混合策略)
- **幣種**: `USD`
- **模式**: `dry_run=true` (模擬模式)

### 2️⃣ 啟動機器人

#### 測試模式（推薦先測試）
```bash
# 保持 dry_run=true
./lending-bot
```

#### 實盤模式
```bash
# 修改 .env 設置 dry_run=false
sed -i '' 's/BFX_BOT_DRY_RUN=true/BFX_BOT_DRY_RUN=false/' .env
./lending-bot
```

### 3️⃣ 選擇策略

修改 `.env` 中的 `BFX_STRATEGY_TYPE`：

| 策略 | 設置值 | 風險 | 預期收益 | 適合場景 |
|------|--------|------|----------|----------|
| **混合策略** | `hybrid` | 中 | 15-25% | 全天候，自動平衡 |
| **FRR Delta** | `frr_delta` | 低 | 10-15% | 穩定市場，保守投資 |
| **頂簿壓價** | `top_book` | 中高 | 20-30% | 高流動性，積極投資 |
| **網格策略** | `grid` | 中 | 12-18% | 波動市場 |
| **自適應策略** | `adaptive` | 中 | 15-20% | 需要歷史數據 |
| **純 FRR** | `frr` | 低 | 8-12% | 完全被動 |

## 📊 監控狀態

### 實時日誌監控
```bash
# 查看實時日誌
tail -f test_hybrid.log

# 只看錯誤
tail -f test_hybrid.log | grep -E "error|ERROR"

# 只看重要訊息
tail -f test_hybrid.log | grep -E "(rate|offer|balance|profit)"
```

### 關鍵指標解讀

#### 1. 利率指標
```
FRR: 0.0003645 (0.0365% 日利率 = 13.3% 年化)
```
- **FRR** = Flash Return Rate (市場平均利率)
- **日利率 × 365** = 年化收益

#### 2. 錢包餘額
```
funding_USD: 3093.49  # 可用於放貸的資金
```

#### 3. 策略狀態
```
strategies_active: 3   # 活躍子策略數
total_offers: 7       # 掛單總數
```

#### 4. 風險評分
```
risk_score: -0.059    # 負值=低風險，正值=高風險
should_halt: false    # 是否需要停止
```

## 🎮 操作命令

### 基本操作
```bash
# 啟動
./lending-bot

# 背景運行
nohup ./lending-bot > bot.log 2>&1 &

# 查看進程
ps aux | grep lending-bot

# 停止
pkill lending-bot
```

### 策略切換
```bash
# 切換到 FRR Delta（保守）
./switch_strategy.sh frr_delta

# 切換到 Top Book（積極）
./switch_strategy.sh top_book

# 切換到 Hybrid（均衡）
./switch_strategy.sh hybrid
```

## 📈 性能監控

### Prometheus 指標（端口 8080）
```bash
# 查看指標
curl http://localhost:8080/metrics

# 重要指標
curl http://localhost:8080/metrics | grep -E "(offers|rate|balance)"
```

### 關鍵指標說明
- `lending_active_offers`: 活躍訂單數
- `lending_total_amount`: 放貸總金額
- `lending_average_rate`: 平均利率
- `lending_utilization`: 資金利用率

## ⚙️ 參數調優

### Hybrid 策略參數
```yaml
# .env 或 config.yaml
dynamic_weights: true       # 動態調整權重
high_volatility_threshold: 0.5  # 高波動閾值
high_rate_threshold: 0.002     # 高利率閾值（0.2%）
```

### FRR Delta 參數
```yaml
mode: variable           # variable 或 fixed
delta_bps: 2            # 基點差（1 bps = 0.01%）
period: 7               # 放貸期限（天）
```

### Top Book 參數
```yaml
undercut_bps: 2         # 壓價基點
max_position: 5         # 最大訂單簿位置
min_amount: 50          # 最小訂單金額
```

## 🔍 問題排查

### 常見問題

#### 1. "API error" 錯誤
**原因**: API 請求失敗
**解決**:
- 檢查 API 密鑰是否正確
- 確認網路連接
- 查看速率限制

#### 2. 端口 8080 被佔用
**原因**: Prometheus 監控端口衝突
**解決**:
```bash
# 查找佔用進程
lsof -i :8080
# 修改端口
sed -i '' 's/8080/8081/' .env
```

#### 3. 無法獲取餘額
**原因**: API 權限不足
**解決**: 確認 API 密鑰有 funding 權限

## 📱 通知設置

### Telegram 通知（計劃中）
```yaml
telegram:
  enabled: true
  bot_token: "YOUR_BOT_TOKEN"
  chat_id: "YOUR_CHAT_ID"
  alerts:
    - high_rate      # 高利率機會
    - low_balance    # 餘額不足
    - error         # 錯誤發生
```

## 🎯 最佳實踐

### 初學者建議
1. **先用模擬模式測試 24 小時**
2. **從小額開始（$50-100）**
3. **使用保守策略（FRR Delta）**
4. **逐步增加資金和風險**

### 進階用戶
1. **使用 Hybrid 策略獲得均衡收益**
2. **根據市場調整參數**
3. **設置多幣種分散風險**
4. **定期查看性能報告優化**

### 風險管理
1. **設置最大敞口（max_exposure）**
2. **保留準備金（min_reserve）**
3. **監控波動率指標**
4. **設置止損規則**

## 📞 獲取幫助

### 查看日誌
```bash
# 最近 100 行日誌
tail -n 100 test_hybrid.log

# 搜索特定錯誤
grep "error" test_hybrid.log | tail -20
```

### 生成報告
```bash
# 運行診斷腳本
./diagnose.sh

# 生成性能報告
./performance_report.sh
```

### 社區支持
- GitHub Issues: [報告問題]
- Discord: [加入社區]
- Telegram: [討論群組]

---

*最後更新: 2025-09-20*
*版本: v1.0.0 (官方 SDK 版本)*