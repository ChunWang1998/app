# 急廁 Go — 接下來要做什麼

> Bundle ID：`com.toiletgo.app`。EAS 設定檔已就位；首次建置前需登入並綁定 Expo 專案。

## 已決定

| 項目 | 決定 |
|------|------|
| 中文名 | **急廁 Go** |
| Bundle ID | `com.toiletgo.app` |
| 首發版本 | `1.0.0` |
| MVP 資料 | `dataSet.json` 僅合併 7-11（高雄／台南／新北／台北）；路易莎等暫不釋出 |

---

## Step 1 — EAS／產品識別 ✅

已完成（`app2/mobile/`）：

- [x] `eas.json`（development / preview / production，與 app1 對齊）
- [x] `app.json`：`bundleIdentifier` / `android.package` → `com.toiletgo.app`
- [x] EAS 專案已綁定：`@leowang1105/toilet-go`（projectId 已寫入 `app.json`）

---

## Step 2 — Supabase（全局投票／留言）

1. 到 [supabase.com](https://supabase.com) 新建 Free 專案  
2. SQL Editor 執行 `app2/supabase/schema.sql`  
3. Project Settings → API：複製 URL 與 `anon` key  
4. `cp app2/mobile/.env.example app2/mobile/.env` 並填入  
5. `cd app2/mobile && npx expo start -c` 驗證投票／留言會同步  

隱私權政策之後要寫明：會上傳匿名 device id、投票與留言到 Supabase。

---

## Step 3 — MVP 內容（可選，上架前）

- [ ] 確認資料範圍（目前：高雄／台南／新北／台北 7-11）
- [x] 說明文案已含「陸續開放…」（mobile HelpModal）

---

## Step 4 — 商店素材

- [x] App Icon 1024×1024（`assets/icon.png`）
- [ ] iPhone 截圖
- [ ] 商店文案
- [ ] 隱私權政策網址（**有定位＋雲端留言／投票，強烈建議**）
- [ ] 支援網址或聯絡 email

---

## Step 5 — Apple App ID

1. Developer → Identifiers → 註冊 `com.toiletgo.app`
2. App Store Connect → 新建 App（急廁 Go）

---

## Step 6 — 建置與上傳

```bash
cd app2/mobile
eas build --platform ios --profile production
eas submit --platform ios --latest
```

建議先 TestFlight 實機測定位、地圖、投票／留言同步。

---

## 你接下來要做的事

1. **先做 Step 2（Supabase）**，否則投票／留言無法全局  
2. 決定 MVP 資料（Step 3）  
3. 素材 + 隱私政策 + Apple 帳號（Step 4–5）  
4. EAS build → TestFlight → 送審
