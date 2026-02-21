# 掛單同步問題分析報告

## 問題描述
機器人啟動時無法同步現有的 2 個掛單（總值 $417.56），導致無法管理和更新這些掛單。

## 測試驗證
通過獨立測試程式驗證：
```
Found 2 active funding offers
Offer 1: $208.78 @ 0.0309% (2 days)
Offer 2: $208.78 @ 0.0300% (30 days)
```
**API 功能正常，確實返回掛單資料！**

## 問題根源

### 可能原因 1：時序問題
- 機器人在 WebSocket 連接前嘗試獲取掛單
- WebSocket 連接可能清空了之前的狀態

### 可能原因 2：認證問題
- 機器人啟動時的認證狀態可能有問題
- API key 可能在某個時間點未正確初始化

### 可能原因 3：並發問題
- activeOffers map 的並發訪問問題
- 在寫入前可能被其他 goroutine 清空

## 解決方案

### 方案 A：增加重試機制
```go
// 在 bot.go Run() 函數中
var existingOffers []*client.FundingOffer
for retry := 0; retry < 3; retry++ {
    existingOffers, err = b.client.GetActiveFundingOffers("f" + b.config.Bot.Currency)
    if err == nil && len(existingOffers) > 0 {
        break
    }
    time.Sleep(time.Second * 2)
}
```

### 方案 B：延遲同步
在 WebSocket 連接建立後再同步：
```go
// Connect to WebSocket first
if err := b.client.Connect(ctx); err != nil {
    return fmt.Errorf("failed to connect: %w", err)
}

// Wait for connection to stabilize
time.Sleep(time.Second * 3)

// Then retrieve existing offers
existingOffers, err := b.client.GetActiveFundingOffers(...)
```

### 方案 C：定期同步
在主循環中定期同步掛單狀態，而不僅在啟動時：
```go
// 每 5 分鐘同步一次
if time.Since(lastSyncTime) > 5 * time.Minute {
    b.syncExistingOffers()
    lastSyncTime = time.Now()
}
```

## 建議實施

**優先實施方案 B + C 的組合**：
1. 調整啟動順序，確保 WebSocket 連接穩定後再同步
2. 加入定期同步機制，確保狀態始終保持最新

這樣可以：
- 解決啟動時的同步問題
- 防止運行過程中的狀態不一致
- 提高系統的健壯性

## 預期效果
- 機器人能正確識別 $417.56 的現有掛單
- 能夠管理和更新這些掛單
- 策略能基於完整的掛單狀態做決策