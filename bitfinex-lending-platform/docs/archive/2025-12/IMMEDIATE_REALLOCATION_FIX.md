# Bitfinex 放貸機器人 - 立即重分配修正

## 修正日期
2025-09-27

## 問題描述

1. **訂單成交後資金閒置問題**
   - 當放貸訂單成交後，釋放的資金必須等待下一個60秒週期才會被重新利用
   - 導致資金利用率降低，特別是在高成交率的市場環境中

2. **保留金邏輯問題**
   - 系統會保留 10% 的資金作為儲備（例如 $1,016 中保留約 $101）
   - 但保留的資金如果低於 $150（Bitfinex 最小放貸金額），實際上無法使用
   - 造成資金永久閒置，例如保留 $30.50 完全無法利用

## 解決方案

### 1. 實作立即重分配機制

在 `internal/bot/bot.go` 的 `handleFundingUpdate` 函數中添加：

```go
// 當訂單狀態為 EXECUTED 時
if update.Status == "EXECUTED" {
    // ... 原有的處理邏輯 ...

    // 觸發立即重分配以利用釋放的資金
    logrus.Info("[IMMEDIATE_REBALANCE] Order executed, triggering immediate fund reallocation")
    go func() {
        // 小延遲確保餘額已更新
        time.Sleep(2 * time.Second)
        b.executeStrategyOnce()
    }()
}
```

新增 `executeStrategyOnce` 函數：
- 立即執行一次策略計算
- 不等待下一個定時週期
- 使用 [IMMEDIATE] 標籤追蹤即時執行

### 2. 修正保留金邏輯

在 `getAvailableBalance` 函數中實施智慧保留策略：

```go
// 關鍵修正：保留金必須為 0 或 >= $150 才有意義
if desiredReserve < absoluteMinimum {
    // 如果保留金會低於 $150，不保留任何資金
    // 使用全部資金比保留無法使用的金額更好
    reserve = 0
    finalAvailable = trueAvailable
} else if afterReserve >= minLendAmount {
    // 如果可以維持 >= $150 的保留金且仍有最低放貸金額
    reserve = desiredReserve
    finalAvailable = afterReserve
} else {
    // 如果維持保留金會導致可貸金額太少
    // 檢查是否仍能維持可用的保留金
    potentialReserve := trueAvailable - minLendAmount
    if potentialReserve >= absoluteMinimum {
        // 可以維持可用的保留金
        reserve = potentialReserve
        finalAvailable = minLendAmount
    } else {
        // 無法維持可用的保留金，使用全部資金
        reserve = 0
        finalAvailable = trueAvailable
    }
}
```

## 改進效果

1. **立即資金再利用**
   - 訂單成交後2秒內自動重新分配資金
   - 不需等待60秒週期
   - 提高資金利用率

2. **智慧保留金**
   - 保留金只會是 $0 或 >= $150
   - 避免無法使用的小額保留金
   - 最大化可用資金

3. **日誌追蹤**
   - 使用 [IMMEDIATE_REBALANCE] 和 [IMMEDIATE] 標籤
   - 清楚標示即時執行的操作
   - 方便監控和調試

## 測試建議

1. 監控日誌中的 [IMMEDIATE] 標籤
2. 觀察訂單成交後是否立即重新分配
3. 確認保留金是否符合新邏輯（0 或 >= $150）
4. 檢查資金利用率是否提升

## 相關文件

- 原始問題報告：用戶抱怨 $30.50 保留金無法使用
- 修改文件：internal/bot/bot.go
- 影響功能：資金管理、訂單執行、策略執行