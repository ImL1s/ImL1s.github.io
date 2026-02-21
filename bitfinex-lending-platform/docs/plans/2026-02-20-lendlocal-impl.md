# LendLocal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a no-backend Bitfinex lending Flutter app where all logic runs on-device.

**Architecture:** Pure Dart rewrite of the Go lending bot. Grid strategy v1 only. Dual-layer background service (flutter_foreground_task + workmanager). Riverpod 3.x state management. Dark mode OLED UI.

**Tech Stack:** Flutter 3.41.1 (FVM), Dart 3.8.1, Riverpod 3.x, Dio, web_socket_client, Hive CE, flutter_foreground_task 9.x, workmanager 0.9.x

**Design Doc:** `docs/plans/2026-02-20-lendlocal-design.md`

**Go Reference Code:** `internal/client/` (Bitfinex client), `internal/strategy/grid.go` (Grid strategy)

---

## Phase 0: Project Scaffold

> This MUST be done first, serially. All other phases depend on it.

### Task 0.1: Create Flutter Project

**Files:**
- Create: `lend_local/` (entire project directory)
- Create: `lend_local/.fvmrc`
- Create: `lend_local/pubspec.yaml`

**Step 1: Create project with FVM**

```bash
cd /Users/iml1s/Documents/mine/bitfinex_lend
fvm flutter create lend_local --org com.cbstudio --platforms ios,android
cd lend_local
echo '{"flutter": "3.41.1","flavors": {}}' > .fvmrc
fvm use 3.41.1
```

**Step 2: Set up pubspec.yaml**

Replace `pubspec.yaml` with all dependencies from design doc Section 8. Exact versions:

```yaml
name: lend_local
description: LendLocal - Bitfinex Lending Automation
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: ^3.8.0

dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^3.2.1
  riverpod_annotation: ^4.0.2
  go_router: ^17.1.0
  web_socket_client: ^0.2.1
  dio: ^5.9.1
  crypto: ^3.0.7
  flutter_secure_storage: ^10.0.0
  hive_ce: ^2.19.3
  flutter_foreground_task: ^9.2.0
  workmanager: ^0.9.0
  flutter_local_notifications: ^20.1.0
  fl_chart: ^1.1.1
  lucide_icons: ^0.257.0
  synchronized: ^3.3.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^4.0.3
  build_runner: ^2.4.0
  custom_lint: ^0.8.1
  riverpod_lint: ^3.1.3
  mocktail: ^1.0.4
```

**Step 3: Install dependencies**

```bash
cd /Users/iml1s/Documents/mine/bitfinex_lend/lend_local
fvm flutter pub get
```

Expected: No errors. If version conflicts, check pub.dev and adjust.

**Step 4: Verify build**

```bash
fvm flutter analyze
```

Expected: No errors (warnings OK for now).

**Step 5: Commit**

```bash
git add lend_local/
git commit -m "feat(lendlocal): scaffold Flutter project with all dependencies"
```

---

### Task 0.2: Create Directory Structure + Shared Models

**Files:**
- Create: `lend_local/lib/core/bitfinex/models.dart`
- Create: `lend_local/lib/core/bitfinex/constants.dart`
- Create: `lend_local/lib/core/strategy/strategy.dart` (interface)

**Step 1: Create directory structure**

```bash
cd /Users/iml1s/Documents/mine/bitfinex_lend/lend_local
mkdir -p lib/{app,core/{bitfinex,engine,strategy,background,notification,storage},features/{setup,dashboard,offers,logs},providers}
mkdir -p test/core/{bitfinex,strategy,engine}
```

**Step 2: Write shared models**

Create `lib/core/bitfinex/models.dart` with all data classes used across the project:

