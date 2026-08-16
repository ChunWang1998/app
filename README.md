# app

注意 expo 的 package 版本，都安裝 app1 的同個版本號。

## app1 — 諧音猜猜 / SoundAlike（Expo）

```bash
cd app1/game
npm start
```

---

## app2 — 急廁 Go（超商廁所）

### Mobile（Expo，主要 demo）

```bash
cd app2/mobile
npm start
```

### 更新資料（可選）

```bash
cd app2
python3 fetchData/get711List.py
python3 fetchData/getLuisaList.py
python3 fetchData/buildDataSet.py   # → data/dataSet.json，並同步到 mobile/assets/ 與 web/public/
```

---

## app3 — 鄰汪（寵物交友）

本地狗主人找附近狗鄰居。規格見 [`app3/note.md`](./app3/note.md)。

```bash
cd app3/mobile
npm install
npm start
```
