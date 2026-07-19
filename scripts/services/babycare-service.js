(function () {
  "use strict";

  const cache = new Map();

  async function load(url) {
    if (!cache.has(url)) {
      cache.set(url, fetch(url).then((response) => {
        if (!response.ok) throw new Error("Babycare data HTTP " + response.status);
        return response.json();
      }).then(normalizePayload).catch((error) => {
        cache.delete(url);
        throw error;
      }));
    }
    return cache.get(url);
  }

  function normalizePayload(payload) {
    const items = (payload?.items || []).filter((item) => item && item.id).map((item) => ({
      ...item,
      lat: item.lat === null ? null : Number(item.lat),
      lng: item.lng === null ? null : Number(item.lng),
      coordinateConfidence: Number(item.coordinateConfidence) || 0,
      roomCount: Math.max(1, Number(item.roomCount) || 1)
    }));
    return { meta: payload?.meta || {}, items };
  }

  function mappable(items, minimumConfidence = 0.7) {
    return (items || []).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)
      && item.coordinateConfidence >= minimumConfidence);
  }

  function inBounds(items, bounds, paddingRatio = 0.18) {
    if (!bounds) return [];
    const latPadding = Math.max(0, bounds.north - bounds.south) * paddingRatio;
    const lngPadding = Math.max(0, bounds.east - bounds.west) * paddingRatio;
    return mappable(items).filter((item) => item.lat >= bounds.south - latPadding
      && item.lat <= bounds.north + latPadding
      && item.lng >= bounds.west - lngPadding
      && item.lng <= bounds.east + lngPadding);
  }

  function project(point, referenceLat) {
    const lat = Number(point.lat ?? point[0]);
    const lng = Number(point.lng ?? point[1]);
    const radians = referenceLat * Math.PI / 180;
    return { x: lng * 111320 * Math.cos(radians), y: lat * 110540 };
  }

  function pointSegmentDistance(point, start, end) {
    const referenceLat = (Number(point.lat) + Number(start[0]) + Number(end[0])) / 3;
    const p = project(point, referenceLat);
    const a = project(start, referenceLat);
    const b = project(end, referenceLat);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (!dx && !dy) return Math.hypot(p.x - a.x, p.y - a.y);
    const ratio = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + ratio * dx), p.y - (a.y + ratio * dy));
  }

  function pointToGeometryDistance(point, geometry) {
    let best = Infinity;
    for (let index = 1; index < (geometry || []).length; index += 1) {
      const start = geometry[index - 1];
      const end = geometry[index];
      if (!Array.isArray(start) || !Array.isArray(end)) continue;
      best = Math.min(best, pointSegmentDistance(point, start, end));
    }
    return best;
  }

  function nearRoute(items, geometry, radiusMeters = 180) {
    if (!Array.isArray(geometry) || geometry.length < 2) return [];
    return mappable(items).map((item) => ({ ...item, routeDistance: pointToGeometryDistance(item, geometry) }))
      .filter((item) => item.routeDistance <= radiusMeters)
      .sort((a, b) => a.routeDistance - b.routeDistance || sourceRank(a) - sourceRank(b));
  }

  function nearSegments(items, geometries, radiusMeters = 180) {
    const matches = new Map();
    for (const geometry of geometries || []) {
      for (const item of nearRoute(items, geometry, radiusMeters)) {
        const existing = matches.get(item.id);
        if (!existing || item.routeDistance < existing.routeDistance) matches.set(item.id, item);
      }
    }
    return [...matches.values()].sort((a, b) => a.routeDistance - b.routeDistance || sourceRank(a) - sourceRank(b));
  }

  function sourceRank(item) {
    return { government_official: 0, transit_official: 1, venue_official: 2, community_program: 3 }[item.sourceTier] ?? 4;
  }

  function summarize(items) {
    return (items || []).reduce((result, item) => {
      if (item.facilityKind === "breastfeeding_friendly") result.friendlyPremises += 1;
      else result.rooms += item.roomCount || 1;
      result.locations += 1;
      return result;
    }, { rooms: 0, friendlyPremises: 0, locations: 0 });
  }

  window.MapableBabycareService = {
    inBounds,
    load,
    mappable,
    nearRoute,
    nearSegments,
    normalizePayload,
    pointToGeometryDistance,
    summarize
  };
})();
