# LendLocal — 無後端 Bitfinex 放貸 App 設計文檔

> 日期：2026-02-20
> 狀態：設計階段

## 1. 概述

### 動機
- **降低門檻**：下載即用，不需註冊/付費/後端伺服器
- **隱私安全**：API key 完全不離開用戶設備
- **零營運成本**：不需維護後端，app 本身就是完整產品

### 核心決策
| 決策 | 選擇 | 原因 |
|------|------|------|
| 架構 | 純 Dart 重寫 | 最乾淨、單一技術棧、好除錯 |
| 策略 | Grid only (v1) | 最實用、先做好一個 |
| App 結構 | 獨立新專案 | 舊 app 70% 不需要，拆比建慢 |
| 幣種 | USD + USDT | 覆蓋主要需求 |
| 通知 | 本地通知 | 無後端依賴 |
| Flutter 版本 | stable (3.41.1, Dart 3.8.1) via FVM | 本地最新 |

---

## 2. 整體架構

```
┌─────────────────────────────────────────┐
│              Flutter App                 │
│                                          │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │  UI 層    │  │  LendingEngine       │ │
│  │ Riverpod  │◄─┤  (核心放貸邏輯)       │ │
│  │ GoRouter  │  │                      │ │
│  └──────────┘  │  ├─ BitfinexClient    │ │
│                │  │  (WS + REST)       │ │
│                │  ├─ GridStrategy      │ │
│                │  ├─ OfferManager      │ │
│                │  └─ RateLimiter       │ │
│                └──────────────────────┘ │
│                                          │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ 背景服務  │  │  本地儲存             │ │
│  │ Android:  │  │  ├─ SecureStorage    │ │
│  │  Foreground│  │  │  (API keys)      │ │
│  │  Service  │  │  ├─ Hive            │ │
│  │ iOS:      │  │  │  (歷史/設定)      │ │
│  │  BGTask   │  │  └─ 本地通知         │ │
│  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────┘
          │                    │
          ▼                    ▼
   Bitfinex WS API      Bitfinex REST API
   (wss://api.bitfinex.com/ws/2)
```

### 前景 vs 背景行為

| | 前景 | 背景 (Android) | 背景 (iOS) |
|---|---|---|---|
| 連線 | WebSocket 持續 | WebSocket 持續 (Foreground Service) | 醒來時 REST 請求 |
| 策略執行 | 每 10-30 秒 | 每 10-30 秒 | 醒來時執行一次（~30 秒內） |
| 數據來源 | WS 推送 | WS 推送 | REST 快速查詢 |
| 喚醒頻率 | N/A | 持續 | 系統決定（約 15 分鐘~數小時） |

### 背景服務技術選型

**雙層防護：`flutter_foreground_task` + `workmanager`**

設計原則：Foreground Service 為主力，WorkManager/BGTask 為兜底恢復層。

| 平台 | 層級 | 套件 | 作用 |
|------|------|------|------|
| Android | 主要 | `flutter_foreground_task` | Foreground Service 每 10 秒執行策略 |
| Android | 兜底 | `workmanager` | 被 OEM ROM 殺掉後，每 15 分鐘 WorkManager 恢復 |
| iOS | 前景 | `flutter_foreground_task` | 每 10 秒即時執行策略 |
| iOS | 背景 | `workmanager` | BGAppRefreshTask 每 15+ 分鐘醒來 30 秒 |

選型理由：
- `flutter_foreground_task`：`onRepeatEvent` 精確 10 秒間隔 + isolate 雙向通訊
- `workmanager`：OS 層級排程，不會被 OEM 殺掉（WorkManager 是 Android Jetpack 核心）
- 兩者互補：Foreground Service 負責即時性，WorkManager 負責可靠性

**Android 主力層（`flutter_foreground_task`）：**
- Foreground Service 持續運行，顯示常駐通知（「放貸引擎運行中」）
- `ForegroundTaskEventAction.repeat(10000)` — 每 10 秒執行策略
- `autoRunOnBoot: true` — 重啟後自動恢復
- `allowWakeLock: true` — 防止 CPU 休眠
- TaskHandler 在獨立 isolate 中，透過 `sendDataToMain` 推送狀態給 UI

**Android 兜底層（`workmanager`）：**
- `registerPeriodicTask` 每 15 分鐘觸發
- Callback 邏輯：
  1. 透過 SharedPreferences 心跳時間戳偵測 Foreground Service 是否存活
     - FGS 的 `onRepeatEvent` 每 10 秒寫入 `fgs_heartbeat_ms`
     - WorkManager 讀取時間戳，超過 60 秒未更新 → 判定 FGS 已死
     - **不用 `FlutterForegroundTask.isRunningService`**（WorkManager isolate 中 MethodChannel 可能無法正常運作）
  2. 如果 FGS 死了 → 跑一次 REST-only 策略 + 發通知提醒用戶重啟
     - ⚠️ **Android 12+ 限制**：`WorkManager` callback 屬於背景環境，無法直接啟動 Foreground Service（會拋出 `ForegroundServiceStartNotAllowedException`）
     - 策略：WorkManager 只做 REST-only 應急策略 + 發送通知，用戶點擊通知 → 開啟 App → 自動重啟 FGS
  3. 如果活著 → 不做事（避免重複執行）
