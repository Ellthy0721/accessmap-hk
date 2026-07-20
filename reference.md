# Mapable HK Reference

本文件記錄編碼過程中實際用到或接入過的數據資源、開放平台、網頁資料和外部代碼來源。後續新增數據/API/資料時，要繼續補到這裏。

## 地圖與底圖

| 來源 | 鏈接 | 用途 |
| --- | --- | --- |
| GeoInfo Map, Lands Department, HKSAR Government | https://api.hkmapservice.gov.hk/ | 新版地圖底圖和繁體中文地圖標註。代碼中通過 Leaflet tile layer 加載。 |
| Leaflet | https://leafletjs.com/ | 前端互動地圖、縮放控件、marker、polyline 路線顯示。 |
| Google Fonts - Noto Sans HK / Noto Sans TC / Noto Sans SC / Noto Sans | https://fonts.google.com/noto | 頁面全局字體，覆蓋繁體、簡體和英文界面文字；香港及繁體字形優先，Noto Sans SC 為簡體缺字提供同系列、同字重的回退。 |

## 搜索與地理編碼

| 來源 | 鏈接 | 用途 |
| --- | --- | --- |
| ArcGIS World Geocoding Service | https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates | Runtime address-search fallback and build-time coordinate fallback for FHS venues not matched by the local index; only Hong Kong results above the confidence threshold are published. |
| OpenStreetMap Nominatim | https://nominatim.openstreetmap.org/ | 香港地名和地址搜索兜底，限制 `countrycodes=hk` 和香港範圍。 |
| Photon Geocoder | https://photon.komoot.io/ | OpenStreetMap 搜索補充來源，用於 POI / 街道候選。 |

## 交通與無障礙數據

| 來源 | 鏈接 | 用途 |
| --- | --- | --- |
| CSDI / data.gov.hk 香港開放數據 | https://portal.csdi.gov.hk/ 與 https://data.gov.hk/ | 舊版和後續新版遷移的數據來源，包括設施、無障礙地點、行人網絡、洗手間、公共設施等。 |
| CSDI 3D Pedestrian Network | https://portal.csdi.gov.hk/ | 步行 route tiles 的來源；後續遷移到新版 `WalkingRouter`。 |
| MTR 官方 / CSDI 相關數據 | https://www.mtr.com.hk/ 與 CSDI | 港鐵站、出口、升降機、斜道、輪椅洗手間、協助點等資料來源。 |
| KMB / LWB Open Data API | https://data.etabus.gov.hk/ | 巴士站、路線、ETA 和 KMB 接駁路線來源；本階段確認路線接口可訪問，但不含車費字段。 |
| Citybus Real-time Arrival Data API | https://rt.data.gov.hk/v2/transport/citybus/ | 城巴路線、站序、站點與 ETA 的在線開放接口；本階段用 route、route-stop、stop endpoint 生成 `app/data/transit.citybus.json` / `docs/data/transit.citybus.json`，用於 Citybus 真實站序巴士候選。 |
| GMB / Transport Department 開放數據 | https://data.gov.hk/ | 小巴總站和接駁點數據來源。 |
| AFCD / HAD / CSDI 開放數據 | https://data.gov.hk/ 與 CSDI | 無障礙場地、公共洗手間和社區設施數據來源。 |

## 本地項目資料

| 來源 | 位置 | 用途 |
| --- | --- | --- |
| 舊版可運行項目 | `#3 - 可用版本/` | 保留作為 legacy/reference；複用成熟路線、MTR、KMB、ETA、CSDI route tile 思路，不復用舊 UI。 |
| GitHub raw content fallback | `https://raw.githubusercontent.com/Ellthy0721/accessmap-hk/main/%233%20-%20可用版本/data/` | 新版 Pages 運行時按需讀取 legacy CSDI route tiles，避免在 `docs/` 重複提交一份巨量 tiles。 |
| 數據說明 | `数据集.md` | 記錄已接入數據集、數量和整理狀態。 |
| 功能說明 | `功能.md` | 記錄不同無障礙羣體方向和功能需求。 |
| 新版需求和架構 | `docs-dev/PRD.md`, `docs-dev/ARCHITECTURE.md`, `docs-dev/ROADMAP.md` | 新版產品定位、服務邊界、階段計劃。 |

## 外部 GitHub 倉庫

| 倉庫 | 用途 |
| --- | --- |
| https://github.com/wheelstransit/hongkong-community-gtfs | 查閱香港社區 GTFS 的生成方式、覆蓋交通模式、數據歸屬和 ODbL 許可；本項目沒有複製其程序代碼，只讀取其公開生成的 GTFS feed，並由 app/scripts/build-route-shapes.py 壓縮成本地 route-shape 數據。 |


## 2026-07-07 Search Index Update

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| OpenStreetMap Overpass API | https://overpass-api.de/ | 遠端搜索的細 POI 補充來源；按香港 bbox 查詢帶名稱的店舖、機構、景點、屋苑和公共設施，回來後與本地結果去重合併。 |
| Mapable HK generated search index | `app/scripts/build-search-index.js`, `app/data/search-index.json`, `docs/data/search-index.json` | 本地即時搜索索引；由 MTR、KMB、Citybus、legacy facilities、行政區/地區種子、輕鐵種子、屋苑派生名稱、政府服務和主要景點生成。 |

## 2026-07-07 Multimodal Routing Update

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| New Lantao Bus Real-time Arrival Data API | https://rt.data.gov.hk/v2/transport/nlb/ | 生成 `app/data/transit.nlb.json` / `docs/data/transit.nlb.json`；用於嶼巴真實站序、站點座標與可用車費欄位。實際使用 endpoint 包括 `route.php?action=list`、`stop.php?action=list&routeId=...`。 |
| MTR official workbook local extract | `data/mtr_official_master_v10.xlsx` / `LightRail_Stops` | 生成 `app/data/transit.light-rail.json` 的輕鐵站名、站碼和本地座標匹配；用於輕鐵真實站序規劃。 |
| Mapable HK generated transit extras | `app/scripts/build-transit-extras.js` | 將嶼巴 API 與輕鐵站序整理為新版靜態資料，供 GitHub Pages 離線載入。 |
| Wikipedia - Hong Kong Light Rail | https://en.wikipedia.org/wiki/Light_Rail_(MTR) | 查核輕鐵系統、站數和公開路線背景；只作站序/路線資料交叉參考，不複製頁面文字。 |
| Wikipedia - MTR fares | https://en.wikipedia.org/wiki/MTR_fares | 查核港鐵票價資料背景；本階段仍未接入完整港鐵票價矩陣，UI 顯示「車費待查」。 |
| OpenStreetMap Overpass API | https://overpass-api.de/ | 曾嘗試用於查找輕鐵 stop 座標，但本地請求多次 timeout；最終沒有把 Overpass 查詢結果用於本次輕鐵資料生成。 |

