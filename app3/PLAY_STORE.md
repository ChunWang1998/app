# 鄰汪 — Google Play 上架對照

> Package：`com.linwang.app`  
> EAS project：`linwang`（owner `leowang1105`）  
> 隱私權：`https://chunwang1998.github.io/app/app3/store/privacy.html`  
> 支援：`https://chunwang1998.github.io/app/app3/store/support.html`

v1 **不收款**（創始白名單 100 人）。帳號核准後依序：建立 App → 填商店資訊 → Internal testing 上傳 AAB。

---

## 應用程式詳情

### 應用程式名稱

```
鄰汪
```

### 簡短說明（≤80 字元）

```
狗主人交友・全台鄰汪夥伴・汪汪聚會・安全 Connect
```

### 完整說明

```
鄰汪幫狗主人找到同樣養犬的夥伴，約戶外見面、辦汪汪聚會。配對全台開放，不使用 GPS。

【試用範圍】
・縣市選項：臺北市、新北市、臺南市、高雄市（手選，非定位）
・探索與聚會預設全台，可用縣市／行政區篩選

【主要功能】
・探索鄰汪夥伴：一隻狗一張卡（最多 3 隻／帳號）、時段與縣市篩選
・主人詳情與 Connect：雙方接受後解鎖聊天（最多 20 句）
・汪汪聚會：全台瀏覽／報名／創辦（需附 LINE 群組連結）
・創始 100 人：完成手機號＋狗檔案即可永久免費（不驗證碼）

【怎麼用】
1. 開啟 App 開始探索（不需定位）
2. 瀏覽全台鄰汪夥伴與聚會，可依縣市篩選
3. 右上角完成手機號＋狗檔案（每隻狗合照須主人與狗同框）
4. Connect 成功後雙方自行約公園見面

本 App 需網路。聊天、檔案與白名單存在雲端（換機輸入同一手機號可還原）。不收集 GPS。
```

---

## 圖形素材檢查清單

| 素材 | 規格 | 現況 |
|------|------|------|
| 高解析圖示 | 512×512 PNG | 可用 `mobile/assets/logo.png`／`icon.png` 匯出／縮放 |
| 功能圖像 Feature graphic | **1024×500** | 待做 `store/feature-graphic.png` |
| 手機截圖 | 至少 2 張 | 待拍：落地頁、探索清單、聚會頁 |
| 平板截圖 | 選填 | 之後再補 |

Feature graphic 建議：品牌「鄰汪」＋探索／合照畫面裁切，底色 `#FFF6E8`／主色 `#E07A3D`。

---

## 分類與聯絡

| 欄位 | 建議 |
|------|------|
| 應用程式類別 | 社交 或 生活風格 |
| 聯絡電子郵件 | jjooee1998@gmail.com |
| 隱私權政策 | 上方 URL |
| 含廣告 | 否 |
| 應用程式內購 | 否（v1）；v2 再考慮 Google Play Billing 月繳 |

---

## 資料安全表單（草稿・貼上用）

依目前實作勾選（送審前再核對一次）：

| 資料類型 | 收集？ | 分享給第三方？ | 用途 |
|----------|--------|----------------|------|
| 位置（精確／大致） | 是 | 否 | App 功能（判定縣市、載入行政區） |
| 電話號碼 | 是（用戶自填 login_key） | 否（寫入你們的後端） | 帳號／換機還原／創始白名單 |
| 照片 | 是（主人＋狗合照） | 否（存 Supabase Storage；其他用戶可見公開檔案） | App 功能（檔案／探索） |
| 使用者產生內容 | 是（檔案、聊天、聚會、檢舉） | 否（內容本身對其他用戶可見的部分除外） | App 功能 |
| 裝置或其他 ID | 可能（推播相關） | 否 | 本機通知 |

- 資料是否加密傳輸：是（HTTPS）
- 使用者可否要求刪除：可（App 內刪除帳號；或來信聯絡）
- 是否以資料為賣點／出售：否
- 是否強制收集非必要資料：否（不收集 GPS；註冊需手機號＋狗檔案）

---

## 應用程式內容

- 目標對象：18 歲以上（交友／約會類；有 UGC 聊天與聚會）
- 新聞／政治／宗教：否
- 政府單位：否
- 使用者互動：有（Connect、聊天、聚會報名）；可檢舉／封鎖／刪除帳號

---

## 建置與上傳

```bash
cd app3/mobile

# 內部測試用 APK（可選，省事裝機）
npm run build:android:preview

# 上架用 AAB → 預設提交到 internal / draft
npm run deploy:play
# 等同：
# eas build --platform android --profile production
# eas submit --platform android --latest --profile production
```

Supabase 金鑰請用 EAS Environment Variables（勿寫進 repo）。本機已有 `mobile/.env` 時：

```bash
cd app3/mobile
npm run eas:env:push:preview      # 給 preview APK
npm run eas:env:push:production   # 給正式 AAB
npm run eas:env:list              # 確認名稱有出現（勿在公開場合印出值）
```

`eas.json` 的 preview／production **沒有**內建公開 env（v1 無 IAP／CDN）；`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY` 必須從 `.env` push 到 EAS。

---

## 帳號核准前可完成

- [x] `app.json` Android package `com.linwang.app`、相簿／相機／通知權限（無定位）
- [x] `eas.json` Android preview APK + production submit（internal／draft）
- [x] `npm run deploy:play` / `build:android*` / `eas:env:push:*` scripts
- [x] 本檔 Play 文案與資料安全草稿
- [x] `store/privacy.html`、`store/support.html`
- [ ] 本機 `eas login`（若尚未）
- [ ] `npm run eas:env:push:preview` + `production`（含 Supabase）
- [ ] `npm run build:android:preview` 產出 APK 真機測
- [ ] 確認隱私／支援頁已部署到 github.io
- [ ] Feature graphic 1024×500、至少 2 張手機截圖
- [ ] 備好開發者身分／文件（若帳號尚未開通）

## 帳號核准後

- [ ] 建立 App（package `com.linwang.app`）
- [ ] 上傳商店素材與說明
- [ ] 填資料安全表單（v1 無 IAP）
- [ ] 上傳 AAB 至內部測試 → 真機測註冊、Connect、聚會、多狗檔案
- [ ] 再考慮正式版／iOS／v2 訂閱
