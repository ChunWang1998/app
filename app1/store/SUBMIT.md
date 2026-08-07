# 諧音猜猜 — 送審操作清單

Build 已就緒（EAS `1.0.0` build 4，ASC App ID `6798265759`）。  
剩下幾乎都在 [App Store Connect](https://appstoreconnect.apple.com) 網頁完成。

## 0. 先讓隱私／支援頁上線（必做）

本機檔案：

- `privacy.html`
- `support.html`

任選一種公開 HTTPS 方式即可，例如：

1. **GitHub Pages**：把 `app1/store/` 推到 repo 並開 Pages  
2. **Notion / Google Sites** 公開頁（內容可從 HTML 複製）  
3. 你自己的網域

完成後你會有兩個網址，例如：

- Privacy：`https://…/privacy.html`
- Support：`https://…/support.html`

## 1. 截圖（必做）

在 iPhone 或 Simulator 各拍一張以上：

1. 開場／首頁（諧音猜猜）
2. 答題中（兩張圖 + 填字）
3. 答對／通關

App Store 至少需要 **6.7" iPhone** 截圖尺寸（例如 iPhone 15 Pro Max：1290×2796）。  
Simulator：`I/O → Trigger Screenshot`，或 `Cmd+S`。

## 2. Connect 填寫

開啟 App → **App Store** → iOS 版本 **1.0.0**：

| 欄位 | 來源 |
|------|------|
| 名稱／副標／促銷／說明／關鍵字／最新消息 | `../STORE_COPY.md` |
| 截圖 | 上一步 |
| 支援網址／隱私權政策網址 | Step 0 |
| 版權 | `© 2026 SoundAlike` |
| 分類 | Games → Word / Trivia |
| App 隱私 | Data Not Collected |
| 年齡 | 4+ |
| Build | 選 `1.0.0 (4)` |
| 審核備註 | `STORE_COPY.md` 內 Review Notes |

可選：加 **English (U.S.)** 語系（文案同 `STORE_COPY.md`）。

## 3. 送出

右上角 **Add for Review** → **Submit to App Review**。

首審常要 24–48 小時（有時更久）。被拒依 Resolution Center 改完再送。

## 4. 通過後

選擇 **自動發佈** 或 **手動發佈**。上架後可用 App Store Connect → Analytics 看搜尋關鍵字表現，之後改副標／Keywords 需發新版。