## 2026-07-07 ETA, Fare, and Route Geometry Update

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| MTR Next Train / Real-time Arrival API | https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php | 港鐵重鐵段下一班列車 ETA；用於將候車時間加入路線總時間和排序。 |
| KMB ETA API | https://data.etabus.gov.hk/v1/transport/kmb/eta/ | 九巴下一班巴士 ETA；用於巴士候車時間和路線排序。 |
| Citybus ETA API | https://rt.data.gov.hk/v2/transport/citybus/eta/ | 城巴下一班巴士 ETA；用於巴士候車時間和路線排序。 |
| New Lantao Bus estimatedArrivals API | https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=estimatedArrivals | 嶼巴下一班巴士 ETA；用於巴士候車時間和路線排序。 |
| OSRM public demo routing server | https://router.project-osrm.org/ | 巴士地圖顯示用道路跟隨幾何；以站序作 waypoints 生成道路路線，避免以站點直線連接。這不是巴士公司的官方 route shape。 |
| MTR fare CSV index | `data/mtr_official_master_v10.xlsx` / `Fares_Index` | 確認專案原資料索引提到 `mtr_lines_fares.csv`、`airport_express_fares.csv`、`light_rail_fares.csv`，但本地倉庫沒有這些 CSV；本階段未偽造港鐵/輕鐵票價矩陣。 |
| KMB / Citybus route endpoint fare probe | https://data.etabus.gov.hk/v1/transport/kmb/route/ 與 https://rt.data.gov.hk/v2/transport/citybus/route/ | 查核官方開放 route endpoint；回應未提供車費欄位，因此九巴/城巴車費仍待正式票價資料源。 |

## 2026-07-07 Official MTR Fare Matrix Update

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| MTR Open Data - heavy rail fares | https://opendata.mtr.com.hk/data/mtr_lines_fares.csv | 官方重鐵票價矩陣；由 `app/scripts/build-fares.js` 下載並生成 `app/data/transit.fares.json` / `docs/data/transit.fares.json`。 |
| MTR Open Data - Airport Express fares | https://opendata.mtr.com.hk/data/airport_express_fares.csv | 官方機場快綫票價矩陣；納入 `transit.fares.json`。 |
| MTR Open Data - Light Rail fares | https://opendata.mtr.com.hk/data/light_rail_fares.csv | 官方輕鐵票價矩陣；用 Stop ID 映射到 Mapable 本地輕鐵 stop code 後納入 `transit.fares.json`。 |
| MTR Open Data - heavy rail line/station mapping | https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv | 建立港鐵 Station ID 到 Station Code 的映射，用於票價矩陣查詢。 |
| MTR Open Data - Light Rail routes/stops mapping | https://opendata.mtr.com.hk/data/light_rail_routes_and_stops.csv | 建立輕鐵 Stop ID 到 Stop Code / 本地 stop code 的映射，用於票價矩陣查詢。 |
| CSDI / Web search for route shapes | CSDI / data.gov.hk / MTR Open Data search | 2026-07-07 當時未找到可直接使用的官方連續巴士線形；此結論已由 2026-07-16 找到的運輸署 `FB_ROUTE_LINE` 城巴資料取代。港鐵及輕鐵仍沿用本文列明的本地軌道近似來源。 |

## 2026-07-07 Fare Data Size Optimization

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| Mapable HK compact fare build | `app/scripts/build-fares.js`, `app/data/transit.fares.json`, `docs/data/transit.fares.json` | 將 MTR 官方票價 CSV 壓縮為 key/value JSON；每筆票價使用 `[成人八達通, 成人單程票, 樂悠咭60]`，減少 GitHub Pages 首次載入體積。 |

## 2026-07-07 Official Bus, Light Rail ETA, and Rail Geometry Import

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| Transport Department - Routes and fares of public transport (GeoJSON), JSON_BUS | https://static.data.gov.hk/td/routes-fares-geojson/JSON_BUS.json | 下載官方巴士路線站序、站點坐標、公司代碼、全程車費與行車時間；由 `app/scripts/build-td-bus.js` 生成 `app/data/transit.td-bus.json` / `docs/data/transit.td-bus.json`，用於巴士車費、站序和道路補線 waypoint。 |
| DATA.GOV.HK - Routes and fares of public transport (GeoJSON) | https://data.gov.hk/en-data/dataset/hk-td-tis_23-routes-fares-geojson | 查核 TD GeoJSON 資料說明與更新來源；確認該資料是 route / stop / fare 資料，不是完整官方道路 polyline。 |
| MTR Light Rail Next Train API | https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule | 輕鐵即時到站；`route-service.js` 以 `station_id` 和 `route_no` 讀取候車時間，納入路線總時間和排序。 |
| HOTOSM China, Hong Kong SAR Railways | https://data.humdata.org/dataset/hotosm_hkg_railways | 下載 OpenStreetMap-derived railway lines GeoJSON zip；由 `app/scripts/build-rail-geometry.py` 生成 `app/data/transit.rail-geometry.json` / `docs/data/transit.rail-geometry.json`，用於港鐵/輕鐵地圖線形近似。非 MTR 官方工程級軌道資料。 |
| HDX package API for HOTOSM railways | https://data.humdata.org/api/3/action/package_show?id=hotosm_hkg_railways | 程式化取得 HOTOSM railway GeoJSON 下載 URL，避免手動下載。 |

