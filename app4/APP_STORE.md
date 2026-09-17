# 業問 (CraftQ) — Apple App Store / TestFlight 上架指南

> **Bundle ID**: `com.identitymatch.app`  
> **SKU**: `EX1789542783333`  
> **Apple ID (ASC)**: `6812648080`（＝ `eas.json` → `submit.production.ios.ascAppId`）  
> **EAS 專案**: `craftq` (owner: `leowang1105`)  
> **EAS projectId**: `5b2d80c0-ebdd-468a-bae9-6f3f55e69f1c`  
> **版本目標**: `1.0.0` / iOS `buildNumber` 以 EAS `autoIncrement` 為準  
> **隱私權政策網址**: `https://chunwang1998.github.io/app/app4/store/privacy.html`  
> **技術支援網址**: `https://chunwang1998.github.io/app/app4/store/support.html`  
> **聯絡信箱**: `jjooee1998@gmail.com`

---

## 快速導覽目錄
1. [App Store Connect 欄位填寫（直接複製貼上）](#1-app-store-connect-欄位填寫直接複製貼上)
2. [App 資訊頁（側邊欄 → 一般資訊 → App 資訊）](#2-app-資訊頁側邊欄--一般資訊--app-資訊)
3. [圖形素材](#3-圖形素材)
4. [App 隱私權問卷回答對照](#4-app-隱私權問卷回答對照)
5. [App 審查資訊](#5-app-審查資訊)
6. [內購（IAP）摘要](#6-內購iap摘要)
7. [EAS 建置與上傳指令](#7-eas-建置與上傳指令)

---

## 1. App Store Connect 欄位填寫（直接複製貼上）

### 應用程式名稱 (App Name, ≤ 30 字元)
```text
業問
```

### 副標題 (Subtitle, ≤ 30 字元)
```text
認識真實從業者的工作日常
```

### 主要語言
```text
繁體中文（台灣）
```
（與 §2 App 資訊一致；若 ASC 仍顯示「英文（美國）」請先改主要語言。）

### 行銷宣傳文字 (Promotional Text, ≤ 170 字元)
```text
依職業／身份雙向興趣配對，先站內簡聊再決定是否交換 LINE。低摩擦認識真實從業者，用短聊降低亂露聯絡方式的風險。
```

### 描述 (Description, ≤ 4,000 字元)
```text
「業問」幫你依「我是誰」與「我想認識什麼身份」做雙向興趣配對。配對後先在 App 內簡聊（合計最多 20 句），雙方都同意後才顯示彼此 LINE ID，方便在站外繼續聊工作內容、學習歷程、面試或證照。

【主要特色】
・雙向身份配對：從固定職業／身份清單選擇自己與有興趣的對象，系統只撮合雙方都感興趣的人。
・站內簡聊閘門：配對後不立刻露聯絡方式；最多 20 句短聊後，雙方各自決定是否繼續。
・雙方同意才交換 LINE：任一方拒絕則結束聊天並刪除該次聊天紀錄。
・每日配對額度：免費用戶每日 1 次；Premium 每日 5 次，並可每週修改有興趣的身份。
・安全最低標：內建檢舉；平台不仲介勞動契約、不保證對方身份真實性。

【使用方式】
1. 首次開通：選自己的身份（1～5）、有興趣的身份（1～2）、填寫 LINE ID。
2. 主頁點「今日配對」進入聊天室；畫面只顯示對方身份標籤。
3. 滿 20 句後選擇是否願意繼續；雙方同意後才顯示 LINE。
4. 需要更多配對次數或修改興趣時，可一次性買斷業問 Premium（支援恢復購買）。

註：本 App 需要網際網路連線。Premium 為非消耗型一次性買斷，可於 App 內「恢復購買」還原權益。站外透過 LINE 的聯絡與糾紛由使用者自負。
```

### 關鍵字 (Keywords, ≤ 100 字元，半形逗號分隔)
```text
職業,身份,配對,面試,證照,工作,學習,LINE,職涯,業問,CraftQ
```

### 網址設定
* **支援 URL (Support URL)**:  
  `https://chunwang1998.github.io/app/app4/store/support.html`
* **行銷 URL (Marketing URL, 選填)**:  
  `https://chunwang1998.github.io/app/app4/store/support.html`
* **版權 (Copyright)**:  
  `2026 CraftQ Studio`

---

## 2. App 資訊頁（側邊欄 → 一般資訊 → App 資訊）

路徑：**我的 App → 業問 → 一般資訊 → App 資訊**。此頁為**全平台共用**；改完按右上角 **儲存**。

### 2.1 可本地化的資訊

| 欄位 | 填寫 |
|------|------|
| 語言下拉 | 建議改為 **繁體中文（台灣）**（若目前是「英文（美國）」，請改主要語言或另加繁中本地化後再填） |
| **名稱** | `業問` |
| **副標題** | `認識真實從業者的工作日常` |

> ASC 若仍顯示主要語言＝英文（美國）且名稱空著：先把主要語言改成繁中，或於英文本地化填英文名稱／副標題（例如 `CraftQ` / `Meet real practitioners`），避免送審語言不一致。

### 2.2 一般資訊（唯讀／已建好）

| 欄位 | 值 | 說明 |
|------|-----|------|
| **套件識別碼** | `com.identitymatch.app` | 建立後不可改 |
| **SKU** | `EX1789542783333` | 後台識別用，與 IAP 無關 |
| **Apple ID** | `6812648080` | 已寫入 `mobile/eas.json` → `ascAppId` |
| **內容版權** | `2026 CraftQ Studio` | 點「編輯」填入（與版本頁 Copyright 一致） |
| **許可協議** | Apple 標準許可協議 | 維持預設即可；無需自訂 EULA |
| **主要語言** | **繁體中文（台灣）** | 若 ASC 仍是「英文（美國）」請改掉 |

### 2.3 類別

| 欄位 | 建議 |
|------|------|
| **主要** | **社交網路（Social Networking）** |
| **次要** | **生活風格（Lifestyle）**（可留空；有則較貼「職涯／身份認識」） |

### 2.4 年齡分級（設定年齡分級）

依 V1 功能如實勾選。業問有**站內短聊**與**使用者產生內容**（訊息、身份標籤、檢舉），**沒有**公開動態牆／按讚分享放大，故 **不** 勾社群媒體。

#### App 內控制項目
| 項目 | 回答 |
|------|------|
| 分級保護控制（Parental Controls） | **否** |
| 年齡確認（Age Assurance） | **否** |

#### 能力
| 項目 | 回答 | 理由 |
|------|------|------|
| 未加限制的網頁存取能力 | **否** | 無內建瀏覽器／任意網頁瀏覽 |
| 使用者生成內容 | **是** | 站內訊息、身份標籤、檢舉內容 |
| 社群媒體 | **否** | 無公開動態牆／放大／按讚分享／發現頁 |
| 對未滿 13 歲的使用者停用社群媒體 | **否／不適用** | 上項為否時通常跳過或選否 |
| 傳訊和聊天 | **是** | 配對後站內簡聊（最多 20 句） |
| 廣告 | **否** | 無第三方廣告 SDK |

#### 成人題材／醫療／性或裸露／暴力／機率活動
下列全部選 **無／否**（None）：
- 粗話或低俗幽默、驚悚／恐怖、酒精／菸草／毒品
- 醫療或治療資訊、健康或保健主題
- 成人或暗示性主題、色情／裸露、露骨色情
- 卡通或幻想暴力、現實暴力、虐待式暴力、槍支或其他武器
- 賭博、模擬賭博、競賽、轉蛋

> 預期結果通常落在 **4+** 或系統依地區換算的對應分級（有 Messaging／UGC 仍可 4+；**社群媒體＝是** 才會抬高到 13+ 區間）。送審前以 ASC 算出的實際分級為準。

### 2.5 App 加密文件

| 項目 | 填寫 |
|------|------|
| 是否使用非豁免加密 | **否** |
| Info.plist | 已設 `ITSAppUsesNonExemptEncryption` = `false`（見 `mobile/app.json`） |
| 是否需上傳加密文件 | **不需**（僅 HTTPS／系統標準 TLS，無自有／非標準加密演算法） |

ASC「App 加密文件」區塊：**可跳過上傳**。

### 2.6 App Store 規範與許可／地區合規

| 區塊 | 操作 |
|------|------|
| **數位服務法（DSA）** | 於帳號層級完成「設定／驗證」交易者資訊（未完成可能影響歐盟上架／付款） |
| **中國大陸 ICP 備案編號** | **不填**（除非已有 MIIT ICP 且要上架中國大陸） |
| **越南遊戲許可證** | **不新增**（非遊戲） |
| **受監管醫療器材** | **否／不聲明為醫療器材**（非醫藥／健康類；年齡問卷醫療項亦為無） |

### 2.7 App Store 伺服器通知／共享密鑰

| 區塊 | V1 建議 |
|------|---------|
| **實際執行伺服器 URL** | **可暫不設**（非消耗型買斷＋客戶端 entitlement；無自建收據驗證 webhook 需求） |
| **沙箱伺服器 URL** | **可暫不設** |
| **App 專用共享密鑰** | **不需**（僅自動續訂訂閱收據用；本 App 為非消耗型買斷） |

---

## 3. 圖形素材

* App icon：`app4/mobile/assets/icon.png`（上架前請另備 1024×1024、無透明度、無圓角）
* 截圖（已備 6.5"/6.7" 規格，**1284 × 2778**，同 app3）：`app4/store/appstore/`
  - `iphone-67-01-home.png` — 主頁／今日配對
  - `iphone-67-02-onboarding.png` — 開通身份選擇
  - `iphone-67-03-chat.png` — 站內短聊
  - `iphone-67-04-premium.png` — Premium 買斷頁
  - 來源稿：`screenshots-source.html`（可用瀏覽器再開／重截）
  - iPad 13" / 12.9" iPad Pro（**2048 × 2732**，同 app3）：`app4/store/appstore/ipad/`
    - `ipad-13-01-home.png` — 主頁／今日配對
    - `ipad-13-02-onboarding.png` — 開通身份選擇
    - `ipad-13-03-chat.png` — 站內短聊
    - `ipad-13-04-premium.png` — Premium 買斷頁
    - 產生腳本：`app4/store/generate_ipad_screenshots.py`
  - 說明：此為依 App 視覺製作的商店預覽圖；送審前建議再用 **實機／Simulator** 真機畫面替換更佳
  - TestFlight 內部測試可不需完整截圖；**Submit for Review** 前必須上傳至 ASC

---

## 4. App 隱私權問卷回答對照

### 資料收集項目
1. **聯絡資訊 (Contact Info)**：
   * **其他使用者聯絡資訊**：是（使用者自行填寫的 LINE ID；僅在雙方同意後顯示給對方；不進行跨 App 廣告追蹤）。
2. **使用者內容 (User Content)**：
   * **訊息 (Messages)**：是（站內簡聊訊息；拒絕繼續時會刪除該次對話）。
   * **其他使用者內容**：是（身份標籤選擇、檢舉內容）。
3. **識別碼 (Identifiers)**：
   * **裝置／使用者識別碼**：是（匿名 `device_id`，用於帳號延續與每日配對次數）。

### 追蹤聲明 (Tracking)
* **是否使用此 App 追蹤使用者？**：**否 (No)**（無第三方廣告追蹤 SDK）。

### 權限
* V1 **無**相簿／相機／麥克風／定位 Purpose String。

---

## 5. App 審查資訊

* **需要登入**：否（免登入；裝置匿名開通）
* **備註 (Notes for Reviewer)**：
```text
CraftQ (業問) matches users by career/identity interest.
1. Onboarding: pick own identities (1-5), interest identities (1-2), and LINE ID. No SMS/login.
2. Daily match: free 1/day; Premium (non-consumable buyout) 5/day + weekly interest edit. After match, users chat in-app (max 20 messages total). LINE IDs are revealed only if both consent; if either declines, messages for that match are deleted.
3. IAP: non-consumable com.identitymatch.app.premium. Paywall: Buy once / Restore. Entitlement is client-side only for V1.
4. Safety: in-app report. No photo/camera/location permissions in V1.
```

---

## 6. 內購（IAP）摘要

| 項目 | 值 |
|---|---|
| 類型 | **非消耗型（Non-Consumable）／一次性買斷**（對齊 app2） |
| 產品 ID | `com.identitymatch.app.premium` |
| 週期／價格 | 無週期；於 ASC 選價格等級（建議進第一次付費 TestFlight 前建好） |
| 優惠碼 | **不使用**（Offer Codes 屬訂閱；買斷僅需恢復購買） |
| 程式 | `mobile/src/lib/iap.js`、`SubscribeScreen.js`（`type: 'in-app'`） |
| 環境變數 | `EXPO_PUBLIC_IAP_PRODUCT_ID`（production 勿開 SIMULATE） |

詳細步驟見 `APP_STORE_IAP.md`。

> **第一次付費 production build 前**：ASC 必須先建立同名 **非消耗型** 商品（勿建自動續訂訂閱）。若該 Product ID 已建成訂閱，不可改類型，需換新 Product ID 並改 `eas.json`。

---

## 7. EAS 建置與上傳指令

### 0. 前置（首次）
1. Expo 帳號已登入：`npx eas-cli whoami` → `leowang1105`
2. EAS 專案已連結（`app.json` → `extra.eas.projectId`）
3. App Store Connect 已建立 App（Bundle ID `com.identitymatch.app`），並把數字 **Apple ID** 填入 `mobile/eas.json` → `submit.production.ios.ascAppId`
4. EAS Apple 憑證就緒（首次建置時由 EAS Credentials 管理）
5. 推送 Supabase 環境變數（app4 掛 app2 專案）
6. ASC 已建立非消耗型 IAP `com.identitymatch.app.premium`（見 `APP_STORE_IAP.md`）

### 1. 推送雲端環境變數
```bash
cd /Users/leo_1/Documents/GitHub/superpredict/app/app4/mobile
npm run eas:env:push:production
npm run eas:env:list
```

### 2. 建置 iOS 生產版本並上傳至 TestFlight
```bash
cd /Users/leo_1/Documents/GitHub/superpredict/app/app4/mobile
npm run deploy:testflight
```
*(≡ `eas build --platform ios --profile production --auto-submit`)*

非互動：
```bash
npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
```

### 3. TestFlight / 送審
1. 上傳完成後於 App Store Connect → **TestFlight** 實機測試（Sandbox：買斷 + 恢復購買）。
2. 正式上架：建立版本 **1.0.0** → 選取 build → 版本頁勾選 IAP → 上傳截圖 → Submit for Review。
