# Been Ages (app3/mobile)

v1.1 share cards + calendar (this slice):
- Share cards: line-art, 9:16 and 4:5, hide-name toggle; one free style, more Pro
- System share sheet only (`expo-sharing`). Direct IG Stories waits on a Meta App ID
- Add to Calendar: write-only next-due all-day event, 9:00 alert, no recurrence, duplicate memory
- Privacy copy for calendar, widgets, and share cards

v1.1 core UI (already on main):
- List / add / edit / log / swipe-delete with a 5s undo, then hard-delete
- History, 補記, notes, reminder editor (on/off, interval, time, snooze — scheduling in a follow-up PR)
- Dark mode via 設定 → 顯示 (自動 / 淺色 / 深色) and 精確時間
- IAP unlock + Restore Purchases (expo-iap), free tier = 3 items
- i18n (en, zh-Hant)
- Import/export, Recently Deleted, and push scheduling are the next slices

Security review notes
- Pro entitlement storage is local-only (AsyncStorage) and unverified. On app launch, re-verify past purchases via expo-iap (e.g., getAvailablePurchases/restorePurchases) to re-grant entitlement if needed — mirror the pattern in app2. This is planned before shipping UI polish.
- Keep EXPO_PUBLIC_IAP_SIMULATE enabled only in preview builds. Production profile MUST NOT set it.
- Avoid logging user data. The placeholder export action does not log data in production.

Environment
- See `.env.example` for non-secret placeholders. Do not commit `.env`.

Store pages (GitHub Pages, `gh-pages` branch)
- Privacy: https://chunwang1998.github.io/app/app3/store/privacy.html
- Support: https://chunwang1998.github.io/app/app3/store/support.html

