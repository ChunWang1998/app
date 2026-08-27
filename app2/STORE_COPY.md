# 急廁 Go — App Store Connect 對照貼上

> 版本頁：**iOS App 1.0 準備提交** · ASC `（新建 App 後填入）`  
> Bundle ID：`com.toiletgo.app`  
> 語系：繁體中文  
> 截圖：`store/screenshots/`（1284×2778，上傳到 **iPhone 6.5 吋顯示器**）

依下方標題，對到 Connect 同名欄位後，複製框內文字貼上即可。

---

## 預覽和截圖 → iPad → 12.9 吋或 13 吋顯示器

上傳 2 張即可（2048×2732）：

1. `store/screenshots/ipad/01-landing.png`
2. `store/screenshots/ipad/02-map.png`

---

## 預覽和截圖 → iPhone → 6.5 吋顯示器

上傳（順序）：

1. `store/screenshots/01-landing.png`
2. `store/screenshots/02-map.png`

---

## 名稱

（若在「App 資訊」而不是版本頁）

```
急廁 Go
```

## 副標題

（若在「App 資訊」；≤30）

```
附近廁所・一鍵導航
```

---

## 行銷宣傳文字

（≤170，可不發版就改）

```
趕快找到你附近營業中的廁所！地圖顯示最近三間，還能投票留言、一鍵導航。
```

---

## 描述

（≤4000）

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
・開啟 App，允許定位
・地圖顯示附近地點；右上角「解鎖」可買斷完整資料包
・點「導航」開啟地圖 App
・可投票與留言

本 App 需定位與網路（首次下載資料包時）。留言需連線同步。
```

---

## 關鍵字

（≤100；逗號分隔、不要空格、勿重複名稱）

```
廁所,超商廁所,7-11,找廁所,附近廁所,地圖,導航,便利商店,公共廁所,投票,生活工具,台灣,定位
```

---

## 支援 URL

```
https://chunwang1998.github.io/app/app2/store/support.html
```

## 行銷 URL

可留空，或同支援頁：

```
https://chunwang1998.github.io/app/app2/store/support.html
```

---

## 版本

```
1.0
```

## 版權

```
2026 ToiletGo
```

---

## 建置版本

點「新增建置版本」→ 選 **1.0.0（最新 production build）**

```bash
cd app2/mobile
eas build --platform ios --profile production
eas submit --platform ios --latest
```

---

## App 審查資訊

### 需要登入

**不要勾選**（本 App 無需登入；投票用匿名裝置 ID）

### 聯絡人資訊

| 欄位 | 建議 |
|------|------|
| 名字 | Chun |
| 姓氏 | Wang |
| 電話號碼 | （填你的手機，含國碼，例如 +8869xxxxxxxx） |
| 電子郵件 | jjooee1998@gmail.com |

### 備註

```
本 App 為附近超商廁所地圖工具，無需登入。

審核步驟：
1. 開啟 App → 點「開始找廁所」
2. 允許「使用 App 期間」定位權限
3. 地圖會顯示最近三間；可點「導航」、右滑／左滑投票、點卡片看留言

目前資料範圍：7-11；高雄／台南／新北／台北。
若審核裝置不在上述地區，定位失敗時會改用高雄市中心示範座標，仍可操作地圖與清單。

投票與留言需網路（Supabase）；匿名 device id，無帳號。

【內購測試】
・右上角「解鎖」→「買斷解鎖」為非消耗型 IAP（完整資料包，商品 ID：com.toiletgo.app.pro）
・免費版僅線上載入 7-11；買斷後可下載離線包並解鎖公廁等類型
・可使用 Sandbox 帳號測試購買；「恢復購買」可還原已買斷用戶
・購買成功後需網路下載約 7MB 資料包（首次）
```

### 附件

可留空（若要加碼：附一張地圖畫面截圖說明即可）

---

## App Store 版本發佈

建議選：**手動發佈此版本**（通過後你再按發佈）

---

## 側邊欄另填（送審前檢查）

### App 資訊

| 欄位 | 值 |
|------|-----|
| 主要類別 | 生活風格（Lifestyle）或導航（Navigation） |
| 次要類別 | 旅遊（Travel）或工具（Utilities） |
| 隱私權政策 URL | `https://chunwang1998.github.io/app/app2/store/privacy.html` |

### App 隱私權

**不可**選「不收集資料」。請依實際勾選，例如：

| 類型 | 用途（範例） |
|------|----------------|
| 位置（精確／大致，僅使用期間） | App 功能（找附近廁所） |
| 識別碼（裝置 ID，匿名） | App 功能（一裝置一地一票） |
| 使用者內容（留言／投票） | App 功能（社群回饋） |

追蹤：**否**（未用於跨 App 廣告追蹤）

詳見 `store/privacy.html`。

### 年齡分級

問卷請如實填：有**使用者產生內容**（留言）。通常可落在 **4+**（無不當內容、無帳號強制）。

---

## 上架前檢查（與 app1 不同處）

- [ ] GitHub Pages 已能開 `privacy.html` / `support.html`（推上 `chunwang1998.github.io/app` 的 `app2/store/`）
- [ ] Google Play 見 `PLAY_STORE.md`（Android 文案、資料安全、建置指令）
- [ ] **iOS 內購** 見 `APP_STORE_IAP.md`（付費協議、建立 `com.toiletgo.app.pro`、Sandbox、TestFlight 購買測試）
- [ ] App Store Connect 已新建 App（名稱「急廁 Go」、Bundle `com.toiletgo.app`），並把 ASC ID 填回本檔標題
- [ ] App Store Connect 已建立 IAP `com.toiletgo.app.pro`（非消耗型），版本頁已勾選一併送審
- [ ] Supabase 已上線，投票／留言可同步（審核會點得到）
- [ ] TestFlight 實機測：定位、地圖、導航、左右滑投票、留言、**購買／恢復／下載資料包**
- [x] iPad 截圖兩張（2048×2732）

---

填完後按右上角 **儲存** → **新增以供審查** → 送出審查。
