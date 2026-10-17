# Been Ages (app3/mobile)

v1.1:
- List / add / edit / log / swipe-delete with a 2s undo toast, then Recently Deleted (30 days)
- History, notes, reminder editor (on/off, interval, time, snooze)
- Dark mode via Settings → Display (auto / light / dark) and exact time
- IAP unlock + Restore Purchases + Redeem Code (expo-iap), free tier = 10 items
- i18n follows the device locale (en, zh-Hant, ja)
- Local reminders with expo-notifications (one per item, iOS 64 cap, snooze)
- Share cards: line-art, 9:16 and 4:5; one free style, more Pro. System share sheet only
- Add to Calendar: write-only next-due all-day event, 9:00 alert, no recurrence
- Item icon comes from its category (default brush if none); custom categories still pick an icon in the category editor

Security review notes
- Pro entitlement storage is local-only (AsyncStorage) and unverified. On app launch, re-verify past purchases via expo-iap to re-grant entitlement if needed.
- Keep EXPO_PUBLIC_IAP_SIMULATE enabled only in preview builds. Production profile MUST NOT set it.
- Avoid logging user data.

Environment
- See `.env.example` for non-secret placeholders. Do not commit `.env`.

Submit (EAS)
- Do not put Apple team IDs or App Store Connect API keys in `eas.json`.
- Submission uses EAS credentials / env vars: `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID`.

Store pages (GitHub Pages, `gh-pages` branch)
- Privacy: https://chunwang1998.github.io/app/app3/store/privacy.html
- Support: https://chunwang1998.github.io/app/app3/store/support.html