## 2026-07-10 Local Transit Route Shapes

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| Hong Kong Community GTFS hosted feed | https://feed.justusewheels.com/hk.gtfs.zip | 本地 route-shape 與營運時間主資料。讀取 routes、trips、shapes、calendar、calendar_dates、frequencies、stop_times 和 attributions，生成 app/data/transit.route-shapes/；目前整理出 1,159 個 provider/route key、2,161 條方向/變體 shape，覆蓋九巴、城巴、嶼巴、港鐵和輕鐵。 |
| Hong Kong Community GTFS repository | https://github.com/wheelstransit/hongkong-community-gtfs | 查核 feed 是由 OpenStreetMap 與 DATA.GOV.HK 等開放來源程序化生成，並確認生成資料採 ODbL。只參考資料來源、授權與 feed 入口，沒有複製倉庫程式碼。 |
| Wheels Router API overview | https://router.justusewheels.com/ | 找到 hosted GTFS 與 route-shape 服務入口，並查核其公開列出的香港交通覆蓋範圍。Mapable HK 運行時不依賴此遠端規劃 API。 |
| Wheels route-shape service | https://shapes.justusewheels.com/ | 調查可否直接使用遠端 shape 服務；最終選擇將 GTFS shapes.txt 壓縮後存於本地，避免規劃時依賴遠端 API。 |
| GTFS Shapes guidance | https://gtfs.org/resources/gtfs-schedule-feature-guides/shapes/ | 查核 shapes.txt 應描述車輛實際行走路徑，巴士應沿道路、鐵路應沿軌道，並應避免不合理回折；用於設計端點吸附、方向截取和長度校驗。 |
| GTFS Schedule reference | https://gtfs.org/documentation/schedule/reference/ | 查核 routes.txt、trips.txt、shape_id、shape_pt_sequence 的正式關係和欄位語義。 |
| OpenStreetMap copyright and ODbL | https://www.openstreetmap.org/copyright | GTFS shape 的部分幾何為 OSM 衍生資料；記錄必須標示 OpenStreetMap contributors 並保留 ODbL 說明。 |
| Open Data Commons ODbL 1.0 | https://opendatacommons.org/licenses/odbl/1-0/ | 在路線資料欄提供可直接開啟的 ODbL 正式授權條款連結，補足 OSM 衍生路線資料的授權說明。 |
| OpenStreetMap public transport relation documentation | https://wiki.openstreetmap.org/wiki/Public_transport | 調查 OSM route relation 對巴士、重鐵和輕鐵的方向、站序與 way member 表達方式；用於評估直接下載 relation 的替代方案。 |
| OSM Hong Kong MTR route relation list | https://wiki.openstreetmap.org/wiki/Hong_Kong/Transport/Routes/MTR | 取得 505、507、610、614、614P、615、615P、705、706、751、761P 共 11 條輕鐵服務、20 個方向/環線 route relation ID。 |
| OpenStreetMap API 0.6 full relation | https://api.openstreetmap.org/api/0.6/relation/{relation_id}/full.json | 構建時下載每個輕鐵 route relation 的有序 way、node 和 stop member；生成貼合實際軌道的本地 shape，並以 stop node 的 ref 校正 68/68 個輕鐵站坐標。網頁運行時不調用此 API。 |
| Wikidata Light Rail Route 705 | https://www.wikidata.org/wiki/Q62127918 | 交叉核對 705 路線的 OpenStreetMap relation ID 6558997 和環線屬性；實際幾何使用其方向 route relation 2941692。 |
| OSM Public Transport to GeoJSON API documentation | https://openstreetmap.tools/public_transport_geojson/docs | 評估按 relation 下載 route LineString 的方案；因需要逐條 relation ID 且全港覆蓋管理成本高，本階段未作運行時或構建依賴。 |
| Transport Department Intelligent Road Network Package | https://www.td.gov.hk/en/public_services/intelligent_road_network_package/index.html | 評估官方道路網作巴士站序 map-matching 的備選方案；資料可描述道路方向和轉向限制，但不等於巴士實際營運 route shape，本階段未導入。 |
| Mapable HK route-shape build output | `app/scripts/build-route-shapes.py`、`app/data/transit.route-shapes/`、`docs/data/transit.route-shapes/` | 將 GTFS shapes、CSDI 城巴官方線形、OSM relation 與 GTFS 時刻表壓縮為分桶 polyline 和服務日曆 JSON；按公司及路線首字符懶加載。當前整理出 1,253 個路線鍵和 2,530 條方向/變體 shape，共約 74.0 萬個簡化點；城巴官方原始約 2,084 萬點簡化為約 26.5 萬點。 |

## 2026-07-16 Official Citybus Route Geometry

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| DATA.GOV.HK - Routes and fares of public transport, `FB_ROUTE_LINE` resource | https://data.gov.hk/en-data/dataset/hk-td-tis_23-routes-fares-geojson/resource/e9900c0d-bfb3-4a33-a2c7-8e3fdf301798 | 運輸署官方連續巴士路線圖層說明。圖層為 Polyline，可輸出 WGS84 GeoJSON。 |
| CSDI `FB_ROUTE_LINE` layer metadata | https://portal.csdi.gov.hk/server/rest/services/common/td_rcd_1638844988873_41214/MapServer/0?f=pjson | 確認圖層名稱、`esriGeometryPolyline`、3000 筆上限，以及 `ROUTE_ID`、`ROUTE_SEQ`、`COMPANY_CODE`、`ROUTE_NAMEE`、首末站等欄位。 |
| CSDI `FB_ROUTE_LINE` query service | https://portal.csdi.gov.hk/server/rest/services/common/td_rcd_1638844988873_41214/MapServer/0/query | 構建時先無幾何讀取屬性，再按 `OBJECTID` 分批下載 `CTB`、`KMB+CTB`、`LWB+CTB` 的 WGS84 MultiLineString。網頁運行時不調用此服務。 |
| Mapable HK Citybus shape builder | `app/scripts/build-route-shapes.py` | 拼接官方 multipart 線段、檢查斷點、以 2.5 米容差簡化並優先提供 `CTB:*` 幾何；GTFS 班次保持獨立。構建器只保留首尾區間無法由同路線官方線覆蓋的社區補充 shape，避免刪除真正缺失方向，也避免重複資料拖慢規劃。當前接受 857/857 條官方方向記錄，覆蓋 369 個路線編號，另保留 41 條補充 shape。 |
| Citybus route-shape verification | `app/scripts/verify-ctb-route-shapes.js`、`app/scripts/verify-citybus-pattern-geometry.js`、`app/scripts/verify-td-bus-variants.js`、`app/scripts/verify-route-ranking.js` | 逐條解碼 857 條官方 polyline，核對點數、坐標、唯一 ID、路線覆蓋和連續性；驗證城巴 1、1M 和 967 使用 `official-csdi-fb-route-line`。967 必須保留 `1661:1`、`1661:2`、`1000293:1` 三個官方 `ROUTE_ID:ROUTE_SEQ` 變體，營辦商錯誤拼入而不屬於任何官方變體的站點不會生成虛假路線。 |