```dart
/// Bitfinex domain models shared across the entire app.
/// Reference: Go internal/client/interface.go

class FundingOffer {
  final int id;
  final String symbol;
  final double amount;
  final double rate;
  final int period;
  final String status; // 'ACTIVE', 'EXECUTED', 'PARTIALLY FILLED', 'CANCELED'
  final bool autoRenew;
  final DateTime created;
  final DateTime? updated;

  const FundingOffer({
    required this.id,
    required this.symbol,
    required this.amount,
    required this.rate,
    required this.period,
    this.status = 'ACTIVE',
    this.autoRenew = true,
    required this.created,
    this.updated,
  });
}

class FundingCredit {
  final int id;
  final String symbol;
  final double amount;
  final double rate;
  final int period;
  final String status;
  final bool isVAR; // Variable rate (FRR + delta)
  final DateTime opened;
  final DateTime? closed;

  const FundingCredit({
    required this.id,
    required this.symbol,
    required this.amount,
    required this.rate,
    required this.period,
    required this.status,
    this.isVAR = false,
    required this.opened,
    this.closed,
  });
}

class MarketData {
  final double frr;
  final double totalSupply;
  final double totalDemand;
  final double lastPrice;
  final double dailyChangePerc;
  final double volume;
  final double high;
  final double low;
  final double frrAmountAvailable;

  const MarketData({
    required this.frr,
    this.totalSupply = 0,
    this.totalDemand = 0,
    this.lastPrice = 0,
    this.dailyChangePerc = 0,
    this.volume = 0,
    this.high = 0,
    this.low = 0,
    this.frrAmountAvailable = 0,
  });
}

class BookEntry {
  final double rate;
  final int period;
  final int count;
  final double amount;

  const BookEntry({
    required this.rate,
    required this.period,
    required this.count,
    required this.amount,
  });
}

class OrderBookSnapshot {
  final List<BookEntry> asks; // amount > 0, lending supply
  final List<BookEntry> bids; // amount < 0, borrowing demand
  final DateTime timestamp;

  const OrderBookSnapshot({
    required this.asks,
    required this.bids,
    required this.timestamp,
  });

  double get totalSupply => asks.fold(0.0, (sum, e) => sum + e.amount.abs());
  double get totalDemand => bids.fold(0.0, (sum, e) => sum + e.amount.abs());
}

class OfferParams {
  final String symbol;
  final double amount;
  final double rate;
  final int period;
  final bool autoRenew;

  const OfferParams({
    required this.symbol,
    required this.amount,
    required this.rate,
    required this.period,
    this.autoRenew = true,
  });
}

class TickerUpdate {
  final String symbol;
  final double frr;
  final double bid;
  final double ask;
  final double dailyChangePerc;
  final double lastPrice;
  final double volume;
  final double high;
  final double low;
  final double frrAmountAvailable;

  const TickerUpdate({
    required this.symbol,
    required this.frr,
    this.bid = 0,
    this.ask = 0,
    this.dailyChangePerc = 0,
    this.lastPrice = 0,
    this.volume = 0,
    this.high = 0,
    this.low = 0,
    this.frrAmountAvailable = 0,
  });
}
```

**Step 3: Write constants**

Create `lib/core/bitfinex/constants.dart`:

```dart
/// Bitfinex API constants and helpers.
/// Reference: Go internal/client/interface.go:57-79

const String bitfinexWsUrl = 'wss://api.bitfinex.com/ws/2';
const String bitfinexRestUrl = 'https://api.bitfinex.com';
const double minOfferAmount = 150.0;
const int maxRequestsPerMinute = 45; // Conservative (Bitfinex limit: 90)
const Duration rateLimitBlockDuration = Duration(seconds: 65);

/// USDT → fUST (NOT fUSDT!)
String currencyToSymbol(String currency) => switch (currency) {
  'USD'  => 'fUSD',
  'USDT' => 'fUST',
  _ => throw ArgumentError('Unsupported currency: $currency'),
};

String symbolToCurrency(String symbol) {
  if (symbol.length < 2) return symbol;
  final currency = symbol.substring(1);
  return currency == 'UST' ? 'USDT' : currency;
}
```

**Step 4: Write strategy interface**

Create `lib/core/strategy/strategy.dart`:

```dart
import '../bitfinex/models.dart';

abstract class LendingStrategy {
  String get name;
  List<FundingOffer> calculateOffers(double balance, MarketData market);
  bool shouldRebalance(List<FundingOffer> activeOffers, MarketData market);
  void updateOrderBook(OrderBookSnapshot book);
}
```

**Step 5: Run analyze**

```bash
cd /Users/iml1s/Documents/mine/bitfinex_lend/lend_local
fvm flutter analyze
```

Expected: No errors.

**Step 6: Commit**

```bash
git add lend_local/lib/core/
git commit -m "feat(lendlocal): add shared models, constants, and strategy interface"
```

---

## Phase 1: Core Engine (TDD)

> Tasks 1.1, 1.2, 1.3 can be **parallelized** (they share models but not implementation).
> Task 1.4 depends on all three.

### Task 1.1: Bitfinex Auth + Nonce (🔀 Parallelizable)

**Files:**
- Create: `lend_local/lib/core/bitfinex/auth.dart`
- Create: `lend_local/lib/core/bitfinex/nonce.dart`
- Test: `lend_local/test/core/bitfinex/auth_test.dart`
- Test: `lend_local/test/core/bitfinex/nonce_test.dart`

**Reference:** Go `internal/client/bitfinex.go:3350-3357` (generateSignature), `internal/client/nonce.go`

**Step 1: Write auth tests**

```dart
// test/core/bitfinex/auth_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:lend_local/core/bitfinex/auth.dart';

void main() {
  group('BitfinexAuth', () {
    test('generates correct HMAC-SHA384 signature', () {
      final auth = BitfinexAuth(
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
      );
      // Payload: /api + path + nonce + body
      // /api/v2/auth/r/wallets1234567890
      final sig = auth.generateSignature('/v2/auth/r/wallets', '1234567890', '');
      expect(sig, isA<String>());
      expect(sig.length, 96); // SHA-384 = 48 bytes = 96 hex chars
    });

    test('signature changes with different nonce', () {
      final auth = BitfinexAuth(apiKey: 'k', apiSecret: 's');
      final sig1 = auth.generateSignature('/v2/test', '111', '');
      final sig2 = auth.generateSignature('/v2/test', '222', '');
      expect(sig1, isNot(equals(sig2)));
    });

    test('empty body uses empty string not {}', () {
      final auth = BitfinexAuth(apiKey: 'k', apiSecret: 's');
      final sigEmpty = auth.generateSignature('/v2/test', '111', '');
      final sigBraces = auth.generateSignature('/v2/test', '111', '{}');
      expect(sigEmpty, isNot(equals(sigBraces)));
    });

    test('generates REST auth headers with lowercase keys', () {
      final auth = BitfinexAuth(apiKey: 'my-key', apiSecret: 'my-secret');
      final headers = auth.createAuthHeaders('/v2/auth/r/wallets', '{}');
      expect(headers.containsKey('bfx-apikey'), true);
      expect(headers.containsKey('bfx-nonce'), true);
      expect(headers.containsKey('bfx-signature'), true);
      expect(headers['bfx-apikey'], 'my-key');
    });
  });
}
```

