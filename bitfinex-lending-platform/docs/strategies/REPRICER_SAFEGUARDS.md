# Repricer Production Safeguards

## Overview

The Repricer module automatically adjusts stale lending offers to improve fill rates. This document describes the production safeguards implemented to prevent over-repricing and oscillation loops.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Repricer                            │
│  (internal/strategy/repricer.go)                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Max Reprices│  │  Cooldown   │  │  Dynamic Deadband   │ │
│  │   (3x max)  │  │  (2 hours)  │  │ max(rel,abs,minBps) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  Upward Repricing   │  │      FRR Floor              │  │
│  │ (2.5x asymmetric)   │  │  (never below FRR)          │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│    Production Bot           │  │     Backtesting             │
│  (platform/internal/worker/ │  │  (internal/backtest/        │
│   executor_real.go)         │  │   strategy_adapters.go)     │
│                             │  │                             │
│  - checkAndRepriceOffers()  │  │  - RepricerAdapter          │
│  - Cancels + resubmits      │  │  - Simulates repricing      │
│  - Real Bitfinex API        │  │  - No actual API calls      │
└─────────────────────────────┘  └─────────────────────────────┘
```

## Production Integration

The Repricer is integrated into the production bot via `RealLendingBotExecutor`:

```go
// In executeRealStrategy(), before creating new offers:
e.checkAndRepriceOffers(ctx, marketData)
```

### Reprice Flow (Production)

1. **Get Market Data** - Fetch current FRR and order book
2. **Update FRR** - `repricer.SetFRR(marketData.FRR)`
3. **Check Each Offer** - `repricer.CheckReprice(offer, book, minRate)`
4. **If ShouldReprice**:
   - Cancel old offer via Bitfinex API
   - Submit new offer with adjusted rate
   - `repricer.RecordReprice()` to update state
   - `repricer.TransferState()` to preserve history
5. **Cleanup** - Remove state for cancelled/filled offers

## Safeguard Mechanisms

### 1. MaxRepricesPerOffer (Default: 3)

Limits how many times a single offer can be repriced during its lifetime.

```go
if state.RepriceCount >= cfg.MaxRepricesPerOffer {
    return &RepriceDecision{Blocked: "max_reprices_reached"}
}
```

**Rationale**: Prevents infinite reprice loops where an offer keeps chasing the market.

### 2. RepriceCooldown (Default: 2 hours)

Minimum time between reprices for the same offer.

```go
if now.Sub(state.LastRepriceTime) < cfg.RepriceCooldown {
    return &RepriceDecision{Blocked: "cooldown"}
}
```

**Rationale**: Prevents rapid-fire repricing that wastes API calls and order book position.

### 3. Dynamic Deadband

Rate change must exceed a threshold to trigger repricing. The threshold scales dynamically:

```go
deadband := max(
    currentRate * DeadbandRelative,  // 2% of current rate
    DeadbandAbsolute,                 // 5 bps absolute floor
    DeadbandMinBps * 0.0001,          // 2 bps minimum
)
```

**Example at different rate levels**:
| Current Rate | Relative (2%) | Absolute | MinBps | Deadband Used |
|--------------|---------------|----------|--------|---------------|
| 0.10% (0.001) | 0.002% | 0.05% | 0.02% | 0.05% |
| 0.05% (0.0005) | 0.001% | 0.05% | 0.02% | 0.05% |
| 0.02% (0.0002) | 0.0004% | 0.05% | 0.02% | 0.05% |

**Rationale**: Prevents micro-adjustments that don't meaningfully improve fill probability.

### 4. Asymmetric Upward Repricing

When market rates rise, uses a higher threshold (2.5x) to trigger upward repricing:

```go
upwardDeadband := deadband * UpwardDeadbandFactor  // 2.5x = 5% vs 2%

if upwardGap >= upwardDeadband && staleMinutes >= UpwardMinStaleMins {
    // Reprice UP
}
```

**Rationale**:
- Downward repricing is aggressive (fill priority)
- Upward repricing is conservative (avoid chasing spikes)
- This asymmetry prevents oscillation loops

### 5. FRR Floor Protection

Never reprice below the Flash Return Rate:

```go
if cfg.UseFRRFloor && currentFRR > 0 {
    frrFloor = math.Max(minRate, currentFRR)
}
if newRate < frrFloor {
    newRate = frrFloor
}
```

**Rationale**: FRR represents fair market value; repricing below it sacrifices yield unnecessarily.

## Configuration

### Default Production Config (Updated 2025-12-20)

```yaml
repricer:
  enabled: true
  decay_lambda: 0.03              # Half-life ~23 minutes
  min_reprice_step: 0.0001        # 1 bps minimum change
  target_spread_bps: 2            # Target: best_rate + 2 bps
  max_stale_minutes: 120          # Force reprice after 2 hours

  # Anti-loop protection (relaxed based on competitor research)
  max_reprices_per_offer: 10      # Increased from 3
  reprice_cooldown_minutes: 30    # Reduced from 120 (2h)

  # Deadband
  deadband_relative: 0.02         # 2%
  deadband_absolute: 0.0005       # 5 bps
  deadband_min_bps: 2             # 2 bps floor

  # Upward repricing
  enable_upward_reprice: true
  upward_deadband_factor: 2.0     # Reduced from 2.5
  upward_min_stale_mins: 15       # Reduced from 30

  # FRR protection
  use_frr_floor: true
