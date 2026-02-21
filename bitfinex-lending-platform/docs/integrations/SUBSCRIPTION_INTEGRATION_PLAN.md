# Flutter 多平台訂閱整合計畫

## 概述

本文件規劃 Flutter App (iOS/Android/Web) 的訂閱系統整合方案，支援三種支付渠道：
- **Web**: Stripe
- **iOS**: App Store In-App Purchase (IAP)
- **Android**: Google Play Billing

---

## 1. 平台費用比較

### 1.1 各平台手續費

| 平台 | 標準費率 | 小型開發者優惠 | 訂閱續約 |
|------|---------|---------------|---------|
| **Apple App Store** | 30% | 15% (收入 < $1M/年) | 15% (訂閱超過1年) |
| **Google Play** | 30% | 15% (收入 < $1M/年) | 15% (訂閱超過1年) |
| **Stripe** | 2.9% + $0.30 | - | 0.5% Billing 費用 |

### 1.2 我們的訂閱方案淨收入

以 Pro 方案 $4.99/月為例：

| 平台 | 手續費 | 我們收到 | 百分比 |
|------|--------|---------|--------|
| Web (Stripe) | ~$0.45 | ~$4.54 | 91% |
| iOS/Android (小型開發者) | ~$0.75 | ~$4.24 | 85% |
| iOS/Android (標準) | ~$1.50 | ~$3.49 | 70% |

**建議**：優先推廣 Web 訂閱以獲得最高利潤

---

## 2. 整合方案選擇

### 2.1 方案比較

| 方案 | 優點 | 缺點 | 費用 |
|------|-----|------|------|
| **RevenueCat** | 統一 API、跨平台訂閱同步、分析儀表板、Webhook | 額外費用、第三方依賴 | 免費至 $2.5K MTR，之後 1% |
| **DIY (自建)** | 完全控制、無額外費用 | 開發複雜、維護成本高 | 僅平台費用 |
| **Adapty** | 類似 RevenueCat | 較少社區支援 | 免費至 $10K MTR，之後 2.5% |

### 2.2 建議方案：DIY (已有完整後端)

**原因**：
1. ✅ 後端已有完整的 Stripe、App Store、Google Play 整合
2. ✅ 已實作所有 Webhook 處理邏輯
3. ✅ 節省 RevenueCat 1% 費用
4. ✅ 完全控制用戶數據

**我們的後端已具備**：
```
platform/internal/billing/
├── service.go      # 核心服務 (Stripe, App Store, Google Play)
├── handler.go      # HTTP handlers
├── appstore.go     # App Store Server API v2
├── googleplay.go   # Google Play Developer API v3
├── history.go      # 帳單歷史
└── sync.go         # 訂閱同步
```

---

## 3. 後端 API 端點 (已存在)

### 3.1 Stripe (Web)

```
POST /api/v1/billing/checkout          # 創建 Stripe Checkout Session
POST /api/v1/billing/webhook/stripe    # Stripe Webhook
POST /api/v1/billing/cancel            # 取消訂閱
POST /api/v1/billing/reactivate        # 重新激活
GET  /api/v1/billing/subscription      # 獲取訂閱狀態
GET  /api/v1/billing/plans             # 獲取方案列表
```

### 3.2 App Store (iOS)

```
POST /api/v1/billing/appstore/verify   # 驗證收據
POST /api/v1/billing/appstore/refresh  # 刷新訂閱狀態
POST /api/v1/billing/webhook/appstore  # App Store Server Notification v2
```

### 3.3 Google Play (Android)

```
POST /api/v1/billing/googleplay/verify   # 驗證購買
POST /api/v1/billing/googleplay/refresh  # 刷新訂閱狀態
POST /api/v1/billing/webhook/googleplay  # Google Play RTDN
```

### 3.4 通用

```
GET  /api/v1/billing/sync              # 同步訂閱狀態
GET  /api/v1/billing/info              # 訂閱詳細信息
GET  /api/v1/billing/history           # 帳單歷史
GET  /api/v1/billing/transaction/{id}  # 交易詳情
GET  /api/v1/billing/invoice/{id}      # 發票
```

---

## 4. Flutter 實作計畫

### 4.1 推薦套件

```yaml
# pubspec.yaml
dependencies:
  # iOS/Android IAP
  in_app_purchase: ^3.1.13
  # 或更簡化的
  purchases_flutter: ^6.29.0  # RevenueCat SDK (如選擇 RevenueCat)

  # Web Stripe
  flutter_stripe: ^10.1.1     # 僅支援 iOS/Android
  # Web 需使用 JS interop 或 redirect

  # 狀態管理
  riverpod: ^2.4.9
```

### 4.2 目錄結構