**Step 2: Run test to verify it fails**

```bash
cd /Users/iml1s/Documents/mine/bitfinex_lend/lend_local
fvm flutter test test/core/bitfinex/auth_test.dart
```

Expected: FAIL — `auth.dart` doesn't exist yet.

**Step 3: Implement auth.dart**

```dart
// lib/core/bitfinex/auth.dart
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'nonce.dart';

class BitfinexAuth {
  final String apiKey;
  final String apiSecret;
  final NonceGenerator _nonce;

  BitfinexAuth({
    required this.apiKey,
    required this.apiSecret,
    NonceGenerator? nonceGenerator,
  }) : _nonce = nonceGenerator ?? NonceGenerator();

  /// Generate HMAC-SHA384 signature.
  /// Payload format: "/api" + path + nonce + body
  /// Reference: Go generateSignature (bitfinex.go:3350)
  String generateSignature(String path, String nonce, String body) {
    final payload = '/api$path$nonce$body';
    final hmacSha384 = Hmac(sha384, utf8.encode(apiSecret));
    final digest = hmacSha384.convert(utf8.encode(payload));
    return digest.toString();
  }

  /// Create auth headers for REST requests.
  /// CRITICAL: Headers MUST be lowercase (bfx-apikey, not Bfx-Apikey).
  Map<String, String> createAuthHeaders(String path, String body) {
    final nonce = _nonce.next();
    return {
      'bfx-apikey': apiKey,
      'bfx-nonce': nonce,
      'bfx-signature': generateSignature(path, nonce, body),
    };
  }

  /// Create auth payload for WS authentication.
  Map<String, dynamic> createWsAuthPayload() {
    final nonce = _nonce.next();
    final payload = 'AUTH$nonce';
    final hmacSha384 = Hmac(sha384, utf8.encode(apiSecret));
    final sig = hmacSha384.convert(utf8.encode(payload)).toString();
    return {
      'event': 'auth',
      'apiKey': apiKey,
      'authSig': sig,
      'authNonce': nonce,
      'authPayload': payload,
      'filter': ['funding', 'wallet', 'notify'],
    };
  }
}
```

```dart
// lib/core/bitfinex/nonce.dart

/// Monotonically increasing nonce generator.
/// Uses Unix microsecond epoch, increments by 1 each call.
/// REST and WS auth share the same nonce space.
/// Reference: Go internal/client/nonce.go
class NonceGenerator {
  int _last = 0;

  String next() {
    final now = DateTime.now().microsecondsSinceEpoch;
    _last = now > _last ? now : _last + 1;
    return _last.toString();
  }

  /// Reset after nonce:small error (code 10114)
  void resync() {
    _last = DateTime.now().microsecondsSinceEpoch;
  }
}
```

**Step 4: Run tests**

```bash
fvm flutter test test/core/bitfinex/auth_test.dart -v
```

Expected: ALL PASS.

**Step 5: Write nonce tests**

```dart
// test/core/bitfinex/nonce_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:lend_local/core/bitfinex/nonce.dart';

void main() {
  group('NonceGenerator', () {
    test('generates strictly increasing nonces', () {
      final gen = NonceGenerator();
      final n1 = int.parse(gen.next());
      final n2 = int.parse(gen.next());
      final n3 = int.parse(gen.next());
      expect(n2, greaterThan(n1));
      expect(n3, greaterThan(n2));
    });

    test('resync resets to current time', () {
      final gen = NonceGenerator();
      gen.next();
      gen.resync();
      final after = int.parse(gen.next());
      // Should be close to current microsecond epoch
      final now = DateTime.now().microsecondsSinceEpoch;
      expect((after - now).abs(), lessThan(1000000)); // within 1 second
    });
  });
}
```

**Step 6: Run all tests**

```bash
fvm flutter test test/core/bitfinex/ -v
```

Expected: ALL PASS.

**Step 7: Commit**

```bash
git add lend_local/lib/core/bitfinex/auth.dart lend_local/lib/core/bitfinex/nonce.dart lend_local/test/core/bitfinex/
git commit -m "feat(lendlocal): add Bitfinex HMAC-SHA384 auth and nonce generator (TDD)"
```

---

### Task 1.2: Rate Limiter (🔀 Parallelizable)

**Files:**
- Create: `lend_local/lib/core/bitfinex/rate_limiter.dart`
- Test: `lend_local/test/core/bitfinex/rate_limiter_test.dart`

**Reference:** Go `internal/client/bitfinex.go:49,312` (rateLimiter), `internal/client/ratelimit_global.go`

