# 業問 CraftQ — App Store Connect 內購（IAP）設定

> Bundle ID：`com.identitymatch.app`  
> 內購商品 ID：`com.identitymatch.app.premium`（**非消耗型** / 一次性買斷，對齊 app2）  
> 程式：`mobile/src/lib/iap.js`、`SubscribeScreen.js`、`eas.json`  
> 商店文案：`APP_STORE.md`

**前提：** 已整合 `expo-iap`；`production` 建置**不會**模擬購買。若 ASC 未建立同名 **非消耗型** IAP，用戶點「買斷解鎖」會失敗。

---

## 一、帳號與協議（先做）

1. 登入 [App Store Connect](https://appstoreconnect.apple.com/)
2. **協議、稅務與銀行業務**
   - [ ] **付費 App 協議**狀態為 **有效 / Active**
   - [ ] **銀行帳戶**已填寫並通過
   - [ ] **稅務表單**已填寫
3. 若協議仍是「待處理」，IAP 無法上架，購買也會失敗

---

## 二、確認 App 已建立

1. **我的 App** → 選 **業問**（或新建）
2. 確認 **Bundle ID**：`com.identitymatch.app`（與 `mobile/app.json` 一致）
3. `eas.json` → `submit.production.ios.ascAppId` 已填數字 Apple ID（目前 `6812648080`）

---

## 三、建立內購商品（逐步）

路徑：**我的 App → 業問 → App 內購買項目**（**不是**「訂閱」）

### 3.1 新增商品

| 步驟 | 操作 |
|------|------|
| 1 | 點 **＋** 或 **建立** |
| 2 | 類型選 **非消耗型**（Non-Consumable） |
| 3 | **參考名稱**（僅後台可見）：`業問 Premium 買斷` |
| 4 | **產品 ID**：`com.identitymatch.app.premium` |

> **產品 ID 建立後不可修改**，必須與 `EXPO_PUBLIC_IAP_PRODUCT_ID` 完全一致。  
> 若此 ID **已經**建成自動續訂訂閱，無法改成非消耗型 → 請改用新 ID（例如 `com.identitymatch.app.premium.unlock`）並同步改 `eas.json` / 程式預設值。

### 3.2 定價

1. 進入該 IAP → **定價與供應狀況**
2. 選 **價格等級**（依策略；台灣常見可選約 NT$30–150 區間）
3. 供應地區：至少 **台灣**

### 3.3 本地化（繁體中文）

| 欄位 | 建議內容（可直接貼上） |
|------|------------------------|
| **顯示名稱** | `業問 Premium` |
| **描述** | `一次性買斷解鎖：每日最多 5 次配對，並可每週修改有興趣的身份。支援恢復購買。` |

### 3.4 審查用截圖（若 Connect 要求）

上傳 App 內「業問 Premium」買斷頁（`SubscribeScreen`）截圖。

### 3.5 儲存狀態

- 必填欄位填完後，IAP 狀態應為 **準備提交**（Ready to Submit）
- **第一次**送審 App 時，須在 **版本頁** 的 **App 內購項目** 區塊 **勾選** 此 IAP 一併送審

### 3.6 不要做的事（買斷版）

- 不要建立「訂閱群組」／自動續訂
- 不要依賴 Offer Codes（屬訂閱；本版僅「買斷解鎖」+「恢復購買」）

---

## 四、Sandbox 測試帳號

1. App Store Connect → **使用者與存取權限** → **Sandbox** → **測試人員**
2. **＋** 建立新 Sandbox Apple ID（**不要用**真實 Apple ID）
3. iPhone：**設定 → App Store → Sandbox 帳號** 登入

---

## 五、建置與 TestFlight 測試

**務必使用 `production` profile**（`preview` 含 `EXPO_PUBLIC_IAP_SIMULATE=1`）。

```bash
cd app4/mobile
npm run eas:env:push:production
npm run eas:env:list
npm run deploy:testflight
```

| # | 測試項目 | 預期結果 |
|---|----------|----------|
| 1 | 主頁 → **解鎖 Premium** | 出現買斷頁 |
| 2 | 點 **買斷解鎖** | Apple 購買 sheet（Sandbox 不扣真錢） |
| 3 | 購買成功 | 每日 5 次、可改興趣 |
| 4 | 刪 App 重裝 → **恢復購買** | Premium 還原 |
| 5 | 免費路徑 | 仍為每日 1 次 |

---

## 六、送審時 IAP 相關欄位

### 6.1 版本頁 → App 內購項目

- [ ] 勾選 `com.identitymatch.app.premium`

### 6.2 審查備註（可貼）

```text
IAP: non-consumable buyout com.identitymatch.app.premium.
Paywall: 解鎖 Premium → 買斷解鎖 / 恢復購買.
Free: 1 match/day, interests locked. Paid: 5 matches/day, interests editable weekly.
Chat: in-app short chat (max 20 messages total), then mutual consent before LINE ID reveal; declined chats delete messages from DB.
```

---

## 七、後端注意

買斷權益**不寫入 Supabase**（本機 StoreKit + `app4:iapPaid`）。  
每日配對次數由伺服器依 `device_id` + `Asia/Taipei` 計算；`p_claimed_paid` 由客戶端傳入（V1 可竄改，與「僅客戶端權益」一致）。

---

## 八、上架前總檢查

- [ ] 付費 App 協議 + 銀行 + 稅務完成
- [ ] IAP 為 **非消耗型**，ID 與程式一致
- [ ] 定價、繁中名稱／描述已填；狀態 **準備提交**
- [ ] 版本頁已勾選此 IAP
- [ ] Sandbox 測試人員已建立
- [ ] production build（非 preview）已測買斷 + 恢復購買
- [ ] `EXPO_PUBLIC_IAP_SIMULATE` **未**設於 production
