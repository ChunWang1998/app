# 急廁 Go — App Store Connect 內購（IAP）設定

> Bundle ID：`com.toiletgo.app`  
> 內購商品 ID：`com.toiletgo.app.fullpack`（**非消耗型** / 一次性買斷）  
> 程式對照：`mobile/src/lib/iap.js`、`mobile/eas.json`（production profile）  
> 商店文案：`STORE_COPY.md` · Android 對照：`PLAY_STORE.md`

**前提：** App 程式已整合 `expo-iap`；`production` 建置**不會**模擬購買。若 App Store Connect 未建立同名 IAP，用戶點「解鎖」會失敗。

---

## 一、帳號與協議（先做）

1. 登入 [App Store Connect](https://appstoreconnect.apple.com/)
2. **協議、稅務與銀行業務**（首頁或側欄）
   - [ ] **付費 App 協議**（Paid Applications Agreement）狀態為 **有效 / Active**
   - [ ] **銀行帳戶** 已填寫並通過
   - [ ] **稅務表單** 已填寫（台灣開發者依指示填 W-8BEN 等）
3. 若「付費 App 協議」仍是「待處理」，IAP 無法上架，購買也會失敗

---

## 二、確認 App 已建立

1. **我的 App** → 選 **急廁 Go**（或新建）
2. 確認：
   - **Bundle ID**：`com.toiletgo.app`（須與 `mobile/app.json` 一致）
   - **SKU**：自訂即可（例如 `toilet-go-ios`），與 IAP 無關
3. 若尚未建立：App Store Connect → 我的 App → **＋** → 新建 App → 選上述 Bundle ID

---

## 三、建立內購商品（逐步）

路徑：**我的 App → 急廁 Go → App 內購項目**（或 **功能 → App 內購項目**）

### 3.1 新增商品

| 步驟 | 操作 |
|------|------|
| 1 | 點 **＋** 或 **建立** |
| 2 | 類型選 **非消耗型**（Non-Consumable） |
| 3 | **參考名稱**（僅後台可見）：`完整資料包 Pro` |
| 4 | **產品 ID**：`com.toiletgo.app.fullpack` |

> **產品 ID 建立後不可修改**，必須與 App 內 `EXPO_PUBLIC_IAP_PRODUCT_ID` 完全一致。

### 3.2 定價

1. 進入該 IAP → **定價與供應狀況**（Pricing and Availability）
2. 選 **價格等級**（建議 **Tier 1–3**，約 NT$30–90，依你策略）
3. 供應地區：預設全球或至少 **台灣**

### 3.3 本地化（繁體中文）

在 IAP 頁面 → **App Store 本地化資訊** → 新增 **繁體中文**：

| 欄位 | 建議內容（可直接貼上） |
|------|------------------------|
| **顯示名稱** | `完整資料包` |
| **描述** | `解鎖公廁、全家、加油站、路易莎、星巴克、寶雅、百貨、捷運等全部類型，並下載離線資料包。一次性買斷，支援恢復購買。` |

（英文可選填，非台灣-only 上架時建議補 **English** 同名稱與描述。）

### 3.4 審查用截圖（若 Connect 要求）

部分帳號會要求 IAP 審查截圖：

- 上傳 App 內「解鎖完整資料包」Modal 截圖（`UnlockProModal`）
- 或地圖頁右上角「解鎖」按鈕 + 購買說明畫面

### 3.5 儲存狀態

- 必填欄位填完後，IAP 狀態應為 **準備提交**（Ready to Submit）
- **第一次** 送審 App 時，須在 **版本頁** 的 **App 內購項目** 區塊 **勾選** 此 IAP 一併送審

---

## 四、Sandbox 測試帳號

1. App Store Connect → **使用者與存取權限** → **Sandbox** → **測試人員**
2. **＋** 建立新 Sandbox Apple ID（**不要用** 你的真實 Apple ID）
   - 例：`toiletgo.iap.test@icloud.com`（可用 +alias 信箱）
   - 密碼自訂；國家/地區選 **台灣**
3. 在 **iPhone 設定** → **App Store** → 最下方 **Sandbox 帳號** 登入此測試帳號  
   （iOS 17+ 可能在購買彈窗時才要求登入 Sandbox）

---

## 五、建置與 TestFlight 測試

**務必使用 `production` profile**（`preview` 含 `EXPO_PUBLIC_IAP_SIMULATE=1`，會模擬購買，無法測真實 StoreKit 流程）。

```bash
cd app2/mobile

# Supabase（投票／留言；審核會測）
npm run eas:env:push:production
npm run eas:env:list   # 確認有 EXPO_PUBLIC_SUPABASE_*（勿公開印出 key）

# iOS 正式建置
eas build --platform ios --profile production

# 上傳 TestFlight
eas submit --platform ios --latest
# 或：npm run deploy:testflight
```

TestFlight 安裝後，用 **Sandbox 帳號** 實機測：

| # | 測試項目 | 預期結果 |
|---|----------|----------|
| 1 | 地圖 → 右上角 **解鎖** | 出現「解鎖完整資料包」 |
| 2 | 點 **買斷解鎖** | 跳出 Apple 購買 sheet（Sandbox 不扣真錢） |
| 3 | 購買成功 | 自動開始下載資料包（約 7 MB） |
| 4 | 下載完成 | 地圖可顯示公廁等非 7-11 類型；右上角顯示已解鎖 |
| 5 | 刪 App 重裝 → **恢復購買** | 可恢復解鎖並重新下載／使用本機包 |
| 6 | 飛航模式（已下載後） | 離線仍可用完整資料 |

CDN 確認（購買後下載用）：

- `https://chunwang1998.github.io/app/places/pack/manifest.json`
- `https://chunwang1998.github.io/app/places/pack/full.json`

若下載失敗，先跑 `app2/deploy-places.sh` 更新 gh-pages。

---

## 六、送審時 IAP 相關欄位

### 6.1 版本頁 → App 內購項目

- [ ] 勾選 `com.toiletgo.app.fullpack`（與此版本一併送審）

### 6.2 App 審查資訊 → 備註（建議追加）

在 `STORE_COPY.md` 既有備註後面加上：

```
【內購測試】
・右上角「解鎖」→「買斷解鎖」為非消耗型 IAP（完整資料包）
・免費版僅線上載入 7-11；買斷後可下載離線包並解鎖公廁等類型
・可使用 Sandbox 帳號測試購買；「恢復購買」可還原已買斷用戶
・購買成功後需網路下載約 7MB 資料包（首次）
```

### 6.3 App 隱私權

- 購買由 **Apple** 處理；App 僅在本機記錄解鎖狀態（見 `store/privacy.html`）
- 不需額外勾「購買紀錄」為你方收集（除非日後自建收據驗證後端）

---

## 七、上架前總檢查

### App Store Connect

- [ ] 付費 App 協議 + 銀行 + 稅務 完成
- [ ] IAP `com.toiletgo.app.fullpack` 已建立（非消耗型）
- [ ] IAP 定價、繁中名稱／描述 已填
- [ ] IAP 狀態 **準備提交**
- [ ] 版本頁已勾選此 IAP
- [ ] Sandbox 測試人員已建立

### 建置與後端

- [ ] `eas build --platform ios --profile production`（非 preview）
- [ ] EAS production 已 push Supabase env
- [ ] GitHub Pages：`privacy.html`、`support.html`、places CDN + pack 可開
- [ ] TestFlight：購買 + 下載 + 恢復購買 皆通過

### 程式（無需再改即可上架）

- [x] `EXPO_PUBLIC_IAP_PRODUCT_ID=com.toiletgo.app.fullpack`（`eas.json` production）
- [x] production **未** 設定 `EXPO_PUBLIC_IAP_SIMULATE`
- [x] `expo-iap` plugin（`app.json`）
- [x] 恢復購買 UI（`UnlockProModal`）

---

## 八、常見問題

| 現象 | 可能原因 | 處理 |
|------|----------|------|
| 購買按鈕報錯 / 找不到商品 | ASC 未建 IAP 或 ID 不一致 | 核對 `com.toiletgo.app.fullpack` |
| 一直跳出「模擬購買」 | 用了 preview build 或 Expo Go | 改 TestFlight production build |
| 購買成功但下載失敗 | CDN 無 pack 或網路問題 | 檢查 manifest / full.json URL |
| Sandbox 無法購買 | 未登入 Sandbox 帳號 | 設定 → App Store → Sandbox |
| 審核問如何測 IAP | 備註未說明 | 用第六節備註模板 |
| 恢復購買找不到 | 不同 Apple ID 或從未購買 | 用購買時同一 Sandbox ID 測 |

---

## 九、與 Android 對照

| 項目 | iOS | Android |
|------|-----|---------|
| 商品 ID | `com.toiletgo.app.fullpack` | 同左 |
| 類型 | 非消耗型 | 非消耗型（一次性） |
| 後台 | App Store Connect | Play Console |
| 測試 | Sandbox Apple ID + TestFlight | 授權測試 Gmail + Internal testing |
| 詳細文件 | 本檔 | `PLAY_STORE.md` |

---

完成 IAP 設定並 TestFlight 驗證後，再依 `STORE_COPY.md` 填版本頁 → **新增以供審查**。
