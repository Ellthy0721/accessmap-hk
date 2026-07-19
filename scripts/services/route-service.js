(function () {
  "use strict";

  const COLORS = {
    walk: "#1d9bf0",
    walkAlt: "#0f766e",
    lightRail: "#b08a00"
  };

  const MTR_LINE_COLORS = {
    AEL: "#00888a",
    DRL: "#f550a6",
    EAL: "#5eb6e4",
    ISL: "#0071ce",
    KTL: "#00a040",
    SIL: "#b5bd00",
    TCL: "#f7941d",
    TKL: "#7d499d",
    TML: "#9a3b26",
    TWL: "#e2231a"
  };

  const PROVIDERS = {
    LWB: { label: "\u9f8d\u904b", color: "#f58220" },
    KMB: { label: "九巴", color: "#d71920" },
    CTB: { label: "城巴", color: "#f2c300" },
    NLB: { label: "嶼巴", color: "#00843d" },
    MTRB: { label: "港鐵巴士", color: "#e2231a" }
  };

  const JOY_YOU_BUS_PROVIDERS = new Set(["KMB", "LWB", "CTB", "NLB"]);

  const WALK_SPEED = 55;
  const BUS_SPEED = 320;
  const LIGHT_RAIL_SPEED = 230;
  const MAX_WALK_TILE_DISTANCE = 5200;
  const MAX_BUS_ACCESS = 950;
  const MAX_BUS_EGRESS = 950;
  const MAX_BUS_TRANSFER_WALK = 220;
  const MAX_MIXED_TRANSFER_WALK = 350;
  const MAX_MIXED_BUS_ENDPOINTS = 32;
  const MAX_MIXED_DESCRIPTORS = 36;
  const MAX_MIXED_OPTIONS_PER_DIRECTION = 3;
  const BUS_TRANSFER_GRID_SIZE = 0.002;
  const MAX_RAIL_ACCESS = 1200;
  const MAX_TRANSIT_ACCESS = 1600;
  const MAX_MTR_STATIONS = 6;
  const MAX_MTR_EGRESS_EXITS = 3;
  const MAX_LR_STOPS = 6;
  const ROUTE_PROCESS_CONCURRENCY = 4;
  const FETCH_TIMEOUT_MS = 6000;
  const ETA_FETCH_TIMEOUT_MS = 3200;
  const ETA_CACHE_SUCCESS_TTL_MS = 15000;
  const ETA_CACHE_FAILURE_TTL_MS = 5000;
  const ROAD_GEOMETRY_TIMEOUT_MS = 3500;
  const OFFICIAL_PEDESTRIAN_ROUTE_TIMEOUT_MS = 6000;
  const MAX_OFFICIAL_PEDESTRIAN_ROUTE_CACHE = 48;
  const MAX_WALK_SNAP_DISTANCE = 260;
  const MAX_WALK_ACCESS_CANDIDATES = 36;
  const MAX_WALK_EDGE_SPATIAL_CACHES = 4;
  const TRUSTED_MAP_ACCESS_DISTANCE = 35;
  const TRUSTED_GPS_ACCESS_DISTANCE = 45;
  const SAME_TRANSIT_PLACE_DISTANCE = 35;
  const WALK_GRID_SIZE = 0.002;
  const ACCESSIBILITY_GRID_SIZE = 0.002;
  const PUBLIC_STRUCTURE_GRID_SIZE = 0.005;
  const SHARED_ROUTE_STOP_TOLERANCE = 180;
  const SHARED_ROUTE_ENDPOINT_TOLERANCE = 350;
  const SHARED_ROUTE_MIN_OVERLAP = 0.8;
  const TD_PATTERN_STOP_TOLERANCE = 260;
  const TD_PATTERN_NEARBY_STOP_TOLERANCE = 90;
  const TD_PATTERN_MIN_STOP_COVERAGE = 0.75;
  const walkingGraphCache = new WeakMap();
  const walkingSpatialCache = new WeakMap();
  const walkingEdgeSpatialCache = new Map();
  const walkingComponentCache = new WeakMap();

  const lrHeavyRailInterchanges = {
    TIS: "TIS",
    YUL: "YUL",
    TUM: "TUM",
    SIH: "SIH"
  };

  function create() {
    const state = {
      routeIndex: null,
      mtr: null,
      mtrExits: null,
      kmb: null,
      citybus: null,
      nlb: null,
      mtrBus: null,
      lightRail: null,
      fares: null,
      tdBus: null,
      railGeometry: null,
      walkingAccessibility: null,
      accessibilityPoints: [],
      accessibilityGrid: new Map(),
      publicWalkingStructures: null,
      publicStructures: [],
      publicStructureGrid: new Map(),
      routeShapeManifest: null,
      mtrGraph: new Map(),
      mtrStations: new Map(),
      mtrExitsByStation: new Map(),
      mtrExitWalkCache: new Map(),
      officialPedestrianRouteCache: new Map(),
      lightRailGraph: new Map(),
      lightRailStops: new Map(),
      busPatterns: [],
      busStopGrid: new Map(),
      tdBusRoutes: new Map(),
      etaCache: new Map(),
      roadGeometryCache: new Map(),
      railGeometryCache: new Map(),
      railGeometryGraph: new Map(),
      railGeometryNodes: new Map(),
      railGeometryGraphs: new Map(),
      routeShapeBuckets: new Map(),
      routeShapeDecoded: new Map(),
      lastBusDiagnostics: null,
      lastBusTransferDiagnostics: null,
      lastMtrExitDiagnostics: null,
      loaded: false
    };

    async function init() {
      if (state.loaded) return;
      const mtrExitRequest = typeof window.MapableRouteData.loadMtrExits === "function"
        ? window.MapableRouteData.loadMtrExits()
        : Promise.resolve(null);
      const [mtr, mtrExits, kmb, citybus, nlb, mtrBus, lightRail, fares, tdBus, railGeometry, walkingAccessibility, publicWalkingStructures, routeShapeManifest] = await Promise.allSettled([
        window.MapableRouteData.loadMtr(),
        mtrExitRequest,
        window.MapableRouteData.loadKmb(),
        window.MapableRouteData.loadCitybus(),
        window.MapableRouteData.loadNlb(),
        window.MapableRouteData.loadMtrBus(),
        window.MapableRouteData.loadLightRail(),
        window.MapableRouteData.loadFares(),
        window.MapableRouteData.loadTdBus(),
        window.MapableRouteData.loadRailGeometry(),
        window.MapableRouteData.loadWalkingAccessibility(),
        window.MapableRouteData.loadPublicWalkingStructures(),
        window.MapableRouteData.loadRouteShapeManifest()
      ]);
      state.routeIndex = null;
      state.mtr = valueOf(mtr);
      state.mtrExits = valueOf(mtrExits);
      state.kmb = valueOf(kmb);
      state.citybus = valueOf(citybus);
      state.nlb = valueOf(nlb);
      state.mtrBus = valueOf(mtrBus);
      state.lightRail = valueOf(lightRail);
      state.fares = valueOf(fares);
      state.tdBus = valueOf(tdBus);
      state.railGeometry = valueOf(railGeometry);
      state.walkingAccessibility = valueOf(walkingAccessibility);
      state.publicWalkingStructures = valueOf(publicWalkingStructures);
      state.routeShapeManifest = valueOf(routeShapeManifest);
      buildMtrState();
      buildMtrExitState();
      buildLightRailState();
      buildTdBusState();
      buildRailGeometryState();
      buildWalkingAccessibilityState();
      buildPublicWalkingStructureState();
      buildBusState();
      state.loaded = true;
    }

    async function plan(start, end, profileKey, planOptions = {}) {
      const diagnostics = planOptions.diagnostics ? { stages: [], counts: {} } : null;
      const ensureCurrent = () => {
        if (typeof planOptions.isCurrent !== "function" || planOptions.isCurrent()) return;
        const error = new Error("Route planning superseded");
        error.name = "AbortError";
        throw error;
      };
      let stageStarted = highResolutionNow();
      const markStage = (label) => {
        if (!diagnostics) return;
        const finished = highResolutionNow();
        diagnostics.stages.push({ label, elapsedMs: Number((finished - stageStarted).toFixed(1)) });
        stageStarted = finished;
      };
      await init();
      ensureCurrent();
      markStage("init");
      state.lastMtrExitDiagnostics = {
        stationsWithExits: state.mtrExitsByStation.size,
        shortlistedExitCount: 0,
        routedExitCount: 0,
        fallbackExitCount: 0,
        selectedConfidence: ""
      };
      const profile = window.MapableProfileService.resolve(profileKey);
      const standardProfile = window.MapableProfileService.resolve("standard");
      const departureDate = normalizeDepartureDate(planOptions.departureTime);
      const departureMode = ["planned", "all"].includes(planOptions.departureMode) ? planOptions.departureMode : "now";
      const useLiveEta = departureMode === "now" && Math.abs(departureDate.getTime() - Date.now()) <= 10 * 60000;
      const direct = haversine(start, end);
      const routeOptions = [];

      if (direct <= Math.max(MAX_WALK_TILE_DISTANCE, standardProfile.maxWalk * 2.1)) {
        routeOptions.push(...await planWalking(start, end, profileKey, profile, direct));
      }
      ensureCurrent();
      markStage("walking-candidates");

      routeOptions.push(...planMtr(start, end, profile));
      markStage("mtr-candidates");
      routeOptions.push(...planLightRail(start, end, profile));
      markStage("light-rail-candidates");
      routeOptions.push(...planLightRailMtr(start, end, profile));
      markStage("light-rail-mtr-candidates");
      routeOptions.push(...planMtrLightRail(start, end, profile));
      markStage("mtr-light-rail-candidates");
      routeOptions.push(...planBus(start, end, profile, departureDate, departureMode === "all", Boolean(diagnostics)));
      if (diagnostics) diagnostics.bus = state.lastBusDiagnostics;
      ensureCurrent();
      markStage("bus-candidates");
      routeOptions.push(...planMixedTransit(start, end, profile, departureDate, departureMode === "all"));
      ensureCurrent();
      markStage("mixed-transit-candidates");

      const availability = routeOptions.map((option) => ({
        option,
        status: departureMode === "all" ? { available: true, ignoredSchedule: true } : transitOptionAvailability(option, departureDate)
      }));
      const availableOptions = availability.filter((item) => item.status.available).map((item) => item.option);
      const unavailableRoutes = summarizeUnavailableRoutes(availability.filter((item) => !item.status.available));
      const candidatePool = selectCandidatePool(availableOptions, profile);
      if (diagnostics) {
        diagnostics.counts.generated = routeOptions.length;
        diagnostics.counts.available = availableOptions.length;
        diagnostics.counts.initialPool = candidatePool.length;
      }
      const enhanced = (await mapLimit(candidatePool, ROUTE_PROCESS_CONCURRENCY, async (option) => {
        const walked = await enhanceWalkingConnectors(option, profile);
        const operated = walked ? applyEstimatedTransitOperations(walked, departureDate, useLiveEta, departureMode === "all") : null;
        const shaped = operated ? await refineTransitGeometry(operated) : null;
        const enriched = shaped ? finalizeOption(shaped) : null;
        return enriched && enriched.geometry && enriched.geometry.length >= 2 ? enriched : null;
      })).filter(Boolean);
      ensureCurrent();
      markStage("initial-refinement");

      let realistic = selectComparisonPool(enhanced
        .filter(dedupeBySignature())
        .sort((a, b) => compareOptions(a, b, profile)), profile, standardProfile);

      realistic = (await mapLimit(realistic, 2, (option) => enhanceWalkingConnectors(option, profile, true))).filter(Boolean);
      ensureCurrent();
      realistic = selectComparisonPool(realistic.sort((a, b) => compareOptions(a, b, profile)), profile, standardProfile);
      if (diagnostics) {
        diagnostics.counts.enhanced = enhanced.length;
        diagnostics.counts.comparisonPool = realistic.length;
        diagnostics.mtrExits = { ...state.lastMtrExitDiagnostics };
      }
      markStage("final-walking-refinement");

      realistic = (await Promise.all(realistic.map(async (option) => {
        await enrichTransitOperations(option, useLiveEta);
        return finalizeOption(option);
      }))).filter(Boolean);
      ensureCurrent();
      markStage("eta-and-finalize");
      const comparisonPool = realistic.filter(Boolean);
      const standardBaseline = [...comparisonPool].sort((a, b) => compareOptions(a, b, standardProfile))[0] || null;
      const constrained = applyProfileConstraints(comparisonPool, profileKey);
      realistic = selectFinalOptions(constrained.options.sort((a, b) => compareOptions(a, b, profile)), profile);
      annotateOptions(realistic, profile);
      realistic.forEach((option) => {
        option.profileExplanation = window.MapableProfileService.explain(option, standardBaseline, profileKey);
      });
      return {
        options: realistic,
        unavailableRoutes,
        profile: { ...window.MapableProfileService.selection(profileKey), label: profile.label },
        profileNotice: constrained.notice,
        baseline: standardBaseline ? { id: standardBaseline.id, label: standardBaseline.label } : null,
        departure: {
          mode: departureMode,
          iso: departureDate.toISOString(),
          liveEta: useLiveEta
        },
        dataStatus: {
          walking: Boolean(state.routeIndex),
          mtr: Boolean(state.mtr),
          mtrExits: Boolean(state.mtrExitsByStation.size),
          kmb: Boolean(state.kmb),
          citybus: Boolean(state.citybus),
          nlb: Boolean(state.nlb),
          mtrBus: Boolean(state.mtrBus),
          lightRail: Boolean(state.lightRail),
          fares: Boolean(state.fares),
          tdBus: Boolean(state.tdBus),
          railGeometry: Boolean(state.railGeometry),
          walkingAccessibility: Boolean(state.accessibilityPoints.length),
          publicWalkingStructures: Boolean(state.publicStructures.length),
          routeShapes: Boolean(state.routeShapeManifest),
          serviceSchedules: Boolean(state.routeShapeManifest?.routeSchedules)
        },
        ...(diagnostics ? { diagnostics } : {})
      };
    }

    function selectCandidatePool(options, profile) {
      const compare = (a, b) => compareOptions(a, b, profile);
      return options.filter(Boolean).sort(compare);
    }

    function selectFinalOptions(options, profile) {
      const compare = (a, b) => compareOptions(a, b, profile);
      return options.filter(Boolean).sort(compare).slice(0, 6);
    }

    function selectComparisonPool(options, profile, standardProfile) {
      const selected = [];
      const seen = new Set();
      const add = (option) => {
        if (!option || seen.has(option.id)) return;
        seen.add(option.id);
        selected.push(option);
      };
      [...options].sort((a, b) => compareOptions(a, b, profile)).slice(0, 10).forEach(add);
      [...options].sort((a, b) => compareOptions(a, b, standardProfile)).slice(0, 10).forEach(add);
      return selected;
    }

    function applyProfileConstraints(options, profileKey) {
      const evaluated = options.map((option) => ({ option, result: window.MapableProfileService.hardConstraintStatus(option, profileKey) }));
      const eligible = evaluated.filter((item) => item.result.status === "eligible").map((item) => item.option);
      const pending = evaluated.filter((item) => item.result.status === "pending").map((item) => ({ ...item.option, verificationRequired: true }));
      if (eligible.length) return { options: eligible, notice: "" };
      if (pending.length) {
        return {
          options: pending,
          notice: profileKey === "wheelchair" ? "未找到可確認全程無樓梯的路線；規劃的路線仍有關鍵通行資料待核實。" : ""
        };
      }
      return {
        options: [],
        notice: profileKey === "wheelchair" ? "未找到符合已知無樓梯硬約束的路線。" : ""
      };
    }

    function normalizeDepartureDate(value) {
      const date = value instanceof Date ? new Date(value.getTime()) : value ? new Date(value) : new Date();
      return Number.isFinite(date.getTime()) ? date : new Date();
    }

    function valueOf(settled) {
      return settled.status === "fulfilled" ? settled.value : null;
    }

    function buildMtrState() {
      state.mtrStations = new Map((state.mtr?.stations || []).map((station) => [station.code, station]));
      state.mtrGraph = new Map();
      (state.mtr?.edges || []).forEach((edge) => {
        addGraphEntry(state.mtrGraph, edge.from, edge.to, { ...edge, routeKey: edge.line, minutes: edge.minutes || 2 });
        addGraphEntry(state.mtrGraph, edge.to, edge.from, { ...edge, from: edge.to, to: edge.from, routeKey: edge.line, minutes: edge.minutes || 2 });
      });
    }

    function buildLightRailState() {
      state.lightRailStops = new Map((state.lightRail?.stops || []).map((stop) => [stop.code, stop]));
      state.lightRailGraph = new Map();
      (state.lightRail?.patterns || []).forEach((pattern) => {
        const stops = (pattern.stopIds || pattern.stopCodes || []).map((code) => state.lightRailStops.get(code)).filter(Boolean);
        for (let index = 1; index < stops.length; index += 1) {
          const from = stops[index - 1];
          const to = stops[index];
          const distance = haversine(from, to);
          addGraphEntry(state.lightRailGraph, from.code, to.code, {
            from: from.code,
            to: to.code,
            route: pattern.route,
            routeKey: pattern.route,
            distance,
            minutes: Math.max(1.4, distance / LIGHT_RAIL_SPEED + 0.55)
          });
        }
      });
    }

    function buildTdBusState() {
      state.tdBusRoutes = new Map();
      Object.entries(state.tdBus?.routes || {}).forEach(([key, routes]) => {
        const list = Array.isArray(routes) ? routes : [];
        const normalizedKey = key.split(":");
        const provider = tdProvider(normalizedKey[0]);
        const route = normalizeRouteNo(normalizedKey.slice(1).join(":"));
        const mapKey = `${provider}:${route}`;
        if (!state.tdBusRoutes.has(mapKey)) state.tdBusRoutes.set(mapKey, []);
        state.tdBusRoutes.get(mapKey).push(...list.map((routeData) => ({ ...routeData, provider, route: normalizeRouteNo(routeData.route || route) })));
      });
    }

    function buildRailGeometryState() {
      state.railGeometryGraph = new Map();
      state.railGeometryNodes = new Map();
      state.railGeometryGraphs = new Map();
      (state.railGeometry?.lines || []).forEach((line) => {
        const points = compactGeometry(line.points || []);
        const tags = railGeometryTags(line);
        for (let index = 1; index < points.length; index += 1) {
          const fromPoint = points[index - 1];
          const toPoint = points[index];
          const from = pointKey(fromPoint);
          const to = pointKey(toPoint);
          const distance = haversine(pointPlace(fromPoint), pointPlace(toPoint));
          const edge = { routeKey: line.id || line.name || "rail", points: [fromPoint, toPoint], distance, minutes: distance / 280 };
          addRailGeometryEdge(state.railGeometryGraph, state.railGeometryNodes, from, to, edge, fromPoint, toPoint);
          addRailGeometryEdge(state.railGeometryGraph, state.railGeometryNodes, to, from, { ...edge, points: [toPoint, fromPoint] }, toPoint, fromPoint);
          tags.forEach((tag) => {
            const bucket = railGeometryBucket(tag);
            addRailGeometryEdge(bucket.graph, bucket.nodes, from, to, edge, fromPoint, toPoint);
            addRailGeometryEdge(bucket.graph, bucket.nodes, to, from, { ...edge, points: [toPoint, fromPoint] }, toPoint, fromPoint);
          });
        }
      });
    }

    function railGeometryBucket(tag) {
      if (!state.railGeometryGraphs.has(tag)) state.railGeometryGraphs.set(tag, { graph: new Map(), nodes: new Map() });
      return state.railGeometryGraphs.get(tag);
    }

    function addRailGeometryEdge(graph, nodes, from, to, edge, fromPoint, toPoint) {
      nodes.set(from, fromPoint);
      nodes.set(to, toPoint);
      addGraphEntry(graph, from, to, edge);
    }

    function railGeometryTags(line) {
      const text = `${line.name || ""} ${line.railway || ""}`.toLowerCase();
      const tags = new Set();
      if (/tuen ma|屯馬|屯马/.test(text)) tags.add("TML");
      if (/east rail|東鐵|东铁/.test(text)) tags.add("EAL");
      if (/airport express|機場快|机场快/.test(text)) tags.add("AEL");
      if (/tung chung|東涌|东涌/.test(text)) tags.add("TCL");
      if (/tsuen wan|荃灣|荃湾/.test(text)) tags.add("TWL");
      if (/kwun tong|觀塘|观塘/.test(text)) tags.add("KTL");
      if (/island line|港島|港岛/.test(text)) tags.add("ISL");
      if (/south island|南港島|南港岛/.test(text)) tags.add("SIL");
      if (/tseung kwan o|將軍澳|将军澳/.test(text)) tags.add("TKL");
      if (/disneyland|迪士尼/.test(text)) tags.add("DRL");
      if (/light rail|輕鐵|轻铁|lrt/.test(text)) tags.add("LRT");
      return [...tags];
    }

    function buildWalkingAccessibilityState() {
      const data = state.walkingAccessibility || {};
      state.accessibilityPoints = (data.points || []).map((point) => ({
        id: `${point[0]}:${point[4]}:${point[5]}`,
        type: point[0] === "l" ? "lift" : "ramp",
        scope: point[1] === "g" ? "ground" : "indoor",
        lat: Number(point[2]),
        lng: Number(point[3]),
        name: data.names?.[point[4]] || "",
        address: data.addresses?.[point[5]] || ""
      })).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
      state.accessibilityGrid = new Map();
      state.accessibilityPoints.forEach((point) => {
        const key = accessibilityGridKey(point.lat, point.lng);
        if (!state.accessibilityGrid.has(key)) state.accessibilityGrid.set(key, []);
        state.accessibilityGrid.get(key).push(point);
      });
    }

    function buildMtrExitState() {
      state.mtrExitsByStation = new Map();
      Object.entries(state.mtrExits?.stations || {}).forEach(([stationCode, exits]) => {
        if (!state.mtrStations.has(stationCode) || !Array.isArray(exits)) return;
        const normalized = exits.map((exit) => ({
          ...exit,
          stationCode,
          lat: Number(exit.lat),
          lng: Number(exit.lng)
        })).filter((exit) => Number.isFinite(exit.lat) && Number.isFinite(exit.lng) && exit.displayLabel);
        if (normalized.length) state.mtrExitsByStation.set(stationCode, normalized);
      });
    }

    function buildPublicWalkingStructureState() {
      const data = state.publicWalkingStructures || {};
      state.publicStructures = (data.structures || []).map((structure) => ({
        id: String(structure[0] || ""),
        center: { lat: Number(structure[1]), lng: Number(structure[2]) },
        bbox: [Number(structure[3]), Number(structure[4]), Number(structure[5]), Number(structure[6])]
      })).filter((structure) => structure.id && structure.bbox.every(Number.isFinite));
      state.publicStructureGrid = new Map();
      state.publicStructures.forEach((structure) => {
        const minLatCell = Math.floor(structure.bbox[1] / PUBLIC_STRUCTURE_GRID_SIZE);
        const maxLatCell = Math.floor(structure.bbox[3] / PUBLIC_STRUCTURE_GRID_SIZE);
        const minLngCell = Math.floor(structure.bbox[0] / PUBLIC_STRUCTURE_GRID_SIZE);
        const maxLngCell = Math.floor(structure.bbox[2] / PUBLIC_STRUCTURE_GRID_SIZE);
        for (let latCell = minLatCell; latCell <= maxLatCell; latCell += 1) {
          for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell += 1) {
            const key = `${latCell}:${lngCell}`;
            if (!state.publicStructureGrid.has(key)) state.publicStructureGrid.set(key, []);
            state.publicStructureGrid.get(key).push(structure);
          }
        }
      });
    }

    function buildBusState() {
      const kmbStops = new Map((state.kmb?.stops || []).map((stop) => [stop.id, stop]));
      const citybusStops = new Map((state.citybus?.stops || []).map((stop) => [stop.id, stop]));
      const nlbStops = new Map((state.nlb?.stops || []).map((stop) => [stop.id, stop]));
      const mtrBusStops = new Map((state.mtrBus?.stops || []).map((stop) => [stop.id, stop]));
      const patterns = [
        ...normalizeBusPatterns(state.kmb?.patterns || [], kmbStops, "KMB"),
        ...normalizeBusPatterns(state.citybus?.patterns || [], citybusStops, "CTB"),
        ...normalizeBusPatterns(state.nlb?.patterns || [], nlbStops, "NLB"),
        ...normalizeBusPatterns(state.mtrBus?.patterns || [], mtrBusStops, "MTRB")
      ];
      markSharedOperatorRoutes(patterns);
      state.busPatterns = patterns;
      buildBusStopGrid(patterns);
    }

    function buildBusStopGrid(patterns) {
      state.busStopGrid = new Map();
      patterns.forEach((pattern) => {
        pattern.stops.forEach((stop, index) => {
          const key = busTransferGridKey(stop);
          if (!state.busStopGrid.has(key)) state.busStopGrid.set(key, []);
          state.busStopGrid.get(key).push({ pattern, stop, index });
        });
      });
    }

    function markSharedOperatorRoutes(patterns) {
      const kmbByRoute = new Map();
      patterns.filter((pattern) => pattern.provider === "KMB").forEach((pattern) => {
        const route = normalizeRouteNo(pattern.route);
        if (!kmbByRoute.has(route)) kmbByRoute.set(route, []);
        kmbByRoute.get(route).push(pattern);
      });
      patterns.filter((pattern) => pattern.provider === "CTB").forEach((pattern) => {
        const route = normalizeRouteNo(pattern.route);
        const needsShapeAlias = !state.routeShapeManifest?.routes?.[`CTB:${route}`] && Boolean(state.routeShapeManifest?.routes?.[`KMB:${route}`]);
        const needsScheduleAlias = !routeScheduleHasUsableWindow(`CTB:${route}`) && routeScheduleHasUsableWindow(`KMB:${route}`);
        if (!needsShapeAlias && !needsScheduleAlias) return;
        const sharedOverlap = (kmbByRoute.get(route) || [])
          .reduce((best, candidate) => Math.max(best, sharedBusPatternOverlap(pattern, candidate)), 0);
        if (sharedOverlap < SHARED_ROUTE_MIN_OVERLAP) return;
        pattern.sharedRouteOverlap = sharedOverlap;
        if (needsShapeAlias) pattern.shapeProviderAlias = "KMB";
        if (needsScheduleAlias) pattern.scheduleProviderAlias = "KMB";
      });
    }

    function sharedBusPatternOverlap(first, second) {
      const firstStops = first.stops || [];
      const secondStops = second.stops || [];
      if (firstStops.length < 2 || secondStops.length < 2) return 0;
      const endpointsMatch = haversine(firstStops[0], secondStops[0]) <= SHARED_ROUTE_ENDPOINT_TOLERANCE
        && haversine(firstStops[firstStops.length - 1], secondStops[secondStops.length - 1]) <= SHARED_ROUTE_ENDPOINT_TOLERANCE;
      if (!endpointsMatch) return 0;
      return Math.min(
        busStopSequenceCoverage(firstStops, secondStops),
        busStopSequenceCoverage(secondStops, firstStops)
      );
    }

    function busStopSequenceCoverage(source, target) {
      if (!source.length || !target.length) return 0;
      const matched = source.filter((stop) => target.some((candidate) => haversine(stop, candidate) <= SHARED_ROUTE_STOP_TOLERANCE)).length;
      return matched / source.length;
    }

    function addGraphEntry(graph, from, to, edge) {
      if (!from || !to) return;
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from).push({ ...edge, from, to });
    }    async function planWalking(start, end, profileKey, profile, direct) {
      if (await ensureRouteIndex()) {
        const tileIds = routeTilesFor(start, end, direct);
        if (tileIds.length) {
          try {
            const routeData = await loadWalkingRouteData(tileIds);
            const accessible = walkingPath(routeData, start, end, edgeCostForProfile(profile));
            const shortest = walkingPath(routeData, start, end, (edge) => edge.distance || 1);
            const localOptions = [
              routeFromWalk(accessible, start, end, profileKey, profile, "可行步行", COLORS.walk),
              routeFromWalk(shortest, start, end, profileKey, profile, "距離較短", COLORS.walkAlt)
            ].filter(Boolean).filter(dedupeByGeometry());
            if (localOptions.length) return localOptions;
          } catch (error) {
            console.warn("Walking route unavailable:", error.message);
          }
        }
      }
      const official = await officialPedestrianWalkSegment(start, end, "沿官方步行路線前往目的地", profile);
      return official ? [routeFromOfficialWalk(official, start, end, profileKey, profile)] : [];
    }

    async function ensureRouteIndex() {
      if (state.routeIndex) return true;
      try {
        state.routeIndex = await window.MapableRouteData.loadRouteIndex();
        return Boolean(state.routeIndex);
      } catch (error) {
        console.warn("Walking route index unavailable:", error.message);
        return false;
      }
    }

    function routeTilesFor(start, end, direct) {
      if (!state.routeIndex?.tiles) return [];
      const padding = direct < 1500 ? 0.018 : direct < 3500 ? 0.035 : 0.06;
      const minLat = Math.min(start.lat, end.lat) - padding;
      const maxLat = Math.max(start.lat, end.lat) + padding;
      const minLng = Math.min(start.lng, end.lng) - padding;
      const maxLng = Math.max(start.lng, end.lng) + padding;
      const limit = direct < 1200 ? 14 : direct < 3000 ? 20 : 24;
      return state.routeIndex.tiles
        .filter((tile) => intersects(tile.bbox, [minLng, minLat, maxLng, maxLat]))
        .map((tile) => ({ tile, score: routeTileScore(tile, start, end) }))
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((item) => item.tile)
        .map((tile) => tile.id);
    }

    function routeTileScore(tile, start, end) {
      const center = { lat: (tile.bbox[1] + tile.bbox[3]) / 2, lng: (tile.bbox[0] + tile.bbox[2]) / 2 };
      const endpoint = containsPoint(tile.bbox, start) || containsPoint(tile.bbox, end) ? -100000 : 0;
      return endpoint + distanceToSegment(center, start, end);
    }

    function containsPoint(bbox, point) {
      return point.lng >= bbox[0] && point.lng <= bbox[2] && point.lat >= bbox[1] && point.lat <= bbox[3];
    }

    function distanceToSegment(point, start, end) {
      const x = point.lng;
      const y = point.lat;
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared ? Math.max(0, Math.min(1, ((x - start.lng) * dx + (y - start.lat) * dy) / lengthSquared)) : 0;
      const projected = { lat: start.lat + dy * ratio, lng: start.lng + dx * ratio };
      return haversine(point, projected);
    }

    function intersects(a, b) {
      return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
    }

    async function loadWalkingRouteData(tileIds) {
      const routeData = await window.MapableRouteData.loadRouteTiles(tileIds);
      applyWalkingAccessibility(routeData);
      applyPublicWalkingStructures(routeData);
      return routeData;
    }

    function accessibilityGridKey(lat, lng) {
      return `${Math.floor(lat / ACCESSIBILITY_GRID_SIZE)}:${Math.floor(lng / ACCESSIBILITY_GRID_SIZE)}`;
    }

    function applyWalkingAccessibility(routeData) {
      const version = state.walkingAccessibility?.version || 0;
      if (!version || routeData.accessibilityOverlayVersion === version) return routeData;
      (routeData.edges || []).forEach((edge) => {
        const geometry = edge.geometry || [];
        if (geometry.length < 2) return;
        const indoorEdge = /Indoor|Station|MTR|室內|站內/i.test(edge.notes || "");
        accessibilityCandidates(geometry).forEach((facility) => {
          if (facility.scope === "indoor" && !indoorEdge) return;
          const threshold = facility.scope === "indoor" ? 24 : facility.type === "lift" ? 45 : 35;
          if (pointToPolylineDistance(facility, geometry) > threshold) return;
          const idsKey = facility.type === "lift" ? "nearbyLiftIds" : "nearbyRampIds";
          const flagKey = facility.type === "lift" ? "hasLiftNearby" : "hasRampNearby";
          edge[flagKey] = true;
          if (!edge[idsKey]) edge[idsKey] = [];
          if (!edge[idsKey].includes(facility.id)) edge[idsKey].push(facility.id);
        });
      });
      routeData.accessibilityOverlayVersion = version;
      return routeData;
    }

    function accessibilityCandidates(geometry) {
      const padding = 0.00055;
      const lats = geometry.map((point) => point[0]);
      const lngs = geometry.map((point) => point[1]);
      const minLatCell = Math.floor((Math.min(...lats) - padding) / ACCESSIBILITY_GRID_SIZE);
      const maxLatCell = Math.floor((Math.max(...lats) + padding) / ACCESSIBILITY_GRID_SIZE);
      const minLngCell = Math.floor((Math.min(...lngs) - padding) / ACCESSIBILITY_GRID_SIZE);
      const maxLngCell = Math.floor((Math.max(...lngs) + padding) / ACCESSIBILITY_GRID_SIZE);
      const candidates = [];
      for (let latCell = minLatCell; latCell <= maxLatCell; latCell += 1) {
        for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell += 1) {
          candidates.push(...(state.accessibilityGrid.get(`${latCell}:${lngCell}`) || []));
        }
      }
      return candidates;
    }

    function pointToPolylineDistance(point, geometry) {
      let best = Infinity;
      for (let index = 1; index < geometry.length; index += 1) {
        best = Math.min(best, distanceToSegment(point, {
          lat: geometry[index - 1][0], lng: geometry[index - 1][1]
        }, {
          lat: geometry[index][0], lng: geometry[index][1]
        }));
      }
      return best;
    }

    function applyPublicWalkingStructures(routeData) {
      const version = state.publicWalkingStructures?.version || 0;
      if (!version || routeData.publicStructureVersion === version) return routeData;
      (routeData.edges || []).forEach((edge) => {
        const geometry = edge.geometry || [];
        if (geometry.length < 2) return;
        publicStructureCandidates(geometry).forEach((structure) => {
          if (!polylineIntersectsBbox(geometry, structure.bbox)) return;
          if (!edge.nearbyFootbridgeIds) edge.nearbyFootbridgeIds = [];
          if (!edge.nearbyFootbridgeIds.includes(structure.id)) edge.nearbyFootbridgeIds.push(structure.id);
          edge.hasFootbridgeNearby = true;
          const firstInside = pointInsideBbox(geometry[0], structure.bbox);
          const lastInside = pointInsideBbox(geometry[geometry.length - 1], structure.bbox);
          if (firstInside !== lastInside) {
            if (!edge.potentialEntranceIds) edge.potentialEntranceIds = [];
            edge.potentialEntranceIds.push(`${structure.id}:${edge.id}`);
          } else if (!firstInside && !lastInside) {
            if (!edge.potentialEntranceIds) edge.potentialEntranceIds = [];
            edge.potentialEntranceIds.push(`${structure.id}:${edge.id}:a`, `${structure.id}:${edge.id}:b`);
          }
        });
      });
      routeData.publicStructureVersion = version;
      return routeData;
    }

    function publicStructureCandidates(geometry) {
      const bounds = geometryBbox(geometry);
      const minLatCell = Math.floor(bounds[1] / PUBLIC_STRUCTURE_GRID_SIZE);
      const maxLatCell = Math.floor(bounds[3] / PUBLIC_STRUCTURE_GRID_SIZE);
      const minLngCell = Math.floor(bounds[0] / PUBLIC_STRUCTURE_GRID_SIZE);
      const maxLngCell = Math.floor(bounds[2] / PUBLIC_STRUCTURE_GRID_SIZE);
      const candidates = new Map();
      for (let latCell = minLatCell; latCell <= maxLatCell; latCell += 1) {
        for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell += 1) {
          (state.publicStructureGrid.get(`${latCell}:${lngCell}`) || []).forEach((structure) => candidates.set(structure.id, structure));
        }
      }
      return [...candidates.values()];
    }

    function geometryBbox(geometry) {
      const lats = geometry.map((point) => Number(point[0]));
      const lngs = geometry.map((point) => Number(point[1]));
      return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    }

    function pointInsideBbox(point, bbox) {
      const lat = Number(point?.[0]);
      const lng = Number(point?.[1]);
      return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
    }

    function polylineIntersectsBbox(geometry, bbox) {
      if (geometry.some((point) => pointInsideBbox(point, bbox))) return true;
      for (let index = 1; index < geometry.length; index += 1) {
        const segmentBbox = geometryBbox([geometry[index - 1], geometry[index]]);
        if (intersects(segmentBbox, bbox)) return true;
      }
      return false;
    }

    function edgeCostForProfile(profile) {
      return (edge) => {
        let cost = edge.distance || 1;
        const costProfile = window.MapableProfileService.resolve(profile?.travelProfile || profile?.id || "standard");
        const priorities = costProfile.priorities;
        const slope = edge.slope || "flat";
        if (slope === "mild") cost *= 1 + (profile.path.slope - 1) * 0.45;
        if (slope === "steep") cost *= profile.path.slope;
        if (slope === "stairs" || edge.hasStairs) {
          if (!Number.isFinite(profile.path.stairs)) return Infinity;
          cost += profile.path.stairs;
        }
        if (/Crossing|過路|Traffic|行人過路/i.test(edge.notes || "")) cost += profile.path.crossing;
        const missingPathFields = [
          !edgeFieldKnown(edge, ["surface", "surfaceType", "pavement"]) ? priorities.surface : 0,
          !edgeFieldKnown(edge, ["widthMeters", "clearWidthMeters", "width"]) ? priorities.surface : 0,
          !edgeFieldKnown(edge, ["curbHeightMm", "kerbHeightMm", "curb", "kerb"]) ? priorities.surface : 0
        ].reduce((sum, value) => sum + value, 0);
        cost *= 1 + Math.min(0.18, missingPathFields * 0.008);
        if ((edge.potentialEntranceIds || []).length) cost *= 1 + Math.min(0.12, priorities.liftUnknown * 0.018);
        if (isCrossingEdge(edge) && !edgeFieldKnown(edge, ["crossingAssist", "audibleSignal", "hasAudibleSignal", "tactileSignal", "hasTactileSignal"])) {
          cost *= 1 + Math.min(0.12, priorities.crossing * 0.012);
        }
        const connectedAccess = (edge.connectedLiftIds || []).length || (edge.connectedRampIds || []).length
          || edge.hasConnectedLift || edge.hasConnectedRamp;
        if (connectedAccess) cost -= Math.min(8, cost * 0.02);
        return Math.max(1, cost);
      };
    }

    function routeFromWalk(path, start, end, profileKey, profile, label, color) {
      if (!path || !path.edges.length) return null;
      const walkVariant = color === COLORS.walk ? "accessible" : "shortest";
      const distance = path.edges.reduce((sum, edge) => sum + (edge.distance || 0), 0) + path.startSnap + path.endSnap;
      if (distance > window.MapableProfileService.resolve("standard").maxWalk * 1.9) return null;
      const geometry = flattenGeometry(path.edges, start, end, path);
      const metrics = walkingMetricsForPath(path);
      const minutes = Math.max(1, Math.round(distance / profile.walkSpeed));
      return finalizeOption({
        id: `walk-${label}`,
        mode: "walk",
        walkVariant,
        title: label === "可行步行" ? "建議步行" : "步行備選",
        summaryMode: "步行",
        label,
        distance,
        walkDistance: distance,
        minutes,
        fare: 0,
        fareLabel: "免費",
        geometry,
        color,
        risk: riskForWalk(metrics),
        metrics,
        recommendation: `沿步行路網由「${start.name}」前往「${end.name}」。`,
        reasons: walkReasons(profileKey, distance, metrics),
        cautions: walkCautions(profileKey, metrics),
        segments: [{ mode: "walk", label: "沿步行路網前往目的地", fromName: start.name, toName: end.name, geometry, distance, minutes, color, routed: true, metrics }]
      });
    }

    function routeFromOfficialWalk(segment, start, end, profileKey, profile) {
      if (!segment || segment.distance > window.MapableProfileService.resolve("standard").maxWalk * 1.9) return null;
      return finalizeOption({
        id: "walk-official-pedestrian-route",
        mode: "walk",
        walkVariant: "official",
        title: "建議步行",
        summaryMode: "步行",
        label: "官方步行路線",
        distance: segment.distance,
        walkDistance: segment.distance,
        minutes: segment.minutes,
        fare: 0,
        fareLabel: "免費",
        geometry: segment.geometry,
        color: COLORS.walk,
        risk: riskForWalk(segment.metrics),
        metrics: segment.metrics,
        recommendation: `沿地政總署行人路線由「${start.name}」前往「${end.name}」。`,
        reasons: walkReasons(profileKey, segment.distance, segment.metrics),
        cautions: walkCautions(profileKey, segment.metrics),
        segments: [segment]
      });
    }

    async function enhanceWalkingConnectors(option, profile, routeTransit = false) {
      const exitResolution = routeTransit ? await resolveMtrEgressExit(option, profile) : null;
      const sourceOption = exitResolution?.option || option;
      const enhanced = [];
      const useWalkingNetwork = sourceOption.mode === "walk" || routeTransit;
      for (let index = 0; index < (sourceOption.segments || []).length; index += 1) {
        const segment = sourceOption.segments[index];
        if (segment.mode !== "walk" || !segment.from || !segment.to) {
          enhanced.push(segment);
          continue;
        }
        if (exitResolution?.segmentIndex === index) {
          enhanced.push(exitResolution.walk);
          continue;
        }
        const walked = useWalkingNetwork
          ? await buildWalkSegment(segment.from, segment.to, segment.label, profile, { allowOfficial: routeTransit })
          : walkSegmentDirect(segment.from, segment.to, segment.label, profile, false);
        enhanced.push(segment.fromMtrExit ? {
          ...walked,
          fromMtrExit: segment.fromMtrExit,
          mtrExitStatus: segment.mtrExitStatus || segment.fromMtrExit.confidence || ""
        } : walked);
      }
      const walkDistance = enhanced.filter((segment) => segment.mode === "walk").reduce((sum, segment) => sum + (segment.distance || 0), 0);
      const walkMetrics = mergeWalkMetrics(enhanced.filter((segment) => segment.mode === "walk").map((segment) => segment.metrics));
      const minutes = Math.max(1, Math.round(enhanced.reduce((sum, segment) => sum + (segment.minutes || 0), 0)));
      if (sourceOption.mode !== "walk" && walkDistance > window.MapableProfileService.resolve("standard").maxWalk * 1.35) return null;
      const baseRisk = sourceOption.baseRisk || sourceOption.risk;
      return finalizeOption({
        ...sourceOption,
        baseRisk,
        segments: enhanced,
        walkDistance,
        distance: walkDistance,
        metrics: walkMetrics,
        risk: moreSevereRisk(baseRisk, riskForWalk(walkMetrics)),
        minutes,
        geometry: enhanced.flatMap((segment) => segment.geometry || []),
        cautions: [
          ...(sourceOption.cautions || []),
          ...enhanced.some((segment) => segment.mode === "walk" && !segment.routed) ? ["部分步行接駁未能連上步行路網，已用附近道路距離作保守估算。"] : []
        ]
      });
    }

    async function buildWalkSegment(from, to, label, profile, options = {}) {
      const direct = haversine(from, to);
      if (direct < 25) return walkSegmentDirect(from, to, label, profile, true);
      if (direct > MAX_WALK_TILE_DISTANCE || !await ensureRouteIndex()) return walkSegmentFallback(from, to, label, profile, options);
      const tileIds = routeTilesFor(from, to, direct);
      if (!tileIds.length) return walkSegmentFallback(from, to, label, profile, options);
      try {
        const routeData = await loadWalkingRouteData(tileIds);
        const path = walkingPath(routeData, from, to, edgeCostForProfile(profile));
        if (!path || !path.edges.length) return walkSegmentFallback(from, to, label, profile, options);
        const distance = path.edges.reduce((sum, edge) => sum + (edge.distance || 0), 0) + path.startSnap + path.endSnap;
        const metrics = walkingMetricsForPath(path);
        const localSegment = {
          mode: "walk",
          label,
          from,
          to,
          fromName: from.name,
          toName: to.name,
          geometry: flattenGeometry(path.edges, from, to, path),
          distance,
          minutes: Math.max(1, Math.round(distance / profile.walkSpeed)),
          color: COLORS.walk,
          routed: true,
          metrics
        };
        if (options.allowOfficial && metrics.endpointAccessUncertain) {
          const official = await officialPedestrianWalkSegment(from, to, label, profile);
          if (official) return official;
        }
        return localSegment;
      } catch (error) {
        console.warn("Connector walk unavailable:", error.message);
        return walkSegmentFallback(from, to, label, profile, options);
      }
    }

    async function walkSegmentFallback(from, to, label, profile, options) {
      if (options?.allowOfficial) {
        const official = await officialPedestrianWalkSegment(from, to, label, profile);
        if (official) return official;
      }
      return walkSegmentDirect(from, to, label, profile, false);
    }

    async function officialPedestrianWalkSegment(from, to, label, profile) {
      const travelMode = officialPedestrianTravelMode(profile);
      const key = `${travelMode}:${from.lat.toFixed(5)},${from.lng.toFixed(5)}:${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
      if (!state.officialPedestrianRouteCache.has(key)) {
        const promise = (async () => {
          try {
            const stops = {
              features: [from, to].map((place, index) => ({
                attributes: { Name: index ? "End" : "Start" },
                geometry: {
                  spatialReference: { latestWkid: 4326 },
                  x: place.lng,
                  y: place.lat,
                  z: 0
                }
              }))
            };
            const url = new URL("https://mapapi.hkmapservice.gov.hk/PedRoute/NAServer/route/solve");
            const params = {
              stops: JSON.stringify(stops),
              travelMode,
              directionsLanguage: "zh-HK",
              outSR: "4326",
              f: "json",
              returnZ: "false",
              returnRoutes: "true",
              returnDirections: "true",
              outputLines: "esriNAOutputLineTrueShape",
              directionStyleName: "NA Campus"
            };
            Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
            const data = await fetchJson(url.toString(), OFFICIAL_PEDESTRIAN_ROUTE_TIMEOUT_MS);
            return officialPedestrianRouteSegmentFromResponse(data, from, to, label, profile);
          } catch (error) {
            console.warn("Official pedestrian route unavailable:", error.message);
            return null;
          }
        })();
        state.officialPedestrianRouteCache.set(key, promise);
        while (state.officialPedestrianRouteCache.size > MAX_OFFICIAL_PEDESTRIAN_ROUTE_CACHE) {
          state.officialPedestrianRouteCache.delete(state.officialPedestrianRouteCache.keys().next().value);
        }
      }
      return state.officialPedestrianRouteCache.get(key);
    }

    function walkSegmentDirect(from, to, label, profile, routed) {
      const distance = haversine(from, to) * 1.18;
      return {
        mode: "walk",
        label,
        from,
        to,
        fromName: from.name,
        toName: to.name,
        geometry: [[from.lat, from.lng], [to.lat, to.lng]],
        distance,
        minutes: Math.max(1, Math.round(distance / (profile.walkSpeed || WALK_SPEED))),
        color: COLORS.walk,
        routed,
        metrics: {
          stairs: 0,
          slopes: 0,
          ramps: 0,
          lifts: 0,
          connectedRamps: 0,
          connectedLifts: 0,
          nearbyRamps: 0,
          nearbyLifts: 0,
          footbridges: 0,
          potentialEntrances: 0,
          crossings: 0,
          stairsUnknown: true,
          entranceConnectionUnknown: !routed,
          unknownSurface: true,
          unknownWidth: true,
          unknownCurb: true,
          unknownSlopeDetails: false,
          unknownCrossingAssist: false,
          confidence: routed ? "partial" : "fallback",
          fallback: !routed
        }
      };
    }
    function planMtr(start, end, profile) {
      if (!state.mtrStations.size) return [];
      const origins = nearestStations(start).slice(0, MAX_MTR_STATIONS);
      const destinations = nearestStations(end, profile, true).slice(0, MAX_MTR_STATIONS);
      const candidates = [];
      origins.forEach((origin) => {
        destinations.forEach((destination) => {
          if (origin.station.code === destination.station.code) return;
          if (origin.distance > MAX_TRANSIT_ACCESS || destination.distance > MAX_TRANSIT_ACCESS) return;
          const rail = railPath(origin.station.code, destination.station.code);
          if (!rail) return;
          candidates.push(routeForRailOnly(start, end, origin, destination, rail, profile));
        });
      });
      return candidates.sort((a, b) => compareOptions(a, b, profile)).filter(dedupeByLabel()).slice(0, 4);
    }

    function routeForRailOnly(start, end, origin, destination, rail, profile) {
      const railSegments = railSegmentsFromPath(rail);
      const firstLine = rail.edges[0]?.line || "MTR";
      const fare = fareForHeavyRail(origin.station.code, destination.station.code, rail, profile);
      const title = "港鐵接駁";
      return makeTransitOption({
        id: `mtr-${origin.station.code}-${destination.station.code}`,
        mode: "mtr",
        title,
        summaryMode: "港鐵",
        label: `${stationName(origin.station)} → ${stationName(destination.station)}`,
        start,
        end,
        accessPlace: stationPlace(origin.station),
        ...mtrEgressConfig(destination),
        transitSegments: railSegments,
        fare,
        fareLabel: fareLabelForProfile(fare, false, profile, profile?.id === "senior" ? "joyYou" : ""),
        recommendation: `先前往「${stationName(origin.station)}」乘搭港鐵，到「${stationName(destination.station)}」後步行前往目的地。`,
        reasons: [`港鐵主段按真實站序規劃，不以直線代替。`, rail.transferCount ? `途中約需轉乘 ${rail.transferCount} 次。` : "途中不需轉乘。", `首尾步行會按步行路網重新計算。`],
        cautions: ["港鐵站內升降機、閘口和月台情況出發前仍需核對。", "如攜帶嬰兒車或使用輪椅，優先使用有升降機的出口。"],
        color: MTR_LINE_COLORS[firstLine] || "#1d4ed8",
        profile
      });
    }

    function planLightRail(start, end, profile) {
      if (!state.lightRailStops.size) return [];
      const origins = nearestLightRailStops(start).slice(0, MAX_LR_STOPS);
      const destinations = nearestLightRailStops(end).slice(0, MAX_LR_STOPS);
      const candidates = [];
      origins.forEach((origin) => {
        destinations.forEach((destination) => {
          if (origin.stop.code === destination.stop.code) return;
          if (origin.distance > MAX_RAIL_ACCESS || destination.distance > MAX_RAIL_ACCESS) return;
          const lightRail = lightRailPath(origin.stop.code, destination.stop.code);
          if (!lightRail) return;
          candidates.push(routeForLightRailOnly(start, end, origin, destination, lightRail, profile));
        });
      });
      return candidates.sort((a, b) => compareOptions(a, b, profile)).filter(dedupeByLabel()).slice(0, 3);
    }

    function routeForLightRailOnly(start, end, origin, destination, lightRail, profile) {
      const fare = fareForLightRail(origin.stop.code, destination.stop.code, profile);
      return makeTransitOption({
        id: `lrt-${origin.stop.code}-${destination.stop.code}`,
        mode: "lightRail",
        title: "輕鐵接駁",
        summaryMode: "輕鐵",
        label: `${lightRail.routes.join(" / ")} ${lightRailStopName(origin.stop)} → ${lightRailStopName(destination.stop)}`,
        start,
        end,
        accessPlace: lightRailPlace(origin.stop),
        egressPlace: lightRailPlace(destination.stop),
        transitSegments: lightRailSegmentsFromPath(lightRail),
        fare,
        fareLabel: fareLabelForProfile(fare, false, profile, profile?.id === "senior" ? "joyYou" : ""),
        recommendation: `先前往「${lightRailStopName(origin.stop)}」乘搭輕鐵，到「${lightRailStopName(destination.stop)}」後步行前往目的地。`,
        reasons: [`輕鐵主段按站序規劃，共 ${lightRail.stops.length} 個站。`, lightRail.transferCount ? `途中約需轉乘 ${lightRail.transferCount} 次。` : "途中不需轉乘。", "首尾步行會按步行路網重新計算。"],
        cautions: ["輕鐵月台、過路處及車廂擁擠情況需要臨場留意。"],
        color: COLORS.lightRail,
        profile
      });
    }

    function planLightRailMtr(start, end, profile) {
      if (!state.lightRailStops.size || !state.mtrStations.size) return [];
      const origins = nearestLightRailStops(start).slice(0, MAX_LR_STOPS);
      const destinations = nearestStations(end, profile, true).slice(0, MAX_MTR_STATIONS);
      const candidates = [];
      origins.forEach((origin) => {
        Object.entries(lrHeavyRailInterchanges).forEach(([lrCode, mtrCode]) => {
          const interchangeStop = state.lightRailStops.get(lrCode);
          const interchangeStation = state.mtrStations.get(mtrCode);
          if (!interchangeStop || !interchangeStation) return;
          const lightRail = lightRailPath(origin.stop.code, lrCode);
          if (!lightRail) return;
          destinations.forEach((destination) => {
            if (destination.distance > MAX_TRANSIT_ACCESS) return;
            const rail = railPath(mtrCode, destination.station.code);
            if (!rail) return;
            candidates.push(routeForLightRailMtr(start, end, origin, interchangeStop, interchangeStation, destination, lightRail, rail, profile));
          });
        });
      });
      return candidates.sort((a, b) => compareOptions(a, b, profile)).filter(dedupeByLabel()).slice(0, 3);
    }

    function planMtrLightRail(start, end, profile) {
      if (!state.lightRailStops.size || !state.mtrStations.size) return [];
      const origins = nearestStations(start).slice(0, MAX_MTR_STATIONS);
      const destinations = nearestLightRailStops(end).slice(0, MAX_LR_STOPS);
      const candidates = [];
      origins.forEach((origin) => {
        Object.entries(lrHeavyRailInterchanges).forEach(([lrCode, mtrCode]) => {
          const interchangeStop = state.lightRailStops.get(lrCode);
          const interchangeStation = state.mtrStations.get(mtrCode);
          if (!interchangeStop || !interchangeStation) return;
          const rail = railPath(origin.station.code, mtrCode);
          if (!rail) return;
          destinations.forEach((destination) => {
            const lightRail = lightRailPath(lrCode, destination.stop.code);
            if (!lightRail) return;
            candidates.push(routeForMtrLightRail(start, end, origin, interchangeStation, interchangeStop, destination, rail, lightRail, profile));
          });
        });
      });
      return candidates.sort((a, b) => compareOptions(a, b, profile)).filter(dedupeByLabel()).slice(0, 3);
    }

    function routeForLightRailMtr(start, end, origin, interchangeStop, interchangeStation, destination, lightRail, rail, profile) {
      const segments = [
        ...lightRailSegmentsFromPath(lightRail),
        shortWalkInterchange(lightRailPlace(interchangeStop), stationPlace(interchangeStation), "由輕鐵月台前往港鐵站"),
        ...railSegmentsFromPath(rail)
      ];
      const fare = sumFares(fareForLightRail(origin.stop.code, interchangeStop.code, profile), fareForHeavyRail(interchangeStation.code, destination.station.code, rail, profile));
      return makeTransitOption({
        id: `lrt-mtr-${origin.stop.code}-${destination.station.code}`,
        mode: "mixed",
        title: "輕鐵 + 港鐵",
        summaryMode: "輕鐵 / 港鐵",
        label: `${lightRailStopName(origin.stop)} → ${stationName(destination.station)}`,
        start,
        end,
        accessPlace: lightRailPlace(origin.stop),
        ...mtrEgressConfig(destination),
        transitSegments: segments,
        fare,
        fareLabel: fareLabelForProfile(fare, true, profile, profile?.id === "senior" ? "joyYou" : ""),
        recommendation: `先乘搭輕鐵到「${lightRailStopName(interchangeStop)}」，再轉港鐵前往「${stationName(destination.station)}」。`,
        reasons: ["輕鐵與港鐵主段均按真實站序規劃。", `中途在「${lightRailStopName(interchangeStop)} / ${stationName(interchangeStation)}」轉乘。`, "適合新界西到市區的較長距離行程。"],
        cautions: ["轉乘時請預留步行和等車時間。", "如需無障礙出入口，出發前請核對相關車站升降機狀態。"],
        color: COLORS.lightRail,
        profile
      });
    }

    function routeForMtrLightRail(start, end, origin, interchangeStation, interchangeStop, destination, rail, lightRail, profile) {
      const segments = [
        ...railSegmentsFromPath(rail),
        shortWalkInterchange(stationPlace(interchangeStation), lightRailPlace(interchangeStop), "由港鐵站前往輕鐵月台"),
        ...lightRailSegmentsFromPath(lightRail)
      ];
      const fare = sumFares(fareForHeavyRail(origin.station.code, interchangeStation.code, rail, profile), fareForLightRail(interchangeStop.code, destination.stop.code, profile));
      return makeTransitOption({
        id: `mtr-lrt-${origin.station.code}-${destination.stop.code}`,
        mode: "mixed",
        title: "港鐵 + 輕鐵",
        summaryMode: "港鐵 / 輕鐵",
        label: `${stationName(origin.station)} → ${lightRailStopName(destination.stop)}`,
        start,
        end,
        accessPlace: stationPlace(origin.station),
        egressPlace: lightRailPlace(destination.stop),
        transitSegments: segments,
        fare,
        fareLabel: fareLabelForProfile(fare, true, profile, profile?.id === "senior" ? "joyYou" : ""),
        recommendation: `先乘搭港鐵到「${stationName(interchangeStation)}」，再轉輕鐵前往「${lightRailStopName(destination.stop)}」。`,
        reasons: ["港鐵與輕鐵主段均按真實站序規劃。", `中途在「${stationName(interchangeStation)} / ${lightRailStopName(interchangeStop)}」轉乘。`, "適合市區到新界西輕鐵站附近的行程。"],
        cautions: ["轉乘時請預留步行和等車時間。", "輕鐵月台附近過路處較多，視障或色弱用戶應放慢。"],
        color: MTR_LINE_COLORS[rail.edges[0]?.line] || "#1d4ed8",
        profile
      });
    }

    async function resolveMtrEgressExit(option, profile) {
      const candidates = (option.egressExitCandidates || []).slice(0, MAX_MTR_EGRESS_EXITS);
      if (!candidates.length) {
        if (option.mtrEgressStationCode) state.lastMtrExitDiagnostics.fallbackExitCount += 1;
        return null;
      }
      const segmentIndex = (option.segments || []).findIndex((segment) => segment.mode === "walk" && segment.fromMtrExit);
      if (segmentIndex < 0) {
        state.lastMtrExitDiagnostics.selectedConfidence = option.selectedEgressExit?.confidence || "";
        return null;
      }
      const destination = option.segments[segmentIndex].to;
      const routed = await mapLimit(candidates, 2, async (exit) => {
        const walk = await mtrExitWalkSegment(exit, destination, profile);
        const score = routeGeneralizedCost({
          minutes: walk.minutes,
          walkDistance: walk.distance,
          distance: walk.distance,
          fare: 0,
          selectedEgressExit: exit,
          segments: [walk],
          metrics: walk.metrics
        }, profile);
        return { exit, walk, score };
      });
      state.lastMtrExitDiagnostics.routedExitCount += routed.length;
      const selected = routed.sort((a, b) => a.score - b.score || a.walk.distance - b.walk.distance)[0];
      if (!selected) return null;
      const segments = option.segments.map((segment) => ({ ...segment }));
      const finalMtrIndex = findLastIndex(segments, (segment) => segment.mode === "mtr");
      if (finalMtrIndex >= 0) {
        segments[finalMtrIndex].alightingExit = selected.exit;
        segments[finalMtrIndex].alightingExitStatus = selected.exit.confidence;
      }
      segments[segmentIndex] = selected.walk;
      state.lastMtrExitDiagnostics.selectedConfidence = selected.exit.confidence || "";
      return {
        segmentIndex,
        walk: selected.walk,
        option: {
          ...option,
          segments,
          selectedEgressExit: selected.exit,
          mtrExitStatus: selected.exit.confidence
        }
      };
    }

    async function mtrExitWalkSegment(exit, destination, profile) {
      const profileKey = profile?.travelProfile || profile?.id || "standard";
      const key = [exit.id, Number(destination.lat).toFixed(5), Number(destination.lng).toFixed(5), profileKey].join(":");
      if (!state.mtrExitWalkCache.has(key)) {
        const from = mtrExitPlace(exit);
        const label = `由 ${from.name} 步行至目的地`;
        state.mtrExitWalkCache.set(key, buildWalkSegment(from, destination, label, profile, { allowOfficial: true }).then((walk) => ({
          ...walk,
          label,
          from,
          fromName: from.name,
          fromMtrExit: exit,
          mtrExitStatus: exit.confidence,
          metrics: {
            ...(walk.metrics || {}),
            entranceConnectionUnknown: walk.metrics?.entranceConnectionUnknown
              || exit.accessibility?.connection !== "verified"
          }
        })));
        if (state.mtrExitWalkCache.size > 64) state.mtrExitWalkCache.delete(state.mtrExitWalkCache.keys().next().value);
      }
      return state.mtrExitWalkCache.get(key);
    }

    function planMixedTransit(start, end, profile, departureDate, ignoreSchedule = false) {
      if (!state.busPatterns.length) return [];
      const eligiblePatternSet = new Set(eligibleBusPatterns(departureDate, ignoreSchedule));
      if (!eligiblePatternSet.size) return [];
      const busOrigins = limitedBusEndpointEntries(
        nearbyBusPatternStops(start, MAX_BUS_ACCESS, eligiblePatternSet, "origin")
      );
      const busDestinations = limitedBusEndpointEntries(
        nearbyBusPatternStops(end, MAX_BUS_EGRESS, eligiblePatternSet, "destination")
      );
      const candidates = [];
      mixedRailSystems(profile).forEach((system) => {
        candidates.push(
          ...planBusToRail(start, end, profile, system, busOrigins),
          ...planRailToBus(start, end, profile, system, busDestinations)
        );
      });
      return candidates
        .sort((a, b) => compareOptions(a, b, profile))
        .filter(dedupeBySignature());
    }

    function mixedRailSystems(profile) {
      const systems = [];
      if (state.mtrStations.size) {
        systems.push({
          key: "mtr",
          label: "港鐵",
          nodes: [...state.mtrStations.values()],
          endpointLimit: MAX_MTR_STATIONS,
          accessLimit: MAX_TRANSIT_ACCESS,
          nearest: (place) => nearestStations(place, profile, true).map((entry) => ({
            node: entry.station,
            distance: entry.distance,
            exitCandidates: entry.exitCandidates,
            provisionalExit: entry.provisionalExit
          })),
          code: (node) => node.code,
          name: stationName,
          place: stationPlace,
          path: railPath,
          segments: railSegmentsFromPath,
          fare: (fromCode, toCode, path, profile) => fareForHeavyRail(fromCode, toCode, path, profile),
          color: (path) => MTR_LINE_COLORS[path?.edges?.[0]?.line] || "#1d4ed8"
        });
      }
      if (state.lightRailStops.size) {
        systems.push({
          key: "lightRail",
          label: "輕鐵",
          nodes: [...state.lightRailStops.values()],
          endpointLimit: MAX_LR_STOPS,
          accessLimit: MAX_RAIL_ACCESS,
          nearest: (place) => nearestLightRailStops(place).map((entry) => ({ node: entry.stop, distance: entry.distance })),
          code: (node) => node.code,
          name: lightRailStopName,
          place: lightRailPlace,
          path: lightRailPath,
          segments: lightRailSegmentsFromPath,
          fare: (fromCode, toCode, path, profile) => fareForLightRail(fromCode, toCode, profile),
          color: () => COLORS.lightRail
        });
      }
      return systems;
    }

    function limitedBusEndpointEntries(entriesByPattern) {
      const entries = [];
      entriesByPattern.forEach((patternEntries, pattern) => {
        patternEntries.slice(0, 2).forEach((entry) => entries.push({ ...entry, pattern }));
      });
      return entries
        .sort((a, b) => a.distance - b.distance)
        .filter((entry, index, all) => all.findIndex((candidate) => (
          candidate.pattern.id === entry.pattern.id && candidate.index === entry.index
        )) === index)
        .slice(0, MAX_MIXED_BUS_ENDPOINTS);
    }

    function planBusToRail(start, end, profile, system, busOrigins) {
      if (!busOrigins.length) return [];
      const railDestinations = system.nearest(end)
        .slice(0, system.endpointLimit)
        .filter((entry) => entry.distance <= system.accessLimit);
      if (!railDestinations.length) return [];
      const transferCache = new Map();
      const pathCache = new Map();
      const bestDescriptors = new Map();
      busOrigins.forEach((origin) => {
        for (let alightIndex = origin.index + 1; alightIndex < origin.pattern.stops.length; alightIndex += 1) {
          const alightStop = origin.pattern.stops[alightIndex];
          mixedTransferNodes(alightStop, system, transferCache).forEach((interchange) => {
            railDestinations.forEach((destination) => {
              const rail = cachedMixedRailPath(system, interchange.node, destination.node, pathCache);
              if (!rail) return;
              const descriptor = {
                direction: "bus-to-rail",
                pattern: origin.pattern,
                busFromIndex: origin.index,
                busToIndex: alightIndex,
                interchange,
                railEndpoint: destination,
                rail,
                estimate: mixedJourneyEstimate({
                  accessDistance: origin.distance,
                  busStops: origin.pattern.stops.slice(origin.index, alightIndex + 1),
                  transferDistance: interchange.distance,
                  railMinutes: rail.minutes,
                  egressDistance: destination.distance,
                  profile
                })
              };
              const key = [
                origin.pattern.id,
                origin.index,
                system.code(interchange.node),
                system.code(destination.node)
              ].join(":");
              const existing = bestDescriptors.get(key);
              if (!existing || descriptor.estimate < existing.estimate) bestDescriptors.set(key, descriptor);
            });
          });
        }
      });
      return [...bestDescriptors.values()]
        .sort((a, b) => a.estimate - b.estimate)
        .slice(0, MAX_MIXED_DESCRIPTORS)
        .map((descriptor) => mixedOptionFromDescriptor(start, end, profile, system, descriptor))
        .filter(Boolean)
        .sort((a, b) => compareOptions(a, b, profile))
        .filter(dedupeByLabel())
        .slice(0, MAX_MIXED_OPTIONS_PER_DIRECTION);
    }

    function planRailToBus(start, end, profile, system, busDestinations) {
      if (!busDestinations.length) return [];
      const railOrigins = system.nearest(start)
        .slice(0, system.endpointLimit)
        .filter((entry) => entry.distance <= system.accessLimit);
      if (!railOrigins.length) return [];
      const transferCache = new Map();
      const pathCache = new Map();
      const bestDescriptors = new Map();
      busDestinations.forEach((destination) => {
        for (let boardIndex = 0; boardIndex < destination.index; boardIndex += 1) {
          const boardStop = destination.pattern.stops[boardIndex];
          mixedTransferNodes(boardStop, system, transferCache).forEach((interchange) => {
            railOrigins.forEach((origin) => {
              const rail = cachedMixedRailPath(system, origin.node, interchange.node, pathCache);
              if (!rail) return;
              const descriptor = {
                direction: "rail-to-bus",
                pattern: destination.pattern,
                busFromIndex: boardIndex,
                busToIndex: destination.index,
                interchange,
                railEndpoint: origin,
                rail,
                estimate: mixedJourneyEstimate({
                  accessDistance: origin.distance,
                  railMinutes: rail.minutes,
                  transferDistance: interchange.distance,
                  busStops: destination.pattern.stops.slice(boardIndex, destination.index + 1),
                  egressDistance: destination.distance,
                  profile
                })
              };
              const key = [
                system.code(origin.node),
                system.code(interchange.node),
                destination.pattern.id,
                destination.index
              ].join(":");
              const existing = bestDescriptors.get(key);
              if (!existing || descriptor.estimate < existing.estimate) bestDescriptors.set(key, descriptor);
            });
          });
        }
      });
      return [...bestDescriptors.values()]
        .sort((a, b) => a.estimate - b.estimate)
        .slice(0, MAX_MIXED_DESCRIPTORS)
        .map((descriptor) => mixedOptionFromDescriptor(start, end, profile, system, descriptor))
        .filter(Boolean)
        .sort((a, b) => compareOptions(a, b, profile))
        .filter(dedupeByLabel())
        .slice(0, MAX_MIXED_OPTIONS_PER_DIRECTION);
    }

    function mixedTransferNodes(stop, system, cache) {
      const key = `${system.key}:${stop.id || `${stop.lat},${stop.lng}`}`;
      if (!cache.has(key)) {
        cache.set(key, system.nodes
          .map((node) => ({ node, distance: haversine(stop, node) }))
          .filter((entry) => entry.distance <= MAX_MIXED_TRANSFER_WALK)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 2));
      }
      return cache.get(key);
    }

    function cachedMixedRailPath(system, fromNode, toNode, cache) {
      const fromCode = system.code(fromNode);
      const toCode = system.code(toNode);
      if (!fromCode || !toCode || fromCode === toCode) return null;
      const key = `${fromCode}:${toCode}`;
      if (!cache.has(key)) cache.set(key, system.path(fromCode, toCode));
      return cache.get(key);
    }

    function mixedJourneyEstimate({ accessDistance, busStops, transferDistance, railMinutes, egressDistance, profile }) {
      const busDistance = segmentDistance(busStops);
      const busStopDelay = Math.max(0, busStops.length - 2) * 0.45 + 2;
      return (accessDistance + egressDistance) / profile.walkSpeed
        + transferDistance / 45
        + busDistance / BUS_SPEED
        + busStopDelay
        + railMinutes;
    }

    function mixedOptionFromDescriptor(start, end, profile, system, descriptor) {
      const bus = busLeg(descriptor.pattern, descriptor.busFromIndex, descriptor.busToIndex, profile);
      if (!bus) return null;
      const railSegments = system.segments(descriptor.rail);
      if (!railSegments.length) return null;
      const interchangeRailPlace = system.place(descriptor.interchange.node);
      const transferWalk = descriptor.direction === "bus-to-rail"
        ? shortWalkInterchange(bus.toPlace, interchangeRailPlace, `由「${bus.segment.toName}」步行至「${interchangeRailPlace.name}」轉乘${system.label}`)
        : shortWalkInterchange(interchangeRailPlace, bus.fromPlace, `由「${interchangeRailPlace.name}」步行至「${bus.segment.fromName}」轉乘巴士`);
      const railFromCode = descriptor.direction === "bus-to-rail"
        ? system.code(descriptor.interchange.node)
        : system.code(descriptor.railEndpoint.node);
      const railToCode = descriptor.direction === "bus-to-rail"
        ? system.code(descriptor.railEndpoint.node)
        : system.code(descriptor.interchange.node);
      const railFare = system.fare(railFromCode, railToCode, descriptor.rail, profile);
      const fare = sumFares(bus.fare, railFare);
      const fareProfileMatched = bus.fareProfileMatched && Number.isFinite(railFare);
      const fareProduct = profile?.id === "senior" && bus.fareProduct === "joyYou" ? "joyYou" : "";
      const railLabel = [...new Set(railSegments.map((segment) => segment.label))].join(" → ") || system.label;
      const busFirst = descriptor.direction === "bus-to-rail";
      const transitSegments = busFirst
        ? [bus.segment, transferWalk, ...railSegments]
        : [...railSegments, transferWalk, bus.segment];
      const accessPlace = busFirst ? bus.fromPlace : system.place(descriptor.railEndpoint.node);
      const mtrEgress = busFirst && system.key === "mtr"
        ? mtrEgressConfig({
          station: descriptor.railEndpoint.node,
          exitCandidates: descriptor.railEndpoint.exitCandidates,
          provisionalExit: descriptor.railEndpoint.provisionalExit
        })
        : null;
      const egressPlace = mtrEgress?.egressPlace || (busFirst ? system.place(descriptor.railEndpoint.node) : bus.toPlace);
      const interchangeText = `${busFirst ? bus.segment.toName : system.name(descriptor.interchange.node)} / ${busFirst ? system.name(descriptor.interchange.node) : bus.segment.fromName}`;
      return makeTransitOption({
        id: `mixed-${descriptor.direction}-${system.key}-${descriptor.pattern.id}-${descriptor.busFromIndex}-${descriptor.busToIndex}-${railFromCode}-${railToCode}`,
        mode: "mixed",
        title: `巴士 + ${system.label}`,
        summaryMode: `巴士 / ${system.label}`,
        label: busFirst ? `${bus.segment.label} → ${railLabel}` : `${railLabel} → ${bus.segment.label}`,
        start,
        end,
        accessPlace,
        egressPlace,
        ...(mtrEgress || {}),
        transitSegments,
        fare,
        fareLabel: fareProfileMatched
          ? fareLabelForProfile(fare, true, profile, fareProduct)
          : fareUnavailableLabel(profile),
        fareProfileMatched,
        recommendation: busFirst
          ? `先乘搭${bus.segment.label}到「${bus.segment.toName}」，步行轉乘${system.label}後前往目的地。`
          : `先乘搭${system.label}到「${system.name(descriptor.interchange.node)}」，步行轉乘${bus.segment.label}後前往目的地。`,
        reasons: [
          `巴士與${system.label}主段均按真實站序規劃。`,
          `在「${interchangeText}」轉乘，站外步行約 ${Math.round(descriptor.interchange.distance)} 米，會再按步行路網核對。`,
          "排序同時考慮步行、候車、轉乘次數、時間及車費。"
        ],
        cautions: [
          "轉乘時請核對站位、車站入口方向及下一班到站時間。",
          "車費按兩段已知票價相加，未扣除可能適用的轉乘優惠。"
        ],
        color: busFirst ? bus.provider.color : system.color(descriptor.rail),
        profile
      });
    }

    function planBus(start, end, profile, departureDate, ignoreSchedule = false, collectDiagnostics = false) {
      if (!state.busPatterns.length) return [];
      const timings = collectDiagnostics ? [] : null;
      let started = collectDiagnostics ? highResolutionNow() : 0;
      const mark = (label) => {
        if (!collectDiagnostics) return;
        const finished = highResolutionNow();
        timings.push({ label, elapsedMs: Number((finished - started).toFixed(1)) });
        started = finished;
      };
      const eligiblePatterns = eligibleBusPatterns(departureDate, ignoreSchedule);
      mark("eligibility");
      const eligiblePatternSet = new Set(eligiblePatterns);
      const originsByPattern = nearbyBusPatternStops(start, MAX_BUS_ACCESS, eligiblePatternSet, "origin");
      const destinationsByPattern = nearbyBusPatternStops(end, MAX_BUS_EGRESS, eligiblePatternSet, "destination");
      mark("endpoint-index");
      const direct = [];
      originsByPattern.forEach((origins, pattern) => {
        const destinations = destinationsByPattern.get(pattern);
        if (!destinations) return;
        const candidate = busDirectCandidate(pattern, start, end, profile, origins, destinations);
        if (candidate) direct.push(candidate);
      });
      mark("direct");
      const transfers = busTransferCandidates(originsByPattern, destinationsByPattern, start, end, profile, collectDiagnostics);
      mark("transfers");
      const output = [...direct, ...transfers]
        .sort((a, b) => compareOptions(a, b, profile))
        .filter(dedupeByLabel())
        .slice(0, 8);
      if (collectDiagnostics) {
        state.lastBusDiagnostics = {
          timings,
          counts: {
            eligiblePatterns: eligiblePatterns.length,
            originPatterns: originsByPattern.size,
            destinationPatterns: destinationsByPattern.size,
            direct: direct.length,
            transfers: transfers.length,
            output: output.length,
            transferMatches: state.lastBusTransferDiagnostics?.matches || 0,
            transferRoutePairs: state.lastBusTransferDiagnostics?.routePairs || 0,
            cachedBusLegs: state.lastBusTransferDiagnostics?.cachedBusLegs || 0
          }
        };
      }
      return output;
    }

    function eligibleBusPatterns(departureDate, ignoreSchedule = false) {
      return state.busPatterns.filter((pattern) => {
        if (!ignoreSchedule && !busServiceLikelyAvailable(pattern, departureDate)) return false;
        const schedule = transitScheduleRecord({
          mode: "bus",
          provider: pattern.provider,
          routeNo: pattern.route,
          scheduleProviderAlias: pattern.scheduleProviderAlias
        });
        if (schedule.explicitNoService) return false;
        const hasLocalRoadGeometry = Array.isArray(pattern.geometry)
          && pattern.geometry.length >= 2
          && pattern.geometrySource === "osrm-road-route-through-official-stops";
        return hasLocalRoadGeometry || !state.routeShapeManifest || Boolean(localBusShapeKey(pattern));
      });
    }

    function busServiceLikelyAvailable(pattern, departureDate) {
      const route = normalizeRouteNo(pattern.route);
      const overnight = Boolean(pattern.overnightRoute) || /^N/.test(route) || /N$/.test(route);
      if (!overnight) return true;
      const hour = Number(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Hong_Kong",
        hour: "2-digit",
        hourCycle: "h23"
      }).format(departureDate));
      return hour >= 22 || hour < 6;
    }

    function transitOptionAvailability(option, departureDate) {
      let elapsed = 0;
      for (const segment of option.segments || []) {
        if (["bus", "mtr", "lightRail"].includes(segment.mode)) {
          const boardingTime = new Date(departureDate.getTime() + elapsed * 60000);
          const status = transitSegmentAvailability(segment, boardingTime);
          if (!status.available) {
            return {
              available: false,
              known: true,
              reason: status.reason,
              reasonLabel: status.reasonLabel,
              segmentLabel: segment.label || segment.routeNo || "",
              routeLabel: transitRouteLabel(option)
            };
          }
        }
        elapsed += Number(segment.minutes) || 0;
      }
      return { available: true };
    }

    function transitRouteLabel(option) {
      const labels = (option.segments || [])
        .filter((segment) => ["bus", "mtr", "lightRail"].includes(segment.mode))
        .map((segment) => segment.label || segment.routeNo || "")
        .filter(Boolean);
      return [...new Set(labels)].join(" \u2192 ") || option.label || option.title || "";
    }

    function transitSegmentAvailability(segment, date) {
      const schedule = transitScheduleRecord(segment);
      if (schedule.explicitNoService) {
        return {
          available: false,
          known: true,
          reason: "no-operating-service",
          reasonLabel: "沒有營運班次"
        };
      }
      const variants = routeScheduleVariants(segment);
      if (!variants.length) return { available: true, known: false };
      const active = scheduledTransitWindow(segment, date);
      if (active) return { available: true, known: true, window: active };
      return scheduleStatusWithoutWindow(variants, date);
    }

    function scheduleStatusWithoutWindow(variants, date) {
      const moments = hongKongServiceMoments(date);
      let hasServiceDate = false;
      let hasPastWindow = false;
      let hasFutureWindow = false;
      variants.forEach((variant) => {
        scheduleWindows(variant).forEach((window) => {
          const rule = state.routeShapeManifest?.serviceCalendar?.[window[0]];
          if (!rule) return;
          moments.forEach((moment) => {
            if (!serviceRunsOnDate(rule, moment)) return;
            const start = Number(window[1]);
            const end = Number(window[2]);
            if (!Number.isFinite(start) || !Number.isFinite(end)) return;
            hasServiceDate = true;
            if (moment.seconds > end) hasPastWindow = true;
            if (moment.seconds < start) hasFutureWindow = true;
          });
        });
      });
      if (!hasServiceDate) return { available: false, known: true, reason: "no-service-date", reasonLabel: "\u8a72\u65e5\u671f\u6c92\u6709\u670d\u52d9" };
      if (hasPastWindow && !hasFutureWindow) return { available: false, known: true, reason: "service-ended", reasonLabel: "\u73ed\u6b21\u5df2\u7d50\u675f" };
      if (hasFutureWindow && !hasPastWindow) return { available: false, known: true, reason: "service-not-started", reasonLabel: "\u5c1a\u672a\u958b\u59cb\u670d\u52d9" };
      return { available: false, known: true, reason: "no-service-time", reasonLabel: "\u8a72\u6642\u6bb5\u6c92\u6709\u670d\u52d9" };
    }

    function summarizeUnavailableRoutes(items) {
      const seen = new Set();
      return items.map((item) => ({
        label: item.status.routeLabel || item.option.label || item.option.title || "",
        segmentLabel: item.status.segmentLabel || "",
        reason: item.status.reason,
        reasonLabel: item.status.reasonLabel
      })).filter((item) => {
        const key = `${item.label}|${item.reason}`;
        if (!item.label || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
    }

    function hasTransitSchedule(segment) {
      return routeScheduleVariants(segment).length > 0;
    }

    function routeScheduleVariants(segment) {
      const schedule = transitScheduleRecord(segment);
      const variants = schedule.variants;
      if (variants.length <= 1) return variants;
      const bound = normalizeScheduleBound(segment.bound);
      const destination = normalizeScheduleText(segment.destinationEn || segment.destination);
      const scored = variants.map((variant) => {
        const shapeId = String(variant[0] || "").toUpperCase();
        const headsign = normalizeScheduleText(variant[2]);
        let score = 0;
        if (bound && shapeId.endsWith(`-${bound}`)) score += 5;
        if (destination && headsign && (destination.includes(headsign) || headsign.includes(destination))) score += 7;
        return { variant, score };
      });
      const bestScore = Math.max(...scored.map((item) => item.score));
      return bestScore > 0
        ? scored.filter((item) => item.score === bestScore).map((item) => item.variant)
        : variants;
    }

    function transitScheduleRecord(segment) {
      const schedules = state.routeShapeManifest?.routeSchedules;
      if (!schedules) return { key: "", variants: [], explicitNoService: false };
      const keys = routeScheduleKeys(segment);
      const usableKey = keys.find((candidate) => routeScheduleHasUsableWindow(candidate)) || "";
      if (usableKey) {
        return {
          key: usableKey,
          variants: schedules[usableKey].filter((variant) => scheduleWindows(variant).length),
          explicitNoService: false
        };
      }
      const placeholderKey = keys.find((candidate) => Array.isArray(schedules[candidate]) && schedules[candidate].length) || "";
      return {
        key: placeholderKey,
        variants: [],
        explicitNoService: Boolean(placeholderKey)
      };
    }

    function normalizeScheduleBound(value) {
      const text = String(value || "").trim().toUpperCase();
      if (text === "INBOUND") return "I";
      if (text === "OUTBOUND") return "O";
      return ["I", "O"].includes(text) ? text : "";
    }

    function normalizeScheduleText(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g, "");
    }

    function scheduledTransitWindow(segment, date) {
      const variants = routeScheduleVariants(segment);
      if (!variants.length) return null;
      const moments = hongKongServiceMoments(date);
      let best = null;
      variants.forEach((variant) => {
        scheduleWindows(variant).forEach((window) => {
          const rule = state.routeShapeManifest?.serviceCalendar?.[window[0]];
          if (!rule) return;
          moments.forEach((moment) => {
            if (!serviceRunsOnDate(rule, moment)) return;
            const start = Number(window[1]);
            const end = Number(window[2]);
            const headway = Number(window[3]) || 0;
            if (!Number.isFinite(start) || !Number.isFinite(end)) return;
            const secondsUntilStart = start - moment.seconds;
            const withinWindow = moment.seconds >= start && moment.seconds <= end;
            const startingSoon = secondsUntilStart >= 0 && secondsUntilStart <= 2700;
            if (!withinWindow && !startingSoon) return;
            const waitMinutes = startingSoon
              ? Math.ceil(secondsUntilStart / 60)
              : headway > 0 ? Math.max(1, Math.ceil(headway / 120)) : 0;
            if (!best || waitMinutes < best.waitMinutes) {
              best = { waitMinutes, serviceId: window[0], headwaySeconds: headway };
            }
          });
        });
      });
      return best;
    }

    function hongKongServiceMoments(date) {
      const current = hongKongClock(date);
      const previous = hongKongClock(new Date(date.getTime() - 86400000));
      previous.seconds += 86400;
      return [current, previous];
    }

    function hongKongClock(date) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
      const weekdayIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[parts.weekday];
      return {
        dateKey: `${parts.year}${parts.month}${parts.day}`,
        weekdayIndex,
        seconds: Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)
      };
    }

    function serviceRunsOnDate(rule, moment) {
      const added = rule[3] || [];
      const removed = rule[4] || [];
      if (added.includes(moment.dateKey)) return true;
      if (removed.includes(moment.dateKey)) return false;
      const start = String(rule[1] || "");
      const end = String(rule[2] || "");
      if (start && moment.dateKey < start) return false;
      if (end && moment.dateKey > end) return false;
      return Boolean(Number(rule[0]) & (1 << moment.weekdayIndex));
    }

    function scheduleWindows(variant) {
      return (variant?.[3] || []).filter((window) => {
        const start = Number(window[1]);
        const end = Number(window[2]);
        const headway = Number(window[3]) || 0;
        if (![start, end, headway].every(Number.isFinite)) return false;
        return start !== 0 || end !== 0 || headway !== 0;
      });
    }

    function routeScheduleHasUsableWindow(key) {
      return (state.routeShapeManifest?.routeSchedules?.[key] || []).some((variant) => scheduleWindows(variant).length);
    }

    function normalizeBusPatterns(patterns, stops, fallbackProvider) {
      return patterns
        .flatMap((pattern, index) => {
          const base = {
            ...pattern,
            provider: pattern.provider || fallbackProvider,
            id: pattern.id || `${fallbackProvider.toLowerCase()}-${index}`,
            stops: (pattern.stopIds || []).map((id) => stops.get(id)).filter(Boolean)
          };
          const matches = tdPatternMatchesFor(base)
            .map((tdPattern) => ({ tdPattern, alignment: alignProviderStopsToTdPatternDetails(base.stops, tdPattern) }))
            .filter(({ alignment }) => alignment.strong);
          if (!matches.length) {
            const tdPattern = tdPatternFor(base);
            const provider = busProviderForTdPattern(base.provider, tdPattern);
            return [{
              ...base,
              provider,
              tdPattern,
              tdRouteId: tdPattern?.routeId || "",
              tdRouteSeq: tdPattern?.routeSeq || null,
              shapeProviderAlias: provider === "LWB" ? "KMB" : base.shapeProviderAlias || "",
              scheduleProviderAlias: provider === "LWB" ? "KMB" : base.scheduleProviderAlias || "",
              stops: alignProviderStopsToTdPattern(base.stops, tdPattern)
            }];
          }
          return matches.map(({ tdPattern, alignment }) => {
            const provider = busProviderForTdPattern(base.provider, tdPattern);
            return {
              ...base,
              provider,
              id: `${base.id}:td-${tdPattern.companyCode || tdPattern.provider || "bus"}-${tdPattern.routeId || tdPattern.routeSeq}-${tdPattern.routeSeq}`,
              tdPattern,
              tdRouteId: tdPattern.routeId || "",
              tdRouteSeq: tdPattern.routeSeq || null,
              shapeProviderAlias: provider === "LWB" ? "KMB" : base.shapeProviderAlias || "",
              scheduleProviderAlias: provider === "LWB" ? "KMB" : base.scheduleProviderAlias || "",
              stops: alignment.stops
            };
          });
        })
        .filter((pattern) => pattern.stops.length >= 2);
    }

    function alignProviderStopsToTdPattern(providerStops, tdPattern) {
      const alignment = alignProviderStopsToTdPatternDetails(providerStops, tdPattern);
      return alignment.strong ? alignment.stops : providerStops;
    }

    function alignProviderStopsToTdPatternDetails(providerStops, tdPattern) {
      const tdStops = tdPattern?.stops || [];
      if (providerStops.length < 2 || tdStops.length < 2) {
        return { stops: providerStops, providerCoverage: 0, officialCoverage: 0, strong: false };
      }
      const aligned = [];
      let previousTdIndex = -1;
      providerStops.forEach((stop) => {
        const stopName = compactText(stop.nameTc || stop.nameEn || stop.name || "");
        let best = null;
        tdStops.forEach((tdStop, tdIndex) => {
          if (tdIndex <= previousTdIndex) return;
          const tdPlace = { lat: Number(tdStop[1]), lng: Number(tdStop[2]) };
          if (!Number.isFinite(tdPlace.lat) || !Number.isFinite(tdPlace.lng)) return;
          const distance = haversine(stop, tdPlace);
          const tdName = compactText(tdStop[4] || "");
          const namesMatch = stopName && tdName && (stopName === tdName || stopName.includes(tdName) || tdName.includes(stopName));
          if (distance > TD_PATTERN_NEARBY_STOP_TOLERANCE && !(namesMatch && distance <= TD_PATTERN_STOP_TOLERANCE)) return;
          if (!best || distance < best.distance) best = { tdIndex, distance };
        });
        if (!best) return;
        aligned.push(stop);
        previousTdIndex = best.tdIndex;
      });
      const providerCoverage = aligned.length / providerStops.length;
      const officialCoverage = aligned.length / tdStops.length;
      return {
        stops: aligned,
        providerCoverage,
        officialCoverage,
        strong: aligned.length >= 2
          && (providerCoverage >= TD_PATTERN_MIN_STOP_COVERAGE || officialCoverage >= TD_PATTERN_MIN_STOP_COVERAGE)
      };
    }

    function busDirectCandidate(pattern, start, end, profile, originEntries, destinationEntries) {
      const origins = originEntries.map((item) => ({ ...item, access: item.distance }));
      const destinations = destinationEntries.map((item) => ({ ...item, egress: item.distance }));
      if (!origins.length || !destinations.length) return null;

      let best = null;
      origins.slice(0, 5).forEach((origin) => {
        destinations.slice(0, 7).forEach((destination) => {
          if (destination.index <= origin.index) return;
          const leg = busLeg(pattern, origin.index, destination.index, profile);
          if (!leg) return;
          const option = makeTransitOption({
            id: `bus-${pattern.provider}-${pattern.route}-${pattern.bound || ""}-${origin.index}-${destination.index}`,
            mode: "bus",
            title: `${leg.provider.label}接駁`,
            summaryMode: `${leg.provider.label}巴士`,
            label: leg.segment.label,
            start,
            end,
            accessPlace: leg.fromPlace,
            egressPlace: leg.toPlace,
            transitSegments: [leg.segment],
            fare: leg.fare,
            fareLabel: leg.fareLabel,
            fareProfileMatched: leg.fareProfileMatched,
            recommendation: `步行到「${leg.segment.fromName}」，乘搭${leg.segment.label}，在「${leg.segment.toName}」下車後步行到目的地。`,
            reasons: [`${leg.segment.label} 按真實巴士站序規劃，共 ${leg.segment.stops.length} 個站。`, "首尾步行會按步行路網重新計算。", "適合與港鐵、輕鐵方案比較候車、步行和轉乘負擔。"],
            cautions: ["巴士到站時間、低地台車輛和站位無障礙情況需出發前核對。", pattern.provider === "NLB" ? "嶼巴假日車費可能與平日不同。" : "車費會受分段收費和付款方式影響，出發前仍需核對。"],
            color: leg.provider.color,
            profile
          });
          if (!best || compareOptions(option, best, profile) < 0) best = option;
        });
      });
      return best;
    }

    function busTransferCandidates(originsByPattern, destinationsByPattern, start, end, profile, collectDiagnostics = false) {
      const legCache = new Map();
      const cachedBusLeg = (pattern, fromIndex, toIndex) => {
        let patternCache = legCache.get(pattern);
        if (!patternCache) {
          patternCache = new Map();
          legCache.set(pattern, patternCache);
        }
        const key = `${fromIndex}:${toIndex}`;
        if (!patternCache.has(key)) patternCache.set(key, busLeg(pattern, fromIndex, toIndex, profile));
        const leg = patternCache.get(key);
        return leg ? { ...leg, segment: { ...leg.segment } } : null;
      };
      const destinationGrid = new Map();
      destinationsByPattern.forEach((entries, pattern) => {
        const destinations = entries
          .map((item) => ({ ...item, egress: item.distance }))
          .slice(0, 3);
        destinations.forEach((destination) => {
          for (let boardIndex = 0; boardIndex < destination.index; boardIndex += 1) {
            const stop = pattern.stops[boardIndex];
            const key = busTransferGridKey(stop);
            if (!destinationGrid.has(key)) destinationGrid.set(key, []);
            destinationGrid.get(key).push({ pattern, boardIndex, destinationIndex: destination.index, stop });
          }
        });
      });

      const bestByLabel = new Map();
      let matches = 0;
      originsByPattern.forEach((entries, firstPattern) => {
        const origins = entries
          .map((item) => ({ ...item, access: item.distance }))
          .slice(0, 3);
        origins.forEach((origin) => {
          for (let alightIndex = origin.index + 1; alightIndex < firstPattern.stops.length; alightIndex += 1) {
            const firstAlight = firstPattern.stops[alightIndex];
            const firstLeg = cachedBusLeg(firstPattern, origin.index, alightIndex);
            if (!firstLeg) continue;
            nearbyTransferEntries(destinationGrid, firstAlight).forEach((second) => {
              if (second.pattern.id === firstPattern.id) return;
              const transferDistance = haversine(firstAlight, second.stop);
              if (transferDistance > MAX_BUS_TRANSFER_WALK) return;
              if (collectDiagnostics) matches += 1;
              const secondLeg = cachedBusLeg(second.pattern, second.boardIndex, second.destinationIndex);
              if (!secondLeg) return;
              const transferWalk = busTransferWalk(firstLeg.toPlace, secondLeg.fromPlace, profile);
              const fare = Number.isFinite(firstLeg.fare) && Number.isFinite(secondLeg.fare)
                ? firstLeg.fare + secondLeg.fare
                : null;
              const fareProfileMatched = firstLeg.fareProfileMatched && secondLeg.fareProfileMatched;
              const fareProduct = firstLeg.fareProduct && firstLeg.fareProduct === secondLeg.fareProduct
                ? firstLeg.fareProduct
                : "";
              const option = makeTransitOption({
                id: `bus-transfer-${firstPattern.id}-${origin.index}-${alightIndex}-${second.pattern.id}-${second.boardIndex}-${second.destinationIndex}`,
                mode: "bus",
                title: "巴士轉乘",
                summaryMode: "巴士轉乘",
                label: `${firstLeg.segment.label} → ${secondLeg.segment.label}`,
                start,
                end,
                accessPlace: firstLeg.fromPlace,
                egressPlace: secondLeg.toPlace,
                transitSegments: [firstLeg.segment, transferWalk, secondLeg.segment],
                fare,
                fareLabel: fareProfileMatched ? fareLabelForProfile(fare, true, profile, fareProduct) : fareUnavailableLabel(profile),
                fareProfileMatched,
                recommendation: `先乘搭${firstLeg.segment.label}到「${firstLeg.segment.toName}」，步行轉乘${secondLeg.segment.label}後前往目的地。`,
                reasons: ["兩段巴士均按真實站序規劃。", `轉乘站步行約 ${Math.round(transferDistance)} 米，會再按步行路網核對。`, "候車時間、轉乘負擔和兩段車費均進入排序。"],
                cautions: ["轉乘時請核對站位方向及下一班到站時間。", "車費未計算營辦商轉乘優惠，顯示值按兩段已知車費保守相加。"],
                color: firstLeg.provider.color,
                profile
              });
              const existing = bestByLabel.get(option.label);
              if (!existing || compareOptions(option, existing, profile) < 0) bestByLabel.set(option.label, option);
            });
          }
        });
      });
      if (collectDiagnostics) {
        const cachedBusLegs = [...legCache.values()].reduce((sum, cache) => sum + cache.size, 0);
        state.lastBusTransferDiagnostics = { matches, routePairs: bestByLabel.size, cachedBusLegs };
      }
      return [...bestByLabel.values()]
        .sort((a, b) => compareOptions(a, b, profile))
        .slice(0, 12);
    }

    function busLeg(pattern, fromIndex, toIndex, profile) {
      if (toIndex <= fromIndex) return null;
      const segmentStops = pattern.stops.slice(fromIndex, toIndex + 1);
      if (segmentStops.length < 2) return null;
      const providerGeometry = segmentStops.map((stop) => [stop.lat, stop.lng]);
      const tdGeometry = safeTdSegmentGeometry(pattern.tdPattern, segmentStops[0], segmentStops[segmentStops.length - 1], providerGeometry);
      const localPatternGeometry = Array.isArray(pattern.geometry) && pattern.geometry.length >= 2
        ? pattern.geometry
        : null;
      const provider = providerInfo(pattern.provider);
      const busDistance = segmentDistance(segmentStops);
      const stopCount = Math.max(0, segmentStops.length - 2);
      const minutes = Math.ceil(busDistance / BUS_SPEED + stopCount * 0.45 + 2);
      const fareDetails = busFareDetails(pattern, segmentStops[0], profile);
      return {
        provider,
        fromPlace: stopPlace(segmentStops[0]),
        toPlace: stopPlace(segmentStops[segmentStops.length - 1]),
        fare: fareDetails.value,
        fareLabel: fareDetails.label || (fareDetails.profileMatched
          ? fareLabelForProfile(fareDetails.value, pattern.provider !== "MTRB", profile, fareDetails.product)
          : fareUnavailableLabel(profile)),
        fareProfileMatched: fareDetails.profileMatched,
        fareProduct: fareDetails.product || "",
        segment: {
          mode: "bus",
          label: `${provider.label} ${pattern.route}`,
          routeNo: pattern.route,
          provider: pattern.provider,
          providerLabel: provider.label,
          serviceType: pattern.serviceType || "1",
          routeId: pattern.routeId || "",
          tdRouteId: pattern.tdRouteId || "",
          tdRouteSeq: pattern.tdRouteSeq || null,
          bound: pattern.bound || "",
          scheduleProviderAlias: pattern.scheduleProviderAlias || "",
          shapeProviderAlias: pattern.shapeProviderAlias || "",
          stopId: segmentStops[0].id,
          destination: pattern.destTc || pattern.dest || pattern.destination || pattern.destinationEn || stopName(pattern.stops?.[pattern.stops.length - 1]),
          destinationEn: pattern.destEn || pattern.destinationEn || "",
          fromName: stopName(segmentStops[0]),
          toName: stopName(segmentStops[segmentStops.length - 1]),
          fromNameEn: segmentStops[0].nameEn || "",
          toNameEn: segmentStops[segmentStops.length - 1].nameEn || "",
          stops: segmentStops.map(stopName),
          stopsEn: segmentStops.map((stop) => stop.nameEn || ""),
          geometry: tdGeometry || providerGeometry,
          geometrySource: tdGeometry ? "td-stop-sequence" : "provider-stop-sequence",
          localPatternGeometry,
          localPatternGeometrySource: pattern.geometrySource || "",
          minutes,
          color: provider.color
        }
      };
    }

    function busTransferWalk(from, to, profile) {
      const distance = Math.max(20, haversine(from, to) * 1.15);
      return {
        mode: "walk",
        label: `步行轉乘至 ${to.name}`,
        from,
        to,
        fromName: from.name,
        toName: to.name,
        geometry: [[from.lat, from.lng], [to.lat, to.lng]],
        distance,
        minutes: Math.max(1, Math.round(distance / profile.walkSpeed)),
        color: COLORS.walk,
        routed: false
      };
    }

    function busTransferGridKey(stop) {
      return `${Math.floor(stop.lat / BUS_TRANSFER_GRID_SIZE)}:${Math.floor(stop.lng / BUS_TRANSFER_GRID_SIZE)}`;
    }

    function nearbyTransferEntries(grid, stop) {
      const latCell = Math.floor(stop.lat / BUS_TRANSFER_GRID_SIZE);
      const lngCell = Math.floor(stop.lng / BUS_TRANSFER_GRID_SIZE);
      const entries = [];
      for (let latOffset = -1; latOffset <= 1; latOffset += 1) {
        for (let lngOffset = -1; lngOffset <= 1; lngOffset += 1) {
          entries.push(...(grid.get(`${latCell + latOffset}:${lngCell + lngOffset}`) || []));
        }
      }
      return entries;
    }

    function nearbyBusPatternStops(place, maxDistance, eligiblePatterns, role) {
      const byPattern = new Map();
      if (!place || !state.busStopGrid.size) return byPattern;
      const latCell = Math.floor(place.lat / BUS_TRANSFER_GRID_SIZE);
      const lngCell = Math.floor(place.lng / BUS_TRANSFER_GRID_SIZE);
      const latRadius = Math.ceil(maxDistance / (111320 * BUS_TRANSFER_GRID_SIZE)) + 1;
      const lngMeters = Math.max(1, Math.cos(place.lat * Math.PI / 180) * 111320 * BUS_TRANSFER_GRID_SIZE);
      const lngRadius = Math.ceil(maxDistance / lngMeters) + 1;
      for (let latOffset = -latRadius; latOffset <= latRadius; latOffset += 1) {
        for (let lngOffset = -lngRadius; lngOffset <= lngRadius; lngOffset += 1) {
          const entries = state.busStopGrid.get(`${latCell + latOffset}:${lngCell + lngOffset}`) || [];
          entries.forEach((entry) => {
            if (!eligiblePatterns.has(entry.pattern)) return;
            if (role === "origin" && entry.index >= entry.pattern.stops.length - 1) return;
            if (role === "destination" && entry.index <= 0) return;
            const distance = haversine(place, entry.stop);
            if (distance > maxDistance) return;
            if (!byPattern.has(entry.pattern)) byPattern.set(entry.pattern, []);
            byPattern.get(entry.pattern).push({ stop: entry.stop, index: entry.index, distance });
          });
        }
      }
      byPattern.forEach((entries) => entries.sort((a, b) => a.distance - b.distance));
      return byPattern;
    }

    function makeTransitOption(config) {
      const startPlace = placeFrom(config.start);
      const endPlace = placeFrom(config.end);
      const needsAccessWalk = !isSameTransitPlace(startPlace, config.accessPlace);
      const needsEgressWalk = !isSameTransitPlace(endPlace, config.egressPlace);
      const accessWalk = {
        mode: "walk",
        label: `步行至 ${config.accessPlace.name}`,
        from: startPlace,
        to: config.accessPlace,
        fromName: config.start.name,
        toName: config.accessPlace.name,
        fromNameEn: config.start.nameEn || "",
        toNameEn: config.accessPlace.nameEn || "",
        color: COLORS.walk
      };
      const egressWalk = {
        mode: "walk",
        label: `由 ${config.egressPlace.name} 步行至目的地`,
        from: config.egressPlace,
        to: endPlace,
        fromName: config.egressPlace.name,
        toName: config.end.name,
        fromNameEn: config.egressPlace.nameEn || "",
        toNameEn: config.end.nameEn || "",
        color: COLORS.walk,
        fromMtrExit: config.selectedEgressExit || null,
        mtrExitStatus: config.mtrExitStatus || ""
      };
      const transitSegments = config.transitSegments || [];
      const finalMtrIndex = findLastIndex(transitSegments, (segment) => segment.mode === "mtr");
      if (config.egressMtrStation && finalMtrIndex >= 0) {
        transitSegments[finalMtrIndex].alightingExit = config.selectedEgressExit || null;
        transitSegments[finalMtrIndex].alightingExitStatus = config.mtrExitStatus || "station-centroid-fallback";
        transitSegments[finalMtrIndex].alightingStationCode = config.egressMtrStation.code;
      }
      const segments = [
        ...(needsAccessWalk ? [accessWalk] : []),
        ...transitSegments,
        ...(needsEgressWalk ? [egressWalk] : [])
      ];
      const roughWalk = (needsAccessWalk ? haversine(config.start, config.accessPlace) : 0)
        + (needsEgressWalk ? haversine(config.egressPlace, config.end) : 0);
      const transitMinutes = transitSegments.reduce((sum, segment) => sum + (segment.minutes || 0), 0);
      const minutes = Math.max(1, Math.round(roughWalk / config.profile.walkSpeed + transitMinutes));
      return {
        id: config.id,
        mode: config.mode,
        title: config.title,
        summaryMode: config.summaryMode,
        label: config.label,
        distance: roughWalk,
        walkDistance: roughWalk,
        minutes,
        fare: config.fare,
        fareLabel: config.fareLabel || "車費待查",
        fareProfileMatched: config.fareProfileMatched !== false,
        geometry: [
          [config.start.lat, config.start.lng],
          [config.accessPlace.lat, config.accessPlace.lng],
          ...config.transitSegments.flatMap((segment) => segment.geometry || []),
          [config.egressPlace.lat, config.egressPlace.lng],
          [config.end.lat, config.end.lng]
        ],
        color: config.color,
        risk: roughWalk > 1300 ? { label: "需留意", className: "is-medium" } : { label: "可作比較", className: "is-low" },
        recommendation: config.recommendation,
        reasons: config.reasons,
        cautions: config.cautions,
        segments,
        egressExitCandidates: config.egressExitCandidates || [],
        selectedEgressExit: config.selectedEgressExit || null,
        mtrEgressStationCode: config.egressMtrStation?.code || "",
        mtrExitStatus: config.mtrExitStatus || ""
      };
    }

    function isSameTransitPlace(endpoint, transitPlace) {
      if (!endpoint || !transitPlace) return false;
      const endpointId = String(endpoint.id || "").toLowerCase();
      const transitId = String(transitPlace.id || "").toLowerCase();
      const transitCode = String(transitPlace.code || "").toLowerCase();
      const sameType = endpoint.type === transitPlace.type;
      if (sameType && transitId && (endpointId === transitId || endpointId.endsWith("-" + transitId))) return true;
      if (sameType && transitCode && (endpointId === transitCode || endpointId.endsWith("-" + transitCode))) return true;
      const distance = haversine(endpoint, transitPlace);
      if (distance <= 8) return true;
      return sameType && transitPlace.type !== "bus" && distance <= SAME_TRANSIT_PLACE_DISTANCE;
    }

    function finalizeOption(option) {
      const segmentGeometry = (option.segments || []).flatMap((segment) => segment.geometry || []);
      const geometry = compactGeometry((segmentGeometry.length ? segmentGeometry : option.geometry) || []);
      const timeline = buildTimeline({ ...option, geometry });
      return { ...option, geometry, timeline };
    }

    function buildTimeline(option) {
      let elapsed = 0;
      return (option.segments || []).map((segment, index) => {
        const startMinute = elapsed;
        elapsed += Math.max(0, Math.round(segment.minutes || 0));
        const color = segment.color || option.color || COLORS.walk;
        const ride = Math.max(1, Math.round(segment.rideMinutes || segment.minutes || 0));
        const wait = Number.isFinite(segment.waitMinutes) ? Math.max(0, Math.round(segment.waitMinutes)) : null;
        const stopCount = segment.stops && segment.stops.length > 1 ? Math.max(0, segment.stops.length - 1) : 0;
        const stopText = segment.mode === "walk"
          ? ""
          : `${wait === null ? "到站待查" : `候車約 ${wait} 分鐘`}，車程約 ${ride} 分鐘${stopCount ? `（${stopCount} 站）` : ""}`;
        return {
          key: `${option.id}-${index}`,
          mode: segment.mode,
          label: segment.label,
          routeNo: segment.routeNo || "",
          providerLabel: segment.providerLabel || "",
          destination: segment.destination || "",
          fromName: segment.fromName || "",
          toName: segment.toName || "",
          distance: segment.mode === "walk" ? segment.distance : null,
          minutes: Math.max(1, Math.round(segment.minutes || 0)),
          startMinute,
          color,
         meta: segment.mode === "walk" ? `${formatDistance(segment.distance || 0)}，約 ${Math.max(1, Math.round(segment.minutes || 0))} 分鐘` : stopText,
          destinationEn: segment.destinationEn || "",
          fromNameEn: segment.fromNameEn || "",
          toNameEn: segment.toNameEn || "",
          stopsEn: segment.stopsEn || [],
          waitMinutes: wait,
          rideMinutes: ride,
          stopCount,
          metrics: segment.metrics || null,
          operationConfidence: segment.operationConfidence || "",
          etaConfirmed: Boolean(segment.etaConfirmed),
          etaChecked: Boolean(segment.etaChecked),
          metaDetail: segment.mode === "walk" ? walkMetricText(segment.metrics) : "",
          etaTime: segment.etaTime || "",
          etaStatus: segment.etaStatus || "",
          stops: segment.stops || [],
          alightingExit: segment.alightingExit || null,
          alightingExitStatus: segment.alightingExitStatus || "",
          alightingStationCode: segment.alightingStationCode || "",
          fromMtrExit: segment.fromMtrExit || null,
          mtrExitStatus: segment.mtrExitStatus || ""
        };
      });
    }

    function shortWalkInterchange(from, to, label) {
      const distance = Math.max(80, haversine(from, to) * 1.25);
      return {
        mode: "walk",
        label,
        from,
        to,
        fromName: from.name,
        toName: to.name,
        geometry: [[from.lat, from.lng], [to.lat, to.lng]],
        distance,
        minutes: Math.max(2, Math.round(distance / 45)),
        color: COLORS.walk,
        routed: false
      };
    }


    function applyEstimatedTransitOperations(option, departureDate, useLiveEta, ignoreSchedule = false) {
      for (const segment of option.segments || []) {
        if (segment.mode === "bus") applyTransitEstimate(segment, 6, ignoreSchedule ? "全部路線模式按一般候車時間估算" : useLiveEta ? "正在查詢巴士即時到站" : "計劃時間按本地班次或候車估算", departureDate, ignoreSchedule);
        if (segment.mode === "mtr") applyTransitEstimate(segment, 3, ignoreSchedule ? "全部路線模式按一般候車時間估算" : useLiveEta ? "正在查詢港鐵即時到站" : "計劃時間按本地班次或候車估算", departureDate, ignoreSchedule);
        if (segment.mode === "lightRail") applyTransitEstimate(segment, 5, ignoreSchedule ? "全部路線模式按一般候車時間估算" : useLiveEta ? "正在查詢輕鐵即時到站" : "計劃時間不提供即時到站，候車先按約 5 分鐘估算", departureDate, ignoreSchedule);
      }
      updateOptionMinutes(option);
      return option;
    }

    function updateOptionMinutes(option) {
      option.minutes = Math.max(1, Math.round((option.segments || [])
        .reduce((sum, segment) => sum + (Number(segment.minutes) || 0), 0)));
      return option;
    }

    function applyTransitEstimate(segment, fallbackWait, status, departureDate, ignoreSchedule = false) {
      const scheduled = ignoreSchedule ? null : scheduledTransitWindow(segment, departureDate);
      if (scheduled) {
        fallbackWait = scheduled.waitMinutes;
        status = "\u6309\u672c\u5730\u6642\u523b\u8868\u4f30\u7b97\u5019\u8eca\u6642\u9593";
        segment.operationConfidence = "scheduled";
      } else {
        segment.operationConfidence = "unknown";
      }
      segment.rideMinutes = segment.rideMinutes || segment.minutes || 1;
      segment.waitMinutes = Number.isFinite(segment.waitMinutes) ? segment.waitMinutes : fallbackWait;
      segment.etaStatus = segment.etaStatus || status;
      segment.minutes = segment.rideMinutes + segment.waitMinutes;
    }

    async function enrichTransitOperations(option, useLiveEta) {
      if (!useLiveEta) return updateOptionMinutes(option);
      await Promise.all((option.segments || []).map(async (segment) => {
        if (segment.mode === "bus") await enrichBusSegment(segment);
        if (segment.mode === "mtr") await enrichMtrSegment(segment);
        if (segment.mode === "lightRail") await enrichLightRailSegment(segment);
      }));
      updateOptionMinutes(option);
      return option;
    }

    async function enrichBusSegment(segment) {
      segment.rideMinutes = segment.rideMinutes || segment.minutes || 1;
      segment.etaChecked = true;
      const eta = await fetchBusEta(segment);
      segment.etaConfirmed = Boolean(eta);
      if (eta && Number.isFinite(eta.waitMinutes)) {
        segment.operationConfidence = "live";
        segment.waitMinutes = eta.waitMinutes;
        segment.etaTime = eta.timeLabel;
        segment.etaStatus = eta.remark || "即時到站";
      } else {
        const source = segment.operationConfidence === "scheduled" ? "本地班次" : "估算";
        segment.etaStatus = `未能讀取巴士即時到站，候車按${source}`;
      }
      segment.minutes = segment.rideMinutes + (Number.isFinite(segment.waitMinutes) ? segment.waitMinutes : 0);
    }

    async function enrichMtrSegment(segment) {
      segment.rideMinutes = segment.rideMinutes || segment.minutes || 1;
      segment.etaChecked = true;
      const eta = await fetchMtrEta(segment.line, segment.fromCode, segment.toCode);
      segment.etaConfirmed = Boolean(eta);
      if (eta && Number.isFinite(eta.waitMinutes)) {
        segment.operationConfidence = "live";
        segment.waitMinutes = eta.waitMinutes;
        segment.etaTime = eta.timeLabel;
        segment.etaStatus = "港鐵即時到站";
      } else {
        const source = segment.operationConfidence === "scheduled" ? "本地班次" : "估算";
        segment.etaStatus = `未能讀取港鐵即時到站，候車按${source}`;
      }
      segment.minutes = segment.rideMinutes + (Number.isFinite(segment.waitMinutes) ? segment.waitMinutes : 0);
    }

    async function enrichLightRailSegment(segment) {
      segment.rideMinutes = segment.rideMinutes || segment.minutes || 1;
      segment.etaChecked = true;
      const eta = await fetchLightRailEta(
        segment.stationId || segment.fromCode,
        segment.routeNo,
        lightRailTerminalNames(segment)
      );
      segment.etaConfirmed = Boolean(eta);
      if (eta && Number.isFinite(eta.waitMinutes)) {
        segment.operationConfidence = "live";
        segment.waitMinutes = eta.waitMinutes;
        segment.etaTime = eta.timeLabel;
        segment.etaStatus = eta.remark || "輕鐵即時到站";
      } else {
        segment.waitMinutes = Number.isFinite(segment.waitMinutes) ? segment.waitMinutes : 5;
        segment.etaStatus = "未能讀取輕鐵即時到站，候車先按約 5 分鐘估算";
      }
      segment.minutes = segment.rideMinutes + segment.waitMinutes;
    }

    async function fetchBusEta(segment) {
      if (!segment.provider || !segment.stopId || !segment.routeNo) return null;
      const cacheKey = `bus:${segment.provider}:${segment.stopId}:${segment.routeNo}:${segment.serviceType || ""}:${segment.routeId || ""}`;
      return cachedEta(cacheKey, async () => {
        try {
          let data;
          if (segment.provider === "KMB" || segment.provider === "LWB") {
            data = await fetchJson(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${encodeURIComponent(segment.stopId)}/${encodeURIComponent(segment.routeNo)}/${encodeURIComponent(segment.serviceType || "1")}`, ETA_FETCH_TIMEOUT_MS);
            return etaFromIsoList((data.data || []).map((item) => ({ eta: item.eta, remark: item.rmk_tc })));
          }
          if (segment.provider === "CTB") {
            data = await fetchJson(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${encodeURIComponent(segment.stopId)}/${encodeURIComponent(segment.routeNo)}`, ETA_FETCH_TIMEOUT_MS);
            return etaFromIsoList((data.data || []).map((item) => ({ eta: item.eta, remark: item.rmk_tc })));
          }
          if (segment.provider === "NLB" && segment.routeId) {
            data = await fetchJson(`https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=estimatedArrivals&routeId=${encodeURIComponent(segment.routeId)}&stopId=${encodeURIComponent(segment.stopId)}`, ETA_FETCH_TIMEOUT_MS);
            return etaFromIsoList((data.estimatedArrivals || []).map((item) => ({ eta: item.estimatedArrivalTime ? `${item.estimatedArrivalTime}+08:00` : "", remark: item.noGPS === "1" ? "預定班次" : "即時到站" })));
          }
        } catch (error) {
          console.warn("ETA unavailable:", error.message);
        }
        return null;
      });
    }

    async function fetchMtrEta(line, stationCode, destinationCode) {
      if (!line || !stationCode) return null;
      const cacheKey = `mtr:${line}:${stationCode}:${destinationCode || ""}`;
      return cachedEta(cacheKey, async () => {
        try {
          const data = await fetchJson(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${encodeURIComponent(line)}&sta=${encodeURIComponent(stationCode)}`, ETA_FETCH_TIMEOUT_MS);
          const bucket = data.data?.[`${line}-${stationCode}`];
          const trains = [...(bucket?.UP || []), ...(bucket?.DOWN || [])]
            .filter((item) => item.valid !== "N")
            .filter((item) => mtrEtaServesDestination(line, stationCode, destinationCode, item.dest))
            .map((item) => ({ eta: item.time, remark: item.dest ? `往 ${item.dest}` : "" }));
          return etaFromIsoList(trains);
        } catch (error) {
          console.warn("MTR ETA unavailable:", error.message);
          return null;
        }
      });
    }

    function mtrEtaServesDestination(lineCode, fromCode, toCode, terminalCode) {
      if (!toCode || !terminalCode) return true;
      const line = (state.mtr?.lines || []).find((item) => item.code === lineCode);
      const stations = line?.stations || [];
      const fromIndex = stations.indexOf(fromCode);
      const toIndex = stations.indexOf(toCode);
      const terminalIndex = stations.indexOf(terminalCode);
      if (fromIndex < 0 || toIndex < 0 || terminalIndex < 0 || fromIndex === toIndex) return true;
      return toIndex > fromIndex ? terminalIndex >= toIndex : terminalIndex <= toIndex;
    }

    async function refineTransitGeometry(option) {
      for (const segment of option.segments || []) {
        if (!segment.geometry || segment.geometry.length < 2 || segment.mode === "walk") continue;
        const routeShape = await transitRouteShapeGeometry(segment);
        if (routeShape) {
          segment.geometry = routeShape.geometry;
          segment.geometrySource = routeShape.shapeId.startsWith("CSDI-FB-")
            ? "official-csdi-fb-route-line"
            : "local-transit-route-shape";
          segment.geometryShapeId = routeShape.shapeId;
          delete segment.localPatternGeometry;
          delete segment.localPatternGeometrySource;
          continue;
        }
        if (segment.mode === "bus") {
          if (segment.localPatternGeometry) {
            const clean = compactGeometry(segment.geometry || []);
            const sliced = sliceRouteShape(
              segment.localPatternGeometry,
              clean[0],
              clean[clean.length - 1],
              500,
              geometryDistance(clean),
              "bus"
            );
            if (sliced?.geometry) {
              segment.geometry = sliced.geometry;
              segment.geometrySource = segment.localPatternGeometrySource || "local-road-routed-official-stop-sequence";
            }
          }
          delete segment.localPatternGeometry;
          delete segment.localPatternGeometrySource;
          segment.geometry = downsampleGeometry(densifyGeometry(segment.geometry, 180), 1200);
          segment.geometrySource = segment.geometrySource || "official-stop-sequence";
        } else if (segment.mode === "mtr") {
          const shaped = railRouteGeometry(segment);
          segment.geometry = shaped?.geometry || densifyGeometry(segment.geometry, 420);
          segment.geometrySource = shaped?.complete ? "line-filtered-railway-geometry" : shaped?.partial ? "mixed-line-filtered-railway-and-station-sequence" : "official-station-sequence";
        } else if (segment.mode === "lightRail") {
          segment.geometry = densifyGeometry(segment.geometry, 140);
          segment.geometrySource = "official-stop-sequence";
        } else {
          segment.geometry = densifyGeometry(segment.geometry, 420);
        }
      }
      return option;
    }

    async function transitRouteShapeGeometry(segment) {
      const key = routeShapeKeys(segment).find((candidate) => state.routeShapeManifest?.routes?.[candidate]) || "";
      const filename = key ? state.routeShapeManifest?.routes?.[key] : "";
      if (!filename) return null;
      let bucketPromise = state.routeShapeBuckets.get(filename);
      if (!bucketPromise) {
        bucketPromise = window.MapableRouteData.loadRouteShapeBucket(filename).catch((error) => {
          state.routeShapeBuckets.delete(filename);
          console.warn("Route shape bucket unavailable:", error.message);
          return null;
        });
        state.routeShapeBuckets.set(filename, bucketPromise);
      }
      const bucket = await bucketPromise;
      const entries = bucket?.routes?.[key] || [];
      if (!entries.length) return null;
      const clean = compactGeometry(segment.geometry || []);
      const from = clean[0];
      const to = clean[clean.length - 1];
      const baseline = geometryDistance(clean);
      const snapLimit = segment.mode === "bus" ? 450 : segment.mode === "lightRail" ? 260 : 900;
      let best = null;
      const officialEntries = entries.filter((entry) => String(entry?.[0] || "").startsWith("CSDI-FB-"));
      const fallbackEntries = entries.filter((entry) => !String(entry?.[0] || "").startsWith("CSDI-FB-"));
      const tdRouteId = String(segment.tdRouteId || "");
      const tdRouteSeq = Number(segment.tdRouteSeq);
      const officialPrefix = tdRouteId
        ? `CSDI-FB-${tdRouteId}${Number.isFinite(tdRouteSeq) ? `-${tdRouteSeq}` : ""}-`
        : "";
      const entryGroups = [
        tdRouteId
          ? officialEntries.filter((entry) => String(entry?.[0] || "").startsWith(officialPrefix))
          : officialEntries,
        fallbackEntries
      ].filter((group) => group.length);
      for (const group of entryGroups) {
        let groupBest = null;
        group.forEach((entry) => {
          const points = decodeRouteShape(entry);
          const sliced = sliceRouteShape(points, from, to, snapLimit, baseline, segment.mode);
          if (sliced && (!groupBest || sliced.score < groupBest.score)) groupBest = { ...sliced, shapeId: entry[0] };
        });
        if (groupBest) {
          best = groupBest;
          break;
        }
      }
      if (!best) return null;
      return {
        shapeId: best.shapeId,
        geometry: downsampleGeometry(compactGeometry([from, ...best.geometry, to]), 1800)
      };
    }

    function transitDataKeys(segment, aliasField) {
      if (segment.mode === "bus") {
        const provider = String(segment.provider || "").toUpperCase();
        const route = normalizeRouteNo(segment.routeNo);
        const keys = [[provider, route].join(":")];
        const alias = String(segment[aliasField] || "").toUpperCase();
        if (alias && alias !== provider) keys.push([alias, route].join(":"));
        return keys;
      }
      if (segment.mode === "mtr") return [["MTR", String(segment.line || "").toUpperCase()].join(":")];
      if (segment.mode === "lightRail") return [["LR", normalizeRouteNo(segment.routeNo)].join(":")];
      return [];
    }

    function routeShapeKeys(segment) {
      return transitDataKeys(segment, "shapeProviderAlias");
    }

    function routeScheduleKeys(segment) {
      return transitDataKeys(segment, "scheduleProviderAlias");
    }

    function localBusShapeKey(pattern) {
      return routeShapeKeys({ mode: "bus", provider: pattern.provider, routeNo: pattern.route, shapeProviderAlias: pattern.shapeProviderAlias })
        .find((candidate) => state.routeShapeManifest?.routes?.[candidate]) || "";
    }

    function decodeRouteShape(entry) {
      const shapeId = entry?.[0] || "";
      if (state.routeShapeDecoded.has(shapeId)) return state.routeShapeDecoded.get(shapeId);
      const encoded = entry?.[3] || "";
      const points = [];
      let index = 0;
      let lat = 0;
      let lng = 0;
      while (index < encoded.length) {
        const latitude = decodePolylineValue(encoded, index);
        index = latitude.index;
        const longitude = decodePolylineValue(encoded, index);
        index = longitude.index;
        lat += latitude.value;
        lng += longitude.value;
        points.push([lat / 100000, lng / 100000]);
      }
      state.routeShapeDecoded.set(shapeId, points);
      return points;
    }

    function decodePolylineValue(encoded, startIndex) {
      let index = startIndex;
      let result = 0;
      let shift = 0;
      let byte = 0;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      return { value: result & 1 ? ~(result >> 1) : result >> 1, index };
    }

    function sliceRouteShape(points, from, to, snapLimit, baseline, mode) {
      if (!points || points.length < 2) return null;
      const starts = nearestShapePositions(points, from, 7).filter((item) => item.distance <= snapLimit);
      const ends = nearestShapePositions(points, to, 7).filter((item) => item.distance <= snapLimit);
      if (!starts.length || !ends.length) return null;
      const loop = haversine(pointPlace(points[0]), pointPlace(points[points.length - 1])) <= 500;
      let best = null;
      starts.forEach((start) => {
        ends.forEach((end) => {
          let geometry = null;
          if (end.index > start.index || (end.index === start.index && end.ratio > start.ratio)) {
            geometry = [start.point, ...points.slice(start.index + 1, end.index + 1), end.point];
          } else if (loop && (end.index !== start.index || end.ratio !== start.ratio)) {
            geometry = [start.point, ...points.slice(start.index + 1), ...points.slice(1, end.index + 1), end.point];
          }
          if (!geometry || geometry.length < 2) return;
          const distance = geometryDistance(geometry);
          const multiplier = mode === "bus" ? 2.8 : 2.25;
          const allowance = mode === "bus" ? 4500 : 3000;
          if (baseline > 0 && distance > baseline * multiplier + allowance) return;
          const score = start.distance + end.distance + Math.abs(distance - baseline) * 0.02;
          if (!best || score < best.score) best = { geometry, score, distance };
        });
      });
      return best;
    }

    function nearestShapePositions(points, target, limit) {
      const candidates = [];
      for (let index = 0; index < points.length - 1; index += 1) {
        const projected = projectToSegment(points[index], points[index + 1], target);
        candidates.push({ index, ...projected });
      }
      return candidates.sort((left, right) => left.distance - right.distance).slice(0, limit);
    }

    function projectToSegment(start, end, target) {
      const targetPoint = Array.isArray(target) ? target : [Number(target.lat), Number(target.lng)];
      const meanLat = ((Number(start[0]) + Number(end[0]) + Number(targetPoint[0])) / 3) * Math.PI / 180;
      const scaleX = Math.cos(meanLat);
      const dx = (Number(end[1]) - Number(start[1])) * scaleX;
      const dy = Number(end[0]) - Number(start[0]);
      const px = (Number(targetPoint[1]) - Number(start[1])) * scaleX;
      const py = Number(targetPoint[0]) - Number(start[0]);
      const lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared)) : 0;
      const point = [
        Number(start[0]) + (Number(end[0]) - Number(start[0])) * ratio,
        Number(start[1]) + (Number(end[1]) - Number(start[1])) * ratio
      ];
      return { point, ratio, distance: haversine(pointPlace(point), pointPlace(targetPoint)) };
    }

    async function roadRouteGeometry(points) {
      const clean = compactGeometry(points).slice(0, 90);
      if (clean.length < 2) return null;
      const key = clean.map((point) => `${point[0].toFixed(5)},${point[1].toFixed(5)}`).join(";");
      if (state.roadGeometryCache.has(key)) return state.roadGeometryCache.get(key);
      const promise = (async () => {
        try {
          const coords = clean.map((point) => `${point[1]},${point[0]}`).join(";");
          const data = await fetchJson(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=false`, ROAD_GEOMETRY_TIMEOUT_MS);
          const route = data.routes?.[0]?.geometry?.coordinates;
          return route ? downsampleGeometry(route.map((point) => [point[1], point[0]]), 1200) : null;
        } catch (error) {
          console.warn("Road geometry unavailable:", error.message);
          return null;
        }
      })();
      state.roadGeometryCache.set(key, promise);
      return promise;
    }
    async function fetchLightRailEta(stationId, routeNo, terminalNames = []) {
      if (!stationId || !routeNo) return null;
      const terminalKey = terminalNames.map(normalizeScheduleText).filter(Boolean).join("|");
      const cacheKey = `lrt:${stationId}:${routeNo}:${terminalKey}`;
      return cachedEta(cacheKey, async () => {
        try {
          const data = await fetchJson(`https://rt.data.gov.hk/v1/transport/mtr/lrt/getSchedule?station_id=${encodeURIComponent(stationId)}&with_special=1`, ETA_FETCH_TIMEOUT_MS);
          return selectLightRailArrival(data, routeNo, terminalNames);
        } catch (error) {
          console.warn("Light Rail ETA unavailable:", error.message);
          return null;
        }
      });
    }

    function cachedEta(cacheKey, loader) {
      const now = Date.now();
      const cached = state.etaCache.get(cacheKey);
      if (cached && cached.expiresAt > now) return cached.promise;
      if (cached) state.etaCache.delete(cacheKey);
      const entry = {
        expiresAt: now + ETA_FETCH_TIMEOUT_MS + 1000,
        promise: null
      };
      entry.promise = Promise.resolve()
        .then(loader)
        .then((value) => {
          entry.expiresAt = Date.now() + (value ? ETA_CACHE_SUCCESS_TTL_MS : ETA_CACHE_FAILURE_TTL_MS);
          return value;
        }, (error) => {
          entry.expiresAt = Date.now() + ETA_CACHE_FAILURE_TTL_MS;
          throw error;
        });
      state.etaCache.set(cacheKey, entry);
      return entry.promise;
    }

    function lightRailTerminalNames(segment) {
      const route = normalizeRouteNo(segment.routeNo);
      const patterns = (state.lightRail?.patterns || []).filter((pattern) => normalizeRouteNo(pattern.route) === route);
      const matches = patterns.map((pattern) => {
        const stops = pattern.stopIds || [];
        const fromIndex = stops.indexOf(segment.fromCode);
        const toIndex = stops.indexOf(segment.toCode);
        return { pattern, stops, fromIndex, toIndex };
      }).filter((item) => item.fromIndex >= 0 && item.toIndex > item.fromIndex)
        .sort((left, right) => (left.toIndex - left.fromIndex) - (right.toIndex - right.fromIndex));
      const match = matches[0];
      if (!match) return [];
      const terminalCode = match.stops[match.stops.length - 1];
      const terminal = state.lightRailStops.get(terminalCode);
      return [
        terminal?.nameEn,
        terminal?.nameTc,
        terminal?.nameZh,
        match.pattern.destinationEn,
        match.pattern.destination,
        ...(match.stops[0] === terminalCode ? ["Circular", "循環綫", "循環線"] : [])
      ].filter(Boolean);
    }

    function railRouteGeometry(segment) {
      const clean = compactGeometry(segment.geometry || []);
      const tags = railTagsForSegment(segment);
      if (clean.length < 2 || !tags.length) return null;
      const cacheKey = `${segment.mode}:${tags.join("|")}:${clean.map((point) => pointKey(point)).join(";")}`;
      if (state.railGeometryCache.has(cacheKey)) return state.railGeometryCache.get(cacheKey);
      const maxSnap = 2200;
      for (const tag of tags) {
        const bucket = state.railGeometryGraphs.get(tag);
        if (!bucket?.graph?.size || !bucket?.nodes?.size) continue;
        const output = [clean[0]];
        let shapedCount = 0;
        const totalSegments = clean.length - 1;
        for (let index = 1; index < clean.length; index += 1) {
          const shaped = railPathBetween(clean[index - 1], clean[index], maxSnap, bucket);
          if (shaped) {
            shapedCount += 1;
            appendGeometry(output, shaped);
          } else {
            appendGeometry(output, densifyGeometry([clean[index - 1], clean[index]], 420));
          }
        }
        const geometry = compactGeometry(output);
        if (shapedCount > 0 && geometry.length >= 2) {
          const result = { geometry, partial: shapedCount < totalSegments, complete: shapedCount === totalSegments, shapedCount, totalSegments };
          state.railGeometryCache.set(cacheKey, result);
          return result;
        }
      }
      state.railGeometryCache.set(cacheKey, null);
      return null;
    }

    function railTagsForSegment(segment) {
      if (segment.mode !== "mtr") return [];
      const line = String(segment.line || segment.routeNo || "").toUpperCase();
      return line && line !== "MTR" ? [line] : [];
    }

    function railPathBetween(fromPoint, toPoint, maxSnap, bucket) {
      const fromNode = nearestRailNode(fromPoint, maxSnap, bucket.nodes);
      const toNode = nearestRailNode(toPoint, maxSnap, bucket.nodes);
      if (!fromNode || !toNode) return null;
      if (fromNode.key === toNode.key) return [fromPoint, fromNode.point, toPoint];
      const path = railGraphPath(fromNode.key, toNode.key, bucket.graph);
      return path ? compactGeometry([fromPoint, fromNode.point, ...path, toNode.point, toPoint]) : null;
    }

    function nearestRailNode(point, maxDistance, nodes = state.railGeometryNodes) {
      let best = null;
      nodes.forEach((candidate, key) => {
        const distance = haversine(pointPlace(point), pointPlace(candidate));
        if (distance <= maxDistance && (!best || distance < best.distance)) best = { key, point: candidate, distance };
      });
      return best;
    }

    function railGraphPath(startKey, endKey, graph = state.railGeometryGraph) {
      const heap = new MinHeap();
      const distances = new Map([[startKey, 0]]);
      const previous = new Map();
      heap.push({ id: startKey, distance: 0 });
      while (heap.items.length) {
        const current = heap.pop();
        if (!current || current.distance !== distances.get(current.id)) continue;
        if (current.id === endKey) break;
        (graph.get(current.id) || []).forEach((edge) => {
          const next = current.distance + (edge.distance || 1);
          if (next < (distances.get(edge.to) ?? Infinity)) {
            distances.set(edge.to, next);
            previous.set(edge.to, { node: current.id, edge });
            heap.push({ id: edge.to, distance: next });
          }
        });
      }
      if (!previous.has(endKey)) return null;
      const edges = [];
      let cursor = endKey;
      while (cursor !== startKey) {
        const step = previous.get(cursor);
        if (!step) return null;
        edges.push(step.edge);
        cursor = step.node;
      }
      edges.reverse();
      const points = [];
      edges.forEach((edge) => appendGeometry(points, edge.points || []));
      return compactGeometry(points);
    }

    function appendGeometry(target, points) {
      (points || []).forEach((point) => {
        if (!target.length || target[target.length - 1][0] !== point[0] || target[target.length - 1][1] !== point[1]) target.push(point);
      });
    }

    function tdPatternFor(pattern) {
      return tdPatternMatchesFor(pattern)[0] || null;
    }

    function tdPatternMatchesFor(pattern) {
      const provider = tdProvider(pattern.provider);
      const route = normalizeRouteNo(pattern.route);
      const providerKeys = ["KMB", "LWB"].includes(provider) ? ["KMB", "LWB"] : [provider];
      const candidates = providerKeys.flatMap((candidateProvider) => state.tdBusRoutes.get(`${candidateProvider}:${route}`) || []);
      if (!candidates.length) return [];
      const boundSeq = routeSeqFor(pattern);
      const originText = compactText(pattern.originTc || pattern.origin || pattern.originEn || "");
      const destText = compactText(pattern.destTc || pattern.dest || pattern.destination || pattern.destinationEn || "");
      const directionMatches = boundSeq
        ? candidates.filter((candidate) => Number(candidate.routeSeq) === Number(boundSeq))
        : candidates;
      const pool = directionMatches.length ? directionMatches : candidates;
      return pool
        .map((candidate) => ({ candidate, score: tdPatternScore(candidate, boundSeq, originText, destText) }))
        .sort((a, b) => b.score - a.score)
        .map(({ candidate }) => candidate);
    }

    function tdPatternScore(candidate, boundSeq, originText, destText) {
      let score = 0;
      if (boundSeq && Number(candidate.routeSeq) === Number(boundSeq)) score += 6;
      const origin = compactText(candidate.originTc || candidate.originEn || "");
      const dest = compactText(candidate.destTc || candidate.destEn || "");
      if (originText && (origin.includes(originText) || originText.includes(origin))) score += 3;
      if (destText && (dest.includes(destText) || destText.includes(dest))) score += 4;
      if (candidate.serviceMode === "R") score += 1;
      return score;
    }

    function routeSeqFor(pattern) {
      const bound = String(pattern.bound || pattern.dir || pattern.direction || "").toUpperCase();
      if (["O", "OUT", "OUTBOUND", "1"].includes(bound)) return 1;
      if (["I", "IN", "INBOUND", "2"].includes(bound)) return 2;
      return Number.isFinite(Number(pattern.routeSeq)) ? Number(pattern.routeSeq) : null;
    }

    function tdSegmentGeometry(tdPattern, fromStop, toStop) {
      const stops = tdPattern?.stops || [];
      if (stops.length < 2 || !fromStop || !toStop) return null;
      const fromIndex = nearestTdStopIndex(stops, fromStop);
      const toIndex = nearestTdStopIndex(stops, toStop);
      if (fromIndex < 0 || toIndex <= fromIndex) return null;
      return stops.slice(fromIndex, toIndex + 1).map((stop) => [Number(stop[1]), Number(stop[2])]).filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
    }

    function safeTdSegmentGeometry(tdPattern, fromStop, toStop, providerGeometry) {
      const geometry = tdSegmentGeometry(tdPattern, fromStop, toStop);
      if (!geometry || geometry.length < 2) return null;
      const providerDistance = geometryDistance(providerGeometry);
      const tdDistance = geometryDistance(geometry);
      const startGap = haversine(pointPlace(geometry[0]), fromStop);
      const endGap = haversine(pointPlace(geometry[geometry.length - 1]), toStop);
      if (startGap > 260 || endGap > 260) return null;
      if (providerDistance > 0 && tdDistance > providerDistance * 2.35 + 1600) return null;
      if (maxGeometryJump(geometry) > 2600) return null;
      return geometry;
    }

    function geometryDistance(points) {
      const clean = compactGeometry(points || []);
      let total = 0;
      for (let index = 1; index < clean.length; index += 1) total += haversine(pointPlace(clean[index - 1]), pointPlace(clean[index]));
      return total;
    }

    function maxGeometryJump(points) {
      const clean = compactGeometry(points || []);
      let max = 0;
      for (let index = 1; index < clean.length; index += 1) max = Math.max(max, haversine(pointPlace(clean[index - 1]), pointPlace(clean[index])));
      return max;
    }

    function nearestTdStopIndex(stops, target) {
      let bestIndex = -1;
      let bestDistance = Infinity;
      stops.forEach((stop, index) => {
        const distance = haversine(target, { lat: Number(stop[1]), lng: Number(stop[2]) });
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestDistance <= 260 ? bestIndex : -1;
    }

    function tdProvider(provider) {
      const value = String(provider || "").toUpperCase();
      if (value === "NWFB") return "CTB";
      return value || "KMB";
    }

    function busProviderForTdPattern(provider, tdPattern) {
      const fallback = tdProvider(provider);
      const company = String(tdPattern?.companyCode || tdPattern?.provider || "").toUpperCase();
      if (["KMB", "LWB"].includes(fallback) && company === "LWB") return "LWB";
      return fallback;
    }

    function normalizeRouteNo(route) {
      return String(route || "").trim().toUpperCase();
    }

    function compactText(value) {
      return String(value || "").toUpperCase().replace(/[\s\-_,.()（）［］\[\]，。:：/]+/g, "");
    }

    function pointKey(point) {
      return `${Number(point[0]).toFixed(5)},${Number(point[1]).toFixed(5)}`;
    }

    function pointPlace(point) {
      return { lat: Number(point[0]), lng: Number(point[1]) };
    }

    function nearestStations(place, profile = null, includeExitCandidates = false) {
      return [...state.mtrStations.values()]
        .map((station) => {
          const stationDistance = haversine(place, station);
          const exitCandidates = includeExitCandidates ? mtrExitCandidates(station, place, profile) : [];
          const provisionalExit = exitCandidates[0] || null;
          const exitDistance = provisionalExit ? haversine(place, provisionalExit) : Infinity;
          if (includeExitCandidates && state.lastMtrExitDiagnostics) {
            state.lastMtrExitDiagnostics.shortlistedExitCount += exitCandidates.length;
          }
          return {
            station,
            distance: Math.min(stationDistance, exitDistance),
            stationDistance,
            exitCandidates,
            provisionalExit
          };
        })
        .sort((a, b) => a.distance - b.distance);
    }

    function mtrExitCandidates(station, destination, profile) {
      const resolvedProfile = window.MapableProfileService.resolve(profile?.travelProfile || profile?.id || "standard");
      return (state.mtrExitsByStation.get(station.code) || [])
        .map((exit) => ({
          exit,
          score: haversine(exit, destination) / (resolvedProfile.walkSpeed || WALK_SPEED)
            + mtrExitUncertaintyCost(exit, resolvedProfile)
        }))
        .sort((a, b) => a.score - b.score || a.exit.displayLabel.localeCompare(b.exit.displayLabel, "en", { numeric: true }))
        .slice(0, MAX_MTR_EGRESS_EXITS)
        .map(({ exit }) => exit);
    }

    function mtrEgressConfig(destination) {
      const exitCandidates = destination.exitCandidates || [];
      const selectedEgressExit = destination.provisionalExit || exitCandidates[0] || null;
      return {
        egressPlace: selectedEgressExit ? mtrExitPlace(selectedEgressExit) : stationPlace(destination.station),
        egressMtrStation: destination.station,
        egressExitCandidates: exitCandidates,
        selectedEgressExit,
        mtrExitStatus: selectedEgressExit?.confidence || "station-centroid-fallback"
      };
    }

    function mtrExitPlace(exit) {
      const name = exit.stationNameZh || exit.stationNameEn || exit.stationCode;
      return {
        id: exit.id,
        code: exit.stationCode,
        name: `${name}站 ${exit.displayLabel} 出口`,
        type: "mtrExit",
        lat: Number(exit.lat),
        lng: Number(exit.lng),
        mtrExit: exit
      };
    }

    function nearestLightRailStops(place) {
      return [...state.lightRailStops.values()]
        .map((stop) => ({ stop, distance: haversine(place, stop) }))
        .sort((a, b) => a.distance - b.distance);
    }

    function railPath(startCode, endCode) {
      const result = graphPath(state.mtrGraph, startCode, endCode);
      if (!result) return null;
      const stations = result.codes.map((code) => state.mtrStations.get(code)).filter(Boolean);
      const lines = [...new Set(result.edges.map((edge) => edge.line))];
      return {
        ...result,
        stations,
        lines,
        distance: result.edges.reduce((sum, edge) => sum + (edge.distance || haversine(state.mtrStations.get(edge.from), state.mtrStations.get(edge.to))), 0),
        transferCount: Math.max(0, lines.length - 1)
      };
    }

    function lightRailPath(startCode, endCode) {
      const result = graphPath(state.lightRailGraph, startCode, endCode, 8);
      if (!result) return null;
      const stops = result.codes.map((code) => state.lightRailStops.get(code)).filter(Boolean);
      const routes = [...new Set(result.edges.map((edge) => edge.route))];
      return {
        ...result,
        stops,
        routes,
        distance: result.edges.reduce((sum, edge) => sum + (edge.distance || 0), 0),
        transferCount: Math.max(0, routes.length - 1)
      };
    }

    function graphPath(graph, startCode, endCode, transferPenalty = 4) {
      const heap = new MinHeap();
      const startState = [startCode, ""].join("|");
      const distances = new Map([[startState, 0]]);
      const previous = new Map();
      let endState = null;
      heap.push({ id: startState, node: startCode, distance: 0, routeKey: "" });
      while (heap.items.length) {
        const current = heap.pop();
        if (!current || current.distance !== distances.get(current.id)) continue;
        if (current.node === endCode) {
          endState = current.id;
          break;
        }
        (graph.get(current.node) || []).forEach((edge) => {
          const routeKey = edge.routeKey || "";
          const transfer = current.routeKey && current.routeKey !== routeKey ? transferPenalty : 0;
          const next = current.distance + (edge.minutes || 1) + transfer;
          const nextState = [edge.to, routeKey].join("|");
          if (next < (distances.get(nextState) ?? Infinity)) {
            distances.set(nextState, next);
            previous.set(nextState, { from: current.id, edge });
            heap.push({ id: nextState, node: edge.to, distance: next, routeKey });
          }
        });
      }
      if (!endState || !previous.has(endState)) return null;
      const codes = [endCode];
      const edges = [];
      let cursor = endState;
      while (cursor !== startState) {
        const step = previous.get(cursor);
        if (!step) return null;
        edges.unshift(step.edge);
        cursor = step.from;
        codes.unshift(step.edge.from);
      }
      return { codes, edges, minutes: Math.ceil(distances.get(endState)) };
    }

    function railSegmentsFromPath(rail) {
      return groupEdges(rail.edges, "line").map((group) => {
        const line = group.key;
        const first = group.edges[0];
        const last = group.edges[group.edges.length - 1];
        const from = state.mtrStations.get(first.from);
        const to = state.mtrStations.get(last.to);
        const stationCodes = [first.from, ...group.edges.map((edge) => edge.to)];
        const stations = stationCodes.map((code) => state.mtrStations.get(code)).filter(Boolean);
        return {
          mode: "mtr",
          label: lineLabel(line),
          routeNo: lineLabel(line),
          destination: mtrDirectionTerminal(line, first.from, last.to),
          fromName: stationName(from),
          toName: stationName(to),
          fromNameEn: from?.nameEn || "",
          toNameEn: to?.nameEn || "",
          line,
          fromCode: from?.code || first.from,
          toCode: to?.code || last.to,
          stops: stations.map(stationName),
          stopsEn: stations.map((station) => station?.nameEn || ""),
          geometry: stations.map((station) => [station.lat, station.lng]),
          rideMinutes: Math.ceil(group.edges.reduce((sum, edge) => sum + (edge.minutes || 2), 0)),
          minutes: Math.ceil(group.edges.reduce((sum, edge) => sum + (edge.minutes || 2), 0)),
          color: MTR_LINE_COLORS[line] || "#1d4ed8"
        };
      });
    }

    function lightRailSegmentsFromPath(lightRail) {
      return groupEdges(lightRail.edges, "route").map((group) => {
        const route = group.key;
        const first = group.edges[0];
        const last = group.edges[group.edges.length - 1];
        const from = state.lightRailStops.get(first.from);
        const to = state.lightRailStops.get(last.to);
        const stopCodes = [first.from, ...group.edges.map((edge) => edge.to)];
        const stops = stopCodes.map((code) => state.lightRailStops.get(code)).filter(Boolean);
        return {
          mode: "lightRail",
          label: `輕鐵 ${route}`,
          routeNo: route,
          destination: lightRailDirectionTerminal(route, first.from, last.to),
          fromName: lightRailStopName(from),
          toName: lightRailStopName(to),
          fromNameEn: from?.nameEn || "",
          toNameEn: to?.nameEn || "",
          fromCode: from?.code || first.from,
          toCode: to?.code || last.to,
          stationId: from?.id || from?.code || first.from,
          stops: stops.map(lightRailStopName),
          stopsEn: stops.map((stop) => stop?.nameEn || ""),
          geometry: stops.map((stop) => [stop.lat, stop.lng]),
          rideMinutes: Math.ceil(group.edges.reduce((sum, edge) => sum + (edge.minutes || 2), 0)),
          minutes: Math.ceil(group.edges.reduce((sum, edge) => sum + (edge.minutes || 2), 0)),
          color: COLORS.lightRail
        };
      });
    }

    function mtrDirectionTerminal(line, fromCode, toCode) {
      const lineData = (state.mtr?.lines || []).find((item) => item.code === line);
      const codes = lineData?.stations || [];
      const fromIndex = codes.indexOf(fromCode);
      const toIndex = codes.indexOf(toCode);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return stationName(state.mtrStations.get(toCode));
      if (line === "EAL") return toIndex > fromIndex ? "金鐘" : "羅湖／落馬洲";
      if (line === "TKL") return toIndex < fromIndex ? "寶琳／康城" : "北角";
      const terminalCode = toIndex > fromIndex ? codes[codes.length - 1] : codes[0];
      return stationName(state.mtrStations.get(terminalCode));
    }

    function lightRailDirectionTerminal(route, fromCode, toCode) {
      const pattern = (state.lightRail?.patterns || []).find((item) => {
        if (String(item.route) !== String(route)) return false;
        const codes = item.stopIds || item.stopCodes || [];
        const fromIndex = codes.indexOf(fromCode);
        const toIndex = codes.indexOf(toCode);
        return fromIndex >= 0 && toIndex > fromIndex;
      });
      if (pattern?.destination) return pattern.destination;
      const terminalCode = (pattern?.stopIds || pattern?.stopCodes || []).at(-1);
      return lightRailStopName(state.lightRailStops.get(terminalCode || toCode));
    }

    function groupEdges(edges, keyName) {
      const groups = [];
      edges.forEach((edge) => {
        const key = edge[keyName] || edge.routeKey || "";
        const last = groups[groups.length - 1];
        if (last && last.key === key) last.edges.push(edge);
        else groups.push({ key, edges: [edge] });
      });
      return groups;
    }

    function fareForHeavyRail(fromCode, toCode, rail, profile) {
      const fares = state.fares;
      if (!fares || !fromCode || !toCode) return null;
      const key = `${fromCode}|${toCode}`;
      const airport = rail?.lines?.includes("AEL") ? fares.airportExpress?.[key] : null;
      const record = airport || fares.heavyRail?.[key] || fares.airportExpress?.[key];
      return fareValue(record, profile);
    }

    function fareForLightRail(fromCode, toCode, profile) {
      const record = state.fares?.lightRail?.[`${fromCode}|${toCode}`];
      return fareValue(record, profile);
    }

    function fareValue(record, profile) {
      if (Array.isArray(record)) {
        if (profile?.id === "senior") return Number.isFinite(record[2]) ? record[2] : null;
        return Number.isFinite(record[0]) ? record[0] : (record.find(Number.isFinite) ?? null);
      }
      if (profile?.id === "senior") return record?.joyYou60 ?? record?.octopusSenior ?? record?.fareSenior ?? null;
      return record?.octopusAdult ?? record?.singleAdult ?? null;
    }

    function sumFares(...values) {
      const numbers = values.filter(Number.isFinite);
      return numbers.length === values.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
    }

    function auditServiceSchedules() {
      const manifestScheduleKeys = Object.keys(state.routeShapeManifest?.routeSchedules || {});
      const placeholderScheduleKeys = manifestScheduleKeys.filter((key) => !routeScheduleHasUsableWindow(key));
      const busProviders = ["KMB", "LWB", "CTB", "NLB"].map((provider) => {
        const patterns = state.busPatterns.filter((pattern) => pattern.provider === provider);
        const routes = [...new Set(patterns.map((pattern) => normalizeRouteNo(pattern.route)))];
        const usableRoutes = routes.filter((route) => patterns.some((pattern) => {
          if (normalizeRouteNo(pattern.route) !== route) return false;
          return routeScheduleKeys({
            mode: "bus",
            provider,
            routeNo: route,
            scheduleProviderAlias: pattern.scheduleProviderAlias
          }).some(routeScheduleHasUsableWindow);
        }));
        const sharedRoutes = [...new Set(patterns.filter((pattern) => pattern.scheduleProviderAlias).map((pattern) => normalizeRouteNo(pattern.route)))];
        return {
          provider,
          patternCount: patterns.length,
          routeCount: routes.length,
          usablePlannedScheduleRoutes: usableRoutes.length,
          plannedScheduleCoverage: routes.length ? Math.round(usableRoutes.length / routes.length * 1000) / 10 : 0,
          validatedSharedScheduleRoutes: sharedRoutes.length
        };
      });
      const mtrRoutes = (state.mtr?.lines || []).map((line) => `MTR:${String(line.code || "").toUpperCase()}`);
      const lightRailRoutes = [...new Set((state.lightRail?.patterns || []).map((pattern) => `LR:${normalizeRouteNo(pattern.route)}`))];
      const rejectedUnvalidatedSameNumberRoutes = [...new Set(state.busPatterns
        .filter((pattern) => pattern.provider === "CTB")
        .filter((pattern) => !pattern.scheduleProviderAlias)
        .map((pattern) => normalizeRouteNo(pattern.route))
        .filter((route) => !routeScheduleHasUsableWindow(`CTB:${route}`) && routeScheduleHasUsableWindow(`KMB:${route}`)))];
      return {
        plannedScheduleSource: state.routeShapeManifest?.meta?.source || "",
        plannedScheduleIsOfficial: false,
        manifestScheduleRouteCount: manifestScheduleKeys.length,
        placeholderScheduleRouteCount: placeholderScheduleKeys.length,
        unsafeSharedAliasCount: state.busPatterns.filter((pattern) => pattern.scheduleProviderAlias && pattern.sharedRouteOverlap < SHARED_ROUTE_MIN_OVERLAP).length,
        rejectedUnvalidatedSameNumberRoutes: rejectedUnvalidatedSameNumberRoutes.length,
        busProviders,
        mtr: {
          routeCount: mtrRoutes.length,
          usablePlannedScheduleRoutes: mtrRoutes.filter(routeScheduleHasUsableWindow).length,
          realTimeAdapter: true
        },
        lightRail: {
          routeCount: lightRailRoutes.length,
          usablePlannedScheduleRoutes: lightRailRoutes.filter(routeScheduleHasUsableWindow).length,
          realTimeAdapter: true
        },
        realTimeAdapters: { KMB: true, LWB: true, CTB: true, NLB: true, MTR: true, LR: true }
      };
    }

    return { init, plan, auditServiceSchedules };
  }

  async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function mapLimit(items, limit, worker) {
    const output = new Array(items.length);
    let index = 0;
    async function run() {
      while (index < items.length) {
        const current = index;
        index += 1;
        output[current] = await worker(items[current], current);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return output;
  }

  function etaFromIsoList(items) {
    const now = Date.now();
    const candidates = (items || [])
      .map((item) => ({ ...item, time: parseEtaTime(item.eta) }))
      .filter((item) => Number.isFinite(item.time) && item.time >= now - 60000)
      .sort((a, b) => a.time - b.time);
    if (!candidates.length) return null;
    const first = candidates[0];
    return {
      waitMinutes: Math.max(0, Math.ceil((first.time - now) / 60000)),
      timeLabel: new Date(first.time).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" }),
      remark: first.remark || ""
    };
  }

  function parseEtaTime(value) {
    if (!value) return NaN;
    const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
    const withZone = /[zZ]|[+-]\d\d:?\d\d$/.test(normalized) ? normalized : `${normalized}+08:00`;
    return Date.parse(withZone);
  }

  function downsampleGeometry(points, maxPoints) {
    const clean = compactGeometry(points);
    if (clean.length <= maxPoints) return clean;
    const output = [clean[0]];
    const step = (clean.length - 2) / Math.max(1, maxPoints - 2);
    for (let index = 1; index < maxPoints - 1; index += 1) {
      output.push(clean[Math.round(index * step)]);
    }
    output.push(clean[clean.length - 1]);
    return compactGeometry(output);
  }

  function densifyGeometry(points, maxStepMeters) {
    const clean = compactGeometry(points);
    if (clean.length < 2) return clean;
    const output = [clean[0]];
    for (let index = 1; index < clean.length; index += 1) {
      const from = { lat: clean[index - 1][0], lng: clean[index - 1][1] };
      const to = { lat: clean[index][0], lng: clean[index][1] };
      const distance = haversine(from, to);
      const steps = Math.max(1, Math.ceil(distance / maxStepMeters));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        output.push([from.lat + (to.lat - from.lat) * t, from.lng + (to.lng - from.lng) * t]);
      }
    }
    return compactGeometry(output);
  }

  function walkingPath(routeData, start, end, costFn) {
    const direct = haversine(start, end);
    const snapDistance = Math.min(MAX_WALK_SNAP_DISTANCE, Math.max(45, direct * 0.4));
    const startNodes = nearestWalkingAccessNodes(routeData, start, MAX_WALK_ACCESS_CANDIDATES, snapDistance, costFn);
    const endNodes = nearestWalkingAccessNodes(routeData, end, MAX_WALK_ACCESS_CANDIDATES, snapDistance, costFn);
    if (!startNodes.length || !endNodes.length) return null;
    const components = walkingComponentIndex(routeData);
    const endComponents = new Set(endNodes.map((node) => components.get(node.id)).filter(Boolean));
    const sharedComponents = new Set(startNodes.map((node) => components.get(node.id)).filter((component) => component && endComponents.has(component)));
    if (!sharedComponents.size) return null;
    const connectedStarts = nearestNodesPerComponent(startNodes, components, sharedComponents, 3);
    const connectedEnds = nearestNodesPerComponent(endNodes, components, sharedComponents, 3);
    if (!connectedStarts.length || !connectedEnds.length) return null;
    const closeStarts = connectedStarts.filter((node) => node.distance <= connectedStarts[0].distance + 8);
    const closeEnds = connectedEnds.filter((node) => node.distance <= connectedEnds[0].distance + 8);
    return shortestPathCandidates(routeData, closeStarts, closeEnds, costFn)
      || shortestPathCandidates(routeData, connectedStarts, connectedEnds, costFn);
  }

  function officialPedestrianTravelMode(profile) {
    if (["wheelchair", "stroller"].includes(profile?.id)) return "2";
    if (["senior", "lowVision"].includes(profile?.id)) return "3";
    return "1";
  }

  function officialPedestrianRouteSegmentFromResponse(data, from, to, label, profile) {
    const feature = data?.routes?.features?.[0];
    const routePoints = (feature?.geometry?.paths || []).flat()
      .filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
      .map((point) => [Number(point[1]), Number(point[0])]);
    if (routePoints.length < 2) return null;
    const first = { lat: routePoints[0][0], lng: routePoints[0][1] };
    const last = { lat: routePoints.at(-1)[0], lng: routePoints.at(-1)[1] };
    const startAccessDistance = haversine(from, first);
    const endAccessDistance = haversine(last, to);
    const startAccessConfidence = walkingAccessConfidence(from, startAccessDistance);
    const endAccessConfidence = walkingAccessConfidence(to, endAccessDistance);
    const endpointAccessUncertain = startAccessConfidence === "uncertain" || endAccessConfidence === "uncertain";
    const routeDistance = Number(feature.attributes?.Total_Length)
      || Number(data?.directions?.[0]?.summary?.totalLength)
      || routePoints.slice(1).reduce((sum, point, index) => sum + haversine(
        { lat: routePoints[index][0], lng: routePoints[index][1] },
        { lat: point[0], lng: point[1] }
      ), 0);
    const distance = routeDistance + startAccessDistance + endAccessDistance;
    const routeMinutes = Number(feature.attributes?.Total_Time) || Number(data?.directions?.[0]?.summary?.totalTime) || 0;
    const metrics = {
      stairs: 0,
      slopes: 0,
      ramps: 0,
      lifts: 0,
      connectedRamps: 0,
      connectedLifts: 0,
      nearbyRamps: 0,
      nearbyLifts: 0,
      footbridges: 0,
      potentialEntrances: 0,
      crossings: 0,
      startSnap: startAccessDistance,
      endSnap: endAccessDistance,
      startAccessDistance,
      endAccessDistance,
      startAccessConfidence,
      endAccessConfidence,
      endpointAccessInferred: startAccessConfidence === "inferred" || endAccessConfidence === "inferred",
      endpointAccessUncertain,
      stairsUnknown: true,
      entranceConnectionUnknown: endpointAccessUncertain,
      unknownSurface: true,
      unknownWidth: true,
      unknownCurb: true,
      unknownSlopeDetails: false,
      unknownCrossingAssist: true,
      officialPedestrianRoute: true,
      routeSource: "landsd-3d-pedestrian-route-search",
      fallback: false
    };
    metrics.confidence = walkingConfidence(metrics);
    return {
      mode: "walk",
      label,
      from,
      to,
      fromName: from.name,
      toName: to.name,
      geometry: compactGeometry([[from.lat, from.lng], ...routePoints, [to.lat, to.lng]]),
      distance,
      minutes: Math.max(1, Math.round(routeMinutes + (startAccessDistance + endAccessDistance) / (profile?.walkSpeed || WALK_SPEED))),
      color: COLORS.walk,
      routed: true,
      geometrySource: "landsd-3d-pedestrian-route-search",
      metrics
    };
  }

  function selectLightRailArrival(data, routeNo, terminalNames = []) {
    if (!data || Number(data.status) === 0) return null;
    const normalizedTerminals = terminalNames.map(normalizeLightRailText).filter(Boolean);
    const candidates = [];
    (data.platform_list || []).forEach((platform) => {
      (platform.route_list || []).forEach((item) => {
        if (String(item.route_no || "").trim() !== String(routeNo || "").trim()) return;
        const destinations = [item.dest_en, item.dest_ch].map(normalizeLightRailText).filter(Boolean);
        if (normalizedTerminals.length && destinations.length && !destinations.some((destination) => normalizedTerminals.some((terminal) => (
          destination.includes(terminal) || terminal.includes(destination)
        )))) return;
        const minutes = parseLightRailMinutes(item.time_en || item.time_ch);
        if (Number.isFinite(minutes)) candidates.push({ minutes, item });
      });
    });
    candidates.sort((left, right) => left.minutes - right.minutes);
    const first = candidates[0];
    if (!first) return null;
    return {
      waitMinutes: first.minutes,
      timeLabel: first.item.time_ch || first.item.time_en || "",
      remark: first.item.dest_ch ? `往 ${first.item.dest_ch}` : "輕鐵即時到站"
    };
  }

  function normalizeLightRailText(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]/g, "");
  }

  function parseLightRailMinutes(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return NaN;
    if (/arriv|到達|即將/i.test(text)) return 0;
    const match = text.match(/\d+/);
    return match ? Number(match[0]) : NaN;
  }

  function nearestNodesPerComponent(nodes, components, allowedComponents, perComponent) {
    const counts = new Map();
    return nodes.filter((node) => {
      const component = components.get(node.id);
      if (!component || !allowedComponents.has(component)) return false;
      const count = counts.get(component) || 0;
      if (count >= perComponent) return false;
      counts.set(component, count + 1);
      return true;
    });
  }

  function walkingComponentIndex(routeData) {
    if (walkingComponentCache.has(routeData)) return walkingComponentCache.get(routeData);
    const parent = new Map();
    const sizes = new Map();
    const ensure = (id) => {
      if (!id || parent.has(id)) return;
      parent.set(id, id);
      sizes.set(id, 1);
    };
    const find = (id) => {
      ensure(id);
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root);
      let cursor = id;
      while (parent.get(cursor) !== cursor) {
        const next = parent.get(cursor);
        parent.set(cursor, root);
        cursor = next;
      }
      return root;
    };
    const union = (left, right) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot === rightRoot) return;
      const leftSize = sizes.get(leftRoot) || 1;
      const rightSize = sizes.get(rightRoot) || 1;
      if (leftSize < rightSize) {
        parent.set(leftRoot, rightRoot);
        sizes.set(rightRoot, leftSize + rightSize);
      } else {
        parent.set(rightRoot, leftRoot);
        sizes.set(leftRoot, leftSize + rightSize);
      }
    };
    (routeData.nodes || []).forEach((node) => ensure(node.id));
    (routeData.edges || []).forEach((edge) => {
      if (edge.from && edge.to) union(edge.from, edge.to);
    });
    const components = new Map();
    parent.forEach((_, id) => components.set(id, find(id)));
    walkingComponentCache.set(routeData, components);
    return components;
  }

  function shortestPathCandidates(routeData, startNodes, endNodes, costFn) {
    const graph = walkingGraph(routeData);
    const startMap = new Map(startNodes.map((node) => [node.id, node]));
    const endMap = new Map();
    endNodes.forEach((node) => {
      const existing = endMap.get(node.id);
      if (!existing || node.distance < existing.distance) endMap.set(node.id, node);
    });
    const heap = new MinHeap();
    const distances = new Map();
    const previous = new Map();
    startNodes.forEach((node) => {
      const initial = node.routingCost ?? node.distance * 1.15;
      if (initial < (distances.get(node.id) ?? Infinity)) {
        distances.set(node.id, initial);
        heap.push({ id: node.id, distance: initial });
      }
    });
    let best = null;
    while (heap.items.length) {
      const current = heap.pop();
      if (!current || current.distance !== distances.get(current.id)) continue;
      if (best && current.distance >= best.totalCost) break;
      const endNode = endMap.get(current.id);
      if (endNode) {
        const totalCost = current.distance + (endNode.routingCost ?? endNode.distance * 1.15);
        if (!best || totalCost < best.totalCost) best = { id: current.id, endNode, totalCost };
      }
      (graph.get(current.id) || []).forEach((edge) => {
        const weight = costFn(edge);
        if (!Number.isFinite(weight)) return;
        const next = current.distance + Math.max(1, weight);
        if (next < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, next);
          previous.set(edge.to, { from: current.id, edge });
          heap.push({ id: edge.to, distance: next });
        }
      });
    }

    if (!best) return null;
    const edges = [];
    let cursor = best.id;
    while (previous.has(cursor)) {
      const step = previous.get(cursor);
      if (!step) return null;
      edges.unshift(step.edge);
      cursor = step.from;
    }
    const startNode = startMap.get(cursor);
    if (!startNode) return null;
    return {
      edges,
      cost: best.totalCost,
      startNode,
      endNode: best.endNode,
      startSnap: startNode.distance,
      endSnap: best.endNode.distance
    };
  }

  function walkingGraph(routeData) {
    if (walkingGraphCache.has(routeData)) return walkingGraphCache.get(routeData);
    const graph = new Map();
    (routeData.edges || []).forEach((edge) => {
      addWalkingGraphEdge(graph, edge.from, edge.to, edge, false);
      addWalkingGraphEdge(graph, edge.to, edge.from, edge, true);
    });
    walkingGraphCache.set(routeData, graph);
    return graph;
  }

  function addWalkingGraphEdge(graph, from, to, edge, reverse) {
    if (!from || !to) return;
    if (!graph.has(from)) graph.set(from, []);
    const geometry = reverse && Array.isArray(edge.geometry) ? [...edge.geometry].reverse() : edge.geometry;
    graph.get(from).push({ ...edge, from, to, geometry });
  }

  function nearestWalkingAccessNodes(routeData, place, limit, maxDistance, costFn) {
    const edgeCandidates = walkingEdgeAccessCandidates(routeData, place, maxDistance, costFn);
    if (edgeCandidates.length) return edgeCandidates.slice(0, limit);
    return nearestWalkingNodes(routeData, place, limit, maxDistance).map((node) => ({
      ...node,
      routingCost: node.distance * 1.15,
      offNetworkDistance: node.distance,
      accessConfidence: walkingAccessConfidence(place, node.distance),
      connectorGeometry: [[place.lat, place.lng], [node.lat, node.lng]]
    }));
  }

  function walkingEdgeAccessCandidates(routeData, place, maxDistance, costFn) {
    const projections = nearestWalkingEdgeProjections(routeData, place, maxDistance);
    const nodes = new Map((routeData.nodes || []).map((node) => [node.id, node]));
    const candidates = new Map();
    projections.forEach((projection) => {
      const { edge, geometry, geometryDistance } = projection;
      const edgeCost = Number(costFn(edge));
      if (!Number.isFinite(edgeCost)) return;
      const edgeDistance = Number(edge.distance) > 0 ? Number(edge.distance) : geometryDistance;
      if (!(edgeDistance > 0) || !(geometryDistance > 0)) return;
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      if (!fromNode || !toNode) return;
      const firstPoint = { lat: geometry[0][0], lng: geometry[0][1] };
      const lastPoint = { lat: geometry.at(-1)[0], lng: geometry.at(-1)[1] };
      const geometryStartsAtFrom = haversine(firstPoint, fromNode) + haversine(lastPoint, toNode)
        <= haversine(firstPoint, toNode) + haversine(lastPoint, fromNode);
      const geometryFraction = Math.min(1, Math.max(0, projection.alongDistance / geometryDistance));
      const fromFraction = geometryStartsAtFrom ? geometryFraction : 1 - geometryFraction;
      [
        { id: edge.from, fraction: fromFraction, endpoint: geometryStartsAtFrom ? "from" : "to" },
        { id: edge.to, fraction: 1 - fromFraction, endpoint: geometryStartsAtFrom ? "to" : "from" }
      ].forEach((choice) => {
        const node = nodes.get(choice.id);
        if (!node) return;
        const alongDistance = edgeDistance * choice.fraction;
        const candidate = {
          ...node,
          distance: projection.distance + alongDistance,
          routingCost: projection.distance * 1.15 + edgeCost * choice.fraction,
          offNetworkDistance: projection.distance,
          accessConfidence: walkingAccessConfidence(place, projection.distance),
          connectorGeometry: connectorGeometryForProjection(place, projection, choice.endpoint)
        };
        const existing = candidates.get(node.id);
        if (!existing || candidate.routingCost < existing.routingCost) candidates.set(node.id, candidate);
      });
    });
    return [...candidates.values()].sort((left, right) => left.routingCost - right.routingCost);
  }

  function nearestWalkingEdgeProjections(routeData, place, maxDistance) {
    const spatial = walkingEdgeSpatialIndex(routeData);
    const latCell = Math.floor(place.lat / WALK_GRID_SIZE);
    const lngCell = Math.floor(place.lng / WALK_GRID_SIZE);
    const radius = Math.ceil(maxDistance / 180) + 1;
    const seen = new Set();
    const nearestByEdge = new Map();
    for (let latOffset = -radius; latOffset <= radius; latOffset += 1) {
      for (let lngOffset = -radius; lngOffset <= radius; lngOffset += 1) {
        const edges = spatial.get(`${latCell + latOffset}:${lngCell + lngOffset}`) || [];
        edges.forEach((edge) => {
          if (seen.has(edge)) return;
          seen.add(edge);
          const projection = projectPlaceToWalkingEdge(place, edge);
          if (!projection || projection.distance > maxDistance) return;
          const existing = nearestByEdge.get(edge);
          if (!existing || projection.distance < existing.distance) nearestByEdge.set(edge, projection);
        });
      }
    }
    return [...nearestByEdge.values()].sort((left, right) => left.distance - right.distance);
  }

  function walkingEdgeSpatialIndex(routeData) {
    if (walkingEdgeSpatialCache.has(routeData)) {
      const cached = walkingEdgeSpatialCache.get(routeData);
      walkingEdgeSpatialCache.delete(routeData);
      walkingEdgeSpatialCache.set(routeData, cached);
      return cached;
    }
    const spatial = new Map();
    (routeData.edges || []).forEach((edge) => {
      const geometry = compactGeometry(edge.geometry);
      if (geometry.length < 2) return;
      const bounds = geometry.reduce((value, point) => ({
        minLat: Math.min(value.minLat, point[0]),
        maxLat: Math.max(value.maxLat, point[0]),
        minLng: Math.min(value.minLng, point[1]),
        maxLng: Math.max(value.maxLng, point[1])
      }), { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity });
      const minLatCell = Math.floor(bounds.minLat / WALK_GRID_SIZE);
      const maxLatCell = Math.floor(bounds.maxLat / WALK_GRID_SIZE);
      const minLngCell = Math.floor(bounds.minLng / WALK_GRID_SIZE);
      const maxLngCell = Math.floor(bounds.maxLng / WALK_GRID_SIZE);
      for (let lat = minLatCell; lat <= maxLatCell; lat += 1) {
        for (let lng = minLngCell; lng <= maxLngCell; lng += 1) {
          const key = `${lat}:${lng}`;
          if (!spatial.has(key)) spatial.set(key, []);
          spatial.get(key).push(edge);
        }
      }
    });
    walkingEdgeSpatialCache.set(routeData, spatial);
    while (walkingEdgeSpatialCache.size > MAX_WALK_EDGE_SPATIAL_CACHES) {
      walkingEdgeSpatialCache.delete(walkingEdgeSpatialCache.keys().next().value);
    }
    return spatial;
  }

  function projectPlaceToWalkingEdge(place, edge) {
    const geometry = compactGeometry(edge.geometry);
    if (geometry.length < 2) return null;
    const latitudeScale = 111320;
    const longitudeScale = latitudeScale * Math.cos(place.lat * Math.PI / 180);
    let geometryDistance = 0;
    let best = null;
    for (let segmentIndex = 0; segmentIndex < geometry.length - 1; segmentIndex += 1) {
      const start = geometry[segmentIndex];
      const end = geometry[segmentIndex + 1];
      const startX = (start[1] - place.lng) * longitudeScale;
      const startY = (start[0] - place.lat) * latitudeScale;
      const endX = (end[1] - place.lng) * longitudeScale;
      const endY = (end[0] - place.lat) * latitudeScale;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const segmentLength = Math.hypot(deltaX, deltaY);
      if (!(segmentLength > 0)) continue;
      const ratio = Math.min(1, Math.max(0, -(startX * deltaX + startY * deltaY) / (segmentLength * segmentLength)));
      const projectedX = startX + deltaX * ratio;
      const projectedY = startY + deltaY * ratio;
      const distance = Math.hypot(projectedX, projectedY);
      if (!best || distance < best.distance) {
        best = {
          edge,
          geometry,
          segmentIndex,
          ratio,
          point: [place.lat + projectedY / latitudeScale, place.lng + projectedX / longitudeScale],
          distance,
          alongDistance: geometryDistance + segmentLength * ratio
        };
      }
      geometryDistance += segmentLength;
    }
    return best ? { ...best, geometryDistance } : null;
  }

  function connectorGeometryForProjection(place, projection, endpoint) {
    const { geometry, segmentIndex } = projection;
    const remainder = endpoint === "from"
      ? geometry.slice(0, segmentIndex + 1).reverse()
      : geometry.slice(segmentIndex + 1);
    return compactGeometry([[place.lat, place.lng], projection.point, ...remainder]);
  }

  function walkingAccessConfidence(place, distance) {
    const threshold = place?.positionSource === "geolocation"
      ? TRUSTED_GPS_ACCESS_DISTANCE
      : TRUSTED_MAP_ACCESS_DISTANCE;
    return distance <= threshold ? "inferred" : "uncertain";
  }

  function nearestWalkingNodes(routeData, place, limit, maxDistance) {
    const spatial = walkingSpatialIndex(routeData);
    const latCell = Math.floor(place.lat / WALK_GRID_SIZE);
    const lngCell = Math.floor(place.lng / WALK_GRID_SIZE);
    const maxRadius = Math.ceil(maxDistance / 180) + 1;
    const candidates = [];
    const seen = new Set();
    for (let radius = 0; radius <= maxRadius; radius += 1) {
      for (let latOffset = -radius; latOffset <= radius; latOffset += 1) {
        for (let lngOffset = -radius; lngOffset <= radius; lngOffset += 1) {
          if (radius && Math.abs(latOffset) !== radius && Math.abs(lngOffset) !== radius) continue;
          const nodes = spatial.get(`${latCell + latOffset}:${lngCell + lngOffset}`) || [];
          nodes.forEach((node) => {
            if (seen.has(node.id)) return;
            seen.add(node.id);
            const distance = haversine(place, node);
            if (distance <= maxDistance) candidates.push({ ...node, distance });
          });
        }
      }
      if (candidates.length >= limit && radius * 180 > candidates.sort((a, b) => a.distance - b.distance)[limit - 1].distance) break;
    }
    return candidates.sort((a, b) => a.distance - b.distance).slice(0, limit);
  }

  function walkingSpatialIndex(routeData) {
    if (walkingSpatialCache.has(routeData)) return walkingSpatialCache.get(routeData);
    const spatial = new Map();
    (routeData.nodes || []).forEach((node) => {
      const key = `${Math.floor(node.lat / WALK_GRID_SIZE)}:${Math.floor(node.lng / WALK_GRID_SIZE)}`;
      if (!spatial.has(key)) spatial.set(key, []);
      spatial.get(key).push(node);
    });
    walkingSpatialCache.set(routeData, spatial);
    return spatial;
  }

  function mergeWalkMetrics(metrics) {
    const merged = (metrics || []).filter(Boolean).reduce((total, item) => ({
      stairs: total.stairs + (item.stairs || 0),
      slopes: total.slopes + (item.slopes || 0),
      ramps: total.ramps + (item.ramps || 0),
      lifts: total.lifts + (item.lifts || 0),
      connectedRamps: total.connectedRamps + (item.connectedRamps ?? item.ramps ?? 0),
      connectedLifts: total.connectedLifts + (item.connectedLifts ?? item.lifts ?? 0),
      nearbyRamps: total.nearbyRamps + (item.nearbyRamps || 0),
      nearbyLifts: total.nearbyLifts + (item.nearbyLifts || 0),
      footbridges: total.footbridges + (item.footbridges || 0),
      potentialEntrances: total.potentialEntrances + (item.potentialEntrances || 0),
      crossings: total.crossings + (item.crossings || 0),
      startSnap: Math.max(total.startSnap, item.startSnap || 0),
      endSnap: Math.max(total.endSnap, item.endSnap || 0),
      startAccessDistance: Math.max(total.startAccessDistance, item.startAccessDistance || 0),
      endAccessDistance: Math.max(total.endAccessDistance, item.endAccessDistance || 0),
      startAccessConfidence: mergeAccessConfidence(total.startAccessConfidence, item.startAccessConfidence),
      endAccessConfidence: mergeAccessConfidence(total.endAccessConfidence, item.endAccessConfidence),
      endpointAccessInferred: total.endpointAccessInferred || Boolean(item.endpointAccessInferred),
      endpointAccessUncertain: total.endpointAccessUncertain || Boolean(item.endpointAccessUncertain),
      stairsUnknown: total.stairsUnknown || Boolean(item.stairsUnknown),
      entranceConnectionUnknown: total.entranceConnectionUnknown || Boolean(item.entranceConnectionUnknown),
      unknownSurface: total.unknownSurface || Boolean(item.unknownSurface),
      unknownWidth: total.unknownWidth || Boolean(item.unknownWidth),
      unknownCurb: total.unknownCurb || Boolean(item.unknownCurb),
      unknownSlopeDetails: total.unknownSlopeDetails || Boolean(item.unknownSlopeDetails),
      unknownCrossingAssist: total.unknownCrossingAssist || Boolean(item.unknownCrossingAssist),
      fallback: total.fallback || Boolean(item.fallback)
    }), {
      stairs: 0, slopes: 0, ramps: 0, lifts: 0, connectedRamps: 0, connectedLifts: 0,
      nearbyRamps: 0, nearbyLifts: 0, footbridges: 0, potentialEntrances: 0, crossings: 0,
      startSnap: 0, endSnap: 0, startAccessDistance: 0, endAccessDistance: 0,
      startAccessConfidence: "connected", endAccessConfidence: "connected",
      endpointAccessInferred: false, endpointAccessUncertain: false,
      stairsUnknown: false, entranceConnectionUnknown: false,
      unknownSurface: false, unknownWidth: false, unknownCurb: false, unknownSlopeDetails: false,
      unknownCrossingAssist: false, fallback: false
    });
    merged.confidence = walkingConfidence(merged);
    return merged;
  }

  function mergeAccessConfidence(first, second) {
    const rank = { connected: 0, inferred: 1, uncertain: 2 };
    const left = first || "connected";
    const right = second || "connected";
    return (rank[right] || 0) > (rank[left] || 0) ? right : left;
  }

  function walkMetricText(metrics) {
    if (!metrics) return "";
    const parts = [];
    if (metrics.connectedRamps || metrics.ramps) parts.push(`使用 ${metrics.connectedRamps || metrics.ramps} 處已連接斜道`);
    if (metrics.connectedLifts || metrics.lifts) parts.push(`使用 ${metrics.connectedLifts || metrics.lifts} 處已連接升降機`);
    if (metrics.nearbyRamps) parts.push(`附近有 ${metrics.nearbyRamps} 處斜道標記`);
    if (metrics.nearbyLifts) parts.push(`附近有 ${metrics.nearbyLifts} 處升降機標記`);
    if (metrics.footbridges) parts.push(`附近有 ${metrics.footbridges} 座行人天橋結構`);
    if (metrics.stairs) parts.push(`${metrics.stairs} 段樓梯`);
    if (metrics.slopes) parts.push("沿途有斜坡");
    if (metrics.fallback) parts.push("部分路段為保守估算");
    return parts.join("，");
  }

  function countEdgeGroups(edges, predicate) {
    return new Set((edges || []).filter(predicate).map((edge) => edge.sourceObjectId || edge.pedestrianRouteId || edge.id)).size;
  }

  function countMarkedFeatures(edges, idsKey, predicate) {
    const facilityIds = new Set((edges || []).flatMap((edge) => edge[idsKey] || []));
    const nativeEdges = (edges || []).filter((edge) => predicate(edge) && !(edge[idsKey] || []).length);
    return facilityIds.size + countEdgeGroups(nativeEdges, () => true);
  }

  function countEdgeIds(edges, idsKey) {
    return new Set((edges || []).flatMap((edge) => edge[idsKey] || [])).size;
  }

  function countEdgeRuns(edges, predicate) {
    let count = 0;
    let active = false;
    (edges || []).forEach((edge) => {
      const matches = predicate(edge);
      if (matches && !active) count += 1;
      active = matches;
    });
    return count;
  }

  function edgeFieldKnown(edge, keys) {
    return keys.some((key) => {
      if (!Object.prototype.hasOwnProperty.call(edge, key)) return false;
      const value = edge[key];
      if (value === null || value === undefined || value === "") return false;
      return typeof value !== "string" || !/^(unknown|n\/?a|未知|待確認)$/i.test(value.trim());
    });
  }

  function isCrossingEdge(edge) {
    return /Crossing|過路|Traffic|行人過路/i.test(edge.notes || "") || edge.type === "crossing";
  }

  function flattenGeometry(edges, start, end, path = null) {
    const startConnector = path?.startNode?.connectorGeometry || [[start.lat, start.lng]];
    const endConnector = path?.endNode?.connectorGeometry || [[end.lat, end.lng]];
    const points = [...startConnector];
    edges.forEach((edge) => (edge.geometry || []).forEach((point) => points.push(point)));
    [...endConnector].reverse().forEach((point) => points.push(point));
    return compactGeometry(points);
  }

  function walkingMetricsForPath(path) {
    const startAccess = walkingAccessDetails(path?.startNode);
    const endAccess = walkingAccessDetails(path?.endNode);
    const metrics = {
      ...metricsFromEdges(path?.edges || []),
      startSnap: path?.startSnap || 0,
      endSnap: path?.endSnap || 0,
      startAccessDistance: startAccess.distance,
      endAccessDistance: endAccess.distance,
      startAccessConfidence: startAccess.confidence,
      endAccessConfidence: endAccess.confidence,
      endpointAccessInferred: startAccess.confidence === "inferred" || endAccess.confidence === "inferred",
      endpointAccessUncertain: startAccess.confidence === "uncertain" || endAccess.confidence === "uncertain"
    };
    metrics.confidence = walkingConfidence(metrics);
    return metrics;
  }

  function walkingAccessDetails(node) {
    return {
      distance: Number(node?.offNetworkDistance) || 0,
      confidence: node?.accessConfidence || "connected"
    };
  }

  function metricsFromEdges(edges) {
    const routeEdges = edges || [];
    const connectedRamps = countMarkedFeatures(routeEdges, "connectedRampIds", (edge) => edge.hasConnectedRamp);
    const connectedLifts = countMarkedFeatures(routeEdges, "connectedLiftIds", (edge) => edge.hasConnectedLift);
    const nearbyRamps = countMarkedFeatures(routeEdges, "nearbyRampIds", (edge) => edge.hasRampNearby);
    const nearbyLifts = countMarkedFeatures(routeEdges, "nearbyLiftIds", (edge) => edge.hasLiftNearby);
    const footbridges = countEdgeIds(routeEdges, "nearbyFootbridgeIds");
    const potentialEntrances = countEdgeIds(routeEdges, "potentialEntranceIds");
    const crossings = countEdgeGroups(routeEdges, isCrossingEdge);
    const metrics = {
      stairs: countEdgeGroups(edges, (edge) => edge.hasStairs || edge.slope === "stairs"),
      slopes: countEdgeRuns(edges, (edge) => edge.slope === "mild" || edge.slope === "steep"),
      ramps: connectedRamps,
      lifts: connectedLifts,
      connectedRamps,
      connectedLifts,
      nearbyRamps,
      nearbyLifts,
      footbridges,
      potentialEntrances,
      crossings,
      stairsUnknown: routeEdges.some((edge) => !edgeFieldKnown(edge, ["hasStairs", "slope"])),
      entranceConnectionUnknown: potentialEntrances > 0,
      unknownSurface: routeEdges.some((edge) => !edgeFieldKnown(edge, ["surface", "surfaceType", "pavement"])),
      unknownWidth: routeEdges.some((edge) => !edgeFieldKnown(edge, ["widthMeters", "clearWidthMeters", "width"])),
      unknownCurb: routeEdges.some((edge) => !edgeFieldKnown(edge, ["curbHeightMm", "kerbHeightMm", "curb", "kerb"])),
      unknownSlopeDetails: routeEdges.some((edge) => (edge.slope === "mild" || edge.slope === "steep")
        && !edgeFieldKnown(edge, ["slopePercent", "gradient", "rise"])),
      unknownCrossingAssist: routeEdges.some((edge) => isCrossingEdge(edge)
        && !edgeFieldKnown(edge, ["crossingAssist", "audibleSignal", "hasAudibleSignal", "tactileSignal", "hasTactileSignal"]))
    };
    metrics.confidence = walkingConfidence(metrics);
    return metrics;
  }

  function walkingConfidence(metrics) {
    if (metrics?.fallback) return "fallback";
    if (metrics?.entranceConnectionUnknown || metrics?.endpointAccessUncertain || metrics?.stairsUnknown || metrics?.unknownSurface
      || metrics?.unknownWidth || metrics?.unknownCurb || metrics?.unknownSlopeDetails
      || metrics?.unknownCrossingAssist) return "partial";
    return "connected";
  }

  function walkReasons(profileKey, distance, metrics) {
    const { stairs, slopes, crossings, connectedRamps, connectedLifts, nearbyRamps, nearbyLifts } = metrics;
    const reasons = [`全程約 ${formatDistance(distance)}，符合目前出行需要的步行範圍。`];
    reasons.push(stairs ? `此線仍有 ${stairs} 段樓梯或不便通道。` : "此線避開已標示的樓梯。");
    if (slopes) reasons.push(`路上有 ${slopes} 段斜坡，建議慢行。`);
    if (connectedRamps) reasons.push(`路線使用 ${connectedRamps} 處已連接斜道。`);
    if (connectedLifts) reasons.push(`路線使用 ${connectedLifts} 處已連接升降機。`);
    if (nearbyRamps) reasons.push(`路線附近有 ${nearbyRamps} 處斜道標記，未確認為必經連接。`);
    if (nearbyLifts) reasons.push(`路線附近有 ${nearbyLifts} 處升降機標記，未確認為必經連接。`);
    if (profileKey === "lowVision" && crossings) reasons.push("此路線優先減少複雜過路位置，降低路口判斷壓力。");
    return reasons;
  }

  function walkCautions(profileKey, metrics) {
    const { stairs, slopes, crossings, connectedRamps, connectedLifts, nearbyRamps, nearbyLifts } = metrics;
    const cautions = ["現場工程、扶手和升降機情況仍需臨場留意。"];
    if (stairs) cautions.push(profileKey === "wheelchair" ? "輪椅人士不建議使用含樓梯路線，請改選接駁方案。" : "如不想行樓梯，可改選港鐵或巴士接駁。");
    if (slopes) cautions.push("斜坡位置建議放慢，照顧者可在路口先停一停。");
    if (crossings) cautions.push("過馬路時請按燈號和現場指示。");
    if ((connectedRamps || nearbyRamps) && (profileKey === "wheelchair" || profileKey === "stroller")) cautions.push("斜道闊度、坡度及臨時阻塞仍需在現場確認。");
    if (connectedLifts || nearbyLifts) cautions.push("升降機開放時間和服務狀態仍需現場確認；附近標記不代表路線必定使用。");
    if (metrics.entranceConnectionUnknown) cautions.push("入口與步行路網的實際連接仍需確認。");
    if (metrics.unknownSurface || metrics.unknownWidth || metrics.unknownCurb) cautions.push("部分路面的材質、通道闊度或路緣資料未完整收錄。");
    if (metrics.unknownCrossingAssist) cautions.push("過路處的有聲或觸覺輔助資料待確認。");
    return cautions;
  }

  function riskForWalk(metrics) {
    if (metrics.stairs) return { label: "不建議", className: "is-high" };
    if (metrics.fallback) return { label: "步行路段待確認", className: "is-medium" };
    if (metrics.entranceConnectionUnknown || metrics.endpointAccessUncertain || metrics.slopes > 3 || metrics.crossings > 6) return { label: "需留意", className: "is-medium" };
    return { label: "較低風險", className: "is-low" };
  }

  function moreSevereRisk(first, second) {
    const rank = { "is-high": 3, "is-medium": 2, "is-low": 1, "is-neutral": 0 };
    return (rank[second?.className] || 0) > (rank[first?.className] || 0) ? second : (first || second);
  }

  function annotateOptions(options, profile) {
    if (!options.length) return;
    const fastest = minBy(options, (option) => option.minutes);
    const shortest = minBy(options, (option) => option.walkDistance ?? option.distance ?? Infinity);
    const priced = options.filter((option) => Number.isFinite(option.fare));
    const cheapest = priced.length ? minBy(priced, (option) => option.fare) : options.find((option) => option.fareLabel === "免費");
    options.forEach((option, index) => {
      option.rankingScore = Number(routeGeneralizedCost(option, profile).toFixed(3));
      option.optionLabel = `路線${toChineseNumber(index + 1)}`;
      if (option.walkVariant === "accessible") option.optionLabel = "較合適步行";
      if (option.walkVariant === "shortest") option.optionLabel = "最短路線";
      option.badges = [];
      if (option.walkVariant === "accessible") option.badges.push("出行需要優先");
      if (option.walkVariant === "shortest") option.badges.push("距離優先");
      if (option === fastest) option.badges.push("用時最短");
      if (option === shortest) option.badges.push("步行最短");
      if (option === cheapest) option.badges.push("車費最低");
    });
  }

  function compareOptions(a, b, profile = window.MapableProfileService.resolve("standard")) {
    return routeGeneralizedCost(a, profile) - routeGeneralizedCost(b, profile)
      || (a.minutes || 0) - (b.minutes || 0)
      || (a.walkDistance || a.distance || 0) - (b.walkDistance || b.distance || 0);
  }

  function routeGeneralizedCost(option, profile) {
    const weights = profile?.ranking || window.MapableProfileService.resolve("standard").ranking;
    const uncertaintyProfile = window.MapableProfileService.resolve(profile?.travelProfile || profile?.id || "standard");
    const segments = option.segments || [];
    const walkSegments = segments.filter((segment) => segment.mode === "walk");
    const transitLegs = segments.filter((segment) => segment.mode !== "walk").length;
    const continuousWalkMinutes = walkSegments.length
      ? Math.max(...walkSegments.map((segment) => Number(segment.minutes) || 0))
      : (Number(option.walkDistance || option.distance) || 0) / (profile?.walkSpeed || WALK_SPEED);
    const metrics = option.metrics || mergeWalkMetrics(walkSegments.map((segment) => segment.metrics));
    const fallbackCount = walkSegments.filter((segment) => segment.metrics?.fallback || segment.routed === false).length;
    const walkingUncertaintyCost = walkSegments.reduce((sum, segment) => sum + walkUncertaintyCost(segment.metrics, uncertaintyProfile), 0);
    const unknownTransitCount = segments.filter((segment) => segment.mode !== "walk" && segment.operationConfidence === "unknown").length;
    const stairs = Number(metrics.stairs) || 0;
    if (stairs && !Number.isFinite(weights.stairs)) return 1e9 + (Number(option.minutes) || 0);
    const stairCost = stairs ? stairs * weights.stairs : 0;
    const fareCost = Number.isFinite(option.fare) ? option.fare * weights.fare : weights.unknownFare;
    const longestWait = Math.max(0, ...(segments.filter((segment) => segment.mode !== "walk").map((segment) => Number(segment.waitMinutes) || 0)));
    return (Number(option.minutes) || 0)
      + continuousWalkMinutes * weights.walk
      + (Number(metrics.slopes) || 0) * weights.slope
      + stairCost
      + (Number(metrics.crossings) || 0) * weights.crossing
      + Math.max(0, transitLegs - 1) * weights.transfer
      + fallbackCount * weights.fallback
      + walkingUncertaintyCost
      + mtrExitUncertaintyCost(option.selectedEgressExit, uncertaintyProfile, option.mtrEgressStationCode)
      + unknownTransitCount * Math.max(2, weights.fallback * 0.5)
      + Math.max(0, longestWait - 5) * (weights.waitExposure || 0)
      + fareCost;
  }

  function mtrExitUncertaintyCost(exit, profile, stationCode = "") {
    const priorities = profile?.priorities || window.MapableProfileService.resolve("standard").priorities;
    if (!exit) return stationCode ? (priorities.unknown || 1) * 1.5 : 0;
    const accessibility = exit.accessibility || {};
    const travelProfile = profile?.travelProfile || profile?.id || "standard";
    let value = accessibility.connection === "verified" ? 0 : (priorities.liftUnknown || 1) * 0.75;
    if (["wheelchair", "stroller", "senior"].includes(travelProfile)) {
      if (accessibility.lift === "none" && accessibility.ramp === "none" && travelProfile === "wheelchair") return 1e8;
      const hasConnectedAccess = accessibility.lift === "connected" || accessibility.ramp === "connected";
      const hasNearbyAccess = accessibility.lift === "nearby" || accessibility.ramp === "nearby";
      if (!hasConnectedAccess) value += (priorities.liftUnknown || 1) * (hasNearbyAccess ? 0.5 : 1);
    }
    return value;
  }

  function findLastIndex(items, predicate) {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (predicate(items[index], index)) return index;
    }
    return -1;
  }

  function walkUncertaintyCost(metrics, profile) {
    if (!metrics || metrics.fallback) return 0;
    const priorities = profile?.priorities || window.MapableProfileService.resolve("standard").priorities;
    const surfaceUnknownCount = [metrics.unknownSurface, metrics.unknownWidth, metrics.unknownCurb].filter(Boolean).length;
    return surfaceUnknownCount * (priorities.surface || 1) * 0.35
      + (metrics.stairsUnknown ? (priorities.unknown || 1) * 0.75 : 0)
      + (metrics.entranceConnectionUnknown ? (priorities.liftUnknown || 1) * 0.75 : 0)
      + (metrics.unknownSlopeDetails ? (priorities.slope || 1) * 0.25 : 0)
      + (metrics.unknownCrossingAssist ? (priorities.crossing || 1) * 0.5 : 0);
  }

  function dedupeByGeometry() {
    const seen = new Set();
    return (option) => {
      const geometry = option.geometry || [];
      const sampleCount = Math.min(12, geometry.length);
      const key = Array.from({ length: sampleCount }, (_, index) => {
        const pointIndex = sampleCount === 1 ? 0 : Math.round(index * (geometry.length - 1) / (sampleCount - 1));
        const point = geometry[pointIndex];
        return `${point[0].toFixed(5)},${point[1].toFixed(5)}`;
      }).join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };
  }

  function dedupeByLabel() {
    const seen = new Set();
    return (option) => {
      const key = `${option.mode}:${option.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };
  }

  function dedupeBySignature() {
    const seen = new Set();
    return (option) => {
      const transit = (option.segments || []).filter((segment) => segment.mode !== "walk").map((segment) => `${segment.mode}:${segment.label}:${segment.fromName}:${segment.toName}`).join("|");
      const key = transit || `${option.mode}:${option.label}:${Math.round(option.walkDistance || option.distance || 0)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    };
  }

  function minBy(items, score) {
    return items.reduce((best, item) => score(item) < score(best) ? item : best, items[0]);
  }

  function segmentDistance(stops) {
    let distance = 0;
    for (let i = 1; i < stops.length; i += 1) distance += haversine(stops[i - 1], stops[i]);
    return distance;
  }

  function providerInfo(provider) {
    return PROVIDERS[provider] || { label: provider || "巴士", color: "#b45309" };
  }

  function busFareDetails(pattern, boardStop, profile) {
    const adultValues = [pattern?.tdPattern?.fullFare, boardStop?.fare, boardStop?.fareHoliday, pattern?.fare]
      .map(Number)
      .filter(Number.isFinite);
    const adult = adultValues.length ? Math.min(...adultValues) : null;
    if (profile?.id === "senior") {
      if (JOY_YOU_BUS_PROVIDERS.has(pattern?.provider)) {
        const policy = joyYouBusEligibility(pattern);
        if (policy.eligible && Number.isFinite(adult)) {
          return {
            value: joyYouConcessionFare(adult),
            profileMatched: true,
            product: "joyYou"
          };
        }
        return {
          value: adult,
          profileMatched: false,
          product: "joyYou",
          label: policy.status === "excluded"
            ? "樂悠咭不適用；65+ 長者票價待查"
            : fareUnavailableLabel(profile)
        };
      }
      const seniorValues = [pattern?.fareSenior, boardStop?.fareSenior, boardStop?.fareElderly]
        .map(Number)
        .filter(Number.isFinite);
      return seniorValues.length
        ? { value: Math.min(...seniorValues), profileMatched: true, product: "elderly" }
        : { value: adult, profileMatched: false, product: "elderly" };
    }
    return { value: adult, profileMatched: Number.isFinite(adult) };
  }

  function joyYouConcessionFare(adultFare) {
    const adult = Number(adultFare);
    if (!Number.isFinite(adult) || adult < 0) return null;
    if (adult < 2) return Math.round(adult * 10) / 10;
    if (adult <= 10) return 2;
    return Math.round(adult * 2) / 10;
  }

  function joyYouBusEligibility(pattern) {
    const provider = String(pattern?.provider || "").toUpperCase();
    if (!JOY_YOU_BUS_PROVIDERS.has(provider)) return { eligible: false, status: "not-applicable" };
    const tdPattern = pattern?.tdPattern;
    const company = String(tdPattern?.companyCode || "").toUpperCase();
    const expectedCompanies = [provider];
    if (!tdPattern || !expectedCompanies.includes(company)) return { eligible: false, status: "unknown" };

    const route = String(pattern?.route || tdPattern.route || "").trim().toUpperCase().replace(/\s+/g, "");
    const placeText = [
      pattern?.originTc, pattern?.destTc, pattern?.originEn, pattern?.destEn,
      tdPattern.originTc, tdPattern.destTc, tdPattern.originEn, tdPattern.destEn
    ].filter(Boolean).join(" ");
    const racecourse = /馬場|RACE\s*COURSE/i.test(placeText);
    if (racecourse) return { eligible: false, status: "excluded", reason: "racecourse" };

    if (provider === "KMB") {
      if (["P960", "P968", "HK1"].includes(route)) return { eligible: false, status: "excluded", reason: "named-route" };
    }
    if (provider === "LWB") {
      if (/^(?:A|NA)\d/i.test(route)) return { eligible: false, status: "excluded", reason: "airport" };
    }
    if (provider === "CTB") {
      if (/^(?:A|NA)\d/i.test(route)) return { eligible: false, status: "excluded", reason: "airport" };
      if (["H3", "H4", "H20"].includes(route)) return { eligible: false, status: "excluded", reason: "sightseeing" };
    }
    return { eligible: true, status: "eligible" };
  }

  function fareUnavailableLabel(profile) {
    return profile?.id === "senior"
      ? "樂悠咭車費待查"
      : "\u8eca\u8cbb\u5f85\u67e5";
  }

  function fareLabelForProfile(fare, approximate, profile, product = "") {
    if (!Number.isFinite(fare)) return fareUnavailableLabel(profile);
    const amount = fare % 1 ? fare.toFixed(1) : fare.toFixed(0);
    const passenger = profile?.id === "senior"
      ? product === "joyYou" ? "樂悠咭（60+）" : "長者八達通"
      : "\u6210\u4eba\u516b\u9054\u901a";
    return `${approximate ? "\u7d04 " : ""}$${amount} ${passenger}`;
  }

  function stopName(stop) {
    return stop?.nameTc || stop?.name_tc || stop?.nameZh || stop?.nameEn || stop?.name_en || stop?.id || "巴士站";
  }

  function stationName(station) {
    return station?.nameZh || station?.nameTc || station?.name || station?.nameEn || station?.code || "港鐵站";
  }

  function lightRailStopName(stop) {
    const name = stop?.nameTc || stop?.nameZh || stop?.nameEn || stop?.code || "輕鐵站";
    return /站$/.test(name) ? name : `${name}站`;
  }

  function lineLabel(line) {
    const labels = { AEL: "機場快綫", DRL: "迪士尼綫", EAL: "東鐵綫", ISL: "港島綫", KTL: "觀塘綫", SIL: "南港島綫", TCL: "東涌綫", TKL: "將軍澳綫", TML: "屯馬綫", TWL: "荃灣綫" };
    return labels[line] || line || "港鐵";
  }

  function placeFrom(place) {
    return { id: place.id, name: place.name, type: place.type, lat: place.lat, lng: place.lng };
  }

  function stationPlace(station) {
    return { name: stationName(station), type: "mtr", lat: station.lat, lng: station.lng, code: station.code };
  }

  function lightRailPlace(stop) {
    return { name: lightRailStopName(stop), type: "light_rail", lat: stop.lat, lng: stop.lng, code: stop.code };
  }

  function stopPlace(stop) {
    return { name: stopName(stop), type: "bus", lat: stop.lat, lng: stop.lng, id: stop.id };
  }

  function compactGeometry(points) {
    return (points || []).filter((point, index) => Array.isArray(point) && point.length >= 2 && (index === 0 || point[0] !== points[index - 1]?.[0] || point[1] !== points[index - 1]?.[1]));
  }

  function formatDistance(meters) {
    if (!Number.isFinite(meters)) return "--";
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} 公里` : `${Math.round(meters)} 米`;
  }

  function toChineseNumber(value) {
    return ["一", "二", "三", "四", "五", "六", "七", "八", "九"][value - 1] || String(value);
  }

  function haversine(a, b) {
    if (!a || !b) return Infinity;
    const radius = 6371000;
    const aLng = a.lng ?? a.long;
    const bLng = b.lng ?? b.long;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  class MinHeap {
    constructor() { this.items = []; }
    push(item) {
      this.items.push(item);
      this.bubbleUp(this.items.length - 1);
    }
    pop() {
      if (!this.items.length) return null;
      const top = this.items[0];
      const end = this.items.pop();
      if (this.items.length) {
        this.items[0] = end;
        this.sinkDown(0);
      }
      return top;
    }
    bubbleUp(index) {
      const item = this.items[index];
      while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);
        const parent = this.items[parentIndex];
        if (item.distance >= parent.distance) break;
        this.items[parentIndex] = item;
        this.items[index] = parent;
        index = parentIndex;
      }
    }
    sinkDown(index) {
      const length = this.items.length;
      const item = this.items[index];
      while (true) {
        const leftIndex = index * 2 + 1;
        const rightIndex = leftIndex + 1;
        let swap = null;
        if (leftIndex < length && this.items[leftIndex].distance < item.distance) swap = leftIndex;
        if (rightIndex < length) {
          const compare = swap === null ? item.distance : this.items[leftIndex].distance;
          if (this.items[rightIndex].distance < compare) swap = rightIndex;
        }
        if (swap === null) break;
        this.items[index] = this.items[swap];
        this.items[swap] = item;
        index = swap;
      }
    }
  }

  function scoreOption(option, profileKey) {
    return routeGeneralizedCost(option, window.MapableProfileService.resolve(profileKey));
  }

  function highResolutionNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  window.MapableRoutingService = {
    create,
    formatDistance,
    selectLightRailArrival,
    scoreOption,
    joyYouConcessionFare,
    joyYouBusEligibility,
    officialPedestrianTravelMode,
    officialPedestrianRouteSegmentFromResponse
  };
})();