```
flutter_app/lib/features/subscription/
├── data/
│   ├── datasources/
│   │   ├── subscription_remote_datasource.dart
│   │   ├── iap_datasource.dart          # iOS/Android IAP
│   │   └── stripe_datasource.dart       # Web Stripe
│   ├── repositories/
│   │   └── subscription_repository_impl.dart
│   └── models/
│       ├── subscription_dto.dart
│       └── plan_dto.dart
├── domain/
│   ├── entities/
│   │   ├── subscription.dart
│   │   └── plan.dart
│   ├── repositories/
│   │   └── subscription_repository.dart
│   └── usecases/
│       ├── get_subscription_status.dart
│       ├── purchase_subscription.dart
│       ├── cancel_subscription.dart
│       └── restore_purchases.dart
└── presentation/
    ├── providers/
    │   └── subscription_provider.dart
    ├── pages/
    │   ├── subscription_page.dart
    │   ├── paywall_page.dart
    │   └── manage_subscription_page.dart
    └── widgets/
        ├── plan_card.dart
        ├── subscription_status_badge.dart
        └── billing_history_list.dart
```

### 4.3 核心服務實作

```dart
// lib/features/subscription/data/datasources/iap_datasource.dart
import 'package:in_app_purchase/in_app_purchase.dart';

class IAPDatasource {
  final InAppPurchase _iap = InAppPurchase.instance;

  // Product IDs (需與 App Store Connect / Google Play Console 配置一致)
  static const Set<String> _productIds = {
    'pro_monthly',      // com.yourapp.pro.monthly
    'pro_yearly',       // com.yourapp.pro.yearly
    'enterprise_monthly',
    'enterprise_yearly',
  };

  Future<bool> isAvailable() => _iap.isAvailable();

  Future<List<ProductDetails>> loadProducts() async {
    final response = await _iap.queryProductDetails(_productIds);
    if (response.error != null) {
      throw Exception(response.error!.message);
    }
    return response.productDetails;
  }

  Future<void> buySubscription(ProductDetails product) async {
    final purchaseParam = PurchaseParam(productDetails: product);
    await _iap.buyNonConsumable(purchaseParam: purchaseParam);
  }

  Stream<List<PurchaseDetails>> get purchaseStream => _iap.purchaseStream;

  Future<void> restorePurchases() => _iap.restorePurchases();
}
```

```dart
// lib/features/subscription/data/datasources/subscription_remote_datasource.dart
class SubscriptionRemoteDatasource {
  final ApiClient _client;

  // 獲取訂閱狀態
  Future<SubscriptionDto> getSubscription() async {
    final response = await _client.get('/billing/subscription');
    return SubscriptionDto.fromJson(response.data);
  }

  // 獲取方案列表
  Future<List<PlanDto>> getPlans() async {
    final response = await _client.get('/billing/plans');
    return (response.data as List)
        .map((e) => PlanDto.fromJson(e))
        .toList();
  }

  // iOS: 驗證 App Store 收據
  Future<SubscriptionDto> verifyAppStoreReceipt(String receiptData) async {
    final response = await _client.post('/billing/appstore/verify', data: {
      'receipt_data': receiptData,
    });
    return SubscriptionDto.fromJson(response.data);
  }

  // Android: 驗證 Google Play 購買
  Future<SubscriptionDto> verifyGooglePlayPurchase({
    required String productId,
    required String purchaseToken,
  }) async {
    final response = await _client.post('/billing/googleplay/verify', data: {
      'product_id': productId,
      'purchase_token': purchaseToken,
    });
    return SubscriptionDto.fromJson(response.data);
  }

  // Web: 創建 Stripe Checkout Session
  Future<String> createCheckoutSession(String planId) async {
    final response = await _client.post('/billing/checkout', data: {
      'plan_id': planId,
      'success_url': 'https://yourapp.com/billing/success',
      'cancel_url': 'https://yourapp.com/billing/cancel',
    });
    return response.data['checkout_url'];
  }

  // 取消訂閱
  Future<void> cancelSubscription() async {
    await _client.post('/billing/cancel');
  }

  // 恢復購買 (同步服務器狀態)
  Future<SubscriptionDto> syncSubscription() async {
    final response = await _client.get('/billing/sync');
    return SubscriptionDto.fromJson(response.data);
  }
}
```

### 4.4 Riverpod Provider

