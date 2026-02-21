# Hotfix: OpenedAt 顯示修復 (v2.1.6)

## 修復日期
2025-11-01

## 問題描述

### 問題 1：剩餘天數顯示為 '-'
**現象**：Web 界面「已提供 (Active Loans)」頁面中，所有貸款的剩餘天數都顯示為 '-'

**用戶影響**：
- 無法得知貸款何時到期
- 無法有效管理資金回收時間
- 影響資金規劃和策略調整

### 問題 2：缺少提供時間欄位
**現象**：Web 界面沒有顯示每筆貸款的開始時間

**用戶需求**：
- 需要知道每筆貸款何時提供
- 需要追蹤貸款的時間分布
- 需要評估貸款的時效性

## 根本原因分析

### 核心問題：API 數據解析欄位索引錯誤

#### Bitfinex Funding Credit 數據格式
```
[ID, SYMBOL, SIDE, MTS_CREATE, MTS_UPDATE, AMOUNT, FLAGS, STATUS, TYPE, nil, nil, RATE, PERIOD, MTS_OPENING, MTS_LAST_PAYOUT, ...]
 0    1       2     3           4           5       6      7       8     9   10   11    12      13           14
```

#### 錯誤的實現
**位置**：`internal/client/bitfinex.go`

1. **REST API - GetFundingCredits()** (L2307-2309)
   ```go
   if openedAt, ok := raw[6].(float64); ok {
       credit.OpenedAt = int64(openedAt)
   }
   ```
   - ❌ 使用 `raw[6]` 作為 OpenedAt
   - ❌ `raw[6]` 實際是 FLAGS（標誌位），不是時間戳
   - ❌ 導致 OpenedAt 總是 0

2. **REST API - GetFundingCreditsHistory()** (L2432-2434)
   - ❌ 同樣錯誤，使用 `raw[6]`

3. **WebSocket API - parseFundingCredit()** (L1275-1280)
   ```go
   if len(data) > 13 {
       if mtsOpening, ok := data[13].(float64); ok {
           fc.OpenedAt = int64(mtsOpening)
       }
   }
   ```
   - ✅ 正確使用 `data[13]`（MTS_OPENING）
   - ❌ 但缺少後備方案（如果 MTS_OPENING 為 0）

#### 為什麼 WebSocket 也會顯示 0？
即使 WebSocket 解析正確，Bitfinex 某些情況下 MTS_OPENING (index 13) 可能為 0：
- VAR 貸款可能沒有固定開始時間
- 歷史遷移的貸款可能缺少此欄位
- API 延遲更新

**需要後備方案**：使用 MTS_CREATE (index 3) 作為替代

## 修復方案

### 1. 修復 REST API 欄位索引

#### GetFundingCredits() (L2288-2339)
```go
// Fix: Use raw[13] for MTS_OPENING (not raw[6] which is FLAGS)
// Bitfinex format: [ID, SYMBOL, SIDE, MTS_CREATE, MTS_UPDATE, AMOUNT, FLAGS, STATUS, TYPE, nil, nil, RATE, PERIOD, MTS_OPENING, ...]
if len(raw) > 13 {
    if mtsOpening, ok := raw[13].(float64); ok && mtsOpening > 0 {
        credit.OpenedAt = int64(mtsOpening)
        logrus.Debugf("REST API: Credit ID=%s, OpenedAt=%d (from index 13)", credit.ID, credit.OpenedAt)
    }
}

// Fallback: If MTS_OPENING is 0, use MTS_CREATE (index 3) as approximation
if credit.OpenedAt == 0 && len(raw) > 3 {
    if mtsCreate, ok := raw[3].(float64); ok && mtsCreate > 0 {
        credit.OpenedAt = int64(mtsCreate)
        logrus.Debugf("REST API: Credit ID=%s, using MTS_CREATE=%d as OpenedAt fallback", credit.ID, credit.OpenedAt)
    }
}

// Parse Type for VAR/FIXED loans
if len(raw) > 8 {
    if creditType, ok := raw[8].(string); ok {
        credit.Type = creditType
    }
}
```

