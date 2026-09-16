# app4 — 選業問 CraftQ（實作細節）

> 職業／身份互相感興趣的人配對；先站內簡聊篩選，雙方同意後才交換 LINE，談實際工作內容、學習歷程、面試、證照等。  
> 本文件為實作規格；與對話決策衝突時，**以本文件為準**（並隨決策更新）。

---

## 1. 產品定位

- **做什麼**：依「我是誰」與「我想認識什麼身份」做雙向興趣配對 → **站內簡聊（上限 20 句）** → **雙方同意後**才顯示彼此 LINE ID。
- **不做什麼（V1）**：無限站內長聊、實名／年齡驗證、登入帳號、Android、伺服器收據驗證、後台管理 UI。
- **價值主張**：低摩擦認識真實從業者，但用短聊降低亂露聯絡方式的風險；平台負責配對、短聊閘門與安全最低標（檢舉、免責）。

---

## 2. 已鎖定決策一覽

| 項目 | 決定 |
|------|------|
| 自己的身份 | 固定清單約 50 項 +「其他」；開通時選 **1～5** 個，之後**永遠不可改** |
| 有興趣的身份 | 最多 **2** 個；免費用戶不可改；付費用戶 **每 7 天可改一次** |
| 「其他」 | 清單選項，對方只看到「其他」，**無自由文字** |
| LINE ID | 進配對池前 **必填**（伺服器保存）；**未雙方同意前客戶端不得顯示對方 LINE** |
| 聊天 | 配對後進入站內簡聊；全對話合計最多 **20 句**（雙方合計，含系統提示外的使用者訊息） |
| 露出 LINE | 滿 20 句後詢問雙方是否願意繼續；**雙方皆同意**才顯示彼此 LINE ID + 站外免責 |
| 拒絕／離開 | 任一方選「不願意」→ 結束聊天、離開房間；**自動刪除該 match 的聊天紀錄（DB）**；`matches` 列保留為已結束（防重複配對） |
| 免責 | 露出 LINE 前／露出畫面必須有免責聲明（站外聯絡責任歸屬） |
| 配對額度 | 免費用戶 **1 次／日**；付費用戶 **5 次／日**；額度只扣**發起配對者** |
| 每日重置 | **UTC+8**（`Asia/Taipei`）午夜 |
| 重複配對 | 同一對人終身不重複（`matches` 無序 pair 唯一），含「短聊後拒絕」的 pair |
| 檢舉 | 可檢舉並寫入後台表；檢舉後該對象**不再出現在檢舉者配對池**；檢舉亦可觸發結束並刪訊息 |
| 登入 | **免登入**；匿名 `device_id`（對齊 app2） |
| 年齡／實名 | 無 |
| 平台 | **iOS only** |
| 金流 | Apple IAP（對齊 app3：訂閱 + 恢復購買 + **優惠碼**）；權益 **僅客戶端**判斷 |
| 訂閱週期／價格 | **暫緩**（進 ASC／第一次付費 TestFlight 前再定） |
| 技術基線 | Expo SDK 57（React 19.2、RN 0.86.3）；上架注意見根目錄 `README.md` |

---

## 3. 使用者流程

### 3.1 首次開通（一次性）

1. 顯示產品說明 + 免責預覽（可稍後在配對成功頁再確認一次）。
2. 選擇**自己的身份** 1～5 個（104 式大類 → 小類 → 職稱；含「其他」）。
3. 選擇**有興趣的身份** 1～2 個（同上選單）。
4. 填寫 **LINE ID**（必填；格式可做寬鬆檢查，例如非空、長度上限）。
5. 確認摘要 → 寫入雲端 → 身份鎖定 → 進入主畫面。

開通完成條件（缺一不可）：

- `own_identities.length ∈ [1, 5]`
- `interest_identities.length ∈ [1, 2]`
- `line_id` 非空
- 本機已有穩定 `device_id`

### 3.2 每日配對