## 2026-07-17 MTR Exit Routing

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| CSDI 3D Indoor MTR Station Map API | https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-indoor-mtr-station-map | 港鐵站出口開口、代表坐標、樓層及站內設施的官方機器可讀空間資料。資料只在構建階段整理，瀏覽器不直接批量請求 WFS。 |
| GeoInfo Map `RailwayEntrance` layer, Lands Department, HKSAR Government | https://api.hkmapservice.gov.hk/ | 地政總署官方鐵路出入口名稱與 WGS84 點位。`app/scripts/fetch-mtr-geoinfo-exits.js` 在構建階段按站名及 850 米硬上限匹配，結果快照保存於 `data/mtr-geoinfo-railway-entrances.json`；瀏覽器運行時不調用 identify 服務。 |
| MTR Open Data - Routes, fares and barrier-free facilities | https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities | 核對站碼、站名和無障礙設施資料；靜態資料不代表升降機或斜道當刻可用。 |
| 港鐵路線圖、街道圖及位置圖 | https://www.mtr.com.hk/ch/customer/services/system_map.html | 人工核對出口編號、出口組和鄰近地標；不重新發布港鐵 PDF 或以 OCR 作主要運行資料。 |
| Mapable HK MTR exit builder | `app/scripts/fetch-mtr-geoinfo-exits.js`、`app/scripts/build-mtr-exits.js`、`app/data/transit.mtr-exits.json` | CSDI 出口開口優先，GeoInfo Map 只補充 CSDI 未覆蓋的站，不覆寫既有精細坐標。現時覆蓋 98/98 站、468 個邏輯出口和 454 個幾何接入點，其中 340 個來自 CSDI、114 個來自 GeoInfo Map；14 組同坐標出口合併顯示，例如 E1 / E2。 |
| MTR exit routing and verification | `app/scripts/services/route-service.js`、`app/scripts/verify-mtr-exit-data.js`、`app/scripts/verify-mtr-exit-routing.js`、`app/scripts/verify-mtr-exit-ui.js` | 每個目的站先預篩最多 3 個出口，最終候選再以最多 2 路並發比較真實步行路網；出口、尾段步行、Profile 排序、時間線和地圖使用同一資料物件。無出口資料時顯示待補充，不虛構出口編號。 |

## 2026-07-11 MTR Bus Routing and Search Recovery

| Source | Link / location | Use |
| --- | --- | --- |
| MTR Open Data - MTR Bus routes | https://opendata.mtr.com.hk/data/mtr_bus_routes.csv | Official MTR Bus and feeder route names and directions. `app/scripts/build-mtr-bus.js` imports this into the local transit dataset. |
| MTR Open Data - MTR Bus stops | https://opendata.mtr.com.hk/data/mtr_bus_stops.csv | Official stop order, IDs, Chinese/English names and coordinates for K66 and the other MTR Bus routes. Also feeds instant local search. |
| MTR Open Data - MTR Bus fares | https://opendata.mtr.com.hk/data/mtr_bus_fares.csv | Official adult and elderly Octopus fares used in route display and Profile-aware ranking. |
| DATA.GOV.HK - MTR routes, fares and barrier-free facilities | https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities | Official dataset metadata and update entry for the MTR Open Data resources above. |
| OSRM public demo routing server | https://router.project-osrm.org/ | Build-time only: constrains the official MTR Bus stop sequence to roads. Runtime routing uses the generated local JSON and does not wait for OSRM. This is road matching, not an official MTR route shape. |
| Mapable HK MTR Bus build output | `app/data/transit.mtr-bus.json`, `docs/data/transit.mtr-bus.json` | Stores 26 routes, 42 directional patterns, 676 stops, fares and road geometry locally. It restores feeder routing for arbitrary Yuen Long addresses. No official live ETA endpoint was found for these services, so the UI uses a clearly estimated wait and does not present it as live arrival data. |

## 2026-07-10 Service Calendar and Supplemental Bus Relations

| 來源 | 連接 / 位置 | 用途 |
| --- | --- | --- |
| Hong Kong Community GTFS schedule files | https://feed.justusewheels.com/hk.gtfs.zip | 讀取 `calendar.txt`、`calendar_dates.txt`、`frequencies.txt` 和 `stop_times.txt`，把營運星期、特別日期、首末班時段和班次間隔壓入本地 route-shape manifest；網頁運行時不需要下載原始 GTFS。 |
| GTFS calendar reference | https://gtfs.org/documentation/schedule/reference/#calendartxt 與 https://gtfs.org/documentation/schedule/reference/#calendar_datestxt | 核對星期掩碼、服務起止日期及新增/取消服務日期的正式語義。 |
| GTFS frequencies and stop times reference | https://gtfs.org/documentation/schedule/reference/#frequenciestxt 與 https://gtfs.org/documentation/schedule/reference/#stop_timestxt | 核對頻密班次的起止時間、班距，以及沒有 frequencies 記錄時的固定開出時間。 |
| OpenStreetMap Overpass API interpreter | https://overpass-api.de/api/interpreter | 僅在構建審計階段按香港範圍、路線號和公交公司查找缺失巴士 route relation；網頁運行時不調用。 |
| KMB 91R OSM route relations | https://www.openstreetmap.org/relation/6496237 與 https://www.openstreetmap.org/relation/6498056 | 與本地九巴官方站序交叉核對清水灣、彩明方向；補充社區 GTFS 未包含的 91R 本地真實走線。 |
| Citybus E18 OSM route relation | https://www.openstreetmap.org/relation/20697949 | 與城巴官方 E18 東涌（翔東邨）至北角碼頭站序核對後，作為本地補充走線。 |
| Citybus E28 OSM route relation | https://www.openstreetmap.org/relation/20697948 | 與城巴官方 E28 東涌（翔東邨）至將軍澳工業邨站序核對後，作為本地補充走線。 |
| Official real-time arrival APIs | KMB、Citybus、NLB、MTR Next Train、MTR Light Rail endpoints（見本文件 ETA 章節） | 本階段正式接入最終候選路線：ETA 成功時更新候車時間、總時間和排序；2.8 秒內不可用時回退本地時刻表，避免規劃界面長期卡住。 |
| Supplemental-route validation result | `app/scripts/build-route-shapes.py`、`app/data/transit.route-shapes/manifest.json` | 目前可靠補入 91R、E18、E28。104R、15B、1P、H2、X9、34S、7S、NB2 屬特別、季節、觀光、墓園或跨境服務且沒有足夠可靠公開 shape，因此繼續從推薦中排除，不以站點折線冒充真實走線。 |

