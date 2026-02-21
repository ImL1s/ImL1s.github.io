# WS Funding Migration Architecture

> STATUS: 規劃中 — 待實作

## 背景

目前 `SubmitFundingOffer` 和 `CancelFundingOffer` 使用 REST API，受 per-IP 10-90 req/min 限制。Bitfinex WS 支援 `fon`（New Offer）和 `foc`（Cancel Offer）authenticated inputs，完全不受 REST rate limit 影響。

## 目前架構

```
BitfinexClient
├── REST (makeAuthenticatedRequest)
│   ├── GetWallets         ← REST (必要)
│   ├── GetMarketData      ← REST (可改 WS)
│   ├── SubmitFundingOffer ← REST ⚠️ 瓶頸
│   ├── CancelFundingOffer ← REST ⚠️ 瓶頸
│   └── GetActiveFundingOffers ← REST (必要)
│
└── WebSocket (wsConn)
    ├── Auth               ← WS ✅
    ├── Subscribe channels ← WS ✅
    └── Receive events     ← WS ✅ (fos, fcs, fls, wu, ...)
```

## 目標架構

```
BitfinexClient
├── REST (低頻查詢 only)
│   ├── GetWallets              ← REST (不頻繁)
│   └── GetActiveFundingOffers  ← REST (不頻繁)
│
└── WebSocket
    ├── Auth                    ← WS ✅ 已有
    ├── Subscribe channels      ← WS ✅ 已有
    ├── Receive events          ← WS ✅ 已有
    ├── SubmitFundingOfferWS    ← WS 🆕 fon input
    ├── CancelFundingOfferWS    ← WS 🆕 foc input
    └── Market data subscription ← WS 🆕 (optional)
```

## 容量對比

| | REST 架構 | WS 架構 |
|--|----------|---------|
| Funding 吞吐量 | 10-90/min per IP | 無已知上限 |
| 多 bot 支援 | ~9-22 bots | ~1,000-5,000 bots |
| Rate limit 風險 | 高（IP ban 60s） | 低（僅連線建立有限） |
| 延遲 | ~300-500ms per request | <50ms per message |

## 關鍵元件

### 1. WS Funding Writer
在現有 `BitfinexClient` 上新增 WS input 方法：
- `SubmitFundingOfferWS(offer) → (offerID, error)` — 透過 WS 送 `fon`
- `CancelFundingOfferWS(offerID) → error` — 透過 WS 送 `foc`

### 2. Response Router
WS 是異步的，`fon` 回應可能夾雜在其他事件中：
- 需要 correlation 機制（等待 `"n"` notification with `"fon-req"`）
- 使用 channel + timeout 實作同步等待

### 3. Fallback
WS 斷線時自動 fallback 到 REST（已有 ERR_RATE_LIMIT retry）。

## 驗證狀態

| 項目 | 狀態 |
|------|------|
| WS `fon` 格式 | ✅ 真實 API 驗證 |
| WS `foc` 格式 | ✅ 文檔確認 |
| REST 獨立性 | ✅ 真實 API 驗證 |
| $150 最低門檻 | ✅ 真實 API 驗證 |
| WS per-msg limit | ⚠️ 文檔未明確 |