1. 使用者點「今日配對」。
2. 客戶端先用本機付費 flag 決定今日上限（免費 1／付費 5）；**實際扣次以伺服器為準**。
3. 伺服器：

   - 確認發起者今日剩餘次數 > 0（依 `Asia/Taipei` 日期）。
   - 找出符合雙向興趣、未配對過、未被發起者檢舉過、已填 LINE、非自己的候選人。
   - 挑選一人（見 §5）。
   - 寫入 `matches`（狀態 `chatting`）、扣發起者 1 次。
4. **不**立即顯示 LINE。發起者進入聊天室；被配對者下次開 App／進「進行中」可見並可進聊天。畫面僅顯示對方身份標籤。
5. 可對該次配對對象發起**檢舉**（見 §3.5）。

### 3.3 站內簡聊 → 雙方同意 → 露 LINE

1. 配對成功後進入聊天室；僅文字訊息（無圖／語音）。
2. 計數：該 `match_id` 下使用者訊息合計，上限 **`CHAT_CAP = 20`**。第 20 句送出後伺服器拒絕再 `send_message`（錯誤碼 `chat_cap_reached`）。
3. 達到上限後 UI 進入「是否願意繼續／交換 LINE」閘門；雙方各自回答一次（`yes` / `no`）。
4. **雙方皆 `yes`**：
   - `matches.status = line_revealed`
   - API 回傳雙方 `line_id`；畫面顯示對方 LINE + 免責；之後可視為已結束站內聊（可選：關閉再送訊）。
5. **任一方 `no`（或逾時規則見 §12）**：
   - `matches.status = ended_declined`
   - **立刻 `DELETE` 該 match 的全部 `messages`**（不可復原）
   - 雙方離開聊天室；歷史僅顯示「已結束（未交換聯絡方式）」，**永不**露出對方 LINE
6. 任一方在未滿 20 句前主動「離開」：等同拒絕 → 刪訊息、狀態 `ended_left`（與 declined 同效果：不露 LINE、pair 仍佔用）。

### 3.4 付費解鎖

- 對齊 app2：`SubscribeScreen` — 買斷解鎖／恢復購買（非消耗型；無優惠碼）。
- 成功後本機 `AsyncStorage` 寫入付費 flag；UI 顯示每日 5 次與「每週可改興趣」。
- **不**把訂閱狀態寫入 Supabase 作為權威來源（V1）。

### 3.5 修改有興趣的身份（僅付費）

- 檢查本機付費 flag；未付費則導向訂閱頁。
- 伺服器（或本機 + 伺服器雙寫）記錄 `interests_changed_at`；距上次 < 7 天（UTC+8 日曆或連續 168 小時，實作採 **連續 168 小時** 較簡單）則拒絕。
- 允許改為最多 2 個興趣；**不可**改自己的身份。LINE 可隨時改（換號需要）；**對方仍只能在雙方同意後才看到你的 LINE**。

### 3.6 檢舉

- 聊天中或結束後可對該對象檢舉。
- 寫入 `reports` 後：結束該 match（若仍在聊天）、**刪除訊息**、狀態 `ended_reported`；之後不再進入配對池。
---

## 4. 配對條件

令：

- `A.own`、`A.interest`、`B.own`、`B.interest` 皆為身份 id 集合。

**配對成立**當且僅當：

```text
A.interest ∩ B.own ≠ ∅
AND
B.interest ∩ A.own ≠ ∅
```

「其他」與其他身份一樣是一個固定 id（例如 `other`），交集規則相同。

---

## 5. 候選人挑選與額度

### 5.1 額度（發起者扣次）

- 只檢查、只扣除**按下「今日配對」的人**。
- **不**檢查對方是否還有今日額度。
- 對方被配到不消耗對方的每日次數。

理由：實作最簡單、無「對方滿額」重試、降低空池率。

### 5.2 排除條件

候選人必須同時滿足：

1. 雙向興趣成立（§4）
2. 已完成開通（有 LINE、有身份）
3. 非自己
4. 與發起者**尚無** `matches` 紀錄（防重複）
5. 發起者**未曾檢舉**該用戶（`reports`）