## 2026-07-07 Route Geometry Reliability Notes

| 來源 | 位置 / 連結 | 用途 |
| --- | --- | --- |
| Transport Department `JSON_BUS.json` schema check | https://static.data.gov.hk/td/routes-fares-geojson/JSON_BUS.json | `geometry.type` 為 `Point`，即沿線站點坐標，不是道路 polyline。本版把它作為官方站序/票價來源，並以 `COMPANY_CODE + ROUTE_ID + ROUTE_SEQ` 識別獨立服務變體，不能只按公司、路線號和方向合併。營辦商站序會展開為有足夠有序覆蓋的官方變體，匹配覆蓋率同時相對營辦商站序和官方候選站序計算，再移除不屬於該 `ROUTE_ID` 的衝突站點；匹配不足才保留營辦商資料。連續幾何仍由相同 `ROUTE_ID + ROUTE_SEQ` 的 CSDI 路線線形提供。 |
| HOTOSM railway names check | `app/data/transit.rail-geometry.json` | 確認本地 HOTOSM 軌道線主要有 `MTR Tuen Ma Line`、`MTR East Rail Line` 等名稱。本版只在相同港鐵線別子圖內尋路；沒有可靠線別的路段退回官方站序線，不再用全港 rail graph 跨線亂接。 |

## 2026-07-11 Local Search Reliability Update

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| MTR official local station data | `app/data/transit.mtr.json` | 本地收錄 98 個港鐵站，加入繁體、簡體常用字、英文站名、`Station` 和站碼別名；由 `app/scripts/verify-search-index.js` 逐站驗證。 |
| MTR Light Rail local stop data | `app/data/transit.light-rail.json` | 本地收錄 68 個輕鐵站，保持「地區名稱」與「XX站」為不同結果，並逐站驗證。 |
| KMB, Citybus and New Lantao Bus local stop data | `app/data/transit.kmb.json`, `app/data/transit.citybus.json`, `app/data/transit.nlb.json` | 生成全港本地巴士站搜索項；本階段把先前漏入搜索索引的嶼巴站補回。API 來源見本文交通資料章節。 |
| ArcGIS World Geocoding and OpenStreetMap Nominatim | 本文「搜索與地址」章節連結 | 只在本地結果顯示後於背景補充店舖、機構、地址和 POI；每次搜索設總時間預算，失敗不阻塞本地結果。 |
| Photon and OpenStreetMap Overpass runtime audit | 本文「搜索與地址」及 Search Index Update 章節連結 | 2026-07-11 實測 Photon 持續 HTTP 400、Overpass 出現 HTTP 429/timeout，因此不再放入每次網頁搜索的即時請求；Overpass 只保留作離線資料審計/構建參考。 |
| Mapable HK local candidate index | `app/scripts/services/search-service.js`, `app/data/search-index.json` | 以前綴、雙字片段和字符倒排索引先縮小候選，再做排序和模糊匹配，避免每次按鍵對全部地點計算編輯距離。 |
| HOTOSM Hong Kong Points of Interest export | https://data.humdata.org/dataset/hotosm_hkg_points_of_interest | 下載 2026-05-05 的 points / polygons GeoJSON 靜態包；由 `app/scripts/build-hotosm-search.js` 抽取具名政府/公共機構與景點，並固化到本地搜索資料。資料源為 OpenStreetMap，依 ODbL 使用。 |
| HOTOSM Hong Kong Buildings export | https://data.humdata.org/dataset/hotosm_hkg_buildings | 下載 2026-05-05 的 buildings polygons GeoJSON 靜態包；抽取及清洗屋苑/住宅主名稱和具名政府建築，不把整個 85 MB 原始包帶到網頁。 |
| Mapable HK HOTOSM search extract | `app/scripts/build-hotosm-search.js`, `app/data/search.hotosm.json` | 可重複生成的精簡中間資料；本階段生成約 795 個政府/公共機構、2,600 個屋苑主名稱和 2,000 個景點，再合併到 `search-index.json`。 |

