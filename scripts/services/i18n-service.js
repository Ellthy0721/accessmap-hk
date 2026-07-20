(function () {
  "use strict";

  const STORAGE_KEY = "mapable-language";
  const DEFAULT_LANGUAGE = "zh-Hant";
  const LANGUAGES = Object.freeze(["zh-Hant", "zh-Hans", "en"]);
  const traditionalToSimplified = Object.freeze({
    線: "线", 圖: "图", 設: "设", 對: "对", 顯: "显", 強: "强", 標: "标", 識: "识", 讀: "读", 當: "当",
    許: "许", 嬰: "婴", 兒: "儿", 廁: "厕", 點: "点", 選: "选", 擇: "择", 確: "确", 認: "认", 資: "资",
    訊: "讯", 關: "关", 閉: "闭", 規: "规", 劃: "划", 長: "长", 輪: "轮", 視: "视", 車: "车", 體: "体",
    覺: "觉", 紅: "红", 綠: "绿", 藍: "蓝", 黃: "黄", 疊: "叠", 終: "终", 還: "还", 摺: "折", 預: "预",
    計: "计", 費: "费", 間: "间", 時: "时", 個: "个", 開: "开", 啟: "启", 會: "会", 將: "将", 後: "后",
    議: "议", 務: "务", 鐵: "铁", 輕: "轻", 駁: "驳", 灣: "湾", 圍: "围", 鐘: "钟", 龍: "龙", 醫: "医",
    廣: "广", 場: "场", 廈: "厦", 樓: "楼", 華: "华", 園: "园", 東: "东", 觀: "观", 馬: "马", 頭: "头",
    軍: "军", 區: "区", 辦: "办", 處: "处", 廠: "厂", 廟: "庙", 樂: "乐", 義: "义", 總: "总", 寶: "宝",
    麗: "丽", 館: "馆", 濕: "湿", 鳳: "凤", 豐: "丰", 島: "岛", 國: "国", 際: "际", 機: "机", 雙: "双",
    號: "号", 臺: "台", 學: "学", 環: "环", 堅: "坚", 興: "兴", 銅: "铜", 鑼: "锣", 調: "调", 嶺: "岭",
    鑽: "钻", 鰂: "鲗", 魚: "鱼", 覽: "览", 恆: "恒", 徑: "径", 錦: "锦", 羅: "罗", 運: "运", 營: "营",
    窩: "窝", 烏: "乌", 萬: "万", 鄉: "乡", 歷: "历", 術: "术", 藝: "艺", 驗: "验", 產: "产", 業: "业",
    貿: "贸", 財: "财", 稅: "税", 衛: "卫", 郵: "邮", 電: "电", 發: "发", 達: "达", 實: "实", 優: "优",
    勢: "势", 復: "复", 雜: "杂", 碼: "码", 證: "证", 書: "书", 閣: "阁", 莊: "庄", 順: "顺", 鴨: "鸭",
    勵: "励", 駿: "骏", 蘇: "苏", 趙: "赵", 僑: "侨", 維: "维", 輝: "辉", 賞: "赏", 應: "应", 無: "无",
    礙: "碍", 據: "据", 與: "与", 連: "连", 這: "这", 裡: "里", 尋: "寻", 邊: "边", 險: "险", 較: "较",
    穩: "稳", 購: "购", 價: "价", 絡: "络", 詢: "询", 繼: "继", 續: "续", 濾: "滤", 即: "即", 遠: "远",
    門: "门", 廳: "厅", 縣: "县", 禮: "礼", 階: "阶", 層: "层", 橋: "桥", 鄰: "邻", 轉: "转", 讓: "让",
    壓: "压", 縮: "缩", 寬: "宽", 闊: "阔", 樣: "样", 數: "数", 條: "条", 聲: "声", 觸: "触", 覽: "览"
  });

  function toSimplified(value) {
    return String(value || "").replace(/[\u3400-\u9fff]/g, (character) => traditionalToSimplified[character] || character);
  }

  const zhHant = {
    "place.nearbyNamed": "{place}\u9644\u8fd1\u5730\u9ede",
    "place.unknown": "\u6240\u9078\u4f4d\u7f6e",
    "journey.walkTo": "\u6b65\u884c\u81f3{destination}",
    "journey.walkMeta": "{distance}\uff0c\u7d04 {duration}",
    "journey.arrivalPending": "\u5230\u7ad9\u5f85\u67e5",
    "journey.waitApprox": "\u5019\u8eca\u7d04 {duration}",
    "journey.rideApprox": "\u8eca\u7a0b\u7d04 {duration}",
    "skip.results": "跳到路線結果",
    "map.label": "地圖",
    "map.appLabel": "Mapable HK 地圖",
    "map.tools": "地圖工具",
    "map.fitRoute": "回到路線",
    "map.fitHongKong": "全港",
    "map.zoomIn": "放大地圖",
    "map.zoomOut": "縮小地圖",
    "aiStudioPromo.label": "Mapable AI Studio 推介",
    "aiStudioPromo.open": "開啟 Mapable AI Studio",
    "aiStudioPromo.close": "關閉 Mapable AI Studio 推介",
    "aiStudioPromo.description": "以 Mapable HK 路線證據為基礎的無障礙出行 AI 解說介面",
    "settings.title": "設定",
    "settings.close": "關閉設定",
    "settings.contrast.title": "高對比顯示",
    "settings.contrast.description": "加強文字、控件、圖標及路線的辨識度。",
    "settings.language.title": "語言 / 语言 / Language",
    "settings.language.group": "選擇介面語言",
    "settings.language.traditional": "繁體",
    "settings.language.simplified": "简体",
    "settings.language.english": "English",
    "settings.routeData": "路線資料：",
    "source.landsPedestrian": "地政總署 3D 行人路線",
    "source.csdiMtrExits": "CSDI 港鐵出口",
    "source.geoInfoRailEntrances": "GeoInfo Map 鐵路出入口",
    "source.mtrOpenData": "港鐵開放資料",
    "source.fehdToilets": "FEHD 公廁",
    "source.afcdToilets": "AFCD 郊野公園廁所",
    "source.fsdAed": "FSD CARE AED",
    "locate.title": "定位到目前位置",
    "locate.allow": "允許定位服務",
    "locate.retry": "重新定位",
    "facility.controls": "地圖設施標點",
    "facility.babycare": "母嬰設施",
    "facility.publicToilet": "公共廁所",
    "facility.aed": "AED",
    "facility.enableBabycare": "開啟母嬰設施標點",
    "facility.enablePublicToilet": "開啟公共廁所標點",
    "facility.enableAed": "開啟 AED 標點",
    "status.initial": "選擇起點和終點後，會顯示建議路線。",
    "mapPick.confirm": "確認選取",
    "mapPick.cancel": "取消點選",
    "mapPick.cancelAria": "取消地圖點選",
    "mapInfo.label": "地圖地點資料",
    "mapInfo.close": "關閉地點資料",
    "location.loading": "正在定位中...",
    "location.popup": "請查看瀏覽器彈出視窗。",
    "location.wait": "請耐心等待，若長時間不成功請刷新頁面。",
    "planner.label": "路線規劃",
    "profiles.label": "出行需要",
    "profiles.senior": "長者",
    "profiles.wheelchair": "輪椅",
    "profiles.wheelchairAria": "輪椅人士或行動不便",
    "profiles.lowVision": "視障",
    "profiles.colorVision": "色弱",
    "profiles.colorVisionAria": "色弱模式",
    "profiles.stroller": "嬰兒車",
    "profiles.strollerAria": "嬰兒車或照顧者",
    "profiles.standard": "一般",
    "visual.label": "色覺顯示方式",
    "visual.choose": "選擇色覺顯示方式",
    "visual.redGreen": "紅綠色覺",
    "visual.blueYellow": "藍黃色覺",
    "planner.collapse": "折疊路線規劃",
    "planner.expand": "展開路線規劃",
    "planner.handle": "收起路線規劃",
    "input.start": "起點",
    "input.startPlaceholder": "你的所在地或起點",
    "input.clearStart": "清除起點",
    "input.end": "終點",
    "input.endPlaceholder": "想去邊度？",
    "input.clearEnd": "清除終點",
    "input.swap": "交換起點和終點",
    "departure.label": "出發時間",
    "departure.choose": "選擇出發時間",
    "departure.now.first": "立即",
    "departure.now.second": "出發",
    "departure.planned.first": "計劃",
    "departure.planned.second": "時間",
    "departure.all.first": "全部",
    "departure.all.second": "路線",
    "departure.realtime": "即時班次與到站",
    "departure.unfiltered": "不按出發時間篩選",
    "departure.pickerPlaceholder": "選擇日期和時間",
    "departure.pickerAria": "選擇日期和時間",
    "departure.plannedAria": "計劃出發時間：{value}",
    "departure.summaryNow": "立即出發",
    "results.expandMobile": "展開路線結果",
    "results.suggestion": "建議",
    "results.unplanned": "未規劃路線",
    "results.pending": "待選擇",
    "results.expand": "向上擴展路線結果",
    "results.restore": "還原路線結果高度",
    "results.collapse": "摺疊路線結果",
    "results.options": "可選路線",
    "results.walkSegments": "步行分段",
    "summary.label": "路線摘要",
    "summary.walkDistance": "步行距離",
    "summary.estimatedTime": "預計時間",
    "summary.fare": "車費",
    "journey.heading": "路線步驟",
    "journey.empty": "選擇路線後會顯示每一段行程。",
    "common.close": "關閉",
    "common.cancel": "取消",
    "common.confirm": "確認",
    "common.loading": "載入中",
    "common.pleaseWait": "請稍候",
    "common.minutes": "{count}分",
    "common.hoursMinutes": "{hours}時{minutes}分",
    "common.hours": "{hours}時",
    "common.meters": "{count} 米",
    "common.kilometers": "{count} 公里",
    "common.hongKong": "香港",
    "mode.walk": "步行",
    "mode.bus": "巴士",
    "mode.rail": "港鐵",
    "mode.lightRail": "輕鐵",
    "mode.transfer": "接駁",
    "mode.route": "路線",
    "place.currentLocation": "我的位置",
    "place.selectedNearby": "所選位置附近地點",
    "place.start": "起點",
    "place.end": "終點",
    "place.nextConnection": "下一個接駁點",
    "type.airport": "機場",
    "type.rail": "鐵路站",
    "type.mtr": "港鐵站",
    "type.light_rail": "輕鐵站",
    "type.district": "行政區",
    "type.area": "地區",
    "type.estate": "屋苑 / 屋邨",
    "type.government": "政府服務",
    "type.attraction": "景點",
    "type.toilet": "無障礙洗手間",
    "type.bus": "巴士站",
    "type.gmb": "小巴站",
    "type.custom": "自選地點",
    "type.hospital": "醫院",
    "type.mall": "商場 / 店舖",
    "type.poi": "地點",
    "type.address": "地址",
    "type.lift": "升降機",
    "type.ramp": "斜道",
    "type.accessible": "無障礙設施",
    "search.useLocation": "使用我的位置",
    "search.pickMap": "地圖點選位置",
    "search.locationPermission": "需要允許定位服務才能讀取目前位置",
    "search.searchingTitle": "正在搜尋香港地點",
    "search.searchingDescription": "這一操作可能消耗較長時間，正在同步查詢更多地點，請稍候。",
    "search.notFound": "找不到「{query}」",
    "search.pickAs": "可直接在地圖點一下，設為{kind}",
    "status.findingPlaces": "正在查找地點",
    "status.findingPlacesDescription": "正在確認起點和終點，請稍候。",
    "status.chooseMissing": "請先選定{missing}，或直接在地圖點選位置。",
    "status.notFoundPick": "找不到「{query}」。請在地圖點一下，設為{kind}。",
    "status.profileSelected": "已選擇{profile}出行需要，正在重新比較路線。",
    "status.colorMode": "已切換至{mode}顯示。路線排序不變。",
    "status.contrastOn": "已開啟高對比顯示。",
    "status.contrastOff": "已關閉高對比顯示。",
    "status.reselectStart": "請重新選擇起點，或再次使用我的位置。",
    "mapPick.confirmStart": "確認所選起點",
    "mapPick.confirmEnd": "確認所選終點",
    "mapPick.prompt": "請在地圖點選{kind}，選好後確認，或按「取消點選」返回。",
    "mapPick.selectedStatus": "已選「{place}」。可繼續點選另一位置、確認選取，或取消點選。",
    "location.unsupported": "此瀏覽器未提供定位。可改用地圖點選。",
    "location.reading": "正在讀取目前位置。",
    "location.located": "已定位到目前位置。",
    "location.denied": "請允許定位服務，或使用地圖點選位置。",
    "location.unavailable": "暫未取得目前位置，將在背景重試；你也可按「重新定位」。",
    "location.gps": "GPS 定位",
    "location.gpsAccuracy": "GPS 定位，約 {meters} 米範圍",
    "planning.status": "正在規劃步行、港鐵和巴士可行路線...",
    "planning.title": "正在規劃路線",
    "planning.description": "正在整理步行、港鐵、輕鐵和巴士方案，通常需要幾秒鐘。",
    "planning.longDescription": "正在規劃多條路線，這一操作可能消耗較長時間。",
    "planning.stillStatus": "仍在規劃中：正在等待即時到站或道路線形資料...",
    "planning.stillTitle": "仍在規劃中",
    "planning.stillDescription": "正在等待即時到站、票價或道路線形資料；如果網絡較慢，可能需要多等一會。跳轉或重新選點會自動取消本次規劃。",
    "planning.timeout": "路線規劃逾時，請重試或先改用較近的接駁點。",
    "planning.failed": "路線規劃失敗：{message}",
    "planning.calculating": "計算中",
    "planning.querying": "查詢中",
    "planning.badge": "規劃中",
    "results.noRoute": "暫未找到可行路線",
    "results.disconnected": "未連通",
    "results.noRouteStatus": "暫未找到可行路線。可改選附近地點或地圖點。",
    "results.noRouteAnnouncement": "暫未找到可行路線。請改選附近地點或使用地圖點選。",
    "results.farePending": "車費待查",
    "results.comparable": "可比較",
    "results.routeNumber": "路線{count}",
    "results.selected": "已選擇",
    "results.foundAnnouncement": "{profile}，共找到 {count} 條路線。已選擇{title}，預計 {duration}，步行 {distance}，{fare}。",
    "departure.allSummary": "全部路線 · 不按出發時間篩選",
    "departure.plannedSummary": "計劃出發 · {date}",
    "departure.nowSummary": "立即出發 · 優先使用即時到站",
    "journey.nextBus": "下一班 {time}",
    "journey.stops": "沿途 {count} 站",
    "journey.stopsHeading": "沿途站點",
    "journey.stopCount": "{count} 個停靠站",
    "journey.board": "上車",
    "journey.alight": "下車",
    "journey.to": "往{destination}",
    "journey.exitAlt": "出口",
    "journey.exitInstruction": "於 {exit} 出站",
    "journey.depart": "出發",
    "journey.now": "現在",
    "facility.address": "地址",
    "facility.serviceHours": "服務時間",
    "facility.openingHours": "開放時間",
    "facility.level": "樓層類別",
    "facility.location": "位置",
    "facility.countryPark": "郊野公園",
    "facility.equipment": "設備",
    "facility.source": "資料來源",
    "facility.dataDate": "資料日期",
    "facility.accessibleToilet": "無障礙廁所",
    "facility.universalToilet": "通用廁所",
    "facility.accessibilityRemark": "無障礙備註",
    "facility.noData": "未有資料",
    "facility.yes": "有",
    "facility.no": "沒有",
    "facility.viewSource": "查看來源",
    "facility.planHere": "規劃到這裡",
    "facility.planTo": "規劃前往{place}",
    "facility.installationLocation": "安裝位置",
    "facility.closedNote": "資料標示此設施暫停服務，請先查看來源備註。",
    "facility.emergencyNote": "緊急情況請先致電 999。",
    "facility.publicLavatory": "公廁",
    "facility.aquaPrivy": "旱廁",
    "facility.portableToilet": "長期流動廁所",
    "facility.countryParkToilet": "郊野公園廁所",
    "facility.mtrAccessibleToilet": "港鐵無障礙洗手間",
    "facility.breastfeedingFriendly": "母乳餵哺友善場所",
    "facility.nursingRoom": "育嬰或哺乳設施",
    "facility.roomCount": "{count} 間已收錄設施",
    "facility.coordinatePrecision": "位置精度",
    "facility.precisionVenue": "場所位置",
    "facility.precisionAddress": "地址位置",
    "facility.precisionStation": "車站位置",
    "facility.precisionTerminal": "客運區位置",
    "facility.precisionUnknown": "位置待核實",
    "walk.segmentOrdinal": "第{count}段步行",
    "walk.stairs": "{count} 段樓梯",
    "walk.stairsUnknown": "樓梯資料待確認",
    "walk.noKnownStairs": "已知路段未標示樓梯",
    "walk.connectedRamps": "使用 {count} 處已連接斜道",
    "walk.connectedLifts": "使用 {count} 處已連接升降機",
    "walk.nearbyRamps": "附近 {count} 處斜道標記",
    "walk.nearbyLifts": "附近 {count} 處升降機標記",
    "walk.footbridges": "附近 {count} 座行人天橋結構",
    "walk.possibleEntrances": "{count} 個可能入口待核實",
    "walk.slopes": "沿途有斜坡",
    "walk.crossings": "{count} 處過路位置",
    "walk.fallbackNote": "部分位置未能連上完整步行路網，距離按附近道路保守估算。",
    "walk.officialNote": "此段由地政總署 3D 行人路線搜尋服務計算。",
    "walk.networkNote": "此段按已載入的步行路網計算。",
    "walk.confidenceFallback": "可信度：估算路段，不能作為無障礙通行保證。",
    "walk.confidencePartial": "可信度：路網已連接，但部分通行資料待確認。",
    "walk.confidenceConnected": "可信度：路網與所列無障礙連接均有明確資料。",
    "walk.fromTo": "由「{from}」步行至「{to}」。",
    "walk.approxDuration": "{distance} · 約 {duration}",
    "routeData.walkFallback": "{count} 段步行未能連上完整步行路網，距離按附近道路保守估算。",
    "routeData.exitFallback": "目的站出口資料待補充；尾段由車站位置估算。",
    "service.extraUnavailable": "另有 {count} 條路線在該時段不提供。",
    "service.unavailable": "該時段未提供",
    "service.timetablePending": "班次資料待確認",
    "walk.unknownEntranceConnection": "入口與步行路網的實際連接",
    "walk.unknownStartConnection": "起點與步行路網之間的接入",
    "walk.unknownEndConnection": "終點與步行路網之間的接入",
    "walk.unknownSurface": "路面材質",
    "walk.unknownWidth": "通道闊度",
    "walk.unknownCurb": "路緣",
    "walk.unknownSlope": "斜坡的詳細坡度",
    "walk.unknownCrossingAssist": "過路處的有聲或觸覺輔助",
    "walk.unknownNote": "{details}資料待確認。",
    "status.routeShown": "已顯示{route}整條路線。",
    "status.selectedRoute": "所選路線",
    "status.segment": "{mode}：{from}至{to}。",
    "status.walkSegment": "步行路段",
    "status.journeySegment": "行程路段",
    "status.nextStop": "下一站",
    "journey.segmentAccessible": "第 {count} 段，{time}，{mode}，{title}",
    "journey.goTo": "前往{place}",
    "journey.stopsExpanded": "站點已展開",
    "journey.stopsCollapsed": "站點已收起",
    "journey.exitDataFallback": "出口資料待補充，尾段由車站位置估算",
    "journey.exitGrouped": "於 {exit} 出口一帶出站",
    "journey.exitSingle": "於 {exit} 出站",
    "mtrExit.groupSuffix": "出口一帶",
    "mtrExit.suffix": "出口",
    "mtrExit.station": "港鐵",
    "mtrExit.connected": "{features}空間資料已匹配；實際連接及運作狀態請出發前核對。",
    "mtrExit.nearby": "出口附近有{features}；連接關係待核實。",
    "mtrExit.unknown": "出口無障礙連接待核實。",
    "facility.routeNearbyHeading": "沿途母嬰設施",
    "facility.routeLoading": "正在載入已收錄設施...",
    "facility.routeRooms": "已收錄 {count} 間育嬰或哺乳設施",
    "facility.routeFriendly": "{count} 個母乳餵哺友善場所",
    "facility.routeNearby": "規劃的路線附近有{facts}。",
    "facility.routeNone": "規劃的路線附近未發現位置可靠的已收錄母嬰設施。",
    "facility.routeReliableOnly": "只顯示規劃路線附近且位置可靠的資料。",
    "facility.showMapPoints": "顯示地圖點",
    "facility.hideMapPoints": "隱藏地圖點"
  };

  const zhHans = Object.freeze({
    ...Object.fromEntries(Object.entries(zhHant).map(([key, value]) => [key, toSimplified(value)])),
    "settings.title": "设置",
    "settings.close": "关闭设置",
    "settings.language.title": "語言 / 语言 / Language",
    "settings.language.traditional": "繁體",
    "settings.language.simplified": "简体",
    "settings.language.english": "English",
    "aiStudioPromo.label": "Mapable AI Studio 推荐",
    "aiStudioPromo.open": "打开 Mapable AI Studio",
    "aiStudioPromo.close": "关闭 Mapable AI Studio 推荐",
    "aiStudioPromo.description": "以 Mapable HK 路线证据为基础的无障碍出行 AI 解说界面",
    "input.startPlaceholder": "你的位置或起点",
    "input.endPlaceholder": "想去哪里？",
    "departure.realtime": "实时班次与到站",
    "place.currentLocation": "我的位置",
    "mode.rail": "地铁",
    "mode.lightRail": "轻轨",
    "type.mtr": "地铁站",
    "type.light_rail": "轻轨站",
    "type.estate": "小区 / 屋村",
    "type.lift": "电梯",
    "type.ramp": "坡道"
  });

  const en = {
    "place.nearbyNamed": "Near {place}",
    "place.unknown": "Selected location",
    "journey.walkTo": "Walk to {destination}",
    "journey.walkMeta": "{distance}, about {duration}",
    "journey.arrivalPending": "Arrival time unavailable",
    "journey.waitApprox": "Wait about {duration}",
    "journey.rideApprox": "Ride about {duration}",
    "skip.results": "Skip to route results",
    "map.label": "Map",
    "map.appLabel": "Mapable HK map",
    "map.tools": "Map tools",
    "map.fitRoute": "Fit",
    "map.fitHongKong": "HK",
    "map.zoomIn": "Zoom in",
    "map.zoomOut": "Zoom out",
    "aiStudioPromo.label": "Mapable AI Studio promotion",
    "aiStudioPromo.open": "Open Mapable AI Studio",
    "aiStudioPromo.close": "Close Mapable AI Studio promotion",
    "aiStudioPromo.description": "Accessible AI journey explanations grounded in Mapable HK route evidence",
    "settings.title": "Settings",
    "settings.close": "Close settings",
    "settings.contrast.title": "High contrast",
    "settings.contrast.description": "Improve the visibility of text, controls, icons and routes.",
    "settings.language.title": "語言 / 语言 / Language",
    "settings.language.group": "Choose interface language",
    "settings.language.traditional": "繁體",
    "settings.language.simplified": "简体",
    "settings.language.english": "English",
    "settings.routeData": "Route data:",
    "source.landsPedestrian": "Lands Department 3D pedestrian routes",
    "source.csdiMtrExits": "CSDI MTR exits",
    "source.geoInfoRailEntrances": "GeoInfo Map railway entrances",
    "source.mtrOpenData": "MTR open data",
    "source.fehdToilets": "FEHD public toilets",
    "source.afcdToilets": "AFCD country park toilets",
    "source.fsdAed": "FSD CARE AED",
    "locate.title": "Locate current position",
    "locate.allow": "Allow location",
    "locate.retry": "Locate again",
    "facility.controls": "Map facility markers",
    "facility.babycare": "Baby care",
    "facility.publicToilet": "Public toilet",
    "facility.aed": "AED",
    "facility.enableBabycare": "Show baby care facility markers",
    "facility.enablePublicToilet": "Show public toilet markers",
    "facility.enableAed": "Show AED markers",
    "status.initial": "Choose a start and destination to see suggested routes.",
    "mapPick.confirm": "Confirm",
    "mapPick.cancel": "Cancel",
    "mapPick.cancelAria": "Cancel map selection",
    "mapInfo.label": "Map location details",
    "mapInfo.close": "Close location details",
    "location.loading": "Finding your location...",
    "location.popup": "Please allow location access in the browser prompt.",
    "location.wait": "Your location may take a few seconds to appear. If it takes too long, refresh the page.",
    "planner.label": "Route planner",
    "profiles.label": "Travel needs",
    "profiles.senior": "Senior",
    "profiles.wheelchair": "Wheelchair",
    "profiles.wheelchairAria": "Wheelchair user or person with limited mobility",
    "profiles.lowVision": "Low vision",
    "profiles.colorVision": "Colour vision",
    "profiles.colorVisionAria": "Colour vision mode",
    "profiles.stroller": "Stroller",
    "profiles.strollerAria": "Stroller user or carer",
    "profiles.standard": "Standard",
    "visual.label": "Colour vision display",
    "visual.choose": "Choose a colour vision display",
    "visual.redGreen": "Red-green",
    "visual.blueYellow": "Blue-yellow",
    "planner.collapse": "Collapse route planner",
    "planner.expand": "Expand route planner",
    "planner.handle": "Collapse route planner",
    "input.start": "Start",
    "input.startPlaceholder": "Your location or starting point",
    "input.clearStart": "Clear start",
    "input.end": "Destination",
    "input.endPlaceholder": "Where do you want to go?",
    "input.clearEnd": "Clear destination",
    "input.swap": "Swap start and destination",
    "departure.label": "Departure time",
    "departure.choose": "Choose departure time",
    "departure.now.first": "Leave",
    "departure.now.second": "now",
    "departure.planned.first": "Plan",
    "departure.planned.second": "time",
    "departure.all.first": "All",
    "departure.all.second": "routes",
    "departure.realtime": "Live departures and arrivals",
    "departure.unfiltered": "No departure-time filter",
    "departure.pickerPlaceholder": "Choose date and time",
    "departure.pickerAria": "Choose date and time",
    "departure.plannedAria": "Planned departure time: {value}",
    "departure.summaryNow": "Leave now",
    "results.expandMobile": "Expand route results",
    "results.suggestion": "Suggested",
    "results.unplanned": "No route planned",
    "results.pending": "Not selected",
    "results.expand": "Expand route results upward",
    "results.restore": "Restore route results height",
    "results.collapse": "Collapse route results",
    "results.options": "Route options",
    "results.walkSegments": "Walking sections",
    "summary.label": "Route summary",
    "summary.walkDistance": "Walking",
    "summary.estimatedTime": "Time",
    "summary.fare": "Fare",
    "journey.heading": "Route steps",
    "journey.empty": "Choose a route to see each part of the journey.",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.loading": "Loading",
    "common.pleaseWait": "Please wait",
    "common.minutes": "{count} m",
    "common.hoursMinutes": "{hours} h {minutes} m",
    "common.hours": "{hours} h",
    "common.meters": "{count} m",
    "common.kilometers": "{count} km",
    "common.hongKong": "Hong Kong",
    "mode.walk": "Walk",
    "mode.bus": "Bus",
    "mode.rail": "MTR",
    "mode.lightRail": "Light Rail",
    "mode.transfer": "Transfer",
    "mode.route": "Route",
    "place.currentLocation": "My location",
    "place.selectedNearby": "Selected map location",
    "place.start": "Start",
    "place.end": "Destination",
    "place.nextConnection": "Next connection",
    "type.airport": "Airport",
    "type.rail": "Rail station",
    "type.mtr": "MTR station",
    "type.light_rail": "Light Rail stop",
    "type.district": "District",
    "type.area": "Area",
    "type.estate": "Housing estate",
    "type.government": "Government service",
    "type.attraction": "Attraction",
    "type.toilet": "Accessible toilet",
    "type.bus": "Bus stop",
    "type.gmb": "Minibus stop",
    "type.custom": "Selected location",
    "type.hospital": "Hospital",
    "type.mall": "Shopping / retail",
    "type.poi": "Place",
    "type.address": "Address",
    "type.lift": "Lift",
    "type.ramp": "Ramp",
    "type.accessible": "Accessible facility",
    "search.useLocation": "Use my location",
    "search.pickMap": "Choose on map",
    "search.locationPermission": "Allow location services to read your current position",
    "search.searchingTitle": "Searching Hong Kong places",
    "search.searchingDescription": "This may take a little longer while more places are searched. Please wait.",
    "search.notFound": "No result for “{query}”",
    "search.pickAs": "Choose a point on the map and use it as the {kind}",
    "status.findingPlaces": "Finding places",
    "status.findingPlacesDescription": "Confirming the start and destination. Please wait.",
    "status.chooseMissing": "Choose the {missing} first, or select a point on the map.",
    "status.notFoundPick": "No result for “{query}”. Choose a map point as the {kind}.",
    "status.profileSelected": "{profile} travel needs selected. Comparing routes again.",
    "status.colorMode": "Switched to the {mode} display. Route ranking is unchanged.",
    "status.contrastOn": "High contrast is on.",
    "status.contrastOff": "High contrast is off.",
    "status.reselectStart": "Choose the start again, or use your location.",
    "mapPick.confirmStart": "Confirm",
    "mapPick.confirmEnd": "Confirm",
    "mapPick.prompt": "Choose the {kind} on the map, then confirm or cancel the selection.",
    "mapPick.selectedStatus": "“{place}” selected. Choose another point, confirm, or cancel.",
    "location.unsupported": "This browser does not provide location services. Choose a point on the map instead.",
    "location.reading": "Reading your current location.",
    "location.located": "Current location found.",
    "location.denied": "Allow location services, or choose a point on the map.",
    "location.unavailable": "Your location is not available yet. Retrying in the background; you can also select Locate again.",
    "location.gps": "GPS location",
    "location.gpsAccuracy": "GPS location, accurate to about {meters} m",
    "planning.status": "Planning walking, MTR and bus routes...",
    "planning.title": "Planning routes",
    "planning.description": "Preparing walking, MTR, Light Rail and bus options. This usually takes a few seconds.",
    "planning.longDescription": "Planning several route options. This may take a little longer.",
    "planning.stillStatus": "Still planning: waiting for live arrivals or route geometry...",
    "planning.stillTitle": "Still planning",
    "planning.stillDescription": "Waiting for live arrivals, fares or route geometry. Slow networks may take longer. Moving away or choosing another point cancels this request.",
    "planning.timeout": "Route planning timed out. Try again or choose a closer connection point.",
    "planning.failed": "Route planning failed: {message}",
    "planning.calculating": "Calculating",
    "planning.querying": "Checking",
    "planning.badge": "Planning",
    "results.noRoute": "No feasible route found",
    "results.disconnected": "Not connected",
    "results.noRouteStatus": "No feasible route found. Choose a nearby place or a point on the map.",
    "results.noRouteAnnouncement": "No feasible route found. Choose a nearby place or use map selection.",
    "results.farePending": "Fare unavailable",
    "results.comparable": "Available",
    "results.routeNumber": "Route {count}",
    "results.selected": "selected",
    "results.foundAnnouncement": "{count} routes found for {profile}. Selected {title}: {duration}, {distance} walking, {fare}.",
    "departure.allSummary": "All routes · no departure-time filter",
    "departure.plannedSummary": "Planned departure · {date}",
    "departure.nowSummary": "Leave now · live arrivals preferred",
    "journey.nextBus": "Next in {time}",
    "journey.stops": "{count} stops",
    "journey.stopsHeading": "Stops along the way",
    "journey.stopCount": "{count} calling stops",
    "journey.board": "Board",
    "journey.alight": "Alight",
    "journey.to": "To {destination}",
    "journey.exitAlt": "Exit",
    "journey.exitInstruction": "Leave by Exit {exit}",
    "journey.depart": "Depart",
    "journey.now": "Now",
    "facility.address": "Address",
    "facility.serviceHours": "Service hours",
    "facility.openingHours": "Opening hours",
    "facility.level": "Level",
    "facility.location": "Location",
    "facility.countryPark": "Country park",
    "facility.equipment": "Equipment",
    "facility.source": "Data source",
    "facility.dataDate": "Data date",
    "facility.accessibleToilet": "Accessible toilet",
    "facility.universalToilet": "Universal toilet",
    "facility.accessibilityRemark": "Accessibility notes",
    "facility.noData": "No data",
    "facility.yes": "Yes",
    "facility.no": "No",
    "facility.viewSource": "View source",
    "facility.planHere": "Plan route here",
    "facility.planTo": "Plan a route to {place}",
    "facility.installationLocation": "Installed at",
    "facility.closedNote": "The source lists this facility as temporarily closed. Check the source notes before travelling.",
    "facility.emergencyNote": "Call 999 first in an emergency.",
    "facility.publicLavatory": "Public toilet",
    "facility.aquaPrivy": "Aqua privy",
    "facility.portableToilet": "Long-term portable toilet",
    "facility.countryParkToilet": "Country park toilet",
    "facility.mtrAccessibleToilet": "MTR accessible toilet",
    "facility.breastfeedingFriendly": "Breastfeeding-friendly venue",
    "facility.nursingRoom": "Baby care or nursing facility",
    "facility.roomCount": "{count} listed facilities",
    "facility.coordinatePrecision": "Location accuracy",
    "facility.precisionVenue": "Venue location",
    "facility.precisionAddress": "Address location",
    "facility.precisionStation": "Station location",
    "facility.precisionTerminal": "Passenger terminal area",
    "facility.precisionUnknown": "Location needs checking",
    "walk.segmentOrdinal": "Walking section {count}",
    "walk.stairs": "{count} flights of stairs",
    "walk.stairsUnknown": "Stair data needs checking",
    "walk.noKnownStairs": "No stairs are marked on known sections",
    "walk.connectedRamps": "Uses {count} connected ramps",
    "walk.connectedLifts": "Uses {count} connected lifts",
    "walk.nearbyRamps": "{count} nearby ramp markers",
    "walk.nearbyLifts": "{count} nearby lift markers",
    "walk.footbridges": "{count} nearby footbridge structures",
    "walk.possibleEntrances": "{count} possible entrances need checking",
    "walk.slopes": "Slopes are present",
    "walk.crossings": "{count} road crossings",
    "walk.fallbackNote": "Some points could not connect to the complete walking network. Distance is conservatively estimated from nearby roads.",
    "walk.officialNote": "This section uses the Lands Department 3D Pedestrian Route Search service.",
    "walk.networkNote": "This section uses the loaded walking network.",
    "walk.confidenceFallback": "Confidence: estimated section; this does not guarantee accessible passage.",
    "walk.confidencePartial": "Confidence: connected to the network, but some passage data needs checking.",
    "walk.confidenceConnected": "Confidence: the network and listed accessible connections have explicit data.",
    "walk.fromTo": "Walk from “{from}” to “{to}”.",
    "walk.approxDuration": "{distance} · about {duration}",
    "routeData.walkFallback": "{count} walking sections could not connect to the complete walking network. Distance is conservatively estimated from nearby roads.",
    "routeData.exitFallback": "Destination exit data is incomplete; the final section is estimated from the station location.",
    "service.extraUnavailable": "{count} more routes do not operate at this time.",
    "service.unavailable": "Not operating at this time",
    "service.timetablePending": "Timetable data needs checking",
    "walk.unknownEntranceConnection": "the actual connection between the entrance and walking network",
    "walk.unknownStartConnection": "access from the start to the walking network",
    "walk.unknownEndConnection": "access from the walking network to the destination",
    "walk.unknownSurface": "surface material",
    "walk.unknownWidth": "path width",
    "walk.unknownCurb": "kerbs",
    "walk.unknownSlope": "detailed gradient",
    "walk.unknownCrossingAssist": "audible or tactile crossing aids",
    "walk.unknownNote": "Data needs checking for {details}.",
    "status.routeShown": "Showing the complete {route}.",
    "status.selectedRoute": "selected route",
    "status.segment": "{mode}: {from} to {to}.",
    "status.walkSegment": "Walking section",
    "status.journeySegment": "Journey section",
    "status.nextStop": "next stop",
    "journey.segmentAccessible": "Section {count}, {time}, {mode}, {title}",
    "journey.goTo": "towards {place}",
    "journey.stopsExpanded": "stops expanded",
    "journey.stopsCollapsed": "stops collapsed",
    "journey.exitDataFallback": "exit data is incomplete; the final section is estimated from the station location",
    "journey.exitGrouped": "leave near Exits {exit}",
    "journey.exitSingle": "leave by Exit {exit}",
    "mtrExit.groupSuffix": "exit area",
    "mtrExit.suffix": "exit",
    "mtrExit.station": "MTR",
    "mtrExit.connected": "Spatial data matches {features}; check the actual connection and operating status before travelling.",
    "mtrExit.nearby": "{features} near the exit; the connection needs checking.",
    "mtrExit.unknown": "The accessible connection at this exit needs checking.",
    "facility.routeNearbyHeading": "Baby care along the route",
    "facility.routeLoading": "Loading listed facilities...",
    "facility.routeRooms": "{count} listed baby care or nursing facilities",
    "facility.routeFriendly": "{count} breastfeeding-friendly venues",
    "facility.routeNearby": "Near the planned route: {facts}.",
    "facility.routeNone": "No listed baby care facilities with reliable locations were found near the planned route.",
    "facility.routeReliableOnly": "Only reliable location data near the planned route is shown.",
    "facility.showMapPoints": "Show on map",
    "facility.hideMapPoints": "Hide map points"
  };

  const dictionaries = Object.freeze({ "zh-Hant": Object.freeze(zhHant), "zh-Hans": zhHans, en: Object.freeze(en) });
  let currentLanguage = readStoredLanguage();

  function normalizeLanguage(language) {
    if (LANGUAGES.includes(language)) return language;
    const normalized = String(language || "").toLowerCase();
    if (normalized.startsWith("zh-hans") || normalized.startsWith("zh-cn") || normalized.startsWith("zh-sg")) return "zh-Hans";
    if (normalized.startsWith("en")) return "en";
    return DEFAULT_LANGUAGE;
  }

  function readStoredLanguage() {
    try {
      return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    } catch (_error) {
      return DEFAULT_LANGUAGE;
    }
  }

  function getLanguage() {
    return currentLanguage;
  }

  function t(key, params = {}) {
    const dictionary = dictionaries[currentLanguage] || zhHant;
    const template = dictionary[key] ?? zhHant[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? ""));
  }

  function applyDocument(root = document) {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dataset.language = currentLanguage;
    root.querySelectorAll?.("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll?.("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    root.querySelectorAll?.("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    root.querySelectorAll?.("[data-i18n-title]").forEach((element) => {
      element.setAttribute("title", t(element.dataset.i18nTitle));
    });
    root.querySelectorAll?.("[data-language]").forEach((button) => {
      const active = button.dataset.language === currentLanguage;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setLanguage(language, options = {}) {
    const nextLanguage = normalizeLanguage(language);
    const changed = nextLanguage !== currentLanguage;
    currentLanguage = nextLanguage;
    try {
      localStorage.setItem(STORAGE_KEY, currentLanguage);
    } catch (_error) {
      // The interface still switches when storage is unavailable.
    }
    applyDocument(options.root || document);
    if (changed && options.dispatch !== false) {
      document.dispatchEvent(new CustomEvent("mapable:languagechange", { detail: { language: currentLanguage } }));
    }
    return currentLanguage;
  }

  function locale() {
    if (currentLanguage === "en") return "en-HK";
    if (currentLanguage === "zh-Hans") return "zh-CN";
    return "zh-HK";
  }

  function datepickerLocale() {
    if (currentLanguage === "en") {
      return {
        days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        daysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        today: "Today", clear: "Clear", dateFormat: "yyyy-MM-dd", timeFormat: "HH:mm", firstDay: 0
      };
    }
    const shortPrefix = currentLanguage === "zh-Hans" ? "周" : "週";
    return {
      days: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
      daysShort: ["日", "一", "二", "三", "四", "五", "六"].map((day) => shortPrefix + day),
      daysMin: ["日", "一", "二", "三", "四", "五", "六"],
      months: Array.from({ length: 12 }, (_value, index) => `${index + 1}月`),
      monthsShort: Array.from({ length: 12 }, (_value, index) => `${index + 1}月`),
      today: currentLanguage === "zh-Hans" ? "今天" : "今日",
      clear: "清除", dateFormat: "yyyy-MM-dd", timeFormat: "HH:mm", firstDay: 0
    };
  }

  function englishAlias(place, field = "name") {
    const directKeys = field === "address"
      ? ["addressEn", "addressEN", "address_en", "englishAddress"]
      : ["nameEn", "nameEN", "name_en", "englishName"];
    for (const key of directKeys) {
      if (place?.[key]) return String(place[key]).trim();
    }
    if (field === "address") return "";
    return (place?.aliases || [])
      .map((alias) => String(alias || "").trim())
      .filter((alias) => alias && /^[\x00-\x7F]+$/.test(alias) && !/^[A-Z0-9-]{2,6}$/.test(alias))
      .sort((a, b) => Number(/\b(?:station|airport|hospital|mall|estate)\b/i.test(b)) - Number(/\b(?:station|airport|hospital|mall|estate)\b/i.test(a)) || a.length - b.length)[0] || "";
  }

  function placeName(place) {
    const source = String(place?.name || place?.label || "");
    if (currentLanguage === "en") return englishAlias(place, "name") || source;
    return currentLanguage === "zh-Hans" ? toSimplified(source) : source;
  }

  function placeAddress(place) {
    const source = String(place?.address || "");
    if (currentLanguage === "en") return englishAlias(place, "address") || t(`type.${place?.type || "poi"}`);
    return currentLanguage === "zh-Hans" ? toSimplified(source) : source;
  }

  function dataText(value) {
    const source = String(value || "");
    if (currentLanguage === "zh-Hans") return toSimplified(source);
    if (currentLanguage !== "en") return source;
   const exact = {
      "\\u6a5f\\u5834\\u5feb\\u7dda": "Airport Express",
      "\\u8fea\\u58eb\\u5c3c\\u7dda": "Disneyland Resort Line",
      "\\u6771\\u9435\\u7dda": "East Rail Line",
      "\\u6e2f\\u5cf6\\u7dda": "Island Line",
      "\\u89c0\\u5858\\u7dda": "Kwun Tong Line",
      "\\u5357\\u6e2f\\u5cf6\\u7dda": "South Island Line",
      "\\u6771\\u6d8c\\u7dda": "Tung Chung Line",
      "\\u5c07\\u8ecd\\u6fb3\\u7dda": "Tseung Kwan O Line",
      "\\u5c6f\\u99ac\\u7dda": "Tuen Ma Line",
      "\\u8343\\u7063\\u7dda": "Tsuen Wan Line",
      "可行步行": "Feasible walk",
      "建議步行": "Suggested walk",
      "步行備選": "Alternative walk",
      "輕鐵接駁": "Light Rail connection",
      "輕鐵 + 港鐵": "Light Rail + MTR",
      "港鐵 + 輕鐵": "MTR + Light Rail",
      "巴士轉乘": "Bus transfer",
      "較合適步行": "More suitable walk",
      "最短路線": "Shortest route",
      "出行需要優先": "Travel needs prioritised",
      "距離優先": "Distance prioritised",
      "用時最短": "Fastest",
      "步行最短": "Least walking",
      "車費最低": "Lowest fare",
      "步行": "Walk",
      "巴士": "Bus",
      "港鐵": "MTR",
      "輕鐵": "Light Rail",
      "接駁": "Transfer",
      "較低風險": "Lower risk",
      "較穩定": "More reliable",
      "可行": "Feasible",
      "偏長": "Longer walk",
      "不宜步行": "Walking not advised",
      "可比較": "Available",
      "待核實": "Check details",
      "車費待查": "Fare unavailable",
      "樂悠咭車費待查": "JoyYou Card fare unavailable",
      "沒有營運班次": "No operating service",
      "該日期沒有服務": "No service on this date",
      "班次已結束": "Service has ended",
      "尚未開始服務": "Service has not started",
      "該時段沒有服務": "No service at this time",
      "班次資料待確認": "Timetable data needs checking",
      "即時到站": "Live arrival",
      "預定班次": "Scheduled service",
      "未能讀取巴士即時到站，候車按本地班次": "Live bus arrival unavailable; using scheduled service for wait",
      "未能讀取巴士即時到站，候車按估算": "Live bus arrival unavailable; using an estimated wait",
      "未能讀取港鐵即時到站，候車按本地班次": "Live MTR arrival unavailable; using scheduled service for wait",
      "未能讀取港鐵即時到站，候車按估算": "Live MTR arrival unavailable; using an estimated wait",
      "未能讀取輕鐵即時到站，候車先按約 5 分鐘估算": "Live Light Rail arrival unavailable; using an estimated five-minute wait"
    };
    if (exact[source]) return exact[source];
    const routeNumber = source.match(/^路線([一二三四五六七八九十]+)$/u);
    if (routeNumber) {
      const chineseNumbers = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
      return `Route ${chineseNumbers[routeNumber[1]] || routeNumber[1]}`;
    }
   return source
      .replace(/\u6a5f\u5834\u5feb\u7dda/g, "Airport Express")
      .replace(/\u8fea\u58eb\u5c3c\u7dda/g, "Disneyland Resort Line")
      .replace(/\u6771\u9435\u7dda/g, "East Rail Line")
      .replace(/\u6e2f\u5cf6\u7dda/g, "Island Line")
      .replace(/\u89c0\u5858\u7dda/g, "Kwun Tong Line")
      .replace(/\u5357\u6e2f\u5cf6\u7dda/g, "South Island Line")
      .replace(/\u6771\u6d8c\u7dda/g, "Tung Chung Line")
      .replace(/\u5c07\u8ecd\u6fb3\u7dda/g, "Tseung Kwan O Line")
      .replace(/\u5c6f\u99ac\u7dda/g, "Tuen Ma Line")
      .replace(/\u8343\u7063\u7dda/g, "Tsuen Wan Line")
      .replace(/機場快綫/g, "Airport Express")
      .replace(/迪士尼綫/g, "Disneyland Resort Line")
      .replace(/東鐵綫/g, "East Rail Line")
      .replace(/港島綫/g, "Island Line")
      .replace(/觀塘綫/g, "Kwun Tong Line")
      .replace(/南港島綫/g, "South Island Line")
      .replace(/東涌綫/g, "Tung Chung Line")
      .replace(/將軍澳綫/g, "Tseung Kwan O Line")
      .replace(/屯馬綫/g, "Tuen Ma Line")
      .replace(/荃灣綫/g, "Tsuen Wan Line")
      .replace(/樂悠咭（60\+）/g, "JoyYou Card (60+)")
      .replace(/長者八達通/g, "Senior Octopus")
      .replace(/成人八達通/g, "Adult Octopus")
      .replace(/色弱模式/g, "Colour vision mode")
      .replace(/路線排序沿用一般模式/g, "Route ranking follows standard mode")
      .replace(/不會把所有燈控過路處一律視為不便/g, "not every signalised crossing is treated as inconvenient")
      .replace(/可選紅綠色覺或藍黃色覺顯示/g, "Choose red-green or blue-yellow display")
      .replace(/高對比顯示在設定中獨立控制/g, "High contrast is controlled separately in Settings")
      .replace(/地圖路線同時使用文字、描邊和線型區分/g, "Map routes also use text, outlines and line patterns")
      .replace(/輪椅路線/g, "Wheelchair route")
      .replace(/此選擇只列作待核實路線，暫不標示為全程無障礙/g, "This route is listed for checking and is not marked fully accessible")
      .replace(/已知步行路段未發現樓梯/g, "No stairs found on known walking sections")
      .replace(/入口、路面、通道闊度或路緣資料未完整，實際通行情況待確認/g, "Entrance, surface, path-width or kerb data is incomplete; actual passage needs checking")
      .replace(/未確認為路線實際使用的連接/g, "not confirmed as a connection used by the route")
      .replace(/視障路線/g, "Low-vision route")
      .replace(/相比一般路線減少\s*(\d+)\s*個已知複雜過路處/g, "Compared with standard routes, avoids $1 known complex crossings")
      .replace(/優先避開複雜過路、頻繁轉乘和通行資料不完整的路段/g, "Prioritises avoiding complex crossings, frequent transfers and sections with incomplete access data")
      .replace(/此路線的過路輔助設施及部分步行連接資料待確認/g, "Crossing aids and some walking connections on this route need checking")
      .replace(/長者路線/g, "Senior route")
      .replace(/嬰兒車路線/g, "Stroller route")
      .replace(/相比一般路線避開\s*(\d+)\s*處已知樓梯/g, "Compared with standard routes, avoids $1 known stair locations")
      .replace(/優先避開樓梯、較陡斜坡、過長連續步行和頻繁轉乘/g, "Prioritises avoiding stairs, steep slopes, long continuous walks and frequent transfers")
      .replace(/有\s*(\d+)\s*段已標示斜坡，建議慢行/g, "$1 marked slope sections are present; walk slowly")
      .replace(/有步行通行資料待確認，暫不作無障礙保證/g, "Some walking access data needs checking; accessibility is not guaranteed")
      .replace(/使用\s*(\d+)\s*處升降機/g, "Uses $1 lifts")
      .replace(/使用\s*(\d+)\s*處斜道/g, "Uses $1 ramps")
      .replace(/附近有\s*(\d+)\s*處升降機標記/g, "$1 nearby lift markers")
      .replace(/附近有\s*(\d+)\s*處斜道標記/g, "$1 nearby ramp markers")
      .replace(/使用\s*(\d+)\s*處已連接斜道/g, "Uses $1 connected ramps")
      .replace(/使用\s*(\d+)\s*處已連接升降機/g, "Uses $1 connected lifts")
      .replace(/附近有\s*(\d+)\s*座行人天橋結構/g, "$1 nearby footbridge structures")
      .replace(/(\d+)\s*段樓梯/g, "$1 flights of stairs")
      .replace(/沿途有斜坡/g, "Slopes are present")
      .replace(/部分路段為保守估算/g, "Some sections are conservatively estimated")
      .replace(/^約\s*/u, "Approx. ")
      .replace(/不建議/g, "Not suggested")
      .replace(/建議/g, "Suggested ")
      .replace(/龍運巴士/g, "Long Win Bus")
      .replace(/龍運/g, "Long Win")
      .replace(/新大嶼山巴士/g, "New Lantao Bus")
      .replace(/城巴/g, "Citybus")
      .replace(/九巴/g, "KMB")
      .replace(/嶼巴/g, "New Lantao Bus")
      .replace(/港鐵巴士/g, "MTR Bus")
      .replace(/港鐵/g, "MTR")
      .replace(/輕鐵/g, "Light Rail")
      .replace(/巴士/g, "Bus")
      .replace(/步行/g, "Walk")
      .replace(/接駁/g, "Transfer")
      .replace(/^往\s*/u, "To ")
      .replace(/路線/g, "route")
      .replace(/車費/g, "Fare")
      .replace(/長者/g, "Senior")
      .replace(/輪椅/g, "Wheelchair")
      .replace(/嬰兒車/g, "Stroller")
      .replace(/；/g, "; ")
      .replace(/，/g, ", ")
      .replace(/：/g, ": ")
      .replace(/。/g, ".");
  }

  function transitStopName(name, nameEn = "") {
    const source = String(name || "").trim();
    const english = String(nameEn || "").trim();
    if (currentLanguage === "en" && english) return english;
    return dataText(source);
  }

  applyDocument(document);

  window.MapableI18n = Object.freeze({
    languages: LANGUAGES,
    dictionaries,
    getLanguage,
    setLanguage,
    t,
    applyDocument,
    locale,
    datepickerLocale,
    toSimplified,
    placeName,
    placeAddress,
    dataText,
    transitStopName
  });
})();
