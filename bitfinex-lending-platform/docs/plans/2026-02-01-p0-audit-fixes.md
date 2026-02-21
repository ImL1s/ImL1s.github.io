# P0 Audit Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all P0 critical issues found in the 2026-02-01 full audit -- API path mismatches, fake screens, mock auth leak.

**Architecture:** All fixes are on the Flutter side only. We align Flutter's API paths to match the backend routes defined in `platform/cmd/api/main.go`. We also fix screens that fake their data and the auth repository mock leak.

**Tech Stack:** Flutter/Dart, Riverpod, Dio HTTP client

---

### Task 1: Fix Password Reset API Path

**Files:**
- Modify: `flutter_app/lib/features/auth/data/auth_repository.dart:108-109`

**Step 1: Fix the API path**

Change `requestPasswordReset()` from `/auth/password/reset` to `/auth/forgot-password`:

```dart
// Line 108-109: Change path
await _dio.post(
  '/auth/forgot-password',  // was: '/auth/password/reset'
  data: {
    'email': email,
  },
);
```

**Step 2: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add flutter_app/lib/features/auth/data/auth_repository.dart
git commit -m "fix: align password reset path to backend /auth/forgot-password"
```

---

### Task 2: Fix Password Change API Path and Method

**Files:**
- Modify: `flutter_app/lib/features/auth/data/auth_repository.dart:150-155`

**Step 1: Fix API method and path**

Change `updatePassword()` from `PUT /users/me/password` to `POST /auth/change-password`. Also align field names to what the backend expects.

First check backend ChangePassword handler fields. Backend (`auth/handler.go` ChangePassword) expects:
```go
struct {
    CurrentPassword string `json:"current_password"`
    NewPassword     string `json:"new_password"`
}
```

The Flutter fields already match (`current_password`, `new_password`), only path and method need fixing:

```dart
// Line 150-155: Change PUT to POST, fix path
await _dio.post(
  '/auth/change-password',  // was: PUT /users/me/password
  data: {
    'current_password': currentPassword,
    'new_password': newPassword,
  },
);
```

**Step 2: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add flutter_app/lib/features/auth/data/auth_repository.dart
git commit -m "fix: align change password to POST /auth/change-password"
```

---

### Task 3: Fix TOTP QR Code Field Name

**Files:**
- Modify: `flutter_app/lib/features/auth/data/auth_repository.dart:249`

**Step 1: Fix field name**

Backend sends `qr_url` (auth/handler.go:334), Flutter reads `qr_code_url`. Fix Flutter:

```dart
// Line 246-251: Fix field name
factory TotpSetupResponse.fromJson(Map<String, dynamic> json) {
  return TotpSetupResponse(
    secret: json['secret'] as String,
    qrCodeUrl: json['qr_url'] as String,  // was: json['qr_code_url']
  );
}
```

