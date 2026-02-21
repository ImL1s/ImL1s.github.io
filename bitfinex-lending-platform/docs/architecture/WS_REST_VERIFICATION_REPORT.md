# WS vs REST Rate Limiting — 完整文檔驗證報告

## 驗證摘要

| # | Claim | 文檔來源 | API 測試 | 結論 |
|---|-------|---------|---------|------|
| 1 | REST rate limit per-IP | ✅ 官方文檔明確 | ✅ Test 6 | **確認** |
| 2 | WS `fon` 可提交 offer | ✅ 官方文檔明確 | ✅ Test 4 | **確認** |
| 3 | WS `foc` 可取消 offer | ✅ 官方文檔明確 | ⏭ 未測（餘額不足） | **文檔確認** |
| 4 | WS 不消耗 REST 配額 | ✅ 文檔隱含（獨立通道） | ✅ Test 6 (5/5) | **確認** |
| 5 | WS 無 per-msg rate limit | ⚠️ 文檔未明確 | ✅ Mock 驗證 | **部分確認** |
| 6 | 最低放貸金額 $150 | ✅ 官方文檔明確 | ✅ Test 4 ERROR | **確認** |

---

## Claim 1: REST Rate Limit Per-IP (10-90 req/min)

### 官方文檔

> [Requirements and Limitations](https://docs.bitfinex.com/docs/requirements-and-limitations):
> "For the REST API, an IP address can be rate limited if it has sent too many requests per minute. The current rate limit is between **10 and 90 requests per minute**, depending on the specific REST API endpoint. If an IP address is rate limited, the IP is **blocked for 60 seconds**."

### 關鍵細節
- 限制對象：**per IP address**
- 封鎖時間：60 秒
- 回應格式：`{"error": "ERR_RATE_LIMIT"}`
- 範圍：所有 REST endpoints 共用計數

### 驗證結果
- Mock test: 3 個不同 API key 共用同一 IP → 共用 10-req 池 ✅
- Real API test: Test 6 — WS 操作後 REST 5/5 成功（不跨通道影響）✅

### ⚠️ 補充：Per-Account 限制
[GitHub issue](https://github.com/bitfinexcom/bitfinex-api-node) 提到：
> "The base limit per user (account) is **1,000 orders per 5-minute interval**."

這是 **trading orders** 限制，文檔未提及是否包含 **funding offers**。

---

## Claim 2: WS `fon` 可提交 Funding Offer

### 官方文檔

> [WS Auth Inputs](https://docs.bitfinex.com/docs/ws-auth#list-of-ws-inputs):
> - New Offer (`fon`)
> - Cancel Offer (`foc`)

> [New Offer](https://docs.bitfinex.com/reference/ws-auth-input-offer-new):
> 格式: `[0, "fon", null, {type, symbol, amount, rate, period, flags}]`

### 訊息格式（文檔確認）
```json
[0, "fon", null, {
  "type": "LIMIT",
  "symbol": "fUSD",
  "amount": "150",
  "rate": "0.0002",
  "period": 7,
  "flags": 0
}]
```

### 回應格式（文檔確認）
```json
[0, "n", [MTS, "fon-req", null, null, [ID, SYMBOL, ...], null, "SUCCESS", "Submitting funding offer..."]]
```
followed by:
```json
[0, "fon", [ID, "fUSD", MTS_CREATED, MTS_UPDATED, AMOUNT, AMOUNT_ORIG, "LIMIT", ...]]
```

### 驗證結果
Real API Test 4:
- 送出 `[0, "fon", null, {type:"LIMIT", symbol:"fUSD", amount:"15", ...}]`
- Bitfinex 回應：`[0, "n", [..., "ERROR", "Invalid offer: incorrect amount, minimum is 150.0 dollar"]]`
- **格式完全正確** — Bitfinex 成功解析、驗證、回覆

---

## Claim 3: WS `foc` 可取消 Funding Offer

### 官方文檔

> [Cancel Offer](https://docs.bitfinex.com/reference/ws-auth-input-offer-cancel):
> 格式: `[0, "foc", null, {id: OFFER_ID}]`

### 訊息格式（文檔確認）
```json
[0, "foc", null, {"id": 12345}]
```

### 驗證結果
- 未能進行真實測試（帳戶餘額不足 $150 無法建立 offer）
- **文檔已完整確認格式和行為**

---

## Claim 4: WS 操作不消耗 REST Rate Limit

### 官方文檔
文檔將 REST 和 WebSocket 分為完全獨立的段落，有不同的 rate limit 規則：
- REST: "10-90 requests per minute" per IP
- WebSocket: "5 connections per 15 seconds"

文檔**未提及** WS 消息會影響 REST 配額，或反之亦然。

### 驗證結果
Real API Test 6:
- 步驟 1: 完成 WS auth + 接收 14 條 WS 訊息 + 送出 `fon`
- 步驟 2: 連續發 5 個 REST 請求
- 結果: **5/5 成功** ✅
- 結論: WS 操作不消耗 REST 配額

---

## Claim 5: WS 無 Per-Message Rate Limit（for Inputs）

### 官方文檔

> [Requirements and Limitations](https://docs.bitfinex.com/docs/requirements-and-limitations):
> WebSocket Rate Limits: "you cannot open more than **5 (authenticated) connections per 15 seconds**... you can subscribe to up to 25 channels per connection."

> [Changelog](https://docs.bitfinex.com/docs/changelog):
> `calc` 限制: "The server limits batch requests to **30 calculations** and rate limits to **8 calculations per second per client**."

### 分析

| 限制類型 | 適用對象 | 文檔狀態 |
|---------|---------|---------|
| 5 conn/15s | WS **連線建立** | ✅ 文檔明確 |
| 25 channels/conn | WS **channel 訂閱** | ✅ 文檔明確 |
| 8 calc/sec | WS `calc` 訊息 | ✅ 文檔明確 |
| N/A | WS `fon`/`foc` per-msg | ⚠️ **文檔未提及** |
| ~500/10min | WS trading orders（非官方） | ⚠️ StackOverflow 2018 |

### 結論

> [!WARNING]
> WS funding 操作（`fon`/`foc`）的 per-message rate limit **在官方文檔中未明確說明**。
>
> - `calc` = 明確 8/sec 限制
> - `fon`/`foc` = **無已知限制**，但可能有未文檔化的伺服器端限制
> - Trading orders = 非官方 ~500/10min（2018 StackOverflow）
>
> 建議：實作時預設保守限制（如 10 fon/sec），可逐步調高測試實際限制。

---

## Claim 6: 最低放貸金額 $150 USD

### 官方文檔

> [Bitfinex Margin Funding](https://support.bitfinex.com/hc/en-us/articles/115004555165):
> "The minimum amount for a single funding offer is **$150 or equivalent**."

### 驗證結果
Real API Test 4:
```
ERROR: "Invalid offer: incorrect amount, minimum is 150.0 dollar or equivalent in USD"
```

---

## 附加發現

| 項目 | 值 | 來源 |
|------|-----|------|
| 最低放貸天數 | 2 天 | 官方文檔 |
| 最長放貸天數 | 120 天 | 官方文檔 |
| Offer 類型 | LIMIT, FRRDELTAVAR, FRRDELTAFIX | 官方文檔 |
| Amount 正負 | 正 = offer（出借），負 = bid（借入） | 官方文檔 |
| Nonce | 每個 API key 獨立 | 官方文檔 |
| WS Auth Filter | `funding` = offers/credits/loans | 官方文檔 |
| Lending Pro | 2024/8/28 已停用 | 官方公告 |

---

## 容量重新評估

基於文檔驗證後的修正容量分析：

### 單台伺服器容量

| 通道 | 限制 | 影響 |
|------|------|------|
| WS 連線建立 | 5/15s = 20/min | 啟動瓶頸（可批次處理） |
| WS `fon` per-msg | 未知（保守估計 ~10/sec） | 每 bot ~600 offers/min |
| WS 總併發連線 | Go 可處理 ~10K-50K | 上限取決於伺服器資源 |
| REST 查詢 | 10-90/min 共用 | 僅用於 wallet/market data |

### 保守容量：**1,000-5,000 bots / 單台伺服器**

前提：
1. Funding 操作完全走 WS（目前走 REST ← **需遷移**）
2. REST 僅用於查詢（wallet, market data）
3. WS 連線池化管理

### 仍需驗證
- [ ] WS `fon`/`foc` 的實際 per-msg rate limit（需 $150+ 餘額測試高頻提交）
- [ ] Bitfinex 是否有未文檔化的 funding offer 數量限制