- WorkManager 是 Android Jetpack 核心元件，小米/華為/OPPO 不會殺掉它
- `existingWorkPolicy: ExistingPeriodicWorkPolicy.replace`

**iOS 前景（`flutter_foreground_task`）：**
- `onRepeatEvent` 正常運行（與 Android 行為一致）
- WebSocket 即時市場數據 + 策略每 10 秒執行

**iOS 背景（`workmanager`）：**
- App 被掛起後，由 `workmanager` 透過 `BGAppRefreshTask` 定期喚醒
- 在 `AppDelegate.swift` 註冊：`WorkmanagerPlugin.registerPeriodicTask(withIdentifier:frequency: 20*60)`
- **整體 deadline guard：24 秒**（iOS 限制 ~30 秒，留 6 秒安全邊距）
- 雙幣種 `Future.wait` 並行執行（各自 REST 互不依賴），最長路徑 ~13 次 REST（非 26 次串行）
- 每個 REST 請求 timeout 8 秒
- 掛單設 `autoRenew: true`，Bitfinex 自動續約作為額外兜底
- `@pragma('vm:entry-point')` callback 在獨立 isolate 中執行

---

## 3. Bitfinex Dart 客戶端

### 3.1 WebSocket 訊息架構

Bitfinex WS v2 使用陣列式協議，Dart 客戶端必須實作分層解析：

```
收到訊息
├─ JSON 物件 → 控制訊息 {"event": "info"|"auth"|"subscribed"|"error"}
│   ├─ "subscribed" → 記錄 chanId → channel 映射
│   ├─ "auth" → 驗證成功/失敗
│   └─ "error" → 錯誤處理
├─ JSON 陣列 → 資料訊息 [chanId, ...]
│   ├─ [chanId, "hb"] → Heartbeat（忽略）
│   ├─ chanId == 0 → Channel 0 帳戶事件（見事件路由表）
│   └─ chanId > 0 → 公開頻道資料（ticker/book）
└─ 其他 → 忽略
```

### 3.2 Channel 0 事件路由表

認證後帳戶事件都走 Channel 0，以下為 v1 必要的 funding 事件：

| 事件代碼 | 含義 | v1 必要 | 說明 |
|---------|------|---------|------|
| `fon` | funding offer new | 必要 | 掛單確認 |
| `fou` | funding offer update | 必要 | 掛單狀態變更 |
| `foc` | funding offer cancelled | 必要 | 掛單取消確認 |
| `fos` | funding offers snapshot | 必要 | 認證後的現有掛單快照 |
| `fcs` | funding credits snapshot | 必要 | 認證後的現有 credits 快照 |
| `fcn` | funding credit new | 必要 | 新借出成交 |
| `fcu` | funding credit update | 必要 | 借出狀態更新 |
| `fcc` | funding credit closed | 必要 | 借出關閉 |
| `fte` | funding trade executed | 必要 | 成交通知 |
| `ftu` | funding trade update | 必要 | 成交更新 |
| `n` | notification | 必要 | fon-req/foc-req 的回應（SUCCESS/ERROR） |
| `fls`/`fln`/`flu`/`flc` | funding loans | 建議 | 借入相關（v2 擴充） |
| `wu` | wallet update | 建議 | 即時餘額更新（減少 REST 呼叫） |

**認證後 Snapshot 處理：** 認證成功後 Bitfinex 會推送 `fos`、`fcs`、`fls`、`ws` 等 snapshot，用來初始化本地狀態。

### 3.3 WSResponseRouter（非同步回應關聯）

WS `fon`/`foc` 操作是非同步的：送出 `[0, "fon", null, {...}]` 後，回應是 `[0, "n", [...]]` notification。需要 Completer 路由機制：

```dart
class WSResponseRouter {
  final _pending = <String, Completer<WsNotification>>{};

  /// 送出 fon 後等待回應
  Future<WsNotification> waitForResponse(String reqType, {Duration timeout = const Duration(seconds: 10)}) {
    final completer = Completer<WsNotification>();
    _pending[reqType] = completer;
    return completer.future.timeout(timeout, onTimeout: () {
      _pending.remove(reqType);
      throw TimeoutException('WS $reqType response timeout');
    });
  }

  /// 收到 notification 時路由
  void handleNotification(WsNotification notif) {
    // notif 格式: [MTS, TYPE, MESSAGE_ID, null, [DATA], CODE, STATUS, TEXT]
    // STATUS: "SUCCESS" 或 "ERROR"
    final completer = _pending.remove(notif.type); // "fon-req" / "foc-req"
    completer?.complete(notif);
  }

  /// 重連時 reset 所有等待中的 Completer
  void reset() {
    for (final c in _pending.values) {
      c.completeError(StateError('WebSocket reconnected'));
    }
    _pending.clear();
  }
}
```

### 3.4 Channel 訂閱管理

```dart
// 維護兩個映射
Map<int, ChannelInfo> _channelSubscriptions;  // chanId → channel info
Map<String, ChannelIntent> _desiredSubscriptions; // "book:fUSD" → 訂閱意圖

// 收到 {"event":"subscribed","chanId":123,"channel":"book","symbol":"fUSD"}
// → _channelSubscriptions[123] = ChannelInfo(channel: "book", symbol: "fUSD")

// 重連後自動重新訂閱所有 _desiredSubscriptions
Future<void> _resubscribeAll() async {
  for (final intent in _desiredSubscriptions.values) {
    _sendSubscribe(intent);
  }
}
```

