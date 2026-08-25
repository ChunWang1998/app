# app3 — 鄰汪（寵物交友 MVP）

狗主人找狗主人，**全台配對、不用 GPS**。規格見 [`note.md`](./note.md)。

前端：Expo SDK 54、React 19.1.0、React Native 0.81.5。縣市／行政區由使用者手選；行政區清單用國土測繪中心 API 依所選縣市抓取。

```bash
cd app3/mobile
npm install
cp .env.example .env   # 填入 Supabase URL + anon key
npm start
```

### 試用規則（已實作）
- **不用定位**：探索／聚會預設看全台；可用縣市（與行政區）Chip 篩選
- 試用縣市選項：臺北市、新北市、臺南市、高雄市（手選，非 GPS）
- 前 100 人填手機號**並同時建立汪汪檔案**（**不驗證碼**）才寫入創始白名單
- 一帳號最多 **3 隻狗**；探索一隻狗一張卡；Connect 仍是主人 ↔ 主人
- 同一支號碼換機可還原雲端檔案
- v1 **不收款**、不預期超過 100 人；這 100 人到 v2 自動視為已訂閱
- 底部兩頁：探索、聚會；個人頁在右上角
- 範例汪汪（團團、可可）置頂
- 汪汪聚會全台列出（卡片顯示縣市）；可選縣市篩選；個人頁可創辦（必附 LINE 群組連結）
- 清單排序：出去次數 → 資料豐富程度；體型差兩級 Connect 前會警示
- Connect 後聊天最多 20 句；雙方互按「已見面」才 +1 出去次數
- 檢舉／封鎖、刪除帳號

### 雲端（上架必做）
未設 env 時，白名單／檔案／聊天都在本機，無法跨裝置。

1. 新建 Supabase 專案，SQL Editor 執行 [`supabase/schema.sql`](./supabase/schema.sql)（含 `dogs`、`list_profiles`、`list_gatherings`）。
2. 本機：`mobile/.env` 填 `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`。
3. **EAS / 商店建置：** 同名變數必須 push 到 EAS 再打 preview／production。

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
npm run build:android:preview
npm run deploy:play
```

Package：`com.linwang.app`。v1 **不收款**。不要求定位權限。
