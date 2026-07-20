(function () {
  "use strict";
  const i18n = window.MapableI18n;
  const t = (key, params) => i18n.t(key, params);

  const hkCenter = [22.3193, 114.1694];
  const LOCATION_REFRESH_INTERVAL_MS = 15000;
  const BABYCARE_CLUSTER_SETTLE_MS = 340;
  const MTR_EXIT_MARKER_MIN_ZOOM = 14;
  const ROUTE_LABEL_MIN_ZOOM = 11;
  const DEPARTURE_INLINE_MIN_WIDTH = 292;
  const DEPARTURE_SWITCH_DURATION_MS = 340;
  const AI_STUDIO_PROMO_SESSION_KEY = "mapable-ai-studio-promo-dismissed";
  const DEPARTURE_INPUT_SEGMENTS = Object.freeze([
    { start: 0, end: 4, length: 4 },
    { start: 5, end: 7, length: 2 },
    { start: 8, end: 10, length: 2 },
    { start: 11, end: 13, length: 2 },
    { start: 14, end: 16, length: 2 }
  ]);
  const MOBILE_RESULTS_QUERY = "(max-width: 1120px) and (orientation: portrait)";
  const MOBILE_RESULTS_STATES = ["collapsed", "medium", "large", "expanded"];
  const places = [];
  let placeLocalizationIndex = new Map();

  const knownRoutes = {
    "mtr-kot:fw-toilet": [[22.33738, 114.17457], [22.33752, 114.17442], [22.33772, 114.17425], [22.33796, 114.17402]],
    "fw-toilet:mtr-kot": [[22.33796, 114.17402], [22.33772, 114.17425], [22.33752, 114.17442], [22.33738, 114.17457]],
    "mtr-adm:mtr-tum": [[22.27854, 114.1646], [22.27938, 114.1621], [22.337, 114.04], [22.39442, 113.97519], [22.39535, 113.97392]],
    "mtr-tum:mtr-adm": [[22.39535, 113.97392], [22.39442, 113.97519], [22.337, 114.04], [22.27938, 114.1621], [22.27854, 114.1646]]
  };

  const state = { language: i18n.getLanguage(), resultStatus: "pending", profile: "senior", colorMode: "default", contrastMode: "standard", contrastModeBeforeLowVision: null, profileMeta: null, profileNotice: "", start: null, end: null, autoLocationStart: false, autoLocationStartEditing: false, pickMode: null, pendingMapPick: null, restoreResultsAfterPick: false, restorePlannerAfterPick: null, route: null, routeOptions: [], activeRouteIndex: 0, activeSegmentIndex: null, currentLocation: null, locationDenied: false, locationUnavailable: false, departureMode: "now", departureTime: null, departure: null, unavailableRoutes: [], activeFacilityLayer: null, babycareVisible: false, babycareData: null, publicFacilityData: null };
  let map;
  let mapLabelLayer;
  let startMarker;
  let endMarker;
  let routeLayer;
  let routeSegmentLayers = [];
  let placeLayer;
  let babycareLayer;
  let babycareLoadPromise;
  let babycareMarkers = new Map();
  let babycareViewportSignature = "";
  let babycareViewportTimer = null;
  let babycareZoomInProgress = false;
  let babycareRouteLayoutFrame = 0;
  let publicFacilityLayer;
  let publicFacilityLoadPromise;
  let publicFacilityMarkers = new Map();
  let publicFacilityViewportSignature = "";
  let publicFacilityRenderedKind = null;
  let publicFacilityViewportTimer = null;
  let publicFacilityZoomInProgress = false;
  let currentLocationMarker;
  let currentAccuracyCircle;
  let locationRefreshTimer = null;
  let locationRequestInFlight = false;
  let mapPickPreviewMarker;
  let mapPickLayoutObserver;
  let mapInfoOverlayState = null;
  let mapInfoPositionFrame = 0;
  let searchService;
  let routeService;
  let routePlanningToken = 0;
  let routePlanningScheduleToken = 0;
  let searchToken = 0;
  let searchPositionFrame = 0;
  let isPlanningRoute = false;
  let mobileResultsLayoutActive = false;
  let mobilePlannerCollapsed = false;
  let mobilePlannerCollapsedBeforeResultsExpansion = false;
  let mobileResultsScrollExpansionSuppressedUntil = 0;
  let plannerUserCollapsed = false;
  let plannerAutoCollapsed = false;
  let departureDatepicker = null;
  let departurePickerLastValidValue = "";
  let departurePickerActiveSegment = 0;
  let departurePickerEditBuffer = "";
  let departureSliderNormalizeFrame = 0;
  const departureSliderRejectTimers = new WeakMap();
  let departureLayoutObserver = null;
  let departureSequenceAnimationToken = 0;
  let mobileSegmentRefitToken = 0;
  const searchTimers = new Map();
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    i18n.applyDocument();
    updateBrandLogo();
    initMap();
    const indexPlaces = await MapableSearchService.loadIndex("data/search-index.json");
    placeLocalizationIndex = buildPlaceLocalizationIndex(indexPlaces);
    searchService = MapableSearchService.createSearchService(places, indexPlaces);
    routeService = MapableRouteWorkerClient.create(() => MapableRoutingService.create());
    bindEvents();
    applyProfileUi(state.profile);
    setInput("start-input", state.start);
    setInput("end-input", state.end);
    renderPlaces();
    renderPendingRoute();
    requestCurrentLocation({ initial: true, setMapView: true, setStartOnSuccess: true });
    setTimeout(() => map.invalidateSize(), 120);
  }

  function initMap() {
    map = L.map("map", { zoomControl: false, attributionControl: false }).setView(hkCenter, 11);
    L.control.zoom({ position: "topright" }).addTo(map);
    setTimeout(renderZoomControlIcons, 0);
    L.tileLayer("https://api.hkmapservice.gov.hk/ags/map/basemap/WGS84/tile/{z}/{y}/{x}?key=6d31536061a9447da6d876feb2d5b277", {
      maxZoom: 18,
      maxNativeZoom: 16,
      attribution: ""
    }).addTo(map);
    mapLabelLayer = L.tileLayer(mapLabelTileUrl(), {
      maxZoom: 18,
      maxNativeZoom: 16,
      attribution: ""
    }).addTo(map);
    placeLayer = L.layerGroup().addTo(map);
    const babycarePane = map.createPane("babycarePane");
    babycarePane.style.zIndex = "590";
    babycareLayer = typeof L.markerClusterGroup === "function"
      ? L.markerClusterGroup({
        maxClusterRadius: 58,
        clusterPane: "babycarePane",
        showCoverageOnHover: false,
        animate: true,
        spiderfyOnMaxZoom: true,
        spiderfyDistanceMultiplier: 1.15,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          const digitClass = count >= 1000 ? " is-four-digits" : "";
          return L.divIcon({
            html: '<span class="babycare-cluster-count' + digitClass + '" aria-hidden="true">' + count
              + '</span><span class="sr-only">' + count + " " + escapeHtml(t("facility.babycare")) + "</span>",
            className: "babycare-cluster",
            iconSize: L.point(40, 40)
          });
        }
      })
      : L.layerGroup();
    const publicFacilityPane = map.createPane("publicFacilityPane");
    publicFacilityPane.style.zIndex = "585";
    publicFacilityLayer = typeof L.markerClusterGroup === "function"
      ? L.markerClusterGroup({
        maxClusterRadius: 54,
        clusterPane: "publicFacilityPane",
        showCoverageOnHover: false,
        animate: true,
        spiderfyOnMaxZoom: true,
        spiderfyDistanceMultiplier: 1.15,
        iconCreateFunction(cluster) {
          const count = cluster.getChildCount();
          const digitClass = count >= 1000 ? " is-four-digits" : "";
          const kind = publicFacilityRenderedKind || state.activeFacilityLayer || "publicToilet";
          const label = t(kind === "aed" ? "facility.aed" : "facility.publicToilet");
          return L.divIcon({
            html: '<span class="public-facility-cluster-count is-' + facilityKindClass(kind) + digitClass + '" aria-hidden="true">' + count
              + '</span><span class="sr-only">' + count + " " + escapeHtml(label) + "</span>",
            className: "public-facility-cluster",
            iconSize: L.point(40, 40)
          });
        }
      })
      : L.layerGroup();
    map.on("click", onMapClick);
    map.on("zoomstart zoomend moveend", scheduleBabycareViewportRender);
    map.on("zoomstart zoomend moveend", schedulePublicFacilityViewportRender);
    map.on("zoomend", syncMapAnnotationVisibility);
    map.on("move zoom resize", scheduleMapInfoOverlayPosition);
    syncMapAnnotationVisibility();
  }

  function syncMapAnnotationVisibility() {
    if (!map) return;
    const mapElement = document.getElementById("map");
    if (!mapElement) return;
    const zoom = map.getZoom();
    const exitsHidden = zoom < MTR_EXIT_MARKER_MIN_ZOOM;
    mapElement.classList.toggle("are-mtr-exits-hidden", exitsHidden);
    mapElement.classList.toggle("are-route-labels-hidden", zoom < ROUTE_LABEL_MIN_ZOOM);
    if (exitsHidden && mapInfoOverlayState?.kind === "mtr-exit") closeMapInfoOverlay();
  }


  function renderZoomControlIcons() {
    const zoomIn = document.querySelector(".leaflet-control-zoom-in");
    const zoomOut = document.querySelector(".leaflet-control-zoom-out");
    if (zoomIn) {
      zoomIn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
      zoomIn.title = t("map.zoomIn");
      zoomIn.setAttribute("aria-label", t("map.zoomIn"));
    }
    if (zoomOut) {
      zoomOut.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
      zoomOut.title = t("map.zoomOut");
      zoomOut.setAttribute("aria-label", t("map.zoomOut"));
    }
    syncFacilityControlGeometry();
  }

  function syncFacilityControlGeometry() {
    const controls = document.querySelector(".facility-layer-controls");
    const zoom = document.querySelector(".leaflet-control-zoom");
    if (!controls || !zoom) return;
    const stackHeight = zoom.getBoundingClientRect().height;
    const rowGap = Number.parseFloat(getComputedStyle(controls).rowGap) || 0;
    controls.style.setProperty("--facility-control-stack-height", stackHeight + "px");
    controls.style.setProperty("--facility-control-button-size", Math.max(0, (stackHeight - rowGap) / 2) + "px");
  }
  function bindEvents() {
    document.getElementById("route-form").addEventListener("submit", handleRouteSubmit);
    bindSearch("start");
    bindSearch("end");
    document.querySelectorAll(".profile-button").forEach((button) => button.addEventListener("click", () => {
      if (expandPlannerFromCompactProfile()) return;
      setProfile(button.dataset.profile);
    }));
    document.querySelectorAll(".visual-mode-button").forEach((button) => button.addEventListener("click", () => setColorMode(button.dataset.colorMode)));
    document.querySelector(".profile-strip")?.addEventListener("keydown", handleProfileKeydown);
    document.querySelector("#visual-mode-picker [role='group']")?.addEventListener("keydown", moveButtonFocus);
    document.getElementById("route-options")?.addEventListener("keydown", handleRouteOptionKeydown);
    document.getElementById("swap-button").addEventListener("click", swapPlaces);
    document.getElementById("fit-route").addEventListener("click", () => fitRoute({ revealMap: true }));
    document.getElementById("fit-hk").addEventListener("click", () => map.setView(hkCenter, 11));
    document.getElementById("locate-button").addEventListener("click", handleLocateButton);
    document.getElementById("babycare-layer-toggle")?.addEventListener("click", () => toggleBabycareLayer());
    document.getElementById("public-toilet-layer-toggle")?.addEventListener("click", () => toggleFacilityLayer("publicToilet"));
    document.getElementById("aed-layer-toggle")?.addEventListener("click", () => toggleFacilityLayer("aed"));
    document.getElementById("confirm-map-pick").addEventListener("click", confirmMapPick);
    document.getElementById("cancel-map-pick").addEventListener("click", () => setPickMode(null));
    document.getElementById("close-map-info")?.addEventListener("click", closeMapInfoOverlay);
    document.getElementById("map-info-content")?.addEventListener("click", handleMapInfoAction);
    bindAiStudioPromo();
    bindSettingsDialog();
    document.addEventListener("mapable:languagechange", handleLanguageChange);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.pickMode) setPickMode(null);
      if (event.key === "Escape") closeMapInfoOverlay();
      if (event.key === "Escape" && !document.getElementById("visual-mode-picker")?.hidden) {
        setVisualPickerOpen(false);
        document.querySelector('[data-profile="colorVision"]')?.focus();
      }
    });
    bindDepartureControls();
    bindCollapsiblePanels();
    bindResultsExpansion();
    bindPlannerPanelHandle();
    bindMobileResultsSheet();
    bindMapPickLayout();
    bindHorizontalScroller(document.querySelector(".profile-strip"));
    bindHorizontalScroller(document.getElementById("route-options"));
    bindHorizontalScroller(document.getElementById("walk-segment-nav"));
    window.addEventListener("resize", () => {
      scheduleSearchPanelPositioning();
      syncDepartureLayout({ animate: false });
      syncResultsLayoutForViewport();
      syncMapPickLayout();
      syncFacilityControlGeometry();
      scheduleBabycareRouteListLayout();
    });
    window.visualViewport?.addEventListener("resize", scheduleSearchPanelPositioning);
    window.visualViewport?.addEventListener("scroll", scheduleSearchPanelPositioning);
    document.querySelector(".planner-pane .panel-content")?.addEventListener("scroll", scheduleSearchPanelPositioning);
    syncResultsLayoutForViewport();
  }

  function bindAiStudioPromo() {
    const promo = document.getElementById("ai-studio-promo");
    const closeButton = document.getElementById("close-ai-studio-promo");
    if (!promo || !closeButton) return;
    try {
      promo.hidden = sessionStorage.getItem(AI_STUDIO_PROMO_SESSION_KEY) === "1";
    } catch (_error) {
      promo.hidden = false;
    }
    closeButton.addEventListener("click", () => {
      promo.hidden = true;
      try {
        sessionStorage.setItem(AI_STUDIO_PROMO_SESSION_KEY, "1");
      } catch (_error) {
        // Closing still works when session storage is unavailable.
      }
    });
  }

  function bindSettingsDialog() {
    const trigger = document.getElementById("settings-button");
    const dialog = document.getElementById("settings-dialog");
    const closeButton = document.getElementById("close-settings");
    const contrastToggle = document.getElementById("contrast-mode-toggle");
    if (!trigger || !dialog || !closeButton) return;
    trigger.addEventListener("click", () => {
      if (!dialog.open) dialog.showModal();
    });
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => trigger.focus({ preventScroll: true }));
    contrastToggle?.addEventListener("click", () => {
      setContrastMode(state.contrastMode === "highContrast" ? "standard" : "highContrast");
    });
    dialog.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", () => i18n.setLanguage(button.dataset.language));
    });
    document.getElementById("language-selector")?.addEventListener("keydown", moveButtonFocus);
    renderContrastModeControl();
  }

  function handleLanguageChange(event) {
    state.language = event.detail?.language || i18n.getLanguage();
    updateBrandLogo();
    mapLabelLayer?.setUrl(mapLabelTileUrl());
    renderZoomControlIcons();
    closeMapInfoOverlay();
    setInput("start-input", state.start);
    setInput("end-input", state.end);
    refreshDeparturePickerLanguage();
    renderDepartureControls({ animate: false });
    updateLocateButton();
    if (isPlanningRoute || state.resultStatus === "planning") {
      renderPlanningRoute(t("planning.title"), t("planning.description"));
    } else if (state.route) {
      renderRouteOptions();
      renderRoute(state.route, { fit: false, updateStatus: false });
      renderResults(state.route);
      setStatus(`${localizedDataText(state.route.title)}: ${t("mode.walk")} ${formatDistance(state.route.walkDistance ?? state.route.distance)}, ${formatDuration(state.route.minutes)}`);
    } else if (state.resultStatus === "no-route") {
      renderNoRoute({
        unavailableRoutes: state.unavailableRoutes,
        departure: state.departure,
        profile: state.profileMeta,
        profileNotice: state.profileNotice
      }, { preserveResultsState: true });
    } else {
      renderPendingRoute({ preserveResultsState: true });
    }
    ["start", "end"].forEach((kind) => {
      const results = document.getElementById(`${kind}-results`);
      if (!results?.classList.contains("is-open")) return;
      const query = document.getElementById(`${kind}-input`)?.value.trim();
      if (query) showSearchResults(kind);
      else showEmptySearchMenu(kind);
    });
    if (state.activeFacilityLayer === "babycare") {
      babycareMarkers.clear();
      babycareLayer?.clearLayers();
      babycareViewportSignature = "";
      renderBabycareViewport();
    } else if (state.activeFacilityLayer) {
      publicFacilityMarkers.clear();
      publicFacilityLayer?.clearLayers();
      publicFacilityViewportSignature = "";
      renderPublicFacilityViewport();
    }
    syncDepartureLayout({ animate: false });
    scheduleSearchPanelPositioning();
  }

  function updateBrandLogo() {
    const logo = document.querySelector(".brand-logo");
    if (!logo) return;
    logo.src = state.language === "en" ? "assets/logoEN.png"
      : state.language === "zh-Hans" ? "assets/logoSC.png"
        : "assets/logoTC.png";
  }

  function mapLabelTileUrl() {
    const labelLanguage = state.language === "en" ? "en" : state.language === "zh-Hans" ? "sc" : "tc";
    return `https://api.hkmapservice.gov.hk/ags/map/label-${labelLanguage}/WGS84/tile/{z}/{y}/{x}?key=6d31536061a9447da6d876feb2d5b277`;
  }

  function refreshDeparturePickerLanguage() {
    if (!departureDatepicker) return;
    departureDatepicker.update({
      locale: departurePickerLocale(),
      buttons: [{
        content: t("common.confirm"),
        onClick(datepicker) {
          const input = document.getElementById("departure-time-trigger");
          if (input && commitDeparturePickerValue(input)) datepicker.hide();
        }
      }]
    });
  }

 function localizedPlaceAddress(place) {
   return i18n.placeAddress(place);
 }

  function localizedDataText(value) {
    return i18n.dataText(value);
  }

  function buildPlaceLocalizationIndex(indexPlaces) {
    const index = new Map();
    (indexPlaces || []).forEach((place) => {
      [place.name, ...(place.aliases || [])].forEach((label) => {
        const key = String(label || "").trim();
        if (key && !index.has(key)) index.set(key, place);
      });
    });
    return index;
  }

  function containsHan(value) {
    return /[\u3400-\u9fff]/u.test(String(value || ""));
  }

  function findPlaceLocalization(value) {
    const source = String(value || "").trim();
    const direct = [source, source.replace(/\u7ad9$/u, "")].find((key) => placeLocalizationIndex.has(key));
    if (direct) return placeLocalizationIndex.get(direct);
    if (state.language !== "en" || !source) return null;
    return [...placeLocalizationIndex.entries()]
      .filter(([label]) => containsHan(label) && label.length >= 2 && source.includes(label))
      .sort((left, right) => right[0].length - left[0].length)[0]?.[1] || null;
  }

  function englishNameForSource(value) {
    const source = String(value || "").trim();
    const candidates = [...placeLocalizationIndex.entries()]
      .filter(([label]) => containsHan(label) && label.length >= 2 && source.includes(label))
      .map(([label, place]) => ({ label, english: i18n.placeName(place) }))
      .filter((item) => item.english && !containsHan(item.english))
      .sort((left, right) => right.label.length - left.label.length);
    if (!candidates.length) return "";
    const unique = candidates
      .map((item) => item.english)
      .filter((name, index, names) => index === names.indexOf(name));
    if (source.endsWith("\u9644\u8fd1\u5730\u9ede")) {
      return t("place.nearbyNamed", { place: unique.slice(0, 3).join(", ") });
    }
    const exit = source.match(/^(.*?)\s+([A-Z]\d*(?:\s*\/\s*[A-Z]\d*)?)\s*\u51fa\u53e3$/u);
    if (exit) {
      const base = englishNameForSource(exit[1]);
      if (base) return base + " " + exit[2] + " Exit";
    }
    return unique[0];
  }

  function localizedPlaceName(place) {
    const value = i18n.placeName(place);
    if (state.language !== "en" || !containsHan(value)) return value;
    return englishNameForSource(place?.name)
      || (place?.type ? t(`type.${place.type}`) : "")
      || t("place.unknown");
  }

  function localizedNameText(value) {
    const source = String(value || "").trim();
    const english = state.language === "en" ? englishNameForSource(source) : "";
    return english || localizedDataText(source);
  }

  function localizedFacilityName(facility) {
    if (state.language === "en" && facility?.nameEn) return String(facility.nameEn).trim();
    return localizedDataText(facility?.name || "");
  }

  function localizedFacilityValue(facility, field, englishField = "") {
    if (state.language === "en" && englishField && facility?.[englishField]) return String(facility[englishField]).trim();
    return localizedDataText(facility?.[field] || "");
  }

  function bindDepartureControls() {
    document.querySelectorAll("[data-departure-mode]").forEach((button) => {
      button.addEventListener("click", () => setDepartureMode(button.dataset.departureMode));
    });
    bindDeparturePicker();
    bindDepartureLayout();
    renderDepartureControls({ animate: false });
  }

  function setDepartureMode(mode) {
    const nextMode = ["planned", "all"].includes(mode) ? mode : "now";
    if (state.departureMode === nextMode) return;
    state.departureMode = nextMode;
    if (state.departureMode === "planned" && !state.departureTime) {
      state.departureTime = nextPlannedDeparture().toISOString();
    }
    renderDepartureControls({ animate: true });
    if (state.start && state.end) scheduleRoutePlanAfterPaint({ preserveResultsState: true });
  }

  function scheduleRoutePlanAfterPaint(options = {}) {
    const scheduleToken = ++routePlanningScheduleToken;
    routePlanningToken += 1;
    prepareMapForRoutePlanning();
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scheduleToken !== routePlanningScheduleToken) return;
        planRoute(options);
      }, 0);
    });
  }

  function renderDepartureControls(options = {}) {
    const departureUi = getDepartureUi();
    const animate = Boolean(options.animate);
    const previousRects = animate ? captureDepartureRects(departureUi) : null;
    document.querySelectorAll("[data-departure-mode]").forEach((button) => {
      const active = button.dataset.departureMode === state.departureMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const editor = document.querySelector(".departure-editor");
    if (editor) editor.dataset.departureMode = state.departureMode;
    const trigger = document.getElementById("departure-time-trigger");
    const settingLabel = document.getElementById("departure-setting-label");
    if (!trigger) return;
    const planned = state.departureMode === "planned";
    trigger.hidden = false;
    trigger.disabled = !planned;
    trigger.tabIndex = planned ? 0 : -1;
    trigger.classList.toggle("is-visible", planned);
    trigger.setAttribute("aria-hidden", String(!planned));
    if (settingLabel) {
      settingLabel.hidden = false;
      settingLabel.classList.toggle("is-visible", !planned);
      settingLabel.setAttribute("aria-hidden", String(planned));
      settingLabel.textContent = state.departureMode === "all" ? t("departure.unfiltered") : t("departure.realtime");
    }
    if (planned) {
      const date = state.departureTime ? new Date(state.departureTime) : nextPlannedDeparture();
      const value = formatDepartureTimeLabel(date);
      trigger.value = value;
      departurePickerLastValidValue = value;
      trigger.setAttribute("aria-label", t("departure.plannedAria", { value }));
    }
    syncDepartureLayout({ animate, previousRects });
    scheduleMobileLayoutMetrics();
  }

  function bindDepartureLayout() {
    const departureUi = getDepartureUi();
    if (!departureUi.editor) return;
    departureLayoutObserver?.disconnect();
    departureLayoutObserver = new ResizeObserver(() => {
      syncDepartureLayout({ animate: false });
    });
    departureLayoutObserver.observe(departureUi.editor);
  }

  function getDepartureUi() {
    const editor = document.querySelector(".departure-editor");
    const modes = editor?.querySelector(".departure-modes");
    const setting = modes?.querySelector(".departure-setting");
    const buttons = modes ? Array.from(modes.querySelectorAll("[data-departure-mode]")) : [];
    return { editor, modes, setting, buttons };
  }

  function captureDepartureRects(departureUi) {
    const elements = [...departureUi.buttons, departureUi.setting].filter(Boolean);
    return new Map(elements.map((element) => [element, element.getBoundingClientRect()]));
  }

  function departureLayoutFor(editor) {
    const width = editor.getBoundingClientRect().width;
    return window.innerWidth >= 320 && width >= DEPARTURE_INLINE_MIN_WIDTH ? "inline" : "stacked";
  }

  function syncDepartureLayout(options = {}) {
    const departureUi = getDepartureUi();
    const { editor, setting, buttons } = departureUi;
    if (!editor || !setting || buttons.length !== 3) return;
    const previousRects = options.previousRects || (options.animate ? captureDepartureRects(departureUi) : null);
    const layout = departureLayoutFor(editor);
    editor.dataset.departureLayout = layout;
    const activeButton = buttons.find((button) => button.dataset.departureMode === state.departureMode) || buttons[0];
    const anchor = layout === "inline" ? activeButton : buttons[buttons.length - 1];
    anchor.after(setting);
    if (options.animate) animateDepartureSequence(departureUi, previousRects, layout);
  }

  function animateDepartureSequence(departureUi, previousRects, layout) {
    if (!previousRects || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const token = ++departureSequenceAnimationToken;
    requestAnimationFrame(() => {
      if (token !== departureSequenceAnimationToken) return;
      [...departureUi.buttons, departureUi.setting].filter(Boolean).forEach((element) => {
        const previous = previousRects.get(element);
        const current = element.getBoundingClientRect();
        if (!previous) return;
        const deltaX = previous.left - current.left;
        const deltaY = previous.top - current.top;
        if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;
        element.animate(
          [
            { transform: "translate(" + deltaX + "px, " + deltaY + "px)" },
            { transform: "translate(0, 0)" }
          ],
          {
            duration: DEPARTURE_SWITCH_DURATION_MS,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
          }
        );
      });
      if (layout === "stacked") {
        departureUi.setting.classList.remove("is-revealing");
        void departureUi.setting.offsetWidth;
        departureUi.setting.classList.add("is-revealing");
        departureUi.setting.addEventListener("animationend", () => {
          departureUi.setting.classList.remove("is-revealing");
        }, { once: true });
      }
    });
  }

  function nextPlannedDeparture() {
    const date = new Date(Date.now() + 30 * 60000);
    date.setSeconds(0, 0);
    date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5);
    return date;
  }

  function earliestPlannedDeparture() {
    const now = new Date();
    const minimum = new Date(now);
    minimum.setSeconds(0, 0);
    if (minimum.getTime() < now.getTime()) minimum.setMinutes(minimum.getMinutes() + 1);
    return minimum;
  }

  function formatDepartureTimeLabel(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-") + " " + [
      pad(date.getHours()),
      pad(date.getMinutes())
    ].join(":");
  }

  function parseDepartureTimeInput(value) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match.map(Number);
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
      || date.getHours() !== hour
      || date.getMinutes() !== minute
    ) {
      return null;
    }
    return date;
  }

  function formatCompactDepartureInput(digits) {
    return digits.slice(0, 4) + "-"
      + digits.slice(4, 6) + "-"
      + digits.slice(6, 8) + " "
      + digits.slice(8, 10) + ":"
      + digits.slice(10, 12);
  }

  function departurePickerLocale() {
    return i18n.datepickerLocale();
  }

  function bindDeparturePicker() {
    const input = document.getElementById("departure-time-trigger");
    if (!input) return;
    const initialDate = state.departureTime ? new Date(state.departureTime) : nextPlannedDeparture();
    const validInitialDate = Number.isFinite(initialDate.getTime()) ? initialDate : nextPlannedDeparture();
    departurePickerLastValidValue = formatDepartureTimeLabel(validInitialDate);
    input.value = departurePickerLastValidValue;

    if (typeof window.AirDatepicker === "function") {
      departureDatepicker = new window.AirDatepicker(input, {
        locale: departurePickerLocale(),
        selectedDates: [validInitialDate],
        timepicker: true,
        minutesStep: 1,
        minDate: earliestPlannedDeparture(),
        position: "bottom center",
        buttons: [{
          content: t("common.confirm"),
          onClick(datepicker) {
            if (commitDeparturePickerValue(input)) datepicker.hide();
          }
        }],
        onShow(isFinished) {
          if (!isFinished) syncDeparturePickerToState(input);
          else scheduleDepartureTimeSliderNormalization();
        },
        onHide(isFinished) {
          if (isFinished) syncDeparturePickerToState(input);
        },
        onSelect({ date }) {
          const selectedDate = Array.isArray(date) ? date[0] : date;
          if (!(selectedDate instanceof Date) || !Number.isFinite(selectedDate.getTime())) return;
          departurePickerLastValidValue = formatDepartureTimeLabel(selectedDate);
          input.value = departurePickerLastValidValue;
          scheduleDepartureTimeSliderNormalization();
        }
      });
      bindDepartureTimeSliderGuard();
      scheduleDepartureTimeSliderNormalization();
    }

    input.addEventListener("click", () => {
      selectDepartureInputSegment(input, departureSegmentIndexAt(input.selectionStart ?? 0));
    });

    input.addEventListener("keydown", (event) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
          departurePickerActiveSegment = 0;
          departurePickerEditBuffer = "";
        }
        if (departurePickerEditBuffer.length >= DEPARTURE_INPUT_SEGMENTS[departurePickerActiveSegment].length) {
          departurePickerActiveSegment = Math.min(departurePickerActiveSegment + 1, DEPARTURE_INPUT_SEGMENTS.length - 1);
          departurePickerEditBuffer = "";
        }
        const segment = DEPARTURE_INPUT_SEGMENTS[departurePickerActiveSegment];
        const currentPart = input.value.slice(segment.start, segment.end);
        departurePickerEditBuffer += event.key;
        const nextPart = currentPart.slice(0, segment.length - departurePickerEditBuffer.length) + departurePickerEditBuffer;
        input.value = input.value.slice(0, segment.start) + nextPart + input.value.slice(segment.end);
        input.setSelectionRange(segment.start, segment.end);
        if (departurePickerEditBuffer.length === segment.length && !syncDepartureDatepickerFromInput(input, departurePickerActiveSegment)) {
          input.value = departurePickerLastValidValue;
          selectDepartureInputSegment(input, departurePickerActiveSegment);
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        selectDepartureInputSegment(input, departurePickerActiveSegment + (event.key === "ArrowLeft" ? -1 : 1));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        input.value = departurePickerLastValidValue;
        selectDepartureInputSegment(input, departurePickerActiveSegment);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (commitDeparturePickerValue(input)) {
          departureDatepicker?.hide();
          input.blur();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        syncDeparturePickerToState(input);
        departureDatepicker?.hide();
        input.blur();
      }
    });

    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const digits = event.clipboardData.getData("text").replace(/\D/g, "");
      if (digits.length !== 12) {
        input.value = departurePickerLastValidValue;
        selectDepartureInputSegment(input, departurePickerActiveSegment);
        return;
      }
      input.value = formatCompactDepartureInput(digits);
      departurePickerActiveSegment = DEPARTURE_INPUT_SEGMENTS.length - 1;
      departurePickerEditBuffer = "";
      if (!syncDepartureDatepickerFromInput(input, departurePickerActiveSegment)) {
        input.value = departurePickerLastValidValue;
      }
      selectDepartureInputSegment(input, departurePickerActiveSegment);
    });

    input.addEventListener("input", () => {
      if (!input.value) {
        input.value = departurePickerLastValidValue;
        selectDepartureInputSegment(input, departurePickerActiveSegment);
        return;
      }
      const digits = input.value.replace(/\D/g, "");
      if (digits.length === 12 && input.value.length !== 16) {
        input.value = formatCompactDepartureInput(digits);
        if (!syncDepartureDatepickerFromInput(input, departurePickerActiveSegment)) {
          input.value = departurePickerLastValidValue;
        }
        selectDepartureInputSegment(input, departurePickerActiveSegment);
      }
    });

    input.addEventListener("change", () => {
      const date = parseDepartureTimeInput(input.value);
      if (date) {
        departurePickerLastValidValue = formatDepartureTimeLabel(date);
        input.value = departurePickerLastValidValue;
      } else {
        input.value = departurePickerLastValidValue;
      }
    });

    input.addEventListener("blur", () => {
      if (!parseDepartureTimeInput(input.value)) input.value = departurePickerLastValidValue;
      departurePickerEditBuffer = "";
    });
  }

  function departureSegmentIndexAt(position) {
    const index = DEPARTURE_INPUT_SEGMENTS.findIndex(({ start, end }) => position >= start && position <= end);
    return index === -1 ? DEPARTURE_INPUT_SEGMENTS.length - 1 : index;
  }

  function selectDepartureInputSegment(input, index) {
    departurePickerActiveSegment = Math.max(0, Math.min(index, DEPARTURE_INPUT_SEGMENTS.length - 1));
    departurePickerEditBuffer = "";
    const segment = DEPARTURE_INPUT_SEGMENTS[departurePickerActiveSegment];
    input.setSelectionRange(segment.start, segment.end);
  }

  function restoreDepartureInputSelection(input, index) {
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      const segment = DEPARTURE_INPUT_SEGMENTS[index];
      input.setSelectionRange(segment.start, segment.end);
    });
  }

  function syncDepartureDatepickerFromInput(input, selectionIndex = departurePickerActiveSegment) {
    const date = parseDepartureTimeInput(input.value);
    if (!date) return false;
    departurePickerLastValidValue = formatDepartureTimeLabel(date);
    input.value = departurePickerLastValidValue;
    if (departureDatepicker) {
      departureDatepicker.clear({ silent: true });
      departureDatepicker.selectDate(date, { updateTime: true, silent: true });
      departureDatepicker.setViewDate(date);
      input.value = departurePickerLastValidValue;
      scheduleDepartureTimeSliderNormalization();
    }
    restoreDepartureInputSelection(input, selectionIndex);
    return true;
  }

  function syncDeparturePickerToState(input) {
    const minimum = earliestPlannedDeparture();
    const stateDate = state.departureTime ? new Date(state.departureTime) : nextPlannedDeparture();
    const date = Number.isFinite(stateDate.getTime()) && stateDate >= minimum ? stateDate : minimum;
    departurePickerLastValidValue = formatDepartureTimeLabel(date);
    input.value = departurePickerLastValidValue;
    if (!departureDatepicker) return;
    departureDatepicker.update({ minDate: minimum });
    departureDatepicker.clear({ silent: true });
    departureDatepicker.selectDate(date, { updateTime: true, silent: true });
    departureDatepicker.setViewDate(date);
    input.value = departurePickerLastValidValue;
    scheduleDepartureTimeSliderNormalization();
  }

  function commitDeparturePickerValue(input) {
    const date = parseDepartureTimeInput(input.value);
    if (!date || date < earliestPlannedDeparture()) {
      syncDeparturePickerToState(input);
      return false;
    }
    state.departureTime = date.toISOString();
    departurePickerLastValidValue = formatDepartureTimeLabel(date);
    input.value = departurePickerLastValidValue;
    renderDepartureControls();
    if (state.start && state.end) scheduleRoutePlanAfterPaint({ preserveResultsState: true });
    return true;
  }

  function scheduleDepartureTimeSliderNormalization() {
    if (departureSliderNormalizeFrame) cancelAnimationFrame(departureSliderNormalizeFrame);
    departureSliderNormalizeFrame = requestAnimationFrame(() => {
      departureSliderNormalizeFrame = 0;
      document.querySelectorAll('.air-datepicker-time--row input[type="range"]').forEach((range) => {
        const isHours = range.name === "hours";
        const fullMaximum = isHours ? 23 : 59;
        const { allowedMinimum } = departureTimeSliderContext(range);
        const currentValue = Number(range.value);
        range.dataset.allowedMin = String(allowedMinimum);
        range.dataset.lastAllowedValue = String(Math.max(allowedMinimum, Number.isFinite(currentValue) ? currentValue : allowedMinimum));
        range.min = "0";
        range.max = String(fullMaximum);
      });
    });
  }

  function departureTimeSliderContext(range) {
    const minimum = earliestPlannedDeparture();
    const visibleValue = document.getElementById("departure-time-trigger")?.value || "";
    const selectedDate = parseDepartureTimeInput(visibleValue) || departureDatepicker?.selectedDates?.[0];
    const isHours = range.name === "hours";
    const fullMaximum = isHours ? 23 : 59;
    const selectedIsMinimumDay = selectedDate instanceof Date
      && selectedDate.getFullYear() === minimum.getFullYear()
      && selectedDate.getMonth() === minimum.getMonth()
      && selectedDate.getDate() === minimum.getDate();
    let allowedMinimum = 0;
    if (selectedIsMinimumDay) {
      allowedMinimum = isHours
        ? minimum.getHours() + (selectedDate.getMinutes() < minimum.getMinutes() ? 1 : 0)
        : selectedDate.getHours() === minimum.getHours() ? minimum.getMinutes() : 0;
    }
    allowedMinimum = Math.min(fullMaximum, Math.max(0, allowedMinimum));
    const visibleValueForRange = selectedDate instanceof Date
      ? isHours ? selectedDate.getHours() : selectedDate.getMinutes()
      : allowedMinimum;
    return { allowedMinimum, visibleValueForRange };
  }

  function bindDepartureTimeSliderGuard() {
    const guardSlider = (event) => {
      const range = event.target;
      if (!(range instanceof HTMLInputElement) || !range.matches('.air-datepicker-time--row input[type="range"]')) return;
      const attemptedValue = Number(range.value);
      const { allowedMinimum, visibleValueForRange } = departureTimeSliderContext(range);
      range.dataset.allowedMin = String(allowedMinimum);
      const existingTimer = departureSliderRejectTimers.get(range);
      if (attemptedValue >= allowedMinimum) {
        if (existingTimer) clearTimeout(existingTimer);
        departureSliderRejectTimers.delete(range);
        range.classList.remove("is-rejected");
        range.dataset.lastAllowedValue = String(attemptedValue);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const restoreValue = String(Math.max(allowedMinimum, visibleValueForRange));
      if (existingTimer) clearTimeout(existingTimer);
      range.classList.add("is-rejected");
      const timer = setTimeout(() => {
        range.value = restoreValue;
        range.classList.remove("is-rejected");
        departureSliderRejectTimers.delete(range);
      }, 220);
      departureSliderRejectTimers.set(range, timer);
    };
    document.addEventListener("input", guardSlider, true);
    document.addEventListener("change", guardSlider, true);
  }

  function departureForPlan() {
    if (state.departureMode !== "planned") return new Date();
    const date = state.departureTime ? new Date(state.departureTime) : nextPlannedDeparture();
    return Number.isFinite(date.getTime()) ? date : nextPlannedDeparture();
  }

  function bindHorizontalScroller(element) {
    if (!element) return;
    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let dragged = false;
    let suppressClick = false;

    element.addEventListener("wheel", (event) => {
      if (element.scrollWidth <= element.clientWidth) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      element.scrollLeft += delta;
      event.preventDefault();
    }, { passive: false });

    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || element.scrollWidth <= element.clientWidth) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = element.scrollLeft;
      dragged = false;
    });

    element.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const delta = event.clientX - startX;
      if (!dragged && Math.abs(delta) > 4) {
        dragged = true;
        element.setPointerCapture(pointerId);
        element.classList.add("is-dragging");
      }
      if (!dragged) return;
      element.scrollLeft = startScrollLeft - delta;
    });

    const endDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
      pointerId = null;
      element.classList.remove("is-dragging");
      if (dragged) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      }
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    element.addEventListener("click", (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  async function handleRouteSubmit(event) {
    event.preventDefault();
    cancelSearchWork();
    prepareMapForRoutePlanning();
    renderPlanningRoute(t("status.findingPlaces"), t("status.findingPlacesDescription"));
    const resolved = await resolveTypedPlaces();
    if (!resolved) return;
    await planRoute();
  }

  async function resolveTypedPlaces() {
    const startOk = await resolveTypedPlace("start");
    const endOk = await resolveTypedPlace("end");
    if (startOk && endOk) return true;
    clearRoute();
    renderEndpointMarkers();
    renderNoRoute();
    const missing = !startOk && !endOk ? `${t("place.start")} / ${t("place.end")}` : !startOk ? t("place.start") : t("place.end");
    setStatus(t("status.chooseMissing", { missing }));
    return false;
  }

  async function resolveTypedPlace(kind) {
    const input = document.getElementById(`${kind}-input`);
    const query = input.value.trim();
    if (!query) return Boolean(state[kind]);
    if (state[kind] && normalizeInputText(state[kind].name) === normalizeInputText(query)) return true;
    const matches = await searchPlaces(query);
    const match = matches[0];
    if (!match) return false;
    setPlace(kind, match, { plan: false });
    return true;
  }

  function cancelSearchWork() {
    searchTimers.forEach((timer) => clearTimeout(timer));
    searchTimers.clear();
    searchToken += 1;
    closeSearchResults("start");
    closeSearchResults("end");
  }

  function normalizeInputText(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function bindCollapsiblePanels() {
    document.querySelectorAll("[data-collapse-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const name = button.dataset.collapseTarget;
        if (name === "planner") {
          if (plannerAutoCollapsed) {
            if (isMobileResultsLayout()) setMobileResultsState("medium");
            else setResultsExpanded(false);
            return;
          }
          plannerUserCollapsed = !plannerUserCollapsed;
          setPlannerCollapsed(plannerUserCollapsed, { source: "user" });
          return;
        }
        const target = document.querySelector(`[data-collapsible="${name}"]`);
        if (!target) return;
        if (name === "results" && isMobileResultsLayout()) {
          stepMobileResultsState(-1);
          return;
        }
        const collapsed = target.classList.toggle("is-collapsed");
        button.classList.toggle("is-collapsed", collapsed);
        button.setAttribute("aria-expanded", String(!collapsed));
        if (name === "results" && collapsed) setResultsExpanded(false);
        if (name === "results") updateDesktopResultsHandle();
        setTimeout(() => map.invalidateSize(), 80);
      });
    });
  }

  function setPlannerCollapsed(collapsed, options = {}) {
    const panel = document.querySelector('[data-collapsible="planner"]');
    const button = document.getElementById("toggle-planner");
    if (!panel || !button) return;
    const normalized = Boolean(collapsed);
    if (options.source === "user") plannerUserCollapsed = normalized;
    panel.classList.toggle("is-collapsed", normalized);
    button.classList.toggle("is-expanded", normalized);
    button.setAttribute("aria-expanded", String(!normalized));
    button.setAttribute("aria-label", t(normalized ? "planner.expand" : "planner.collapse"));
    button.title = button.getAttribute("aria-label");
    updatePlannerPanelHandle();
    setTimeout(() => {
      map?.invalidateSize();
      scheduleMobileLayoutMetrics();
    }, 260);
  }

  function expandPlannerFromCompactProfile() {
    if (isMobileResultsLayout()) {
      if (!mobilePlannerCollapsed) return false;
      setMobilePlannerCollapsed(false);
      return true;
    }
    const panel = document.querySelector('[data-collapsible="planner"]');
    if (!panel?.classList.contains("is-collapsed")) return false;
    plannerUserCollapsed = false;
    if (plannerAutoCollapsed) setResultsExpanded(false);
    else setPlannerCollapsed(false, { source: "user" });
    return true;
  }

  function setMobilePlannerCollapsed(collapsed, options = {}) {
    if (!isMobileResultsLayout()) return;
    const panel = document.querySelector('[data-collapsible="planner"]');
    const topline = panel?.querySelector(".planner-topline");
    const logo = panel?.querySelector(".brand-logo");
    const profiles = panel?.querySelector(".profile-strip");
    const toolbar = document.querySelector(".map-toolbar");
    if (!panel) return;
    const normalized = Boolean(collapsed);
    if (!normalized && options.source !== "results" && ["large", "expanded"].includes(currentMobileResultsState())) {
      setMobileResultsState("medium");
    }
    const animate = options.animate !== false && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const beforeTopline = animate ? topline?.getBoundingClientRect() : null;
    const beforeLogo = animate ? logo?.getBoundingClientRect() : null;
    const beforeProfiles = animate ? profiles?.getBoundingClientRect() : null;
    if (animate) panel.classList.add("is-mobile-layout-measuring");
    mobilePlannerCollapsed = normalized;
    panel.classList.toggle("is-mobile-collapsed", normalized);
    toolbar?.classList.toggle("is-mobile-planner-collapsed", normalized);
    panel.dataset.mobilePlannerState = normalized ? "collapsed" : "expanded";
    if (animate) {
      const afterTopline = topline?.getBoundingClientRect();
      const afterLogo = logo?.getBoundingClientRect();
      const afterProfiles = profiles?.getBoundingClientRect();
      animateMeasuredHeight(topline, beforeTopline, afterTopline);
      applyLayoutShift(logo, beforeLogo, afterLogo);
      applyLayoutShift(profiles, beforeProfiles, afterProfiles);
      panel.getBoundingClientRect();
      panel.classList.remove("is-mobile-layout-measuring");
      requestAnimationFrame(() => {
        if (logo) logo.style.transform = "";
        if (profiles) profiles.style.transform = "";
      });
    }
    updatePlannerPanelHandle();
    scheduleSearchPanelPositioning();
    scheduleActiveSegmentRefit();
    setTimeout(() => {
      map?.invalidateSize();
      syncMobileLayoutMetrics();
      if (currentMobileResultsState() === "large") setMobileResultsLargeTarget();
    }, 360);
  }

  function applyLayoutShift(element, before, after) {
    if (!element || !before || !after) return;
    const deltaX = before.left - after.left;
    const deltaY = before.top - after.top;
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }

  function animateMeasuredHeight(element, before, after) {
    if (!element || !before || !after || typeof element.animate !== "function") return;
    if (Math.abs(before.height - after.height) < 0.5) return;
    element.animate([
      { height: before.height + "px" },
      { height: after.height + "px" }
    ], {
      duration: 340,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
    });
  }

  function updatePlannerPanelHandle() {
    const panel = document.querySelector('[data-collapsible="planner"]');
    const handle = document.getElementById("planner-panel-handle");
    if (!panel || !handle) return;
    const collapsed = isMobileResultsLayout()
      ? mobilePlannerCollapsed
      : panel.classList.contains("is-collapsed");
    const label = collapsed ? "\u5c55\u958b\u8def\u7dda\u898f\u5283" : "\u6536\u8d77\u8def\u7dda\u898f\u5283";
    handle.setAttribute("aria-expanded", String(!collapsed));
    handle.setAttribute("aria-label", label);
    handle.title = label;
  }

  function bindPlannerPanelHandle() {
    const handle = document.getElementById("planner-panel-handle");
    if (!handle) return;
    let gesture = null;
    let suppressClick = false;

    const togglePlanner = (collapsed) => {
      if (isMobileResultsLayout()) {
        setMobilePlannerCollapsed(collapsed);
        return;
      }
      if (plannerAutoCollapsed && !collapsed) {
        plannerUserCollapsed = false;
        setResultsExpanded(false);
        setPlannerCollapsed(false, { source: "user" });
        return;
      }
      plannerUserCollapsed = collapsed;
      setPlannerCollapsed(collapsed, { source: "user" });
    };

    handle.addEventListener("click", () => {
      if (suppressClick) return;
      const panel = document.querySelector('[data-collapsible="planner"]');
      const collapsed = isMobileResultsLayout()
        ? mobilePlannerCollapsed
        : panel?.classList.contains("is-collapsed");
      togglePlanner(!collapsed);
    });

    const finishGesture = (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const mobile = gesture.mobile;
      const primaryDelta = mobile ? event.clientY - gesture.y : event.clientX - gesture.x;
      const crossDelta = mobile ? event.clientX - gesture.x : event.clientY - gesture.y;
      handle.releasePointerCapture?.(event.pointerId);
      handle.classList.remove("is-dragging");
      gesture = null;
      if (Math.abs(primaryDelta) < 34 || Math.abs(primaryDelta) <= Math.abs(crossDelta) * 1.15) return;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      togglePlanner(primaryDelta < 0);
    };

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      gesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        mobile: isMobileResultsLayout()
      };
      handle.setPointerCapture?.(event.pointerId);
      handle.classList.add("is-dragging");
    });
    handle.addEventListener("pointerup", finishGesture);
    handle.addEventListener("pointercancel", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      handle.releasePointerCapture?.(event.pointerId);
      handle.classList.remove("is-dragging");
      gesture = null;
    });
  }

  function syncPlannerCollapseForResults(expanded) {
    plannerAutoCollapsed = Boolean(expanded);
    setPlannerCollapsed(plannerUserCollapsed || plannerAutoCollapsed, { source: "results" });
  }

  function bindResultsExpansion() {
    document.getElementById("expand-results")?.addEventListener("click", () => {
      const panel = document.querySelector('[data-collapsible="results"]');
      if (!panel) return;
      if (isMobileResultsLayout()) {
        stepMobileResultsState(1);
        return;
      }
      if (panel.classList.contains("is-collapsed")) {
        panel.classList.remove("is-collapsed");
        const collapseButton = document.querySelector('[data-collapse-target="results"]');
        collapseButton?.classList.remove("is-collapsed");
        collapseButton?.setAttribute("aria-expanded", "true");
      }
      setResultsExpanded(!panel.classList.contains("is-expanded"));
    });
  }

  function setResultsExpanded(expanded) {
    const panel = document.querySelector('[data-collapsible="results"]');
    const button = document.getElementById("expand-results");
    if (!panel || !button) return;
    if (isMobileResultsLayout()) {
      setMobileResultsState(expanded ? "expanded" : "medium");
      return;
    }
    panel.classList.toggle("is-expanded", expanded);
    button.classList.toggle("is-expanded", expanded);
    button.setAttribute("aria-pressed", String(expanded));
    button.setAttribute("aria-label", t(expanded ? "results.restore" : "results.expand"));
    button.title = t(expanded ? "results.restore" : "results.expand");
    syncPlannerCollapseForResults(expanded);
    updateDesktopResultsHandle();
    setTimeout(() => map.invalidateSize(), 260);
  }

  function currentDesktopResultsState() {
    const panel = document.querySelector('[data-collapsible="results"]');
    if (panel?.classList.contains("is-expanded")) return "expanded";
    if (panel?.classList.contains("is-collapsed")) return "collapsed";
    return "medium";
  }

  function setDesktopResultsState(nextState) {
    if (isMobileResultsLayout()) return;
    const panel = document.querySelector('[data-collapsible="results"]');
    const expandButton = document.getElementById("expand-results");
    const collapseButton = document.querySelector('[data-collapse-target="results"]');
    if (!panel || !expandButton || !collapseButton) return;
    const normalized = ["collapsed", "medium", "expanded"].includes(nextState) ? nextState : "medium";
    const expanded = normalized === "expanded";
    const collapsed = normalized === "collapsed";
    panel.classList.toggle("is-expanded", expanded);
    panel.classList.toggle("is-collapsed", collapsed);
    expandButton.disabled = expanded;
    expandButton.classList.toggle("is-expanded", expanded);
    expandButton.setAttribute("aria-pressed", String(expanded));
    expandButton.setAttribute("aria-label", expanded ? "\u8def\u7dda\u7d50\u679c\u5df2\u5b8c\u5168\u5c55\u958b" : "\u5411\u4e0a\u5c55\u958b\u8def\u7dda\u7d50\u679c");
    expandButton.title = expandButton.getAttribute("aria-label");
    collapseButton.disabled = collapsed;
    collapseButton.classList.toggle("is-collapsed", collapsed);
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute("aria-label", collapsed ? "\u8def\u7dda\u7d50\u679c\u5df2\u6536\u8d77" : "\u5411\u4e0b\u6536\u8d77\u8def\u7dda\u7d50\u679c");
    syncPlannerCollapseForResults(expanded);
    updateDesktopResultsHandle();
    setTimeout(() => map?.invalidateSize(), 260);
  }

  function stepDesktopResultsState(direction) {
    const states = ["collapsed", "medium", "expanded"];
    const currentIndex = states.indexOf(currentDesktopResultsState());
    const nextIndex = Math.max(0, Math.min(states.length - 1, currentIndex + direction));
    setDesktopResultsState(states[nextIndex]);
  }

  function updateDesktopResultsHandle() {
    if (isMobileResultsLayout()) return;
    const handle = document.getElementById("mobile-results-handle");
    if (!handle) return;
    const current = currentDesktopResultsState();
    const label = current === "expanded"
      ? "\u6536\u8d77\u8def\u7dda\u7d50\u679c"
      : current === "collapsed"
        ? "\u5c55\u958b\u8def\u7dda\u7d50\u679c"
        : "\u5168\u5c4f\u5c55\u958b\u8def\u7dda\u7d50\u679c";
    handle.setAttribute("aria-expanded", String(current !== "collapsed"));
    handle.setAttribute("aria-label", label);
    handle.title = label;
  }

  function openResultsForRoute(options = {}) {
    if (options.preserveResultsState) return;
    const panel = document.querySelector('[data-collapsible="results"]');
    const collapseButton = document.querySelector('[data-collapse-target="results"]');
    panel?.classList.remove("is-collapsed");
    collapseButton?.classList.remove("is-collapsed");
    collapseButton?.setAttribute("aria-expanded", "true");
    if (isMobileResultsLayout()) setMobileResultsState("expanded");
    else setResultsExpanded(true);
  }

  function isMobileResultsLayout() {
    return window.matchMedia(MOBILE_RESULTS_QUERY).matches;
  }

  function currentMobileResultsState() {
    const panel = document.querySelector('[data-collapsible="results"]');
    return MOBILE_RESULTS_STATES.includes(panel?.dataset.mobileState) ? panel.dataset.mobileState : "medium";
  }

  function setMobileResultsState(nextState, options = {}) {
    if (!isMobileResultsLayout()) return;
    const panel = document.querySelector('[data-collapsible="results"]');
    if (!panel) return;
    const previous = currentMobileResultsState();
    const normalized = MOBILE_RESULTS_STATES.includes(nextState) ? nextState : "medium";
    const wasPlannerForcingState = ["large", "expanded"].includes(previous);
    const plannerForcingState = ["large", "expanded"].includes(normalized);
    if (plannerForcingState && !wasPlannerForcingState) {
      mobilePlannerCollapsedBeforeResultsExpansion = mobilePlannerCollapsed;
    }
    if (normalized === "large" || (plannerForcingState && !wasPlannerForcingState)) {
      setMobileResultsLargeTarget();
    }
    panel.dataset.mobileState = normalized;
    panel.classList.remove("is-collapsed", "is-expanded");
    document.documentElement.dataset.mobileResultsState = normalized;
    updateResultsSheetControls(normalized);
    if (plannerForcingState) {
      setMobilePlannerCollapsed(true, { source: "results" });
    } else if (wasPlannerForcingState) {
      setMobilePlannerCollapsed(options.keepPlannerCollapsed ? true : mobilePlannerCollapsedBeforeResultsExpansion, { source: "results" });
    } else if (options.keepPlannerCollapsed) {
      setMobilePlannerCollapsed(true, { source: "results" });
    }
    scheduleActiveSegmentRefit();
    setTimeout(() => {
      map?.invalidateSize();
      syncMobileLayoutMetrics();
    }, 260);
  }

  function stepMobileResultsState(direction) {
    const currentIndex = MOBILE_RESULTS_STATES.indexOf(currentMobileResultsState());
    const nextIndex = Math.max(0, Math.min(MOBILE_RESULTS_STATES.length - 1, currentIndex + direction));
    setMobileResultsState(MOBILE_RESULTS_STATES[nextIndex]);
  }

  function updateResultsSheetControls(mobileState) {
    const expandButton = document.getElementById("expand-results");
    const collapseButton = document.querySelector('[data-collapse-target="results"]');
    const handleButton = document.getElementById("mobile-results-handle");
    if (!expandButton || !collapseButton) return;
    const expanded = mobileState === "expanded";
    const collapsed = mobileState === "collapsed";
    expandButton.disabled = expanded;
    expandButton.classList.toggle("is-expanded", expanded);
    expandButton.setAttribute("aria-pressed", String(expanded));
    expandButton.setAttribute("aria-label", expanded ? "\u8def\u7dda\u7d50\u679c\u5df2\u5b8c\u5168\u5c55\u958b" : "\u5411\u4e0a\u5c55\u958b\u8def\u7dda\u7d50\u679c");
    expandButton.title = expandButton.getAttribute("aria-label");
    collapseButton.disabled = collapsed;
    collapseButton.classList.toggle("is-collapsed", collapsed);
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute("aria-label", collapsed ? "\u8def\u7dda\u7d50\u679c\u5df2\u6536\u8d77" : "\u5411\u4e0b\u6536\u8d77\u8def\u7dda\u7d50\u679c");
    if (handleButton) {
      const handleLabel = expanded
        ? "\u6536\u8d77\u8def\u7dda\u7d50\u679c"
        : collapsed
          ? "\u5c55\u958b\u8def\u7dda\u7d50\u679c"
          : mobileState === "large"
            ? "\u9084\u539f\u8def\u7dda\u7d50\u679c\u9ad8\u5ea6"
            : "\u5411\u4e0a\u5c55\u958b\u8def\u7dda\u7d50\u679c";
      handleButton.setAttribute("aria-label", handleLabel);
      handleButton.setAttribute("aria-expanded", String(!collapsed));
      handleButton.title = handleLabel;
    }
  }

  function syncResultsLayoutForViewport() {
    const mobile = isMobileResultsLayout();
    const panel = document.querySelector('[data-collapsible="results"]');
    if (!panel) return;
    if (mobile) {
      const enteringMobile = !mobileResultsLayoutActive;
      mobileResultsLayoutActive = true;
      syncMobileMessagePlacement(true);
      const nextState = enteringMobile
        ? (state.route || isPlanningRoute ? "expanded" : "medium")
        : currentMobileResultsState();
      if (enteringMobile) setMobilePlannerCollapsed(mobilePlannerCollapsed, { animate: false, source: "sync" });
      setMobileResultsState(nextState);
      scheduleMobileLayoutMetrics();
      return;
    }
    mobileResultsLayoutActive = false;
    syncMobileMessagePlacement(false);
    delete document.documentElement.dataset.mobileResultsState;
    document.documentElement.style.removeProperty("--mobile-planner-bottom");
    const expandButton = document.getElementById("expand-results");
    const collapseButton = document.querySelector('[data-collapse-target="results"]');
    const desktopExpanded = panel.classList.contains("is-expanded");
    const desktopCollapsed = panel.classList.contains("is-collapsed");
    syncPlannerCollapseForResults(desktopExpanded);
    if (expandButton) {
      expandButton.disabled = false;
      expandButton.classList.toggle("is-expanded", desktopExpanded);
      expandButton.setAttribute("aria-pressed", String(desktopExpanded));
      expandButton.setAttribute("aria-label", desktopExpanded ? "\u9084\u539f\u8def\u7dda\u7d50\u679c\u9ad8\u5ea6" : "\u5411\u4e0a\u64f4\u5c55\u8def\u7dda\u7d50\u679c");
      expandButton.title = expandButton.getAttribute("aria-label");
    }
    if (collapseButton) {
      collapseButton.disabled = false;
      collapseButton.classList.toggle("is-collapsed", desktopCollapsed);
      collapseButton.setAttribute("aria-expanded", String(!desktopCollapsed));
      collapseButton.setAttribute("aria-label", desktopCollapsed ? "\u5c55\u958b\u8def\u7dda\u7d50\u679c" : "\u6536\u8d77\u8def\u7dda\u7d50\u679c");
    }
    updatePlannerPanelHandle();
    updateDesktopResultsHandle();
  }

  function syncMobileMessagePlacement(mobile) {
    const stack = document.querySelector(".map-message-stack");
    const anchor = document.getElementById("map-message-anchor");
    if (!stack || !anchor) return;
    if (stack.previousElementSibling !== anchor) anchor.after(stack);
    stack.hidden = mobile;
  }

  function scheduleMobileLayoutMetrics() {
    if (!isMobileResultsLayout()) return;
    requestAnimationFrame(() => setTimeout(syncMobileLayoutMetrics, 0));
  }

  function syncMobileLayoutMetrics() {
    if (!isMobileResultsLayout() || currentMobileResultsState() === "expanded") return;
    const planner = document.querySelector(".planner-pane");
    if (!planner) return;
    const bottom = planner.getBoundingClientRect().bottom;
    if (bottom > 0) document.documentElement.style.setProperty("--mobile-planner-bottom", Math.ceil(bottom + 22) + "px");
  }

  function setMobileResultsLargeTarget() {
    if (!isMobileResultsLayout()) return;
    const planner = document.querySelector(".planner-pane");
    if (!planner) return;
    const wasCollapsed = planner.classList.contains("is-mobile-collapsed");
    planner.classList.add("is-mobile-target-measuring");
    planner.classList.add("is-mobile-collapsed");
    const bottom = planner.getBoundingClientRect().bottom;
    planner.classList.toggle("is-mobile-collapsed", wasCollapsed);
    planner.getBoundingClientRect();
    planner.classList.remove("is-mobile-target-measuring");
    if (bottom > 0) {
      document.documentElement.style.setProperty("--mobile-results-large-top", Math.ceil(bottom + 22) + "px");
    }
  }

  function bindMapPickLayout() {
    const planner = document.querySelector(".planner-pane");
    if (!planner || typeof ResizeObserver !== "function") return;
    mapPickLayoutObserver = new ResizeObserver(() => {
      syncMapPickLayout();
      scheduleMobileLayoutMetrics();
    });
    mapPickLayoutObserver.observe(planner);
  }

  function syncMapPickLayout() {
    const root = document.documentElement;
    if (!state.pickMode || isMobileResultsLayout()) {
      root.style.removeProperty("--map-pick-planner-left");
      root.style.removeProperty("--map-pick-planner-bottom");
      return;
    }
    const planner = document.querySelector(".planner-pane");
    if (!planner) return;
    const bounds = planner.getBoundingClientRect();
    root.style.setProperty("--map-pick-planner-left", Math.round(bounds.left) + "px");
    root.style.setProperty("--map-pick-planner-bottom", Math.ceil(bounds.bottom + 8) + "px");
  }

  function bindMapInfoMarker(marker, content, options = {}) {
    marker.on("click", (event) => {
      event.originalEvent?.stopPropagation?.();
      showMapInfoOverlay(content, event.latlng || marker.getLatLng(), options);
    });
    return marker;
  }

  function handleMapInfoAction(event) {
    const babycareButton = event.target.closest("[data-babycare-route-target]");
    if (babycareButton && event.currentTarget.contains(babycareButton)) {
      routeToBabycareFacility(babycareButton.dataset.babycareRouteTarget);
      return;
    }
    const facilityButton = event.target.closest("[data-public-facility-route-target]");
    if (facilityButton && event.currentTarget.contains(facilityButton)) {
      routeToPublicFacility(facilityButton.dataset.publicFacilityRouteTarget);
    }
  }

  function routeToBabycareFacility(id) {
    const facility = state.babycareData?.items?.find((item) => item.id === id);
    if (!facility || !Number.isFinite(facility.lat) || !Number.isFinite(facility.lng)) return;
    const destination = {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn || "",
      type: "poi",
      subtype: "babycare",
      positionSource: "babycare",
      address: facility.address || facility.location || "",
      addressEn: facility.addressEn || "",
      lat: facility.lat,
      lng: facility.lng
    };
    closeMapInfoOverlay();
    setPlace("end", destination);
    if (!state.start) {
      setStatus("\u5df2\u5c07\u300c" + facility.name + "\u300d\u8a2d\u70ba\u7d42\u9ede\uff0c\u8acb\u9078\u64c7\u8d77\u9ede\u3002");
      document.getElementById("start-input")?.focus({ preventScroll: true });
    }
  }

  function routeToPublicFacility(id) {
    const facility = state.publicFacilityData?.items?.find((item) => item.id === id);
    if (!facility || !Number.isFinite(facility.lat) || !Number.isFinite(facility.lng)) return;
    const name = facilityDisplayName(facility);
    const destination = {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn || "",
      type: "poi",
      subtype: facility.kind,
      positionSource: "public-facility",
      address: facility.address || facility.locationDetail || "",
      addressEn: facility.addressEn || "",
      lat: facility.lat,
      lng: facility.lng
    };
    closeMapInfoOverlay();
    setPlace("end", destination);
    if (!state.start) {
      setStatus("\u5df2\u5c07\u300c" + name + "\u300d\u8a2d\u70ba\u7d42\u9ede\uff0c\u8acb\u9078\u64c7\u8d77\u9ede\u3002");
      document.getElementById("start-input")?.focus({ preventScroll: true });
    }
  }

  function showMapInfoOverlay(content, latlng, options = {}) {
    const panel = document.getElementById("map-info-panel");
    const container = document.getElementById("map-info-content");
    if (!panel || !container || !latlng) return;
    panel.className = "map-info-panel" + (options.className ? " " + options.className : "");
    if (options.html) {
      container.innerHTML = String(content || "");
    } else {
      container.replaceChildren();
      const paragraph = document.createElement("p");
      paragraph.className = "map-info-text";
      paragraph.textContent = String(content || "");
      container.appendChild(paragraph);
    }
    mapInfoOverlayState = {
      latlng: L.latLng(latlng),
      kind: options.kind || "place"
    };
    panel.hidden = false;
    positionMapInfoOverlay();
  }

  function closeMapInfoOverlay() {
    const panel = document.getElementById("map-info-panel");
    const container = document.getElementById("map-info-content");
    mapInfoOverlayState = null;
    if (mapInfoPositionFrame) cancelAnimationFrame(mapInfoPositionFrame);
    mapInfoPositionFrame = 0;
    if (panel) {
      panel.hidden = true;
      panel.className = "map-info-panel";
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("--map-info-arrow-x");
    }
    if (container) container.replaceChildren();
  }

  function scheduleMapInfoOverlayPosition() {
    if (!mapInfoOverlayState || mapInfoPositionFrame) return;
    mapInfoPositionFrame = requestAnimationFrame(() => {
      mapInfoPositionFrame = 0;
      positionMapInfoOverlay();
    });
  }

  function positionMapInfoOverlay() {
    const panel = document.getElementById("map-info-panel");
    const shell = document.querySelector(".app-shell");
    const mapElement = document.getElementById("map");
    if (!panel || panel.hidden || !shell || !mapElement || !mapInfoOverlayState) return;
    const shellRect = shell.getBoundingClientRect();
    const mapRect = mapElement.getBoundingClientRect();
    const point = map.latLngToContainerPoint(mapInfoOverlayState.latlng);
    const anchorX = mapRect.left - shellRect.left + point.x;
    const anchorY = mapRect.top - shellRect.top + point.y;
    const panelRect = panel.getBoundingClientRect();
    const margin = 12;
    const anchorGap = 34;
    const maxLeft = Math.max(margin, shellRect.width - panelRect.width - margin);
    const maxTop = Math.max(margin, shellRect.height - panelRect.height - margin);
    const left = Math.min(maxLeft, Math.max(margin, anchorX - panelRect.width / 2));
    let top = anchorY - panelRect.height - anchorGap;
    let belowAnchor = false;
    if (top < margin) {
      top = anchorY + anchorGap;
      belowAnchor = true;
    }
    top = Math.min(maxTop, Math.max(margin, top));
    const arrowX = Math.min(panelRect.width - 24, Math.max(24, anchorX - left));
    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(top) + "px";
    panel.style.setProperty("--map-info-arrow-x", Math.round(arrowX) + "px");
    panel.classList.toggle("is-below-anchor", belowAnchor);
  }

  function bindMobileResultsSheet() {
    const header = document.querySelector(".results-pane .results-header");
    const handle = document.getElementById("mobile-results-handle");
    const content = document.querySelector(".results-pane .panel-content");
    if (!header) return;
    let gesture = null;
    let suppressHandleClick = false;
    let previousScrollTop = content?.scrollTop || 0;
    handle?.addEventListener("click", () => {
      if (suppressHandleClick) return;
      if (isMobileResultsLayout()) {
        const current = currentMobileResultsState();
        setMobileResultsState(
          current === "expanded" ? "large"
            : current === "large" ? "medium"
              : current === "medium" ? "large"
                : "medium"
        );
        return;
      }
      const current = currentDesktopResultsState();
      setDesktopResultsState(current === "expanded" ? "medium" : current === "medium" ? "expanded" : "medium");
    });
    header.addEventListener("pointerdown", (event) => {
      const interactive = event.target.closest("button, a, input");
      const mobile = isMobileResultsLayout();
      if (event.button !== 0) return;
      if (mobile ? (interactive && interactive !== handle) : interactive !== handle) return;
      gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mobile };
      header.setPointerCapture?.(event.pointerId);
      header.classList.add("is-dragging");
    });
    header.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.x;
      const deltaY = event.clientY - gesture.y;
      if (Math.abs(deltaY) < 42 || Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;
      const mobile = gesture.mobile;
      header.releasePointerCapture?.(event.pointerId);
      header.classList.remove("is-dragging");
      gesture = null;
      suppressHandleClick = true;
      setTimeout(() => { suppressHandleClick = false; }, 0);
      if (mobile) stepMobileResultsState(deltaY < 0 ? 1 : -1);
      else stepDesktopResultsState(deltaY < 0 ? 1 : -1);
    });
    header.addEventListener("pointerup", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.x;
      const deltaY = event.clientY - gesture.y;
      const mobile = gesture.mobile;
      header.releasePointerCapture?.(event.pointerId);
      header.classList.remove("is-dragging");
      gesture = null;
      if (Math.abs(deltaY) < 42 || Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;
      suppressHandleClick = true;
      setTimeout(() => { suppressHandleClick = false; }, 0);
      if (mobile) stepMobileResultsState(deltaY < 0 ? 1 : -1);
      else stepDesktopResultsState(deltaY < 0 ? 1 : -1);
    });
    header.addEventListener("pointercancel", () => {
      gesture = null;
      header.classList.remove("is-dragging");
    });
    content?.addEventListener("scroll", () => {
      const currentScrollTop = content.scrollTop;
      const scrollingContentUp = currentScrollTop > previousScrollTop + 2;
      previousScrollTop = currentScrollTop;
      if (!isMobileResultsLayout() || !scrollingContentUp || currentScrollTop < 6) return;
      if (Date.now() < mobileResultsScrollExpansionSuppressedUntil) return;
      if (currentMobileResultsState() === "medium") setMobileResultsState("large");
    }, { passive: true });
  }

  function bindSearch(kind) {
    const input = document.getElementById(`${kind}-input`);
    const results = document.getElementById(`${kind}-results`);
    const clearButton = document.getElementById(`clear-${kind}-input`);
    detachSearchPanel(kind);
    input.addEventListener("input", () => {
      syncSearchClearButton(kind);
      showPendingSearch(kind);
      scheduleSearchResults(kind);
    });
    input.addEventListener("focus", () => {
      if (state.pickMode) setPickMode(null);
      scheduleSearchResults(kind, 0);
    });
    input.addEventListener("click", () => {
      const clearedAutomaticStart = clearAutomaticLocationStart(kind, input);
      if (clearedAutomaticStart || !input.value.trim()) showEmptySearchMenu(kind);
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (results.contains(document.activeElement)) return;
        restoreAutomaticLocationStartIfEmpty(kind, input);
      }, 0);
    });
    clearButton.addEventListener("click", () => {
      clearSearchSelection(kind, input);
      input.focus();
      showEmptySearchMenu(kind);
    });
    syncSearchClearButton(kind);
    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const matches = await searchPlaces(input.value);
      const match = matches[0];
      if (match) setPlace(kind, match);
      else {
        setPickMode(kind);
        setStatus(t("status.notFoundPick", { query: input.value, kind: kind === "start" ? t("place.start") : t("place.end") }));
      }
      closeSearchResults(kind);
    });
    document.addEventListener("click", (event) => {
      if (!results.contains(event.target) && event.target !== input) closeSearchResults(kind);
    });
  }

  function detachSearchPanel(kind) {
    const results = document.getElementById(`${kind}-results`);
    const shell = document.querySelector(".app-shell");
    if (!results || !shell || results.dataset.detached === "true") return;
    results.dataset.detached = "true";
    shell.appendChild(results);
  }

  function showEmptySearchMenu(kind) {
    cancelScheduledSearch(kind);
    const results = document.getElementById(`${kind}-results`);
    results.innerHTML = `
      <button class="search-option search-option-action" type="button" data-use-location="${kind}" role="option">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>
        <strong>${escapeHtml(t("search.useLocation"))}</strong>
      </button>
      <button class="search-option search-option-action" type="button" data-pick-map="${kind}" role="option">
        <svg class="map-pick-target-icon" viewBox="0 0 24 24" aria-hidden="true">${mapPickTargetPaths()}</svg>
        <strong>${escapeHtml(t("search.pickMap"))}</strong>
      </button>
    `;
    if (state.locationDenied) {
      const label = results.querySelector("[data-use-location] strong");
      if (label) label.textContent = t("search.locationPermission");
    }
    bindSearchActions(kind, results);
    openSearchResults(kind);
  }

  function bindSearchActions(kind, results) {
    results.querySelectorAll("[data-use-location]").forEach((button) => button.addEventListener("click", () => {
      useCurrentLocationFor(kind);
      closeSearchResults(kind);
    }));
    results.querySelectorAll("[data-pick-map]").forEach((button) => button.addEventListener("click", () => {
      setPickMode(kind);
      closeSearchResults(kind);
    }));
  }

  function showPendingSearch(kind) {
    const input = document.getElementById(`${kind}-input`);
    const query = input.value.trim();
    if (!query) {
      showEmptySearchMenu(kind);
      return;
    }
    renderSearchMatches(kind, query, [], { searching: true });
    openSearchResults(kind);
  }

  function scheduleSearchResults(kind, delay = 280) {
    if (searchTimers.has(kind)) clearTimeout(searchTimers.get(kind));
    searchTimers.set(kind, setTimeout(() => {
      searchTimers.delete(kind);
      showSearchResults(kind);
    }, delay));
  }

  function cancelScheduledSearch(kind) {
    if (!searchTimers.has(kind)) return;
    const timer = searchTimers.get(kind);
    clearTimeout(timer);
    searchTimers.delete(kind);
  }

  async function showSearchResults(kind) {
    if (isPlanningRoute) return;
    const input = document.getElementById(`${kind}-input`);
    const query = input.value.trim();
    const token = ++searchToken;
    if (!query) {
      showEmptySearchMenu(kind);
      return;
    }

    const localMatches = searchService ? searchService.searchLocal(query, { limit: 9 }) : [];
    const hasExactLocalMatch = searchService?.hasExactLocalMatch(query);
    renderSearchMatches(kind, query, localMatches, { searching: !hasExactLocalMatch });
    if (!isPlanningRoute) openSearchResults(kind);

    if (!searchService) return;
    searchService.searchRemoteAndUpdate(query, { limit: 10, totalBudgetMs: 4200 }).then((enhancedMatches) => {
      if (isPlanningRoute || token !== searchToken || input.value.trim() !== query) return;
      renderSearchMatches(kind, query, enhancedMatches, { searching: false });
      openSearchResults(kind);
    });
  }

  function renderSearchMatches(kind, query, matches, options = {}) {
    const results = document.getElementById(`${kind}-results`);
    const searching = Boolean(options.searching);
    const items = matches.map((place) => `
      <button class="search-option" type="button" data-id="${escapeHtml(place.id)}" role="option">
        <strong>${escapeHtml(localizedPlaceName(place))}</strong>
        <span>${escapeHtml(searchResultMeta(place))}</span>
      </button>
    `).join("");
    const searchingCard = searching ? `
      <div class="search-option search-status-card" role="status" aria-live="polite">
        <strong>${escapeHtml(t("search.searchingTitle"))}</strong>
        <span>${escapeHtml(t("search.searchingDescription"))}</span>
      </div>
    ` : "";

    if (items || searchingCard) {
      renderSearchPanel(results, items, searchingCard);
      bindRenderedSearchResults(kind, results);
      return;
    }

    results.innerHTML = `
      <button class="search-option search-option-fallback" type="button" data-pick-map="${kind}" role="option">
        <strong>${escapeHtml(t("search.notFound", { query }))}</strong>
        <span>${escapeHtml(t("search.pickAs", { kind: kind === "start" ? t("place.start") : t("place.end") }))}</span>
      </button>
    `;
    bindSearchActions(kind, results);
  }

  function renderSearchPanel(results, items, footer = "") {
    results.innerHTML =
      '<div class="search-results-frame">' +
        '<div class="search-results-scroll" role="presentation">' + items + "</div>" +
        footer +
      "</div>";
  }

  function ensureSearchPanelFrame(results) {
    if (results.querySelector(":scope > .search-results-frame")) return;
    const frame = document.createElement("div");
    const scroll = document.createElement("div");
    frame.className = "search-results-frame";
    scroll.className = "search-results-scroll";
    scroll.setAttribute("role", "presentation");
    scroll.append(...Array.from(results.childNodes));
    frame.append(scroll);
    results.append(frame);
  }

  function bindRenderedSearchResults(kind, results) {
    results.querySelectorAll("button[data-id]").forEach((button) => button.addEventListener("click", () => {
      const place = searchService.findById(button.dataset.id) || places.find((item) => item.id === button.dataset.id);
      if (place) setPlace(kind, place);
      closeSearchResults(kind);
    }));
  }

  function openSearchResults(kind) {
    ["start", "end"].forEach((item) => {
      if (item !== kind) document.getElementById(`${item}-results`)?.classList.remove("is-open");
    });
    const results = document.getElementById(`${kind}-results`);
    ensureSearchPanelFrame(results);
    results.dataset.layout = isMobileResultsLayout() ? "mobile" : "desktop";
    results.classList.add("is-open");
    syncSearchOverlayState();
    positionSearchResults(kind);
  }

  function closeSearchResults(kind) {
    document.getElementById(`${kind}-results`)?.classList.remove("is-open");
    syncSearchOverlayState();
  }

  function syncSearchOverlayState() {
    const openPanel = document.querySelector(".search-results.is-open");
    if (openPanel && isMobileResultsLayout()) {
      document.documentElement.dataset.mobileSearchOpen = openPanel.id.startsWith("start") ? "start" : "end";
      return;
    }
    delete document.documentElement.dataset.mobileSearchOpen;
  }

  function scheduleSearchPanelPositioning() {
    if (searchPositionFrame) cancelAnimationFrame(searchPositionFrame);
    searchPositionFrame = requestAnimationFrame(() => {
      searchPositionFrame = 0;
      positionOpenSearchPanels();
    });
  }

  function positionOpenSearchPanels() {
    ["start", "end"].forEach((kind) => {
      const results = document.getElementById(`${kind}-results`);
      if (results?.classList.contains("is-open")) positionSearchResults(kind);
    });
  }

  function positionSearchResults(kind) {
    const input = document.getElementById(`${kind}-input`);
    const results = document.getElementById(`${kind}-results`);
    if (!input || !results) return;
    const rect = input.getBoundingClientRect();
    if (isMobileResultsLayout()) {
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportLeft = viewport?.offsetLeft || 0;
      const viewportWidth = viewport?.width || window.innerWidth;
      const viewportHeight = viewport?.height || window.innerHeight;
      const margin = 8;
      const top = Math.max(viewportTop + margin, rect.bottom + 6);
      const availableHeight = Math.max(72, viewportTop + viewportHeight - top - margin);
      results.dataset.layout = "mobile";
      results.dataset.placement = "below";
      results.style.left = `${Math.round(viewportLeft + margin)}px`;
      results.style.top = `${Math.round(top)}px`;
      results.style.width = `${Math.max(0, Math.round(viewportWidth - margin * 2))}px`;
      results.style.maxHeight = `${Math.round(Math.min(360, availableHeight))}px`;
      return;
    }
    results.dataset.layout = "desktop";
    const margin = 10;
    const preferredWidth = window.innerWidth <= 520 ? window.innerWidth - margin * 2 : 420;
    const width = Math.min(Math.max(rect.width, preferredWidth), window.innerWidth - margin * 2);
    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
    const belowTop = rect.bottom + 6;
    const belowSpace = window.innerHeight - belowTop - margin;
    const aboveSpace = rect.top - margin - 6;
    const placeAbove = belowSpace < 180 && aboveSpace > belowSpace;
    const availableHeight = placeAbove ? aboveSpace : belowSpace;
    const maxHeight = Math.max(120, Math.min(320, availableHeight));
    const frame = results.querySelector(".search-results-frame");
    const contentHeight = Math.min(maxHeight, frame?.scrollHeight || maxHeight);
    const top = placeAbove ? Math.max(margin, rect.top - contentHeight - 6) : belowTop;
    results.dataset.placement = placeAbove ? "above" : "below";
    results.style.left = `${Math.round(left)}px`;
    results.style.top = `${Math.round(top)}px`;
    results.style.width = `${Math.round(width)}px`;
    results.style.maxHeight = `${Math.round(maxHeight)}px`;
  }

  function searchResultMeta(place) {
    const type = typeLabel(place.type);
    return [...new Set([type, localizedPlaceAddress(place) || t("common.hongKong")].map((value) => String(value).trim()).filter(Boolean))].join(" · ");
  }

  async function searchPlaces(query) {
    if (!searchService) return [];
    const local = searchService.searchLocal(query, { limit: 8 });
    if (local.length) return local;
    return searchService.search(query, { limit: 8 });
  }
  function setProfile(profile) {
    const selected = MapableProfileService.resolve(profile);
    if (state.profile === selected.id) {
      if (selected.id === "colorVision") {
        const picker = document.getElementById("visual-mode-picker");
        setVisualPickerOpen(Boolean(picker?.hidden));
      }
      return;
    }
    const previousProfile = state.profile;
    if (previousProfile !== "lowVision" && selected.id === "lowVision") {
      state.contrastModeBeforeLowVision = state.contrastMode;
      state.contrastMode = "highContrast";
    } else if (previousProfile === "lowVision" && selected.id !== "lowVision") {
      state.contrastMode = state.contrastModeBeforeLowVision || "standard";
      state.contrastModeBeforeLowVision = null;
    }
    state.profile = selected.id;
    const selection = MapableProfileService.selection(selected.id);
    if (selected.id === "colorVision" && state.colorMode === "default") {
      state.colorMode = selection.colorMode;
    } else if (selected.id !== "colorVision") {
      state.colorMode = "default";
    }
    if (selected.id === "stroller") {
      state.activeFacilityLayer = "babycare";
      state.babycareVisible = true;
    } else if (state.activeFacilityLayer === "babycare") {
      state.activeFacilityLayer = null;
      state.babycareVisible = false;
    }
    applyProfileUi(selected.id);
    setStatus(t("status.profileSelected", { profile: t(`profiles.${selected.id}`) }));
    planRoute();
  }

  function applyProfileUi(profileKey) {
    const selected = MapableProfileService.resolve(profileKey);
    const selection = MapableProfileService.selection(profileKey);
    document.documentElement.dataset.travelProfile = selection.travelProfile;
    document.documentElement.dataset.colorMode = state.colorMode;
    document.documentElement.dataset.contrastMode = state.contrastMode;
    document.querySelectorAll(".profile-button").forEach((button) => {
      const active = button.dataset.profile === selected.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setVisualPickerOpen(selected.id === "colorVision");
    renderColorModeControls();
    renderContrastModeControl();
    prioritizeJourneyForProfile(selected.id);
    syncBabycareLayer();
  }

  function setColorMode(mode) {
    if (state.profile !== "colorVision" || !["redGreen", "blueYellow"].includes(mode)) return;
    state.colorMode = mode;
    document.documentElement.dataset.colorMode = mode;
    renderColorModeControls();
    setVisualPickerOpen(false);
    if (state.route) renderRoute(state.route, { fit: false, updateStatus: false });
    const label = document.querySelector('[data-color-mode="' + mode + '"] span')?.textContent || t("profiles.colorVision");
    announceRoute(t("status.colorMode", { mode: label }));
  }

  function renderColorModeControls() {
    document.querySelectorAll(".visual-mode-button").forEach((button) => {
      const active = button.dataset.colorMode === state.colorMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function setContrastMode(mode) {
    state.contrastMode = mode === "highContrast" ? "highContrast" : "standard";
    document.documentElement.dataset.contrastMode = state.contrastMode;
    renderContrastModeControl();
    requestAnimationFrame(syncFacilityControlGeometry);
    if (state.route) renderRoute(state.route, { fit: false, updateStatus: false });
    announceRoute(t(state.contrastMode === "highContrast" ? "status.contrastOn" : "status.contrastOff"));
  }

  function renderContrastModeControl() {
    const toggle = document.getElementById("contrast-mode-toggle");
    const active = state.contrastMode === "highContrast";
    toggle?.setAttribute("aria-checked", String(active));
    toggle?.classList.toggle("is-active", active);
  }

  function setVisualPickerOpen(open) {
    const picker = document.getElementById("visual-mode-picker");
    const trigger = document.querySelector('[data-profile="colorVision"]');
    if (picker) picker.hidden = !open;
    trigger?.setAttribute("aria-expanded", String(open));
  }

  function prioritizeJourneyForProfile(profileKey) {
    const content = document.querySelector(".results-pane .panel-content");
    const journey = content?.querySelector(".journey-section");
    const babycare = content?.querySelector(".babycare-route-summary");
    if (!content || !journey) return;
    if (profileKey === "lowVision") {
      const summary = content.querySelector(".summary-band");
      if (summary) content.insertBefore(journey, summary);
      if (babycare) journey.after(babycare);
      return;
    }
    const noticeStack = content.querySelector(".route-notice-stack");
    if (noticeStack) content.insertBefore(journey, noticeStack);
    if (babycare) journey.after(babycare);
  }

  function moveButtonFocus(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll("button:not([disabled])")];
    if (!buttons.length) return;
    const current = Math.max(0, buttons.indexOf(document.activeElement));
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  }

  function handleProfileKeydown(event) {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      moveButtonFocus(event);
      return;
    }
    if (!["Enter", " "].includes(event.key)) return;
    const button = event.target.closest(".profile-button");
    if (!button || !event.currentTarget.contains(button)) return;
    event.preventDefault();
    setProfile(button.dataset.profile);
  }

  function handleRouteOptionKeydown(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll("[data-route-index]")];
    if (!buttons.length) return;
    const current = Math.max(0, buttons.indexOf(document.activeElement));
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    selectRouteOption(Number(buttons[next].dataset.routeIndex), { restoreFocus: true });
  }

  function setPlace(kind, place, options = {}) {
    const shouldPlan = options.plan !== false;
    const existingIndex = places.findIndex((item) => item.id === place.id);
    if (existingIndex === -1) {
      places.push(place);
      if (searchService) searchService.add(place);
      renderPlaces();
    } else {
      places[existingIndex] = place;
    }
    state[kind] = place;
    if (kind === "start") {
      state.autoLocationStart = options.autoLocation === true;
      state.autoLocationStartEditing = false;
    }
    setInput(`${kind}-input`, place);
    setPickMode(null);
    if (shouldPlan) planRoute();
  }
  function setInput(id, place) {
    document.getElementById(id).value = place ? localizedPlaceName(place) : "";
    syncSearchClearButton(id.startsWith("start-") ? "start" : "end");
  }

  function syncSearchClearButton(kind) {
    const input = document.getElementById(`${kind}-input`);
    const button = document.getElementById(`clear-${kind}-input`);
    const line = input?.closest(".search-line");
    if (!input || !button || !line) return;
    const hasValue = Boolean(input.value);
    button.hidden = !hasValue;
    line.classList.toggle("has-value", hasValue);
  }

  function clearSearchSelection(kind, input) {
    if (clearAutomaticLocationStart(kind, input)) return;
    state[kind] = null;
    if (kind === "start") {
      state.autoLocationStart = false;
      state.autoLocationStartEditing = false;
    }
    input.value = "";
    syncSearchClearButton(kind);
    routePlanningToken += 1;
    routePlanningScheduleToken += 1;
    isPlanningRoute = false;
    clearRoute();
    renderEndpointMarkers();
    renderPendingRoute();
  }

  function clearAutomaticLocationStart(kind, input) {
    if (kind !== "start" || !state.autoLocationStart || state.start?.id !== "current-location") return false;
    state.autoLocationStart = false;
    state.autoLocationStartEditing = true;
    state.start = null;
    input.value = "";
    syncSearchClearButton("start");
    routePlanningToken += 1;
    routePlanningScheduleToken += 1;
    isPlanningRoute = false;
    clearRoute();
    renderEndpointMarkers();
    renderPendingRoute();
    setStatus(t("status.reselectStart"));
    return true;
  }

  function restoreAutomaticLocationStartIfEmpty(kind, input) {
    if (kind !== "start" || !state.autoLocationStartEditing || input.value.trim() || !state.currentLocation || state.pickMode === "start") return false;
    state.autoLocationStartEditing = false;
    setPlace("start", currentLocationPlace(), { autoLocation: true });
    return true;
  }

  function setPickMode(kind) {
    const previousKind = state.pickMode;
    const nextKind = kind && previousKind !== kind ? kind : null;
    if (previousKind) setInput(`${previousKind}-input`, state[previousKind]);
    clearMapPickCandidate();
    state.pickMode = nextKind;
    if (nextKind) {
      closeMapInfoOverlay();
      map?.closePopup();
      closeSearchResults("start");
      closeSearchResults("end");
      const plannerPanel = document.querySelector('[data-collapsible="planner"]');
      if (isMobileResultsLayout()) {
        if (!previousKind) {
          state.restoreResultsAfterPick = currentMobileResultsState();
          state.restorePlannerAfterPick = mobilePlannerCollapsed;
        }
        setMobileResultsState("collapsed");
        setMobilePlannerCollapsed(true);
      } else {
        if (!previousKind) {
          state.restoreResultsAfterPick = currentDesktopResultsState();
          state.restorePlannerAfterPick = Boolean(plannerPanel?.classList.contains("is-collapsed"));
        }
        setDesktopResultsState("collapsed");
        setPlannerCollapsed(true, { source: "map-pick" });
      }
    } else if (previousKind) {
      const restoreState = state.restoreResultsAfterPick;
      const restorePlanner = state.restorePlannerAfterPick;
      state.restoreResultsAfterPick = false;
      state.restorePlannerAfterPick = null;
      if (isMobileResultsLayout()) {
        setMobilePlannerCollapsed(Boolean(restorePlanner));
        if (typeof restoreState === "string") setMobileResultsState(restoreState);
      } else if (typeof restoreState === "string") {
        setDesktopResultsState(restoreState);
        if (restoreState !== "expanded") setPlannerCollapsed(Boolean(restorePlanner), { source: "map-pick" });
      } else if (restoreState === true) {
        setResultsExpanded(true);
      }
      if (previousKind === "start") {
        restoreAutomaticLocationStartIfEmpty("start", document.getElementById("start-input"));
      }
    }
    ["start", "end"].forEach((item) => {
      const button = document.getElementById(`pick-${item}`);
      if (button) button.setAttribute("aria-pressed", String(state.pickMode === item));
    });
    const mapElement = document.getElementById("map");
    mapElement.classList.toggle("is-picking-start", state.pickMode === "start");
    mapElement.classList.toggle("is-picking-end", state.pickMode === "end");
    if (state.pickMode) document.documentElement.dataset.mapPickMode = state.pickMode;
    else delete document.documentElement.dataset.mapPickMode;
    syncMapPickLayout();
    const actionGroup = document.getElementById("map-pick-actions");
    const confirmButton = document.getElementById("confirm-map-pick");
    actionGroup.hidden = !state.pickMode;
    confirmButton.hidden = !state.pickMode;
    confirmButton.disabled = true;
    confirmButton.querySelector("span").textContent = state.pickMode === "start"
      ? t("mapPick.confirmStart")
      : state.pickMode === "end"
        ? t("mapPick.confirmEnd")
        : t("mapPick.confirm");
    confirmButton.setAttribute("aria-label", state.pickMode === "start" ? t("mapPick.confirmStart") : state.pickMode === "end" ? t("mapPick.confirmEnd") : t("mapPick.confirm"));
    if (state.pickMode) setStatus(t("mapPick.prompt", { kind: state.pickMode === "start" ? t("place.start") : t("place.end") }));
  }

  function onMapClick(event) {
    if (!state.pickMode) {
      closeMapInfoOverlay();
      return;
    }
   const kind = state.pickMode;
   const nearby = searchService?.nearbyPlace(event.latlng.lat, event.latlng.lng);
   const nearbyEnglishParts = [nearby?.areaPlace, nearby?.landmarkPlace]
      .map((place) => englishNameForSource(place?.name))
      .filter(Boolean)
      .filter((name, index, names) => index === 0 || !names.slice(0, index).some((previous) => previous === name || previous.includes(name) || name.includes(previous)));
    const nearbyEnglishName = nearbyEnglishParts.length
      ? t("place.nearbyNamed", { place: nearbyEnglishParts.join(", ") })
      : t("place.selectedNearby");
   const place = {
      id: `custom-${kind}-${event.latlng.lat.toFixed(6)}-${event.latlng.lng.toFixed(6)}`,
      name: nearby?.name || "\u6240\u9078\u4f4d\u7f6e\u9644\u8fd1\u5730\u9ede",
      nameEn: nearbyEnglishName,
      type: "custom",
      positionSource: "map-pick",
      address: `${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`,
      lat: event.latlng.lat,
      lng: event.latlng.lng,
      aliases: nearbyEnglishParts
    };
    state.pendingMapPick = { kind, place };
    setInput(`${kind}-input`, place);
    if (mapPickPreviewMarker) mapPickPreviewMarker.remove();
    mapPickPreviewMarker = L.marker([place.lat, place.lng], {
      icon: markerIcon(endpointMarkerLabel(kind), kind),
      zIndexOffset: 1200
    }).addTo(map);
    document.getElementById("confirm-map-pick").disabled = false;
    setStatus(t("mapPick.selectedStatus", { place: localizedPlaceName(place) }));
  }

  function confirmMapPick() {
    const pending = state.pendingMapPick;
    if (!pending || pending.kind !== state.pickMode) return;
    setPlace(pending.kind, pending.place);
  }

  function clearMapPickCandidate() {
    state.pendingMapPick = null;
    if (mapPickPreviewMarker) mapPickPreviewMarker.remove();
    mapPickPreviewMarker = null;
  }

  function swapPlaces() {
    const nextStart = state.end;
    state.end = state.start;
    state.start = nextStart;
    state.autoLocationStart = false;
    state.autoLocationStartEditing = false;
    setInput("start-input", state.start);
    setInput("end-input", state.end);
    planRoute();
  }

  function handleLocateButton() {
    requestCurrentLocation({ setMapView: true });
  }

  function useCurrentLocationFor(kind) {
    if (state.currentLocation) {
      setPlace(kind, currentLocationPlace());
      map.setView([state.currentLocation.lat, state.currentLocation.lng], 16);
      return;
    }
    requestCurrentLocation({ setMapView: true, setPlaceKind: kind });
  }

  function requestCurrentLocation(options = {}) {
    const { initial = false, background = false, setMapView = false, setPlaceKind = null, setStartOnSuccess = false } = options;
    if (locationRequestInFlight) return;
    locationRequestInFlight = true;
    setLocationOverlay(initial);
    if (!navigator.geolocation) {
      locationRequestInFlight = false;
      state.locationDenied = false;
      state.locationUnavailable = true;
      updateLocateButton();
      setLocationOverlay(false);
      setStatus(t("location.unsupported"));
      return;
    }
    if (!initial && !background) setStatus(t("location.reading"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationRequestInFlight = false;
        state.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        state.locationDenied = false;
        state.locationUnavailable = false;
        updateLocateButton();
        const place = currentLocationPlace();
        renderCurrentLocation();
        startLocationRefresh();
        if (setPlaceKind) setPlace(setPlaceKind, place);
        else if (setStartOnSuccess && !state.start) setPlace("start", place, { autoLocation: true });
        if (setMapView) map.setView([place.lat, place.lng], 16);
        setLocationOverlay(false);
        if (!initial && !background && !setPlaceKind) setStatus(t("location.located"));
      },
      (error) => {
        locationRequestInFlight = false;
        const permissionDenied = error?.code === 1;
        state.locationDenied = permissionDenied;
        state.locationUnavailable = !permissionDenied;
        updateLocateButton();
        if (permissionDenied) stopLocationRefresh();
        else startLocationRefresh();
        setLocationOverlay(false);
        if (!background) {
          setStatus(t(permissionDenied ? "location.denied" : "location.unavailable"));
        }
      },
      { enableHighAccuracy: background, timeout: initial ? 15000 : 10000, maximumAge: background ? 0 : 60000 }
    );
  }

  function startLocationRefresh() {
    if (locationRefreshTimer) return;
    locationRefreshTimer = window.setInterval(() => {
      if (document.hidden || locationRequestInFlight) return;
      requestCurrentLocation({ background: true });
    }, LOCATION_REFRESH_INTERVAL_MS);
  }

  function stopLocationRefresh() {
    if (!locationRefreshTimer) return;
    window.clearInterval(locationRefreshTimer);
    locationRefreshTimer = null;
  }

  function currentLocationPlace() {
    return {
      id: "current-location",
      name: t("place.currentLocation"),
      type: "custom",
      positionSource: "geolocation",
      accuracy: state.currentLocation?.accuracy,
      address: state.currentLocation?.accuracy ? t("location.gpsAccuracy", { meters: Math.round(state.currentLocation.accuracy) }) : t("location.gps"),
      lat: state.currentLocation.lat,
      lng: state.currentLocation.lng,
      aliases: ["目前位置", "我的位置", "Your location"]
    };
  }

  function renderCurrentLocation() {
    if (!state.currentLocation) return;
    if (currentLocationMarker) currentLocationMarker.remove();
    if (currentAccuracyCircle) currentAccuracyCircle.remove();
    const place = currentLocationPlace();
    currentLocationMarker = L.marker([place.lat, place.lng], {
      icon: currentLocationIcon(),
      zIndexOffset: 10000
    }).bindPopup(t("place.currentLocation")).addTo(map);
    currentLocationMarker.unbindPopup();
    bindMapInfoMarker(currentLocationMarker, localizedPlaceName(place), { kind: "current-location" });
    if (Number.isFinite(state.currentLocation.accuracy)) {
      currentAccuracyCircle = L.circle([place.lat, place.lng], {
        radius: Math.min(Math.max(state.currentLocation.accuracy, 20), 500),
        color: "#1d4ed8",
        weight: 1,
        fillColor: "#1d4ed8",
        fillOpacity: 0.08,
        opacity: 0.45
      }).addTo(map);
    }
  }

  function currentLocationIcon() {
    return L.divIcon({
      html: '<span class="current-location-marker" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg></span>',
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function setLocationOverlay(visible) {
    const overlay = document.getElementById("location-overlay");
    if (overlay) overlay.hidden = !visible;
  }

  function updateLocateButton() {
    const button = document.getElementById("locate-button");
    if (!button) return;
    const prompt = state.locationDenied
      ? t("locate.allow")
      : state.locationUnavailable && !state.currentLocation
        ? t("locate.retry")
        : t("locate.title");
    button.classList.toggle("needs-permission", state.locationDenied || (state.locationUnavailable && !state.currentLocation));
    button.setAttribute("aria-label", prompt);
    button.title = prompt;
    const text = button.querySelector(".locate-text");
    if (text) text.textContent = prompt;
  }

  async function planRoute(options = {}) {
    routePlanningScheduleToken += 1;
    const token = ++routePlanningToken;
    isPlanningRoute = true;
    cancelSearchWork();
    prepareMapForRoutePlanning();
    if (!state.start || !state.end) {
      clearRoute();
      renderEndpointMarkers();
      renderPendingRoute();
      isPlanningRoute = false;
      return;
    }
    setStatus(t("planning.status"));
    renderPlanningRoute(t("planning.title"), t("planning.description"));
    setOptionalText("recommendation-text", t("planning.longDescription"));
    if (isMobileResultsLayout() && !options.preserveResultsState) setMobileResultsState("expanded");
    const departureDate = departureForPlan();
    const slowTimer = setTimeout(() => {
      if (token !== routePlanningToken) return;
      setStatus(t("planning.stillStatus"));
      renderPlanningRoute(t("planning.stillTitle"), t("planning.stillDescription"));
    }, 8000);
    try {
      const result = await withTimeout(routeService.plan(state.start, state.end, state.profile, {
        departureMode: state.departureMode,
        departureTime: departureDate.toISOString()
      }), 30000, t("planning.timeout"));
      if (token !== routePlanningToken) return;
      state.routeOptions = result.options || [];
      state.unavailableRoutes = result.unavailableRoutes || [];
      state.departure = result.departure || null;
      state.profileMeta = result.profile || null;
      state.profileNotice = result.profileNotice || "";
      state.activeRouteIndex = 0;
      if (!state.routeOptions.length) {
        clearRoute();
        renderEndpointMarkers();
        renderNoRoute(result, options);
        return;
      }
      openResultsForRoute(options);
      selectRouteOption(0);
    } catch (error) {
      if (token !== routePlanningToken) return;
      console.error(error);
      clearRoute();
      renderEndpointMarkers();
      renderNoRoute(null, options);
      setStatus(t("planning.failed", { message: error.message }));
    } finally {
      clearTimeout(slowTimer);
      if (token === routePlanningToken) isPlanningRoute = false;
    }
  }

  function clearRoute() {
    if (routeLayer) routeLayer.remove();
    if (startMarker) startMarker.remove();
    if (endMarker) endMarker.remove();
    routeLayer = null;
    routeSegmentLayers = [];
    startMarker = null;
    endMarker = null;
    state.route = null;
    state.activeSegmentIndex = null;
  }

  function prepareMapForRoutePlanning() {
    clearRoute();
    renderEndpointMarkers();
  }

  function renderEndpointMarkers() {
    if (startMarker) startMarker.remove();
    if (endMarker) endMarker.remove();
    startMarker = null;
    endMarker = null;
    if (state.start) {
      startMarker = L.marker([state.start.lat, state.start.lng], { icon: markerIcon(endpointMarkerLabel("start"), "start") }).addTo(map);
      bindMapInfoMarker(startMarker, localizedPlaceName(state.start), { kind: "start" });
    }
    if (state.end) {
      endMarker = L.marker([state.end.lat, state.end.lng], { icon: markerIcon(endpointMarkerLabel("end"), "end") }).addTo(map);
      bindMapInfoMarker(endMarker, localizedPlaceName(state.end), { kind: "end" });
    }
  }

  function renderPlanningRoute(title, message) {
    state.resultStatus = "planning";
    state.routeOptions = [];
    state.unavailableRoutes = [];
    state.departure = null;
    state.activeRouteIndex = 0;
    const routeOptions = document.getElementById("route-options");
    if (routeOptions) {
      routeOptions.innerHTML = `<button class="route-option-button is-loading" type="button" disabled><svg class="route-option-spinner" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/></svg><span>${escapeHtml(title)}<small>${escapeHtml(t("common.pleaseWait"))}</small></span></button>`;
    }
    clearSegmentUi();
    hideBabycareRouteSummary();
    document.getElementById("results-title").textContent = title;
    document.getElementById("summary-distance").textContent = "--";
    document.getElementById("summary-time").textContent = t("planning.calculating");
    document.getElementById("summary-fare").textContent = t("planning.querying");
    renderRiskBadge(t("planning.badge"), "is-neutral");
    const flow = document.getElementById("journey-flow");
    if (flow) flow.innerHTML = `<div class="journey-empty">${escapeHtml(message)}</div>`;
    renderRouteDataStatus(null);
    renderProfileSummary(null);
    renderServiceNotice();
  }

  function renderPendingRoute(options = {}) {
    state.resultStatus = "pending";
    if (!options.preserveResultsState) setResultsExpanded(false);
    state.routeOptions = [];
    state.unavailableRoutes = [];
    state.departure = null;
    state.profileMeta = null;
    state.profileNotice = "";
    state.activeRouteIndex = 0;
    document.getElementById("route-options").innerHTML = "";
    clearSegmentUi();
    hideBabycareRouteSummary();
    renderJourneyFlow(null);
    document.getElementById("results-title").textContent = t("results.unplanned");
    document.getElementById("summary-distance").textContent = "--";
    document.getElementById("summary-time").textContent = "--";
    document.getElementById("summary-fare").textContent = "--";
    renderRiskBadge(t("results.pending"), "is-neutral");
    renderRouteDataStatus(null);
    renderProfileSummary(null);
    renderServiceNotice();
    setStatus(state.start ? t("status.chooseMissing", { missing: t("place.end") }) : t("status.initial"));
  }

  function recommendRoute(start, end, profile) {
    const distance = routeDistance(start, end);
    const geometry = knownRoutes[`${start.id}:${end.id}`] || directGeometry(start, end);
    const longTransit = isAdmiraltyTuenMun(start, end);
    const hasSlope = isFestivalWalkRoute(start, end);
    const risk = riskFor(distance, hasSlope, longTransit, profile);
    if (longTransit || distance > profile.maxEasyWalk * 2.2 || risk.className === "is-high") return transitPlan(start, end, distance, geometry, profile, longTransit);
    return walkingPlan(start, end, distance, geometry, profile, hasSlope, risk);
  }

  function walkingPlan(start, end, distance, geometry, profile, hasSlope, risk) {
    const minutes = Math.max(2, Math.round(distance / profile.walkSpeed));
    return {
      mode: "walk",
      title: "建議步行",
      summaryMode: "步行",
      distance,
      minutes,
      geometry,
      risk,
      color: "#007c6c",
      recommendation: `沿步行路網由「${start.name}」前往「${end.name}」。`,
      reasons: ["距離較短，長者步速下仍屬可處理範圍。", "此段可直接步行到達，不需要先繞去交通接駁點。", hasSlope ? "路上可能有輕微斜度，慢行會較穩妥。" : "此段未標示需要使用樓梯。"],
      cautions: [hasSlope ? "如不想行斜路，可改用附近港鐵或巴士接駁。" : "出發前仍建議留意現場臨時工程或升降機情況。", "照顧者同行時，可在路口和商場入口位置放慢。"]
    };
  }

  function transitPlan(start, end, distance, geometry, profile, longTransit) {
    const minutes = longTransit ? 58 : Math.max(18, Math.round(distance / 300) + 12);
    const mode = longTransit ? "KMB P960 / 港鐵接駁" : "港鐵 / 巴士接駁";
    return {
      mode: "transit",
      title: "建議接駁港鐵 / 巴士",
      summaryMode: mode,
      distance,
      minutes,
      geometry,
      risk: { label: "較穩定", className: "is-medium" },
      color: "#1d4ed8",
      recommendation: `由「${start.name}」先前往合適接駁點，再前往「${end.name}」。`,
      reasons: ["步行距離較長，對長者或照顧者不夠穩定。", longTransit ? "此走廊可用 KMB P960 或港鐵作長距離接駁。" : "接駁方案可減少長時間連續步行。", "首尾兩段步行應優先選擇有升降機、斜道或較平坦入口的位置。"],
      cautions: ["巴士站和車輛無障礙情況可能需要出發前再核對。", profile.label === "長者" ? "如體力一般，建議預留更多候車和步行時間。" : "請按當日路面和交通情況調整。"]
    };
  }

  function renderRoute(plan, options = {}) {
    const { fit = true, updateStatus = true } = options;
    closeMapInfoOverlay();
    if (routeLayer) routeLayer.remove();
    if (startMarker) startMarker.remove();
    if (endMarker) endMarker.remove();
    routeLayer = L.layerGroup().addTo(map);
    routeSegmentLayers = [];
    (plan.segments && plan.segments.length ? plan.segments : [{ mode: plan.mode, geometry: plan.geometry, color: plan.color }]).forEach((segment, index) => {
      if (!segment.geometry || segment.geometry.length < 2) return;
      const color = segment.color || plan.color || "#007c6c";
      const dashArray = routeDashArray(segment.mode);
      const highContrast = state.contrastMode === "highContrast";
      const weight = (segment.mode === "walk" ? 5 : 7) + (highContrast ? 2 : 0);
      const casing = L.polyline(segment.geometry, {
        color: highContrast ? "#111111" : "#ffffff",
        weight: weight + (highContrast ? 6 : 4),
        opacity: 0.9,
        dashArray,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
        className: "route-line-casing"
      }).addTo(routeLayer);
      const layer = L.polyline(segment.geometry, {
        color,
        weight,
        opacity: 0.96,
        dashArray,
        lineCap: "round",
        lineJoin: "round",
        className: "route-line route-line-" + routeModeClass(segment.mode)
      }).addTo(routeLayer);
      routeSegmentLayers.push({ index, layer, casing, weight });
      const mapLabel = routeMapLabel(segment);
      if (mapLabel) {
        const modeClass = routeModeClass(segment.mode);
        const midpoint = segment.geometry[Math.floor(segment.geometry.length / 2)];
        L.marker(midpoint, {
          interactive: false,
          icon: L.divIcon({
            className: "route-line-label-wrapper",
            iconSize: [112, 30],
            iconAnchor: [56, 15],
            html: '<span class="route-line-label is-' + modeClass + '" style="--route-color:' + escapeHtml(color) + '">'
              + routeModeIcon(segment.mode, "route-mode-icon") + '<span>' + escapeHtml(mapLabel) + "</span></span>"
          })
        }).addTo(routeLayer);
      }
    });
    if (plan.selectedEgressExit) {
      const exit = plan.selectedEgressExit;
      const exitName = mtrExitFullName(exit);
      const exitInfo = exitName + "。 " + mtrExitAccessibilityText(exit);
      const exitMarker = L.marker([exit.lat, exit.lng], {
        icon: mtrExitMarkerIcon(exit),
        title: exitName,
        alt: exitName,
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: 900
      }).addTo(routeLayer);
      bindMapInfoMarker(exitMarker, exitInfo, { kind: "mtr-exit" });
    }
    startMarker = L.marker([state.start.lat, state.start.lng], { icon: markerIcon(endpointMarkerLabel("start"), "start") }).bindPopup(localizedPlaceName(state.start)).addTo(map);
    endMarker = L.marker([state.end.lat, state.end.lng], { icon: markerIcon(endpointMarkerLabel("end"), "end") }).bindPopup(localizedPlaceName(state.end)).addTo(map);
    startMarker.unbindPopup();
    endMarker.unbindPopup();
    bindMapInfoMarker(startMarker, localizedPlaceName(state.start), { kind: "start" });
    bindMapInfoMarker(endMarker, localizedPlaceName(state.end), { kind: "end" });
    if (fit) fitRoute();
    if (updateStatus) setStatus(`${localizedDataText(plan.title)}：${t("mode.walk")} ${formatDistance(plan.walkDistance ?? plan.distance)}，${formatDuration(plan.minutes)}。`);
  }

  function routeDashArray(mode) {
    if (mode === "walk") return "2 9";
    return null;
  }

  function routeModeClass(mode) {
    if (mode === "walk") return "walk";
    if (/light/i.test(mode || "")) return "light-rail";
    if (/mtr|rail|train/i.test(mode || "")) return "rail";
    if (/bus/i.test(mode || "")) return "bus";
    return "other";
  }

  function routeMapLabel(segment) {
    if (segment.mode === "walk") return "";
   const value = String(segment.routeNo || segment.lineName || "").trim();
    return value ? localizedDataText(value).slice(0, 12) : routeModeLabel(segment.mode);
  }

  function routeModeLabel(mode) {
    const modeClass = routeModeClass(mode);
    if (modeClass === "walk") return t("mode.walk");
    if (modeClass === "bus") return t("mode.bus");
    if (modeClass === "rail") return t("mode.rail");
    if (modeClass === "light-rail") return t("mode.lightRail");
    return t("mode.transfer");
  }

  function routeModeIcon(mode, className = "route-mode-icon") {
    const modeClass = routeModeClass(mode);
    const paths = modeClass === "walk"
      ? '<circle cx="13" cy="4" r="2"/><path d="m10 22 2-7-3-3 2-5 4 3 4 1M6 22l3-5M15 22l-3-7"/>'
      : modeClass === "bus"
        ? '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="M7 7h10M7 12h10M8 19v2M16 19v2"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>'
        : modeClass === "light-rail"
          ? '<path d="M6 3h12v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V3Z"/><path d="M8 7h8M8 12h8M9 22l3-3 3 3"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/>'
          : '<path d="M7 3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path d="M7 8h10M8 22l4-3 4 3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>';
    return '<svg class="' + className + '" viewBox="0 0 24 24" aria-hidden="true">' + paths + "</svg>";
  }

  function renderPlaces() {
    placeLayer.clearLayers();
  }

  async function ensureBabycareData() {
    if (state.babycareData) return state.babycareData;
    if (!babycareLoadPromise) {
      babycareLoadPromise = MapableBabycareService.load("data/babycare-facilities.json").then((payload) => {
        state.babycareData = payload;
        updateFacilityLayerControls();
        renderBabycareViewport();
        if (state.route) renderBabycareRouteSummary(state.route);
        return payload;
      }).catch((error) => {
        console.warn("Babycare data unavailable", error);
        babycareLoadPromise = null;
        return null;
      });
    }
    return babycareLoadPromise;
  }

  async function ensurePublicFacilityData() {
    if (state.publicFacilityData) return state.publicFacilityData;
    if (!publicFacilityLoadPromise) {
      publicFacilityLoadPromise = MapableFacilityService.load("data/public-facilities.json?v=20260719-9").then((payload) => {
        state.publicFacilityData = payload;
        updateFacilityLayerControls();
        renderPublicFacilityViewport();
        return payload;
      }).catch((error) => {
        console.warn("Public facility data unavailable", error);
        publicFacilityLoadPromise = null;
        setStatus("\u516c\u5171\u8a2d\u65bd\u8cc7\u6599\u66ab\u6642\u7121\u6cd5\u8f09\u5165\u3002");
        return null;
      });
    }
    return publicFacilityLoadPromise;
  }

  function syncBabycareLayer() {
    const stroller = state.profile === "stroller";
    const button = document.getElementById("babycare-layer-toggle");
    const toolbar = document.querySelector(".map-toolbar");
    toolbar?.classList.toggle("has-babycare", stroller);
    if (button) button.hidden = !stroller;
    if (!stroller && state.activeFacilityLayer === "babycare") {
      state.activeFacilityLayer = null;
      state.babycareVisible = false;
    }
    updateFacilityLayerControls();
    requestAnimationFrame(syncFacilityControlGeometry);
    if (state.activeFacilityLayer === "babycare") setPublicFacilityPaneVisible(false);
    if (!stroller) {
      setBabycarePaneVisible(false);
      hideBabycareRouteSummary();
      return;
    }
    if (state.babycareVisible) ensureBabycareData();
    else setBabycarePaneVisible(false);
  }

  function toggleBabycareLayer(options = {}) {
    toggleFacilityLayer("babycare", options);
  }

  function toggleFacilityLayer(layer, options = {}) {
    if (!["babycare", "publicToilet", "aed"].includes(layer)) return;
    if (layer === "babycare" && state.profile !== "stroller") return;
    state.activeFacilityLayer = state.activeFacilityLayer === layer ? null : layer;
    state.babycareVisible = state.activeFacilityLayer === "babycare";
    updateFacilityLayerControls();
    setBabycarePaneVisible(state.babycareVisible);
    const publicLayerActive = ["publicToilet", "aed"].includes(state.activeFacilityLayer);
    setPublicFacilityPaneVisible(publicLayerActive);
    if (!state.activeFacilityLayer) {
      if (state.route) renderBabycareRouteSummary(state.route);
      restoreBabycareToggleFocus(options);
      return;
    }
    if (state.babycareVisible) {
      ensureBabycareData().then(() => {
        setBabycarePaneVisible(true);
        renderBabycareViewport();
        if (state.route) renderBabycareRouteSummary(state.route);
        restoreBabycareToggleFocus(options);
      });
      return;
    }
    ensurePublicFacilityData().then((payload) => {
      if (!payload || !["publicToilet", "aed"].includes(state.activeFacilityLayer)) return;
      setPublicFacilityPaneVisible(true);
      renderPublicFacilityViewport();
    });
  }

  function setBabycarePaneVisible(visible) {
    const pane = map?.getPane("babycarePane");
    if (!pane) return;
    pane.style.display = visible ? "" : "none";
    pane.style.pointerEvents = visible ? "auto" : "none";
    if (!visible && mapInfoOverlayState?.kind === "babycare") closeMapInfoOverlay();
  }

  function setPublicFacilityPaneVisible(visible) {
    const pane = map?.getPane("publicFacilityPane");
    if (!pane) return;
    pane.style.display = visible ? "" : "none";
    pane.style.pointerEvents = visible ? "auto" : "none";
    if (!visible && ["public-toilet", "aed"].includes(mapInfoOverlayState?.kind)) closeMapInfoOverlay();
  }

  function restoreBabycareToggleFocus(options) {
    if (!options.restoreFocus) return;
    requestAnimationFrame(() => document.querySelector("[data-babycare-summary-toggle]")?.focus({ preventScroll: true }));
  }

  function updateFacilityLayerControls() {
    const labels = {
      babycare: "\u6bcd\u5b30\u8a2d\u65bd",
      publicToilet: "\u516c\u5171\u5ec1\u6240",
      aed: "AED"
    };
    document.querySelectorAll("[data-facility-layer]").forEach((button) => {
      const layer = button.dataset.facilityLayer;
      const active = state.activeFacilityLayer === layer;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", (active ? "\u95dc\u9589" : "\u958b\u555f") + labels[layer] + "\u6a19\u9ede");
    });
  }

  function facilityKindClass(kind) {
    return kind === "aed" ? "aed" : "public-toilet";
  }

  function schedulePublicFacilityViewportRender(event) {
    if (event?.type === "zoomstart") {
      publicFacilityZoomInProgress = true;
      if (publicFacilityViewportTimer) clearTimeout(publicFacilityViewportTimer);
      publicFacilityViewportTimer = null;
      return;
    }
    if (event?.type === "zoomend") {
      publicFacilityZoomInProgress = false;
      if (publicFacilityViewportTimer) clearTimeout(publicFacilityViewportTimer);
      publicFacilityViewportTimer = setTimeout(() => {
        publicFacilityViewportTimer = null;
        renderPublicFacilityViewport();
      }, BABYCARE_CLUSTER_SETTLE_MS);
      return;
    }
    if (!publicFacilityZoomInProgress && !publicFacilityViewportTimer) renderPublicFacilityViewport();
  }

  function clearPublicFacilityViewport() {
    publicFacilityLayer?.clearLayers();
    publicFacilityMarkers.clear();
    publicFacilityViewportSignature = "";
  }

  function renderPublicFacilityViewport() {
    const kind = state.activeFacilityLayer;
    if (!map || !publicFacilityLayer || !["publicToilet", "aed"].includes(kind) || !state.publicFacilityData) return;
    if (publicFacilityZoomInProgress) return;
    if (publicFacilityRenderedKind !== kind) {
      clearPublicFacilityViewport();
      publicFacilityRenderedKind = kind;
    }
    const bounds = map.getBounds();
    const visible = MapableFacilityService.inBounds(state.publicFacilityData.items, kind, {
      south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast()
    }, 0.2);
    const signature = kind + "|" + visible.map((facility) => facility.id).join("|");
    if (signature === publicFacilityViewportSignature && publicFacilityMarkers.size) {
      if (!map.hasLayer(publicFacilityLayer)) publicFacilityLayer.addTo(map);
      setPublicFacilityPaneVisible(true);
      return;
    }
    const visibleIds = new Set(visible.map((facility) => facility.id));
    const removals = [];
    for (const [id, marker] of publicFacilityMarkers) {
      if (visibleIds.has(id)) continue;
      removals.push(marker);
      publicFacilityMarkers.delete(id);
    }
    if (removals.length) {
      if (typeof publicFacilityLayer.removeLayers === "function") publicFacilityLayer.removeLayers(removals);
      else removals.forEach((marker) => publicFacilityLayer.removeLayer(marker));
    }
    const additions = [];
    for (const facility of visible) {
      if (publicFacilityMarkers.has(facility.id)) continue;
      const title = facilityDisplayName(facility);
      const marker = L.marker([facility.lat, facility.lng], {
        icon: publicFacilityMarkerIcon(facility),
        title,
        alt: title,
        keyboard: true,
        riseOnHover: true,
        pane: "publicFacilityPane"
      });
      bindMapInfoMarker(marker, publicFacilityPopup(facility), {
        html: true,
        className: "is-public-facility is-" + facilityKindClass(facility.kind),
        kind: facility.kind === "aed" ? "aed" : "public-toilet"
      });
      publicFacilityMarkers.set(facility.id, marker);
      additions.push(marker);
    }
    if (additions.length) {
      if (typeof publicFacilityLayer.addLayers === "function") publicFacilityLayer.addLayers(additions);
      else additions.forEach((marker) => publicFacilityLayer.addLayer(marker));
    }
    publicFacilityViewportSignature = signature;
    if (!map.hasLayer(publicFacilityLayer)) publicFacilityLayer.addTo(map);
    setPublicFacilityPaneVisible(true);
  }

  function publicFacilityMarkerIcon(facility) {
    const kindClass = facilityKindClass(facility.kind);
    const icon = facility.kind === "aed"
      ? '<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/><path d="m13 7-3 5h4l-3 5"/>'
      : '<circle cx="7" cy="4.5" r="2"/><path d="M4 21v-7H2.5l1.2-6h6.6l1.2 6H10v7M17 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM14 21v-6h-1.5l1-7h7l1 7H20v6"/>';
    return L.divIcon({
      className: "public-facility-div-icon",
      html: '<span class="public-facility-marker is-' + kindClass + '" aria-hidden="true"><svg viewBox="0 0 24 24">' + icon + "</svg></span>",
      iconSize: [40, 40],
      iconAnchor: [20, 36],
      popupAnchor: [0, -34]
    });
  }

  function facilityDisplayName(facility) {
    const name = localizedFacilityName(facility);
    if (facility?.kind !== "aed" || /AED|\u9664\u986b\u5668/i.test(name)) return name;
    return name + " AED";
  }

  function publicFacilityPopup(facility) {
    const isAed = facility.kind === "aed";
    const name = facilityDisplayName(facility);
    const typeLabel = isAed ? t("facility.aed") : publicToiletTypeLabel(facility.subtype, facility.toiletType);
    const fields = isAed ? [
      facility.address ? [t("facility.address"), localizedFacilityValue(facility, "address", "addressEn")] : null,
      [t("facility.serviceHours"), localizedFacilityValue(facility, "openingHours") || t("facility.noData")],
      facility.level ? [t("facility.level"), localizedDataText(facility.level)] : null,
      facility.brand || facility.model ? [t("facility.equipment"), [facility.brand, facility.model].filter(Boolean).join(" ")] : null,
      [t("facility.source"), localizedDataText(facility.sourceName)],
      [t("facility.dataDate"), facility.sourceUpdatedAt || facility.fetchedAt]
    ] : [
      facility.address ? [t("facility.address"), localizedFacilityValue(facility, "address", "addressEn")] : null,
      facility.level ? [t("facility.location"), localizedDataText(facility.level)] : null,
      facility.countryPark ? [t("facility.countryPark"), localizedDataText(facility.countryPark)] : null,
      [t("facility.openingHours"), localizedFacilityValue(facility, "openingHours") || t("facility.noData")],
      [t("facility.accessibleToilet"), triStateLabel(facility.accessibleToilet)],
      facility.universalToilet === "yes" ? [t("facility.universalToilet"), t("facility.yes")] : null,
      facility.accessibilityRemark ? [t("facility.accessibilityRemark"), localizedDataText(facility.accessibilityRemark)] : null,
      [t("facility.source"), localizedDataText(facility.sourceName)],
      [t("facility.dataDate"), facility.sourceUpdatedAt || facility.fetchedAt]
    ];
    const details = fields.filter(Boolean).map(([label, value]) => '<div><dt>' + escapeHtml(label)
      + '</dt><dd>' + escapeHtml(value) + "</dd></div>").join("");
    const sourceLink = facility.sourceUrl
      ? '<a class="babycare-popup-link" href="' + escapeHtml(facility.sourceUrl) + '" target="_blank" rel="noopener">' + escapeHtml(t("facility.viewSource")) + "</a>"
      : "";
    const routeButton = '<button class="babycare-popup-route facility-popup-route" type="button" data-public-facility-route-target="'
      + escapeHtml(facility.id) + '" aria-label="' + escapeHtml(t("facility.planTo", { place: name }))
      + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/>'
      + '<circle cx="12" cy="9" r="2.4"/></svg><span>' + escapeHtml(t("facility.planHere")) + "</span></button>";
    const locationDetail = isAed
      ? '<p class="facility-location-detail"><strong>' + escapeHtml(t("facility.installationLocation")) + "</strong><span>"
        + escapeHtml(localizedFacilityValue(facility, "locationDetail") || t("facility.noData")) + "</span></p>"
      : "";
    const statusNote = !isAed && facility.temporarilyClosed === "yes"
      ? '<p class="facility-status-note">' + escapeHtml(t("facility.closedNote")) + "</p>"
      : "";
    const sourceRemark = !isAed && facility.remark
      ? '<p class="facility-source-remark">' + escapeHtml(localizedDataText(facility.remark)) + "</p>"
      : "";
    const emergencyNote = isAed
      ? '<p class="facility-emergency-note">' + escapeHtml(state.language === "en" ? t("facility.emergencyNote") : localizedDataText(state.publicFacilityData?.meta?.aedEmergencyNote || t("facility.emergencyNote"))) + "</p>"
      : "";
    const coverageNote = '<p class="facility-coverage-note">' + escapeHtml(localizedDataText(state.publicFacilityData?.meta?.coverageNote || "")) + "</p>";
    return '<article class="babycare-popup-card facility-popup-card is-' + facilityKindClass(facility.kind)
      + '"><span class="babycare-source-tag">' + escapeHtml(typeLabel) + " \u00b7 " + escapeHtml(facility.sourceName)
      + "</span><h3>" + escapeHtml(name) + "</h3>" + emergencyNote + locationDetail + statusNote + sourceRemark
      + "<dl>" + details + '</dl><div class="babycare-popup-actions">' + routeButton + sourceLink
      + "</div>" + coverageNote + "</article>";
  }

  function publicToiletTypeLabel(subtype, fallback) {
    return {
      public_toilet: t("facility.publicLavatory"),
      aqua_privy: t("facility.aquaPrivy"),
      portable_toilet: t("facility.portableToilet"),
      country_park_toilet: t("facility.countryParkToilet"),
      mtr_accessible_toilet: t("facility.mtrAccessibleToilet")
    }[subtype] || localizedDataText(fallback) || t("facility.publicToilet");
  }

  function triStateLabel(value) {
    return { yes: t("facility.yes"), no: t("facility.no"), unknown: t("facility.noData") }[value] || t("facility.noData");
  }

  function scheduleBabycareViewportRender(event) {
    if (event?.type === "zoomstart") {
      babycareZoomInProgress = true;
      if (babycareViewportTimer) clearTimeout(babycareViewportTimer);
      babycareViewportTimer = null;
      return;
    }
    if (event?.type === "zoomend") {
      babycareZoomInProgress = false;
      if (babycareViewportTimer) clearTimeout(babycareViewportTimer);
      babycareViewportTimer = setTimeout(() => {
        babycareViewportTimer = null;
        renderBabycareViewport();
      }, BABYCARE_CLUSTER_SETTLE_MS);
      return;
    }
    if (!babycareZoomInProgress && !babycareViewportTimer) renderBabycareViewport();
  }

  function renderBabycareViewport() {
    if (!map || !babycareLayer || state.profile !== "stroller" || !state.babycareVisible || !state.babycareData) return;
    if (babycareZoomInProgress) return;
    const bounds = map.getBounds();
    const visible = MapableBabycareService.inBounds(state.babycareData.items, {
      south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast()
    }, 0.22);
    const signature = visible.map((facility) => facility.id).join("|");
    if (signature === babycareViewportSignature && babycareMarkers.size) {
      if (!map.hasLayer(babycareLayer)) babycareLayer.addTo(map);
      setBabycarePaneVisible(true);
      updateFacilityLayerControls();
      return;
    }
    const visibleIds = new Set(visible.map((facility) => facility.id));
    const removals = [];
    for (const [id, marker] of babycareMarkers) {
      if (visibleIds.has(id)) continue;
      removals.push(marker);
      babycareMarkers.delete(id);
    }
    if (removals.length) {
      if (typeof babycareLayer.removeLayers === "function") babycareLayer.removeLayers(removals);
      else removals.forEach((marker) => babycareLayer.removeLayer(marker));
    }

    const additions = [];
    for (const facility of visible) {
      if (babycareMarkers.has(facility.id)) continue;
      const marker = L.marker([facility.lat, facility.lng], {
        icon: babycareMarkerIcon(facility), title: localizedFacilityName(facility), alt: localizedFacilityName(facility),
        keyboard: true, riseOnHover: true, pane: "babycarePane"
      });
      bindMapInfoMarker(marker, babycarePopup(facility), {
        html: true,
        className: "is-babycare",
        kind: "babycare"
      });
      babycareMarkers.set(facility.id, marker);
      additions.push(marker);
    }
    if (additions.length) {
      if (typeof babycareLayer.addLayers === "function") babycareLayer.addLayers(additions);
      else additions.forEach((marker) => babycareLayer.addLayer(marker));
    }
    babycareViewportSignature = signature;
    if (!map.hasLayer(babycareLayer)) babycareLayer.addTo(map);
    setBabycarePaneVisible(true);
    updateFacilityLayerControls();
  }

  function babycareMarkerIcon(facility) {
    const icon = '<path d="M9 3h6v4l2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-3V3Z"/><path d="M9 7h6M9 13h6"/>';
    return L.divIcon({
      className: "babycare-div-icon",
      html: '<span class="babycare-marker" aria-hidden="true"><svg viewBox="0 0 24 24">' + icon + "</svg></span>",
      iconSize: [40, 40], iconAnchor: [20, 36], popupAnchor: [0, -34]
    });
  }

  function babycarePopup(facility) {
    const kind = facility.facilityKind === "breastfeeding_friendly"
      ? t("facility.breastfeedingFriendly")
      : t("facility.nursingRoom");
    const name = localizedFacilityName(facility);
    const roomCount = facility.roomCount > 1 ? "<p>" + escapeHtml(t("facility.roomCount", { count: facility.roomCount })) + "</p>" : "";
    const fields = [
      facility.address ? [t("facility.address"), localizedFacilityValue(facility, "address", "addressEn")] : null,
      facility.location ? [t("facility.location"), localizedDataText(facility.location)] : null,
      facility.openingHours ? [t("facility.openingHours"), localizedDataText(facility.openingHours)] : null,
      [t("facility.source"), localizedDataText(facility.sourceLabel)],
      [t("facility.coordinatePrecision"), babycarePrecisionLabel(facility.coordinatePrecision)],
      [t("facility.dataDate"), facility.sourceDataDate || facility.checkedAt]
    ].filter(Boolean);
    const details = fields.map(([label, value]) => '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + "</dd></div>").join("");
    const link = facility.detailUrl
      ? '<a class="babycare-popup-link" href="' + escapeHtml(facility.detailUrl) + '" target="_blank" rel="noopener">' + escapeHtml(t("facility.viewSource")) + "</a>"
      : "";
    const routeButton = '<button class="babycare-popup-route" type="button" data-babycare-route-target="' + escapeHtml(facility.id)
      + '" aria-label="' + escapeHtml(t("facility.planTo", { place: name })) + '"><svg viewBox="0 0 24 24" aria-hidden="true">'
      + '<path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg><span>' + escapeHtml(t("facility.planHere")) + "</span></button>";
    return '<article class="babycare-popup-card"><span class="babycare-source-tag">' + escapeHtml(kind) + " \u00b7 " + escapeHtml(facility.sourceLabel)
      + "</span><h3>" + escapeHtml(name) + "</h3>" + roomCount + "<dl>" + details + '</dl><div class="babycare-popup-actions">'
      + routeButton + link + "</div></article>";
  }

  function babycarePrecisionLabel(precision) {
    return {
      venue: t("facility.precisionVenue"),
      address: t("facility.precisionAddress"),
      station: t("facility.precisionStation"),
      terminal_group: t("facility.precisionTerminal")
    }[precision] || t("facility.precisionUnknown");
  }

  function focusBabycareFacility(id) {
    const facility = state.babycareData?.items?.find((item) => item.id === id);
    if (!facility || !Number.isFinite(facility.lat) || !Number.isFinite(facility.lng)) return;
    state.activeFacilityLayer = "babycare";
    state.babycareVisible = true;
    updateFacilityLayerControls();
    const focusAndReveal = () => {
      map.invalidateSize();
      const facilityLatLng = L.latLng(facility.lat, facility.lng);
      focusPointInOpenMap(facilityLatLng, Math.min(map.getMaxZoom(), Math.max(17, map.getZoom())));
      setTimeout(() => {
        renderBabycareViewport();
        const marker = babycareMarkers.get(id);
        if (!marker) return;
        const openInfo = () => {
          focusPointInOpenMap(facilityLatLng, Math.min(map.getMaxZoom(), Math.max(17, map.getZoom())));
          showMapInfoOverlay(babycarePopup(facility), facilityLatLng, {
            html: true,
            className: "is-babycare",
            kind: "babycare"
          });
        };
        if (typeof babycareLayer.zoomToShowLayer === "function") babycareLayer.zoomToShowLayer(marker, openInfo);
        else openInfo();
      }, BABYCARE_CLUSTER_SETTLE_MS);
    };
    if (isMobileResultsLayout()) {
      const alreadyMedium = currentMobileResultsState() === "medium";
      mobileResultsScrollExpansionSuppressedUntil = Date.now() + 900;
      setMobileResultsState("medium", { keepPlannerCollapsed: true });
      mobileSegmentRefitToken += 1;
      setTimeout(focusAndReveal, alreadyMedium ? 40 : 300);
      return;
    }
    focusAndReveal();
  }

  function selectRouteOption(index, options = {}) {
    const plan = state.routeOptions[index];
    if (!plan) return;
    state.activeRouteIndex = index;
    state.activeSegmentIndex = null;
    state.route = plan;
    state.resultStatus = "ready";
    renderRouteOptions();
    renderRoute(plan);
    renderResults(plan);
    announceSelectedRoute(plan);
    if (options.restoreFocus) {
      requestAnimationFrame(() => {
        document.querySelector('[data-route-index="' + index + '"]')?.focus({ preventScroll: true });
      });
    }
  }

  function renderRouteOptions() {
    const container = document.getElementById("route-options");
    container.innerHTML = state.routeOptions.map((option, index) => {
      const badges = (option.badges?.slice(0, 2) || []).map(localizedDataText).join(" / ") || localizedDataText(option.summaryMode) || t("mode.route");
      const variantClass = option.walkVariant ? "is-walk-" + option.walkVariant : "";
      const active = index === state.activeRouteIndex;
      const label = localizedDataText(option.optionLabel) || t("results.routeNumber", { count: index + 1 });
      const check = '<svg class="route-option-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-9"/></svg>';
      return '<button class="route-option-button ' + variantClass + (active ? ' is-active' : '') + '" type="button" data-route-index="' + index
        + '" aria-pressed="' + active + '" aria-label="' + escapeHtml([label, badges, active ? t("results.selected") : ""].filter(Boolean).join(", ")) + '">'
        + check + '<span>' + escapeHtml(label) + '<small>' + escapeHtml(badges) + '</small></span></button>';
    }).join("");
    container.querySelectorAll("[data-route-index]").forEach((button) => {
      button.addEventListener("click", () => selectRouteOption(Number(button.dataset.routeIndex), { restoreFocus: true }));
    });
  }

  function announceSelectedRoute(plan) {
    const profile = MapableProfileService.resolve(state.profile);
    const routeCount = state.routeOptions.length;
    const fare = localizedDataText(plan.fareLabel) || t("results.farePending");
    announceRoute(t("results.foundAnnouncement", {
      profile: t(`profiles.${profile.id}`),
      count: routeCount,
      title: localizedDataText(plan.title),
      duration: formatDuration(plan.minutes),
      distance: formatDistance(plan.walkDistance ?? plan.distance),
      fare
    }));
  }

  function announceRoute(message) {
    const announcer = document.getElementById("route-announcer");
    if (!announcer) return;
    announcer.textContent = "";
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  function clearSegmentUi() {
    const nav = document.getElementById("walk-segment-nav");
    const detail = document.getElementById("walk-segment-detail");
    if (nav) {
      nav.hidden = true;
      nav.innerHTML = "";
    }
    if (detail) {
      detail.hidden = true;
      detail.innerHTML = "";
    }
  }

  function renderWalkSegmentControls(plan) {
    const nav = document.getElementById("walk-segment-nav");
    const detail = document.getElementById("walk-segment-detail");
    if (!nav || !detail) return;
    const walks = (plan?.segments || []).map((segment, index) => ({ segment, index })).filter((item) => item.segment.mode === "walk");
    if (!walks.length) {
      clearSegmentUi();
      return;
    }
    nav.hidden = false;
    nav.innerHTML = `<span class="walk-segment-label">${escapeHtml(t("results.walkSegments"))}</span>${walks.map((item, walkIndex) => {
      const active = state.activeSegmentIndex === item.index;
      return `<button class="walk-segment-button ${active ? "is-active" : ""}" type="button" data-walk-segment-index="${item.index}" aria-pressed="${active}">${escapeHtml(walkSegmentOrdinal(walkIndex))}</button>`;
    }).join("")}`;
    nav.querySelectorAll("[data-walk-segment-index]").forEach((button) => {
      button.addEventListener("click", () => focusRouteSegment(Number(button.dataset.walkSegmentIndex)));
    });

    const activeSegment = Number.isInteger(state.activeSegmentIndex) ? plan.segments?.[state.activeSegmentIndex] : null;
    if (!activeSegment || activeSegment.mode !== "walk") {
      detail.hidden = true;
      detail.innerHTML = "";
      return;
    }
    const walkIndex = walks.findIndex((item) => item.index === state.activeSegmentIndex);
    detail.hidden = false;
    detail.innerHTML = walkSegmentDetail(activeSegment, walkIndex);
  }

  function walkSegmentOrdinal(index) {
    return t("walk.segmentOrdinal", { count: index + 1 });
  }

  function walkSegmentDetail(segment, walkIndex) {
    const metrics = segment.metrics || {};
    const fromName = segment.fromName ? localizedNameText(segment.fromName) : state.start ? localizedPlaceName(state.start) : t("place.start");
    const toName = segment.toName ? localizedNameText(segment.toName) : state.end ? localizedPlaceName(state.end) : t("place.nextConnection");
    const features = [];
    features.push(metrics.stairs ? t("walk.stairs", { count: metrics.stairs }) : metrics.stairsUnknown ? t("walk.stairsUnknown") : t("walk.noKnownStairs"));
    if (metrics.connectedRamps || metrics.ramps) features.push(t("walk.connectedRamps", { count: metrics.connectedRamps || metrics.ramps }));
    if (metrics.connectedLifts || metrics.lifts) features.push(t("walk.connectedLifts", { count: metrics.connectedLifts || metrics.lifts }));
    if (metrics.nearbyRamps) features.push(t("walk.nearbyRamps", { count: metrics.nearbyRamps }));
    if (metrics.nearbyLifts) features.push(t("walk.nearbyLifts", { count: metrics.nearbyLifts }));
    if (metrics.footbridges) features.push(t("walk.footbridges", { count: metrics.footbridges }));
    if (metrics.potentialEntrances) features.push(t("walk.possibleEntrances", { count: metrics.potentialEntrances }));
    if (metrics.slopes) features.push(t("walk.slopes"));
    if (metrics.crossings) features.push(t("walk.crossings", { count: metrics.crossings }));
    const routeNote = segment.routed === false || metrics.fallback
      ? t("walk.fallbackNote")
      : metrics.officialPedestrianRoute
        ? t("walk.officialNote")
        : t("walk.networkNote");
    const confidence = metrics.confidence || (metrics.fallback ? "fallback" : [
      metrics.entranceConnectionUnknown,
      metrics.stairsUnknown,
      metrics.unknownSurface,
      metrics.unknownWidth,
      metrics.unknownCurb,
      metrics.unknownSlopeDetails,
      metrics.unknownCrossingAssist
    ].some(Boolean) ? "partial" : "connected");
    const confidenceNote = {
      fallback: t("walk.confidenceFallback"),
      partial: t("walk.confidencePartial"),
      connected: t("walk.confidenceConnected")
    }[confidence];
    const unknownDetails = [];
    const surfaceDetails = [
      metrics.unknownSurface ? t("walk.unknownSurface") : "",
      metrics.unknownWidth ? t("walk.unknownWidth") : "",
      metrics.unknownCurb ? t("walk.unknownCurb") : ""
    ].filter(Boolean);
    if (surfaceDetails.length) unknownDetails.push(surfaceDetails.join(state.language === "en" ? ", " : "、"));
    if (metrics.unknownSlopeDetails) unknownDetails.push(t("walk.unknownSlope"));
    if (metrics.unknownCrossingAssist) unknownDetails.push(t("walk.unknownCrossingAssist"));
    const unknownNote = unknownDetails.length ? t("walk.unknownNote", { details: unknownDetails.join(state.language === "en" ? ", " : "；") }) : "";
    return `<div class="walk-segment-detail-header">
      <strong>${escapeHtml(walkSegmentOrdinal(walkIndex))}</strong>
      <span>${escapeHtml(t("walk.approxDuration", { distance: formatDistance(segment.distance || 0), duration: formatDuration(segment.minutes || 0) }))}</span>
    </div>
    <p>${escapeHtml(t("walk.fromTo", { from: fromName, to: toName }))}</p>
    <div class="walk-segment-features">${features.map((feature) => `<span>${escapeHtml(feature)}</span>`).join("")}</div>
    <p class="walk-segment-note">${escapeHtml(routeNote)}</p>
    <p class="walk-segment-note">${escapeHtml(confidenceNote)}</p>
    ${unknownNote ? `<p class="walk-segment-note">${escapeHtml(unknownNote)}</p>` : ""}`;
  }

  function focusRouteSegment(index, options = {}) {
    const segment = state.route?.segments?.[index];
    if (!segment) return;
    if (state.activeSegmentIndex === index) {
      fitRoute({ revealMap: true, preserveResultsState: isMobileResultsLayout() });
      setStatus(t("status.routeShown", { route: localizedDataText(state.route.title) || t("status.selectedRoute") }));
      if (options.restoreFocus) {
        requestAnimationFrame(() => {
          document.querySelector('[data-journey-segment-index="' + index + '"]')?.focus({ preventScroll: true });
        });
      }
      return;
    }
    if (isMobileResultsLayout()) mobileResultsScrollExpansionSuppressedUntil = Date.now() + 700;
    state.activeSegmentIndex = index;
    updateSegmentHighlight(index);
    renderWalkSegmentControls(state.route);
    renderJourneyFlow(state.route);
    if (options.restoreFocus) {
      requestAnimationFrame(() => {
        document.querySelector('[data-journey-segment-index="' + index + '"]')?.focus({ preventScroll: true });
      });
    }
    if (segment.mode === "walk") {
      scrollWalkDetailIntoView();
    }
    focusSegmentGeometry(segment);
    const modeLabel = segment.mode === "walk" ? t("status.walkSegment") : localizedDataText(segment.label) || t("status.journeySegment");
    setStatus(t("status.segment", {
      mode: modeLabel,
      from: segment.fromName ? localizedNameText(segment.fromName) : t("place.start"),
      to: segment.toName ? localizedNameText(segment.toName) : t("status.nextStop")
    }));
  }

  function scrollWalkDetailIntoView() {
    const detail = document.getElementById("walk-segment-detail");
    const content = detail?.closest(".panel-content");
    if (!detail || !content) return;
    const detailRect = detail.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const stickyHeight = document.getElementById("route-options")?.getBoundingClientRect().height || 0;
    const target = Math.max(0, content.scrollTop + detailRect.top - contentRect.top - stickyHeight - 8);
    content.scrollTo({ top: target, behavior: "smooth" });
  }

  function updateSegmentHighlight(activeIndex) {
    routeSegmentLayers.forEach((item) => {
      const active = item.index === activeIndex;
      item.layer.setStyle({ weight: active ? item.weight + 3 : item.weight, opacity: active ? 1 : 0.28 });
      item.casing?.setStyle({ weight: active ? item.weight + 7 : item.weight + 4, opacity: active ? 1 : 0.2 });
      if (active) {
        item.casing?.bringToFront();
        item.layer.bringToFront();
      }
    });
  }

  function scheduleActiveSegmentRefit(delay = 380) {
    const token = ++mobileSegmentRefitToken;
    if (!isMobileResultsLayout() || !Number.isInteger(state.activeSegmentIndex)) return;
    setTimeout(() => {
      if (token !== mobileSegmentRefitToken || !isMobileResultsLayout()) return;
      const segment = state.route?.segments?.[state.activeSegmentIndex];
      const geometry = (segment?.geometry || []).filter((point) => Array.isArray(point) && point.length >= 2);
      if (!segment || geometry.length < 2 || ["large", "expanded"].includes(currentMobileResultsState())) return;
      map?.invalidateSize();
      fitGeometryToOpenMap(geometry, segment.mode === "walk" ? 18 : 16);
    }, delay);
  }

  function focusSegmentGeometry(segment) {
    const geometry = (segment.geometry || []).filter((point) => Array.isArray(point) && point.length >= 2);
    if (geometry.length < 2) return;
    if (isMobileResultsLayout()) {
      if (["large", "expanded"].includes(currentMobileResultsState())) return;
      map?.invalidateSize();
      fitGeometryToOpenMap(geometry, segment.mode === "walk" ? 18 : 16);
      return;
    }
    fitGeometryToOpenMap(geometry, segment.mode === "walk" ? 18 : 16);
  }

  function fitGeometryToOpenMap(geometry, maxZoom) {
    const planner = document.querySelector(".planner-pane")?.getBoundingClientRect();
    const results = document.querySelector(".results-pane")?.getBoundingClientRect();
    const mobile = isMobileResultsLayout();
    const margin = mobile ? 14 : 24;
    const mapStatus = document.getElementById("map-status");
    const mapStatusRect = !mobile && mapStatus?.getClientRects().length
      ? mapStatus.getBoundingClientRect()
      : null;
    const desktopTopInset = Math.min(window.innerHeight - 220, (planner?.bottom || 0) + margin);
    const desktopBottomLimit = Math.max(margin, window.innerHeight - desktopTopInset - 160);
    const desktopBottomInset = mapStatusRect
      ? Math.min(desktopBottomLimit, window.innerHeight - mapStatusRect.top + margin)
      : margin;
    const paddingTopLeft = mobile
      ? [margin, Math.min(window.innerHeight - 180, (planner?.bottom || 0) + margin)]
      : [margin, desktopTopInset];
    const paddingBottomRight = mobile
      ? [margin, Math.min(window.innerHeight - 180, window.innerHeight - (results?.top || window.innerHeight) + margin)]
      : [Math.min(window.innerWidth - 300, window.innerWidth - (results?.left || window.innerWidth) + margin), desktopBottomInset];
    map.fitBounds(L.latLngBounds(geometry), {
      paddingTopLeft,
      paddingBottomRight,
      maxZoom,
      animate: true
    });
  }

  function focusPointInOpenMap(latlng, zoom) {
    if (!map || !latlng) return;
    const planner = document.querySelector(".planner-pane")?.getBoundingClientRect();
    const results = document.querySelector(".results-pane")?.getBoundingClientRect();
    const mobile = isMobileResultsLayout();
    const margin = mobile ? 14 : 24;
    const mapStatus = document.getElementById("map-status");
    const mapStatusRect = !mobile && mapStatus?.getClientRects().length
      ? mapStatus.getBoundingClientRect()
      : null;
    const desktopTopInset = Math.min(window.innerHeight - 220, (planner?.bottom || 0) + margin);
    const desktopBottomLimit = Math.max(margin, window.innerHeight - desktopTopInset - 160);
    const desktopBottomInset = mapStatusRect
      ? Math.min(desktopBottomLimit, window.innerHeight - mapStatusRect.top + margin)
      : margin;
    const paddingTopLeft = mobile
      ? [margin, Math.min(window.innerHeight - 180, (planner?.bottom || 0) + margin)]
      : [margin, desktopTopInset];
    const paddingBottomRight = mobile
      ? [margin, Math.min(window.innerHeight - 180, window.innerHeight - (results?.top || window.innerHeight) + margin)]
      : [Math.min(window.innerWidth - 300, window.innerWidth - (results?.left || window.innerWidth) + margin), desktopBottomInset];
    const size = map.getSize();
    const target = L.point(
      (paddingTopLeft[0] + size.x - paddingBottomRight[0]) / 2,
      (paddingTopLeft[1] + size.y - paddingBottomRight[1]) / 2
    );
    const centerPoint = map.project(latlng, zoom).add(size.divideBy(2).subtract(target));
    map.setView(map.unproject(centerPoint, zoom), zoom, { animate: true });
  }

  function renderNoRoute(result, options = {}) {
    state.resultStatus = "no-route";
    if (!options.preserveResultsState) setResultsExpanded(false);
    state.unavailableRoutes = result?.unavailableRoutes || [];
    state.departure = result?.departure || null;
    state.profileMeta = result?.profile || null;
    state.profileNotice = result?.profileNotice || "";
    state.routeOptions = [];
    document.getElementById("route-options").innerHTML = "";
    clearSegmentUi();
    renderJourneyFlow(null);
    document.getElementById("results-title").textContent = t("results.noRoute");
    document.getElementById("summary-distance").textContent = "--";
    document.getElementById("summary-time").textContent = "--";
    document.getElementById("summary-fare").textContent = "--";
    renderRiskBadge(t("results.disconnected"), "is-high");
    renderRouteDataStatus(null);
    renderProfileSummary(null, state.profileNotice);
    renderServiceNotice();
    setStatus(t("results.noRouteStatus"));
    announceRoute(t("results.noRouteAnnouncement"));
  }

  function markerColor(type) {
    return {
      bus: "#9a5b00",
      hospital: "#b42318",
      mall: "#1d4ed8",
      poi: "#475569",
      toilet: "#2458d3",
      mtr: "#007c6c"
    }[type] || "#007c6c";
  }

  function markerRadius(type) {
    return ["mtr", "hospital", "mall"].includes(type) ? 6 : 5;
  }
  function renderServiceNotice() {
    const summary = document.getElementById("departure-summary");
    const notice = document.getElementById("service-notice");
    if (summary) summary.textContent = departureSummaryText();
    if (!notice) return;
    const items = (state.unavailableRoutes || []).slice(0, 4);
    if (!items.length) {
      notice.hidden = true;
      notice.innerHTML = "";
      syncRouteNoticeStack();
      return;
    }
    const localizedExtra = state.unavailableRoutes.length > items.length
      ? `<p>${escapeHtml(t("service.extraUnavailable", { count: state.unavailableRoutes.length - items.length }))}</p>`
      : "";
    notice.hidden = false;
    localizeRenderedServiceNotice(notice, items, localizedExtra);
    syncRouteNoticeStack();
  }

  function localizeRenderedServiceNotice(notice, items, localizedExtra) {
    notice.innerHTML = `<strong>${escapeHtml(t("service.unavailable"))}</strong><ul>${items.map((item) => `<li><span>${escapeHtml(localizedDataText(item.label))}</span>${escapeHtml(localizedDataText(item.reasonLabel) || t("service.timetablePending"))}</li>`).join("")}</ul>${localizedExtra}`;
  }

  function departureSummaryText() {
    if (state.departure?.mode === "all" || state.departureMode === "all") {
      return t("departure.allSummary");
    }
    if (state.departure?.mode === "planned" && state.departure.iso) {
      const date = new Date(state.departure.iso);
      const label = date.toLocaleString(i18n.locale(), { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
      return t("departure.plannedSummary", { date: label });
    }
    if (state.departureMode === "planned" && state.departureTime) {
      const date = new Date(state.departureTime);
      const label = date.toLocaleString(i18n.locale(), { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
      return t("departure.plannedSummary", { date: label });
    }
    return t("departure.nowSummary");
  }

  function renderResults(plan) {
    document.getElementById("results-title").textContent = localizedDataText(plan.title);
    document.getElementById("summary-distance").textContent = formatDistance(plan.walkDistance ?? plan.distance);
    document.getElementById("summary-time").textContent = formatDuration(plan.minutes);
    document.getElementById("summary-fare").textContent = localizedDataText(plan.fareLabel) || t("results.farePending");
    const partialData = (plan.segments || []).some((segment) => segment.mode === "walk" && (segment.metrics?.fallback || segment.routed === false));
    renderRiskBadge(localizedDataText(plan.risk?.label) || t("results.comparable"), plan.risk?.className || "is-neutral", partialData);
    renderRouteDataStatus(plan);
    renderProfileSummary(plan, state.profileNotice);
    renderServiceNotice();
    renderWalkSegmentControls(plan);
    renderJourneyFlow(plan);
    renderBabycareRouteSummary(plan);
  }

  function hideBabycareRouteSummary() {
    const container = document.getElementById("babycare-route-summary");
    if (!container) return;
    if (babycareRouteLayoutFrame) cancelAnimationFrame(babycareRouteLayoutFrame);
    babycareRouteLayoutFrame = 0;
    container.hidden = true;
    container.innerHTML = "";
  }

  function renderBabycareRouteSummary(plan) {
    const container = document.getElementById("babycare-route-summary");
    if (!container) return;
    if (state.profile !== "stroller" || !plan?.geometry?.length) {
      hideBabycareRouteSummary();
      return;
    }
    container.hidden = false;
    if (!state.babycareData) {
      container.innerHTML = '<div class="babycare-route-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v4l2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-3V3Z"/><path d="M9 7h6"/></svg><strong>\u6cbf\u9014\u6bcd\u5b30\u8a2d\u65bd</strong>' + babycareSummaryToggle() + '</div><p>\u6b63\u5728\u8f09\u5165\u5df2\u6536\u9304\u8a2d\u65bd\u3002\u3002\u3002</p>';
      bindBabycareSummaryToggle(container);
      ensureBabycareData().then(() => {
        if (state.route) renderBabycareRouteSummary(state.route);
      });
      return;
    }
    const walkingGeometries = (plan.segments || [])
      .filter((segment) => segment.mode === "walk" && Array.isArray(segment.geometry) && segment.geometry.length >= 2)
      .map((segment) => segment.geometry);
    const nearby = MapableBabycareService.nearSegments(state.babycareData.items, walkingGeometries, 180);
    const summary = MapableBabycareService.summarize(nearby);
    container.dataset.babycareRooms = String(summary.rooms || 0);
    container.dataset.babycareFriendly = String(summary.friendlyPremises || 0);
    const facts = [];
    if (summary.rooms) facts.push("\u5df2\u6536\u9304 " + summary.rooms + " \u9593\u80b2\u5b30\u6216\u54fa\u4e73\u8a2d\u65bd");
    if (summary.friendlyPremises) facts.push(summary.friendlyPremises + " \u500b\u6bcd\u4e73\u9935\u54fa\u53cb\u5584\u5834\u6240");
    const message = facts.length
      ? "\u898f\u5283\u7684\u8def\u7dda\u9644\u8fd1\u6709" + facts.join("\uff0c\u53e6\u6709") + "\u3002"
      : "\u898f\u5283\u7684\u8def\u7dda\u9644\u8fd1\u672a\u767c\u73fe\u4f4d\u7f6e\u53ef\u9760\u7684\u5df2\u6536\u9304\u6bcd\u5b30\u8a2d\u65bd\u3002";
    const buttons = nearby.slice(0, 3).map((facility) =>
      '<button type="button" data-babycare-facility-id="' + escapeHtml(facility.id) + '"><span>' + escapeHtml(facility.name)
      + '</span><small>' + escapeHtml(facility.sourceLabel) + " \u00b7 " + Math.max(0, Math.round(facility.routeDistance)) + " \u7c73</small></button>"
    ).join("");
    container.innerHTML = '<div class="babycare-route-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v4l2 3v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9l2-3V3Z"/><path d="M9 7h6"/></svg><strong>\u6cbf\u9014\u6bcd\u5b30\u8a2d\u65bd</strong>' + babycareSummaryToggle() + '</div><p>'
      + escapeHtml(message) + '</p><div class="babycare-route-list">' + buttons + '</div><small class="babycare-route-note">\u53ea\u986f\u793a\u898f\u5283\u8def\u7dda\u9644\u8fd1\u4e14\u4f4d\u7f6e\u53ef\u9760\u7684\u8cc7\u6599\u3002</small>';
    bindBabycareSummaryToggle(container);
    container.querySelectorAll("[data-babycare-facility-id]").forEach((button) => {
      button.addEventListener("click", () => focusBabycareFacility(button.dataset.babycareFacilityId));
    });
    scheduleBabycareRouteListLayout();
  }

  function babycareSummaryToggle() {
    const label = t(state.babycareVisible ? "facility.hideMapPoints" : "facility.showMapPoints");
    return '<button class="babycare-summary-toggle" type="button" data-babycare-summary-toggle aria-pressed="' + state.babycareVisible
      + '" aria-label="' + label + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/></svg><span>' + label + "</span></button>";
  }

  function bindBabycareSummaryToggle(container) {
    localizeBabycareRouteSummarySurface(container);
    container.querySelector("[data-babycare-summary-toggle]")?.addEventListener("click", () => toggleBabycareLayer({ restoreFocus: true }));
  }

  function localizeBabycareRouteSummarySurface(container) {
    const heading = container.querySelector(".babycare-route-heading strong");
    if (heading) heading.textContent = t("facility.routeNearbyHeading");
    const message = container.querySelector(":scope > p");
    if (message) {
      if (!state.babycareData) {
        message.textContent = t("facility.routeLoading");
      } else {
        const facts = [];
        const rooms = Number(container.dataset.babycareRooms) || 0;
        const friendly = Number(container.dataset.babycareFriendly) || 0;
        if (rooms) facts.push(t("facility.routeRooms", { count: rooms }));
        if (friendly) facts.push(t("facility.routeFriendly", { count: friendly }));
        message.textContent = facts.length
          ? t("facility.routeNearby", { facts: facts.join(state.language === "en" ? "; " : "，另有") })
          : t("facility.routeNone");
      }
    }
    container.querySelectorAll("[data-babycare-facility-id]").forEach((button) => {
      const facility = state.babycareData?.items?.find((item) => item.id === button.dataset.babycareFacilityId);
      if (!facility) return;
      const name = button.querySelector("span");
      const meta = button.querySelector("small");
      if (name) name.textContent = localizedFacilityName(facility);
      if (meta) meta.textContent = localizedDataText(facility.sourceLabel) + " · " + formatDistance(facility.routeDistance || 0);
    });
    const note = container.querySelector(".babycare-route-note");
    if (note) note.textContent = t("facility.routeReliableOnly");
  }

  function scheduleBabycareRouteListLayout() {
    if (babycareRouteLayoutFrame) cancelAnimationFrame(babycareRouteLayoutFrame);
    babycareRouteLayoutFrame = requestAnimationFrame(() => {
      babycareRouteLayoutFrame = 0;
      const list = document.querySelector("#babycare-route-summary .babycare-route-list");
      if (!list) return;
      list.classList.remove("is-stacked");
      const shouldStack = [...list.querySelectorAll("button")].some((button) => {
        const name = button.querySelector("span");
        const meta = button.querySelector("small");
        return button.scrollWidth > button.clientWidth + 1
          || (name && name.scrollWidth > name.clientWidth + 1)
          || (meta && meta.scrollWidth > meta.clientWidth + 1);
      });
      list.classList.toggle("is-stacked", shouldStack);
    });
  }

  function renderRiskBadge(label, className = "is-neutral", hidden = false) {
    const badge = document.getElementById("risk-badge");
    if (!badge) return;
    const icon = className.includes("is-high")
      ? '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5Z"/><path d="M12 7v6M12 17h.01"/>'
      : className.includes("is-medium")
        ? '<path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4M12 16h.01"/>'
        : className.includes("is-low")
          ? '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>'
          : '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>';
    badge.hidden = hidden;
    badge.className = "risk-badge " + className;
    badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icon + '</svg><span>' + escapeHtml(label) + '</span>';
  }

  function renderRouteDataStatus(plan) {
    const status = document.getElementById("route-data-status");
    if (!status) return;
    const fallbackWalks = (plan?.segments || []).filter((segment) => segment.mode === "walk" && (segment.metrics?.fallback || segment.routed === false));
    const fallbackExits = (plan?.segments || []).filter((segment) => segment.mode === "mtr" && segment.alightingExitStatus === "station-centroid-fallback");
    const messages = [];
    if (fallbackWalks.length) messages.push(`${fallbackWalks.length} 段步行未能連上完整步行路網，距離按附近道路保守估算。`);
    if (fallbackExits.length) messages.push("目的站出口資料待補充；尾段由車站位置估算。");
    messages.length = 0;
    if (fallbackWalks.length) messages.push(t("routeData.walkFallback", { count: fallbackWalks.length }));
    if (fallbackExits.length) messages.push(t("routeData.exitFallback"));
    const needsConfirmation = messages.length > 0;
    status.textContent = messages.join(" ");
    status.hidden = !needsConfirmation;
    syncRouteNoticeStack();
  }

  function syncRouteNoticeStack() {
    const stack = document.getElementById("route-notice-stack");
    const routeStatus = document.getElementById("route-data-status");
    const serviceNotice = document.getElementById("service-notice");
    if (!stack || !routeStatus || !serviceNotice) return;
    stack.hidden = routeStatus.hidden && serviceNotice.hidden;
    if (!serviceNotice.hidden) {
      const items = (state.unavailableRoutes || []).slice(0, 4);
      const extraCount = Math.max(0, state.unavailableRoutes.length - items.length);
      localizeRenderedServiceNotice(serviceNotice, items, extraCount ? `<p>${escapeHtml(t("service.extraUnavailable", { count: extraCount }))}</p>` : "");
    }
  }

  function renderProfileSummary(plan, notice = "") {
    const container = document.getElementById("profile-summary");
    if (!container) return;
    const explanation = plan?.profileExplanation || null;
    const rows = [notice || explanation?.primary, notice ? explanation?.primary : explanation?.secondary].filter(Boolean).slice(0, 2).map(localizedDataText);
    container.hidden = rows.length === 0;
    container.innerHTML = rows.map((text, index) => {
      const caution = Boolean(notice) || index === 1;
      const icon = caution
        ? '<path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4M12 16h.01"/>'
        : '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>';
      return `<p class="profile-summary-row ${caution ? "is-caution" : "is-primary"}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${escapeHtml(text)}</span></p>`;
    }).join("");
  }

  function renderJourneyFlow(plan) {
    const container = document.getElementById("journey-flow");
    if (!container) return;
    const items = plan?.timeline || [];
    if (!items.length) {
      container.innerHTML = `<div class="journey-empty">${escapeHtml(t("journey.empty"))}</div>`;
      return;
    }
    container.innerHTML = items.map((item, index) => {
      const isFinal = index === items.length - 1;
      const color = escapeHtml(item.color || "#1d9bf0");
      const modeLabel = routeModeLabel(item.mode);
      const badgeLabel = item.routeNo ? localizedDataText(item.routeNo) : modeLabel;
      const routeBadge = item.mode === "walk"
        ? ""
        : `<span class="journey-route-badge is-${routeModeClass(item.mode)}" style="--route-color:${color}">${routeModeIcon(item.mode)}<span>${escapeHtml(badgeLabel)}</span></span>`;
      const provider = item.providerLabel ? `<span>${escapeHtml(localizedDataText(item.providerLabel))}</span>` : "";
      const titleLabel = localizedJourneyTitle(item);
      const exitInstruction = journeyMtrExitMarkup(item);
      const terminal = item.toName
        ? `<strong>${escapeHtml(localizedJourneyName(item.toName, item.toNameEn))}</strong>${item.mode === "mtr" ? "<span>" + escapeHtml(t("journey.alight")) + "</span>" + exitInstruction : ""}`
        : "";
      const eta = item.etaTime
        ? `<span class="journey-eta">${escapeHtml(t("journey.nextBus", { time: localizedEtaTime(item.etaTime) }))}</span>`
        : "";
      const operationStatus = !item.etaTime && item.etaStatus
        ? `<span class="journey-operation-status">${escapeHtml(state.language === "en" ? t("journey.arrivalPending") : localizedDataText(item.etaStatus))}</span>`
        : "";
      const active = state.activeSegmentIndex === index;
      const transitStops = journeyTransitStopNames(item);
      const hasTransitStops = item.mode !== "walk" && transitStops.length > 1;
      const stopsExpanded = active && hasTransitStops;
      const stopCount = Math.max(0, transitStops.length - 1);
      const stopSummary = hasTransitStops
        ? `<span class="journey-stops-summary"><span>${escapeHtml(t("journey.stops", { count: stopCount }))}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></span>`
        : "";
      const serviceMeta = eta || operationStatus || stopSummary
        ? `<span class="journey-service-meta">${eta}${operationStatus}${stopSummary}</span>`
        : "";
      const localizedMeta = localizedJourneyMeta(item);
      const localizedMetaDetail = localizedJourneyMetaDetail(item);
      const metaDetail = localizedMetaDetail
        ? `<span class="journey-meta-detail">${escapeHtml(localizedMetaDetail)}</span>`
        : "";
      const stopList = stopsExpanded ? journeyTransitStopsMarkup(transitStops) : "";
      const stepTime = formatTimelineMinute(item.startMinute || 0);
      const accessibleLabel = [
        t("journey.segmentAccessible", { count: index + 1, time: stepTime, mode: modeLabel, title: titleLabel }),
        localizedMeta,
        localizedMetaDetail,
        item.toName ? t("journey.goTo", { place: localizedJourneyName(item.toName, item.toNameEn) }) : "",
        journeyMtrExitAccessibleText(item),
        hasTransitStops ? `${t("journey.stops", { count: stopCount })}, ${t(stopsExpanded ? "journey.stopsExpanded" : "journey.stopsCollapsed")}` : ""
      ].filter(Boolean).join(", ");
      const selectionIcon = '<svg class="journey-selected-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-9"/></svg>';
      const endpointMarker = isFinal
        ? '<svg class="journey-end-marker" viewBox="0 0 24 24" aria-hidden="true">' + destinationPinPaths() + "</svg>"
        : "";
      return `<button class="journey-item is-${escapeHtml(item.mode)} ${isFinal ? "is-final" : ""} ${active ? "is-active" : ""}" type="button" data-journey-segment-index="${index}" aria-pressed="${active}"${hasTransitStops ? ` aria-expanded="${stopsExpanded}"` : ""} aria-label="${escapeHtml(accessibleLabel)}" style="--route-color:${color}">
        <div class="journey-time">${formatTimelineMinuteMarkup(stepTime)}</div>
        <div class="journey-line"><span></span>${endpointMarker}</div>
        <div class="journey-leg">
          <div class="journey-title"><span class="journey-step-number"><span aria-hidden="true">${index + 1}</span></span>${routeBadge}<span>${escapeHtml(titleLabel)}</span>${selectionIcon}</div>
          <div class="journey-meta">${provider}<span>${escapeHtml(localizedMeta)}</span>${metaDetail}${serviceMeta}</div>
          ${terminal ? `<div class="journey-stop">${terminal}</div>` : ""}
          ${stopList}
        </div>
      </button>`;
    }).join("");
    container.querySelectorAll("[data-journey-segment-index]").forEach((button) => {
      button.addEventListener("click", () => focusRouteSegment(Number(button.dataset.journeySegmentIndex), { restoreFocus: true }));
    });
  }

  function localizedJourneyName(name, nameEn = "") {
    return state.language === "en" && nameEn ? nameEn : localizedNameText(name);
  }

  function localizedJourneyMeta(item) {
    if (item.mode === "walk") {
      return t("journey.walkMeta", {
        distance: formatDistance(item.distance || 0),
        duration: formatDuration(item.minutes || 0)
      });
    }
    const parts = [];
    if (Number.isFinite(item.waitMinutes)) parts.push(t("journey.waitApprox", { duration: formatDuration(item.waitMinutes) }));
    else parts.push(t("journey.arrivalPending"));
    if (Number.isFinite(item.rideMinutes)) parts.push(t("journey.rideApprox", { duration: formatDuration(item.rideMinutes) }));
    if (item.stopCount) parts.push(`(${t("journey.stops", { count: item.stopCount })})`);
    return parts.join(", ");
  }

  function localizedJourneyMetaDetail(item) {
    const metrics = item.metrics;
    if (!metrics) return localizedDataText(item.metaDetail || "");
    const parts = [];
    if (metrics.connectedRamps || metrics.ramps) parts.push(t("walk.connectedRamps", { count: metrics.connectedRamps || metrics.ramps }));
    if (metrics.connectedLifts || metrics.lifts) parts.push(t("walk.connectedLifts", { count: metrics.connectedLifts || metrics.lifts }));
    if (metrics.nearbyRamps) parts.push(t("walk.nearbyRamps", { count: metrics.nearbyRamps }));
    if (metrics.nearbyLifts) parts.push(t("walk.nearbyLifts", { count: metrics.nearbyLifts }));
    if (metrics.footbridges) parts.push(t("walk.footbridges", { count: metrics.footbridges }));
    if (metrics.stairs) parts.push(t("walk.stairs", { count: metrics.stairs }));
    if (metrics.slopes) parts.push(t("walk.slopes"));
    return parts.join(", ");
  }

  function localizedEtaTime(value) {
    const source = String(value || "").trim();
    if (state.language !== "en") return source;
    const clock = source.match(/^(\u4e0a\u5348|\u4e0b\u5348)\s*(\d{1,2}):(\d{2})$/u);
    if (clock) {
      let hour = Number(clock[2]);
      if (clock[1] === "\u4e0b\u5348" && hour < 12) hour += 12;
      if (clock[1] === "\u4e0a\u5348" && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${clock[3]}`;
    }
    const minutes = source.match(/(\d+)\s*\u5206\u9418/u);
    return minutes ? `${minutes[1]} m` : localizedDataText(source);
  }

  function localizedJourneyTitle(item) {
    if (item.mode === "walk") {
      const destination = localizedJourneyName(item.toName, item.toNameEn || item.destinationEn);
      return destination ? t("journey.walkTo", { destination }) : t("mode.walk");
    }
    const destination = item.destinationEn || item.destination || "";
    return destination
      ? t("journey.to", { destination: localizedJourneyName(item.destination, item.destinationEn) })
      : localizedDataText(item.label) || t("mode.route");
  }

  function journeyTransitStopNames(item) {
    return (Array.isArray(item?.stops) ? item.stops : [])
      .map((name, index) => item?.stopsEn?.[index] || localizedNameText(name))
     .filter(Boolean)
     .filter((name, index, names) => index === 0 || name !== names[index - 1]);
  }

  function journeyTransitStopsMarkup(stops) {
    const lastIndex = stops.length - 1;
    const items = stops.map((name, index) => {
      const role = index === 0 ? t("journey.board") : index === lastIndex ? t("journey.alight") : "";
      const roleMarkup = role ? `<small>${role}</small>` : "";
      return `<li class="${index === 0 ? "is-boarding" : ""} ${index === lastIndex ? "is-alighting" : ""}">
        <span class="journey-stop-marker" aria-hidden="true"></span>
        <span class="journey-stop-name">${escapeHtml(name)}</span>
        ${roleMarkup}
      </li>`;
    }).join("");
    return `<div class="journey-transit-stops">
      <div class="journey-transit-stops-heading"><strong>${escapeHtml(t("journey.stopsHeading"))}</strong><span>${escapeHtml(t("journey.stopCount", { count: stops.length }))}</span></div>
      <ol>${items}</ol>
    </div>`;
  }

  function journeyTitleLabel(item) {
    const destination = String(item?.destination || "").replace(/^往\s*/u, "").trim();
    if (item?.mode !== "walk" && destination) return t("journey.to", { destination: localizedNameText(destination) });
    return localizedDataText(item?.label) || t("mode.route");
  }

  function journeyMtrExitMarkup(item) {
    if (item?.mode !== "mtr" || !item.alightingStationCode) return "";
    if (!item.alightingExit) return "";
    const exit = item.alightingExit;
    return '<span class="journey-mtr-exit"><img class="journey-exit-icon" src="assets/MTR_Exit_Sign.svg" alt="' + escapeHtml(t("journey.exitAlt")) + '"><span class="journey-exit-instruction">'
      + t("journey.exitInstruction", { exit: '<strong class="journey-exit-code">' + escapeHtml(exit.displayLabel) + "</strong>" }) + "</span></span>";
  }

  function journeyMtrExitAccessibleText(item) {
    if (item?.mode !== "mtr" || !item.alightingStationCode) return "";
    if (!item.alightingExit) return t("journey.exitDataFallback");
    const grouped = Array.isArray(item.alightingExit.labels) && item.alightingExit.labels.length > 1;
    return t(grouped ? "journey.exitGrouped" : "journey.exitSingle", { exit: item.alightingExit.displayLabel })
      + ", " + mtrExitAccessibilityText(item.alightingExit);
  }

  function formatTimelineMinute(minutes) {
    if (state.departure?.mode === "planned" && state.departure.iso) {
      const time = new Date(new Date(state.departure.iso).getTime() + Math.max(0, minutes) * 60000);
      return time.toLocaleTimeString(i18n.locale(), { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    if (state.departure?.mode === "all" || state.departureMode === "all") {
      return minutes ? formatElapsedTimelineMinute(minutes) : t("journey.depart");
    }
    if (!minutes) return t("journey.now");
    return formatElapsedTimelineMinute(minutes);
  }

  function formatElapsedTimelineMinute(minutes) {
    const totalMinutes = Math.max(0, Math.round(Number(minutes) || 0));
    if (totalMinutes < 60) return `+${t("common.minutes", { count: totalMinutes })}`;
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes ? `+${t("common.hours", { hours })} ${t("common.minutes", { count: remainingMinutes })}` : `+${t("common.hours", { hours })}`;
  }

 function formatTimelineMinuteMarkup(label) {
    if (state.language === "en") {
      const englishMatch = String(label).match(/^(\+\d+\s+h)\s+(\d+\s+m)$/i);
      if (!englishMatch) return `<span>${escapeHtml(label)}</span>`;
      return `<span>${escapeHtml(englishMatch[1])}</span><span class="journey-time-minute">${escapeHtml(englishMatch[2])}</span>`;
    }
    const match = String(label).match(/^(\+\d+時)\s+(\d+分)$/u);
    if (!match) return `<span>${escapeHtml(label)}</span>`;
    return `<span>${escapeHtml(match[1])}</span><span class="journey-time-minute">${escapeHtml(match[2])}</span>`;
  }

  function renderList(id, items) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function fitRoute(options = {}) {
    if (!state.route || !state.route.geometry.length) return;
    state.activeSegmentIndex = null;
    routeSegmentLayers.forEach((item) => {
      item.casing?.setStyle({ weight: item.weight + 4, opacity: 0.9 });
      item.layer.setStyle({ weight: item.weight, opacity: 0.96 });
    });
    renderWalkSegmentControls(state.route);
    renderJourneyFlow(state.route);
    if (isMobileResultsLayout()) {
      const mobileResultsState = currentMobileResultsState();
      if (options.preserveResultsState && ["large", "expanded"].includes(mobileResultsState)) return;
      if (mobileResultsState === "expanded" && options.revealMap) {
        setMobileResultsState("medium");
        setTimeout(() => fitGeometryToOpenMap(state.route.geometry, 16), 260);
        return;
      }
    }
    fitGeometryToOpenMap(state.route.geometry, 16);
  }

  function markerIcon(text, kind) {
    const isEnd = kind === "end";
    if (!isEnd) {
      return L.divIcon({
        html: '<svg class="route-origin-icon route-map-origin-icon" viewBox="0 0 24 24" aria-hidden="true">' + originDotPaths() + "</svg>",
        className: "",
        iconSize: [31, 31],
        iconAnchor: [16, 16]
      });
    }
    return L.divIcon({
      html: '<span class="route-marker is-end" aria-hidden="true"><svg viewBox="0 0 24 24">' + destinationPinPaths() + "</svg></span>",
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
  }

  function endpointMarkerLabel(kind) {
    if (state.language === "en") return kind === "start" ? "S" : "D";
    return kind === "start" ? "起" : state.language === "zh-Hans" ? "终" : "終";
  }

  function mtrExitMarkerIcon(exit) {
    const label = escapeHtml(exit?.displayLabel || t("journey.exitAlt"));
    return L.divIcon({
      html: '<span class="mtr-exit-map-marker" aria-hidden="true"><img class="mtr-exit-map-icon" src="assets/MTR_Exit_Sign.svg" alt=""><strong>' + label + "</strong></span>",
      className: "mtr-exit-marker-wrapper",
      iconSize: [88, 38],
      iconAnchor: [44, 19]
    });
  }

  function mtrExitFullName(exit) {
    const station = state.language === "en"
      ? exit?.stationNameEn || exit?.stationNameZh
      : localizedDataText(exit?.stationNameZh || exit?.stationNameEn);
    const suffix = t(exit?.labels?.length > 1 ? "mtrExit.groupSuffix" : "mtrExit.suffix");
    return (station || t("mtrExit.station")) + (state.language === "en" ? " " : "站 ") + (exit?.displayLabel || "") + " " + suffix;
  }

  function mtrExitAccessibilityText(exit) {
    const access = exit?.accessibility || {};
    const connected = [
      access.lift === "connected" ? t("type.lift") : "",
      access.ramp === "connected" ? t("type.ramp") : ""
    ].filter(Boolean);
    if (connected.length) return t("mtrExit.connected", { features: connected.join(state.language === "en" ? " and " : "及") });
    const nearby = [
      access.lift === "nearby" ? t("type.lift") : "",
      access.ramp === "nearby" ? t("type.ramp") : ""
    ].filter(Boolean);
    if (nearby.length) return t("mtrExit.nearby", { features: nearby.join(state.language === "en" ? " and " : "及") });
    return t("mtrExit.unknown");
  }

  function originDotPaths() {
    return '<circle cx="12" cy="12" r="6"/>';
  }

  function destinationPinPaths() {
    return '<path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/>';
  }

  function mapPickTargetPaths() {
    return '<circle cx="12" cy="12" r="6.5"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/>';
  }
  function riskFor(distance, hasSlope, forcedTransit, profile) {
    if (forcedTransit) return { label: "不宜步行", className: "is-high" };
    if (distance > profile.maxEasyWalk * 1.5) return { label: "偏長", className: "is-medium" };
    if (hasSlope) return { label: "可行", className: "is-medium" };
    return { label: "較低風險", className: "is-low" };
  }

  function isFestivalWalkRoute(start, end) {
    return [start.id, end.id].includes("fw-toilet") && [start.id, end.id].includes("mtr-kot");
  }

  function isAdmiraltyTuenMun(start, end) {
    const ids = [start.id, end.id];
    return ids.includes("mtr-adm") && ids.includes("mtr-tum");
  }

  function directGeometry(start, end) {
    const midLat = (start.lat + end.lat) / 2 + 0.002;
    const midLng = (start.lng + end.lng) / 2;
    return [[start.lat, start.lng], [midLat, midLng], [end.lat, end.lng]];
  }

  function routeDistance(start, end) {
    const geometry = knownRoutes[`${start.id}:${end.id}`];
    if (!geometry) return haversine(start, end);
    return geometry.slice(1).reduce((sum, point, index) => {
      const prev = geometry[index];
      return sum + haversine({ lat: prev[0], lng: prev[1] }, { lat: point[0], lng: point[1] });
    }, 0);
  }

  function haversine(a, b) {
    const r = 6371000;
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function toRad(value) {
    return value * Math.PI / 180;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatDistance(meters) {
    if (meters >= 1000) return t("common.kilometers", { count: (meters / 1000).toFixed(1) });
    return t("common.meters", { count: Math.max(0, Math.round(meters)) });
  }

  function formatDuration(minutes) {
    const totalMinutes = Math.max(0, Math.round(Number(minutes) || 0));
    if (totalMinutes < 60) return t("common.minutes", { count: totalMinutes });
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return t("common.hoursMinutes", { hours, minutes: remainingMinutes });
  }

  function typeLabel(type) {
    return t(`type.${type || "poi"}`);
  }

  function setStatus(message) {
    document.getElementById("map-status").textContent = message;
  }

  function setOptionalText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function withTimeout(promise, timeoutMs, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }
})();




