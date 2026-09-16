# 鄰汪 1.0.1 Release

## Version bumped
- iOS `version`: **1.0.1**
- iOS `buildNumber`: **10**
- Android `versionCode`: **3**

## Run in your Mac terminal (EAS login required)

Cursor agent cannot finish EAS cloud build here (`eas whoami` → Forbidden / sandbox). Please run:

```bash
cd /Users/leo_1/Documents/GitHub/superpredict/app/app3/mobile

# Re-login if needed
npx eas-cli login

# Confirm account
npx eas-cli whoami

# Optional: refresh production env (Supabase keys)
npm run eas:env:push:production

# Build + upload to App Store Connect / TestFlight
npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
```

Or:

```bash
npm run deploy:testflight
```

## After build appears in App Store Connect
1. App Store → **(+)** 新增版本 → **1.0.1**
2. Select build **10** (or whatever EAS uploaded)
3. What’s New (此版本的新增功能):

```
• 設定：深色／淺色模式、中文／英文
• Connect 邀請推播通知
• 探索頁訂閱狀態標示與待回覆
• 開始探索載入加速與介面調整
```

4. Submit for Review
