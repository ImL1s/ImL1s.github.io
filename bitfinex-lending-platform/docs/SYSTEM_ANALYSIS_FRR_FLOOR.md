# 系統分析：FRR Floor 保護機制與報價策略

**日期**: 2025-12-21
**分析原因**: 調查為什麼 2 萬多 USDT 掛單長期停留在 14% APR 無法成交

## 問題背景

用戶報告 USDT 放貸機器人有 20,000+ USDT 的活躍掛單長期無法成交。經過調查發現：

- **當前掛單利率**: 14% APR
- **市場最佳報價 (best_ask_rate)**: 3.478% APR
- **FRR (Flash Return Rate)**: 14.1406% APR

## 根本原因：FRR Floor 保護機制

### 關鍵發現

Repricer 的 **FRR Floor 保護機制**正在將所有報價維持在 FRR 以上，即使 order book 上的競爭價格遠低於此。

### 代碼分析

#### Repricer 調價邏輯 (internal/strategy/repricer.go:258-268)

```go
// 1. 計算目標價格
targetRate := r.getTargetRate(book, minRate)
// target = best_ask_rate + 2 bps
// target = 3.478% + 0.02% = 3.498%

// 2. 指數衰減降價
downwardRate := r.calculateDecayRate(offer.Rate, targetRate, staleMinutes, cfg.DecayLambda)
// downwardRate 應該從 14% 逐步降到 ~3.5%

// 3. FRR Floor 保護（關鍵！）
frrFloor := minRate  // 3.65%
if cfg.UseFRRFloor && currentFRR > 0 {
    frrFloor = math.Max(minRate, currentFRR)  // max(3.65%, 14.14%) = 14.14%
}
if downwardRate < frrFloor {
    downwardRate = frrFloor  // 強制設為 14.14%！
}
```

#### 實際運行日誌

```
time="2025-12-21T11:15:30Z" level=info msg="Repricing offer"
  old_rate=14.082429999999999
  new_rate=14.140600000000001  ← 被強制提升到 FRR
  direction=down
  reason="Offer exceeded max stale time"
  best_ask_rate=3.4780850000000005
  frr=14.140600000000001
  min_rate=3.65
```

### FRR 配置來源

Platform 使用默認配置 (platform/internal/worker/executor_real.go:480-488):

```go
cfg := rootstrategy.DefaultRepricerConfig()
// UseFRRFloor = true（默認啟用）
// RepriceCooldown = 30 minutes
// MaxRepricesPerOffer = 10
```

DefaultRepricerConfig 定義 (internal/strategy/repricer.go:78-109):

```go
func DefaultRepricerConfig() *RepricerConfig {
    return &RepricerConfig{
        Enabled:         true,
        DecayLambda:     0.03,   // Half-life ~23 minutes
        MinRepriceStep:  0.0001, // 1 bps
        TargetSpreadBps: 2,      // Target: best_rate + 2 bps
        MaxStaleMinutes: 120,    // 2 hours max idle

        // Anti-loop protection
        MaxRepricesPerOffer:    10,
        RepriceCooldown:        30 * time.Minute,

        // FRR protection
        UseFRRFloor: true,  // ← 默認啟用
    }
}
```

## 指標差異分析

### 為什麼 FRR = 14.14% 而 best_ask = 3.478%？

這兩個指標代表市場的不同層面：

#### FRR (Flash Return Rate) = 14.14%
- **定義**: Bitfinex 官方的市場參考利率
- **計算方式**: 所有活躍貸款的加權平均利率
- **反映**: 已成交並執行中的貸款（包括 VAR loans）
- **特性**: 滯後指標，反映市場歷史狀態

#### best_ask_rate = 3.478%
- **定義**: Order book 上最低的 lend offer
- **計算方式**: 當前掛單中最便宜的報價
- **反映**: 當前掛單的競爭價格
- **特性**: 領先指標，但不保證成交

### 差異可能原因

1. **VAR Loans 拉高 FRR**
   - Variable rate loans 使用 `FRR + delta` 計算利率
   - VAR loans 可能佔市場主導地位
   - 借款人優先使用 VAR，導致低價固定利率掛單無法成交

2. **歷史遺留效應**
   - 之前高利率時期（14%+）的貸款還在執行中
   - 這些長期貸款（可能 30-120 天）拉高了 FRR 平均值

3. **市場快速轉變**
   - 借款需求快速下降
   - 活躍貸款平均利率（FRR）還沒降下來
   - Order book 反映新的競爭環境，但成交量低

4. **低價競爭無效**
   - 大量 lenders 掛低價搶單
   - 但 borrowers 實際使用 VAR 或接受較高固定利率
   - 低價掛單形成「價格陷阱」

## 當前策略組合

### 主策略：Grid Strategy (ML Enhanced)

1. **Grid Strategy (Base)**
   - 多層報價分散風險
   - 動態調整利率範圍（基於 FRR）
   - 配置: 3 levels, min_period=2, max_period=7

