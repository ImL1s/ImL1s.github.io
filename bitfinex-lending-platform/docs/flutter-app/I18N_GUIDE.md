# Internationalization (i18n) Guide

This guide explains how the internationalization system works in the Bitfinex Lending Bot and how to manage languages.

## Overview

The project supports full-stack internationalization, covering:
1.  **Flutter App:** Mobile interface (iOS/Android).
2.  **Go Backend:** Notification messages (Telegram, Email, Discord) and Web Interface (HTML templates).
3.  **Web Dashboard:** Client-side JavaScript dynamic content.

Supported languages:
-   English (`en`) - Default
-   Traditional Chinese (`zh`)

## Flutter App

### Structure
-   Localization configuration: `flutter_app/l10n.yaml`
-   Translation files: `flutter_app/lib/l10n/arb/`
    -   `app_en.arb`: English source
    -   `app_zh.arb`: Chinese translations
-   Generated code: `.dart_tool/flutter_gen/gen_l10n/` (auto-generated)

### Adding a New Language
1.  Create a new ARB file in `flutter_app/lib/l10n/arb/`, e.g., `app_es.arb` for Spanish.
2.  Copy content from `app_en.arb` and translate the values.
3.  Update `flutter_app/lib/app/app.dart` to add the new locale to `supportedLocales`:
    ```dart
    supportedLocales: const [
      Locale('en'),
      Locale('zh'),
      Locale('es'), // Add this
    ],
    ```
4.  Run `flutter gen-l10n` in the `flutter_app` directory.

### Usage in Code
Use `AppLocalizations.of(context)!` to access strings:
```dart
Text(AppLocalizations.of(context)!.dashboardTitle)
```

## Go Backend & Notifications

### Structure
-   Translation engine: `internal/i18n/`
-   Locale files: `locales/`
    -   `en.yaml`
    -   `zh.yaml`

### Adding a New Language
1.  Create a new YAML file in `locales/`, e.g., `es.yaml`.
2.  Copy keys from `en.yaml` and translate the values.
3.  Ensure the file is valid YAML.

### Usage in Code
Inject the `*i18n.Translator` into your struct and use the `T` method:
```go
// Direct lookup
title := t.translator.T("loan_executed_title")

// With arguments
message := t.translator.T("loan_executed_msg", amount, currency, rate, period)
```

### Risk Manager Localization
The Risk Manager (`internal/risk/`) generates recommendations based on market conditions. These strings are now localized using keys prefixed with `risk_rec_`.
-   Example: `risk_rec_crit_reduce` ("Immediately reduce exposure")
-   When adding new risk rules, ensure corresponding keys are added to locale files.

## Flutter Widgets Localization
Shared widgets like `ConnectivityBanner` and `ErrorView` also use `AppLocalizations`.
-   Keys: `retry`, `offlineMessage`, `backOnline`, etc.
-   When creating new reusable widgets, always use `AppLocalizations.of(context)!` instead of hardcoded strings.

## Web Interface

### Structure
The web interface uses a hybrid approach:
1.  **Server-side Rendering:** HTML templates use the backend `locales/*.yaml` files via the `{{ T "key" }}` template function.
2.  **Client-side JavaScript:** Translations are injected into the window object from the same backend source.

### Editing Web Text
1.  Update `locales/en.yaml` and `locales/zh.yaml` with keys starting with `web_` (convention).
2.  In HTML templates (`internal/web/templates/`), use:
    ```html
    <h1>{{ T "web_title" }}</h1>
    ```
3.  For JavaScript usage (e.g., dynamic updates), ensure the key is injected in the `<script>` block in the template:
    ```javascript
    const translations = {
        "web_status_connected": "{{ T "web_status_connected" }}",
        // ...
    };
    function t(key) { return translations[key] || key; }
    ```

## Configuration

To switch the language for the backend (Notifications & Web Dashboard), edit your `config.yaml`:

```yaml
bot:
  # ... other settings
  language: "zh"  # Options: "en", "zh"
```

*Note: The Flutter App language is determined by the user's device system settings automatically.*