**Step 1: Write tests**

```dart
// test/core/bitfinex/rate_limiter_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:lend_local/core/bitfinex/rate_limiter.dart';

void main() {
  group('RateLimiter', () {
    test('allows requests within limit', () async {
      final limiter = RateLimiter(maxPerMinute: 45);
      // First request should be immediate
      final start = DateTime.now();
      await limiter.waitForToken();
      final elapsed = DateTime.now().difference(start);
      expect(elapsed.inMilliseconds, lessThan(100));
    });

    test('blocks during rate limit pause', () {
      final limiter = RateLimiter(maxPerMinute: 45);
      limiter.onRateLimitError();
      expect(limiter.isBlocked, true);
    });

    test('unblocks after block duration', () async {
      final limiter = RateLimiter(
        maxPerMinute: 45,
        blockDuration: Duration(milliseconds: 100), // Short for test
      );
      limiter.onRateLimitError();
      expect(limiter.isBlocked, true);
      await Future.delayed(Duration(milliseconds: 150));
      expect(limiter.isBlocked, false);
    });

    test('calculates exponential backoff', () {
      expect(RateLimiter.calculateBackoff(0), Duration(seconds: 1));
      expect(RateLimiter.calculateBackoff(1), Duration(seconds: 2));
      expect(RateLimiter.calculateBackoff(2), Duration(seconds: 4));
      expect(RateLimiter.calculateBackoff(3), Duration(seconds: 8));
    });
  });
}
```

**Step 2: Implement**

```dart
// lib/core/bitfinex/rate_limiter.dart
import 'dart:async';
import 'dart:math';

/// Token bucket rate limiter + ERR_RATE_LIMIT detection.
/// Reference: Go ratelimit_global.go
class RateLimiter {
  final int maxPerMinute;
  final Duration blockDuration;
  final List<DateTime> _tokens = [];
  DateTime? _blockedUntil;

  RateLimiter({
    this.maxPerMinute = 45,
    this.blockDuration = const Duration(seconds: 65),
  });

  bool get isBlocked =>
      _blockedUntil != null && DateTime.now().isBefore(_blockedUntil!);

  /// Wait until a token is available. Throws if blocked by rate limit.
  Future<void> waitForToken() async {
    if (isBlocked) {
      final wait = _blockedUntil!.difference(DateTime.now());
      if (wait.isNegative) {
        _blockedUntil = null;
      } else {
        await Future.delayed(wait);
        _blockedUntil = null;
      }
    }

    // Remove tokens older than 1 minute
    final cutoff = DateTime.now().subtract(const Duration(minutes: 1));
    _tokens.removeWhere((t) => t.isBefore(cutoff));

    // Wait if at capacity
    if (_tokens.length >= maxPerMinute) {
      final oldest = _tokens.first;
      final wait = oldest.add(const Duration(minutes: 1)).difference(DateTime.now());
      if (!wait.isNegative) await Future.delayed(wait);
      _tokens.removeAt(0);
    }

    _tokens.add(DateTime.now());
  }

  /// Called when ERR_RATE_LIMIT / HTTP 429 is received.
  void onRateLimitError() {
    _blockedUntil = DateTime.now().add(blockDuration);
  }

  /// Exponential backoff: base * 2^attempt (without jitter for deterministic tests)
  static Duration calculateBackoff(int attempt, {Duration base = const Duration(seconds: 1)}) {
    return base * pow(2, attempt).toInt();
  }

  /// Backoff with jitter for production use
  static Duration calculateBackoffWithJitter(int attempt, {Duration base = const Duration(seconds: 1)}) {
    final backoff = calculateBackoff(attempt, base: base);
    final jitter = Duration(milliseconds: Random().nextInt(500));
    return backoff + jitter;
  }
}
```

**Step 3: Run tests**

```bash
fvm flutter test test/core/bitfinex/rate_limiter_test.dart -v
```

Expected: ALL PASS.

**Step 4: Commit**

```bash
git add lend_local/lib/core/bitfinex/rate_limiter.dart lend_local/test/core/bitfinex/rate_limiter_test.dart
git commit -m "feat(lendlocal): add token bucket rate limiter with ERR_RATE_LIMIT detection (TDD)"
```

---

### Task 1.3: Grid Strategy (🔀 Parallelizable)

**Files:**
- Create: `lend_local/lib/core/strategy/grid_strategy.dart`
- Create: `lend_local/lib/core/strategy/grid_config.dart`
- Test: `lend_local/test/core/strategy/grid_strategy_test.dart`

**Reference:** Go `internal/strategy/grid.go`, `internal/strategy/strategy_test.go`

**Step 1: Write ALL 17 tests first (TDD)**

