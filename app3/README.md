# 答禮（app3）— 問卷配對平台

第一刀：**Email 登入 + 瀏覽案件 + 開始填答（attempt token）+ 貼碼領獎**。

上架精靈／A 自助送審列為下一刀；案件與禮券可由營運直接寫入 Supabase。

## 快速開始

### 1. Supabase

1. 新建專案，Auth → Providers → Email 開啟（建議用 **OTP／6 位數碼**；Magic Link 亦可）。
2. SQL Editor 執行 [`supabase/schema.sql`](./supabase/schema.sql)。
3. 用 App 註冊一組 Email 後，查 `auth.users` 的 id，改 [`supabase/seed.sql`](./supabase/seed.sql) 裡的 `v_publisher` 再執行。

### 2. App

```bash
cd app3/mobile
cp .env.example .env
# 填入 EXPO_PUBLIC_SUPABASE_URL、EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npm start
```

套件版本對齊 app1／app2（Expo ~54）。

## 第一刀行為對照

| 規格 | 實作 |
|------|------|
| Email 驗證 | `signInWithOtp` + `verifyOtp` |
| 完成碼 = attempt token | `start_attempt` 產生 `XXXX-XXXX`，48h 時效 |
| 外連預填 | survey URL 附加 `token_query_param`（預設 `completion_code`） |
| 貼碼核銷發獎 | `redeem_attempt` 發 1 張 `locked` 禮券 |
| 擋自己領 | publisher_id === user 時拒絕 start／redeem |
| 一人一案一次 | `redemptions (listing_id, user_id)` unique |
| 禮券碼不外洩 | `vouchers` 無 SELECT policy；只經 RPC 回傳 |

## 目錄

```
app3/
  note.md              # 產品規格
  supabase/            # schema + seed
  mobile/              # Expo App「答禮」
```
