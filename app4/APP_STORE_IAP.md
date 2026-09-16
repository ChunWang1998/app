# 業問 CraftQ — App Store Connect 訂閱（IAP）設定

> Bundle ID：`com.identitymatch.app`（見 `mobile/app.json`，可再調整）  
> 訂閱商品 ID：`com.identitymatch.app.premium`（**自動續訂**；週期／價格暫緩）  
> 程式：`mobile/src/lib/iap.js`、`SubscribeScreen.js`、`eas.json`

**前提：** 已整合 `expo-iap`；`production` 建置**不會**模擬購買。ASC 必須建立同名訂閱。

---

## 一、協議

1. App Store Connect → **協議、稅務與銀行業務**
2. **付費 App 協議**須為 **有效**
3. 銀行帳戶、稅務表單已完成

---

## 二、建立訂閱

路徑：**我的 App → 業問 → 訂閱**

1. 建立 **訂閱群組**（例如 `CraftQ Premium`）
2. 新增自動續訂訂閱：
   - **產品 ID**：`com.identitymatch.app.premium`（建立後不可改）
   - **期間／價格**：待產品決策後填入
3. 本地化（繁中）建議：
   - 顯示名稱：`業問 Premium`
   - 描述：`每日最多 5 次配對，並可每週修改有興趣的身份。`
4. 狀態達 **準備提交**；版本頁勾選此訂閱一併送審

---

## 三、優惠碼

1. 進入該訂閱 → **優惠代碼 / Offer Codes**
2. 建立 Free offer（建議 1 個月，可再調整）
3. App 內「兌換優惠碼」呼叫系統兌換畫面

---

## 四、Sandbox／TestFlight

1. 建立 Sandbox 測試 Apple ID
2. 用 **production** profile 的 TestFlight 建置測訂閱、恢復購買、優惠碼  
   （`preview` 含 `EXPO_PUBLIC_IAP_SIMULATE=1`）

```bash
cd app4/mobile
npm run eas:env:push:production
npm run deploy:testflight
```

---

## 五、審查備註（可貼）

```text
IAP: auto-renewable subscription com.identitymatch.app.premium.
Paywall: 訂閱 Premium → 立即訂閱 / 恢復購買 / 兌換優惠碼.
Free: 1 match/day, interests locked. Paid: 5 matches/day, interests editable weekly.
Chat: in-app short chat (max 20 messages total), then mutual consent before LINE ID reveal; declined chats delete messages from DB.
```

---

## 六、後端注意

訂閱狀態**不寫入 Supabase**（本機 StoreKit + `app4:iapPaid`）。  
每日配對次數由伺服器依 `device_id` + `Asia/Taipei` 計算；`p_claimed_paid` 由客戶端傳入（V1 可竄改，與「僅客戶端權益」一致）。
