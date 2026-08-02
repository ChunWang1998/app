一個超商廁所app（品牌：急廁 Go）
一人開發, 先以mvp 為主, 先只串711即可（路易莎資料已可合併）

# intro
模式類似ubike 或goshare, 你可以就近找到離你最近的三個有廁所的地點
頁面1: 可愛輕鬆的畫面: "趕快找到你附近的廁所！"
頁面2: 即時地圖, 根據 dataSet.json 顯示離使用者最近且還在營業時間的 3 個廁所

前端：`mobile/`（Expo，對齊 app1 的 `npm start` demo 流程）
舊版 web demo 仍在 `web/`（可選）

## 定位（MapScreen）
- 先 `getLastKnownPositionAsync` 立刻出圖，再 `getCurrentPositionAsync`（Low accuracy + 約 6s timeout）精修
- 地圖一定畫「我的位置」Marker（不只靠 `showsUserLocation`，避免 Web／模擬器看不到藍點）
- 權限拒絕或定位失敗 → 改用高雄市中心示範座標

# 資料來源
可從 fetchData/ run 各個 python script 取得 json 到 data/ , 再集合到 dataSet.json
admin 會定期去更新 dataSet.json 內容

## json schema
```json
{
  "id": "string",
  "type": "string",
  "name": "string",
  "地址": "string",
  "lat": "number",
  "lng": "number",
  "營業時間": {
    "raw": "string",
    "allDay": "boolean",
    "unknown": "boolean",
    "byDay": {
      "1": [{"open": "HH:MM", "close": "HH:MM"}],
      "2": [{"open": "HH:MM", "close": "HH:MM"}],
      "3": [{"open": "HH:MM", "close": "HH:MM"}],
      "4": [{"open": "HH:MM", "close": "HH:MM"}],
      "5": [{"open": "HH:MM", "close": "HH:MM"}],
      "6": [{"open": "HH:MM", "close": "HH:MM"}],
      "7": [{"open": "HH:MM", "close": "HH:MM"}]
    }
  },
  "備註": ["string"]
}
```

欄位說明:
- id: 唯一識別（優先用門市 POIID，否則 hash(type+地址)）
- type: `7-11` / `family` / `加油站` / `路易莎` / `麥當勞`（MVP 先 7-11，可合併路易莎）
- name: 門市名稱（可選）
- 地址: 地址字串
- lat / lng: WGS84 經緯度（算最近距離必填）
- 營業時間: 結構化時段（見下方規範）；顯示用 `raw`，判斷營業用 `byDay` / `allDay`
- 備註: 用戶留言（MVP 先給空陣列）

## 營業時間規範（統一規格）

來源網站字串不一（`24H`、`06:00 ~ 23:59`、`週一至週日 07:00-21:00`…），
抓資料時一律經 `fetchData/hours.py` 的 `normalize_hours()` 轉成下列物件，前端只依此判斷。

### 欄位
| 欄位 | 型別 | 說明 |
|------|------|------|
| `raw` | string | 原始字串，給 UI 顯示 |
| `allDay` | boolean | `true` = 24 小時營業 |
| `unknown` | boolean | `true` = 無法解析；MVP 視為「當作有開」以免漏列 |
| `byDay` | object | key 為 ISO 星期 `1`=週一 … `7`=週日；value 為當日時段陣列 |

### 時段規則
- 每個 slot：`{"open":"HH:MM","close":"HH:MM"}`（24 小時制，補零）
- 某日 `[]` = 該日公休
- `close < open`（例如 `06:00`–`01:00`）= 跨日，開到隔日 close
- `allDay: true` 時 `byDay` 填滿 `00:00`–`24:00`（前端也可直接看 `allDay`）
- MVP 不處理國定假日／寒暑假；`假日`／`例假日`／`週末` 一律當週六、日

### 判斷伪碼（前端）
```
if unknown → open
if allDay → open
slots = byDay[isoWeekday(now)]   // JS: ((getDay()+6)%7)+1
if slots empty → closed
for each slot:
  if close <= open:  // overnight
    open if now >= open OR now < close
  else:
    open if open <= now < close
```

### 範例
```json
// 7-11 24H
{"raw":"24H","allDay":true,"unknown":false,"byDay":{"1":[{"open":"00:00","close":"24:00"}],"...":"..."}}

// 非全年無休
{"raw":"06:00 ~ 23:59","allDay":false,"unknown":false,
 "byDay":{"1":[{"open":"06:00","close":"23:59"}],"2":[{"open":"06:00","close":"23:59"}],"...":"同左"}}

// 平日／週末不同
{"raw":"週一至週五 07:00-21:00 週末 08:00-20:00","allDay":false,"unknown":false,
 "byDay":{
   "1":[{"open":"07:00","close":"21:00"}],
   "6":[{"open":"08:00","close":"20:00"}],
   "7":[{"open":"08:00","close":"20:00"}]
 }}
```

# cmd

```bash
# 1) 抓資料
python3 fetchData/get711List.py
python3 fetchData/getLuisaList.py

# 2) 合併 → data/dataSet.json（並同步到 mobile/assets/ 與 web/public/）
python3 fetchData/buildDataSet.py

# 3) Expo demo（同 app1）
cd mobile && npm install && npm start
```
