# 多幣種支援使用指南

## 版本資訊
- **支援版本**: v2.1+
- **支援幣種**: USD, USDT, UST, EUR, GBP, JPY
- **更新日期**: 2025-10-23

## 快速開始

### 1. USD 放貸（預設）

使用舊配置格式（完全向後兼容）：

```yaml
# config/config.yaml
bot:
  currency: "USD"  # 舊格式，仍然有效
  min_lend_amount: 200.0
  # ...
```

或使用新格式：

```yaml
bot:
  currencies: ["USD"]  # 新格式
  min_lend_amount: 200.0
  # ...
```

### 2. USDT 放貸

```yaml
# config/config.yaml
bot:
  currencies: ["USDT"]  # 切換到 USDT
  min_lend_amount: 150.0  # Bitfinex 最低限額
  # ...
```

**完整示例**: 參考 `config/config.usdt.example.yaml`

### 3. 其他幣種

支援的幣種列表：
- `USD` - 美元（預設）
- `USDT` - Tether USD
- `UST` - Terra USD
- `EUR` - 歐元
- `GBP` - 英鎊
- `JPY` - 日元

配置方式相同，只需修改 `currencies` 數組的第一個元素。

## 配置說明

### 向後兼容性

Bot 會自動處理舊配置格式：

| 配置 | 實際行為 |
|------|---------|
| `currency: "USD"` | 使用 USD |
| `currencies: ["USDT"]` | 使用 USDT |
| `currencies: ["USD", "USDT"]` | 使用 USD（第一個）|
| 未配置 | 預設使用 USD |

**優先級**: `currencies[0]` > `currency` > 預設值 "USD"

### 切換幣種

要從 USD 切換到 USDT：

```bash
# 1. 停止 Bot
pkill -f lending-bot

# 2. 修改配置
vim config/config.yaml
# 將 currencies: ["USD"] 改為 currencies: ["USDT"]

# 3. 重新啟動
./lending-bot
```

### 注意事項

1. **帳戶餘額檢查**: 確保你的 Bitfinex 帳戶有該幣種的餘額
2. **最低限額**: 不同幣種的最低放貸金額可能不同（通常 $150 等值）
3. **市場深度**: USDT 的放貸市場可能與 USD 不同，利率範圍需要調整
4. **數據庫隔離**: 不同幣種的歷史數據會自動隔離（根據 `currency` 字段）

## 配置示例

### USD 配置（穩健型）

```yaml
bot:
  currencies: ["USD"]
  min_lend_amount: 200.0

strategy:
  type: "grid"
  grid:
    grid_levels: 3
    min_rate: 0.00005  # 1.83% 年化
    max_rate: 0.001    # 36.5% 年化
    distribution: "linear"
```

### USDT 配置（激進型）

```yaml
bot:
  currencies: ["USDT"]
  min_lend_amount: 150.0

strategy:
  type: "grid"
  grid:
    grid_levels: 5
    min_rate: 0.0001   # 3.65% 年化
    max_rate: 0.002    # 73% 年化
    distribution: "exponential"
```

## 技術細節

### 內部實現

Bot 使用 `getCurrency()` 方法獲取當前活躍幣種：

```go
func (b *Bot) getCurrency() string {
    // 優先使用 Currencies 數組的第一個元素
    if len(b.config.Bot.Currencies) > 0 {
        return b.config.Bot.Currencies[0]
    }

    // 回退到舊的 Currency 字段（向後兼容）
    if b.config.Bot.Currency != "" {
        return b.config.Bot.Currency
    }

    // 最終回退到預設值
    return "USD"
}
```

### API 調用

所有 Bitfinex API 調用都會使用當前幣種：

- `GetMarketData(currency)` - 獲取市場數據
- `GetFundingCredits("f" + currency)` - 獲取活躍貸款
- `SubmitFundingOffer(currency, ...)` - 提交報價

### 數據庫記錄

數據庫中的記錄會標記幣種：

```sql
-- 歷史收益（按幣種分組）
SELECT currency, SUM(interest) FROM earnings GROUP BY currency;

-- 活躍報價（按幣種過濾）
SELECT * FROM offers WHERE currency = 'USDT';
```

## 未來規劃

### v2.2: 多幣種並行支援（計劃中）

未來版本將支援同時運行多個幣種：

```yaml
bot:
  currencies: ["USD", "USDT", "EUR"]  # 同時運行三個幣種
```

每個幣種將有：
- 獨立的策略實例
- 獨立的餘額管理
- 獨立的報價列表
- 統一的 Web 界面（分幣種顯示）

## 常見問題

### Q: 我的舊配置還能用嗎？

**A**: 完全可以！舊的 `currency: "USD"` 格式仍然有效。

### Q: 如何同時運行 USD 和 USDT？

**A**: 當前版本（v2.1）只支援單一幣種運行。要切換幣種需要重啟 Bot。

如果需要同時運行，可以：
1. 運行兩個 Bot 實例（不同配置文件和端口）
2. 等待 v2.2 版本的原生支援

### Q: USDT 的利率範圍應該設定多少？

**A**: USDT 和 USD 的市場類似，建議：
- 保守型：0.00005 - 0.001 (1.83% - 36.5% 年化)
- 激進型：0.0001 - 0.002 (3.65% - 73% 年化)

實際範圍會根據市場供需動態調整。

### Q: 切換幣種會影響歷史數據嗎？

**A**: 不會。數據庫按 `currency` 字段隔離，不同幣種的數據互不影響。

## 支援

遇到問題？請查看：
- [主 README](../README.md)
- [操作指南](OPERATION_GUIDE.md)
- [GitHub Issues](https://github.com/ImL1s/bitfinex-lending-bot/issues)

---

**最後更新**: 2025-10-23
**維護者**: @ImL1s
