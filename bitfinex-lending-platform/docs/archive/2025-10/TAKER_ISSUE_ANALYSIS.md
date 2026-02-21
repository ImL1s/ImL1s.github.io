# Taker 交易問題分析報告

**日期**: 2025-10-04
**版本**: v2.0
**問題嚴重性**: 🟡 中等（影響利潤 30%）

## 📊 問題概述

### 發現經過
1. 用戶發現 Order Book 顯示「無買單」→ 重啟 bot 修復
2. 檢查交易記錄發現 11 筆中有 5 筆是 Taker
3. 初步分析認為是 0.85 折扣導致 → **錯誤**
4. 使用 omniscient-solver 批判性驗證 → 發現真正原因

### 核心問題
**45% 交易為 Taker（吃單），而非 Maker（掛單）**

```
總交易: 11 筆
- Maker: 6 筆 @ 7.60% APR 平均
- Taker: 5 筆 @ 5.33% APR 平均
- 利潤損失: 2.27% APR (30%)
```

## 🔍 根本原因分析

### 錯誤分析 (已推翻)
❌ **初步假設**: `adjustRateByMarketDepth()` 的 0.85 折扣導致利率過低
- 計算: 5.84% × 0.85 = 4.96% ≈ Taker 平均 5.33%
- **問題**: 折扣只在供需比 < 0.5 時觸發，但實際供需比是 18-116（遠大於 0.5）

### 正確分析 (經驗證)
✅ **真正原因**: min_rate 設定過低，訂單提交時立即被市場吃掉

**證據**:
```
Taker 成交利率: 0.0136% - 0.0162% (與提交利率 0.00016 接近)
Maker 成交利率: 0.0208% (市場可支撐更高利率)
供需比: 18-116 (需求充足)
```

**時間證據**:
```
2025-10-04 06:51:40 | 生成掛單 | rate: 0.00016
2025-10-04 06:51:42 | Taker 成交 | rate: 0.00016 (2秒內成交)
```

**結論**: 當提交利率 ≤ 市場 Bid 時，訂單立即被吃掉成為 Taker

## 🛠️ 解決方案

### 方案 A：安全漸進式（推薦）

#### 代碼修改
**文件**: `internal/strategy/grid.go:358`

```go
// 當前代碼（有問題）
adjustedRate := baseRate * adjustment
return adjustedRate

// 修復後
adjustedRate := baseRate * adjustment
adjustedRate = math.Max(adjustedRate, s.config.MinRate)  // 添加下限保護
return adjustedRate
```

**原因**: 確保動態調整後不會低於配置的 min_rate

#### 配置調整
**文件**: `config/config.yaml`

```yaml
# 當前配置
strategy:
  type: "grid"
  grid:
    grid_levels: 3
    min_rate: 0.00016      # 5.84% APR
    max_rate: 0.00022      # 8.03% APR
    distribution: "adaptive"

# 調整後
strategy:
  type: "grid"
  grid:
    grid_levels: 3
    min_rate: 0.00017      # 6.21% APR (+6.25%)
    max_rate: 0.00024      # 8.76% APR (+9.1%)
    distribution: "linear"  # 更穩定
```

**調整理由**:
- min_rate 0.00016 → 0.00017：提高保護下限，減少被秒吃機會
- 只提升 6.25%，相對保守（初始提議 12.5% 太激進）
- 市場 Maker 成交 0.0208%，新 min_rate 0.00017 仍有 23% 安全邊際
- distribution 改為 linear：更穩定，減少極端情況

#### 預期效果
```
Maker 比例: 54% → 80%+
平均 APR: 6.39% → 7.0%+
資金利用率: 維持 85%+
風險等級: 🟢 低
```

### 方案 B：Post-Only 模式（暫緩）

#### 實施方式
**文件**: `internal/client/bitfinex.go:2052`

```go
// 當前
payload := map[string]interface{}{
    "flags": 0,  // 允許 Taker
}

// 修改為
payload := map[string]interface{}{
    "flags": 4096,  // Post-Only（只允許 Maker）
}
```

#### 運作邏輯
```
開啟 Post-Only 後：
- 掛單價 ≤ 市場 Bid → 訂單取消（不會成為 Taker）
- 掛單價 > 市場 Bid → 進入掛單簿（成為 Maker）
```

#### 風險評估
- ✅ 優點: 100% Maker 交易，無 Taker 損失
- ❌ 缺點: 成交率可能大幅下降（當前 5 筆 Taker 會變成 0 筆）
- ⚠️ 影響: 資金利用率可能從 85% 降至 60-70%

#### 使用建議
🟡 **建議先執行方案 A，監控 7 天後再評估是否需要方案 B**

理由:
1. 方案 A 風險低，影響可控
2. 先觀察調高 min_rate 的效果
3. 如果 7 天後 Taker 比例仍 >20%，再考慮 Post-Only

