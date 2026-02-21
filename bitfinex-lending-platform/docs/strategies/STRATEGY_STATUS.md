# 策略狀態報告

> 最後更新：2026-02-01

## 概要

目前只有 **Grid** 策略是生產可用的。其他策略（adaptive, adaptive_ml, frr, hybrid）的核心邏輯存在但配置管道不完整，已從 Flutter 前端隱藏。

## 各策略狀態

| 策略 | 核心邏輯 | UI 可配置 | 生產可用 | 前端顯示 |
|------|---------|----------|---------|---------|
| **grid** | 完整 | 完整 | 是 | 是 |
| **adaptive** | 有 bug | 否（硬編碼） | 否 | 已隱藏 |
| **adaptive_ml** | 依賴 ML 服務 | 否 | 否 | 已隱藏 |
| **frr** | 邏輯成熟 | 否（硬編碼） | 勉強 | 已隱藏 |
| **hybrid** | 架構完整 | 否（硬編碼） | 勉強 | 已隱藏 |

## 問題詳情

### 1. 配置管道斷裂

整條鏈從 Flutter UI → BotConfig model → executor 只為 Grid 設計：

- **Flutter `BotConfig.toJson()`** 只送 `min_rate`, `grid_levels`, `min_reserve`
- **後端 `BotConfig` struct** (`platform/pkg/models/bot.go`) 沒有 FRR/Adaptive/Hybrid 特定欄位
- **`executor_real.go:initializeStrategy()`** 對非 Grid 策略全部使用硬編碼預設值

### 2. Adaptive 策略 bug

- `adaptive.go`: `rateHistory` 切片永遠不會被填充（無任何 append 呼叫）
- `updatePerformanceScore()` 中 `if len(s.rateHistory) > 0` 永遠為 false
- 自適應學習機制實質上是空操作

### 3. Flutter 與後端策略類型不一致

| Flutter enum | 後端 StrategyType | 問題 |
|-------------|------------------|------|
| `frr_delta` | 不存在（是 hybrid 子策略） | API 不接受 |
| `top_book` | 不存在（是 hybrid 子策略） | API 不接受 |
| 缺少 | `adaptive_ml` | 前端無法選擇 |
| 缺少 | `hybrid` | 前端無法選擇 |

### 4. Executor 硬編碼參數

| 策略 | 硬編碼位置 | 硬編碼內容 |
|------|-----------|-----------|
| Adaptive | executor_real.go:370-378 | TargetUtilization=0.85, RiskFactor=0.5, SegmentCount=3 等 |
| FRR | executor_real.go:405-416 | FRRMultiplier=1.0, OfferCount=3, PeriodStrategy="dynamic" 等 |
| Hybrid | executor_real.go:427-473 | 三個子策略模板全部寫死 (passive 40%, active 30%, locking 30%) |

## 前端處理

- `bot_models.dart`: 新增 `availableStrategies` 列表，目前只包含 `grid`
- `bot_config_screen.dart`: 策略選擇器使用 `availableStrategies` 而非 `StrategyType.values`
- 枚舉值保留完整（為了解析後端已存在的 bot 回應）

## 若要啟用其他策略

需完成以下工作：

1. **後端 BotConfig 擴展**：加入策略特定參數欄位（或使用 `json.RawMessage` 彈性配置）
2. **Executor 去硬編碼**：從 BotConfig 讀取參數，而非使用寫死值
3. **Flutter UI**：根據策略類型動態顯示對應的配置表單
4. **修復 Adaptive bug**：實作 rateHistory 填充邏輯
5. **同步枚舉**：Flutter 和後端的策略類型對齊
