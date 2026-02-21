# Bitfinex Lending Bot — 競品深度分析

> 最後更新: 2026-02-20
> 研究方法: Bitfinex 官方文檔 (context7) + 競品官網 + GitHub repo + 架構 review

---

## 一、市場背景

### Bitfinex Lending 市場

- 最低放貸額：**$150 USD**
- 放貸天數：**2-120 天**
- Bitfinex 手續費：**利息收入的 15%**
- 利率範圍：年化 **2%-50%**（取決於市場供需）

### Lending Pro 停用

Bitfinex 官方自動放貸功能 **Lending Pro** 於 **2024/8/28 停用**。
FULY.AI 專門推出了 Lending Pro 遷移優惠（年繳送 3 個月），說明有大量用戶需要替代方案。

---

## 二、商業競品（Active）

### FULY.AI 🇹🇼

| 項目 | 詳情 |
|------|------|
| 官網 | [fuly.ai](https://fuly.ai) |
| 團隊 | 台灣，有媒體曝光（zombit, ABMedia, Podcast） |
| 產品線 | Lending Bot + GT Radar（交易）+ JRB（指標） |
| 支持交易所 | **Bitfinex + KuCoin** |
| 核心算法 | **IBRR（Instant Best Return Rate）** |
| 策略 | AI 風險指數、進階掛單、智慧跟單 |
| 宣稱年化 | **8%-20%** |
| 定價 | 純訂閱制，**無利息抽成** |
| 年費 | $92 ($10K) / $200 ($100K) / $398 ($200K) |
| 入門限制 | 最低方案僅支援 USD 或 USDT |
| 特色 | 清晰績效報表、Lending Pro 遷移優惠、台灣大社群 |

### Coinlend 🇩🇪

| 項目 | 詳情 |
|------|------|
| 官網 | [coinlend.org](https://coinlend.org) |
| 團隊 | 德國，營運自 **2017 年** |
| 支持交易所 | **Bitfinex + KuCoin** |
| 核心算法 | 自研 AI 即時最佳化利率 |
| 策略 | Time Spread、Competitive Rate、Keep Amount |
| 定價 | **$8/月 + 收益的 5%** |
| 估算年費 | $161 ($10K) / $846 ($100K) / $1,596 ($200K) |
| App | ✅ Android + iOS |
| 新產品 | [CoinlendDeFi](https://coinlenddefi.com) |
| 特色 | 歷史最久、利率視覺化（顏色分級）、可自訂每幣策略 |

### EarnUSD 🌐

| 項目 | 詳情 |
|------|------|
| 官網 | [earn-usd.com](https://earn-usd.com) |
| 支持幣種 | USD, USDT, BTC |
| 核心機制 | 每 5 分鐘檢查+執行 |
| 宣稱年化 | USD **13.68%**, USDT **11.24%** |
| 估算年費 $10K | **$43/年** |
| 特色 | 即時啟用、低成本 |

### ALTINVEST 🌐

| 項目 | 詳情 |
|------|------|
| 官網 | [altinvest.finance](https://altinvest.finance) |
| 核心算法 | AI 動態利率 |
| 策略 | 動態利率、自動 compound、風險暫停 |
| 宣稱年化 | **~20%** |
| 定價 | $3-45/月 + **超額利息 3%** |

---

## 三、開源競品（全部已停更）

| 項目 | 語言 | 最後更新 |
|------|------|---------|
| [eAndrius/BitfinexLendingBot](https://github.com/eAndrius/BitfinexLendingBot) | Go | 2017 |
| [huaying/bitfinex-lending-bot](https://github.com/huaying/bitfinex-lending-bot) | Node.js | 2018 |
| MikaLendingBot | Python | 2019 |
| MarginBot | PHP | 2016 |

---

## 四、定價對比（$10K 本金、15% APR）

| 競品 | 年費 | 利息抽成 | 估算總成本/年 | 淨收益 |
|------|------|---------|-------------|--------|
| **我們** | **$0** | **0%** | **$0** | **$1,500** |
| EarnUSD | $43 | 0% | $43 | $1,457 |
| FULY.AI | $92 | 0% | $92 | $1,408 |
| ALTINVEST | $129 | 3% | $129 | $1,371 |
| Coinlend | $96+5% | 5% | $171 | $1,329 |

---

## 五、API 架構分析

### 關鍵發現：REST rate limit 對 lending bot 不是真正瓶頸

> ⚠️ **之前的分析高估了 WS 的價值。以下是根據實際架構 review 得出的修正結論。**

**Bitfinex REST 限制：10-90 req/min per IP**

**一個用戶每個策略循環的 REST 消耗：**

| 調用 | 請求數 |
|------|--------|
| GetWalletBalances | 1 |
| GetMarketData | 1 |
| syncExistingOffers（每 1 min） | 1 |
| **小計** | **2-3** |

UpdateInterval 預設 **300 秒（5 分鐘）**，換算 ≈ **0.5-0.8 REST req/min/user**

**多租戶容量估算：**
- 最保守（10 req/min）：~12 users/IP
- 正常（90 req/min）：~112 users/IP

### 競品怎麼做的

**所有競品都用 REST，而且都沒有問題**，因為 lending bot 天生是低頻操作。
- FULY.AI: 定時輪詢 → REST
- EarnUSD: 每 5 分鐘循環 → REST
- Coinlend: AI 分析 → REST

### 我們的架構

我們目前使用 **WS `fon`/`foc` 下單 + REST fallback**。

WS 的真正價值不在於「避免 rate limit」（因為 REST 也不會撞到），而在於：
1. **下單回應速度** — 不需 HTTP round-trip
2. **即時通知** — offer 狀態變化即時推送
3. **架構準備** — 當用戶量超過 100+ 時有餘裕

但若用戶量 < 100，REST 完全足夠。

---

## 六、我們的真正差異化優勢

| 優勢 | 說明 |
|------|------|
| 💰 **零費用** | vs FULY $92/yr, Coinlend $171/yr |
| 🔓 **完全開源/自控** | vs 黑盒商業 SaaS |
| 🤖 **ML 整合** | XGBoost gRPC + Embedded 雙模式 |
| � **6 種策略** | grid, adaptive, frr, hybrid, frr_delta, top_book |
| �📱 **Flutter 跨平台** | iOS/Android/Web/macOS |
| ⚡ **雙實例** | 同時管理 USD + USDT |
| � **Backtesting** | Event-driven + genetic optimizer |
| � **5 通知管道** | Telegram, Discord, LINE, Email, Webhook |
| ✅ **Auto-compound** | 預設開啟 |

### vs FULY.AI（主要對手）

| 面向 | 我們 | FULY.AI |
|------|------|---------|
| 費用 | **$0** | $92-398/年 |
| 策略 | **6 種** | IBRR + AI |
| ML | **XGBoost** | AI（未公開） |
| 開源 | **✅** | ❌ |
| 多交易所 | ❌ Bitfinex only | ✅ Bitfinex + KuCoin |
| 社群 | ❌ | ✅ 台灣大社群 |
| 績效報表 | 基本 | ✅ 專業 |
| Backtesting | **✅** | ❌ |

---

## 七、功能 Gap

| 功能 | FULY.AI | Coinlend | 我們 | 優先順序 |
|------|---------|----------|------|---------|
| 多交易所 | ✅ KuCoin | ✅ KuCoin | ❌ | 中 |
| 專業績效報表 | ✅ | ✅ | ❌ | **高** |
| 視覺化利率 | ✅ | ✅（顏色分級）| ❌ | 中 |
| 智慧跟單 | ✅ | — | ❌ | 低 |
| Mobile App (native) | — | ✅ iOS/Android | ✅ Flutter | — |
| DeFi 擴展 | — | ✅ | ❌ | 低 |

---

## 八、資料來源

| 來源 | 可信度 |
|------|--------|
| Bitfinex 官方文檔 (context7) | ✅ 高 |
| fuly.ai、coinlend.org 官網 | ⚠️ 中（商業宣傳） |
| earn-usd.com、altinvest.finance | ⚠️ 中 |
| GitHub repos (eAndrius, huaying) | ✅ 高 |
| grenade.tw、johntool.com 比較文 | ⚠️ 中（推薦連結） |
| 我們的架構 review + API 調用頻率分析 | ✅ 高 |