```dart
// lib/features/subscription/presentation/providers/subscription_provider.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'subscription_provider.g.dart';

@riverpod
class SubscriptionNotifier extends _$SubscriptionNotifier {
  @override
  FutureOr<Subscription?> build() async {
    return ref.read(subscriptionRepositoryProvider).getSubscription();
  }

  Future<void> purchase(Plan plan) async {
    state = const AsyncLoading();
    try {
      final subscription = await ref
          .read(subscriptionRepositoryProvider)
          .purchaseSubscription(plan);
      state = AsyncData(subscription);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> cancel() async {
    await ref.read(subscriptionRepositoryProvider).cancelSubscription();
    ref.invalidateSelf();
  }

  Future<void> restore() async {
    state = const AsyncLoading();
    try {
      final subscription = await ref
          .read(subscriptionRepositoryProvider)
          .restorePurchases();
      state = AsyncData(subscription);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

@riverpod
Future<List<Plan>> plans(PlansRef ref) {
  return ref.read(subscriptionRepositoryProvider).getPlans();
}
```

---

## 5. 平台特定配置

### 5.1 iOS App Store Connect

1. **創建訂閱群組** (Subscription Group)
   - 群組名稱: `Premium`

2. **創建訂閱產品**
   ```
   Product ID: com.bitfinexlend.pro.monthly
   名稱: Pro Monthly
   價格: $4.99/月

   Product ID: com.bitfinexlend.pro.yearly
   名稱: Pro Yearly
   價格: $49.99/年 (省 17%)

   Product ID: com.bitfinexlend.enterprise.monthly
   名稱: Enterprise Monthly
   價格: $14.99/月

   Product ID: com.bitfinexlend.enterprise.yearly
   名稱: Enterprise Yearly
   價格: $149.99/年 (省 17%)
   ```

3. **配置 Server Notification v2**
   - URL: `https://api.yourapp.com/api/v1/billing/webhook/appstore`

4. **配置 App Store Server API**
   - 創建 API Key (P8 文件)
   - 設定環境變數: `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_PRIVATE_KEY`

### 5.2 Google Play Console

1. **創建訂閱產品**
   ```
   Product ID: pro_monthly
   名稱: Pro Monthly
   價格: $4.99/月

   Product ID: pro_yearly
   名稱: Pro Yearly
   價格: $49.99/年

   Product ID: enterprise_monthly
   名稱: Enterprise Monthly
   價格: $14.99/月

   Product ID: enterprise_yearly
   名稱: Enterprise Yearly
   價格: $149.99/年
   ```

2. **配置 Real-time Developer Notifications (RTDN)**
   - 創建 Cloud Pub/Sub Topic
   - 設定 Push Subscription: `https://api.yourapp.com/api/v1/billing/webhook/googleplay`

3. **配置服務帳號**
   - 創建服務帳號 JSON
   - 設定環境變數: `GOOGLE_PLAY_SERVICE_ACCOUNT`

### 5.3 Stripe Dashboard

1. **創建產品和價格**
   ```
   Product: Pro Plan
   Price: price_pro_monthly ($4.99/月)
   Price: price_pro_yearly ($49.99/年)

   Product: Enterprise Plan
   Price: price_enterprise_monthly ($14.99/月)
   Price: price_enterprise_yearly ($149.99/年)
   ```

2. **配置 Webhook**
   - URL: `https://api.yourapp.com/api/v1/billing/webhook/stripe`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`

3. **設定環境變數**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

---

## 6. 跨平台訂閱同步

### 6.1 用戶識別策略

```
+-------------------+
|   User Account    |  (我們的 tenant_id)
+-------------------+
         |
         v
+-------------------+
|   Subscription    |  (單一訂閱記錄)
+-------------------+
         |
    +----+----+
    |    |    |
    v    v    v
Stripe  Apple  Google
Customer Trans  Token
ID      ID     ID
```

**關鍵**：用戶登入後，無論從哪個平台購買，都會關聯到同一個 `tenant_id`

### 6.2 同步流程

```mermaid
sequenceDiagram
    participant App
    participant Backend
    participant Store

    App->>Store: 購買訂閱
    Store-->>App: 購買成功 (receipt/token)
    App->>Backend: 驗證購買 (receipt/token)
    Backend->>Store: 驗證 (Server-to-Server)
    Store-->>Backend: 購買有效
    Backend->>Backend: 更新訂閱狀態
    Backend-->>App: 訂閱已激活

    Note over Backend: 後續由 Webhook 處理
    Store->>Backend: Webhook (續約/取消/過期)
    Backend->>Backend: 更新訂閱狀態