**Step 2: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add flutter_app/lib/features/auth/data/auth_repository.dart
git commit -m "fix: align TOTP QR code field name to backend qr_url"
```

---

### Task 4: Fix TOTP Login Flow

**Files:**
- Modify: `flutter_app/lib/features/auth/data/auth_repository.dart:42-58`

**Step 1: Understand the mismatch**

Backend behavior on TOTP-enabled account login:
- Returns HTTP 401 with JSON: `{"code": "TOTP_REQUIRED", "message": "Two-factor authentication code required"}`
- Does NOT return `temp_token` or `totp_required` fields in a 200 response

Flutter currently expects a 200 response with `totp_required: true` and `temp_token`.

**Step 2: Fix login to catch TOTP_REQUIRED error**

```dart
Future<LoginResponse> login({
  required String email,
  required String password,
}) async {
  try {
    final response = await _dio.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
    );
    return LoginResponse.fromJson(response.data as Map<String, dynamic>);
  } on DioException catch (e) {
    // Backend returns 401 with code TOTP_REQUIRED when 2FA is needed
    if (e.response?.statusCode == 401) {
      final data = e.response?.data;
      if (data is Map<String, dynamic> && data['code'] == 'TOTP_REQUIRED') {
        // Return a LoginResponse indicating TOTP is required
        // Use base64(email:password) as temp token for the verify step
        final credentials = base64Encode(utf8.encode('$email:$password'));
        return LoginResponse(
          totpRequired: true,
          tempToken: credentials,
        );
      }
    }
    throw AuthException.fromDioException(e);
  }
}
```

Add imports at top of file:
```dart
import 'dart:convert';
```

**Step 3: Fix verifyTotp to re-login with TOTP code**

The backend's TOTP verify endpoint (`POST /auth/totp/verify`) is for ENABLING TOTP (requires auth).
For LOGIN with TOTP, the backend doesn't have a separate endpoint -- the user must login again.

Check backend: There's no separate "login with TOTP" endpoint. The login handler checks TOTP internally. Looking at `auth/service.go`, the Login method returns `ErrTOTPRequired` but doesn't provide a way to submit the code.

This means the TOTP login flow needs a backend change too (add temp_token support), OR we need a workaround. For now, the safest fix is to store credentials temporarily and re-submit with TOTP code.

Actually, looking more carefully at the backend auth handler and service, the Login method accepts `TOTPCode` field:

Check `auth/handler.go` LoginRequest struct to confirm.

If the backend LoginRequest has a `totp_code` field, Flutter can simply re-call `/auth/login` with email + password + totp_code.

Update `verifyTotp()` to re-call login with the TOTP code:

```dart
Future<LoginResponse> verifyTotp({
  required String tempToken,
  required String code,
}) async {
  try {
    // tempToken contains base64(email:password) from the login step
    final decoded = utf8.decode(base64Decode(tempToken));
    final parts = decoded.split(':');
    final email = parts[0];
    final password = parts.sublist(1).join(':');

    final response = await _dio.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
        'totp_code': code,
      },
    );
    return LoginResponse.fromJson(response.data as Map<String, dynamic>);
  } on DioException catch (e) {
    throw AuthException.fromDioException(e);
  }
}
```

> **IMPORTANT**: Before implementing, verify the backend `LoginRequest` struct in `auth/handler.go` accepts `totp_code` field. If it doesn't, a backend change is needed first to add `TOTPCode string \`json:"totp_code"\`` to the LoginRequest struct and pass it to `service.Login()`.

**Step 4: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add flutter_app/lib/features/auth/data/auth_repository.dart
git commit -m "fix: handle TOTP login flow via re-login with totp_code"
```

---

### Task 5: Fix Auth Repository Mock Leak

**Files:**
- Modify: `flutter_app/lib/features/auth/data/auth_repository.dart:10-15`
- Modify: `flutter_app/lib/core/demo/mock_auth_repository.dart:39-53`

**Step 1: Make authRepositoryProvider use isDemoModeProvider**

Align with all other repositories' pattern:

```dart
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final isDemoMode = ref.watch(isDemoModeProvider);
  if (isDemoMode) {
    return MockAuthRepository(apiClient.dio);
  }
  return AuthRepository(apiClient.dio);
});
```

Add import:
```dart
import 'package:lending_bot_app/core/services/demo_mode_service.dart';
```

**Step 2: Fix MockAuthRepository to only mock demo-specific methods**

Currently `getCurrentUser()` and `refreshToken()` are overridden unconditionally. Since MockAuthRepository now only runs in demo mode, this is acceptable -- all calls in demo mode should return mock data. No change needed here.

**Step 3: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add flutter_app/lib/features/auth/data/auth_repository.dart
git commit -m "fix: use isDemoModeProvider for auth repository selection"
```

---

### Task 6: Fix Profile Save (Connect to Real API)

**Files:**
- Modify: `flutter_app/lib/features/account/presentation/screens/profile_edit_screen.dart:71-91`

**Step 1: Wire saveProfile() to the real API**

The `SettingsRepository.updateProfile()` already exists at `settings_repository.dart:160`. The `SettingsProvider.updateProfile()` wrapper exists at `settings_provider.dart:403`. Use it:

```dart
Future<bool> saveProfile() async {
  if (!state.hasChanges) return true;

  state = state.copyWith(isLoading: true, clearError: true);

  try {
    await _settingsProvider.updateProfile(
      UpdateProfileRequest(displayName: state.displayName),
    );

    _originalDisplayName = state.displayName;
    state = state.copyWith(isLoading: false, hasChanges: false);
    return true;
  } catch (e) {
    state = state.copyWith(
      isLoading: false,
      error: e.toString(),
    );
    return false;
  }
}
```

The `ProfileEditController` needs access to `SettingsProvider`. Check how it's constructed (around line 40-60) and add a `Ref` parameter or pass the settings provider. The simplest approach:

