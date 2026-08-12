# app3 — SutraCopy（共抄）

SutraCopy — 群組共抄佛經 App。免登入房間碼、句單元點選完成、精選繁體離線經文。需求見 [`note.md`](./note.md)。

## Mobile（Expo）

套件版本對齊 **app1**（Expo `~54` / React `19.1.0` / RN `0.81.5`）。

```bash
cd app3/mobile
npm install
npm start
```

可選：複製 `.env.example` 為 `.env` 並設定 `EXPO_PUBLIC_CORPUS_CDN_BASE`（全庫下載 CDN）。

### MVP 已落地

1. 首頁：開房／輸入房間碼／我的房間（下拉刷新）；**每人最多 3 房**（長按離開）；**設定**
2. 開房：房間名稱、房主選定經文、暱稱、每日句數；6 位數字房間碼
3. 抄寫：大字句單元、點選完成、字級可調、**注音開關**；平板雙欄
4. 房間：成員今日進度、補抄、系統分享；房主可更換經文
5. **佛典庫**：內建 10 部入門包（CBETA work_id）；設定頁可下載完整佛典庫（需 CDN）

### 佛典庫建置

```bash
# 入門包 → mobile/assets/corpus/starter/
cd app3/tools/cbeta-build && npm run build:starter

# 全庫（CBETA 純文字放入 input/txt/ 後）
CBETA_VERSION=2026R1 npm run build:full
# 輸出 app3/corpus-dist/full/ → 部署到 CDN
```

詳見 [`tools/cbeta-build/README.md`](./tools/cbeta-build/README.md)。

### 說明

- 房間資料在本機 AsyncStorage；經文入門包在 assets，全庫在文件目錄
- 經文 ID 使用 CBETA 純文字 `work_id`（如 `T0251`；XML 式 `T08n0251` 會自動對應）
- 不做：登入、積分、5 點推播、手迹筆畫、AI 影片