```

### 6.3 防止重複訂閱

```dart
Future<void> purchaseSubscription(Plan plan) async {
  // 1. 檢查是否已有活躍訂閱
  final current = await getSubscription();
  if (current != null && current.isActive) {
    // 已有訂閱，可能需要升級/降級
    if (current.provider != _currentPlatformProvider) {
      throw SubscriptionExistsOnOtherPlatformException(
        'You have an active subscription on ${current.provider}. '
        'Please manage it from that platform.',
      );
    }
  }

  // 2. 進行購買
  await _purchaseOnCurrentPlatform(plan);
}
```

---

## 7. UI 設計

### 7.1 Paywall 頁面

```
┌─────────────────────────────────────┐
│           🚀 Upgrade to Pro         │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ★ PRO                      │    │
│  │  $4.99/month                │    │
│  │                             │    │
│  │  ✓ 3 Bots                   │    │
│  │  ✓ All Strategies           │    │
│  │  ✓ Telegram Notifications   │    │
│  │  ✓ 90-day History           │    │
│  │                             │    │
│  │  [Subscribe]                │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ⭐ ENTERPRISE              │    │
│  │  $14.99/month               │    │
│  │                             │    │
│  │  ✓ Unlimited Bots           │    │
│  │  ✓ API Access               │    │
│  │  ✓ Priority Support         │    │
│  │  ✓ 365-day History          │    │
│  │                             │    │
│  │  [Subscribe]                │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Restore Purchases]                │
│                                     │
│  Terms • Privacy                    │
└─────────────────────────────────────┘
```

### 7.2 訂閱管理頁面

```
┌─────────────────────────────────────┐
│         Subscription                │
├─────────────────────────────────────┤
│                                     │
│  Current Plan: Pro                  │
│  Status: Active ✓                   │
│  Renews: Jan 15, 2026               │
│  Provider: App Store                │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [Upgrade to Enterprise]            │
│  [Cancel Subscription]              │
│  [Manage on App Store]              │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Billing History                    │
│  • Dec 15, 2025 - $4.99 ✓          │
│  • Nov 15, 2025 - $4.99 ✓          │
│  • Oct 15, 2025 - $4.99 ✓          │
│                                     │
└─────────────────────────────────────┘
```

---

## 8. 實作時程

### Phase 1: 基礎建設 (1-2 週)
- [ ] 創建 Flutter subscription feature 目錄結構
- [ ] 實作 domain entities 和 repository interfaces
- [ ] 實作 remote datasource (連接後端 API)
- [ ] 設定 Riverpod providers

### Phase 2: iOS IAP (1 週)
- [ ] App Store Connect 配置訂閱產品
- [ ] 實作 IAP datasource
- [ ] 整合 StoreKit
- [ ] 測試 Sandbox 環境

### Phase 3: Android Google Play (1 週)
- [ ] Google Play Console 配置訂閱產品
- [ ] 整合 Google Play Billing Library
- [ ] 配置 RTDN
- [ ] 測試購買流程

### Phase 4: Web Stripe (1 週)
- [ ] 實作 Stripe Checkout redirect
- [ ] 處理 success/cancel callbacks
- [ ] 整合 Customer Portal

### Phase 5: UI 和測試 (1-2 週)
- [ ] 實作 Paywall 頁面
- [ ] 實作訂閱管理頁面
- [ ] 實作帳單歷史頁面
- [ ] E2E 測試
- [ ] 提交審核

---

## 9. 關鍵注意事項

### 9.1 App Store 審核

1. **恢復購買按鈕**：必須提供「Restore Purchases」按鈕
2. **訂閱條款**：必須顯示訂閱條款和隱私政策
3. **價格顯示**：使用 `ProductDetails.price` 顯示本地化價格
4. **免費試用**：清楚說明試用期和轉換為付費的時間

### 9.2 Google Play 政策

1. **確認購買**：必須在 3 天內確認購買，否則會自動退款
2. **價格變更**：需要用戶主動同意價格變更
3. **暫停訂閱**：支援用戶暫停訂閱功能

### 9.3 安全考量

1. **服務器端驗證**：永遠在服務器端驗證購買，不要信任客戶端
2. **Receipt 存儲**：加密存儲 receipt/token，設定 `json:"-"` 不要暴露
3. **Webhook 簽名驗證**：驗證所有 Webhook 請求的簽名

---

## 10. 環境變數清單

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx

# Apple App Store
APPSTORE_KEY_ID=xxx
APPSTORE_ISSUER_ID=xxx
APPSTORE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APPSTORE_BUNDLE_ID=com.yourapp.bitfinexlend

# Google Play
GOOGLE_PLAY_PACKAGE_NAME=com.yourapp.bitfinexlend
GOOGLE_PLAY_SERVICE_ACCOUNT={"type":"service_account",...}
```

---

## 附錄：競品訂閱方案參考

| 競品 | 定價模式 | 支付方式 |
|------|---------|---------|
| **EarnUSD** | $3/月固定 | PayPal, Crypto |
| **Coinlend** | $8/月 + 5% 利潤分成 | Credit Card |
| **Cryptolend** | 免費 + 3% 利潤分成 | Crypto |
| **Altinvest** | $3/月 + 3% 利潤分成 | Credit Card, Crypto |

**我們的優勢**：
- 更透明的固定定價 (無利潤分成)
- 支援多平台支付 (Web, iOS, Android)
- 更多功能 (Telegram 通知、數據導出)