```

### Conservative Config (Recommended for Start)

```yaml
repricer:
  max_reprices_per_offer: 2       # More conservative
  reprice_cooldown_minutes: 240   # 4 hours
  deadband_relative: 0.03         # 3%
  upward_min_stale_mins: 60       # 1 hour before upward
```

### Aggressive Config (Higher Churn, May Reduce Fill Rate)

```yaml
repricer:
  max_reprices_per_offer: 5
  reprice_cooldown_minutes: 60    # 1 hour
  deadband_relative: 0.01         # 1%
  upward_deadband_factor: 1.5     # Lower asymmetry
```

## Backtest Results

### Parameter Comparison (Synthetic Data)

| Config | Total Offers | Fill Rate | Utilization | Rate Capture |
|--------|-------------|-----------|-------------|--------------|
| No Repricer | 30 | 100% | 94.53% | 1.12x |
| Aggressive | 40 | 65% | 88.87% | 1.10x |
| Conservative | 30 | 100% | 94.35% | 1.12x |
| Very Conservative | 30 | 100% | 95.02% | 1.13x |

**Conclusion**: Conservative settings maintain high fill rates while aggressive repricing reduces efficiency.

### Real Historical Data (2025/09-12)

| Config | Total Offers | Fill Rate | Utilization |
|--------|-------------|-----------|-------------|
| Baseline | 300 | 79.67% | 66.49% |
| Conservative Repricer | 570 | 32.63% | 59.66% |

## Thread Safety

All public methods are thread-safe using `sync.RWMutex`:

- **Read operations** (`CheckReprice`, `GetRepriceCount`): Use `RLock()`
- **Write operations** (`RecordReprice`, `TransferState`): Use `Lock()`

### Deadlock Prevention

```go
func (r *Repricer) RecordReprice(...) {
    now := r.getNow()  // Get time BEFORE lock (getNow needs RLock)
    r.mu.Lock()
    defer r.mu.Unlock()
    state.LastRepriceTime = now  // Use pre-fetched time
}
```

## API Reference

### Key Types

```go
type RepriceDecision struct {
    ShouldReprice bool
    Direction     string  // "down", "up", or "none"
    NewRate       float64
    Reason        string
    Blocked       string  // Why blocked (if any)
}

type OfferRepriceState struct {
    RepriceCount    int
    LastRepriceTime time.Time
    OriginalRate    float64
    LastDirection   string
}
```

### Key Methods

```go
// Check if offer should be repriced (with full decision info)
func (r *Repricer) CheckReprice(offer, book, minRate) *RepriceDecision

// Record that a reprice occurred (call AFTER successful reprice)
func (r *Repricer) RecordReprice(offerID, originalRate, direction)

// Transfer state when offer is replaced (cancel/new)
func (r *Repricer) TransferState(oldOfferID, newOfferID)

// Update FRR for floor protection
func (r *Repricer) SetFRR(frr float64)
```

## Production Observability

### INFO Level Logging (Added 2025-12-21)

Repricer now outputs INFO level logs for production monitoring:

```
[REPRICER] Checking offers for repricing
├── offers_to_check: 50   # Offers with proper FundingOffer type
├── skipped_offers: 0     # Offers skipped (FundingUpdate type)
├── total_offers: 50      # Total offers in activeOffers map
├── frr: 14.17 APR        # Current FRR (APR %)
├── best_ask_rate: 10.5   # Best market ask rate (APR %)
└── min_rate: 3.65 APR    # Configured minimum rate
```

**Monitor with:**
```bash
railway logs --service api -n 500 | grep "\[REPRICER\]"
```

### FundingUpdate Type Handling

WebSocket `FundingUpdate` events lack the `Created` timestamp required for stale detection. The Repricer handles this by:

1. **Skipping FundingUpdate types** - Logged as `skipped_offers`
2. **Periodic REST refresh** - `refreshActiveOffersFromREST()` fetches complete data

```go
case rootclient.FundingUpdate:
    // No Created timestamp - skip reprice check
    skippedCount++
```

### REST API Refresh

Before each reprice cycle, offers are refreshed from REST API to ensure complete data:

```go
// In executeRealStrategy()
e.refreshActiveOffersFromREST()  // Ensures Created timestamps
e.checkAndRepriceOffers(ctx, marketData)
```

## Review Status

| Reviewer | Status | Notes |
|----------|--------|-------|
| Gemini 3 Pro | ✅ Approved | Thread-safe, algorithm correct, production ready |
| Codex GPT-5.2 | ✅ Approved | Deadlock fix correct, patterns sound |
| Unit Tests | ✅ Pass | 27+ tests, race detector clean |
| Backtest | ✅ Pass | Integration verified with historical data |
| Production | ✅ Verified | 8+ offers repriced successfully (2025-12-21) |

## Version History

- **2025-12-21**: Observability & Type Handling Fixes
  - Added INFO level `[REPRICER]` diagnostic logging
  - Handle `FundingUpdate` type (no Created timestamp) by skipping
  - Added `refreshActiveOffersFromREST()` to ensure complete offer data
  - Added 2 new unit tests for type handling and logging
  - Verified in production: 8+ offers successfully repriced

- **2025-12-20**: Initial production implementation
  - Moved safeguards from RepricerAdapter to core Repricer
  - Added upward repricing with asymmetric hysteresis
  - Added dynamic deadband scaling
  - Fixed deadlock in RecordReprice

