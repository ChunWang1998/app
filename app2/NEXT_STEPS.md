# 急廁 Go — 接下來要做什麼

> Bundle ID：`com.toiletgo.app`。EAS 設定檔已就位；首次建置前需登入並綁定 Expo 專案。

## 已決定

| 項目 | 決定 |
|------|------|
| 中文名 | **急廁 Go** |
| Bundle ID | `com.toiletgo.app` |
| 首發版本 | `1.0.0` |
| MVP 資料 | 目前 `dataSet.json` 為高雄（含 7-11／路易莎）；上架前可再決定是否只留 7-11 |

---

## Step 1 — EAS／產品識別 ✅

已完成（`app2/mobile/`）：

- [x] `eas.json`（development / preview / production，與 app1 對齊）
- [x] `app.json`：`bundleIdentifier` / `android.package` → `com.toiletgo.app`
- [x] EAS 專案已綁定：`@leowang1105/toilet-go`（projectId 已寫入 `app.json`）

---

## Step 2 — MVP 內容（可選，上架前）

- [ ] 確認資料範圍（例如：僅高雄 7-11）
- [ ] Landing／地圖加上「將陸續開放其他縣市及店家」文案（若要做）

---

## Step 3 — 商店素材

- [x] App Icon 1024×1024（`assets/icon.png`）
- [ ] iPhone 截圖
- [ ] 商店文案
- [ ] 隱私權政策網址（**有定位，強烈建議**）
- [ ] 支援網址或聯絡 email

---

## Step 4 — Apple App ID

1. Developer → Identifiers → 註冊 `com.toiletgo.app`
2. App Store Connect → 新建 App（急廁 Go）

---

## Step 5 — 建置與上傳

```bash
cd app2/mobile
eas build --platform ios --profile production
eas submit --platform ios --latest
```

建議先 TestFlight 實機測定位與地圖。

---

## 你接下來要做的事

1. 決定 MVP 資料／文案（Step 2）  
2. 素材 + Apple 帳號（Step 3–4）  
3. `eas build --platform ios --profile production` → TestFlight → 送審