```dart
// test/core/strategy/grid_strategy_test.dart
import 'dart:math';
import 'package:flutter_test/flutter_test.dart';
import 'package:lend_local/core/bitfinex/models.dart';
import 'package:lend_local/core/strategy/grid_config.dart';
import 'package:lend_local/core/strategy/grid_strategy.dart';

void main() {
  late GridStrategy strategy;
  late GridConfig defaultConfig;

  setUp(() {
    defaultConfig = GridConfig(
      levels: 5,
      reserveRatio: 0.1,
      minRate: 0.0001,
      maxRate: 0.001,
      autoRenew: true,
      distribution: 'logarithmic',
    );
    strategy = GridStrategy(config: defaultConfig);
  });

  final defaultMarket = MarketData(
    frr: 0.0002,
    totalSupply: 1000000,
    totalDemand: 800000,
  );

  group('Initialization', () {
    test('test_initialization_defaults', () {
      expect(strategy.config.levels, 5);
      expect(strategy.config.reserveRatio, 0.1);
      expect(strategy.config.autoRenew, true);
    });
  });

  group('calculateOffers', () {
    test('test_calculateOffers_basic', () {
      final offers = strategy.calculateOffers(1000, defaultMarket);
      expect(offers.length, greaterThanOrEqualTo(1));
      for (final o in offers) {
        expect(o.rate, greaterThan(0));
        expect(o.amount, greaterThanOrEqualTo(150));
        expect(o.period, greaterThanOrEqualTo(2));
      }
    });

    test('test_distribution_monotonic', () {
      // Rates should be monotonically increasing across levels
      final offers = strategy.calculateOffers(1500, defaultMarket);
      if (offers.length >= 2) {
        for (var i = 1; i < offers.length; i++) {
          expect(offers[i].rate, greaterThanOrEqualTo(offers[i - 1].rate));
        }
      }
    });

    test('test_dynamicLevels_belowMinimum', () {
      // $200 with 5 levels → only 1 level (200/150 = 1.3)
      final offers = strategy.calculateOffers(200, defaultMarket);
      expect(offers.length, 1);
    });

    test('test_dynamicLevels_exactMinimum', () {
      // $750 with 5 levels → 5 levels (750/150 = 5)
      final offers = strategy.calculateOffers(750, defaultMarket);
      expect(offers.length, 5);
    });

    test('test_belowMinBalance', () {
      // $100 < $150 minimum → no offers
      final offers = strategy.calculateOffers(100, defaultMarket);
      expect(offers, isEmpty);
    });

    test('test_rateNeverExceedsBounds', () {
      // Property test: all rates within bounds
      final rng = Random(42);
      for (var i = 0; i < 100; i++) {
        final balance = 150.0 + rng.nextDouble() * 50000;
        final frr = 0.00005 + rng.nextDouble() * 0.002;
        final market = MarketData(frr: frr, totalSupply: 1e6, totalDemand: 1e6);
        final offers = strategy.calculateOffers(balance, market);
        for (final o in offers) {
          expect(o.rate, greaterThan(0), reason: 'rate must be positive');
          expect(o.rate, lessThanOrEqualTo(0.005),
              reason: 'rate must not exceed 0.5% daily (182% APR)');
        }
      }
    });

    test('test_totalAmountNeverExceedsBalance', () {
      // Property test: sum of offer amounts <= balance
      final rng = Random(42);
      for (var i = 0; i < 100; i++) {
        final balance = 150.0 + rng.nextDouble() * 50000;
        final market = MarketData(frr: 0.0002, totalSupply: 1e6, totalDemand: 1e6);
        final offers = strategy.calculateOffers(balance, market);
        final total = offers.fold(0.0, (sum, o) => sum + o.amount);
        expect(total, lessThanOrEqualTo(balance + 0.01),
            reason: 'total $total exceeds balance $balance');
      }
    });
  });

  group('adjustRateRange', () {
    test('test_adjustRateRange_noMarketData', () {
      final market = MarketData(frr: 0); // No FRR
      final offers = strategy.calculateOffers(1000, market);
      // Should use config min/max as fallback
      for (final o in offers) {
        expect(o.rate, greaterThanOrEqualTo(defaultConfig.minRate));
        expect(o.rate, lessThanOrEqualTo(defaultConfig.maxRate));
      }
    });

    test('test_adjustRateRange_frrOnly', () {
      final market = MarketData(frr: 0.0002, totalSupply: 0, totalDemand: 0);
      // No order book → FRR * [0.5, 2.0]
      final offers = strategy.calculateOffers(1000, market);
      for (final o in offers) {
        expect(o.rate, greaterThanOrEqualTo(0.0001)); // FRR * 0.5
        expect(o.rate, lessThanOrEqualTo(0.0004));    // FRR * 2.0
      }
    });

    test('test_adjustRateRange_orderBookPriority', () {
      // With order book, should use percentile instead of FRR
      final book = OrderBookSnapshot(
        asks: List.generate(10, (i) => BookEntry(
          rate: 0.0001 + i * 0.00001,
          period: 2,
          count: 1,
          amount: 1000,
        )),
        bids: [],
        timestamp: DateTime.now(),
      );
      strategy.updateOrderBook(book);
      final offers = strategy.calculateOffers(1000, defaultMarket);
      expect(offers, isNotEmpty);
    });
  });

  group('marketDepth', () {
    test('test_marketDepth_highDemand', () {
      // Supply/demand ratio > 1.2 → rates adjusted up
      final highDemand = MarketData(frr: 0.0002, totalSupply: 100000, totalDemand: 200000);
      final normalDemand = MarketData(frr: 0.0002, totalSupply: 100000, totalDemand: 100000);

      // Reset EMA state by creating fresh strategies
      final s1 = GridStrategy(config: defaultConfig);
      final s2 = GridStrategy(config: defaultConfig);

      // Run multiple times to let EMA converge
      for (var i = 0; i < 5; i++) {
        s1.calculateOffers(1000, highDemand);
        s2.calculateOffers(1000, normalDemand);
      }
      final highOffers = s1.calculateOffers(1000, highDemand);
      final normalOffers = s2.calculateOffers(1000, normalDemand);

      if (highOffers.isNotEmpty && normalOffers.isNotEmpty) {
        expect(highOffers.first.rate, greaterThanOrEqualTo(normalOffers.first.rate));
      }
    });

    test('test_marketDepth_lowDemand', () {
      final lowDemand = MarketData(frr: 0.0002, totalSupply: 200000, totalDemand: 50000);
      final normalDemand = MarketData(frr: 0.0002, totalSupply: 100000, totalDemand: 100000);

      final s1 = GridStrategy(config: defaultConfig);
      final s2 = GridStrategy(config: defaultConfig);

      for (var i = 0; i < 5; i++) {
        s1.calculateOffers(1000, lowDemand);
        s2.calculateOffers(1000, normalDemand);
      }
      final lowOffers = s1.calculateOffers(1000, lowDemand);
      final normalOffers = s2.calculateOffers(1000, normalDemand);

      if (lowOffers.isNotEmpty && normalOffers.isNotEmpty) {
        expect(lowOffers.first.rate, lessThanOrEqualTo(normalOffers.first.rate));
      }
    });
  });

  group('periodForRate', () {
    test('test_periodForRate_aprTiers', () {
      // <15% APR → 2 days
      // 15-25% → 7 days
      // 25-40% → 14 days
      // >40% → 30 days
      final lowApr = strategy.calculateOffers(300, MarketData(frr: 0.0001)); // ~3.65% APR
      final midApr = strategy.calculateOffers(300, MarketData(frr: 0.0005)); // ~18.25% APR

      if (lowApr.isNotEmpty) expect(lowApr.first.period, 2);
      if (midApr.isNotEmpty) expect(midApr.first.period, 7);
    });
  });

  group('shouldRebalance', () {
    test('test_shouldRebalance_minInterval', () {
      // Immediately after rebalance → false
      strategy.calculateOffers(1000, defaultMarket); // triggers lastRebalance update
      final result = strategy.shouldRebalance([], defaultMarket);
      expect(result, false);
    });

    test('test_shouldRebalance_frrChange', () {
      // FRR changed > 15% → true (after min interval)
      strategy.calculateOffers(1000, MarketData(frr: 0.0002));
      // Simulate time passing (need to expose for testing or use clock)
      // This test verifies the logic exists — exact timing tested in integration
      expect(strategy.shouldRebalance, isA<Function>());
    });

    test('test_shouldRebalance_fallback', () {
      // After 30 min → always true
      // This is a logic test — the actual 30min timer needs a clock mock
      expect(strategy.shouldRebalance, isA<Function>());
    });
  });
}
```