### 5.3 排序／隨機（低成本）

**V1 預設：符合條件的集合內純隨機**（`ORDER BY random() LIMIT 1` 或等價）。

可選升級（仍便宜）：

- 表上維護 `last_active_at`（開 App、點配對時更新）
- `ORDER BY last_active_at DESC NULLS LAST LIMIT 30`，再於這 30 人中隨機 1 人

若實作活躍排序導致明顯複雜度，維持純隨機即可。

### 5.4 寫入與重試

1. 選中 B 後 `INSERT` 無序 pair：`user_low = min(A,B)`, `user_high = max(A,B)`，`UNIQUE(user_low, user_high)`。
2. 若唯一鍵衝突（極少見競態），再抽一次（最多重試 2～3 次）。
3. 成功後 `match_counts`（或等價）對發起者今日 +1。
4. 回傳公開欄位：對方身份標籤、`match_id`、`status=chatting`。**不得**回傳對方 `line_id`。

### 5.5 無候選人

回傳明確錯誤碼（例如 `no_candidates`），UI 顯示「目前沒有可配對的對象，請稍後再試」。不扣次數。

---

## 6. Freemium 規則

| | 免費 | 付費（客戶端 flag） |
|--|------|-------------------|
| 每日發起配對 | 1 | 5 |
| 改有興趣的身份 | 不可 | 每 168 小時最多 1 次 |
| 改自己的身份 | 不可 | 不可 |
| 恢復購買／優惠碼 | — | 有（app3） |

- 每日次數：**伺服器**依 `device_id` + `Asia/Taipei` 的日期鍵計算（防重裝僅清本機時，至少雲端仍一致；重裝換新 `device_id` 則視為新用戶 — MVP 接受）。
- 付費狀態：**僅本機**；啟動時可呼叫 restore；不驗證收據。

---

## 7. 金流（對齊 app3）

### 7.1 實作對照

| 能力 | 參考 |
|------|------|
| `expo-iap` 訂閱購買／恢復 | `app3/mobile/src/lib/iap.js` |
| 本機權益 flag | `app3/mobile/src/lib/entitlements.js` |
| 訂閱 UI + 優惠碼 | `app3/mobile/src/screens/SubscribeScreen.js` |
| ASC 設定步驟 | `app3/APP_STORE_IAP.md` |

### 7.2 V1 約束

- iOS only（與產品決策一致；程式可省略 Android billing 分支或直接提示僅 iOS）。
- 要做 **Offer Codes**（`presentCodeRedemptionSheetIOS`）。
- production build **不可**帶 `EXPO_PUBLIC_IAP_SIMULATE=1`；preview／開發可模擬。
- **第一次**付費版 EAS build 前，ASC 必須先建好訂閱商品，product ID 與 `EXPO_PUBLIC_IAP_PRODUCT_ID` 一致（見 repo 根目錄 `README.md`）。

### 7.3 暫緩

- 訂閱週期（月／年）
- 價格等級
- 優惠碼免費期長度（建議預設：1 個月，對齊 app3 文件）

---

## 8. 資料模型（建議）

> 鍵以匿名 `device_id` 為主；表名可依實作微調，語意需保留。

### 8.1 `profiles`

| 欄位 | 說明 |
|------|------|
| `id` | uuid PK |
| `device_id` | text UNIQUE，客戶端生成並持久化 |
| `own_identities` | text[] 或 jsonb，1～5 個固定 id |
| `interest_identities` | text[]，1～2 個 |
| `line_id` | text NOT NULL |
| `interests_changed_at` | timestamptz nullable |
| `last_active_at` | timestamptz |
| `created_at` / `updated_at` | timestamptz |
| `deleted_at` | timestamptz nullable（可選） |

約束：開通後 `own_identities` 不可被 RPC 更新（只允許更新 interest／line／last_active）。

### 8.2 `matches`

