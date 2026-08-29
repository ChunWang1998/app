# 鄰汪 (Linwang) — Apple App Store 上架指南與對照表

> **Bundle ID**: `com.linwang.app`  
> **EAS 專案**: `linwang` (owner: `leowang1105`)  
> **隱私權政策網址**: `https://chunwang1998.github.io/app/app3/store/privacy.html`  
> **技術支援網址**: `https://chunwang1998.github.io/app/app3/store/support.html`  
> **聯絡信箱**: `jjooee1998@gmail.com`

---

## 快速導覽目錄
1. [App Store Connect 欄位填寫（直接複製貼上）](#1-app-store-connect-欄位填寫直接複製貼上)
2. [圖形素材檔案對照](#2-圖形素材檔案對照)
3. [App 隱私權問卷回答對照](#3-app-隱私權問卷回答對照)
4. [App 審查資訊與 Demo 帳號](#4-app-審查資訊與-demo-帳號)
5. [EAS 建置與上傳指令](#5-eas-建置與上傳指令)

---

## 1. App Store Connect 欄位填寫（直接複製貼上）

### 應用程式名稱 (App Name, ≤ 30 字元)
```text
鄰汪
```

### 副標題 (Subtitle, ≤ 30 字元)
```text
狗主人社交・全台鄰汪夥伴・汪汪聚會
```

### 主要語言
```text
繁體中文（台灣）/ 英文（美國）
```

### 行銷宣傳文字 (Promotional Text, ≤ 170 字元)
```text
專為毛孩家長打造的交流社群！結伴遛狗、參加汪汪聚會，輕鬆找到附近志同道合的狗狗玩伴。
```

### 描述 (Description, ≤ 4,000 字元)
```text
「鄰汪」是專為台灣狗主人打造的同伴交流與聚會平台。幫你找到志同道合的毛孩好友，相約戶外散步、舉辦熱鬧的汪汪聚會！全台開放配對，不使用裝置 GPS 定位，兼顧隱私與便利。

【主要特色】
・探索全台鄰汪：瀏覽狗狗專屬檔案卡，支援縣市、行政區、散步時段與狗狗體型篩選。
・專屬毛孩檔案：建立主人與毛孩的合照認證、個性特徵、出沒公園地點（支援多隻狗狗檔案）。
・安全 Connect：雙方互相確認後解鎖專屬對話（最多 20 句），出門見面更有默契。
・汪汪聚會：瀏覽全台狗狗聚會、即時報名或自行發起聚會（附 LINE 交流群組連結）。
・安全與隱私：內建檢舉與封鎖機制，嚴格保護社群秩序；無廣告干擾。
・創始 100 人：完成手機號碼登入與毛孩檔案即可享有創始免費名額。

【使用方式】
1. 開啟 App 即可直接探索附近的狗狗夥伴（無需開啟 GPS 定位）。
2. 在個人頁輸入手機號碼並完成毛孩檔案（合照需主人與狗同框）。
3. 發送 Connect 邀請給喜歡的毛孩夥伴，雙方同意後即可開啟聊天並相約公園見面！

註：本 App 需要網際網路連線以同步最新檔案與聚會資訊。
```

### 關鍵字 (Keywords, ≤ 100 字元，半形逗號分隔)
```text
狗狗,狗主人,毛孩,寵物社交,遛狗,寵物聚會,柴犬,柯基,黃金獵犬,狗友,寵物交友
```

### 網址設定
* **支援 URL (Support URL)**:  
  `https://chunwang1998.github.io/app/app3/store/support.html`
* **行銷 URL (Marketing URL, 選填)**:  
  `https://chunwang1998.github.io/app/app3/store/support.html`
* **版權 (Copyright)**:  
  `2026 Linwang Studio`

---

## 2. 圖形素材檔案對照

所有素材已產出於專案中的 `app3/store/appstore/` 資料夾：

### iPhone 截圖 (6.5" / 6.7" 顯示器，規格 1284 × 2778 px)
*資料夾位置：`app3/store/appstore/iphone/`*

| 欄位 | 檔案路徑 | 尺寸規格 | 畫面內容 |
| :--- | :--- | :--- | :--- |
| **截圖 1** | `app3/store/appstore/iphone/01-explore.png` | 1284 × 2778 px | 探索全台鄰汪夥伴・時段與地區篩選 |
| **截圖 2** | `app3/store/appstore/iphone/02-meetup.png` | 1284 × 2778 px | 汪汪聚會・結伴同行・LINE 群組 |
| **截圖 3** | `app3/store/appstore/iphone/03-profile.png` | 1284 × 2778 px | 專屬毛孩檔案・合照認證與多狗管理 |
| **截圖 4** | `app3/store/appstore/iphone/04-connect-chat.png` | 1284 × 2778 px | 安全 Connect 與聊天・檢舉與封鎖 |

### iPad 截圖 (13" / 12.9" iPad Pro 顯示器，規格 2048 × 2732 px)
*資料夾位置：`app3/store/appstore/ipad/`*

| 欄位 | 檔案路徑 | 尺寸規格 | 畫面內容 |
| :--- | :--- | :--- | :--- |
| **截圖 1** | `app3/store/appstore/ipad/01-explore.png` | 2048 × 2732 px | 雙欄 iPad 探索版型・毛孩卡片 |
| **截圖 2** | `app3/store/appstore/ipad/02-meetup.png` | 2048 × 2732 px | iPad 聚會列表・大螢幕清楚瀏覽 |
| **截圖 3** | `app3/store/appstore/ipad/03-profile.png` | 2048 × 2732 px | 完整毛孩詳細個人檔案 |
| **截圖 4** | `app3/store/appstore/ipad/04-connect-chat.png` | 2048 × 2732 px | 安全對話與邀請互動管理 |

### App 主要圖示 (1024 × 1024 px)
| 欄位 | 檔案路徑 | 說明 |
| :--- | :--- | :--- |
| **App 圖示** | `app3/store/appstore/icon-1024.png` | App Store Connect 主要圖示（無透明度、無圓角） |

---

## 3. App 隱私權問卷回答對照

進入 App Store Connect 的 **「App 隱私權 (App Privacy)」** 頁面進行填寫：

### 資料收集項目
1. **聯絡資訊 (Contact Info)**：
   * **電話號碼 (Phone Number)**：是（用於使用者帳號識別與資料還原；不進行跨 App 廣告追蹤；連結至使用者身分）。
2. **使用者內容 (User Content)**：
   * **照片或影片 (Photos or Videos)**：是（上傳主人與狗狗合照檔案）。
   * **客戶支援 / 訊息 (Messages / Customer Support)**：是（使用者之間的聊天訊息與檢舉回報）。
3. **識別碼 (Identifiers)**：
   * **使用者識別碼 (User ID)**：是（用於帳號與雲端同步功能）。

### 追蹤聲明 (Tracking)
* **是否使用此 App 追蹤使用者？**：**否 (No)**（無第三方廣告追蹤 SDK）。

---

## 4. App 審查資訊與 Demo 帳號

在 **「App 審查資訊 (App Review Information)」** 區塊填寫：

* **需要登入**：勾選 ✔
* **使用者名稱 (Username)**：`0900000000`
* **密碼 (Password)**：`（無須密碼，直接輸入手機號碼即可進入）`
* **備註 (Notes for Reviewer)**：
```text
This app connects dog owners for outdoor walk meetups in Taiwan.
1. Sign-in Method: Users log in simply by entering their phone number (e.g., 0900000000). No SMS OTP is required for this version.
2. Safety & Moderation: In compliance with UGC Guideline 1.2, users can block and report any inappropriate profiles or messages via the "檢舉 (Report)" and "封鎖 (Block)" buttons on any profile detail page.
3. Account Deletion: Users can delete their account and associated data instantly from the Me screen (個人頁) -> 刪除帳號.
```

---

## 5. EAS 建置與上傳指令

### 1. 推送雲端環境變數 (Supabase Key)
```bash
cd /Users/leo_1/Documents/GitHub/superpredict/app/app3/mobile
npm run eas:env:push:production
npm run eas:env:list
```

### 2. 建置 iOS 生產版本並直接上傳至 TestFlight
```bash
cd /Users/leo_1/Documents/GitHub/superpredict/app/app3/mobile
npm run deploy:testflight
```
*(此指令會觸發 `eas build --platform ios --profile production --auto-submit`，完成後自動送交至 App Store Connect 的 TestFlight)*

### 3. 送審核准發佈
1. 上傳完成後於 App Store Connect 的 **TestFlight** 進行實機測試。
2. 回到 **iOS App 1.0 準備提交** 頁面，選取剛剛建置好的版本。
3. 檢查截圖與所有欄位，點擊右上角 **「新增以供審查 (Submit for Review)」** 即可。