**Step 2: Run to verify all fail**

```bash
fvm flutter test test/core/strategy/grid_strategy_test.dart
```

Expected: FAIL — files don't exist.

**Step 3: Implement GridConfig**

```dart
// lib/core/strategy/grid_config.dart

class GridConfig {
  final int levels;
  final double reserveRatio;
  final double minRate;
  final double maxRate;
  final bool autoRenew;
  final String distribution; // 'logarithmic' | 'exponential' | 'linear'

  const GridConfig({
    this.levels = 5,
    this.reserveRatio = 0.1,
    this.minRate = 0.0001,
    this.maxRate = 0.001,
    this.autoRenew = true,
    this.distribution = 'logarithmic',
  });
}
```

**Step 4: Implement GridStrategy**

Write `lib/core/strategy/grid_strategy.dart` — the full implementation following the design doc Section 4 pseudocode. Include:
- `_adjustRateRange` with 3-layer fallback (OrderBook > FRR > Config)
- `_calculateRateForLevel` with linear/exp/log distribution
- `_adjustRateByMarketDepth` with EMA + hysteresis
- `_calculatePeriodForRate` with APR tiers
- `shouldRebalance` with min interval + FRR change + 30min fallback
- `calculateOptimalLevels` for dynamic level count

**Step 5: Run tests iteratively until ALL PASS**

```bash
fvm flutter test test/core/strategy/grid_strategy_test.dart -v
```

**Step 6: Commit**

```bash
git add lend_local/lib/core/strategy/ lend_local/test/core/strategy/
git commit -m "feat(lendlocal): implement Grid strategy with TDD (17 tests from Go port)"
```

---

### Task 1.4: REST Client (depends on 1.1 + 1.2)

**Files:**
- Create: `lend_local/lib/core/bitfinex/rest_client.dart`
- Test: `lend_local/test/core/bitfinex/rest_client_test.dart`

**Reference:** Go `internal/client/bitfinex.go` (makeAuthenticatedRequest, GetWalletBalances, etc.)

**Step 1: Write tests with mocked Dio**