## 2026-07-11 Walking Network and Ramp Routing Update

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| CSDI 3D Pedestrian Network | https://portal.csdi.gov.hk/ | 步行主路網來源。沿用本地 177 個 route tiles，路段包含實際 geometry、距離、高差推算坡度、樓梯、升降機及斜道標記。 |
| Lands Department 3D Pedestrian Route Search API | [API 文件](https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-pedestrian-route-search)；[CSDI 更新公告](https://portal.csdi.gov.hk/csdi-webpage/info/WhatsNew) | 2026-07-08 起支援室內及室外點到點行人路線。本地 CSDI route tiles 無法形成完整路徑，或端點接入距離明顯不可靠時，網頁才按需請求官方服務；輪椅及嬰兒車使用 `Barrier Free Path`，長者及視障使用 `Recommended Path`，一般及色弱使用 `Shortest Path`。返回幾何不取代本地無障礙細項，路面、闊度和接入資料仍標示為待確認。 |
| Local CSDI route tile builder and cache | `#3 - 可用版本/scripts/build-pedestrian-routes.js`, `#3 - 可用版本/data/routes.tiles/` | 說明 route tile 中 `slope`、`hasStairs`、`hasLiftNearby`、`hasRampNearby` 的生成方式；新版按走廊載入及快取，不把約 700 MB 路網重複放入 `docs/`。 |
| GitHub Pages route tile fallback | `app/scripts/services/route-data-service.js`、GitHub LFS media 與 raw fallback 連結 | Pages 找不到本地 tile 時，先從 `media.githubusercontent.com` 讀取同一 repo 由 Git LFS 管理的實際 CSDI route index 和 tiles，再嘗試 raw fallback；避免把 `version https://git-lfs...` 指標文字誤當 JSON。保留 12 秒超時、單 tile cache 和合併圖 cache，失敗時不讓整體規劃永久等待。 |
| Mapable HK profile-aware walking router | `app/scripts/services/route-service.js` | 多候選近距離吸附、連通路網 Dijkstra、樓梯/坡度/過路處/升降機/斜道成本。輪椅禁用樓梯；嬰兒車樓梯成本低於輪椅；視障與色弱提高過路處成本；斜道按 Profile 優先。 |
| Walking routing regression | `app/scripts/verify-walking-routing.js` | 合成一條短樓梯路和較長斜道路：驗證輪椅及嬰兒車選斜道且 0 樓梯，一般模式可選明顯更短的樓梯路。 |

## 2026-07-11 Walking Accessibility Facility Overlay

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| CSDI 3D Indoor MTR Station Map API | https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-indoor-mtr-station-map | 官方港鐵站內設施點來源；本階段使用 `mtr_amenity_point` 中的升降機和斜道，並區分地面/出口與室內樓層。 |
| Legacy normalized facility master | `#3 - 可用版本/data/facilities.json` | 讀取已整理的 CSDI 港鐵設施記錄；排除示範記錄，只保留有坐標的官方升降機/斜道點。 |
| Compact accessibility build | `app/scripts/build-walking-accessibility.js`, `app/data/walking-accessibility.json` | 用字典索引和短陣列壓縮 1,005 個設施點至約 46 KB，供 GitHub Pages 首次載入。 |
| Runtime spatial join | `app/scripts/services/route-service.js` | 以小型格網索引把附近設施匹配到已載入的步行邊；室內點只匹配室內路段，地面/出口點使用 35-45 米上限。設施點目前是成本提示，不等同入口級可通行連接。 |

## 2026-07-11 Browser Icon

| 來源 | 位置 | 用途 |
| --- | --- | --- |
| Mapable HK browser icon | `logo/App/logoroundminimizeddark.png` | 原始正方形深色品牌圖；原比例複製至 `app/assets/favicon.png`，供瀏覽器標籤頁與 GitHub Pages 使用。 |
| Mapable HK header logos | `logo/App/logoTC.png`、`logo/App/logoSC.png`、`logo/App/logoEN.png` | 繁體、簡體及英文品牌圖；原比例複製至 `assets/logoTC.png`、`assets/logoSC.png` 及 `assets/logoEN.png`，由頁面按目前語言切換。 |

## 2026-07-11 Public Footbridge Structure Routing

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| Highways Department / CSDI Footbridge `STR_FB` | https://portal.csdi.gov.hk/csdi-webpage/file-api?dataset_id=hyd_rcd_1632360512481_74705&format=geojson&layer_name=STR_FB | 官方全港行人天橋 polygon。原始 1,185 個 polygon 按結構編號合併為 1,170 個唯一結構；只確認天橋範圍，不代表必定設有升降機或斜道。 |
| Compact public structure builder | `app/scripts/build-public-walking-structures.js`, `app/data/walking-public-structures.json` | 下載及快取官方 GeoJSON，合併同一結構的多個 polygon bbox，生成約 92 KB 的 GitHub Pages 索引。 |
| Runtime structure/route join | `app/scripts/services/route-service.js` | 使用格網和 bbox 相交，把已載入的 CSDI 步行邊標示為橋面或出入口連接；輪椅可行性仍由真實樓梯、斜道和升降機步行邊決定，不以天橋中心點推斷無障礙。 |

## 2026-07-12 Service Schedule Coverage Audit

| 來源 | 連結 / 位置 | 用途 |
| --- | --- | --- |
| Local service schedule audit | `app/scripts/verify-service-schedules.js`, `docs-dev/SERVICE_SCHEDULE_AUDIT.md` | 量化九巴、城巴、嶼巴、港鐵及輕鐵的計劃時刻與即時到站覆蓋；驗證跨營辦商共享路線必須通過站序空間重合，不可只按路線號匹配。 |
| Local compressed timetable manifest | `app/data/transit.route-shapes/manifest.json` | 將“完全沒有班次記錄”和“已有記錄但所有窗口均為 `NEVER / 0/0/0`”分開處理。前者仍視為資料未知；後者表示當前資料源明確沒有營運窗口，不進入立即、計劃或全部路線推薦。原始 Community GTFS、GTFS 規格及官方 ETA API 連結見本文前述章節。 |

## 2026-07-12 Profile Design Research

| 來源 | 鏈接 / 位置 | 用途 |
| --- | --- | --- |
| W3C Web Content Accessibility Guidelines 2.2 | https://www.w3.org/TR/WCAG22/ | Profile 界面共同無障礙基線；用於顏色、對比度、頁面重排、焦點、觸控目標和可訪問名稱要求。 |
| W3C - Understanding Use of Color (SC 1.4.1) | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html | 確認顏色不能作為傳達信息、操作、回應或區分元素的唯一視覺方式。 |
| W3C - Understanding Contrast Minimum (SC 1.4.3) | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | 確認普通文字 4.5:1、大字 3:1 的最低對比度。 |
| W3C - Understanding Non-text Contrast (SC 1.4.11) | https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | 確認控件和有意義圖形與相鄰顏色至少 3:1；用於地圖路線、邊框、圖標和焦點。 |
| W3C - Understanding Reflow (SC 1.4.10) | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | 用於 400% 放大和窄視口下的內容重排要求。 |
| W3C - Understanding Focus Visible (SC 2.4.7) | https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html | 用於 Profile、地點輸入、路線選擇和路線段按鈕的鍵盤焦點設計。 |
| W3C - Understanding Target Size Minimum (SC 2.5.8) | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | 確認指針目標至少 24 x 24 CSS px；本項目主要觸控目標計劃採用約 44 x 44 px。 |
| U.S. National Eye Institute - Types of Color Vision Deficiency | https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness/types-color-blindness | 核對紅綠色覺的 protan/deutan 類型和藍黃色覺的 tritan 類型。 |
| Hong Kong Transport Department - Persons with Disabilities | https://www.td.gov.hk/en/road_safety/road_users_code/index/chapter_2_for_pedestrians/persons_with_disabilities/index.html | 核對香港過路處的有聲交通燈、觸覺裝置和震動模式，以及輪椅道路使用提示。 |
| Hong Kong Transport Department - A Guide to Public Transport for People with Disabilities (2025) | https://www.td.gov.hk/filemanager/en/content_4963/Guidebook%202025%20E%20for%20web.pdf | 香港公共交通無障礙設施總覽；用於後續核對港鐵、巴士、觸覺引路和乘車輔助需求。 |
| Buildings Department - Design Manual: Barrier Free Access 2008 (2025 Edition) | https://www.bd.gov.hk/doc/en/resources/codes-and-references/code-and-design-manuals/BFA2008_e.pdf | 用於定義無障礙通道、斜道、升降機、觸覺引路和入口連接的數據要求。 |
| OpenStreetMap Wiki - tactile_paving | https://wiki.openstreetmap.org/wiki/Key:tactile_paving | 核對觸覺引路帶的機器可讀標籤；當前 CSDI 路網未證明完整覆蓋該字段。 |
| OpenStreetMap Wiki - traffic_signals:sound | https://wiki.openstreetmap.org/wiki/Key:traffic_signals:sound | 核對有聲交通燈的機器可讀標籤；尚未導入運行數據。 |
| Family Health Service, Department of Health - Babycare Facilities in Government Premises | https://www.fhs.gov.hk/tc_chi/breastfeeding/babycare_facilities.json | Direct Traditional Chinese JSON used by `app/scripts/build-babycare-facilities.js`; supplies government venue, address, department and the 2025-12-31 source date. |
| MTR - Babycare Rooms (Traditional Chinese) | https://www.mtr.com.hk/ch/customer/services/breastfeeding.html | Parsed by the Profile D builder for all 14 listed stations, paid/unpaid-area location text and official station-map links; coordinates come from the local official MTR station dataset. |
| UNICEF HK - Say Yes To Breastfeeding registered premises | https://www.sayyestobreastfeeding.hk/hk/index.php?route=work_place/equipment | Profile D crawls the public paginated registry and detail pages for venue names, addresses, opening information and publisher-provided coordinates; records are labelled community-program data, not guaranteed babycare rooms. |
| HKU School of Nursing - BreastfeedingGPS | https://bfci.hku.hk/en/about_bfgps_app/introduction/ | Evaluated as a credible community reference. No public bulk interface or republication permission was found, so its facility database is not copied into the release dataset. |
| Mapable HK Profile design | `docs-dev/profile.md` | 記錄六個 Profile 的硬約束、相對權重、信息欄、視覺變化、母嬰室圖層、數據缺口和驗收矩陣；確認前不實施。 |
| FHS Babycare Facilities information page | https://www.fhs.gov.hk/english/breastfeeding/babycare_facilities_list.html | Confirms the government list is accurate as of 2025-12-31 and provides the disclaimer shown in Profile D source metadata. |
| UNICEF HK legal matters | https://www.sayyestobreastfeeding.hk/hk/Legal-matters | Checked before import: site content permits personal and educational use; Mapable HK stores attributed text fields only and does not copy UNICEF names, logos or images. |
| UNICEF HK registered-premise detail pages | https://www.sayyestobreastfeeding.hk/hk/equipment-detail | Publisher detail pages provide venue coordinates and contact/location fields used by the Profile D builder. |
| Hong Kong International Airport - Nursing Rooms | https://www.hongkongairport.com/tc/passenger-guide/airport-facilities-services/nursing-rooms | Venue-official source confirming 39 rooms grouped across Terminal 1, Terminal 2, T1 Satellite, T1 Midfield and SkyPier; published as five terminal-level records with room counts. |
| Google Web Search - Hong Kong shopping mall baby care room official | https://www.google.com/search?q=Hong+Kong+shopping+mall+baby+care+room+official | 2026-07-12 用於發現商業場所自己的育嬰設施頁面；搜索摘要不作為數據源，也不複製到發佈數據。 |
| ELEMENTS - Babies Room | https://www.elementshk.com/eng/elements/services/babies_room | 可信商業場所官方來源；確認圓方在 1 樓水區和 2 樓火區設有兩間育嬰室。Profile D 僅保存場所、樓層、房間數、官方地點座標和來源鏈接，不複製頁面圖片或營銷文字。 |
| GeoData Store Location Search API | https://geodata.gov.hk/gs/api/v1.0.0/locationSearch | Evaluated for official address geocoding on 2026-07-12 but returned HTTP 503; it is documented but is not a release-build dependency. |
| Leaflet.markercluster 1.5.3 | https://github.com/Leaflet/Leaflet.markercluster | Mature Leaflet clustering plugin used for low-zoom Profile D facility aggregation; only viewport facilities are inserted into the cluster layer. |
| Mapable HK babycare facility builder and dataset | `app/scripts/build-babycare-facilities.js`, `app/data/babycare-facilities.json` | Normalizes, deduplicates and source-labels government, transit, community-program and venue-official records; unmapped/low-confidence records remain in data but are excluded from map and route-corridor counts. |

## 2026-07-13 Routing Performance and Live ETA Verification

| 來源 | 鏈接 / 位置 | 用途 |
| --- | --- | --- |
| Local routing performance audit | `docs-dev/ROUTING_PERFORMANCE_AUDIT.md`, `app/scripts/verify-route-ranking.js` | 記錄巴士空間索引、巴士腿緩存、ETA TTL、Worker 最新請求取消及修復前後性能。 |
| Local live ETA schema verifier | `app/scripts/verify-live-transit-eta.js` | 直接檢查前文登記的九巴、城巴、嶼巴、港鐵和輕鐵官方 ETA API 的 HTTP 狀態與響應結構；不生成或轉載新的交通數據。 |

## 2026-07-13 Interface Icon System

| Source | Link / location | Use |
| --- | --- | --- |
| Lucide icon design language and ISC licence | https://lucide.dev/ and https://github.com/lucide-icons/lucide/blob/main/LICENSE | Reference for the 24 px linear SVG geometry used by interface controls, including the settings gear, location, status, visibility, check, chevron, and zoom symbols. Icons remain inline so the static GitHub Pages build has no extra runtime dependency. |
| Mapable HK icon inventory | `docs-dev/ICON_SYSTEM.md` | Records every current interface and map icon, shared stroke rules, marker identity, accessible-name requirements, and the distinction between icons, route labels, and brand assets. |
## 2026-07-14 Profile-aware senior fares

| Source | Link / location | Use |
| --- | --- | --- |
| MTR Open Data - MTR Lines Fares | https://opendata.mtr.com.hk/data/mtr_lines_fares.csv | The local compact fare record keeps adult Octopus, adult single and JoyYou 60 values. Mapable HK now selects the official JoyYou/senior Octopus value when the Senior Profile is active. |
| MTR Open Data - Light Rail Fares | https://opendata.mtr.com.hk/data/light_rail_fares.csv | Supplies the same Profile-aware adult and senior Octopus values for Light Rail journeys. |
| MTR Open Data - MTR Bus Fares | https://opendata.mtr.com.hk/data/mtr_bus_fares.csv | Supplies official adult and elderly Octopus fares for all 42 locally stored MTR Bus directional patterns. KMB, Citybus and NLB now use the separately documented JoyYou policy below when an eligible franchised route has an official adult fare. |

## 2026-07-15 JoyYou bus fare policy

| Source | Link / location | Use |
| --- | --- | --- |
| Transport Department - Government Public Transport Fare Concession Scheme | https://www.td.gov.hk/tc/gov_public_transport_fare_concession/index.html | Primary rule effective 2026-04-03: eligible JoyYou Card trips charge the applicable fare below $2, $2 for adult fares up to $10, or 20% of the adult fare rounded to the nearest $0.1 above $10. Also confirms applicable transfer discounts and NLB front-section instructions. |
| KMB / LWB - Fare Concession Scheme | https://kmb.hk/storage/scheme_elderlydisabilities.html | Confirms the same 2026 JoyYou calculation and excludes racecourse routes, P960, P968, HK1 and Long Win A/NA airport routes. |
| Citybus - Public Transport Fare Concession Scheme | https://www.citybus.com.hk/en/uploadedFiles/concession/ptfcs_c.html | Confirms Citybus participation and excludes A/NA airport routes, H3, H4, H20, racecourse routes and non-franchised services. |
| NLB - Passenger Information | https://www.nlb.com.hk/info/passenger | Confirms the separate operator rule that, except for specially designated routes, passengers aged 65 or above pay half the adult single fare rounded up to $0.1; Mapable does not combine this identity with the JoyYou 60+ Profile. |
| Mapable HK JoyYou policy implementation | `app/scripts/services/route-service.js`, `app/scripts/verify-senior-fares.js` | Calculates eligible KMB, Long Win, Citybus and NLB JoyYou fares from official adult fares, blocks documented exclusions, labels uncertain section/transfer calculations as approximate, and retains excluded/unknown routes as fare-unconfirmed. |

## 2026-07-19 Official Public Toilet and AED Markers

| Source | Link / location | Use |
| --- | --- | --- |
| FEHD facility and service locations | https://data.gov.hk/en-data/dataset/hk-fehd-fehdlocatn-fehd-facility-and-service-locations | Primary public-toilet source. The build imports toilet, ap, and portable_toilet from the Traditional Chinese XML and enriches records with the public website JSON. Missing accessibility fields remain unknown; they are never converted to no. |
| FEHD accessible and universal toilet lists | https://www.fehd.gov.hk/english/pleasant_environment/cleansing/list_of_acccessible_toilets.html and https://www.fehd.gov.hk/english/pleasant_environment/cleansing/list_of_universal_toilets.html | Adds explicit accessible/universal flags and temporary accessibility remarks by mapID. The XML remains the base dataset because the website JSON schema can change without notice. |
| AFCD Toilets in Country Parks | https://portal.csdi.gov.hk/csdi-webpage/dataset/afcd_rcd_1635136427551_29173 | Adds official country-park toilet points and preserves BARRIER_FREE_FAC=Y/N as explicit yes/no accessibility evidence. |
| Fire Services Department CARE AED register | https://data.gov.hk/tc-data/dataset/hk-fsd-fsd1-fsdaedapi | Sole primary AED source. The build preserves exact coordinates, installation details, service hours, public-use status, operator/retrieval restrictions, floor category, brand and model. Exact duplicate rows are removed; co-located devices with different details remain separate. |
| CSDI 3D Indoor MTR Station Map amenities | https://portal.csdi.gov.hk/csdi-webpage/apidoc/3d-indoor-mtr-station-map | Adds exact indoor points whose amenity_category is restroom.wheelchair. Station, floor and indoor identity are retained; public access remains unknown because a point can be inside a paid or staff-assisted area. |
| OpenStreetMap Hap Mun Bay toilet node | https://www.openstreetmap.org/node/2930723166 | Corrects the FEHD mapID 1409 aqua-privy coordinate after the official XML placed the Sai Kung facility in Shenzhen. The published record retains both the original FEHD coordinate and this evidence link for audit. |
| Mapable HK public-facility builder and snapshot | app/scripts/build-public-facilities.py, app/data/public-facilities.json | Uses Python's structured XML and CSV parsers, validates Hong Kong coordinates and source-count floors, and stores a local runtime snapshot. Coordinate corrections are data-driven, preserve the upstream coordinate and reason, and stop the build when the upstream value changes so stale corrections cannot be applied silently. The 2026-07-19 build contains 964 FEHD records, 166 AFCD records, 80 CSDI MTR accessible-toilet records and 4,335 CARE records after exact-row deduplication. Counts are metadata, not product logic. |
| Mapable HK facility runtime | app/scripts/services/facility-service.js, app/scripts/main.js, app/scripts/verify-public-facilities.js | Loads the local snapshot only after the user enables a layer, inserts only the active kind and viewport subset into MarkerCluster, exposes source/access information and route actions, and never calls official bulk endpoints from the browser. The UI states that coverage can be incomplete or delayed and tells AED users to call 999 first in an emergency. |

## 2026-07-17 KMB and Long Win operator identity

| Source | Link / location | Use |
| --- | --- | --- |
| Transport Department - Routes and fares GeoJSON | https://static.data.gov.hk/td/routes-fares-geojson/JSON_BUS.json | The official `COMPANY_CODE` field separates `KMB` from `LWB`; Mapable uses this field instead of inferring the operator from a route number. |
| Long Win Bus - Airport services | https://www.kmb.hk/airbus.html | Official operator page confirming the Long Win Bus identity and its airport and North Lantau services. |
| Long Win Bus 2025 official booklet | https://www1.kmb.hk/morekmb/moreLWB2025.pdf | Official Long Win identity and orange livery reference. The interface uses `#f58220` for Long Win route labels and geometry. |
| Mapable HK operator split | `app/scripts/build-td-bus.js`, `app/scripts/services/route-service.js` | Keeps Long Win as provider `LWB`, displays the operator as Long Win, and retains explicit aliases to the shared KMB ETA, planned schedule and route-shape datasets. |
