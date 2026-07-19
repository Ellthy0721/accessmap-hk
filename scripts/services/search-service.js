(function () {
  "use strict";

  const TYPE_PRIORITY = {
    airport: 120,
    rail: 112,
    mtr: 110,
    light_rail: 106,
    district: 96,
    area: 92,
    bus: 86,
    gmb: 82,
    government: 80,
    hospital: 78,
    estate: 76,
    attraction: 74,
    mall: 70,
    toilet: 68,
    lift: 66,
    ramp: 64,
    accessible: 62,
    address: 58,
    poi: 56,
    custom: 20
  };
  const HK_VIEWBOX = "113.80,22.57,114.45,22.13";
  const HK_BBOX_OVERPASS = "22.13,113.80,22.57,114.45";
  const MIN_REMOTE_INTERVAL_MS = 900;
  const NEARBY_AREA_TYPES = new Set(["area", "district"]);
  const NEARBY_LANDMARK_TYPES = new Set(["light_rail", "mtr", "rail", "estate", "attraction", "mall", "government", "hospital", "poi", "airport"]);
  const SIMPLIFIED_TO_TRADITIONAL = Object.freeze({
    门: "門", 厅: "廳", 湾: "灣", 围: "圍", 钟: "鐘", 龙: "龍", 医: "醫", 广: "廣", 场: "場",
    厕: "廁", 厦: "廈", 楼: "樓", 华: "華", 园: "園", 东: "東", 观: "觀", 马: "馬", 头: "頭",
    将: "將", 军: "軍", 黄: "黃", 铁: "鐵", 线: "線", 长: "長", 车: "車", 县: "縣", 区: "區",
    办: "辦", 处: "處", 务: "務", 厂: "廠", 庙: "廟", 乐: "樂", 义: "義", 总: "總", 宝: "寶",
    丽: "麗", 会: "會", 馆: "館", 湿: "濕", 凤: "鳳", 丰: "豐", 岛: "島", 国: "國", 际: "際",
    机: "機", 儿: "兒", 双: "雙", 号: "號", 后: "後", 台: "臺", 学: "學", 环: "環", 坚: "堅",
    兴: "興", 铜: "銅", 锣: "鑼", 调: "調", 岭: "嶺", 钻: "鑽", 鲗: "鰂", 鱼: "魚", 览: "覽",
    恒: "恆", 显: "顯", 径: "徑", 红: "紅", 启: "啟", 锦: "錦", 蓝: "藍", 罗: "羅", 运: "運",
    营: "營", 窝: "窩", 乌: "烏", 万: "萬", 乡: "鄉", 历: "歷", 术: "術", 艺: "藝", 体: "體",
    验: "驗", 产: "產", 业: "業", 贸: "貿", 财: "財", 税: "稅", 卫: "衛",
    境: "境", 资: "資", 讯: "訊", 邮: "郵", 电: "電", 发: "發", 达: "達", 实: "實", 优: "優",
    势: "勢", 复: "復", 杂: "雜", 码: "碼", 证: "證", 书: "書"
  });
  const TRADITIONAL_TO_SIMPLIFIED = Object.freeze(Object.fromEntries(
    Object.entries(SIMPLIFIED_TO_TRADITIONAL).map(([simplified, traditional]) => [traditional, simplified])
  ));
  let lastRemoteAt = 0;

  function createSearchService(seedPlaces, indexPlaces) {
    const remoteCache = new Map();
    const remoteInflight = new Map();
    let entries = dedupePlaces([...(seedPlaces || []), ...(indexPlaces || [])]);
    let prepared = prepare(entries);
    let lookup = buildLookup(prepared);
    const seenKeys = new Set(entries.flatMap(placeKeys));

    async function search(query, options = {}) {
      const normalizedQuery = normalize(query);
      if (!normalizedQuery) return [];
      const limit = options.limit || 8;
      const local = searchLocal(query, { limit });
      if (local.length >= Math.min(5, limit) || normalizedQuery.length < 2) return local.slice(0, limit);
      return searchRemoteAndUpdate(query, { limit, cache: remoteCache });
    }

    function searchLocal(query, options = {}) {
      const normalizedQuery = normalize(query);
      if (!normalizedQuery) return [];
      const limit = options.limit || 8;
      return candidatePlaces(prepared, lookup, normalizedQuery)
        .map((place) => ({ place, score: scorePlace(place, normalizedQuery) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "zh-Hant"))
        .slice(0, limit)
        .map((item) => ({ ...item.place, confidence: item.score }));
    }

    async function searchRemoteAndUpdate(query, options = {}) {
      const normalizedQuery = normalize(query);
      if (!normalizedQuery || normalizedQuery.length < 2) return searchLocal(query, options);
      const inflightKey = `${normalizedQuery}|${Math.max(options.limit || 8, 12)}`;
      let remotePromise = remoteInflight.get(inflightKey);
      if (!remotePromise) {
        remotePromise = searchRemote(query, {
          limit: Math.max(options.limit || 8, 12),
          cache: options.cache || remoteCache,
          totalBudgetMs: options.totalBudgetMs || 4200
        }).finally(() => remoteInflight.delete(inflightKey));
        remoteInflight.set(inflightKey, remotePromise);
      }
      const remote = await remotePromise;
      if (remote.length) appendEntries(remote);
      return searchLocal(query, { limit: options.limit || 8 });
    }

    function hasExactLocalMatch(query) {
      const normalizedQuery = normalize(query);
      return Boolean(normalizedQuery && lookup.exact.has(normalizedQuery));
    }

    function findById(id) {
      return prepared.find((place) => place.id === id) || null;
    }

    function all() {
      return [...prepared];
    }

    function nearbyPlace(lat, lng) {
      const pointLat = Number(lat);
      const pointLng = Number(lng);
      if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) return null;
      let area = null;
      let landmark = null;
      let areaDistance = Infinity;
      let landmarkDistance = Infinity;
      prepared.forEach((place) => {
        const distance = distanceMeters(pointLat, pointLng, place.lat, place.lng);
        if (NEARBY_AREA_TYPES.has(place.type) && distance < areaDistance) {
          area = place;
          areaDistance = distance;
        }
        if (NEARBY_LANDMARK_TYPES.has(place.type) && distance < landmarkDistance) {
          landmark = place;
          landmarkDistance = distance;
        }
      });
      const areaName = areaDistance <= 10000 ? nearbyNamePart(area?.name) : "";
      const landmarkName = landmarkDistance <= 1800 ? nearbyNamePart(landmark?.name) : "";
      const parts = [];
      if (areaName) parts.push(areaName);
      if (landmarkName && !parts.some((part) => part === landmarkName || part.includes(landmarkName) || landmarkName.includes(part))) parts.push(landmarkName);
      return {
        name: parts.length ? `${parts.join("")}附近地點` : "所選位置附近地點",
        area: areaName,
        landmark: landmarkName,
        areaDistance,
        landmarkDistance
      };
    }

    function add(place) {
      appendEntries([place]);
    }

    function appendEntries(places) {
      places.forEach((place) => {
        const clean = cleanPlace(place);
        if (!clean) return;
        const keys = placeKeys(clean);
        if (keys.some((key) => seenKeys.has(key))) return;
        keys.forEach((key) => seenKeys.add(key));
        entries.push(clean);
        const preparedPlace = prepare([clean])[0];
        const index = prepared.length;
        prepared.push(preparedPlace);
        indexPlaceInLookup(lookup, preparedPlace, index);
      });
    }

    return { search, searchLocal, searchRemoteAndUpdate, hasExactLocalMatch, findById, nearbyPlace, all, add };
  }

  function nearbyNamePart(value) {
    let name = toTraditional(String(value || ""))
      .replace(/\s*[（(][^（）()]*[）)]\s*/g, "")
      .replace(/[A-Za-z][A-Za-z0-9\s'&.,/-]*/g, "")
      .trim();
    name = name.replace(/(?:公共運輸交匯處|巴士總站|輕鐵站|港鐵站|巴士站|總站|車站|站|屋苑|邨)$/u, "").trim();
    return name;
  }

  function distanceMeters(latA, lngA, latB, lngB) {
    const radians = Math.PI / 180;
    const lat1 = latA * radians;
    const lat2 = latB * radians;
    const deltaLat = (latB - latA) * radians;
    const deltaLng = (lngB - lngA) * radians;
    const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  async function searchRemote(query, options = {}) {
    const cache = options.cache || new Map();
    const variants = queryVariants(query).slice(0, 2);
    const results = [];
    const startedAt = Date.now();
    const totalBudgetMs = options.totalBudgetMs || 4200;
    for (const variant of variants) {
      const remainingMs = totalBudgetMs - (Date.now() - startedAt);
      if (remainingMs < 500) break;
      const cacheKey = normalize(variant);
      if (cache.has(cacheKey)) {
        results.push(...cache.get(cacheKey));
        continue;
      }
      await waitForRemoteSlot();
      const sourceTimeoutMs = Math.max(500, Math.min(3000, totalBudgetMs - (Date.now() - startedAt)));
      const remote = await fetchCombinedRemote(variant, options.limit || 8, sourceTimeoutMs);
      cache.set(cacheKey, remote);
      results.push(...remote);
      if (results.length >= (options.limit || 8)) break;
    }
    return dedupePlaces(results).slice(0, options.limit || 8);
  }

  async function waitForRemoteSlot() {
    const elapsed = Date.now() - lastRemoteAt;
    if (elapsed < MIN_REMOTE_INTERVAL_MS) await delay(MIN_REMOTE_INTERVAL_MS - elapsed);
    lastRemoteAt = Date.now();
  }

  async function fetchCombinedRemote(query, limit, timeoutMs) {
    const tasks = [
      fetchEsri(query, limit, timeoutMs),
      fetchNominatim(query, Math.max(4, limit), timeoutMs)
    ];
    const settled = await Promise.allSettled(tasks);
    const merged = [];
    settled.forEach((item) => {
      if (item.status === "fulfilled") merged.push(...item.value);
    });
    return dedupePlaces(merged).slice(0, limit);
  }

  async function fetchPhoton(query, limit) {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", withHongKongContext(query));
    url.searchParams.set("limit", String(Math.min(12, Math.max(1, limit))));
    url.searchParams.set("lang", /[a-z]/i.test(query) ? "en" : "zh");
    url.searchParams.set("bbox", "113.80,22.13,114.45,22.57");
    try {
      const data = await fetchJson(url.toString(), { cache: "force-cache" }, 9000);
      return Array.isArray(data.features) ? data.features.map(photonToPlace).filter(Boolean) : [];
    } catch (error) {
      console.warn("Photon geocoder unavailable", error);
      return [];
    }
  }

  function photonToPlace(feature) {
    const coords = feature?.geometry?.coordinates || [];
    const props = feature?.properties || {};
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const name = props.name || props.street || props.city || props.district;
    if (!name) return null;
    const address = [props.name, props.street, props.district, props.city, props.country].filter(Boolean).join(", ");
    return {
      id: `remote:photon:${props.osm_type || "place"}:${props.osm_id || `${lat.toFixed(5)},${lng.toFixed(5)}`}`,
      name,
      type: photonType(props),
      address: address || "香港",
      lat,
      lng,
      aliases: [props.name, props.street, props.district, props.city, props.country].filter(Boolean),
      source: "OpenStreetMap Photon",
      confidence: 60
    };
  }

  function photonType(props) {
    const type = `${props.osm_key || ""} ${props.osm_value || ""}`;
    if (/aeroway|airport/i.test(type)) return "airport";
    if (/railway|station/i.test(type)) return "rail";
    if (/government|public/i.test(type)) return "government";
    if (/hospital|clinic/i.test(type)) return "hospital";
    if (/mall|retail|shop|commercial/i.test(type)) return "mall";
    if (/tourism|attraction|museum|theme_park|viewpoint/i.test(type)) return "attraction";
    if (/house|building|highway|street|residential/i.test(type)) return "address";
    return "poi";
  }

  async function fetchEsri(query, limit, timeoutMs = 9000) {
    const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
    url.searchParams.set("f", "json");
    url.searchParams.set("singleLine", /[a-z]/i.test(query) ? withEnglishHongKongContext(query) : withHongKongContext(query));
    url.searchParams.set("sourceCountry", "HKG");
    url.searchParams.set("maxLocations", String(Math.min(12, Math.max(1, limit))));
    url.searchParams.set("outFields", "PlaceName,Place_addr,Addr_type,Type,Score");
    url.searchParams.set("searchExtent", "113.80,22.13,114.45,22.57");
    url.searchParams.set("langCode", /[a-z]/i.test(query) ? "en" : "zh-HK");
    try {
      const data = await fetchJson(url.toString(), { cache: "force-cache" }, timeoutMs);
      return Array.isArray(data.candidates) ? data.candidates.map(esriToPlace).filter(Boolean) : [];
    } catch (error) {
      console.warn("ArcGIS geocoder unavailable", error);
      return [];
    }
  }

  function esriToPlace(candidate) {
    const attrs = candidate.attributes || {};
    const lng = Number(candidate.location?.x);
    const lat = Number(candidate.location?.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const name = attrs.PlaceName || firstDisplayName(candidate.address) || candidate.address;
    if (!name) return null;
    return {
      id: `remote:esri:${lat.toFixed(5)},${lng.toFixed(5)}:${normalize(name)}`,
      name,
      type: esriType(attrs),
      address: attrs.Place_addr || candidate.address || "香港",
      lat,
      lng,
      aliases: [candidate.address, attrs.PlaceName, attrs.Place_addr, attrs.Type].filter(Boolean),
      source: "ArcGIS World Geocode",
      confidence: Math.round(Number(attrs.Score) || Number(candidate.score) || 55)
    };
  }

  function esriType(attrs) {
    const type = `${attrs.Addr_type || ""} ${attrs.Type || ""}`;
    if (/airport/i.test(type)) return "airport";
    if (/metro|rail|station/i.test(type)) return "rail";
    if (/government|public/i.test(type)) return "government";
    if (/hospital|clinic/i.test(type)) return "hospital";
    if (/shop|mall|shopping|retail/i.test(type)) return "mall";
    if (/tourist|attraction|museum|park/i.test(type)) return "attraction";
    if (/pointaddress|streetaddress|street|address/i.test(type)) return "address";
    return "poi";
  }

  async function fetchNominatim(query, limit, timeoutMs = 10000) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", withHongKongContext(query));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("namedetails", "1");
    url.searchParams.set("limit", String(Math.min(10, Math.max(1, limit))));
    url.searchParams.set("countrycodes", "hk");
    url.searchParams.set("accept-language", "zh-Hant,en,zh-Hans");
    url.searchParams.set("viewbox", HK_VIEWBOX);
    url.searchParams.set("bounded", "1");
    try {
      const data = await fetchJson(url.toString(), { cache: "force-cache" }, timeoutMs);
      return Array.isArray(data) ? data.map(nominatimToPlace).filter(Boolean) : [];
    } catch (error) {
      console.warn("Nominatim geocoder unavailable", error);
      return [];
    }
  }

  function nominatimToPlace(item) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const named = item.namedetails || {};
    const address = item.address || {};
    const name = named["name:zh-Hant"] || named["name:zh"] || named.name || item.name || address.building || address.amenity || address.road || firstDisplayName(item.display_name);
    if (!name) return null;
    return {
      id: `remote:nominatim:${item.osm_type || "place"}:${item.osm_id || item.place_id}`,
      name,
      type: osmType(item.category || item.class, item.type || item.addresstype),
      address: item.display_name || "香港",
      lat,
      lng,
      aliases: [named["name:en"], named["name:zh-Hans"], named["name:zh-Hant"], item.display_name].filter(Boolean),
      source: "OpenStreetMap Nominatim",
      confidence: Math.round((Number(item.importance) || 0.1) * 100) + 48
    };
  }

  async function fetchOverpass(query, limit) {
    const q = String(query || "").trim();
    if (q.length < 2 || q.length > 36) return [];
    const pattern = escapeOverpassRegex(q);
    const dataQuery = `[out:json][timeout:8];(node["name"~"${pattern}",i](${HK_BBOX_OVERPASS});way["name"~"${pattern}",i](${HK_BBOX_OVERPASS});relation["name"~"${pattern}",i](${HK_BBOX_OVERPASS}););out center tags ${Math.min(20, limit * 2)};`;
    const url = new URL("https://overpass-api.de/api/interpreter");
    url.searchParams.set("data", dataQuery);
    try {
      const data = await fetchJson(url.toString(), { cache: "force-cache" }, 11000);
      return Array.isArray(data.elements) ? data.elements.map(overpassToPlace).filter(Boolean).slice(0, limit) : [];
    } catch (error) {
      console.warn("Overpass search unavailable", error);
      return [];
    }
  }

  function overpassToPlace(element) {
    const tags = element.tags || {};
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    const name = tags["name:zh"] || tags["name:zh-Hant"] || tags.name || tags["name:en"];
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const address = [tags["addr:housename"], tags["addr:housenumber"], tags["addr:street"], tags["addr:district"], tags["addr:city"]].filter(Boolean).join(" ");
    return {
      id: `remote:overpass:${element.type}:${element.id}`,
      name,
      type: osmType(osmCategoryFromTags(tags), tags.amenity || tags.shop || tags.tourism || tags.office || tags.building || tags.railway),
      address: address || tags["name:en"] || "香港",
      lat,
      lng,
      aliases: [tags["name:en"], tags["name:zh-Hans"], tags["name:zh-Hant"], tags.brand, tags.operator].filter(Boolean),
      source: "OpenStreetMap Overpass",
      confidence: 64
    };
  }

  function osmCategoryFromTags(tags) {
    if (tags.shop) return "shop";
    if (tags.tourism) return "tourism";
    if (tags.office || tags.government) return "office";
    if (tags.amenity) return "amenity";
    if (tags.railway) return "railway";
    if (tags.building) return "building";
    return "poi";
  }

  function osmType(category, type) {
    const value = `${category || ""} ${type || ""}`;
    if (/aeroway|airport/i.test(value)) return "airport";
    if (/railway|station|halt|subway/i.test(value)) return "rail";
    if (/government|public|office/i.test(value)) return "government";
    if (/hospital|clinic|doctors/i.test(value)) return "hospital";
    if (/shop|mall|retail|commercial|supermarket|convenience|restaurant|cafe|bank/i.test(value)) return "mall";
    if (/tourism|attraction|museum|theme_park|viewpoint|park/i.test(value)) return "attraction";
    if (/house|building|residential|road|street|quarter|neighbourhood/i.test(value)) return "address";
    return "poi";
  }

  async function loadIndex(url) {
    try {
      const data = await fetchJson(url, { cache: "default" }, 20000);
      return Array.isArray(data) ? data.map(cleanPlace).filter(Boolean) : [];
    } catch (error) {
      console.warn("Search index unavailable", error);
      return [];
    }
  }

  function prepare(entries) {
    return entries.map((place) => ({
      ...place,
      searchText: labelsFor(place).map(normalize).join(" "),
      normalizedName: normalize(place.name),
      normalizedAddress: normalize(place.address),
      normalizedAliases: (place.aliases || []).map(normalize),
      normalizedLabels: Array.from(new Set(labelsFor(place).map(normalize).filter(Boolean)))
    }));
  }

  function buildLookup(prepared) {
    const lookup = { exact: new Map(), prefix: new Map(), gram: new Map(), char: new Map() };
    prepared.forEach((place, index) => indexPlaceInLookup(lookup, place, index));
    return lookup;
  }

  function indexPlaceInLookup(lookup, place, index) {
    place.normalizedLabels.forEach((label) => {
      addLookupValue(lookup.exact, label, index);
      const prefixLength = Math.min(label.length, 18);
      for (let length = 1; length <= prefixLength; length += 1) addLookupValue(lookup.prefix, label.slice(0, length), index);
      uniquePieces(label, 2).forEach((gram) => addLookupValue(lookup.gram, gram, index));
      Array.from(new Set(label)).forEach((char) => addLookupValue(lookup.char, char, index));
    });
  }

  function addLookupValue(map, key, index) {
    if (!key) return;
    const values = map.get(key);
    if (values) values.push(index);
    else map.set(key, [index]);
  }

  function uniquePieces(value, size) {
    const pieces = new Set();
    for (let index = 0; index <= value.length - size; index += 1) pieces.add(value.slice(index, index + size));
    return pieces;
  }

  function candidatePlaces(prepared, lookup, query) {
    const ranks = new Map();
    const addCandidates = (indices, weight) => {
      (indices || []).forEach((index) => ranks.set(index, (ranks.get(index) || 0) + weight));
    };
    addCandidates(lookup.exact.get(query), 1000);
    addCandidates(lookup.prefix.get(query), 600);
    uniquePieces(query, 2).forEach((gram) => addCandidates(lookup.gram.get(gram), 12));
    Array.from(new Set(query)).forEach((char) => addCandidates(lookup.char.get(char), 1));
    if (!ranks.size) return [];
    return [...ranks.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 500)
      .map(([index]) => prepared[index]);
  }

  function cleanPlace(place) {
    if (!place || !place.id || !place.name) return null;
    const lat = Number(place.lat);
    const lng = Number(place.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      id: String(place.id),
      name: String(place.name),
      type: place.type || "poi",
      address: place.address || "",
      lat,
      lng,
      aliases: Array.isArray(place.aliases) ? place.aliases.filter(Boolean).map(String) : [],
      source: place.source || "",
      confidence: Number(place.confidence) || undefined
    };
  }

  function dedupePlaces(places) {
    const seen = new Set();
    const output = [];
    places.forEach((place) => {
      const clean = cleanPlace(place);
      if (!clean) return;
      const keys = placeKeys(clean);
      if (keys.some((key) => seen.has(key))) return;
      keys.forEach((key) => seen.add(key));
      output.push(clean);
    });
    return output;
  }

  function placeKeys(place) {
    const name = normalize(place.name);
    const address = normalize(place.address);
    return [
      place.id,
      `${place.type}|${name}|${place.lat.toFixed(5)}|${place.lng.toFixed(5)}`,
      `${place.type}|${name}|${Math.round(place.lat * 1000)}|${Math.round(place.lng * 1000)}`,
      address ? `${place.type}|${name}|${address}` : ""
    ].filter(Boolean);
  }

  function scorePlace(place, query) {
    let score = 0;
    const q = normalize(query);
    if (place.normalizedName === q) score = 240;
    else if (place.normalizedName.startsWith(q)) score = 200;
    else if (place.normalizedName.includes(q)) score = 165;
    else if (q.includes(place.normalizedName) && place.normalizedName.length >= 2) score = 150;

    if (place.normalizedAddress.includes(q)) score = Math.max(score, 110);

    place.normalizedAliases.forEach((alias) => {
      if (!alias) return;
      if (alias === q) score = Math.max(score, 220);
      else if (alias.startsWith(q)) score = Math.max(score, 175);
      else if (alias.includes(q) || q.includes(alias)) score = Math.max(score, 130);
      else if (score < 110) {
        const similarity = stringSimilarity(alias, q);
        if (similarity >= 0.72) score = Math.max(score, 102);
        else if (similarity >= 0.62 && q.length >= 4) score = Math.max(score, 74);
      }
    });

    if (!score && place.searchText.includes(q)) score = 88;
    if (!score && fuzzyIncludes(place.searchText, q)) score = 62;
    if (!score) {
      const similarity = stringSimilarity(place.normalizedName, q);
      if (similarity >= 0.72 || (q.length >= 3 && similarity >= 0.66)) score = 82;
      else if (similarity >= 0.62 && q.length >= 4) score = 58;
    }
    if (!score) return 0;
    return score + (TYPE_PRIORITY[place.type] || 50) + (place.confidence || 0) / 5;
  }

  function queryVariants(query) {
    const raw = String(query || "").trim();
    const traditional = toTraditional(raw);
    const simplified = toSimplified(raw);
    const variants = [raw, traditional, simplified, `${raw} 香港`, `${traditional} 香港`, `${raw} Hong Kong`, `${simplified} 香港`]
      .map((item) => item.trim())
      .filter(Boolean);
    return [...new Set(variants.map((item) => item.replace(/\s+/g, " ")))].slice(0, 5);
  }

  function withHongKongContext(query) {
    return /香港|hong\s*kong|hk/i.test(query) ? query : `${query}, 香港`;
  }

  function withEnglishHongKongContext(query) {
    return /香港|hong\s*kong|hk/i.test(query) ? query : `${query}, Hong Kong`;
  }

  function toTraditional(value) {
    return replaceChars(value, SIMPLIFIED_TO_TRADITIONAL);
  }

  function toSimplified(value) {
    return replaceChars(value, TRADITIONAL_TO_SIMPLIFIED);
  }

  function replaceChars(value, map) {
    return String(value || "").split("").map((char) => map[char] || char).join("");
  }

  function labelsFor(place) {
    return [place.name, place.address, ...(place.aliases || [])].filter(Boolean);
  }

  function normalize(value) {
    return toTraditional(String(value || ""))
      .trim()
      .toLowerCase()
      .replace(/[\s,，。？.、\\/()（）\[\]【】'"`·:：;；\-–—_]+/g, "")
      .replace(/臺/g, "台")
      .replace(/[裏裡]/g, "里")
      .replace(/茘/g, "荔")
      .replace(/亁/g, "乾");
  }

  function fuzzyIncludes(text, query) {
    if (query.length < 2) return false;
    let cursor = 0;
    for (const char of query) {
      cursor = text.indexOf(char, cursor);
      if (cursor === -1) return false;
      cursor += 1;
    }
    return true;
  }

  function stringSimilarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const distance = levenshtein(a, b);
    return 1 - distance / Math.max(a.length, b.length);
  }

  function levenshtein(a, b) {
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let last = i - 1;
      previous[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const old = previous[j];
        previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
        last = old;
      }
    }
    return previous[b.length];
  }

  async function fetchJson(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function escapeOverpassRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function firstDisplayName(displayName) {
    return String(displayName || "").split(",")[0].trim();
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    })[char]);
  }

  window.MapableSearchService = { createSearchService, loadIndex, escapeHtml };
})();