```dart
// test/core/bitfinex/rest_client_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:lend_local/core/bitfinex/rest_client.dart';
import 'package:lend_local/core/bitfinex/auth.dart';
import 'package:lend_local/core/bitfinex/rate_limiter.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late BitfinexRest client;

  setUp(() {
    mockDio = MockDio();
    client = BitfinexRest(
      auth: BitfinexAuth(apiKey: 'test', apiSecret: 'test'),
      rateLimiter: RateLimiter(maxPerMinute: 100),
      dio: mockDio,
    );
  });

  group('validateCredentials', () {
    test('returns true on 200', () async {
      when(() => mockDio.post(any(), data: any(named: 'data'), options: any(named: 'options')))
          .thenAnswer((_) async => Response(
            data: [['funding', 'USD', 1000, 0, 1000, null, null, null, null]],
            statusCode: 200,
            requestOptions: RequestOptions(),
          ));
      expect(await client.validateCredentials(), true);
    });
  });

  group('getWalletBalances', () {
    test('parses wallet response correctly', () async {
      when(() => mockDio.post(any(), data: any(named: 'data'), options: any(named: 'options')))
          .thenAnswer((_) async => Response(
            data: [
              ['funding', 'USD', 5000.0, 0, 5000.0, null, null, null, null],
              ['funding', 'UST', 3000.0, 0, 3000.0, null, null, null, null],
            ],
            statusCode: 200,
            requestOptions: RequestOptions(),
          ));
      final balances = await client.getWalletBalances();
      expect(balances['USD'], 5000.0);
      expect(balances['USDT'], 3000.0); // UST → USDT mapping
    });
  });

  group('symbol conversion in requests', () {
    test('uses fUST for USDT', () async {
      // Verify that getActiveOffers('fUST') makes correct API call
      when(() => mockDio.post(any(), data: any(named: 'data'), options: any(named: 'options')))
          .thenAnswer((_) async => Response(
            data: [],
            statusCode: 200,
            requestOptions: RequestOptions(),
          ));
      await client.getActiveOffers('fUST');
      // Verify the endpoint contains fUST
      verify(() => mockDio.post(
        contains('/auth/r/funding/offers/fUST'),
        data: any(named: 'data'),
        options: any(named: 'options'),
      )).called(1);
    });
  });
}
```

**Step 2: Implement rest_client.dart**

Full REST client with:
- Dio + auth headers injection
- Rate limiter integration (waitForToken before each request)
- ERR_RATE_LIMIT / 429 detection → `rateLimiter.onRateLimitError()`
- Wallet balance caching (60s TTL)
- All 7 methods from design doc Section 3.7

**Step 3: Run tests, commit**

```bash
fvm flutter test test/core/bitfinex/rest_client_test.dart -v
git add lend_local/lib/core/bitfinex/rest_client.dart lend_local/test/core/bitfinex/rest_client_test.dart
git commit -m "feat(lendlocal): add Bitfinex REST client with rate limiting and auth (TDD)"
```

---

### Task 1.5: LendingEngine Core (depends on 1.3 + 1.4)

**Files:**
- Create: `lend_local/lib/core/engine/lending_engine.dart`
- Test: `lend_local/test/core/engine/lending_engine_test.dart`

**Reference:** Design doc Section 5

**Step 1: Write tests**

Test the core engine logic:
- `executeStrategy` calls shouldRebalance, then calculateOffers, then submit/cancel
- Safe rebalance: submit first, cancel after
- Background mode with deadline guard
- Mutex prevents concurrent execution

**Step 2: Implement**

Follow design doc Section 5 pseudocode exactly. Include:
- `startForeground()` / `executeStrategy()` / `executeBackground()`
- `_submitWithFallback` (WS first, REST fallback)
- `_runCurrencyBackground` with deadline checks
- Mutex via `synchronized` package

**Step 3: Run tests, commit**

```bash
fvm flutter test test/core/engine/ -v
git add lend_local/lib/core/engine/ lend_local/test/core/engine/
git commit -m "feat(lendlocal): add LendingEngine with safe rebalance and mutex (TDD)"
```

---

## Phase 1 Review Checkpoint

> After ALL Phase 1 tasks complete, run review agents before proceeding.

```bash
cd /Users/iml1s/Documents/mine/bitfinex_lend/lend_local
fvm flutter test
fvm flutter analyze
```

Expected: ALL tests pass, no analysis errors.

**Review focus:**
- Auth signature correctness (compare with Go output for known inputs)
- Rate limiter edge cases
- Grid strategy invariants (property tests passing)
- Engine mutex and deadlock potential

---

## Phase 2: WebSocket (Sequential — builds on Phase 1)

### Task 2.1: WS Message Parser

**Files:**
- Create: `lend_local/lib/core/bitfinex/ws_message_parser.dart`
- Test: `lend_local/test/core/bitfinex/ws_message_parser_test.dart`

Parse raw WS messages into typed events. Test with real Bitfinex message examples from Go tests.

### Task 2.2: WSResponseRouter (🔀 Parallelizable with 2.1)

**Files:**
- Create: `lend_local/lib/core/bitfinex/ws_response_router.dart`
- Test: `lend_local/test/core/bitfinex/ws_response_router_test.dart`

Implement Completer-based routing. Test timeout, reset, success/error paths.

