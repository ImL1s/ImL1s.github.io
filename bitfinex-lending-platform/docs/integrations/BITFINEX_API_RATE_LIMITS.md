# Bitfinex API Rate Limits & WS Funding Operations

> Verified against live Bitfinex API on 2026-02-19. Cross-referenced with official docs.

## REST API Rate Limits

| 項目 | 值 | 來源 |
|------|-----|------|
| Rate limit | 10-90 req/min | [官方文檔](https://docs.bitfinex.com/docs/requirements-and-limitations) |
| 限制對象 | **Per IP address** | 官方文檔 |
| 封鎖時間 | 60 秒 | 官方文檔 |
| 錯誤回應 | `{"error": "ERR_RATE_LIMIT"}` 或 HTTP 429 | 官方文檔 + 實測 |
| 跨 API key | 共用（同 IP 計數） | Mock 測試驗證 |

## WebSocket Rate Limits

| 項目 | 值 | 來源 |
|------|-----|------|
| Auth 連線建立 | 5 conn / 15s | [官方文檔](https://docs.bitfinex.com/docs/ws-auth) |
| Public 連線建立 | 20 conn / min | 官方文檔 |
| Channel 訂閱 | 25 / connection | 官方文檔 |
| `calc` 計算 | 8/sec/client, 30/batch | 官方文檔 changelog |
| `fon`/`foc` per-msg | **無已知限制**（文檔未提及） | 文檔缺失 |
| Trading orders | ~500/10min（非官方） | StackOverflow 2018 |
| WS vs REST | **完全獨立**（不互相消耗配額） | 真實 API 測試驗證 |

## WS Funding Offer Operations

### New Offer (`fon`)
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

**回應 (notification)**:
```json
[0, "n", [MTS, "fon-req", null, null, [ID, SYMBOL, ...], null, "SUCCESS", "Submitting funding offer..."]]
```

**回應 (offer event)**:
```json
[0, "fon", [ID, "fUSD", MTS_CREATED, MTS_UPDATED, AMOUNT, AMOUNT_ORIG, "LIMIT", null, null, FLAGS, "ACTIVE", ...]]
```

### Cancel Offer (`foc`)
```json
[0, "foc", null, {"id": 12345}]
```

### Offer Types
- `LIMIT` — 固定利率
- `FRRDELTAVAR` — FRR 浮動偏移
- `FRRDELTAFIX` — FRR 固定偏移

## Funding Constraints

| 項目 | 值 | 來源 |
|------|-----|------|
| 最低金額 | **$150 USD** 或等值 | 官方文檔 + API 錯誤回應 |
| 最短天數 | 2 天 | 官方文檔 |
| 最長天數 | 120 天 | 官方文檔 |
| Amount 正 | 出借 (offer) | 官方文檔 |
| Amount 負 | 借入 (bid) | 官方文檔 |

## WS Auth

### 連線流程
1. `websocket.Dial("wss://api.bitfinex.com/ws/2")`
2. 讀取 `{"event":"info","version":2,...}`
3. 發送 auth payload（apiKey, authSig, authNonce, authPayload）
4. 等待 `{"event":"auth","status":"OK"}`
5. 接收 snapshot 訊息（ps, ws, os, fos, fcs, fls, wu, ...）
6. 開始發送 inputs（fon, foc, on, oc, ...）

### Auth Payload
```go
nonce := strconv.FormatInt(time.Now().UnixMicro(), 10)
authPayload := "AUTH" + nonce
sig := hmac.New(sha512.New384, []byte(apiSecret))
sig.Write([]byte(authPayload))
signature := hex.EncodeToString(sig.Sum(nil))
```

### Channel Filters（可選）
```json
{"event": "auth", ..., "filter": ["funding", "wallet", "notify"]}
```

## Nonce 管理
- 每個 API key 獨立 nonce（嚴格遞增）
- 多連線需使用不同 API key
- REST 和 WS 共用 nonce 空間 → 同 key 不可混用

## 容量估算

### 目前（REST-only funding ops）
- ~9-22 bots per IP（45 REST req/min ÷ 2-5 req/bot/min）

### 遷移 WS 後
- WS `fon` 無已知 per-msg limit
- 保守估計 ~10 fon/sec = 600/min
- 每 bot ~2-3 offers/min → **~200-300 bots per WS connection**
- 10K WS connections per server → **~1,000-5,000 bots**
- REST 保留用於 wallet/market data 查詢

## 相關測試

| 檔案 | 內容 |
|------|------|
| `internal/client/ratelimit_claims_test.go` | 6 個 mock 驗證測試 |
| `internal/client/ratelimit_e2e_test.go` | E2E mock server 測試 |
| `internal/client/ratelimit_global_test.go` | GlobalRateLimiter 單元測試 |
| `scripts/verify_ws_funding.go` | 真實 Bitfinex API 驗證腳本 |