**Book 訂閱參數：** 必須指定 `"prec": "P0"` (最佳精度) 和 `"len": "25"` (25 層)。

**Auth filter：** 認證時加 `"filter": ["funding", "wallet", "notify"]` 減少不必要的事件。

### 3.5 WebSocket 公開 API

```dart
class BitfinexWebSocket {
  late final WebSocket _socket;
  final WSResponseRouter _router;

  // 連線管理（BinaryExponentialBackoff 自動重連）
  Future<void> connect(String apiKey, String apiSecret);
  Future<void> disconnect();
  Stream<ConnectionState> get connectionState;

  // 訂閱 funding 相關頻道
  void subscribeTicker(String symbol);  // fUSD, fUST
  void subscribeBook(String symbol);    // prec=P0, len=25
  void subscribeAccount();              // 認證後私有頻道

  // 事件流（按 symbol 過濾）
  Stream<TickerUpdate> tickerUpdatesFor(String symbol);
  Stream<OrderBookUpdate> bookUpdatesFor(String symbol);
  Stream<FundingUpdate> fundingUpdatesFor(String symbol);

  // WS 操作（fon/foc，透過 WSResponseRouter 關聯回應）
  Future<FundingOffer> submitOffer(OfferParams params);
  Future<void> cancelOffer(int offerId);
}
```

**重要：Funding Ticker 欄位映射**
```
[0]=FRR, [1]=Bid, [2]=BidPeriod, [3]=BidSize, [4]=Ask, [5]=AskPeriod,
[6]=AskSize, [7]=DailyChange, [8]=DailyChangePerc, [9]=LastPrice,
[10]=Volume, [11]=High, [12]=Low, ..., [15]=FRRAmountAvailable
```
FRR 是 ticker 的索引 0，不是獨立事件。

**重要：Funding Order Book 語義（與 trading 相反）**
- Amount > 0 = Ask (供給/offer) = 放貸供應
- Amount < 0 = Bid (需求/borrow) = 借款需求

**重要：Order Book 增量更新**
```dart
// Count == 0 → 刪除該價格層
// Count > 0 → 新增或更新
void _updateBookEntry(BookUpdate update) {
  if (update.count == 0) {
    _book.removeWhere((e) => e.rate == update.rate && e.period == update.period);
  } else {
    _book.upsert(update);
  }
}
```

### 3.6 重連與恢復流程

`web_socket_client` 提供自動重連，但重連後必須額外處理：
1. `_router.reset()` — unblock 所有等待中的 Completer
2. 重新認證（`auth` 訊息 + HMAC 簽名）
3. `_resubscribeAll()` — 重新訂閱所有公開頻道
4. 等待 snapshot（`fos`, `fcs`）重建本地狀態

**健康監測：** 每 30 秒發 ping，60 秒無 pong → 觸發重連。

### 3.7 REST 層（背景 + fallback）

```dart
class BitfinexRest {
  // Dio HTTP client + HMAC-SHA384 簽名
  Future<Map<String, double>> getWalletBalances();
  Future<List<FundingOffer>> getActiveOffers(String symbol);
  Future<List<FundingCredit>> getFundingCredits(String symbol);
  Future<MarketData> getMarketData(String symbol);
  Future<FundingOffer> submitOffer(OfferParams params);
  Future<void> cancelOffer(int offerId);
  Future<bool> validateCredentials(); // API key 驗證
}
```

### 3.8 認證與簽名

Bitfinex API v2 HMAC-SHA384：
- `crypto` 套件（Dart 原生）
- Headers: `bfx-apikey`, `bfx-nonce`, `bfx-signature`
  - ⚠️ Headers **必須小寫**（`dio` 預設可能保持大小寫，需驗證）
- Payload: `/api/v2/<endpoint>` + nonce + body JSON
  - ⚠️ 空 body 時用空字串 `""`（不是 `"{}"`），否則簽名不匹配

**Nonce 管理：**
- 使用 Unix 微秒 epoch，每次呼叫 +1，嚴格遞增
- REST 和 WS auth 共用 nonce 空間（同一 API key）
- 偵測 `nonce: small` 錯誤（code 10114）時自動重新同步

### 3.9 Rate Limiter

| 層級 | 參數 | 說明 |
|------|------|------|
| REST token bucket | 45 req/min（保守值） | 每次 REST 呼叫前等待 token |
| ERR_RATE_LIMIT 偵測 | 暫停 65 秒 | 收到 429/ERR_RATE_LIMIT 時全局暫停 |
| 指數退避 | base * 2^attempt + random(0,500ms) | REST 失敗重試 |
| WS 優先 | fon/foc 走 WS | 繞過 REST rate limit |

### 3.10 幣種 Symbol 轉換

```dart
// ⚠️ 易錯點：USDT → fUST（不是 fUSDT！）
String currencyToSymbol(String currency) => switch (currency) {
  'USD'  => 'fUSD',
  'USDT' => 'fUST',  // Bitfinex 縮寫
  _ => throw ArgumentError('Unsupported currency: $currency'),
};
```

### 3.11 精簡對比