**關鍵改進**：
1. ✅ 修正索引：`raw[6]` → `raw[13]`
2. ✅ 添加非零檢查：`mtsOpening > 0`
3. ✅ 添加後備方案：使用 MTS_CREATE (index 3)
4. ✅ 添加調試日誌追蹤數據來源

#### GetFundingCreditsHistory() (L2434-2486)
- 同樣修復應用

### 2. 增強 WebSocket 解析

#### parseFundingCredit() (L1275-1289)
```go
// MTS_OPENING is at index 13
if len(data) > 13 {
    if mtsOpening, ok := data[13].(float64); ok && mtsOpening > 0 {
        fc.OpenedAt = int64(mtsOpening)
        logrus.Debugf("WebSocket: Credit ID=%s, OpenedAt=%d (from MTS_OPENING index 13)", fc.ID, fc.OpenedAt)
    }
}

// Fallback: If MTS_OPENING is 0, use MTS_CREATE (index 3) as approximation
if fc.OpenedAt == 0 && len(data) > 3 {
    if mtsCreate, ok := data[3].(float64); ok && mtsCreate > 0 {
        fc.OpenedAt = int64(mtsCreate)
        logrus.Debugf("WebSocket: Credit ID=%s, using MTS_CREATE=%d as OpenedAt fallback", fc.ID, fc.OpenedAt)
    }
}
```

**關鍵改進**：
1. ✅ 添加非零檢查
2. ✅ 添加後備方案（MTS_CREATE）
3. ✅ 增強調試日誌

### 3. 前端界面改進

#### 添加「提供時間」欄位 (web/templates/index.html L350-401)

**表頭添加**：
```html
html += '<th>提供時間</th>';
```

**數據格式化**：
```javascript
// 格式化提供時間
let openedAtStr = '-';
if (credit.OpenedAt && credit.OpenedAt > 0) {
    const openDate = new Date(credit.OpenedAt);
    const year = openDate.getFullYear();
    const month = String(openDate.getMonth() + 1).padStart(2, '0');
    const day = String(openDate.getDate()).padStart(2, '0');
    const hours = String(openDate.getHours()).padStart(2, '0');
    const minutes = String(openDate.getMinutes()).padStart(2, '0');
    openedAtStr = `${year}-${month}-${day} ${hours}:${minutes}`;
}
```

**顯示樣式**：
```javascript
html += `<td style="font-size: 0.9em; color: #a8b2d1;">${openedAtStr}</td>`;
```

**剩餘天數計算修正**：
```javascript
// 計算剩餘天數（增加 > 0 檢查）
let remainingDays = '-';
if (credit.OpenedAt && credit.OpenedAt > 0 && credit.Period) {
    const openDate = new Date(credit.OpenedAt);
    const now = new Date();
    const daysPassed = Math.floor((now - openDate) / (1000 * 60 * 60 * 24));
    const remaining = credit.Period - daysPassed;
    remainingDays = remaining > 0 ? `${remaining} 天` : '即將到期';
}
```

**新表格結構**：
```
| ID | 金額 | 日利率 | 年化 | 提供時間 | 期間 | 剩餘天數 | 狀態 |
```

### 4. 增強調試日誌

#### parseFundingCredit() (L1307-1315)
```go
// Enhanced debug logging with OpenedAt timestamp
if fc.OpenedAt > 0 {
    openTime := time.Unix(fc.OpenedAt/1000, 0)
    logrus.Debugf("Parsed funding credit: ID=%s, Type=%s, Amount=%.2f, Rate=%.8f, Period=%d days, OpenedAt=%s",
        fc.ID, fc.Type, fc.Amount, fc.Rate, fc.Period, openTime.Format("2006-01-02 15:04:05"))
} else {
    logrus.Warnf("Parsed funding credit: ID=%s, Type=%s, Amount=%.2f, Rate=%.8f, Period=%d days, OpenedAt=0 (MISSING)",
        fc.ID, fc.Type, fc.Amount, fc.Rate, fc.Period)
}
```

## 修復後的效果

### 後端改進
1. ✅ **REST API**：正確解析 OpenedAt（從 index 13）
2. ✅ **WebSocket**：添加 MTS_CREATE 後備方案
3. ✅ **調試能力**：詳細日誌追蹤數據來源和時間戳