| 欄位 | 說明 |
|------|------|
| `id` | uuid PK |
| `user_low_id` | uuid FK → profiles |
| `user_high_id` | uuid FK → profiles |
| `initiator_id` | uuid FK → profiles |
| `status` | text：`chatting` \| `awaiting_consent` \| `line_revealed` \| `ended_declined` \| `ended_left` \| `ended_reported` |
| `message_count` | int，使用者訊息合計（上限 20） |
| `consent_low` | boolean nullable（對應 `user_low_id` 是否同意露 LINE） |
| `consent_high` | boolean nullable |
| `line_revealed_at` | timestamptz nullable |
| `ended_at` | timestamptz nullable |
| `created_at` | timestamptz |
| UNIQUE(`user_low_id`, `user_high_id`) | 防重複 |
| CHECK(`user_low_id` < `user_high_id`) | 強制無序 |

### 8.3 `messages`

| 欄位 | 說明 |
|------|------|
| `id` | uuid PK |
| `match_id` | uuid FK → matches ON DELETE CASCADE |
| `sender_id` | uuid FK → profiles |
| `body` | text，長度上限（建議 500） |
| `created_at` | timestamptz |

約束／行為：

- 僅 `status ∈ {chatting, awaiting_consent}` 可讀取訊息；`awaiting_consent` 時不可再 insert。
- `message_count >= 20` 時拒絕 insert，並把 status 推到 `awaiting_consent`（若尚未）。
- 進入 `ended_*` 或拒絕同意時：**DELETE FROM messages WHERE match_id = …**（硬刪，不軟刪）。
- `line_revealed` 後：訊息可保留或一併刪除（V1 建議**保留**至使用者手動清／產品再定；與「拒絕才刪」對齊）。

### 8.4 `match_daily_usage`

| 欄位 | 說明 |
|------|------|
| `profile_id` | uuid |
| `day` | date（以 `Asia/Taipei` 解讀的「今天」） |
| `count` | int |
| PRIMARY KEY (`profile_id`, `day`) | |

付費上限由**客戶端**在呼叫前檢查；伺服器 V1 可只強制「免費上限 1」，付費用戶傳 optional flag **不可信**。  
**低成本折衷（建議）**：伺服器一律允許最高 5 次／日，免費 UI 自己擋在 1；或伺服器讀本機不可信的 `p_is_paid` 僅作軟限制。  
**更乾淨但仍簡單**：伺服器固定 `limit = 1`；付費用戶另帶 Apple 無關的本機解鎖只影響 UI——會讓付費用戶被伺服器擋在 1。  

**V1 建議採納**：伺服器接受 `p_claimed_paid boolean`（客戶端依 IAP flag），`limit = p_claimed_paid ? 5 : 1`。接受可被竄改換取零收據驗證成本（與「只做客戶端權益」一致）。

### 8.5 `reports`

| 欄位 | 說明 |
|------|------|
| `id` | uuid |
| `reporter_id` | uuid |
| `target_id` | uuid |
| `reason` | text（預設選項：騷擾／假身份／不當內容／其他） |
| `match_id` | uuid nullable |
| `created_at` | timestamptz |

Admin：直接在 Supabase Table Editor 查看；V1 不做後台 UI。

檢舉後配對 RPC 排除 `target_id ∈ reports WHERE reporter_id = 發起者`。

### 8.6 身份清單

- 客戶端常數檔（`src/data/identities.js`）維護 **104 式階層**：大類 → 小類 → 約 50 個 leaf id + 繁中標籤 + `other`。
- UI：`IdentityPicker` 先選大類，再於小類下多選職稱；支援搜尋。
- 伺服器只存 leaf id；展示用客戶端 map。改文案不必 migration。

---

## 9. API／RPC（建議）

皆以 `p_device_id` 識別呼叫者（對齊免登入）。表格不給 anon 任意直寫；用 `security definer` RPC。

