# Mapable HK

<p align="center"><img src="assets/logoEN+TCWhite.png" alt="Mapable HK" width="360"></p>
<p align="center"><strong>面向香港長者、殘障人士、照顧者及一般乘客的無障礙優先多模式路線規劃器</strong></p>
<p align="center"><a href="https://ellthy0721.github.io/Mapable-HK/">在線版本</a> · <a href="reference.md">數據與參考來源</a></p>

## 項目簡介

Mapable HK 是一個在瀏覽器中運行的香港路線規劃應用。它把步行、巴士、港鐵、輕鐵及不同公共交通之間的換乘組合在同一個路線結果中，並根據乘客的出行需要調整步行、樓梯、斜坡、過路處、轉乘、候車、票價和資料不確定性的成本。

項目重點不是隻找理論上最快的路線，而是把真實出行中會影響長者、輪椅使用者、視障人士、色覺差異人士及照顧者的條件呈現在路線比較、地圖和步驟說明中。

Mapable HK 是純靜態前端應用，沒有項目自有後端或賬號系統。已發佈版本可直接由 GitHub Pages 提供。

> 重要：本項目不是政府、公共交通營辦商、醫療機構或緊急服務的官方產品。路線、無障礙設施、班次、車費及設施狀態均可能變化，出發前應向相關機構核實。


## 延伸項目

### Mapable AI Studio

