# 業問 CraftQ 1.0.0 Release (TestFlight)

## Version
- iOS `version`: **1.0.0**
- iOS `buildNumber`: **1**
- EAS project: `@leowang1105/craftq`
- EAS projectId: `5b2d80c0-ebdd-468a-bae9-6f3f55e69f1c`
- Bundle ID: `com.identitymatch.app`

## Already done (agent)
- [x] EAS project created & linked in `app.json`
- [x] `version` / `buildNumber` set to **1.0.0** / **1**
- [x] Supabase keys copied into `mobile/.env`（與 app2 同專案）
- [x] `eas env:push` → **production** + **preview**
- [x] Docs: `APP_STORE.md`、`RELEASE_1.0.0.md`

## Blocker: iOS credentials (needs your Mac terminal once)
`--non-interactive` build failed:

```text
✔ Using remote iOS credentials (Expo server)
Distribution Certificate is not validated for non-interactive builds.
Failed to set up credentials.
Credentials are not set up. Run this command again in interactive mode.
```

新 EAS 專案尚未建立 `com.identitymatch.app` 的 Distribution Cert / Provisioning Profile，必須在本機互動式跑一次（可沿用與鄰汪相同的 Apple Team）。

### Run in your Mac terminal

```bash
cd /Users/leo_1/Documents/GitHub/superpredict/app/app4/mobile

npx eas-cli whoami

# 互動式：讓 EAS 建立／選取 iOS credentials，建置並 auto-submit 到 TestFlight
npx eas-cli build --platform ios --profile production --auto-submit
```

Or:

```bash
npm run deploy:testflight
```

提示出現時建議選：
1. **Set up credentials** / 使用 Expo 遠端管理
2. 登入同一個 Apple Developer Team（與鄰汪相同）
3. 讓 EAS **Generate new** Distribution Certificate + Provisioning Profile（若 Bundle ID 尚未在 Apple Developer 註冊，先同意建立）
4. App Store Connect：若尚無 App，先到 ASC 用 Bundle ID `com.identitymatch.app` 建立 App，再把數字 Apple ID 填入 `eas.json` → `submit.production.ios.ascAppId`

### Optional：只先建憑證、稍後再建置
```bash
npx eas-cli credentials -p ios
# 選 production → Set up build credentials
```

## After build appears in App Store Connect
1. TestFlight → 內部測試／加入測試員
2. 正式上架：App Store → 新增版本 **1.0.0** → 選取 build → 填 listing（見 `APP_STORE.md`）→ Submit for Review
3. 付費功能實測前：ASC 建好訂閱 `com.identitymatch.app.premium`（見 `APP_STORE_IAP.md`）
