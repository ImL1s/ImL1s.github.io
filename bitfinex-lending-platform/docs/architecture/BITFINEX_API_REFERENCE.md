# Bitfinex API Funding/Lending 官方文檔整理

> 最後更新：2025-12-17
> 來源：https://docs.bitfinex.com

## 1. REST API Funding 端點總覽

| 端點 | HTTP 方法 | 功能 | 速率限制 |
|------|---------|------|---------|
| `/v2/auth/r/funding/offers/{symbol}` | POST | 獲取活躍的 funding offers | 90 req/min |
| `/v2/auth/r/funding/loans/{symbol}` | POST | 獲取活躍的 funding loans | 90 req/min |
| `/v2/auth/r/funding/credits/{symbol}` | POST | 獲取 funding credits | 90 req/min |
| `/v2/auth/r/info/funding` | POST | 獲取帳戶 funding 資訊 | 90 req/min |
| `/v2/auth/w/funding/offer/submit` | POST | 提交新的 funding offer | 90 req/min |
| `/v2/auth/w/funding/offer/cancel` | POST | 取消 funding offer | 90 req/min |
| `/v2/auth/w/funding/offer/cancel/all` | POST | 取消所有 funding offers | 90 req/min |
| `/v2/public/funding/stats/{key}/{symbol}` | GET | 獲取 funding statistics (FRR, 平均週期等) | 90 req/min |

**基域名：**
- 認證端點: `https://api.bitfinex.com/v2/`
- 公開端點: `https://api-pub.bitfinex.com/v2/`

---

## 2. Funding Offer 類型 (Order Types)

### 2.1 LIMIT
- **說明：** 固定利率的 funding offer
- **參數：** 指定具體的 `rate` 值（百分比十進制表示，如 0.01 = 1%）
- **特點：** 固定利率，不會自動調整

### 2.2 FRRDELTAFIX
- **說明：** 相對於 FRR（Flash Return Rate）的固定增量
- **參數：** `rate` = FRR + offset（可以是正或負）
- **行為：**
  - 在 order 匹配前，利率自動跟隨 FRR 變化
  - 匹配後，利率變為固定（不再更新）
- **用例：** 希望相對市場率有固定增量的情況

### 2.3 FRRDELTAVAR
- **說明：** 相對於 FRR 的動態變量利率
- **參數：** `rate` = FRR + offset（只允許正 offset，即 ≥ 0）
- **行為：**
  - 匹配前後都自動跟隨 FRR 變化
  - 即使成交後，利率仍會持續調整
- **用例：** 希望始終保持相對 FRR 固定增量的情況

### 2.4 FRR（Flash Return Rate）直接使用
- **設置方式：** 使用 `FRRDELTAVAR` 類型，`rate` 設為 0
- **說明：** 完全跟隨 FRR，無任何增量

---

## 3. Rate (利率) 和 Period (週期) 的限制

| 參數 | 最小值 | 最大值 | 備註 |
|------|------|------|------|
| **Rate** | - | - | 十進制百分比表示（0.01 = 1%）；無絕對上下限但受市場約束 |
| **Period** | 2 天 | 120 天 | 借貸期限 |
| **最小金額** | $150 USD | - | 或等值的其他幣種 |

### 重要匹配規則：
- **Bid 和 Offer 必須同時滿足：**
  - Rate 相同
  - Period 相同或 Offer Period ≥ Bid Period
  - 固定利率 Bid/Offer 不能與 FRR Offer/Bid 匹配

---

## 4. WebSocket Funding Channels

### 4.1 授權後自動訂閱的頻道

連接認證後，會自動訂閱帳戶資訊頻道（CHANNEL_ID = 0），包含所有：
- Funding offers
- Funding credits
- Funding loans
- Funding trades
- 帳戶餘額
- 訂單和頭寸

### 4.2 Funding Offer 消息類型

| 縮寫 | 全名 | 說明 |
|------|------|------|
| **fos** | Funding Offers Snapshot | 初始快照 |
| **fon** | Funding Offer New | 新 offer 創建 |
| **fou** | Funding Offer Update | offer 更新 |
| **foc** | Funding Offer Cancel | offer 取消或完成 |

### 4.3 Funding Credits 消息類型

| 縮寫 | 全名 | 說明 |
|------|------|------|
| **fcs** | Funding Credits Snapshot | 初始快照 |
| **fcn** | Funding Credits New | 新 credit |
| **fcu** | Funding Credits Update | credit 更新 |
| **fcc** | Funding Credits Close | credit 關閉 |

### 4.4 Funding Loans 消息類型

| 縮寫 | 全名 | 說明 |
|------|------|------|
| **fls** | Funding Loans Snapshot | 初始快照 |
| **fln** | Funding Loans New | 新 loan |
| **flu** | Funding Loans Update | loan 更新 |
| **flc** | Funding Loans Close | loan 關閉 |

### 4.5 WebSocket 連接限制

| 限制項 | 值 |
|------|-----|
| 認證連接（api.bitfinex.com） | 5 個 / 15 秒 |
| 公開連接（api-pub.bitfinex.com） | 20 個 / 分鐘 |
| 單連接頻道數 | 最多 25 個 |
| 超限後的限制時間 | 15-60 秒 |

