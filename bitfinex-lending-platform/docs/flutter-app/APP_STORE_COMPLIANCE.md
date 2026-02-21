# App Store Compliance Implementation

This document details the implementation of features required for App Store compliance, specifically addressing **Guideline 5.1.1 (Data Collection and Storage)** regarding account deletion and the accessibility of legal documents.

## 1. Overview

To meet App Store review guidelines, the following features were implemented:
1.  **Account Deletion**: A mechanism for users to delete their account from within the app, permanently removing or anonymizing their personal data.
2.  **Legal Documents**: Accessibility of Privacy Policy and Terms of Service within the app, linking to persistent web pages.

## 2. Implementation Details

### 2.1 Backend (Platform)

#### Account Deletion Strategy
We implemented a **Soft Delete** strategy to maintain data integrity while satisfying privacy requirements.

*   **Endpoint**: `DELETE /api/v1/users/me`
*   **Logic** (`TenantRepository.SoftDelete`):
    *   **Anonymization**: The user's email is replaced with an anonymous identifier (e.g., `deleted_[UUID]@deleted.local`).
    *   **Data Clearing**: Sensitive fields like `password_hash`, `totp_secret`, `display_name`, and `totp_enabled` are cleared or set to NULL.
    *   **Timestamp**: `deleted_at` is set to the current UTC time.
    *   **Token Revocation**: All active refresh tokens for the user are revoked to prevent further access.
*   **Security**: The endpoint requires password verification (`Service.DeleteAccount`) to prevent accidental or malicious deletion.

#### Legal Page Hosting
The backend now serves static HTML files for the Privacy Policy and Terms of Service. This ensures the app always links to a valid, controllable URL.

*   **Routes**:
    *   `/legal/privacy` -> Serves `platform/cmd/api/static/privacy.html`
    *   `/legal/terms` -> Serves `platform/cmd/api/static/terms.html`
*   **Implementation**: `main.go` uses Go's `embed` package to serve these files from the binary, simplifying deployment.

### 2.2 Frontend (Flutter)

#### Account Deletion UI
*   **Location**: Settings -> Security Screen -> "Danger Zone" (at the bottom).
*   **Interaction**: User Taps "Delete Account" -> Confirmation Dialog -> **Password Input Required** -> Confirm.
*   **Effect**: On success, the user is logged out and returned to the Login screen.

#### Legal Pages UI
*   **Screens**: `LegalScreen` handles both Privacy Policy and Terms of Service.
*   **Navigation**: Accessed via "Terms of Service" and "Privacy Policy" links on the **Register Screen**.
*   **Mechanism**:
    *   Primary: Attempts to open the URL in an **in-app WebView** (Safari View Controller / Custom Tabs).
    *   Fallback: Opens in external browser.
*   **URLs**: Configured to point to the production backend:
    *   `https://api-production-041c.up.railway.app/legal/privacy`
    *   `https://api-production-041c.up.railway.app/legal/terms`

## 3. Configuration & Deployment

### 3.1 Backend Files
*   **Static Files**: Located in `platform/cmd/api/static/`.
    *   `privacy.html`: Edit this file to update the Privacy Policy.
    *   `terms.html`: Edit this file to update the Terms of Service.

### 3.2 Frontend Configuration
*   **URLs**: Hardcoded in `lib/features/legal/presentation/screens/legal_screen.dart` to ensure they work even if the API client configuration changes.

## 4. Verification

### 4.1 Account Deletion
1.  Log in to the app.
2.  Navigate to **Settings > Security**.
3.  Scroll to the bottom **Danger Zone**.
4.  Tap **Delete Account**.
5.  Enter your password and confirm.
6.  **Expected**: You are logged out. attempting to log in again with the same credentials fails.

### 4.2 Legal Pages
1.  Go to the **Register** screen (logout if needed).
2.  Tap "Privacy Policy".
3.  **Expected**: The Privacy Policy HTML page loads in a WebView.
4.  Tap "Terms of Service".
5.  **Expected**: The Terms of Service HTML page loads in a WebView.