| RPC | 用途 |
|-----|------|
| `register_or_load_profile` | 首次開通／載入既有 profile |
| `update_line_id` | 更新 LINE（僅寫入自己的 profile） |
| `update_interests` | 付費週期檢查 + 更新興趣（伺服器可再檢查間隔；是否付費由 `p_claimed_paid`） |
| `touch_active` | 更新 `last_active_at` |
| `daily_match` | 核心配對（§5）；回傳不含對方 LINE |
| `list_my_matches` | 配對／聊天列表；僅 `line_revealed` 時附對方 `line_id` |
| `list_messages` | 讀取該 match 訊息（權限：必須是 pair 成員且 status 允許） |
| `send_message` | 送訊；強制 `message_count < 20`；達上限 → `awaiting_consent` |
| `submit_continue_consent` | 滿 20 句後提交 yes/no；雙方 yes → 回傳雙方 LINE；任一方 no → 刪訊息並結束 |
| `leave_chat` | 未滿 20 也可離開；刪訊息、`ended_left` |
| `report_user` | 寫入檢舉；結束並刪訊息 |

---

## 10. 客戶端架構（對齊 app2／app3）

### 10.1 套件版本基線

以 **app3/mobile/package.json** 為主（IAP／訂閱最接近），需要匿名裝置 id 時參考 app2：

| 套件 | 版本（app4/mobile） |
|------|------------------|
| expo | ^57 |
| react | 19.2.3 |
| react-native | 0.86.3 |
| expo-iap | ^5.5.1 |
| @supabase/supabase-js | ^2.112.1 |
| @react-native-async-storage/async-storage | ^2.2.0 |
| expo-linear-gradient | ~57.0.2 |
| react-native-safe-area-context | ~5.6.0 |
| react-native-gesture-handler | ~2.28.0 |
| react-native-url-polyfill | ^4.0.0 |

**不要**預設加入 `expo-image-picker`／定位／麥克風，除非產品後來要頭像（見 §11）。

### 10.2 建議目錄

```text
app4/
  note.md                 ← 本文件
  README.md
  APP_STORE_IAP.md        ← 從 app3 改寫商品 ID／文案
  mobile/
    app.json
    eas.json
    src/
      data/identities.js
      lib/deviceId.js      ← 參考 app2
      lib/entitlements.js  ← 參考 app3
      lib/iap.js           ← 參考 app3
      lib/supabase.js
      lib/cloud.js
      screens/...
  supabase/
    schema.sql
  store/
    privacy.html
    support.html
```

### 10.3 本機 key（建議）

- `app4:device_id`
- `app4:iapPaid`（或專案正式 bundle 前綴）

### 10.4 畫面（V1 最小）

1. Onboarding（身份／興趣／LINE）
2. Home（今日配對按鈕、剩餘次數、付費入口）
3. Chat（簡聊、句數進度 0/20、離開、檢舉）
4. Continue gate（滿 20 句：願意／不願意繼續並交換 LINE）
5. Line reveal（雙方同意後：對方 LINE + 免責）
6. Match history（進行中／已交換／已結束）
7. Subscribe（訂閱／恢復／優惠碼）
8. Edit interests（付費；自己的身份唯讀展示）

即時：V1 可用輪詢（例如進聊天室每 2～3 秒 `list_messages`）；有餘力再上 Realtime（對齊 app3）。

---

## 11. 隱私權限與上架（必遵 README）

根目錄 [`README.md`](../README.md) 重點套用到 app4：

- 付費版**第一次** build 前：ASC 建好訂閱 + Offer Codes，product ID 一致。
- **只申請真正用到的權限**。V1 若無相簿／相機／麥克風／定位 → `infoPlist` 不放對應 UsageDescription，plugin 不注入占位符。
- 所有 Purpose String 若日後需要：繁中、具體情境，禁止英文占位符。
- 每次權限或 IAP 相關修正後遞增 `ios.buildNumber` 再送審。

免責聲明（產品文案，需法務／自行定稿）應涵蓋：

- 站內簡聊與後續交換 LINE 後之對話、糾紛、詐騙風險由使用者自負。
- 平台不仲介勞動契約、不保證對方身份真實性。
- 任一方拒絕繼續時聊天紀錄會刪除；已交換 LINE 後站外聯絡不在平台控制範圍。
- 可透過 App 內檢舉回報不當行為。