| Go 原版 | Dart 版 | 原因 |
|---|---|---|
| 通用 WS router + 多種事件 | 只處理 funding 相關事件 | 不做交易 |
| SDK client 替代實現 | 不需要 | 只有一種實現 |
| Global rate limiter (多 bot) | 單 bot rate limiter | 本地只跑一個 |
| 錢包快取 60 秒 TTL | 同樣機制 | 直接移植 |
| Events channel non-blocking send | StreamController broadcast | Dart 用背壓 stream |

估計約 **1200-1500 行** Dart（含 WSResponseRouter、事件解析、channel 管理）。

---

## 4. Grid 策略移植

從 Go `internal/strategy/grid.go` 移植。Go 版有 20+ 個功能模組，v1 只移植核心子集。

### v1 Scope 對照表

| 功能 | Go 原版 | v1 包含 | v2 擴充 | 說明 |
|------|---------|---------|---------|------|
| FRR-based rate range | ✅ | ✅ | | 0.5x ~ 2.0x FRR |
| Order Book gap range | ✅ | ✅ | | 10%-80% 百分位（優先於 FRR） |
| 動態層數 (calculateOptimalLevels) | ✅ | ✅ | | min(levels, balance / 150) |
| 供需比 EMA + hysteresis | ✅ | ✅ | | alpha=0.2, 閾值 1.2/0.8 |
| 分佈計算 (linear/exp/log) | ✅ | ✅ | | 三種分佈 |
| APR 階梯 period | ✅ | ✅ | | <15%→2d, 15-25%→7d, 25-40%→14d, >40%→30d |
| 基礎 ShouldRebalance | ✅ | ✅ | | 最小間隔 + FRR 變化 + 保底 |
| Dynamic max rate | ✅ | | ✅ | 自適應 multiplier 1.15x-1.6x |
| Technical indicators | ✅ | | ✅ | RSI/MACD/BB 整合 |
| Ladder offers | ✅ | | ✅ | 30%/35%/35% 分配 |
| Depth-based spread mode | ✅ | | ✅ | 按累計金額找利率 |
| 時間衰減 | ✅ | | ✅ | 20 分鐘後每 10 分鐘降 2% |
| Period 趨勢調整 | ✅ | | ✅ | 上升趨勢→縮短，下降→延長 |
| 智能多因子 rebalance | ✅ | | ✅ | 5 條件分層決策 |

### 核心邏輯

```dart
class GridStrategy {
  final GridConfig config;
  OrderBookSnapshot? _orderBook;
  double _demandSupplyEMA = 1.0; // EMA 平滑供需比

  /// 主入口：計算掛單
  List<FundingOffer> calculateOffers(double balance, MarketData market) {
    // 0. 動態層數：確保每層 >= $150
    final levels = min(config.levels, (balance / 150).floor());
    if (levels <= 0) return [];

    // 1. adjustRateRange — 三層 fallback
    //    優先: Order Book 百分位 > FRR-based > Config min/max
    final (minRate, maxRate) = _adjustRateRange(market, _orderBook);

    // 2. 逐層利率計算 + 供需比 EMA 微調
    final offers = <FundingOffer>[];
    final amountPerLevel = balance / levels;
    for (var i = 0; i < levels; i++) {
      var rate = _calculateRateForLevel(i, levels, minRate, maxRate);
      rate = _adjustRateByMarketDepth(rate, _orderBook);
      final period = _calculatePeriodForRate(rate);
      offers.add(FundingOffer(amount: amountPerLevel, rate: rate, period: period));
    }
    return offers;
  }

  /// 三層 fallback rate range
  (double, double) _adjustRateRange(MarketData market, OrderBookSnapshot? book) {
    // 優先 1: Order Book asks 的 10%-80% 百分位
    if (book != null && book.asks.length >= 5) {
      return _calculateOrderBookGap(book);
    }
    // 優先 2: FRR * [0.5, 2.0]
    if (market.frr > 0) {
      return (market.frr * 0.5, market.frr * 2.0);
    }
    // 優先 3: Config fallback
    return (config.minRate, config.maxRate);
  }

  /// EMA 平滑供需比 + hysteresis 防震盪
  double _adjustRateByMarketDepth(double rate, OrderBookSnapshot? book) {
    if (book == null) return rate;
    final rawRatio = book.totalDemand / book.totalSupply;
    _demandSupplyEMA = 0.2 * rawRatio + 0.8 * _demandSupplyEMA; // EMA alpha=0.2
    // Hysteresis: 只在超過閾值時調整（防邊界震盪）
    if (_demandSupplyEMA > 1.2) return rate * (1 + log(_demandSupplyEMA) * 0.1);
    if (_demandSupplyEMA < 0.8) return rate * (1 - log(1 / _demandSupplyEMA) * 0.08);
    return rate; // 在 0.8~1.2 之間不調整
  }

  /// APR 階梯 period（v1 基礎版）
  int _calculatePeriodForRate(double dailyRate) {
    final apr = dailyRate * 365 * 100;
    if (apr < 15) return 2;
    if (apr < 25) return 7;
    if (apr < 40) return 14;
    return 30;
  }

  /// 基礎 ShouldRebalance
  bool shouldRebalance(List<FundingOffer> activeOffers, MarketData market) {
    // 最小間隔保護：2 分鐘
    if (_timeSinceLastRebalance < Duration(minutes: 2)) return false;
    // FRR 變化 > 15%
    if (_frrChangePercent(market.frr) > 0.15) return true;
    // 保底：30 分鐘
    if (_timeSinceLastRebalance > Duration(minutes: 30)) return true;
    // 有新資金（balance > activeOffers total + $150）
    if (_hasNewFunds(market)) return true;
    return false;
  }

  void updateOrderBook(OrderBookUpdate update);
}
```

