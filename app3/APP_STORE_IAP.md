# 鄰汪 — App Store Connect 訂閱（IAP）設定

> Bundle ID：`com.linwang.app`  
> 訂閱商品 ID：`com.linwang.app.premium`（**自動續訂／月繳**）  
> 建議價格：NT$60／月  
> 優惠碼：一個月免費（Offer Codes）  
> 程式：`mobile/src/lib/iap.js`、`SubscribeScreen.js`、`eas.json`

**前提：** 已整合 `expo-iap`；`production` 建置**不會**模擬購買。ASC 必須建立同名訂閱，否則購買會失敗。

---

## 一、協議

1. App Store Connect → **協議、稅務與銀行業務**
2. **付費 App 協議**須為 **有效**
3. 銀行帳戶、稅務表單已完成

---

## 二、建立訂閱

路徑：**我的 App → 鄰汪 → 訂閱**（Subscriptions）

1. 建立 **訂閱群組**（例如 `Linwang Premium`）
2. 新增自動續訂訂閱：
   - **產品 ID**：`com.linwang.app.premium`（建立後不可改）
   - **期間**：1 個月
   - **價格**：台灣約 NT$60（選對應等級）
3. 本地化（繁中）：
   - 顯示名稱：`鄰汪 Premium`
   - 描述：`解鎖主人詳情 Connect、聊天與汪汪聚會。探索清單仍可免費瀏覽。`
4. 狀態達 **準備提交**；版本頁勾選此訂閱一併送審

---

## 三、優惠碼（一個月免費）

1. 進入該訂閱 → **優惠代碼 / Offer Codes**
2. 建立 Free offer，期間 **1 個月**
3. 產生代碼後私下發給前期用戶
4. App 內「兌換優惠碼」會呼叫系統兌換畫面；也可在 App Store 兌換
5. 之後要停優惠：停止發碼／停用該 offer（已兌換者用到免費期結束）

---

## 四、Sandbox 測試

1. **使用者與存取權限 → Sandbox → 測試人員** 建立測試 Apple ID
2. 裝置登入 Sandbox 帳號
3. 用 **production** profile 的 TestFlight 建置測：訂閱、恢復購買、兌換優惠碼  
   （`preview` 含 `EXPO_PUBLIC_IAP_SIMULATE=1`，無法測真實 StoreKit）

```bash
cd app3/mobile
npm run eas:env:push:production
npm run deploy:testflight
```

---

## 五、審查備註（可貼）

```text
IAP: auto-renewable subscription com.linwang.app.premium (NT$60/month).
Paywall: 訂閱鄰汪 Premium → 立即訂閱 / 恢復購買 / 兌換優惠碼.
Browse list is free; Connect / chat / gatherings require active subscription.
```

---

## 六、後端注意

訂閱狀態**不寫入 Supabase**（本機 StoreKit + `linwang:iapPaid`）。  
請在 Supabase 執行 `supabase/migrations/20260309_iap_client_gate.sql`，讓 RPC 不再用 founder／paid 擋 Connect。
