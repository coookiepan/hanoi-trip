# 越來越南 · 河內旅遊 App

2026/12/19–12/27 四人河內行的手機網頁 App。單一頁面、純 HTML/CSS/JS、可離線、可加入主畫面。

## 怎麼用
1. 用手機 Safari 或 Chrome 開網址（不要在 LINE 裡面開，定位會拿不到）。
2. 分享 → 加入主畫面。
3. 之後離線也能看行程。

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | App 外殼，只有一個頁面 |
| `app.js` | 路由、行程、定位與距離、營業時間判斷 |
| `style.css` | 樣式 |
| `data.json` | 全部內容：行程、地點、歷史、延伸閱讀。**改內容只動這個檔** |
| `manifest.json` `sw.js` | 加入主畫面與離線快取 |

## 改內容
- 行程：`days[].items[]`，欄位 `time / type / title / note / status / placeId`
  - `type`：交通、住宿、餐飲、景點、其他
  - `status`：已訂、固定、選項、未訂
- 地點：`places[]`，`hours` 寫法：`{"mon-sun":"08:00-17:00"}`、`{"mon-sat":"11:30-14:00,18:00-22:00","sun":"休"}`
- 歷史：`history[]`；延伸閱讀：`reading[]`

改完 `sw.js` 第一行的版本號 `hanoi-v1` 加 1，手機才會抓到新版。

## 本機預覽
```
python3 -m http.server 8080
```
開 http://localhost:8080