---

## 12. 邊界情況速查

| 情況 | 處理 |
|------|------|
| 無候選人 | 不扣次；提示稍後再試 |
| 唯一鍵衝突 | 重抽最多 2～3 次 |
| 對方今日額度用完 | **忽略**（只扣發起者） |
| 重複配對 | UNIQUE pair 排除（含已結束未露 LINE） |
| 檢舉過的人 | 排除出發起者池；刪該次訊息 |
| 重裝 App | 新 `device_id`＝新用戶；付費靠「恢復購買」 |
| 未填 LINE | 不可進池、不可呼叫 `daily_match` |
| 未同意前要看對方 LINE | API／UI 皆不回傳 |
| 滿 20 句一方未回覆同意 | V1：可無限等待；或 48h 無回覆視為 `no` 並刪訊息（建議先做無限等待） |
| 一方同意一方拒絕 | 刪訊息、結束、不露 LINE |
| 想改自己身份 | UI 不提供；RPC 拒絕 |
| 「其他」 | 標籤固定顯示「其他」 |
| Expo Go 測 IAP | 允許模擬購買；正式包不可 |

---

## 13. 建議實作順序（低成本優先）

1. ~~**Scaffold**~~：`mobile/` 已建立（Expo 54，對齊 app3 + app2 deviceId）。
2. ~~**Supabase schema + RPC（舊：配對即露 LINE）**~~：`supabase/schema.sql` — **需遷移**為 §8 新模型。
3. ~~**Onboarding + 身份常數**~~。
4. ~~**daily_match + 歷史骨架**~~（目前結果頁仍直接露 LINE — **待改**）。
5. ~~**檢舉**~~（改為結束 + 刪訊息）。
6. ~~**IAP**~~（訂閱／恢復／優惠碼）+ 次數／改興趣牆。
7. ~~**短聊 + 20 句閘門 + 雙方同意露 LINE + 拒絕刪訊息**~~（schema／RPC／Chat UI）。
8. **ASC／EAS／TestFlight**：EAS 專案 `@leowang1105/craftq`（`projectId` 已寫入 `mobile/app.json`）；上架文案見 `APP_STORE.md`；指令見 `mobile/RELEASE_1.0.0.md`。ASC 建 App／填 `ascAppId`、訂閱商品仍須在 App Store Connect 完成。

> 若雲端已跑過舊 schema：請在 **app2 Supabase SQL Editor** 再執行一次最新 [`supabase/schema.sql`](./supabase/schema.sql)。

---

## 14. 暫緩／之後再定

- [ ] App 正式名稱、Bundle ID、ASC 訂閱 product ID
- [ ] 訂閱價格與週期
- [ ] 優惠碼免費期長度
- [ ] 約 50 個身份的最終清單文案
- [ ] 免責聲明定稿
- [ ] 是否允許修改 LINE ID（本文件預設：**允許**）
- [ ] 被配對者是否推播（V1 可不做；開 App 看歷史／聊天列表即可）
- [ ] 同意閘門逾時（無限等 vs 48h 視為拒絕）
- [ ] `line_revealed` 後是否保留站內訊息

---

## 15. 與 app2／app3 差異摘要

| | app2 | app3 | app4（本專案） |
|--|------|------|----------------|
| 登入 | 匿名 device_id | 手機號 login_key | 匿名 device_id |
| 金流 | 非消耗型買斷 | 月訂閱 + 優惠碼 | 非消耗型買斷（對齊 app2） |
| 權益 | 本機 | 本機 | 本機 |
| 核心互動 | 地圖資料 | Connect／站內聊 | 雙向身份配對 → 短聊 20 句 → 雙方同意才露 LINE |
| Android | 有 | 有（IAP 偏 iOS） | **不做** |
| 檢舉 | 無 | 有 | 有（結束 + 刪訊息） |