### GridConfig — 用戶可調參數

```dart
class GridConfig {
  final int levels;           // 掛單層數（預設 5）
  final double reserveRatio;  // 保留比例（預設 0.1 = 10%）
  final double minRate;       // 最低利率（config fallback 用）
  final double maxRate;       // 最高利率（config fallback 用）
  final bool autoRenew;       // 自動續約（預設 true）
  final String distribution;  // 'logarithmic' | 'exponential' | 'linear'（預設 logarithmic）
  // v2 預留欄位（內部有合理預設值，不暴露給 UI）
  // final bool enableDynamicMaxRate;
  // final double dynamicMaxRateMultiplier;
  // final String spreadMode; // 'rate' | 'depth'
}
```

### 移植測試案例（TDD）

從 Go `strategy_test.go` + `fuzz_test.go` 移植的核心測試：

| # | 測試名稱 | 驗證目的 |
|---|---------|---------|
| 1 | `test_initialization_defaults` | 預設值填充（levels=5, minRate, maxRate） |
| 2 | `test_calculateOffers_basic` | 產出 offers 的 rate/period 在合法範圍 |
| 3 | `test_distribution_monotonic` | linear/exp/log 分佈的單調遞增性 |
| 4 | `test_dynamicLevels_belowMinimum` | 餘額 $200 設定 5 層 → 只得 1 層 |
| 5 | `test_dynamicLevels_exactMinimum` | 餘額 $750 設定 5 層 → 得 5 層 |
| 6 | `test_adjustRateRange_noMarketData` | 無市場數據 → 返回 config min/max |
| 7 | `test_adjustRateRange_frrOnly` | 無 OrderBook → FRR * [0.5, 2.0] |
| 8 | `test_adjustRateRange_orderBookPriority` | 有 OrderBook → 優先百分位 |
| 9 | `test_marketDepth_highDemand` | 供需比 > 1.2 → rate 上調 |
| 10 | `test_marketDepth_lowDemand` | 供需比 < 0.8 → rate 下調 |
| 11 | `test_periodForRate_aprTiers` | 各 APR 區間對應正確 period |
| 12 | `test_belowMinBalance` | 餘額 < $150 → 空列表 |
| 13 | `test_rateNeverExceedsBounds` | Property: 所有 rate 在 [minRate, maxRate] |
| 14 | `test_totalAmountNeverExceedsBalance` | Property: sum(amount) <= balance |
| 15 | `test_shouldRebalance_minInterval` | 2 分鐘內不 rebalance |
| 16 | `test_shouldRebalance_frrChange` | FRR 變化 > 15% → rebalance |
| 17 | `test_shouldRebalance_fallback` | 30 分鐘保底 rebalance |

估計：核心策略 **450-550 行** Dart + 測試 **300-400 行**。

---

## 5. LendingEngine 生命週期

Engine 不用 ChangeNotifier，而是透過 Riverpod provider（見 Section 8）。
以下是核心邏輯的虛擬碼：

