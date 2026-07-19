(function () {
  "use strict";

  const routeDataSource = typeof document !== "undefined" ? document.currentScript?.src || "" : "";
  const pageAssetVersion = routeDataSource.match(/[?&]v=([^&#]+)/)?.[1] || "";
  const workerAssetVersion = typeof document === "undefined" && typeof self !== "undefined"
    ? String(self.location?.search || "").match(/[?&]v=([^&#]+)/)?.[1] || ""
    : "";
  const localAssetVersion = pageAssetVersion || workerAssetVersion;
  const legacyDataBases = [
    "https://media.githubusercontent.com/media/Ellthy0721/Mapable-HK/main/%233%20-%20%E5%8F%AF%E7%94%A8%E7%89%88%E6%9C%AC/data/",
    "https://raw.githubusercontent.com/Ellthy0721/Mapable-HK/main/%233%20-%20%E5%8F%AF%E7%94%A8%E7%89%88%E6%9C%AC/data/",
    "https://raw.githubusercontent.com/Ellthy0721/accessmap-hk/main/%233%20-%20%E5%8F%AF%E7%94%A8%E7%89%88%E6%9C%AC/data/"
  ];
  const cache = new Map();
  const mergedRouteCache = new Map();
  const FETCH_TIMEOUT_MS = 12000;

  async function loadJson(paths) {
    const candidates = (Array.isArray(paths) ? paths : [paths]).flat();
    let lastError = null;
    for (const path of candidates) {
      try {
        if (!cache.has(path)) {
          cache.set(path, fetchJson(path));
        }
        return await cache.get(path);
      } catch (error) {
        cache.delete(path);
        lastError = error;
      }
    }
    throw lastError || new Error("資料載入失敗");
  }

  function legacy(path) {
    return legacyDataBases.map((base) => `${base}${path}`);
  }

  async function loadRouteIndex() {
    return loadJson(["data/routes.tiles/index.json", ...legacy("routes.tiles/index.json")]);
  }

  async function loadRouteTile(tileId) {
    return loadJson([`data/routes.tiles/${tileId}.json`, ...legacy(`routes.tiles/${tileId}.json`)]);
  }

  async function loadMtr() {
    return loadJson(["data/transit.mtr.json", legacy("transit.mtr.json")]);
  }

  async function loadMtrExits() {
    return loadJson(["data/transit.mtr-exits.json"]);
  }

  async function loadKmb() {
    return loadJson(["data/transit.kmb.json", legacy("transit.kmb.json")]);
  }

  async function loadCitybus() {
    return loadJson(["data/transit.citybus.json"]);
  }

  async function loadNlb() {
    return loadJson(["data/transit.nlb.json"]);
  }

  async function loadMtrBus() {
    return loadJson(["data/transit.mtr-bus.json"]);
  }

  async function loadLightRail() {
    return loadJson(["data/transit.light-rail.json"]);
  }

  async function loadFares() {
    return loadJson(["data/transit.fares.json"]);
  }

  async function loadTdBus() {
    return loadJson(["data/transit.td-bus.json"]);
  }

  async function loadRailGeometry() {
    return loadJson(["data/transit.rail-geometry.json"]);
  }

  async function loadWalkingAccessibility() {
    return loadJson(["data/walking-accessibility.json"]);
  }

  async function loadPublicWalkingStructures() {
    return loadJson(["data/walking-public-structures.json"]);
  }

  async function fetchJson(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const target = localAssetVersion && /^data\//.test(path)
        ? `${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(localAssetVersion)}`
        : path;
      const response = await fetch(target, { cache: "force-cache", signal: controller.signal });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadRouteShapeManifest() {
    return loadJson(["data/transit.route-shapes/manifest.json"]);
  }

  async function loadRouteShapeBucket(filename) {
    if (!/^[a-z0-9-]+\.json$/i.test(filename || "")) throw new Error("Invalid route shape bucket");
    return loadJson(["data/transit.route-shapes/" + filename]);
  }

  function mergeRouteTiles(tiles) {
    const nodes = new Map();
    const edges = new Map();
    tiles.forEach((tile) => {
      (tile.nodes || []).forEach((node) => nodes.set(node.id, node));
      (tile.edges || []).forEach((edge) => edges.set(edge.id, edge));
    });
    return {
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      meta: { tileCount: tiles.length, nodeCount: nodes.size, edgeCount: edges.size }
    };
  }

  async function loadRouteTiles(tileIds) {
    const ids = [...new Set(tileIds)].sort();
    const key = ids.join("|");
    if (!mergedRouteCache.has(key)) {
      mergedRouteCache.set(key, Promise.all(ids.map(loadRouteTile)).then(mergeRouteTiles));
      if (mergedRouteCache.size > 16) mergedRouteCache.delete(mergedRouteCache.keys().next().value);
    }
    try {
      return await mergedRouteCache.get(key);
    } catch (error) {
      mergedRouteCache.delete(key);
      throw error;
    }
  }

  window.MapableRouteData = { loadJson, loadRouteIndex, loadRouteTile, loadRouteTiles, loadMtr, loadMtrExits, loadKmb, loadCitybus, loadNlb, loadMtrBus, loadLightRail, loadFares, loadTdBus, loadRailGeometry, loadWalkingAccessibility, loadPublicWalkingStructures, loadRouteShapeManifest, loadRouteShapeBucket };
})();
