一個超商廁所 app（品牌：急廁 Go）
一人開發，先以 MVP 為主，先只串 7-11 即可（路易莎資料已可合併）

# intro
模式類似 Ubike 或 GoShare：就近找到離你最近、且還在營業的三個有廁所地點。

- 頁面 1：可愛輕鬆的 Landing：「趕快找到你附近的廁所！」＋ Q 版木頭 WC 旗
- 頁面 2：即時地圖，依定位載入附近格子的地點，顯示最近三間；支援投票、評論、說明

前端：`mobile/`（Expo，對齊 app1 的 `npm start` demo 流程）  
舊版 web demo 仍在 `web/`（可選；互動功能以 mobile 為準）

## 定位（MapScreen）
- 先 `getLastKnownPositionAsync` 立刻出圖，再 `getCurrentPositionAsync`（Low accuracy + 約 6s timeout）精修
- 定位成功時靠 `showsUserLocation` 顯示系統藍點；不再另外畫「我的位置」Marker
- 權限拒絕或定位失敗 → 改用高雄市中心示範座標

## UX（MapScreen）

### 清單與地圖
- 點清單卡片或地圖 Marker → 由下往上出現細節 Bottom Sheet，蓋過原清單
- Sheet 兩段式（類似 Google Maps）：
  - 第一段（~34%）：店名、距離、營業、導航、最近幾則評論
  - 再往上（~78%）：全部評論 + 留言輸入（**最多 30 字**；每店最多 **10** 則，超額刪最舊）
  - 詳情為實心底板，直接蓋過清單（不半透明）
- 長按清單卡片 → 選「複製地址」或「分享」（內容為地址，非座標）
- 右上角「說明」：
  - **支援類型：** 7-11（陸續開放路易莎、全家等等）
  - **支援地點：** 高雄市（陸續開放其他縣市）

### 左右滑投票
- **右滑** → 顯示讚 icon，`vote +1`
- **左滑** → 顯示倒讚 icon，`vote -1`，該卡從目前三間移除，並從距離 pool（25 間）補下一間建議
- **一裝置一地一票**（匿名 `device_id`；無登入）：DB 唯一鍵保證
- 顏色依**全局**分數：`> 0` **金色發光**、`= 0` 綠、`< 0` 淡紅

### 雲端（Supabase，全局投票／留言）
- Schema：`app2/supabase/schema.sql`（Dashboard → SQL Editor 執行一次）
- API Keys（anon / publishable）：https://supabase.com/dashboard/project/xrsikhytiuirliabldmg/settings/api-keys
- App 設定：`mobile/.env`（參考 `.env.example`）
  - `EXPO_PUBLIC_SUPABASE_URL` = `https://xxxx.supabase.co`（**不要**加 `/rest/v1/`）
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = anon 或 publishable key
- 本機只存匿名 `toiletgo:device_id`（AsyncStorage）
- 程式：`src/lib/supabase.js`、`community.js`、`deviceId.js`
- 左右滑圖示：`assets/vote-icons.jpeg`

# 資料來源
可從 `fetchData/` run 各個 python script 取得 json 到 `data/`，再集合到 `dataSet.json`，並切成空間格子到 `data/dist/`（同步 `web/public/places/`、`mobile/assets/places/`）。  
admin 會定期重跑 `buildDataSet.py`。客戶端只載入使用者附近 9 格，不再整包 import `dataSet.json`。

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
- 備註: 種子留言（可空陣列）；使用者新留言存在本機，之後可改後端同步

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

# mobile 結構（互動相關）

| 路徑 | 用途 |
|------|------|
| `src/screens/LandingScreen.js` | Landing＋WcFlag |
| `src/screens/MapScreen.js` | 地圖／清單／投票／詳情 |
| `src/components/WcFlag.js` | Q 版木頭 WC 旗 |
| `src/components/PlaceCard.js` | 可左右滑的清單卡 |
| `src/components/PlaceDetailSheet.js` | 兩段式詳情＋留言 |
| `src/components/HelpModal.js` | 右上角說明 |
| `src/components/PlaceActionsModal.js` | 長按：複製／分享 |
| `src/lib/community.js` | Supabase 全局 votes／comments |
| `src/lib/supabase.js` | Supabase client |
| `src/lib/deviceId.js` | 匿名裝置 ID |
| `supabase/schema.sql` | DB schema（SQL Editor 執行） |
| `src/lib/geo.js` | 距離、營業、`nearestOpen(pool)` |

依賴：`@gorhom/bottom-sheet`、`react-native-gesture-handler`、`react-native-reanimated`、`@react-native-async-storage/async-storage`、`expo-clipboard`

# cmd

```bash
# 1) 抓資料
python3 fetchData/get711List.py
python3 fetchData/getLuisaList.py

# 2) 合併 → data/dataSet.json + 空間格子 shards（同步到 web/public、mobile assets；已 gitignore）
python3 fetchData/buildDataSet.py
# clone / 更新資料後務必重跑，否則 web/mobile 沒有 cells

# 3) Expo demo（同 app1）
cd mobile && npm install && npm start
# 可選：EXPO_PUBLIC_PLACES_URL 指向 CDN 或本機 Vite /places（見 mobile/.env.example）
```
