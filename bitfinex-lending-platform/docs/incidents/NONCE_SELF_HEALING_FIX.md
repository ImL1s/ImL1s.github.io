# Nonce Self-Healing 修復記錄

> 日期: 2026-02-20
> 嚴重性: **P0** — 生產環境放貸功能完全癱瘓

## 問題

2026-02-19 15:50 UTC 起，USD 和 USDT 兩個 bot 的所有 REST API 請求都失敗：

```
level=error msg="Failed to get wallet balances: failed after 3 retries due to nonce errors"
nonce: 1771004309974189 → "nonce: small"
```

## 根因

1. `MicroNonceGenerator` 在容器啟動時初始化為 `time.Now().UnixMicro()`
2. 之後每次呼叫只做 `atomic.AddUint64(&nonce, 1)`（+1）
3. 在 14:55~15:50 UTC 期間，有人從本機用相同 API key 跑了 API 測試
4. 本機的 nonce 使用了當下的 µs timestamp（比容器的 nonce 大 ~500 億）
5. Bitfinex 記錄了更大的 nonce，容器的 +1 永遠追不上 → **永久性故障**

## 修復

`internal/client/nonce.go` — `GetNonce()` 改用 CAS loop + `max(now, last+1)`：

```go
func (g *MicroNonceGenerator) GetNonce() string {
    for {
        now := uint64(time.Now().UnixMicro())
        old := atomic.LoadUint64(&g.nonce)
        next := old + 1
        if now > next {
            next = now
        }
        if atomic.CompareAndSwapUint64(&g.nonce, old, next) {
            return strconv.FormatUint(next, 10)
        }
    }
}
```

即使 nonce 落後，下次呼叫會自動跳到當前時間，**自動修復**。

## 測試

`internal/client/nonce_test.go`：

| 測試 | 說明 |
|------|------|
| `TestMicroNonceGenerator_Monotonic` | 1000 次呼叫嚴格遞增 |
| `TestMicroNonceGenerator_SelfHealing` | 模擬 7 天前啟動的 nonce，驗證自動跳到當前時間 |
| `TestMicroNonceGenerator_ConcurrentSafety` | 10 goroutine × 100 次，無重複 |
| `TestMicroNonceGenerator_AfterExternalAdvance` | 模擬外部推進 nonce 後的恢復 |

## 預防

- 不要在本機用生產 API key 跑測試
- Nonce 已自動修復，即使誤用也不會再永久壞掉