---

## 5. Funding Offer 數據結構

### WebSocket Funding Offer 消息字段（陣列格式）

| 位置 | 字段名稱 | 說明 | 類型 |
|------|-----------|---------|--------|
| 0 | ID | Offer ID | Integer |
| 1 | SYMBOL | 幣種符號（如 fUSD, fBTC） | String |
| 2 | MTS_CREATED | 創建時間戳（毫秒） | Long |
| 3 | MTS_UPDATED | 更新時間戳（毫秒） | Long |
| 4 | AMOUNT | 當前金額 | Decimal |
| 5 | AMOUNT_ORIG | 原始金額 | Decimal |
| 6 | OFFER_TYPE | 類型（LIMIT, FRRDELTAFIX, FRRDELTAVAR） | String |
| 7 | FLAGS | 標誌位 | Integer |
| 8 | STATUS | 狀態（ACTIVE, EXECUTED, PARTIALLY FILLED, CANCELED） | String |
| 9 | RATE | 利率（十進制百分比） | Decimal |
| 10 | PERIOD | 借貸週期（天） | Integer |
| 11 | NOTIFY | 通知標誌（0/1） | Integer |
| 12 | HIDDEN | 隱藏標誌（0/1） | Integer |
| 13 | RENEW | 自動續期標誌（0/1） | Integer |

---

## 6. Offer 標誌 (Flags)

### 支援的 Funding Offer 標誌

| 標誌名稱 | 值 | 說明 | 支援的位置 |
|---------|-----|------|-----------|
| **Hidden** | 64 | 不在 offer book 中顯示 | Offers/Orders |
| **Post Only** | 4096 | 確保 offer 加入 order book 而非立即成交 | Orders |
| **No Var Rates** | 524288 | 排除可變利率 funding offers（margin orders） | Orders |

**多標誌組合：** 將多個標誌值相加即可組合使用
- 例如：64 + 4096 = 4160（隱藏 + 限價）

---

## 7. Offer 狀態 (Status)

| 狀態 | 說明 |
|------|------|
| **ACTIVE** | 活躍的 offer，等待在 order book 中匹配 |
| **EXECUTED** | offer 已完全成交 |
| **PARTIALLY FILLED** | offer 部分成交 |
| **CANCELED** | offer 已取消 |

---

## 8. 提交 Funding Offer 的 REST API 詳細規格

**端點：** `POST https://api.bitfinex.com/v2/auth/w/funding/offer/submit`

**請求參數：**
```json
{
  "symbol": "fUSD",           // 必需：fBTC, fETH, fUSD, fUST 等
  "amount": 500,              // 必需：金額（≥ $150）
  "rate": 0.01,               // 必需：利率（十進制，如 0.01 = 1%）
  "period": 30,               // 必需：週期（2-120 天）
  "type": "LIMIT",            // 必需：LIMIT, FRRDELTAFIX, FRRDELTAVAR
  "flags": 0,                 // 可選：標誌位（預設 0）
  "renew": 0                  // 可選：自動續期（0=否, 1=是）
}
```

**回應結構：**
- 返回通知陣列，包含時間戳、狀態（SUCCESS/ERROR）
- 隨附完整的 offer 詳細資訊（如上述數據結構）

**速率限制：** 90 requests/minute

---

## 9. 取消 Funding Offer

### REST API
**端點：** `POST https://api.bitfinex.com/v2/auth/w/funding/offer/cancel`

**請求參數：**
```json
{
  "id": 12345678  // 必需：要取消的 offer ID
}
```

### WebSocket API
**消息格式：**
```javascript
[0, "foc", null, { id: OFFER_ID }]
```

**回應：** 會在帳戶資訊頻道（CHAN_ID=0）收到確認，offer 狀態將變為 "CANCELED"

---

## 10. API 認證要求

### 所需憑證
- Bitfinex 帳戶
- API 密鑰（從帳戶設定生成）
- API 密鑰需要適當的權限：
  - **read**: 查看數據
  - **write**: 提交/修改 funding offers

### Nonce 要求
- **定義：** 每個認證請求必須包含一個嚴格遞增的值
- **通常實現：** 使用 UNIX 時間戳（毫秒）
- **約束：** 不得超過 `9007199254740991`（MAX_SAFE_INTEGER）
- **多連接：** 如果使用多個 HTTP/WebSocket 連接，需要為每個客戶端生成獨立的 API 密鑰，以避免 nonce 衝突

---

## 11. 錯誤代碼和速率限制

### REST API 速率限制
- **限制範圍：** 10-90 requests/minute（取決於端點）
- **超限回應：** `{"error": "ERR_RATE_LIMIT"}`
- **限制時間：** 超限後被封禁 60 秒

### WebSocket API 速率限制
- **認證連接：** 5 個/15 秒（api.bitfinex.com）
- **公開連接：** 20 個/分鐘（api-pub.bitfinex.com）
- **超限結果：** 連接被限制 15-60 秒

