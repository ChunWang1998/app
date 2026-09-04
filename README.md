app3 流程:
-> 一邊蒐集用戶反饋, 一邊測試, 一邊修改成付費版本
-> deploy 新版本 with 付費版本

> **付費版第一次 build 提醒**：若是**第一次**打付費版（含 App 內購買），在 EAS build / 送審前，先到 App Store Connect（與 Google Play Console）**建好 In-App Purchase / 訂閱項目**，並確認 product ID 與程式碼一致。漏設常導致審核或測試失敗，又要再 build 一次。

---

## iOS App Store：隱私權限用途說明（Purpose Strings）注意事項

> **背景**：app3（鄰汪）1.0.0 (7) 曾因 `NSMicrophoneUsageDescription` 占位符被拒（Guideline 5.1.1）。以下為之後每個新 App 上架前必查清單。

### Apple 會拒絕什麼

- 用途說明（Purpose String）是**占位符或通用英文**，例如：
  - `"Allow app to access your microphone"`
  - `"App needs microphone access"`
- 說明**未清楚描述實際用途**，或未提供具體使用情境。

### 核心原則

1. **只申請 App 真正用到的權限** — 沒用到的權限，從 binary 與設定中移除，不要留預設占位符。
2. **用途說明要具體、可理解** — 用使用者語言（繁中）說明「為什麼需要」與「怎麼用」，例如：「需要相簿來上傳主人與狗的合照。」
3. **第三方 SDK 也會觸發審查** — 即使你的 JS 沒呼叫麥克風，只要 native 二進位含相關 API，Apple 仍會要求對應的 `Info.plist` 鍵值；占位符一樣會被拒。

### Expo / React Native 常見陷阱（`expo-image-picker`）

若 App **只用相簿選照片**（`launchImageLibraryAsync` + `MediaTypeOptions.Images`），**不要**啟用相機／麥克風：

```json
// app.json — 正確：僅相簿
[
  "expo-image-picker",
  {
    "photosPermission": "需要相簿來上傳主人與狗的合照。",
    "microphonePermission": false
  }
]
```

**避免**在沒用到相機時仍設定 `cameraPermission` — 容易連帶注入 `NSMicrophoneUsageDescription` 預設英文占位符。

同時檢查：

| 位置 | 做法 |
|------|------|
| `ios.infoPlist` | 只保留實際用到的 key（如 `NSPhotoLibraryUsageDescription`）；移除未使用的 `NSCameraUsageDescription`、`NSMicrophoneUsageDescription` |
| `android.permissions` | 移除未使用的 `RECORD_AUDIO` 等 |
| `buildNumber` | 每次修正權限後遞增，再重新 EAS build + 送審 |

若**確實需要相機錄影含聲音**，才在 `infoPlist` 加入**真實、具體**的 `NSMicrophoneUsageDescription`，且功能必須與說明一致。

### 新 App 上架前檢查清單

- [ ] 若為**付費版第一次 build**：先在商店後台建好 IAP / 訂閱項目，product ID 與程式碼一致（避免漏設再重 build）
- [ ] 列出 App 實際使用的敏感權限（相簿、相機、麥克風、定位等）
- [ ] `app.json` / plugin 設定與程式碼一致（無多餘 permission）
- [ ] 所有 `*UsageDescription` 為繁中具體說明，非英文占位符
- [ ] Android `permissions` 陣列無多餘權限
- [ ] 遞增 `ios.buildNumber`（或 `android.versionCode`）後重新 deploy
- [ ] App Store Connect 選新 build → **重新提交至 App 審查**

### 參考

- Apple Guideline：[5.1.1 Legal: Privacy - Data Collection and Storage](https://developer.apple.com/app-store/review/guidelines/#privacy)
- Expo `expo-image-picker` plugin：`photosPermission`、`cameraPermission`、`microphonePermission: false`
- app3 修正範例：`app3/mobile/app.json`（build 8 起）