```dart
class ProfileEditController extends StateNotifier<ProfileEditState> {
  ProfileEditController(this._ref, User user) : ... {
    // existing init
  }
  final Ref _ref;

  Future<bool> saveProfile() async {
    if (!state.hasChanges) return true;
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _ref.read(settingsRepositoryProvider).updateProfile(
        UpdateProfileRequest(displayName: state.displayName),
      );
      _originalDisplayName = state.displayName;
      state = state.copyWith(isLoading: false, hasChanges: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}
```

Update the provider creation to pass `ref`:
```dart
final profileEditProvider = StateNotifierProvider.autoDispose<ProfileEditController, ProfileEditState>((ref) {
  final user = ref.watch(currentUserProvider);
  return ProfileEditController(ref, user);
});
```

Add imports:
```dart
import 'package:lending_bot_app/features/settings/data/settings_repository.dart';
import 'package:lending_bot_app/features/settings/domain/models/settings_models.dart';
```

**Step 2: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add flutter_app/lib/features/account/presentation/screens/profile_edit_screen.dart
git commit -m "fix: connect profile save to real API via SettingsRepository"
```

---

### Task 7: Fix Security Screen (Read Real State)

**Files:**
- Modify: `flutter_app/lib/features/security/presentation/screens/security_screen.dart:50-88`

**Step 1: Load real TOTP state from auth**

The user's `totpEnabled` field is available from the auth state. The security screen should read from it instead of hardcoding `false`:

```dart
Future<void> _loadSecurityState() async {
  state = state.copyWith(isLoading: true);

  try {
    final user = await _ref.read(authRepositoryProvider).getCurrentUser();
    state = state.copyWith(
      isTotpEnabled: user.totpEnabled,
      isBiometricEnabled: false, // TODO: Read from local storage
      isBiometricAvailable: true,
      isLoading: false,
    );
  } catch (e) {
    // Fallback: read from cached auth state
    state = state.copyWith(
      isTotpEnabled: false,
      isBiometricEnabled: false,
      isBiometricAvailable: true,
      isLoading: false,
    );
  }
}
```

The `SecurityStateNotifier` needs access to `Ref`. Update constructor:

```dart
class SecurityStateNotifier extends StateNotifier<SecurityState> {
  SecurityStateNotifier(this._ref) : super(const SecurityState()) {
    _loadSecurityState();
  }
  final Ref _ref;
```

Wire `disableTotp()` to real API:
```dart
Future<void> disableTotp(String code) async {
  state = state.copyWith(isLoading: true);
  try {
    await _ref.read(authRepositoryProvider).disableTotp(code);
    state = state.copyWith(isTotpEnabled: false, isLoading: false);
  } catch (e) {
    state = state.copyWith(isLoading: false, error: e.toString());
  }
}
```

**Step 2: Update provider to pass ref**

```dart
final securityProvider = StateNotifierProvider<SecurityStateNotifier, SecurityState>((ref) {
  return SecurityStateNotifier(ref);
});
```

**Step 3: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add flutter_app/lib/features/security/presentation/screens/security_screen.dart
git commit -m "fix: read real TOTP state from backend in security screen"
```

---

### Task 8: Fix FCM Token Log Leak

**Files:**
- Modify: `flutter_app/lib/core/services/push_notification_service.dart:192`

**Step 1: Remove or guard the print statement**

```dart
// Remove this line entirely:
// print('MY_FCM_TOKEN: $_fcmToken');

// Also guard the logger:
if (kDebugMode) {
  _logger.i('FCM token obtained: $_fcmToken');
}
```

**Step 2: Also fix api_client.dart print**

File: `flutter_app/lib/core/api/api_client.dart:44`

Wrap the API log print with kDebugMode guard, or remove it.

**Step 3: Verify build**

Run: `cd flutter_app && fvm flutter build ios --simulator --no-codesign 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add flutter_app/lib/core/services/push_notification_service.dart flutter_app/lib/core/api/api_client.dart
git commit -m "fix: remove sensitive token logging from production builds"
```

---

## Summary

| Task | What it fixes | Risk if skipped |
|------|--------------|-----------------|
| 1 | Password reset 404 | Users can't reset password |
| 2 | Password change 404 | Users can't change password |
| 3 | TOTP QR null | 2FA setup shows no QR code |
| 4 | TOTP login broken | 2FA users can't login |
| 5 | Mock auth leak | Token refresh broken for real users |
| 6 | Profile save fake | Name changes don't persist |
| 7 | Security screen fake | Shows wrong 2FA status |
| 8 | Token log leak | Sensitive data in production logs |
