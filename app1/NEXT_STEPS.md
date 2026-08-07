# 諧音猜猜 / SoundAlike — 接下來要做什麼

> 品牌已定。本檔是上架前 checklist（依序做即可）。

## 已決定

| 項目 | 決定 |
|------|------|
| 中文名（App 顯示名） | **諧音猜猜** |
| 英文名 | **SoundAlike** |
| Bundle ID | `com.soundalike.app` |
| ASC App ID | `6798265759` |
| 首發版本 | `1.0.0`（目前 EAS production build **4** 已打好） |
| 內容 | **開放全部關卡**（目前 50 關） |
| 商店宣傳文案 | 見 `STORE_COPY.md` |
| 隱私／支援頁 | 見 `store/privacy.html`、`store/support.html` |

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

## Step 3 — 商店素材

- [x] App Icon 1024×1024（`assets/icon.png`）
- [x] 商店文案（`STORE_COPY.md`，含 ASO 關鍵字）
- [x] 隱私權／支援 HTML（`store/`，需部署成 HTTPS）
- [ ] **部署** `store/privacy.html`、`store/support.html` 取得公開網址
- [ ] iPhone 截圖（至少 6.7" 一組）：開場、答題、通關
- [ ] 把網址填進 App Store Connect（隱私權政策、支援網址）

---

## Step 4 — Apple 帳號與 App ID ✅

- [x] Bundle ID / ASC App 已存在（`eas.json` → `ascAppId: 6798265759`）
- [x] EAS production build 已上傳（1.0.0 / build 4）

---

## Step 5 — EAS 建置 ✅（目前）

最新包已在 Expo：

- Version `1.0.0` · Build number `4`
- 若程式有改再重打：`cd app1/game && eas build --platform ios --profile production && eas submit --platform ios --latest`

---

## Step 6 — 送審（你現在要做的）

App Store Connect → **諧音猜猜** → iOS App 1.0.0：

1. 貼上 `STORE_COPY.md` 的名稱／副標／說明／關鍵字／What’s New
2. 上傳截圖
3. 填隱私權政策網址、支援網址
4. App 隱私選 **Data Not Collected**；年齡分級 4+
5. 選 build **4**（或最新）
6. 貼 Review Notes → **Submit for Review**

詳細步驟見 `store/SUBMIT.md`。

---

## 之後版本怎麼切

| 版本 | 內容 |
|------|------|
| **1.0.0** | 全部現有關卡（本次） |
| **1.1.0** | 新增關卡／題目 |
| **1.x.x** | 修 bug、小改 UI |

---

## 和 app2 的關係

App2（急廁 Go）另案上架。先完成 app1 送審即可。
