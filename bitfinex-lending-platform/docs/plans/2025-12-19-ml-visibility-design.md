# ML 可見性增強設計文檔

**日期**: 2025-12-19
**狀態**: 已驗證，準備實現
**目標**: 讓 ML 功能在 Flutter App 和後台管理介面中可見，建立用戶信任並提供全局監控能力

## 1. 設計目標

- **建立信任**: 讓用戶看到 ML 正在工作，理解其價值
- **階層式設計**: Dashboard → Bot 詳情 → 通知，漸進式揭示細節
- **全局監控**: 後台管理員需要掌控所有 ML 狀態

## 2. 整體架構

```
┌─────────────────────────────────────────────────────────────┐
│                      Bot Executor                           │
│  (每次決策時更新 Redis Cache + 發布事件)                      │
└─────────────────────────────────────────────────────────────┘
                    │                          │
                    ▼                          ▼
         ┌──────────────────┐      ┌─────────────────────┐
         │   Redis Cache    │      │   Redis PubSub      │
         │  (狀態存儲)       │      │   (事件通知)         │
         └──────────────────┘      └─────────────────────┘
                    │                          │
                    ▼                          ▼
         ┌──────────────────┐      ┌─────────────────────┐
         │  ML Status API   │      │ WebSocket Broadcaster│
         │  (查詢端點)       │      │   (推送重要變化)      │
         └──────────────────┘      └─────────────────────┘
                    │                          │
                    └──────────┬───────────────┘
                               ▼
                    ┌──────────────────┐
                    │   Flutter App    │
                    │  (輪詢 + 推送)    │
                    └──────────────────┘
```

### 更新策略
- **輪詢**: 30秒-1分鐘，適用於一般狀態更新
- **WebSocket 推送**: 重大變化即時通知（情緒大幅變化、異常決策）

## 3. Redis Cache 結構

### Layer 1: 全局市場分析 (TTL 5分鐘)
```json
// Key: ml:market:{currency}
{
  "sentiment": "bullish",
  "sentiment_score": 78,
  "frr_current": 0.00025,
  "frr_trend": "rising",
  "frr_momentum_pct": 12.5,
  "supply_pressure": 38.8,
  "demand_pressure": 28.6,
  "recommended_action": "aggressive",
  "predicted_apr_low": 5.2,
  "predicted_apr_high": 6.8,
  "active_bots_count": 15,
  "ml_enabled_bots_count": 12,
  "avg_ml_boost_pct": 8.5,
  "updated_at": "2025-12-19T16:00:00Z"
}
```

### Layer 2: 個別 Bot ML 狀態 (TTL 10分鐘)
```json
// Key: ml:bot:{bot_id}
{
  "ml_enabled": true,
  "last_decision": {
    "action": "place_offers",
    "reason": "市場看漲，FRR 上升中",
    "adjusted_rate": 0.00028,
    "original_rate": 0.00025,
    "confidence": 85,
    "timestamp": "2025-12-19T15:58:00Z"
  },
  "decisions_today": 24,
  "ml_adjustments_today": 8,
  "performance": {
    "ml_boost_pct": 12.5,
    "avg_fill_rate": 0.85,
    "vs_baseline_apr": 1.2
  },
  "updated_at": "2025-12-19T15:58:00Z"
}
```

## 4. API 端點設計

### 4.1 市場分析 API (用戶端)
```
GET /api/v1/ml/market-analysis?currency=USD
Authorization: Bearer {token}

Response:
{
  "currency": "USD",
  "sentiment": "bullish",
  "sentiment_score": 78,
  "frr": {
    "current": 0.00025,
    "trend": "rising",
    "momentum_pct": 12.5
  },
  "pressure": {
    "supply": 38.8,
    "demand": 28.6
  },
  "recommendation": {
    "action": "aggressive",
    "predicted_apr_range": [5.2, 6.8]
  },
  "platform_stats": {
    "active_bots": 15,
    "ml_enabled_bots": 12,
    "avg_ml_boost_pct": 8.5
  },
  "updated_at": "2025-12-19T16:00:00Z"
}
```

### 4.2 Bot ML 狀態 API (用戶端)
```
GET /api/v1/bots/{id}/ml-status
Authorization: Bearer {token}

Response:
{
  "bot_id": "uuid",
  "ml_enabled": true,
  "last_decision": {
    "action": "place_offers",
    "reason": "市場看漲，FRR 上升中",
    "adjusted_rate": 0.00028,
    "confidence": 85,
    "timestamp": "2025-12-19T15:58:00Z"
  },
  "today_stats": {
    "decisions": 24,
    "ml_adjustments": 8
  },
  "performance": {
    "ml_boost_pct": 12.5,
    "avg_fill_rate": 0.85
  }
}
```

### 4.3 管理員全局監控 API
```
GET /api/v1/admin/ml/dashboard
Authorization: Bearer {admin_token}

Response:
{
  "system_health": {
    "status": "healthy",
    "model_version": "v1.2.0",
    "last_training": "2025-12-18T00:00:00Z",
    "cache_hit_rate": 0.95
  },
  "bot_stats": {
    "total_active": 45,
    "ml_enabled": 38,
    "ml_disabled": 7
  },
  "markets": {
    "USD": { /* market analysis */ },
    "USDT": { /* market analysis */ }
  },
  "recent_decisions": [
    {
      "bot_id": "uuid",
      "bot_name": "My Bot",
      "action": "adjust_rate",
      "details": "提高利率 +0.003%",
      "timestamp": "2025-12-19T15:58:00Z"
    }
  ],
  "alerts": []
}
```