```dart
/// LendingEngine 跑在 foreground_task 的 TaskHandler isolate 中
/// UI 層透過 Riverpod provider 觀察狀態變化
class LendingEngine {
  final BitfinexWebSocket _ws;
  final BitfinexRest _rest;
  final GridStrategy _strategy;
  final String symbol; // 'fUSD' 或 'fUST'

  /// 前景啟動（WebSocket 模式）
  Future<void> startForeground() async {
    await _ws.connect(apiKey, apiSecret);
    _ws.subscribeTicker(symbol);
    _ws.subscribeBook(symbol);
    _ws.subscribeAccount();

    // 同步現有 offers（建立本地追蹤）
    activeOffers = await _rest.getActiveOffers(symbol);
    _ws.fundingUpdates.listen(_handleFundingUpdate);
  }

  /// 由 TaskHandler.onRepeatEvent 每 10 秒呼叫
  Future<void> executeStrategy() async {
    final balances = await _rest.getWalletBalancesCached();
    final market = _ws.latestMarketData ?? await _rest.getMarketData(symbol);
    if (!_strategy.shouldRebalance(activeOffers, market)) return;

    // 安全 rebalance：先掛新單，確認成功後再取消舊單
    final available = _calculateAvailable(balances);
    final newOffers = _strategy.calculateOffers(available, market);
    final submitted = <FundingOffer>[];
    for (final o in newOffers) {
      final result = await _submitWithFallback(o); // WS 優先，REST fallback
      if (result != null) submitted.add(result);
    }
    // 只取消不在新方案中的舊掛單
    final toCancel = activeOffers.where((o) => !_isKept(o, submitted));
    for (final o in toCancel) await _cancelWithFallback(o.id);
  }

  /// 背景醒來（REST-only）
  /// 雙幣種並行執行，整體 deadline 24 秒（iOS ~30 秒限制留安全邊距）
  Future<void> executeBackground() async {
    final deadline = DateTime.now().add(const Duration(seconds: 24));
    await _runCurrencyBackground(symbol, deadline);
  }

  Future<void> _runCurrencyBackground(String sym, DateTime deadline) async {
    if (DateTime.now().isAfter(deadline)) return;
    final balances = await _rest.getWalletBalances().timeout(const Duration(seconds: 8));
    if (DateTime.now().isAfter(deadline)) return;
    final market = await _rest.getMarketData(sym).timeout(const Duration(seconds: 8));
    if (DateTime.now().isAfter(deadline)) return;
    final offers = await _rest.getActiveOffers(sym).timeout(const Duration(seconds: 8));

    if (!_strategy.shouldRebalance(offers, market)) return;

    // 同樣安全 rebalance：先掛後取消
    final available = _calculateAvailable(balances);
    final newOffers = _strategy.calculateOffers(available, market);
    for (final o in newOffers) {
      if (DateTime.now().isAfter(deadline)) break;
      await _rest.submitOffer(o).timeout(const Duration(seconds: 8));
    }
    final toCancel = offers.where((o) => !_isKept(o, newOffers));
    for (final o in toCancel) {
      if (DateTime.now().isAfter(deadline)) break;
      await _rest.cancelOffer(o.id).timeout(const Duration(seconds: 8));
    }

    _sendLocalNotification('已調整 ${newOffers.length} 筆掛單');
  }

  /// 提交掛單：WS 優先（即時確認），REST fallback
  Future<FundingOffer?> _submitWithFallback(OfferParams params) async {
    try {
      return await _ws.submitOffer(params); // fon
    } catch (_) {
      return await _rest.submitOffer(params); // REST fallback
    }
  }

  /// App 生命週期切換
  void onAppLifecycleChange(AppLifecycleState lifecycle) {
    if (Platform.isIOS) {
      // iOS：背景時斷 WS（系統會掛起），前景時重連
      if (lifecycle == AppLifecycleState.paused) _ws.disconnect();
      if (lifecycle == AppLifecycleState.resumed) startForeground();
    }
    // Android：Foreground Service 維持 WS，不需切換
  }
}
```

### 雙幣種架構

每個幣種一個獨立 Engine 實例（與 Go 版一致）：

```dart
// 用戶可選 USD only、USDT only、或兩者同時
final usdEngine = LendingEngine(symbol: 'fUSD', ...);
final ustEngine = LendingEngine(symbol: 'fUST', ...);

// TaskHandler 中依設定啟動對應引擎
// ⚠️ 必須 await 串行執行（防止共用 WS 的事件競爭）
@override
Future<void> onRepeatEvent(DateTime timestamp) async {
  if (config.enableUsd) await usdEngine.executeStrategy();
  if (config.enableUsdt) await ustEngine.executeStrategy();
}
```

**並發保護：**
- 兩個引擎**串行執行**（`await`），避免共用 WS stream 的事件競爭
- 每個引擎內加 mutex 防止重入（上一輪還沒結束時 `onRepeatEvent` 又觸發）：
```dart
final _lock = Mutex(); // from package:synchronized
Future<void> executeStrategy() async {
  if (_lock.isLocked) return; // 上一輪還在跑，跳過
  await _lock.protect(() async { /* 原有邏輯 */ });
}
```

**WS 事件嚴格過濾：**
```dart
// 每個 engine 只收自己幣種的事件
_ws.fundingUpdatesFor(symbol).listen(_handleFundingUpdate);
// fundingUpdatesFor 內部用 .where((e) => e.symbol == symbol) 過濾
```

注意：兩個引擎共用同一個 WebSocket 連線（同一組 API key），
WS `fon`/`foc` 回應用 `cid`（client order ID）區分歸屬。

---

## 6. UI 設計

### 設計系統

| 項目 | 選擇 |
|------|------|
| 風格 | Dark Mode (OLED) — 省電、專業、適合金融 |
| 主色 | `#F59E0B` (Gold) — 信任感 |
| 輔色 | `#FBBF24` (Light Gold) |
| 強調色 | `#8B5CF6` (Purple) — 科技感 |
| 背景 | `#0F172A` (Dark Navy) |
| 文字 | `#F8FAFC` (Near White) |
| 字體 | Exo 2（標題）/ system default（內文）|
| 效果 | Minimal glow, high readability, visible focus states |

### 畫面（4 頁極簡 v1）

**1. 設定頁 (Setup)**
- 輸入 API Key + Secret（遮罩顯示）
- 「驗證 API Key」按鈕 → 調用 `validateCredentials()`
- 選幣種（USD / USDT）— SegmentedButton
- Grid 參數：層數 slider (2-10)、天數 (2-120)、保留比例 (5-30%)
- Auto-renew toggle
- 資料存入 `flutter_secure_storage`

**2. 主控台 (Dashboard)**
- 大按鈕：啟動/停止引擎
- 即時卡片：FRR、可用餘額、活躍掛單數、今日收益
- 引擎狀態指示：Running (green pulse) / Paused / Stopped
- 簡易收益圖表（最近 7 天）

**3. 掛單列表 (Offers)**
- Active offers：利率、金額、到期時間
- 左滑取消單筆
- Funding credits：已成交的借出