### 常見 WebSocket 錯誤代碼

| 代碼 | 說明 |
|------|------|
| **10000** | 未知事件 |
| **10001** | 未知交易對 |
| **10100** | API 密鑰無效 |
| **10300** | 訂閱失敗 |
| **10301** | 已訂閱 |
| **10302** | 未知頻道 |
| **10305** | 連接配額已滿 |

### 重要提示
- **使用數字代碼，不解析文本描述**
- 任何文本消息可能無預警變更

---

## 12. 最佳實踐

### 利率策略
1. **快速成交：** 使用 FRR 或低固定利率
2. **追求高回報：** 使用 FRR + 浮動增量（+0.002–0.005%）
3. **穩定收入：** FRR + 固定增量，搭配 7-30 天期限

### 利息計算公式
```
每日利息 = 金額 × 利率% × (秒數 / 86400秒) × (1 - 15% 手續費)

範例：$10,000 @ 0.06%
= 10,000 × 0.0006 = $6.00/日
扣除 15% 手續費 = $6.00 × 0.85 = $5.10/日
```

### 費用結構
- **標準 offer 手續費：** 15%
- **隱藏 offer 手續費：** 18%

### 自動續期 (Auto-Renew)
- **功能：** 自動重新提供 funding wallet 中的可用資金
- **最小觸發金額：** $150 USD 等值
- **優勢：** 無需手動干預，節省能量

### USD vs. USDT 策略
- **費用考量：** 轉換成本 0.25%-0.5%（交易費 + 滑點 + 價差）
- **推薦做法：** 如果利率差異顯著，才值得切換；否則不推薦頻繁切換

### 匹配機制
- **條件：** Bid 和 Offer 的 Rate 和 Period 必須匹配
  - Period 可以是等於或 Offer ≥ Bid
  - 固定利率不能與 FRR 匹配
- **優先級：** 更低的固定利率優先成交

---

## 13. 官方文檔參考連結

### REST API
- [Submit Funding Offer](https://docs.bitfinex.com/reference/rest-auth-submit-funding-offer)
- [Active Funding Offers](https://docs.bitfinex.com/reference/rest-auth-funding-offers)
- [Cancel Funding Offer](https://docs.bitfinex.com/reference/rest-auth-cancel-funding-offer)
- [Cancel All Funding Offers](https://docs.bitfinex.com/reference/rest-auth-cancel-all-funding-offers)
- [Funding Loans](https://docs.bitfinex.com/reference/rest-auth-funding-loans)
- [Funding Credits](https://docs.bitfinex.com/reference/rest-auth-funding-credits)
- [Funding Info](https://docs.bitfinex.com/reference/rest-auth-info-funding)
- [Funding Statistics](https://docs.bitfinex.com/reference/rest-public-funding-stats)

### WebSocket API
- [Authenticated Channels](https://docs.bitfinex.com/docs/ws-auth)
- [Funding Offers (WebSocket)](https://docs.bitfinex.com/reference/ws-auth-funding-offers)
- [Funding Credits (WebSocket)](https://docs.bitfinex.com/reference/ws-auth-funding-credits)
- [Funding Loans (WebSocket)](https://docs.bitfinex.com/reference/ws-auth-funding-loans)
- [New Offer (WebSocket Input)](https://docs.bitfinex.com/reference/ws-auth-input-offer-new)
- [Cancel Offer (WebSocket Input)](https://docs.bitfinex.com/reference/ws-auth-input-offer-cancel)

### 一般文檔
- [API 介紹](https://docs.bitfinex.com/docs/introduction)
- [API 需求和限制](https://docs.bitfinex.com/docs/requirements-and-limitations)
- [REST API 通用指南](https://docs.bitfinex.com/docs/rest-general)
- [WebSocket 通用指南](https://docs.bitfinex.com/docs/ws-general)
- [Flag 值（標誌位）](https://docs.bitfinex.com/docs/flag-values)
- [縮寫詞彙表](https://docs.bitfinex.com/docs/abbreviation-glossary)

### 支持文章
- [What is Margin Funding](https://support.bitfinex.com/hc/en-us/articles/214441185-What-is-Margin-Funding)
- [最小 Funding 金額](https://support.bitfinex.com/hc/en-us/articles/213918949-What-is-the-minimum-offer-for-Funding)
- [利息計算方式](https://support.bitfinex.com/hc/en-us/articles/213918989-How-is-Funding-interest-calculated-on-Bitfinex)
- [Funding 利息費用計算](https://support.bitfinex.com/hc/en-us/articles/360024039494-How-are-the-Funding-interest-earnings-and-fees-calculated-at-Bitfinex)
- [FRR Delta 說明](https://support.bitfinex.com/hc/en-us/articles/115003284729-What-is-the-Bitfinex-Funding-FRR-Delta)
- [Flash Return Rate](https://support.bitfinex.com/hc/en-us/articles/213919009-What-is-the-Bitfinex-Funding-Flash-Return-Rate)
- [自動續期功能](https://support.bitfinex.com/hc/en-us/articles/214441465-What-is-the-Funding-Auto-renew-feature-at-Bitfinex)
