# v2.1.6 修復總結：OpenedAt 顯示問題

## 修復概述

**版本**：v2.1.6
**日期**：2025-11-01
**修復內容**：已提供貸款的剩餘天數和提供時間顯示

---

## 問題分析

### 核心問題
**Bitfinex API 欄位索引錯誤導致 OpenedAt 始終為 0**

```
Bitfinex 數據格式：
[ID, SYMBOL, SIDE, MTS_CREATE, MTS_UPDATE, AMOUNT, FLAGS, STATUS, TYPE, nil, nil, RATE, PERIOD, MTS_OPENING, ...]
 0    1       2     3           4           5       6      7       8     9   10   11    12      13
```

### 錯誤代碼
```go
// ❌ 錯誤：使用 raw[6] (FLAGS)
if openedAt, ok := raw[6].(float64); ok {
    credit.OpenedAt = int64(openedAt)
}
```

### 正確代碼
```go
// ✅ 正確：使用 raw[13] (MTS_OPENING)
if len(raw) > 13 {
    if mtsOpening, ok := raw[13].(float64); ok && mtsOpening > 0 {
        credit.OpenedAt = int64(mtsOpening)
    }
}

// ✅ 後備方案：使用 raw[3] (MTS_CREATE)
if credit.OpenedAt == 0 && len(raw) > 3 {
    if mtsCreate, ok := raw[3].(float64); ok && mtsCreate > 0 {
        credit.OpenedAt = int64(mtsCreate)
    }
}
```

---

## 修復範圍

### 後端修改

#### 1. REST API - GetFundingCredits()
**文件**：`internal/client/bitfinex.go` (L2288-2339)

**改進**：
- ✅ 修正索引：`raw[6]` → `raw[13]`
- ✅ 添加非零驗證：`mtsOpening > 0`
- ✅ 添加後備方案：MTS_CREATE (index 3)
- ✅ 解析 Type 欄位（VAR/FIXED）
- ✅ 添加調試日誌

#### 2. REST API - GetFundingCreditsHistory()
**文件**：`internal/client/bitfinex.go` (L2434-2486)

**改進**：同 GetFundingCredits()

#### 3. WebSocket - parseFundingCredit()
**文件**：`internal/client/bitfinex.go` (L1275-1289)

**改進**：
- ✅ 添加非零驗證
- ✅ 添加 MTS_CREATE 後備方案
- ✅ 增強調試日誌

#### 4. 調試日誌增強
**文件**：`internal/client/bitfinex.go` (L1307-1315)

**改進**：
- ✅ 時間戳格式化顯示
- ✅ OpenedAt=0 警告日誌
- ✅ 數據來源追蹤（index 13 或 index 3）

### 前端修改

#### 1. Active Credits 表格重構
**文件**：`web/templates/index.html` (L350-401)

**新增功能**：
- ✅ 「提供時間」欄位（格式：2025-10-31 15:30）
- ✅ 時間格式化函數
- ✅ OpenedAt > 0 驗證
- ✅ 剩餘天數計算修正

**新表格結構**：
```
| ID | 金額 | 日利率 | 年化 | 提供時間 | 期間 | 剩餘天數 | 狀態 |
```

---

## 代碼變更摘要

### 文件修改列表
```
internal/client/bitfinex.go
  - L1275-1289  : WebSocket OpenedAt 解析增強
  - L1307-1315  : 調試日誌增強
  - L2288-2339  : REST GetFundingCredits() 修復
  - L2434-2486  : REST GetFundingCreditsHistory() 修復

web/templates/index.html
  - L350-401    : Active Credits 表格重構
```

### 新增文件
```
docs/FIX_OPENED_AT_DISPLAY_v2.1.6.md  - 詳細修復文檔
docs/SUMMARY_v2.1.6_FIX.md            - 修復總結（本文件）
scripts/test_opened_at_fix.sh          - 測試腳本
```

---

## 測試指引

### 1. 編譯程序
```bash
go build -o lending-bot cmd/bot/main.go
```

### 2. 運行 Bot
```bash
./lending-bot
```

### 3. 檢查日誌
尋找以下關鍵日誌訊息：

