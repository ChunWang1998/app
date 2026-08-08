# app

注意expo 的package 版本, 都安裝app1 的同個版本號

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
