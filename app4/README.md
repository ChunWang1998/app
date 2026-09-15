# app4 — 身份牽線

依職業／身份雙向興趣配對，成功後交換 LINE ID。規格見 [`note.md`](./note.md)。

## 快速開始

```bash
cd app4/mobile
npm install
cp .env.example .env   # 填入 Supabase URL + anon key（可暫空，走本機示範）
npm start
```

未設定 Supabase 時使用本機 AsyncStorage + 內建種子用戶，方便測 UI／配對流程。

### 雲端（真人互配必做）

1. 新建 Supabase 專案，SQL Editor 執行 [`supabase/schema.sql`](./supabase/schema.sql)。
2. `mobile/.env` 填 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`。
3. EAS 建置前 push 同名變數：

```bash
cd mobile
npm run eas:env:push:preview
npm run eas:env:push:production
```

### iOS IAP

對照 [`APP_STORE_IAP.md`](./APP_STORE_IAP.md)。商品 ID 預設 `com.identitymatch.app.premium`。  
**第一次**付費 build 前請先在 App Store Connect 建好訂閱與優惠碼（見根目錄 `README.md`）。

## 技術

- Expo SDK 54、React 19.1、RN 0.81.5（對齊 app3）
- 免登入 `device_id`（對齊 app2）
- 訂閱 IAP + 優惠碼、本機權益 flag（對齊 app3）
- iOS only；無權限 Purpose String（V1 無相簿／相機／定位）