### 前端改進
1. ✅ **新欄位**：顯示「提供時間」（格式：2025-10-31 15:30）
2. ✅ **剩餘天數**：正確計算和顯示（例如：「2 天」、「即將到期」）
3. ✅ **容錯性**：優雅處理 OpenedAt = 0 的情況（顯示 '-'）

## 測試驗證

### 1. 檢查調試日誌
```bash
# 重新編譯並運行
go build -o lending-bot cmd/bot/main.go
./lending-bot

# 查看日誌中的 OpenedAt 解析
# 應該看到：
# - "REST API: Credit ID=xxx, OpenedAt=1730123456789 (from index 13)"
# - "WebSocket: Credit ID=xxx, OpenedAt=1730123456789 (from MTS_OPENING index 13)"
# - 或後備方案：
# - "REST API: Credit ID=xxx, using MTS_CREATE=1730123456789 as OpenedAt fallback"
```

### 2. 檢查 Web 界面
```bash
# 訪問
open http://localhost:8090

# 驗證「已提供 (Active Loans)」頁面：
# ✅ 提供時間欄位顯示正確日期時間
# ✅ 剩餘天數顯示正確天數（不是 '-'）
# ✅ 表格格式整齊美觀
```

### 3. 驗證 API 響應
```bash
# 檢查 JSON 數據
curl http://localhost:8090/api/credits | jq '.[0].OpenedAt'

# 應該返回一個大於 0 的時間戳（毫秒）
# 例如：1730123456789
```

## 技術細節

### 時間戳格式
- Bitfinex API 返回：**毫秒級 Unix 時間戳**（13 位數字）
- Go 處理：`int64` 類型，直接存儲毫秒時間戳
- JavaScript 處理：`new Date(milliseconds)` 自動解析
- 顯示格式：`YYYY-MM-DD HH:MM`（24 小時制）

### 數據流程
```
Bitfinex API
    ↓
    ├─ REST API → GetFundingCredits() → raw[13] (MTS_OPENING)
    │                                   └─ Fallback: raw[3] (MTS_CREATE)
    │
    └─ WebSocket → parseFundingCredit() → data[13] (MTS_OPENING)
                                          └─ Fallback: data[3] (MTS_CREATE)
    ↓
Go FundingCredit.OpenedAt (int64)
    ↓
JSON API /api/credits
    ↓
JavaScript credit.OpenedAt
    ↓
Web 界面顯示：
    - 提供時間：2025-10-31 15:30
    - 剩餘天數：2 天
```

## 代碼變更文件

### 後端
- `internal/client/bitfinex.go`
  - L1275-1289: WebSocket 解析增強
  - L1307-1315: 調試日誌增強
  - L2288-2339: REST API GetFundingCredits() 修復
  - L2434-2486: REST API GetFundingCreditsHistory() 修復

### 前端
- `web/templates/index.html`
  - L350-401: Active Credits 表格重構

## 相關問題修復歷史

### v2.1.5 (2025-10-31)
- 修復 funding 市場交易訊息接收問題

### v2.1.4 (2025-10-31)
- WebSocket 重連後自動重新訂閱頻道

### v2.1.3 (2025-10-30)
- 修復 TOCTOU 競爭條件

### v2.1.2 (2025-10-30)
- 完整修復重複通知問題

### v2.1.1 (2025-10-30)
- 修復 handleFundingUpdate 幣種驗證

### v2.1 (2025-10-30)
- 修復 handleFundingTradeExecuted 重複通知

## 後續建議

### 監控
1. 持續觀察日誌中是否有 "OpenedAt=0 (MISSING)" 警告
2. 統計多少貸款使用後備方案（MTS_CREATE）
3. 追蹤是否所有貸款都有正確的時間戳

### 優化
1. 如果大量使用 MTS_CREATE 後備方案，考慮調查 Bitfinex API 行為
2. 可能需要向 Bitfinex 提交 ticket 詢問 MTS_OPENING 為 0 的情況

### 文檔
1. 更新 README.md 說明新增的「提供時間」欄位
2. 更新 CHANGELOG.md 記錄 v2.1.6 版本變更

---

**修復完成日期**：2025-11-01
**版本號**：v2.1.6
**測試狀態**：待驗證
**影響範圍**：Web 界面、REST API、WebSocket 解析