**成功解析**：
```
REST API: Credit ID=12345, OpenedAt=1730123456789 (from index 13)
WebSocket: Credit ID=12345, OpenedAt=1730123456789 (from MTS_OPENING index 13)
Parsed funding credit: ID=12345, Type=FIXED, Amount=100.00, Rate=0.00020000, Period=7 days, OpenedAt=2025-10-31 15:30:00
```

**使用後備方案**：
```
REST API: Credit ID=12345, using MTS_CREATE=1730123456789 as OpenedAt fallback
WebSocket: Credit ID=12345, using MTS_CREATE=1730123456789 as OpenedAt fallback
```

**異常情況**：
```
Parsed funding credit: ID=12345, Type=FIXED, Amount=100.00, Rate=0.00020000, Period=7 days, OpenedAt=0 (MISSING)
```
> 如果看到此警告，表示 Bitfinex API 沒有提供 MTS_OPENING 和 MTS_CREATE

### 4. 驗證 API 響應
```bash
curl http://localhost:8090/api/credits | jq '.[0] | {ID, OpenedAt, Period}'
```

**預期輸出**：
```json
{
  "ID": "12345",
  "OpenedAt": 1730123456789,
  "Period": 7
}
```

**驗證**：
- ✅ `OpenedAt` 應該是 13 位數字（毫秒時間戳）
- ✅ `OpenedAt` 應該 > 0
- ❌ 如果 `OpenedAt` = 0，表示修復未生效

### 5. 驗證 Web 界面
訪問 http://localhost:8090

**檢查「已提供 (Active Loans)」頁面**：

| 檢查項目 | 預期結果 | 異常結果 |
|---------|---------|---------|
| 提供時間欄位 | 顯示日期時間（如：2025-10-31 15:30） | 顯示 '-' |
| 剩餘天數欄位 | 顯示天數（如：2 天） | 顯示 '-' |
| 表格格式 | 8 列整齊排列 | 欄位錯位或缺失 |

### 6. 運行測試腳本（可選）
```bash
./scripts/test_opened_at_fix.sh
```

---

## 預期效果

### 修復前
```
已提供 (Active Loans)
| ID    | 金額      | 日利率   | 年化        | 期間  | 剩餘天數 | 狀態   |
|-------|-----------|---------|------------|-------|---------|--------|
| 12345 | $100.00   | 0.0200% | 7.30% / ... | 7 天  | -       | ACTIVE |
```

### 修復後
```
已提供 (Active Loans)
| ID    | 金額      | 日利率   | 年化        | 提供時間            | 期間  | 剩餘天數 | 狀態   |
|-------|-----------|---------|------------|-------------------|-------|---------|--------|
| 12345 | $100.00   | 0.0200% | 7.30% / ... | 2025-10-31 15:30 | 7 天  | 2 天    | ACTIVE |
```

---

## 技術細節

### 時間戳處理

**Bitfinex 時間戳格式**：
- 毫秒級 Unix 時間戳（13 位數字）
- 例如：`1730123456789` = 2025-10-31 15:30:56.789

**Go 處理**：
```go
fc.OpenedAt = int64(mtsOpening)  // 直接存儲毫秒時間戳
```

**JavaScript 處理**：
```javascript
const openDate = new Date(credit.OpenedAt);  // 自動解析毫秒時間戳
```

**顯示格式化**：
```javascript
const year = openDate.getFullYear();
const month = String(openDate.getMonth() + 1).padStart(2, '0');
const day = String(openDate.getDate()).padStart(2, '0');
const hours = String(openDate.getHours()).padStart(2, '0');
const minutes = String(openDate.getMinutes()).padStart(2, '0');
openedAtStr = `${year}-${month}-${day} ${hours}:${minutes}`;
// 結果：2025-10-31 15:30
```

### 數據流程圖

```
Bitfinex API
    ↓
    ├─ REST /v2/auth/r/funding/credits/fUSD
    │  └─ GetFundingCredits()
    │     └─ raw[13] (MTS_OPENING) ✅
    │        └─ Fallback: raw[3] (MTS_CREATE)
    │
    └─ WebSocket fcs Channel
       └─ parseFundingCredit()
          └─ data[13] (MTS_OPENING) ✅
             └─ Fallback: data[3] (MTS_CREATE)
    ↓
Go FundingCredit Struct
    OpenedAt: int64 (毫秒時間戳)
    ↓
JSON API /api/credits
    ↓
JavaScript
    credit.OpenedAt
    ↓
Web UI
    - 提供時間：2025-10-31 15:30
    - 剩餘天數：2 天
```

