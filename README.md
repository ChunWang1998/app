# app

## app1 — 諧音梗遊戲（Expo）

```bash
cd app1/game
npm start
```

Expo 啟動後：`i` iOS / `a` Android / `w` Web，或用 Expo Go 掃 QR。

也可：`npm run ios` / `npm run android` / `npm run web`

---

## app2 — 急廁 Go（超商廁所）

### Mobile（Expo，主要 demo）

```bash
cd app2/mobile
npm start
```

用法同 app1（`i` / `a` / `w` 或 Expo Go）。

### 更新資料（可選）

```bash
cd app2
python3 fetchData/get711List.py
python3 fetchData/getLuisaList.py
python3 fetchData/buildDataSet.py   # → data/dataSet.json，並同步到 mobile/assets/ 與 web/public/
```

### Web（舊版 demo，可選）

```bash
cd app2/web
npm install
npm run dev
```