2. **ML Wrapper**
   - 調整 balance allocation
   - 調整 rate (based on risk)
   - 調整 period (based on trend)

3. **Repricer**
   - 自動調價（指數衰減）
   - FRR Floor 保護 ← **當前限制因素**
   - Cooldown: 30 minutes
   - Max reprices: 10 per offer

### 數據流

```
Market Data (WebSocket)
  ↓
Grid Strategy: 生成基礎報價
  ↓
ML Wrapper: 調整 rate/period/allocation
  ↓
Repricer: 自動調價
  ↓
FRR Floor Check: max(target_rate, FRR) ← 阻塞點
  ↓
Submit Offers (14% APR)
```

## 設計權衡

### FRR Floor 保護的優點 ✅

1. **避免錯誤降價**
   - 如果 FRR = 14%，說明市場平均利率在此水平
   - 降到 3.5% 可能損失巨大利潤機會

2. **保護免受異常 order book**
   - Order book 可能被少數低價掛單扭曲
   - FRR 反映真實市場成交水平

3. **VAR Loans 主導市場**
   - 如果 borrowers 主要使用 VAR
   - Order book 的低價固定利率可能無效

### 當前問題 ⚠️

1. **資金長期閒置**
   - 2 萬多 USDT 無法成交
   - 閒置資金也是一種損失（機會成本）

2. **Order book 顯示競爭**
   - best_ask = 3.478% 說明有競爭對手願意接受低價
   - 可能部分市場確實在低價成交

3. **FRR 可能滯後**
   - 市場從高利率期快速轉變
   - FRR 是加權平均，包含歷史遺留貸款
   - 新借款需求可能已經在低價區間

## 可能的解決方案

### 選項 1: 禁用 FRR Floor（激進）

**修改**: `UseFRRFloor: false`

**效果**:
- Repricer 會降價到 `best_ask_rate + 2 bps ≈ 3.5%`
- 可能快速成交

**風險**:
- 如果 FRR = 14% 反映真實市場，會損失利潤
- 可能被低價「價格陷阱」誤導

### 選項 2: 混合策略（平衡）

**修改**: 部分資金使用 FRR Floor，部分跟隨 order book

```go
// 70% 資金使用 FRR Floor 保護
// 30% 資金禁用 FRR Floor，跟隨市場競爭
```

**效果**:
- 分散風險
- 既保護大部分資金，又探索低價市場

### 選項 3: 動態 FRR Floor（智能）

**修改**: 根據 FRR 和 best_ask 的差異動態調整

```go
gap := currentFRR - bestAskRate
if gap > threshold {  // 例如 > 5%
    // 差異太大，可能 FRR 滯後，降低保護門檻
    frrFloor = currentFRR * 0.7  // 打折使用 FRR
}
```

### 選項 4: 觀察和等待（保守）

**邏輯**:
- FRR Floor 保護是有理由的
- 市場可能處於過渡期
- 等待 FRR 自然下降

**條件**:
- 監控 FRR 趨勢
- 如果 FRR 開始下降，系統會自動跟隨

## 建議下一步

1. **確認市場狀態**
   - 檢查 Bitfinex 官方數據，確認 VAR loans 比例
   - 確認低價掛單是否有成交

2. **測試混合策略**
   - 小額資金（如 30%）禁用 FRR Floor
   - 觀察是否能成交

3. **監控 FRR 趨勢**
   - 如果 FRR 持續下降，系統會自動調整
   - 如果 FRR 穩定在 14%，說明保護有效

## 技術細節

### 相關代碼位置

- **Repricer 配置**: `internal/strategy/repricer.go:78-109`
- **FRR Floor 邏輯**: `internal/strategy/repricer.go:258-268`
- **Platform 初始化**: `platform/internal/worker/executor_real.go:478-492`
- **FRR 數據來源**: `internal/client/bitfinex.go:2040-2051`

### 關鍵配置參數

```yaml
# DefaultRepricerConfig
UseFRRFloor: true              # FRR Floor 保護開關
RepriceCooldown: 30 minutes    # 調價冷卻期
MaxRepricesPerOffer: 10        # 每個 offer 最多調價次數
DecayLambda: 0.03              # 衰減係數（半衰期 ~23 分鐘）
TargetSpreadBps: 2             # 目標利差（best_ask + 2 bps）
MaxStaleMinutes: 120           # 最大閒置時間（2 小時）
```

## 結論

當前系統按設計運作，**FRR Floor 保護機制正在執行其職責**，防止報價降到市場平均利率（FRR = 14.14%）以下。

這是一個**設計上的權衡**，而不是 bug：
- ✅ 保護免受異常低價影響
- ⚠️ 但可能錯過真實的市場轉變

是否需要調整取決於對市場的判斷：FRR 是滯後指標還是反映真實需求水平。