---

## 常見問題 (FAQ)

### Q1: 為什麼需要後備方案（MTS_CREATE）？
**A1**：某些情況下 Bitfinex API 的 MTS_OPENING (index 13) 可能為 0：
- VAR 貸款可能沒有固定開始時間
- 歷史遷移的貸款缺少此欄位
- API 延遲更新

使用 MTS_CREATE (index 3) 作為替代可以確保至少有一個時間戳。

### Q2: MTS_CREATE 和 MTS_OPENING 有什麼區別？
**A2**：
- **MTS_CREATE** (index 3): 貸款訂單創建時間
- **MTS_OPENING** (index 13): 貸款實際開始生息時間

理想情況使用 MTS_OPENING，但如果為 0 則使用 MTS_CREATE 作為近似值。

### Q3: 如果看到 "OpenedAt=0 (MISSING)" 警告怎麼辦？
**A3**：
1. 檢查 Bitfinex API 狀態
2. 等待 5-10 分鐘後重試
3. 如果持續出現，可能是特殊貸款類型（如超長期貸款）
4. 建議向 Bitfinex 支持提交 ticket

### Q4: 前端顯示 '-' 但後端 OpenedAt > 0？
**A4**：
1. 清除瀏覽器緩存
2. 硬性刷新頁面（Cmd+Shift+R）
3. 檢查 JavaScript 控制台錯誤
4. 確認模板文件已重新編譯（Go 使用 embed）

### Q5: 如何驗證修復是否生效？
**A5**：最簡單的方法：
```bash
curl http://localhost:8090/api/credits | jq '.[].OpenedAt'
```
所有輸出應該 > 0，如果有 0 則檢查日誌。

---

## 相關版本歷史

- **v2.1.6** (2025-11-01) - 修復 OpenedAt 顯示問題（本版本）
- **v2.1.5** (2025-10-31) - 修復 funding 市場交易訊息接收
- **v2.1.4** (2025-10-31) - WebSocket 重連自動重新訂閱
- **v2.1.3** (2025-10-30) - 修復 TOCTOU 競爭條件
- **v2.1.2** (2025-10-30) - 完整修復重複通知問題
- **v2.1.1** (2025-10-30) - 修復 handleFundingUpdate 幣種驗證
- **v2.1** (2025-10-30) - 修復 handleFundingTradeExecuted 重複通知

---

## 後續建議

### 監控項目
1. **日誌監控**：觀察是否有 "OpenedAt=0 (MISSING)" 警告
2. **統計分析**：追蹤多少貸款使用後備方案（MTS_CREATE）
3. **數據完整性**：確保所有貸款都有有效時間戳

### 可能優化
1. 如果大量使用 MTS_CREATE，考慮調查 Bitfinex API 行為
2. 添加 Prometheus 指標追蹤 OpenedAt 數據來源分布
3. 考慮添加管理界面手動修正異常時間戳

### 文檔更新
- [ ] 更新 README.md 說明新增的「提供時間」欄位
- [ ] 更新 CHANGELOG.md 記錄 v2.1.6 變更
- [ ] 更新 OPERATION_GUIDE.md 添加時間欄位說明

---

**修復完成**：2025-11-01
**狀態**：✅ 代碼已修復，待編譯測試
**影響範圍**：Web 界面、REST API、WebSocket 解析
**測試狀態**：待用戶驗證

---

## 快速啟動命令

```bash
# 1. 編譯
go build -o lending-bot cmd/bot/main.go

# 2. 運行
./lending-bot

# 3. 驗證（新終端）
curl http://localhost:8090/api/credits | jq '.[0] | {ID, OpenedAt, Period}'

# 4. 查看 Web 界面
open http://localhost:8090
```

**檢查點**：
- ✅ OpenedAt > 0
- ✅ 提供時間顯示為日期格式
- ✅ 剩餘天數顯示為數字
- ✅ 日誌無 "OpenedAt=0 (MISSING)" 警告

---

**End of Document**
