# app3 — 鄰汪（寵物交友 MVP）

本地狗主人找附近狗主人。規格見 [`note.md`](./note.md)。

前端對齊 app2：Expo SDK 54、React 19.1.0、React Native 0.81.5。定位流程同 app2（先 last-known，再 low-accuracy current）。行政區**不寫死**，用國土測繪中心即時 API **只抓用戶所在縣市**。

```bash
cd app3/mobile
npm install
cp .env.example .env   # 填入 Supabase URL + anon key
npm start
```

模擬器請把定位設在試用四市之一（例如高雄 22.6273, 120.3014）。定位失敗沒有縣市下拉備案。

### 試用規則（已實作）
- 服務範圍：臺北市、新北市、臺南市、高雄市；每人只看**目前所在縣市**（不能手選切換）
- 前 100 人填手機號**並同時建立狗檔案**（**不驗證碼**）才寫入創始白名單；空帳號不佔名額
- 同一支號碼換機可還原雲端檔案
- v1 **不收款**、不預期超過 100 人；這 100 人到 v2 自動視為已訂閱
- 底部兩頁：探索、聚會；個人頁在右上角
- 探索看鄰汪夥伴，時段為平日／假日 × 早／中／晚；範例汪汪（團團、可可）置頂
- 汪汪聚會在聚會頁依主辦人大隊長分數排序；個人頁可創辦（必附 LINE 群組連結）
- 清單排序：出去次數 → 資料豐富程度；體型差兩級 Connect 前會警示
- Connect 後聊天最多 20 句；雙方互按「已見面」才 +1 出去次數（伺服器加，不能自己改）
- 檢舉／封鎖、刪除帳號

v2（尚未做）：Apple 內購月繳；未訂閱可建檔、看人／聚會、看邀請；不能主動 Connect／報名／創辦；已付費可對未訂閱發 Connect。白名單不必付。

### 雲端（上架必做）
未設 env 時，白名單／檔案／聊天都在本機，無法跨裝置。

1. 新建 Supabase 專案，SQL Editor 執行 [`supabase/schema.sql`](./supabase/schema.sql)。
2. 本機：`mobile/.env` 填 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`。
3. **EAS / 商店建置：** 同名變數必須 push 到 EAS 再打 preview／production，否則上架包連不到雲端。

```bash
cd mobile
npm run eas:env:push:preview
npm run eas:env:push:production
npm run eas:env:list
```

### Android（Google Play）

對照文案與檢查清單見 [`PLAY_STORE.md`](./PLAY_STORE.md)。隱私／支援頁：[`store/privacy.html`](./store/privacy.html)、[`store/support.html`](./store/support.html)。

```bash
cd mobile

# 內部測試 APK
npm run build:android:preview

# 正式 AAB 並提交 Play internal / draft
npm run deploy:play
```

Package：`com.linwang.app`。v1 **不收款**。付費訂閱在 v2；v1 註冊的 100 人自動進白名單。