**4. 日誌頁 (Logs)**
- 時間軸：成交、掛單、rebalance 事件
- 存在本地 Hive
- 可匯出 CSV

### UX 規範
- 最小觸控目標 44x44px
- 按鈕 async 操作時 disable + loading
- 動畫 150-300ms
- 支援 `prefers-reduced-motion`
- 所有 icon 用 SVG（Lucide）
- 無 emoji 作為 UI icon

---

## 7. 專案結構

**Package Name:** `com.cbstudio.lendlocal`
**iOS Bundle ID:** `com.cbstudio.lendlocal`

```
lend_local/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── router.dart              # GoRouter
│   │   └── theme.dart               # Dark theme
│   ├── core/
│   │   ├── bitfinex/
│   │   │   ├── rest_client.dart     # Dio + HMAC-SHA384
│   │   │   ├── ws_client.dart       # web_socket_client
│   │   │   ├── auth.dart            # 簽名邏輯
│   │   │   └── models.dart          # FundingOffer, MarketData 等
│   │   ├── engine/
│   │   │   ├── lending_engine.dart   # 主引擎
│   │   │   └── offer_manager.dart    # 掛單追蹤
│   │   ├── strategy/
│   │   │   ├── strategy.dart         # 介面
│   │   │   └── grid_strategy.dart    # Grid 實現
│   │   ├── background/
│   │   │   ├── workmanager_watchdog.dart  # workmanager（iOS BGTask + Android 兜底恢復）
│   │   │   └── foreground_task.dart      # flutter_foreground_task（前景 + Android 背景）
│   │   ├── notification/
│   │   │   └── local_notification.dart
│   │   └── storage/
│   │       ├── secure_storage.dart   # API keys
│   │       └── local_db.dart         # Hive
│   ├── features/
│   │   ├── setup/                    # API key 設定頁
│   │   ├── dashboard/                # 主控台
│   │   ├── offers/                   # 掛單列表
│   │   └── logs/                     # 事件日誌
│   └── providers/                    # Riverpod providers
│
├── test/
│   ├── core/bitfinex/                # API 客戶端測試
│   ├── core/strategy/                # 策略測試（TDD，從 Go 移植）
│   └── core/engine/                  # 引擎測試
│
├── pubspec.yaml
├── .fvmrc                            # Flutter 3.41.1 (stable)
└── README.md
```

---

## 8. 依賴清單

```yaml
dependencies:
  # 狀態管理 & 導航（版本已於 2026-02-20 驗證 pub.dev）
  flutter_riverpod: ^3.2.1          # Riverpod 3.x — AsyncNotifier, Ref 統一
  riverpod_annotation: ^4.0.2       # @riverpod code generation
  go_router: ^17.1.0

  # 網路
  web_socket_client: ^0.2.1         # felangel — 自動重連 + BinaryExponentialBackoff
  dio: ^5.9.1                       # REST client
  crypto: ^3.0.7                    # HMAC-SHA384 簽名

  # 儲存
  flutter_secure_storage: ^10.0.0   # API keys (Keychain/KeyStore)
  hive_ce: ^2.19.3                  # 本地快取/日誌

  # 背景服務
  flutter_foreground_task: ^9.2.0   # 前景 + Android 背景（Foreground Service）
  workmanager: ^0.9.0               # iOS 背景 + Android 兜底（WorkManager/BGTask）

  # 通知
  flutter_local_notifications: ^20.1.0

  # UI
  fl_chart: ^1.1.1                  # 收益圖表
  lucide_icons: ^0.257.0            # SVG icons

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^4.0.3        # @riverpod code gen
  build_runner: ^2.4.0              # Code generation runner
  custom_lint: ^0.8.1               # Riverpod lint rules
  riverpod_lint: ^3.1.3
  mocktail: ^1.0.4                  # Mock for testing
```

### workmanager 0.9.x API 注意事項

```dart
// 0.9.x enum 改為 camelCase（非 snake_case）
Constraints(networkType: NetworkType.connected)  // 非 not_required
ExistingWorkPolicy.replace                        // 非 REPLACE

// inputData 不再 JSON 序列化，直接用 native Map
Workmanager().registerPeriodicTask(
  'lending-watchdog',
  'checkAndRestart',
  frequency: Duration(minutes: 15),
  constraints: Constraints(networkType: NetworkType.connected),
  existingWorkPolicy: ExistingWorkPolicy.replace,
);
```

### flutter_foreground_task 9.x API 注意事項

```dart
// v9: sendPort 已移除，改用 FlutterForegroundTask.sendDataToMain
// v9: onStart/onDestroy 回傳 Future<void>（非 void）
class LendingTaskHandler extends TaskHandler {
  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    // starter.name: 'developer' 或 'system'（區分手動/自動啟動）
  }

  @override
  void onRepeatEvent(DateTime timestamp) {
    FlutterForegroundTask.sendDataToMain({'status': 'running'});
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    // isTimeout: 是否被系統超時殺掉
  }
}
```

### Riverpod 3.x Provider 設計