[Mapable AI Studio](https://github.com/Ellthy0721/Mapable-AI-Studio) 是 Mapable HK 的 AI 路線解說延伸介面。它重用 Mapable HK 的搜尋、出行 Profile、路線服務和資料快照，讓使用者連接自己的 AI API，按目前選取的路線生成走法說明、路線優點及注意事項。

AI Studio 會顯示發送給 AI 的路線證據 JSON 和提示詞，也支援語音輸入、建議朗讀，以及整段或分點輸出。AI 只負責解釋 Mapable 已建立的路線，不會改寫路線排序、票價、設施或無障礙事實；Mapable HK 仍是主要路線規劃器。

<p><a href="https://ellthy0721.github.io/Mapable-AI-Studio/">開啟 Mapable AI Studio</a> · <a href="https://github.com/Ellthy0721/Mapable-AI-Studio">查看 GitHub 倉庫</a></p>

## 主要功能

### 多模式路線規劃

- 支持步行、九巴、龍運巴士、城巴、新大嶼山巴士、港鐵巴士、港鐵及輕鐵。
- 支持任意公共交通工具之間的混合換乘，不按交通模式設置固定名次。
- 以時間、步行距離、轉乘、候車暴露、票價、無障礙風險和資料可信度形成綜合成本。
- 支持“立即出發”、“計劃時間”和“全部路線”三種出發模式。
- 在可用時讀取即時到站資料；失敗時明確顯示計劃班次或估算狀態。
- 可展開公共交通路段查看沿途站點，並在地圖聚焦所選路段。
- 地圖聚焦會避開桌面及手機菜單遮擋區域。

### Profile 出行需要

| Profile | 路線側重點 | 視覺默認值 |
| --- | --- | --- |
| 長者 | 減少樓梯、陡坡、長距離連續步行、複雜轉乘和長時間候車 | 標準對比度 |
| 輪椅 | 已知樓梯為硬性限制；提高斜坡、升降機、入口連接和通道資料的重要性 | 標準對比度 |
| 視障 | 提高複雜過路處、資料不完整路段和頻繁轉乘的成本 | 默認開啓高對比顯示 |
| 色弱 | 路線排序沿用一般模式；可選擇紅綠色覺或藍黃色覺顯示 | 獨立色覺模式 |
| 嬰兒車／照顧者 | 強烈避開樓梯，重視斜道、升降機、連續步行和轉乘負擔 | 顯示母嬰設施控制 |
| 一般 | 以時間、步行、轉乘和票價的通用權重比較路線 | 標準顯示 |

Profile 通過約束和成本權重影響路線，而不是為某條具體路線設置特判。缺失關鍵無障礙資料時，界面會顯示待核實狀態，不會把未知情況自動當作可通行。

### 視覺與操作無障礙

- `colorMode` 與 `contrastMode` 相互獨立。
- 色覺模式包括紅綠色覺和藍黃色覺配色，不使用全頁濾鏡模擬色覺缺陷。
- 高對比模式使用清晰邊框、白色或近黑背景、黃色焦點和選中提示。
- 路線同時使用圖標、文字、描邊、標籤及必要的線型，顏色不是唯一編碼。
- 支持鍵盤焦點、可訪問名稱、窄屏重排和高倍縮放。
- 使用 Noto Sans HK、Noto Sans TC、Noto Sans SC 和 Noto Sans 字體回退。
- 手機端和桌面端使用不同的可摺疊菜單及路線聚焦佈局。

### 地圖、地點與設施

- 支持本地地點索引、遠端地理編碼補充、地圖點選和瀏覽器定位。
- 開屏定位提示同時顯示中文和英文，避免用戶在定位前無法切換語言。
- 港鐵路線可顯示建議出站口、出口編號和出口地圖標點。
- 港鐵出口資料覆蓋 98 個車站；無可靠資料時不會虛構出口編號。
- 提供母嬰設施、公共廁所和 AED 地圖圖層，三個設施圖層互斥顯示。
- 母嬰設施圖層只在“嬰兒車／照顧者” Profile 中出現。
- 設施資料卡可把設施設為目的地並立即規劃路線。
- 地圖縮小時會分級隱藏出口及路線標籤，減少標記重疊。

### 路線步驟與資料透明度

- 路線摘要顯示步行、預計時間和票價。
- 每段路線顯示交通模式、路線編號、方向、候車、車程和下車位置。
- 步行路段顯示距離、時間及已知樓梯、斜坡、斜道、升降機、行人天橋和過路信息。
- 對入口連接、路面、通道寬度、路緣、坡度及過路輔助資料缺失作明確提示。
- 區分官方連續線形、開放數據 route shape、道路約束補線和保守估算。
- 資料源明確標示沒有營運窗口的路線不會作為正常服務推薦。

## 使用流程

1. 選擇最符合乘客需要的 Profile。
2. 輸入起點和終點，使用當前位置，或在地圖點選位置。
3. 選擇立即出發、計劃時間或全部路線。
4. 比較路線時間、步行、票價、風險和資料提示。
5. 點選路線選項或某段路線，在地圖查看實際走向。
6. 展開公共交通路段查看沿途站點。
7. 按需要查看港鐵出口、母嬰設施、公共廁所或 AED。

## 路線規劃流程

```mermaid
flowchart LR
  A["起點、終點、Profile、出發時間"] --> B["本地搜尋、定位或地圖點選"]
  B --> C["步行與公共交通候選生成"]
  C --> D["班次、ETA、票價及服務日曆"]
  D --> E["Profile 約束與綜合成本評分"]
  E --> F["路線選項、步驟、風險及資料來源"]
  F --> G["地圖線形、站點、出口及設施"]
```

路線規劃主要在瀏覽器端完成。較重的路線計算通過 Web Worker 運行，靜態資料按用途及路線分桶加載，以減少主界面阻塞和首次下載量。

## 主要數據來源

| 數據類別 | 主要來源 | 用途 |
| --- | --- | --- |
| 地圖底圖與標註 | [香港地圖服務](https://api.hkmapservice.gov.hk/) | Leaflet 底圖及繁體、簡體、英文地圖標註 |
| 公共交通路線、站點及車費 | [運輸署 DATA.GOV.HK](https://data.gov.hk/en-data/dataset/hk-td-tis_23-routes-fares-geojson) | 巴士站序、路線、方向、全程車費和行車時間 |
| 城巴連續線形 | [CSDI FB_ROUTE_LINE](https://portal.csdi.gov.hk/server/rest/services/common/td_rcd_1638844988873_41214/MapServer/0?f=pjson) | 城巴及聯營路線官方道路走向 |
| 九巴及龍運 | [KMB/LWB Open Data](https://data.etabus.gov.hk/) | 路線、站點和即時到站 |
| 城巴即時到站 | [Citybus API](https://rt.data.gov.hk/v2/transport/citybus/) | 城巴路線、站序和 ETA |
| 新大嶼山巴士 | [NLB API](https://rt.data.gov.hk/v2/transport/nlb/) | 嶼巴路線、站點、車費和 ETA |
| 港鐵及輕鐵 | [MTR Open Data](https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities) | 站點、路線、票價、班次及部分無障礙資料 |
| 港鐵出口 | CSDI 3D Indoor MTR Station Map、GeoInfo Map | 出口編號、出口組、座標和尾段步行連接 |
| 步行路網 | CSDI 3D Pedestrian Network | 步行尋路及樓梯、斜坡、過路處等屬性 |
| 路線補充線形 | Hong Kong Community GTFS、OpenStreetMap、HOTOSM | 缺失方向、鐵路及輕鐵線形補充 |
| 母嬰設施 | 衞生署家庭健康服務、港鐵、UNICEF HK 公開資料 | 母嬰室和母嬰友善場所 |
| 公共廁所 | 食環署、漁護署開放資料 | 公共廁所位置及場所信息 |
| AED | 消防處 CARE AED 開放資料 | AED 位置及相關場所信息 |

完整數據鏈接、構建方式、覆蓋範圍、許可和限制見 [`reference.md`](reference.md)。

## 技術結構

- 原生 HTML、CSS 和 JavaScript。
- [Leaflet](https://leafletjs.com/) 負責地圖、標記和路線圖層。
- Leaflet.markercluster 負責設施標點聚合。
- Air Datepicker 負責計劃日期和時間選擇。
- Web Worker 負責路線規劃任務隔離和取消。
- 本地靜態 JSON 負責地點、交通、票價、出口、設施和步行資料。
- GitHub Pages 負責靜態部署。

## 開源字體

Mapable 的介面及品牌視覺使用以下開源字體：

- [Staatliches](https://fonts.google.com/specimen/Staatliches)：品牌及展示文字。
- [Noto Sans SC](https://fonts.google.com/noto/specimen/Noto+Sans+SC)：簡體中文字形。
- [Noto Sans TC](https://fonts.google.com/noto/specimen/Noto+Sans+TC)：繁體中文字形。

以上字體均依 [SIL Open Font License 1.1](https://openfontlicense.org/) 發佈；字體版權與商標分別歸原作者及權利人所有。

## 倉庫結構

`main` 分支只保存最終可部署版本，開發過程文件、原始下載及本地構建資料不發佈到 GitHub。

```text
.
├── index.html                 # 應用入口
├── styles/main.css           # 響應式界面和視覺模式
├── scripts/main.js           # UI、地圖、定位和互動
├── scripts/services/         # 搜尋、Profile、設施和路線服務
├── route-worker.js           # 路線規劃 Web Worker
├── data/                     # 發佈用靜態數據
├── assets/                   # 品牌、圖標和游標資源
├── reference.md              # 數據、外部資料和許可記錄
├── .nojekyll                 # GitHub Pages 靜態文件設置
└── README.md
```

## 本地運行

項目使用 `fetch()` 讀取本地 JSON，請不要直接用 `file://` 打開 `index.html`。在倉庫根目錄運行：

```powershell
python -m http.server 8093
```

然後打開 `http://127.0.0.1:8093/`。無需安裝 npm 依賴或執行前端打包。瀏覽器定位通常只允許在 HTTPS 或 `localhost` / `127.0.0.1` 安全上下文使用。

## 部署

倉庫根目錄就是 GitHub Pages 發佈內容。推送到 `main` 後，發佈地址為：

```text
https://ellthy0721.github.io/Mapable-HK/
```

發佈時應確保 `index.html` 引用的版本化腳本、樣式、數據和資源同時更新。

## 隱私

- 不需要註冊、登錄或建立賬號。
- 項目沒有自有服務器接收或保存路線請求。
- 瀏覽器定位只在當前頁面內用於顯示位置、設置起點和路線計算，應用不會主動持久化定位結果。
- 語言選擇會保存到瀏覽器 `localStorage`，鍵名為 `mapable-language`。
- 地圖圖塊、遠端地點搜索和即時到站功能會直接請求相應第三方開放服務。
- 用戶輸入的地點查詢可能發送到 ArcGIS、Nominatim 或 Photon 等地理編碼服務作為本地搜索補充。

## 無障礙與安全限制

- Profile 只能根據已收錄資料調整路線，不能證明整段路線實際無障礙。
- 升降機、斜道、出口、廁所、母嬰室和 AED 的開放及可用狀態可能臨時變化。
- “附近有設施標記”不等於路線一定經過或能夠使用該設施。
- 入口連接、路面、通道寬度、路緣、坡度和過路輔助資料可能不完整。
- 即時到站失敗時，路線可能使用計劃班次或估算候車時間。
- 票價會受分段收費、轉乘優惠、付款方式、日期和營辦商政策影響。
- AED 圖層只提供位置參考。發生緊急情況時，應立即致電香港緊急服務 `999`。

## 瀏覽器支持

建議使用近期版本的 Chrome、Edge、Firefox 或 Safari。應用依賴 Web Worker、Fetch API、Geolocation API、CSS Grid、Flexbox、媒體查詢及 CSS 自定義屬性。禁用 JavaScript、阻止第三方地圖資源或限制定位權限時，部分功能不可用。

## 問題報告

報告問題時，請提供起點、終點、Profile、出發模式、路線編號和方向、瀏覽器、設備、屏幕尺寸、截圖、實際結果及期望結果。數據錯誤請同時提供官方鏈接或現場資料，並說明發生日期。

不要在公開 Issue 中提交精確住址、實時位置或其他個人資料。

## 許可與歸屬

本倉庫目前未附加統一的代碼許可證。除非另有明確說明，倉庫內容不自動授予再使用許可。

地圖、交通、設施、字體、第三方程序庫及開放數據分別受其提供者的條款、版權或開放數據許可約束。OpenStreetMap 衍生資料須遵守 ODbL 和 attribution 要求。詳細歸屬見 [`reference.md`](reference.md) 及應用“設置”中的路線資料說明。

## 致謝

感謝香港特別行政區政府各開放數據提供部門、運輸署、地政總署、港鐵、九巴、龍運巴士、城巴、新大嶼山巴士、消防處、食環署、漁護署、衞生署家庭健康服務，以及 OpenStreetMap、HOTOSM、Hong Kong Community GTFS、Leaflet 和相關開放數據社區。

---

**Mapable HK provides route guidance with explicit uncertainty. Always verify critical accessibility and service information before travelling.**
