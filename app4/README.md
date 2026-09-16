# app4 — 選業問（CraftQ）

依職業／身份雙向興趣配對 → 站內簡聊最多 20 句 → **雙方同意後**才交換 LINE ID。規格見 [`note.md`](./note.md)。

## 快速開始

```bash
cd app4/mobile
npm install
cp .env.example .env   # 填入 Supabase URL + anon key（可暫空，走本機示範）
npm start
```

未設定 Supabase 時使用本機 AsyncStorage + 內建種子用戶（會自動回訊息），方便測 UI／配對／短聊／同意閘門。

> 雲端：請在 app2 專案 SQL Editor **重新執行** [`supabase/schema.sql`](./supabase/schema.sql)（含 messages 與同意 RPC）。

### 雲端（真人互配必做）

Supabase 免費額度僅 **2 個 active 專案**（已給 app2、app3），**不要再建新專案**。  
維護成本最低的做法：把 app4 掛進 **app2（急廁 Go）** 的既有專案。

- 選 app2 而非 app3：app2 後端很瘦（`votes`／`comments`），與 app4 的 `profiles`／`matches`／`reports` 幾乎不撞名；app3 已有 `profiles`／`reports`，直接執行 schema 會衝突。
- 免費、同一個 Dashboard，不必自架或另開 Neon。

步驟：

1. 開啟 **app2** 的 Supabase 專案 → SQL Editor 執行 [`supabase/schema.sql`](./supabase/schema.sql)。
2. `mobile/.env` 填入 **與 app2 相同** 的 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`（可從 `app2/mobile/.env` 複製）。
3. EAS 建置前 push 同名變數：

```bash
cd mobile
npm run eas:env:push:preview
npm run eas:env:push:production
```

### iOS / TestFlight

對照 [`APP_STORE.md`](./APP_STORE.md)、[`APP_STORE_IAP.md`](./APP_STORE_IAP.md)、[`mobile/RELEASE_1.0.0.md`](./mobile/RELEASE_1.0.0.md)。

```bash
cd mobile
npm run eas:env:push:production
npm run deploy:testflight
```

商品 ID 預設 `com.identitymatch.app.premium`。  
**第一次**付費功能實測前請先在 App Store Connect 建好訂閱與優惠碼（見根目錄 `README.md`）。

## 技術

- Expo SDK 57、React 19.2、RN 0.86.3
- 免登入 `device_id`（對齊 app2）
- 訂閱 IAP + 優惠碼、本機權益 flag（對齊 app3）
- iOS only；無權限 Purpose String（V1 無相簿／相機／定位）
