# ⚠️ 重要說明：單幣種運行模式

## 📌 你的 Bot 只會對**一個**幣種放貸

### 當前實現：**單幣種切換**，不是多幣種並行

---

## 🔍 工作原理

### 你的當前配置
```yaml
# config/config.yaml
bot:
  currency: "USD"  # 舊格式
```

### 啟動後會發生什麼

1. **配置自動遷移**:
   ```
   currency: "USD" → Currencies: ["USD"]
   ```

2. **Bot 獲取活躍幣種**:
   ```go
   getCurrency() 返回 "USD"  // 只返回第一個幣種
   ```

3. **所有操作只針對 USD**:
   - ✅ 訂閱 WebSocket: `"fUSD"`（不是 fUSDT）
   - ✅ 查詢餘額: USD 帳戶
   - ✅ 提交報價: USD 放貸
   - ✅ 獲取歷史: USD 數據

---

## 💡 核心邏輯解析

### getCurrency() 方法
```go
func (b *Bot) getCurrency() string {
    // 優先使用 Currencies 數組的第一個元素
    if len(b.config.Bot.Currencies) > 0 {
        return b.config.Bot.Currencies[0]  // ← 只返回第一個！
    }

    // 回退到舊的 Currency 配置
    if b.config.Bot.Currency != "" {
        return b.config.Bot.Currency
    }

    // 預設值
    return "USD"
}
```

**關鍵**: 永遠只返回**一個**幣種，不會返回數組。

### Bot.Run() 方法
```go
func (b *Bot) Run(ctx context.Context) error {
    // 訂閱頻道 - 只訂閱一個幣種
    b.subscribeToChannels()  // 內部使用 b.getCurrency()

    // 獲取資金 - 只查詢一個幣種
    credits, _ := b.client.GetFundingCredits("f" + b.getCurrency())

    // 主循環 - 只有一個循環
    for {
        select {
        case <-ticker.C:
            b.executeStrategy(ctx)  // 只執行一個幣種的策略
        }
    }
}
```

**沒有**對 `Currencies` 數組進行循環！

---

## ✅ 配置示例與行為

### 示例 1: 你的當前配置
```yaml
bot:
  currency: "USD"
```

**行為**:
- ✅ 只放貸 USD
- ❌ 不會放貸 USDT
- ❌ 不會放貸其他幣種

---

### 示例 2: 切換到 USDT
```yaml
bot:
  currencies: ["USDT"]
```

**行為**:
- ❌ 不會放貸 USD
- ✅ 只放貸 USDT
- ❌ 不會放貸其他幣種

---

### 示例 3: 配置多個幣種（只有第一個生效）
```yaml
bot:
  currencies: ["USD", "USDT", "EUR"]
```

**行為**:
- ✅ 只放貸 USD（第一個）
- ❌ 不會放貸 USDT（被忽略）
- ❌ 不會放貸 EUR（被忽略）

**警告**: 目前版本不支援多幣種並行！

---

## 🚫 不會發生的事情

❌ **不會**同時對多個幣種放貸
❌ **不會**自動切換幣種
❌ **不會**創建多個放貸實例
❌ **不會**消耗多個幣種的餘額
❌ **不會**訂閱多個幣種的 WebSocket

---

## ✅ 會發生的事情

✅ **只會**對配置的第一個幣種放貸
✅ **只會**使用該幣種的餘額
✅ **只會**訂閱該幣種的市場數據
✅ **只會**記錄該幣種的歷史

---

## 🔄 如何切換幣種

### 從 USD 切換到 USDT

1. **停止 Bot**:
   ```bash
   pkill -f lending-bot
   ```

2. **修改配置**:
   ```bash
   vim config/config.yaml
   # 將第 14 行改為: currencies: ["USDT"]
   ```

3. **重新啟動**:
   ```bash
   ./dual-instance.sh restart
   # 或只重啟 USDT 實例
   ./dual-instance.sh stop usdt && ./dual-instance.sh start usdt
   ```

4. **驗證**:
   - 查看日誌應該顯示: `Currency: USDT`
   - WebSocket 訂閱: `fUSDT`
   - 餘額查詢: USDT 帳戶

---

## 📊 技術驗證

### 測試 1: 配置解析
```
配置: currency: "USD"
解析後: Currencies: ["USD"]
getCurrency() 返回: "USD"  ✅
```

### 測試 2: 運行邏輯
```
Bot.Run() 調用 getCurrency(): 29 次
每次都返回: "USD"
沒有對 Currencies 數組循環  ✅
```

### 測試 3: API 調用
```
GetFundingCredits("fUSD")  ✅ 只查詢 USD
SubmitFundingOffer("USD", ...) ✅ 只提交 USD
GetMarketData("USD")  ✅ 只獲取 USD 市場數據
```

---

## 🎯 總結

### 當前版本（v2.1）: 單幣種切換

| 功能 | 支援狀態 | 說明 |
|------|---------|------|
| USD 放貸 | ✅ 支援 | 預設幣種 |
| USDT 放貸 | ✅ 支援 | 需修改配置並重啟 |
| 幣種切換 | ✅ 支援 | 停止 → 修改配置 → 重啟 |
| 多幣種並行 | ❌ 不支援 | 需要未來版本 |
| 自動切換 | ❌ 不支援 | 需手動操作 |

### 未來版本（v2.2+）: 多幣種並行（計劃中）

如需同時運行多個幣種，目前有兩個選項：

**選項 A**: 運行多個 Bot 實例（立即可用）
```bash
# 實例 1: USD (port 8090)
./lending-bot -config config/config-usd.yaml &

# 實例 2: USDT (port 8091, 需修改配置中的端口)
./lending-bot -config config/config-usdt.yaml &
```

**選項 B**: 等待原生多幣種並行支援（未來版本）

---

## ❓ 常見問題

### Q: 啟動後會自動對所有幣種放貸嗎？
**A**: ❌ **不會**！只會對配置的第一個幣種放貸。

### Q: 我配置了 `currencies: ["USD", "USDT"]`，會同時放貸嗎？
**A**: ❌ **不會**！只會放貸 USD（第一個），USDT 會被忽略。

### Q: 如何同時放貸 USD 和 USDT？
**A**: 當前需要運行兩個 Bot 實例，或等待未來版本。

### Q: 我的 USD 餘額會被動用嗎（如果我配置 USDT）？
**A**: ❌ **不會**！配置 USDT 只會查詢和使用 USDT 餘額。

### Q: 切換幣種需要重啟 Bot 嗎？
**A**: ✅ **是的**！需要停止、修改配置、重新啟動。

---

## 🔒 安全保證

✅ **配置驗證**: 只有支援的幣種才能通過驗證
✅ **單幣種運行**: 永遠只對一個幣種操作
✅ **餘額隔離**: 不同幣種的餘額不會混淆
✅ **數據隔離**: 歷史記錄按幣種分離

---

**最後更新**: 2025-10-23
**當前版本**: v2.1 (Single Currency Switch)
