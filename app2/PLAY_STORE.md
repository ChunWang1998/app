# 急廁 Go — Google Play 上架對照

> Package：`com.toiletgo.app`  
> 內購商品 ID：`com.toiletgo.app.pro`（非消耗型 / 單次）  
> 隱私權：`https://chunwang1998.github.io/app/app2/store/privacy.html`  
> 支援：`https://chunwang1998.github.io/app/app2/store/support.html`

帳號核准後依序：建立 App → 填商店資訊 → 建立 IAP → Internal testing 上傳 AAB。

---

## 應用程式詳情

### 應用程式名稱

```
急廁 Go
```

### 簡短說明（≤80 字元）

```
附近廁所地圖・一鍵導航・可買斷離線完整資料包
```

### 完整說明

```
趕快找到你附近的廁所！急廁 Go 用地圖找出離你最近、還在營業的地點，一鍵導航過去。

【免費】
・全台 7-11（線上載入）
・地圖顯示附近營業中地點
・投票留言、一鍵導航
・無需註冊帳號

【完整資料包（一次性買斷）】
・解鎖公廁、全家、加油站、路易莎、星巴克、寶雅、百貨、捷運等
・下載後可離線使用
・支援恢復購買

【怎麼用】
1. 開啟 App，允許定位
2. 地圖顯示附近地點；可切換「附近／全部」
3. 右上角「解鎖」可買斷並下載完整資料包
4. 點地點可導航、投票、留言

本 App 需定位與網路（首次下載資料包時）。留言需連線同步。
```

---

## 圖形素材檢查清單

| 素材 | 規格 | 現況 |
|------|------|------|
| 高解析圖示 | 512×512 PNG | 可用 `mobile/assets/icon.png` 匯出／縮放 |
| 功能圖像 Feature graphic | **1024×500** | `store/feature-graphic.png`（可再美化） |
| 手機截圖 | 至少 2 張 | 現有 `store/screenshots/01-landing.png`、`02-map.png` 可先用 |
| 平板截圖 | 選填 | 有 `store/screenshots/ipad/` |

Feature graphic 建議：品牌「急廁 Go」+ 地圖畫面裁切，底色 `#E8FBF7` / 主色 `#1A9B8E`。

---

## 分類與聯絡

| 欄位 | 建議 |
|------|------|
| 應用程式類別 | 工具 或 旅遊與導航 |
| 聯絡電子郵件 | jjooee1998@gmail.com |
| 隱私權政策 | 上方 URL |
| 含廣告 | 否 |
| 應用程式內購 | 是（完整資料包） |

---

## 資料安全表單（草稿・貼上用）

依目前實作勾選（送審前再核對一次）：

| 資料類型 | 收集？ | 分享給第三方？ | 用途 |
|----------|--------|----------------|------|
| 位置（精確／大致） | 是 | 否 | App 功能（找附近廁所） |
| 裝置或其他 ID | 是（匿名 device id） | 否（僅寫入你們的後端） | App 功能（一裝置一地一票） |
| 使用者產生內容 | 是（留言／投票） | 否（存在 Supabase，其他使用者可見內容本身） | App 功能 |
| 購買紀錄 | 由 Google Play 處理 | — | 內購解鎖 |

- 資料是否加密傳輸：是（HTTPS）
- 使用者可否要求刪除：可（來信聯絡；留言為公開 UGC）
- 是否以資料為賣點／出售：否
- 是否強制收集非必要資料：否

---

## 應用程式內容

- 目標對象：18 歲以上為主（工具類；有 UGC 留言）
- 新聞／政治／宗教：否
- 政府單位：否

---

## 內購商品（帳號過後建立）

1. Play Console → 營利 → 產品 → 應用程式內產品 → 建立產品  
2. 產品 ID：`com.toiletgo.app.pro`（不可改，須與 App 一致）  
3. 名稱：完整資料包  
4. 說明：解鎖全部廁所類型並下載離線資料包（一次性買斷）  
5. 價格：建議 NT$30–90  
6. 啟用產品  
7. 設定 → 授權測試：加入自己的 Gmail  

---

## 建置與上傳（帳號過後）

```bash
cd app2/mobile

# 內部測試用 APK（可選，省事裝機）
npm run build:android:preview

# 上架用 AAB → 預設提交到 internal / draft
npm run deploy:play
# 等同：
# eas build --platform android --profile production
# eas submit --platform android --latest --profile production
```

正式建置已內建：

- `EXPO_PUBLIC_PLACES_URL=https://chunwang1998.github.io/app/places`
- `EXPO_PUBLIC_IAP_PRODUCT_ID=com.toiletgo.app.pro`

Supabase 金鑰請用 EAS Environment Variables（勿寫進 repo）。本機已有 `mobile/.env` 時：

```bash
cd app2/mobile
npm run eas:env:push:preview      # 給 preview APK
npm run eas:env:push:production   # 給正式 AAB
npm run eas:env:list              # 確認名稱有出現（勿在公開場合印出值）
```

`eas.json` 的 preview / production 已內建公開變數 `EXPO_PUBLIC_PLACES_URL`、`EXPO_PUBLIC_IAP_PRODUCT_ID`；Supabase 兩項必須從 `.env` push 到 EAS。

---

## 帳號核准前可完成

- [x] `eas.json` Android preview APK + production env（places / IAP）
- [x] `npm run deploy:play` / `build:android*` / `eas:env:push:*` scripts
- [x] Expo Go「清除解鎖（開發）」重測流程
- [x] 本檔 Play 文案與資料安全草稿
- [x] Feature graphic：`store/feature-graphic.png`（1024×500）
- [x] 本機 `eas login`
- [x] `eas env:push` preview + production（含 Supabase）
- [ ] `npm run build:android:preview` 產出 APK（重試中：https://expo.dev/accounts/leowang1105/projects/toilet-go/builds/e1da676c-eb36-4371-b3e1-69bb13c92bab ）
- [ ] 確認隱私／支援頁已部署到 github.io（含買斷說明）
- [ ] 備好開發者身分／金流文件
- [ ] （可選）`eas build -p android --profile production --local` 預先打 AAB

## 帳號核准後

- [ ] 建立 App（package `com.toiletgo.app`）
- [ ] 上傳商店素材與說明
- [ ] 建立並啟用 IAP `com.toiletgo.app.pro`
- [ ] 填資料安全表單
- [ ] 上傳 AAB 至內部測試 → 真機測 Billing + 下載 pack
- [ ] 再考慮正式版／iOS
