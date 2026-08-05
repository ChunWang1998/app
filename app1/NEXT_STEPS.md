# 諧音猜猜 / SoundAlike — 接下來要做什麼

> 品牌已定。本檔是上架前 checklist（依序做即可）。

## 已決定

| 項目 | 決定 |
|------|------|
| 中文名（App 顯示名） | **諧音猜猜** |
| 英文名 | **SoundAlike** |
| Bundle ID | `com.soundalike.app` |
| 首發版本 | `1.0.0` |
| 內容 | **開放全部關卡**（目前 50 關） |
| 商店宣傳文案 | 見 `STORE_COPY.md` |

---

## Step 1 — 改產品識別（程式／設定） ✅

已完成（`app1/game/`）：

- [x] `app.json`：`name` 諧音猜猜、`slug` soundalike、`bundleIdentifier` / `android.package` → `com.soundalike.app`
- [x] UI：`StartScreen` / `GameScreen` 標題諧音猜猜、副標 SoundAlike

---

## Step 2 — 關卡內容 ✅

已完成：

- [x] **開放全部關卡**（`questions.js` 全題可玩，無試玩限制）
- [x] **本機驗證**：流程 OK

---

## Step 3 — 商店素材（可與後續並行）

準備：

- [x] App Icon 1024×1024（`assets/icon.png`）
- [x] 商店文案（`STORE_COPY.md`）
- [ ] iPhone 截圖（至少 6.7" 一組）：開場、答題、通關
- [ ] 隱私權政策網址（即使無帳號／無追蹤，Apple 仍常要求一頁說明）
- [ ] 支援網址或聯絡 email

---

## Step 4 — Apple 帳號與 App ID

1. 確認已加入 **Apple Developer Program**
2. Developer → Identifiers → 註冊 App ID：`com.soundalike.app`
3. App Store Connect → 新建 App
   - 名稱：諧音猜猜
   - Bundle ID：選剛註冊的 `com.soundalike.app`
   - 主要語言：繁體中文

---

## Step 5 — 用 EAS 打 iOS 包並上傳

`app1/game` 已有 `eas.json`。大致指令：

```bash
cd app1/game
npm install -g eas-cli   # 若尚未安裝
eas login
eas build --platform ios --profile production
eas submit --platform ios --latest
```

或先丟 **TestFlight** 實機測，再送審。

每次上傳 build number 要遞增（production profile 已設 `autoIncrement`）。

---

## Step 6 — 送審

App Store Connect：

1. 填完截圖、文案、年齡分級、隱私問卷
2. 選剛上傳的 build
3. Submit for Review

首審通常數天；被拒就依回覆改再送（版號可用 `1.0.1`）。

---

## 之後版本怎麼切

| 版本 | 內容 |
|------|------|
| **1.0.0** | 全部現有關卡（本次） |
| **1.1.0** | 新增關卡／題目 |
| **1.x.x** | 修 bug、小改 UI |

---

## 和 app2 的關係（提醒）

App2（急廁 Go）是**另一個** App Store 項目，bundle ID 另定（建議去掉 `superpredict`，例如 `com.toiletgo.app`）。  
可等 app1 走完本機驗證與素材後，再用同一套「EAS → TestFlight → 送審」流程上 app2。

---

## 你接下來要做的事

1. 準備截圖／隱私權頁／支援連絡（Step 3 剩餘）  
2. 註冊 Apple App ID / 開 App Store Connect 草稿（Step 4）  
3. EAS build → TestFlight → 送審（Step 5–6）  
4. 上架時把 `STORE_COPY.md` 文案貼進 App Store Connect