### 4.4 手動刷新 API (管理員)
```
POST /api/v1/admin/ml/refresh-analysis
Authorization: Bearer {admin_token}
Body: { "currency": "USD" }

Response:
{ "success": true, "message": "Analysis refreshed" }
```

## 5. Flutter UI 設計

### 5.1 Dashboard - MlMarketAnalysisCard

位置: `lib/features/dashboard/presentation/widgets/ml_market_analysis_card.dart`

```dart
class MlMarketAnalysisCard extends ConsumerWidget {
  // 主要組件:
  // - Header: 標題 + Live 指示燈
  // - _SentimentGauge: 情緒分數圓環 (0-100)
  // - _FrrTrend: FRR 趨勢 + 動量
  // - _PressureBar: 供需壓力對比
  // - _Recommendation: AI 建議行動
  // - _PlatformStats: 平台統計 (啟用 ML 的 Bot 數)
}
```

設計要點:
- 使用 `AppColors.primaryGold` 作為主色
- Skeleton loader 加載狀態
- Live 指示燈脈衝動畫
- 漸層背景 `surfaceDark → surfaceLight`
- 字體: RobotoMono 用於數字

### 5.2 Bot 詳情頁 - MlBotStatusCard

位置: `lib/features/bots/presentation/widgets/ml_bot_status_card.dart`

插入位置: `bot_detail_screen.dart` 中 `_StatusActionCard` 和 `_StatsCard` 之間

```dart
class MlBotStatusCard extends StatelessWidget {
  // 主要組件:
  // - Header: ML 智能分析 + 啟用徽章
  // - _LastDecision: 最近決策詳情
  // - _TodayStats: 今日統計 (決策次數、ML調整次數)
  // - _PerformanceBoost: 收益提升百分比
}
```

設計要點:
- ML 未啟用時顯示提示引導開啟
- 決策原因使用 `AppColors.textSecondary`
- 信心度使用進度條顯示
- 收益提升使用 `AppColors.successGreen`

## 6. 後台管理儀表板設計

位置: `platform/internal/admin/templates/ml_dashboard.html`

技術: Go Template + HTMX

```html
<!-- 主要區塊 -->
<div class="ml-dashboard">
  <!-- 系統健康狀態 -->
  <div id="system-health" hx-get="/admin/ml/partials/health" hx-trigger="every 30s">
    <!-- 模型版本、快取命中率、最後訓練時間 -->
  </div>

  <!-- Bot 統計 -->
  <div id="bot-stats" hx-get="/admin/ml/partials/bot-stats" hx-trigger="every 30s">
    <!-- 總數、ML啟用數、禁用數 -->
  </div>

  <!-- 市場概覽 (USD/USDT) -->
  <div id="markets" hx-get="/admin/ml/partials/markets" hx-trigger="every 60s">
    <!-- 雙貨幣市場分析卡片 -->
  </div>

  <!-- 實時決策流 -->
  <div id="decisions" hx-get="/admin/ml/partials/decisions" hx-trigger="every 10s">
    <!-- 最近決策列表 -->
  </div>

  <!-- 警報 -->
  <div id="alerts" hx-get="/admin/ml/partials/alerts" hx-trigger="every 30s">
    <!-- 異常警報 -->
  </div>
</div>
```

配色方案 (與 Flutter 一致):
- 背景: `#080808` (backgroundDark)
- 卡片: `#121212` (surfaceDark)
- 主色: `#E5C76B` (primaryGold)
- 強調: `#FFB700` (accentAmber)
- 成功: `#00C853` (successGreen)
- 錯誤: `#FF5252` (errorRed)

## 7. 實現優先級

### P0 - 核心功能
1. Redis Cache 結構實現
2. Market Analysis API
3. Bot ML Status API
4. Flutter MlMarketAnalysisCard

### P1 - 用戶體驗
5. Flutter MlBotStatusCard
6. WebSocket 推送重大變化

### P2 - 管理功能
7. Admin ML Dashboard
8. 手動刷新 API

## 8. 文件變更清單

### 後端 (platform/)
- `internal/cache/ml_cache.go` - ML 快取操作
- `internal/bot/ml_handler.go` - ML API handlers
- `internal/bot/executor.go` - 更新快取邏輯
- `internal/admin/ml_dashboard.go` - 管理儀表板
- `internal/admin/templates/ml_dashboard.html` - 儀表板模板
- `cmd/api/main.go` - 註冊新路由

### Flutter (flutter_app/)
- `lib/features/ml/domain/models/` - ML 數據模型
- `lib/features/ml/data/repositories/` - ML Repository
- `lib/features/ml/presentation/providers/` - Riverpod Providers
- `lib/features/dashboard/presentation/widgets/ml_market_analysis_card.dart`
- `lib/features/bots/presentation/widgets/ml_bot_status_card.dart`
- `lib/features/bots/presentation/screens/bot_detail_screen.dart` - 整合 ML 卡片