## 📈 監控計劃

### 執行步驟
1. **備份當前配置**
   ```bash
   cp config/config.yaml config/config.yaml.backup.20251004
   ```

2. **修改代碼**
   ```bash
   # 編輯 internal/strategy/grid.go:358
   # 添加: adjustedRate = math.Max(adjustedRate, s.config.MinRate)
   ```

3. **更新配置**
   ```bash
   # 編輯 config/config.yaml
   # min_rate: 0.00017
   # max_rate: 0.00024
   # distribution: "linear"
   ```

4. **重新編譯部署**
   ```bash
   go build -o lending-bot cmd/bot/main.go
   pkill -9 lending-bot
   nohup ./lending-bot > bot.log 2>&1 &
   ```

### 監控指標（7 天）

#### 每日檢查
```bash
# Maker/Taker 分布
echo "Maker: $(jq '[.[] | select(.maker)] | length' data/my_trades.json)"
echo "Taker: $(jq '[.[] | select(.maker == false)] | length' data/my_trades.json)"

# 平均利率
jq '[.[] | .rate * 365 * 100] | add / length' data/my_trades.json

# 資金利用率
curl -s http://localhost:8090/api/stats | jq '.utilization_rate'
```

#### 目標指標
```
✅ Maker 比例: >80%
✅ 平均 APR: >7.0%
✅ 資金利用率: >85%
✅ 成交頻率: 每天至少 1 筆
```

#### 風險指標
```
⚠️ 如果資金利用率 <80% → 考慮降低 min_rate
⚠️ 如果成交頻率 <1筆/天 → 考慮降低 min_rate
❌ 如果 Taker 比例仍 >30% → 考慮方案 B (Post-Only)
```

## 📝 技術細節

### Grid 策略動態調整流程

```
1. adjustRateRange (FRR 動態範圍)
   ↓
   實際 min = max(FRR × 0.5, config.min_rate)
   實際 max = min(FRR × 2.0, config.max_rate)
   ↓
2. calculateRateForLevel (計算各層利率)
   ↓
   根據 distribution 計算基礎利率
   ↓
3. adjustRateByMarketDepth (市場供需調整)
   ↓
   根據供需比調整利率 (× 1.3 或 × 0.85)
   ❌ 問題: 沒有 min_rate 下限檢查
   ↓
4. ✅ 修復: 添加 math.Max(adjustedRate, s.config.MinRate)
```

### Maker vs Taker 判定

**Bitfinex 規則**:
```
if 掛單利率 <= 當前市場最低 Bid:
    立即成交 → Taker
    支付手續費
    利率較低
else:
    進入掛單簿 → Maker
    無手續費
    利率較高
```

**我們的情況**:
```
min_rate: 0.00016 (當前)
市場 Bid: 約 0.00016-0.00020
→ 掛單經常 <= 市場 Bid → 變成 Taker

min_rate: 0.00017 (調整後)
市場 Bid: 約 0.00016-0.00020
→ 掛單更可能 > 市場 Bid → 變成 Maker
```

## 🔄 回滾計劃

如果調整後效果不佳，回滾步驟：

```bash
# 1. 停止 bot
pkill -9 lending-bot

# 2. 恢復配置
cp config/config.yaml.backup.20251004 config/config.yaml

# 3. 恢復代碼（使用 git）
git checkout internal/strategy/grid.go

# 4. 重新編譯
go build -o lending-bot cmd/bot/main.go

# 5. 重啟
nohup ./lending-bot > bot.log 2>&1 &
```

## 📚 參考資料

### 相關文件
- `CLAUDE.md` - 已更新問題記錄
- `docs/STRATEGY_GUIDE.md` - 已更新策略說明
- `internal/strategy/grid.go:240-268` - adjustRateRange
- `internal/strategy/grid.go:319-358` - adjustRateByMarketDepth
- `internal/strategy/grid.go:157-237` - CalculateOffers
- `internal/client/bitfinex.go:2052` - 訂單提交（flags 參數）

### 數據來源
- `data/my_trades.json` - 歷史交易記錄
- `logs/bot.log` - 運行日誌
- Bitfinex Order Book API - 實時市場數據

## ✅ 行動檢查表

- [ ] 備份當前配置
- [ ] 修改 grid.go 添加下限保護
- [ ] 更新 config.yaml (min_rate, max_rate, distribution)
- [ ] 重新編譯 bot
- [ ] 重啟 bot
- [ ] 驗證 bot 正常運行
- [ ] 設置每日監控提醒
- [ ] 7 天後評估效果
- [ ] 決定是否啟用 Post-Only

---

**最後更新**: 2025-10-04
**狀態**: 待用戶確認執行
**風險評級**: 🟢 低風險
