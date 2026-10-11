# 越來越南 河內旅遊 App

2026/12/19–12/27 四人（姵、淳、薇、潘）河內＋寧平之旅的手機網頁 App。部署在 GitHub Pages：
https://coookiepan.github.io/hanoi-trip/

## 為什麼這樣做
上一版是用傳 HTML 檔的方式給大家，手機用 `file://` 開，分頁連結、JSON 讀取、定位全部失效，只看得到首頁。
這版的三個原則不要動：**放在 HTTPS 網址上、整個 App 只有一個 index.html、頁面切換用 hash 路由不換檔案**。

## 技術
- 純 HTML / CSS / JS，沒有框架、沒有打包工具、沒有 npm。改完直接 push 就上線（Pages 約 1 分鐘）。
- PWA：`manifest.json` 加入主畫面，`sw.js` 離線快取。
- 路由：`#/`、`#/itinerary/<day>`、`#/history`、`#/nearby`、`#/reading`、`#/place/<id>`。
- 不要加 `type="module"`、不要拆成多個 html、不要用相對路徑跳頁。

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 外殼：頂欄、`#view`、底部膠囊導覽列（SVG 圖標） |
| `app.js` | 路由、各頁 render、河內時間、營業中判斷、定位與距離 |
| `style.css` | 樣式，所有顏色在 `:root` |
| `data.json` | **全部內容**。改內容只動這個檔 |
| `sw.js` | 離線快取。改了任何檔案要把第 2 行 `hanoi-vN` 版本號加 1，手機才會更新 |
| `icons/` | App 圖示 |

## data.json 結構
```
trip      { title, start, end, timezone }
days[]    { day, date "12/19", weekday "六", area, stay, items[] }
  items[] { time, type, title, note, status, placeId? }
            type:   交通 | 住宿 | 餐飲 | 景點 | 其他
            status: 已訂 | 固定 | 選項 | 未訂
places[]  { id, name, nameLocal, category, lat, lng, hours, price, intro, recommendedBy, links[], area }
            category: 景點 | 小吃 | 逛街 | 住宿（住宿不會出現在附近推薦）
            hours:    {"mon-sun":"08:00-17:00"} 或 {"mon-sat":"11:30-14:00,18:00-22:00","sun":"休"}
history[] { era, years, summary, places[]  ← place id }
reading[] { group, items[{ title, url }] }
```
行程以 Google 試算表「越來越南行程表」為準（資料夾「2026越來越南🎄🇻🇳」），改行程先改試算表再同步進 `data.json`。

## 視覺規範（參考一張 fintech App 設計圖，色碼從圖上取樣）
- 深藍 `#112433`（導覽列、文字）、米白 `#fcf9f2`（背景）、紫 `#977bf2`、萊姆綠 `#dafb62`、天藍 `#8ccdeb`、珊瑚 `#f96e59`
- 狀態色：已訂＝萊姆綠、固定＝天藍、選項＝紫、未訂＝珊瑚；用餐列淡綠底
- 大圓角（22px）、膠囊鈕、粗體大標（Inter 800，退回系統字體）、實心 SVG 圖標，不用 emoji
- 深色模式已處理，新增元件要同時看兩種模式

## 目前狀態與待辦
- 行程總表：完成，與試算表 2026/10/11 版一致
- 附近推薦：功能完成；`places[]` 的座標是粗估，要逐一校對；營業時間多數待補
- 歷史速查：架構完成，五個時期的文字待寫
- 延伸閱讀：連結已放，可再分組
- 地點詳情：`intro` 多數待補
- 尚未做：沙壩、下龍灣（在想去清單，未排進行程）

## 本機預覽
```
python3 -m http.server 8080
```
開 http://localhost:8080 。定位在 localhost 可以用，其他 http 網址不行。

## 測試
改完至少在 iPhone Safari 和 Android Chrome 各開一次，確認五個頁面都進得去。
不要在 LINE 內建瀏覽器測定位。