```dart
// 注意：Riverpod 3.x 移除了所有 Ref 子類，統一用 Ref
// StateProvider/StateNotifierProvider 移到 legacy.dart — 不使用

// 引擎狀態（同步 Notifier）
@riverpod
class Engine extends _$Engine {
  @override
  EngineState build() => EngineState.stopped;
  // stopped | starting | running | paused
  void start() => state = EngineState.starting;
  void stop() => state = EngineState.stopped;
}

// 錢包餘額（async REST 查詢）
@riverpod
class WalletBalance extends _$WalletBalance {
  @override
  Future<Map<String, double>> build() async => _fetchBalances();
}

// 活躍掛單（async REST + WS 即時更新）
@riverpod
class ActiveOffers extends _$ActiveOffers {
  @override
  Future<List<FundingOffer>> build() async => _fetchOffers();
  Future<void> submitOffer(OfferParams params) async {
    final offer = await ref.read(bitfinexRestProvider).submitOffer(params);
    if (!ref.mounted) return;  // 3.x: 用 ref.mounted 檢查
    state = AsyncData([...state.requireValue, offer]);
  }
}

// 市場數據（WebSocket stream）
@riverpod
Stream<MarketData> marketData(Ref ref) => ref.watch(wsClientProvider).bookUpdates;

// FRR 即時數據（WebSocket stream）
@riverpod
Stream<double> frr(Ref ref) => ref.watch(wsClientProvider).frrUpdates;

// 設定（同步，從 SecureStorage 讀取）
@riverpod
class AppSettings extends _$AppSettings {
  @override
  LendLocalConfig build() => LendLocalConfig.defaults();
}

// 注意：Mutation 是 experimental（需 import 'package:riverpod/experimental/'）
// v1 先不用 Mutation，用 AsyncNotifier 的方法直接處理掛單操作
```

---

## 9. 商店合規與 ASO

### Apple App Store 合規

**定位：交易工具（Trading Tool），非金融服務**

| 條款 | 風險 | 策略 |
|------|------|------|
| 3.1.5 Cryptocurrencies | 低 | 不持有資金、不是錢包（不需 Organization 帳號）、不是交易所。是連接用戶既有 Bitfinex 帳戶的管理工具，類似 3Commas/Cryptohopper |
| 3.1.5(viii) Financial Services | 低 | 不是金融機構，是「工具」。明確聲明「不提供金融建議」 |
| 5.1 Privacy | 低 | API key 僅存本地 Keychain，不上傳任何數據 |
| 2.3 Metadata | 低 | 準確描述功能，不誇大收益 |

**必要措施：**
- 個人開發者帳號即可（不需要 Organization，因為不是錢包）
- 開發者名稱：CB Studio
- App 內顯示風險免責聲明（首次啟動）
- 明確說明：「本 App 不持有任何資金，所有操作透過用戶自己的 Bitfinex API 執行」
- 不做收益保證或預測的宣傳語
- Privacy Policy URL: `https://iml1s.github.io/lendlocal-privacy.html`
- Terms of Service URL: `https://iml1s.github.io/lendlocal-terms.html`

### Google Play Store 合規

**根據 2025/10/29 新政策：**
- LendLocal 不是 custodial wallet（不持有用戶資金/私鑰）→ 免牌照
- 不是 exchange → 不受 crypto exchange 政策約束
- 定位為「Portfolio Management Tool」— 類似 3Commas、Cryptohopper
- 需要加入投資風險揭露

### ASO 策略

**App 名稱方案：**
- Apple: `LendLocal` (30 字元限制)
- Apple Subtitle: `Bitfinex Lending Automation` (30 字元)
- Google: `LendLocal - Bitfinex Lending Bot` (50 字元限制)

**關鍵字策略：**
- Primary: bitfinex, lending, funding, crypto lending, passive income
- Secondary: automated trading, lending bot, DeFi yield, interest earning
- Long-tail: bitfinex funding bot, crypto lending automation

**Category：**
- Apple: Finance
- Google: Finance → Investment

**描述重點：**
1. 無需伺服器，API key 不離開設備（隱私賣點）
2. 自動化放貸，省時省力
3. Grid 策略最佳化利率
4. 支援 USD + USDT
5. 風險免責聲明

### 合規參考來源

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Cryptocurrency Policy](https://support.google.com/googleplay/android-developer/answer/16329703?hl=en)
- [Apple Updates Crypto Aspects of Guidelines](https://natlawreview.com/article/apple-updates-crypto-currency-aspects-app-store-review-guidelines)
- [Google Play Crypto Wallet Policy 2025](https://hashchainconsulting.com/google-play-store-policy-2025-for-cryptocurrency-wallet-apps/)

---

## 10. 實作順序

### Phase 1: 核心引擎（TDD）
1. `BitfinexRest` — HMAC 簽名 + 基本 API 呼叫
2. `GridStrategy` — 從 Go 測試案例移植
3. `LendingEngine` — 整合 REST + Strategy
4. 單元測試覆蓋率 > 80%

### Phase 2: WebSocket 即時
5. `BitfinexWebSocket` — 連線 + 訂閱 + 事件解析
6. 前景即時策略執行
7. Offer/Credit 追蹤

### Phase 3: 背景服務
8. Android Foreground Service
9. iOS BGAppRefreshTask
10. 本地通知

### Phase 4: UI
11. Setup 頁（API key 輸入 + 驗證）
12. Dashboard（即時狀態）
13. Offers 列表
14. Logs 頁

### Phase 5: 上架準備
15. 風險免責 UI
16. ASO metadata
17. 商店截圖
18. 提交審核
