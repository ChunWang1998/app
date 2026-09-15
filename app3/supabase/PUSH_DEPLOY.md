# Deploy notes (2026-03-15)

## 1. SQL
Run in Supabase SQL Editor:
`supabase/migrations/20260315_push_and_entitlement.sql`

## 2. Edge Function (Connect push)
```bash
cd app3
supabase functions deploy push-connect
```
Function file: `supabase/functions/push-connect/index.ts`

Without deploy, Connect still works; push is best-effort and fails quietly.

## 3. Product rules
- Unsubscribed users appear in Explore with 「未訂閱」badge.
- Connect to them is allowed; sender sees a warning that they will not get a push.
- Push is only sent when recipient `subscription` is `paid` or `founder`.
- Client syncs IAP via `sync_iap_entitlement` so Explore badges stay accurate.