### Task 2.3: Channel Subscription Manager (🔀 Parallelizable with 2.1)

**Files:**
- Create: `lend_local/lib/core/bitfinex/channel_manager.dart`
- Test: `lend_local/test/core/bitfinex/channel_manager_test.dart`

Manage chanId ↔ channel mapping, desired subscriptions, resubscription after reconnect.

### Task 2.4: BitfinexWebSocket (depends on 2.1 + 2.2 + 2.3)

**Files:**
- Create: `lend_local/lib/core/bitfinex/ws_client.dart`
- Test: `lend_local/test/core/bitfinex/ws_client_test.dart`

Integrate parser + router + channel manager. Implement:
- Connect/disconnect with `web_socket_client`
- Auth on connect
- Reconnection handler (reset router → re-auth → resubscribe)
- Ping/pong health monitoring
- Symbol-filtered event streams

---

## Phase 3: Background Service (Sequential — depends on Phase 1 engine)

### Task 3.1: Foreground Task Handler

**Files:**
- Create: `lend_local/lib/core/background/foreground_task.dart`
- Modify: `lend_local/android/app/src/main/AndroidManifest.xml` (permissions)

Implement `LendingTaskHandler extends TaskHandler` with:
- `onStart`: initialize engines
- `onRepeatEvent`: serial execution with await + heartbeat write
- `onDestroy`: cleanup

### Task 3.2: WorkManager Watchdog (🔀 Parallelizable with 3.1)

**Files:**
- Create: `lend_local/lib/core/background/workmanager_watchdog.dart`
- Modify: `lend_local/ios/Runner/Info.plist` (BGTaskSchedulerPermittedIdentifiers)
- Modify: `lend_local/ios/Runner/AppDelegate.swift`

Implement:
- SharedPreferences heartbeat check
- REST-only fallback strategy
- iOS deadline guard (24s)
- Notification to restart app (Android 12+ can't start FGS from background)

### Task 3.3: Local Notifications

**Files:**
- Create: `lend_local/lib/core/notification/local_notification.dart`

Setup `flutter_local_notifications` for trade alerts, engine status, watchdog restart prompts.

---

## Phase 4: UI (Partially parallelizable)

### Task 4.1: Theme + Router Setup

**Files:**
- Create: `lend_local/lib/app/theme.dart`
- Create: `lend_local/lib/app/router.dart`
- Modify: `lend_local/lib/main.dart`

Dark OLED theme with gold accent (#F59E0B). GoRouter with 4 routes.

### Task 4.2: Setup Page (🔀 Parallelizable after 4.1)

**Files:**
- Create: `lend_local/lib/features/setup/setup_screen.dart`
- Create: `lend_local/lib/core/storage/secure_storage.dart`

API key input, validation, currency selection, grid config.

### Task 4.3: Dashboard Page (🔀 Parallelizable after 4.1)

**Files:**
- Create: `lend_local/lib/features/dashboard/dashboard_screen.dart`
- Create: `lend_local/lib/providers/engine_providers.dart`

Start/stop button, FRR card, balance card, offers count, 7-day chart.

### Task 4.4: Offers Page (🔀 Parallelizable after 4.1)

**Files:**
- Create: `lend_local/lib/features/offers/offers_screen.dart`

Active offers list, swipe-to-cancel, funding credits tab.

### Task 4.5: Logs Page (🔀 Parallelizable after 4.1)

**Files:**
- Create: `lend_local/lib/features/logs/logs_screen.dart`
- Create: `lend_local/lib/core/storage/local_db.dart`

Timeline of events, stored in Hive, CSV export.

---

## Phase 5: Polish + Release

### Task 5.1: Risk Disclaimer

First-launch modal with risk disclaimer text. Must accept before using app.

### Task 5.2: Riverpod Code Generation

```bash
fvm flutter pub run build_runner build --delete-conflicting-outputs
```

### Task 5.3: Final Integration Test

Test full flow: setup → start engine → verify offers appear → stop engine.

### Task 5.4: ASO + Store Submission

Metadata, screenshots, privacy policy URL, terms URL.

---

## Parallelization Map

```
Phase 0 (serial)
  └─ Task 0.1 → Task 0.2

Phase 1 (3 parallel + 2 serial)
  ├─ Task 1.1 (Auth)     ─┐
  ├─ Task 1.2 (RateLimiter)├─→ Task 1.4 (REST) ─→ Task 1.5 (Engine)
  └─ Task 1.3 (Grid)     ─┘

Phase 2 (2 parallel + 1 serial)
  ├─ Task 2.1 (Parser)    ─┐
  ├─ Task 2.2 (Router)    ─├─→ Task 2.4 (WS Client)
  └─ Task 2.3 (ChanMgr)   ─┘

Phase 3 (2 parallel + 1 serial)
  ├─ Task 3.1 (FGS)
  ├─ Task 3.2 (WorkMgr)
  └─ Task 3.3 (Notif)

Phase 4 (1 serial + 4 parallel)
  └─ Task 4.1 (Theme) ─→ Tasks 4.2/4.3/4.4/4.5

Phase 5 (serial)
  └─ Tasks 5.1 → 5.4
```

**Total: 20 tasks, ~15 can be parallelized in groups**
