# Been Ages (app3/mobile)

This app currently ships core logic only (non-UI) per scope:
- Data layer with soft-delete + undo (30-day auto purge)
- Local reminders (expo-notifications), respects iOS 64 pending limit
- IAP unlock + Restore Purchases (expo-iap), free tier = 3 items
- JSON export/import with validation
- i18n (en, zh-Hant)

Security review notes
- Pro entitlement storage is local-only (AsyncStorage) and unverified. On app launch, re-verify past purchases via expo-iap (e.g., getAvailablePurchases/restorePurchases) to re-grant entitlement if needed — mirror the pattern in app2. This is planned before shipping UI polish.
- Keep EXPO_PUBLIC_IAP_SIMULATE enabled only in preview builds. Production profile MUST NOT set it.
- Avoid logging user data. The placeholder export action does not log data in production.

Environment
- See `.env.example` for non-secret placeholders. Do not commit `.env`.

