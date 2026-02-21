# Flutter + Backend Full Audit Report

> Date: 2026-02-01

## P0 - Critical (Directly affects production users)

### 1. Password Reset path mismatch
- **Flutter**: `POST /auth/password/reset` (`auth_repository.dart:109`)
- **Backend**: `POST /api/v1/auth/forgot-password` (`main.go:316`)
- **Impact**: Forgot password returns 404

### 2. Password Change path mismatch
- **Flutter**: `PUT /users/me/password` (`auth_repository.dart:153`)
- **Backend**: `POST /api/v1/auth/change-password` (`main.go:331`)
- **Impact**: Change password completely broken (wrong method + path)

### 3. TOTP QR Code field mismatch
- **Flutter** reads: `json['qr_code_url']` (`auth_repository.dart:249`)
- **Backend** sends: `qr_url` (`auth/handler.go:334`)
- **Impact**: 2FA setup QR code always null

### 4. TOTP Login flow mismatch
- **Backend**: Returns HTTP 401 + error code `TOTP_REQUIRED` (`handler.go:193`)
- **Flutter**: Expects HTTP 200 with `totp_required` + `temp_token` fields
- **Impact**: 2FA login flow completely broken

### 5. Auth Repository always uses MockAuthRepository
- **File**: `auth_repository.dart:10-14`
- Unlike other repositories that check `isDemoModeProvider`, auth always returns `MockAuthRepository`
- `getCurrentUser()` returns demo user data for ALL users
- `refreshToken()` returns fake token for ALL users
- **Impact**: Token refresh broken for real users

### 6. Profile save is fake
- **File**: `profile_edit_screen.dart:71-91`
- `saveProfile()` only does `Future.delayed(800ms)`, never calls `SettingsRepository.updateProfile()`
- **Impact**: Name changes appear to save but revert on re-login

### 7. Security Screen entirely fake
- **File**: `security_screen.dart:50-88`
- TOTP/Biometric states hardcoded to `false`, never reads from backend
- Toggle actions use `Future.delayed` with no API calls
- **Impact**: Shows incorrect 2FA status, toggles do nothing

## P1 - High (Incomplete features)

### 8. FCM Token leaked to production logs
- **File**: `push_notification_service.dart:192`
- `print('MY_FCM_TOKEN: $_fcmToken')` without `kDebugMode` guard
- **Impact**: Sensitive token in production logs

### 9. Notification service never triggers
- **File**: `main.go`
- `notificationService` created but not injected into worker pool
- Bot events (loan executed, high rate) never trigger push notifications
- Daily summary scheduler doesn't exist
- **Impact**: Push notifications are completely non-functional

### 10. Loan events not pushed via WebSocket
- **File**: `websocket/adapter.go`
- Only forwards `BotStatusChange`, `BotHeartbeat`, `BotError`
- `BroadcastLoanExecuted`/`BroadcastLoanClosed` defined but not in `EventBroadcaster` interface
- **Impact**: Frontend cannot show real-time loan status changes

### 11. Purchase Screen not localized
- **File**: `purchase_screen.dart:310-409`
- Hardcoded English: "Choose Billing Period", "No subscription options available", "By subscribing...", etc.
- **Impact**: Chinese users see English text in subscription flow

### 12. Help Screen search/chat fake
- **File**: `help_screen.dart:163, 583`
- Search `onSubmitted` has only `// TODO: Implement search`
- Chat Support shows SnackBar "Coming Soon"
- **Impact**: Features shown as available but non-functional

### 13. Avatar edit "Coming Soon"
- **File**: `profile_edit_screen.dart:277-295`
- Camera icon button visible but shows "Coming Soon" SnackBar
- **Impact**: Misleading UI

## P2 - Medium (Tech debt / inconsistencies)

### 14. Production print() leaks API content
- **File**: `api_client.dart:44` - prints ALL API requests including auth tokens
- **File**: `history_provider.dart:33,36,63,75` - prints API errors
- **Impact**: Sensitive data in production logs

### 15. Legal document date hardcoded
- **File**: `legal_screen.dart:116`
- Always shows `2024-12-01`, never updates
- **Impact**: May confuse users or cause App Store issues

### 16. Loan Sync endpoint returns placeholder
- **File**: `loan/handler.go:526-537`
- Returns `"pending"` status with message "Feature will be fully implemented"
- `LoanSyncer` exists but not wired to handler
- **Impact**: Low (Flutter doesn't call this endpoint yet)

### 17. Yearly savings calculation wrong
- **File**: `purchase_screen.dart:451-468`
- Uses `yearlyPrice / 10` as monthly estimate (should lookup actual monthly package)
- **Impact**: Incorrect savings percentage shown to users

### 18. Demo mode architecture inconsistent
- `authRepositoryProvider` always returns Mock (doesn't check `isDemoModeProvider`)
- All other repositories correctly use `isDemoModeProvider`
- **Impact**: Real users go through mock auth layer

### 19. isDemoModeProvider not reactive
- **File**: `demo_mode_service.dart:34-36`
- `DemoModeService._isDemoMode` is plain bool, not reactive state
- Switching accounts may leave stale mock state
- **Impact**: Repository may continue returning mock data after account switch

### 20. Executor.go simulation code residual
- **File**: `worker/executor.go:187-210`
- `DefaultExecutorFactory` creates simulated executor
- Production correctly uses `NewRealExecutorFactory` in `main.go:162`
- **Impact**: Low (correct factory in use), but confusing code structure

### 21. External help links may not exist
- **File**: `help_screen.dart:598, 632`
- `aa22396584@gmail.com` and `https://iml1s.github.io`
- These domains may not be configured
- **Impact**: Users clicking links get errors

### 22. ML Market Analysis card uses mock data
- **File**: `ml_market_analysis_card.dart:17-29`
- Always shows bullish/score 78, fake "LIVE" indicator
- Provider exists (`ml_providers.dart`) but widget hardcodes mock
- **Impact**: Low (card not currently used in Dashboard), but dangerous if added

## Fix Priority

```
Immediate (P0): #1-4 API path fixes, #5 Auth repo mock, #6-7 fake screens
Next sprint (P1): #8-10 notifications/websocket, #11 localization
Backlog (P2): #14-22 tech debt cleanup
```
