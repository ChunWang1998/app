# Been Ages (app3/mobile)

v1.1 core UI (this slice):
- List / add / edit / log / swipe-delete with a 5s undo, then hard-delete
- History, 補記, notes, reminder editor (on/off, interval, time, snooze — scheduling in a follow-up PR)
- Dark mode via 設定 → 顯示 (自動 / 淺色 / 深色) and 精確時間
- IAP unlock + Restore Purchases (expo-iap), free tier = 3 items
- i18n (en, zh-Hant)
- Local reminders are scheduled with expo-notifications (one per item, iOS 64 cap, snooze)
- Recently Deleted (30 days) + JSON/CSV export and JSON import

Security review notes
- Pro entitlement storage is local-only (AsyncStorage) and unverified. On app launch, re-verify past purchases via expo-iap (e.g., getAvailablePurchases/restorePurchases) to re-grant entitlement if needed — mirror the pattern in app2. This is planned before shipping UI polish.
- Keep EXPO_PUBLIC_IAP_SIMULATE enabled only in preview builds. Production profile MUST NOT set it.
- Avoid logging user data. The placeholder export action does not log data in production.

Environment
- See `.env.example` for non-secret placeholders. Do not commit `.env`.

Store pages (GitHub Pages, `gh-pages` branch)
- Privacy: https://chunwang1998.github.io/app/app3/store/privacy.html
- Support: https://chunwang1998.github.io/app/app3/store/support.html

