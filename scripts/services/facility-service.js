(function () {
  "use strict";

  const cache = new Map();
  const kinds = new Set(["publicToilet", "aed"]);
  const triStates = new Set(["yes", "no", "unknown"]);
  const accessStates = new Set(["yes", "conditional", "no", "unknown"]);

  async function load(url) {
    if (!cache.has(url)) {
      cache.set(url, fetch(url).then((response) => {
        if (!response.ok) throw new Error("Public facility data HTTP " + response.status);
        return response.json();
      }).then(normalizePayload).catch((error) => {
        cache.delete(url);
        throw error;
      }));
    }
    return cache.get(url);
  }

  function normalizePayload(payload) {
    const items = (payload?.items || []).filter((item) => item && item.id && kinds.has(item.kind)).map((item) => ({
      ...item,
      lat: Number(item.lat),
      lng: Number(item.lng),
      publicAccess: accessStates.has(item.publicAccess) ? item.publicAccess : "unknown",
      accessibleToilet: triStates.has(item.accessibleToilet) ? item.accessibleToilet : "unknown",
      universalToilet: triStates.has(item.universalToilet) ? item.universalToilet : "unknown",
      temporarilyClosed: triStates.has(item.temporarilyClosed) ? item.temporarilyClosed : "unknown",
      sourceRefs: Array.isArray(item.sourceRefs) ? item.sourceRefs : []
    }));
    return { meta: payload?.meta || {}, items };
  }

  function forKind(items, kind) {
    if (!kinds.has(kind)) return [];
    return (items || []).filter((item) => item.kind === kind);
  }

  function mappable(items, kind) {
    return forKind(items, kind).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }

  function inBounds(items, kind, bounds, paddingRatio = 0.18) {
    if (!bounds) return [];
    const latPadding = Math.max(0, bounds.north - bounds.south) * paddingRatio;
    const lngPadding = Math.max(0, bounds.east - bounds.west) * paddingRatio;
    return mappable(items, kind).filter((item) => item.lat >= bounds.south - latPadding
      && item.lat <= bounds.north + latPadding
      && item.lng >= bounds.west - lngPadding
      && item.lng <= bounds.east + lngPadding);
  }

  window.MapableFacilityService = {
    forKind,
    inBounds,
    load,
    mappable,
    normalizePayload
  };
})();
