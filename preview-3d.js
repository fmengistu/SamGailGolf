(() => {
  "use strict";

  const MODE_KEY = "fairway-caddie-round-mode-v2";
  const TARGET_KEY = "fairway-caddie-preview-target-v2";
  const YARDS_PER_METRE = 1.0936133;

  const CLUBS = [
    { name: "Driver", min: 240, max: 260 },
    { name: "3 Wood", min: 220, max: 240 },
    { name: "5 Wood", min: 200, max: 220 },
    { name: "4 Iron", min: 180, max: 200 },
    { name: "5 Iron", min: 175, max: 185 },
    { name: "6 Iron", min: 170, max: 180 },
    { name: "7 Iron", min: 160, max: 175 },
    { name: "8 Iron", min: 150, max: 165 },
    { name: "9 Iron", min: 135, max: 150 },
    { name: "Pitching Wedge", min: 125, max: 135 },
    { name: "Gap Wedge", min: 105, max: 120 },
    { name: "56° Wedge", min: 10, max: 100 }
  ];

  const HOLES = {
    1:  { par: 4, white: 338, blue: 356, red: 286, tee: [-79.55725, 43.58545], green: [-79.56106, 43.58602] },
    2:  { par: 4, white: 384, blue: 419, red: 278, tee: [-79.56116, 43.58620], green: [-79.55680, 43.58766] },
    3:  { par: 3, white: 124, blue: 135, red: 113, tee: [-79.55655, 43.58791], green: [-79.55570, 43.58866] },
    4:  { par: 4, white: 350, blue: 378, red: 291, tee: [-79.55554, 43.58894], green: [-79.55942, 43.59030] },
    5:  { par: 5, white: 547, blue: 594, red: 420, tee: [-79.55969, 43.59041], green: [-79.56590, 43.59140] },
    6:  { par: 4, white: 433, blue: 441, red: 390, tee: [-79.56602, 43.59162], green: [-79.56115, 43.59278] },
    7:  { par: 5, white: 460, blue: 469, red: 417, tee: [-79.56097, 43.59302], green: [-79.56666, 43.59418] },
    8:  { par: 4, white: 315, blue: 344, red: 220, tee: [-79.56715, 43.59391], green: [-79.56820, 43.59122] },
    9:  { par: 3, white: 199, blue: 214, red: 137, tee: [-79.56825, 43.59091], green: [-79.56753, 43.58934] },
    10: { par: 3, white: 134, blue: 150, red: 105, tee: [-79.56709, 43.58795], green: [-79.56620, 43.58698] },
    11: { par: 4, white: 371, blue: 414, red: 291, tee: [-79.56579, 43.58648], green: [-79.56139, 43.58524] },
    12: { par: 4, white: 294, blue: 327, red: 258, tee: [-79.55880, 43.58493], green: [-79.55857, 43.58733] },
    13: { par: 4, white: 387, blue: 414, red: 300, tee: [-79.55360, 43.58493], green: [-79.55020, 43.58710] },
    14: { par: 4, white: 334, blue: 338, red: 239, tee: [-79.55012, 43.58735], green: [-79.55272, 43.58927] },
    15: { par: 4, white: 302, blue: 317, red: 289, tee: [-79.55253, 43.58947], green: [-79.55006, 43.59132] },
    16: { par: 5, white: 467, blue: 477, red: 423, tee: [-79.55002, 43.59152], green: [-79.55358, 43.59420] },
    17: { par: 3, white: 91,  blue: 95,  red: 86,  tee: [-79.55507, 43.59209], green: [-79.55613, 43.59142] },
    18: { par: 4, white: 333, blue: 360, red: 303, tee: [-79.56254, 43.58837], green: [-79.55888, 43.58637] }
  };

  let map;
  let mapReady = false;
  let teeMarker;
  let greenMarker;
  let targetMarker;
  let currentMode = "live";
  let activeHole;
  let activeTee;
  let activeGreen;
  let selectedTarget;
  let terrainEnabled = false;

  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    [
      "liveModeButton", "previewModeButton", "liveRoundRegion", "previewRoundRegion",
      "holeNumber", "holePar", "teeName", "courseSelect", "preview3dLoading",
      "previewTargetDistance", "previewRemaining", "previewClub", "previewClubReason",
      "previewTargetTitle", "previewTargetDetail", "previewHoleYardage",
      "previewMappingStatus", "teeViewButton", "topViewButton", "clearTargetButton"
    ].forEach(id => { el[id] = document.getElementById(id); });

    el.liveModeButton.addEventListener("click", () => setMode("live"));
    el.previewModeButton.addEventListener("click", () => setMode("preview"));
    el.holeNumber.addEventListener("change", syncSelectedHole);
    el.teeName.addEventListener("change", syncSelectedHole);
    el.courseSelect.addEventListener("change", syncSelectedHole);
    el.teeViewButton.addEventListener("click", viewFromTee);
    el.topViewButton.addEventListener("click", viewFromTop);
    el.clearTargetButton.addEventListener("click", clearTarget);

    const desktopDefault = window.matchMedia?.("(pointer: fine)")?.matches;
    setMode(localStorage.getItem(MODE_KEY) || (desktopDefault ? "preview" : "live"));
  }

  function setMode(mode) {
    currentMode = mode === "preview" ? "preview" : "live";
    localStorage.setItem(MODE_KEY, currentMode);

    const preview = currentMode === "preview";
    el.liveModeButton.classList.toggle("active", !preview);
    el.previewModeButton.classList.toggle("active", preview);
    el.liveRoundRegion.hidden = preview;
    el.previewRoundRegion.hidden = !preview;

    if (preview) {
      initializePreviewMap();
      syncSelectedHole();
      setTimeout(() => map?.resize(), 100);
    }
  }

  function initializePreviewMap() {
    if (map) return;

    if (!window.maplibregl || !maplibregl.supported()) {
      showError("Your browser cannot start the 3D map. Use current Chrome, Edge, or Safari with hardware acceleration enabled.");
      return;
    }

    const style = {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
          maxzoom: 19,
          attribution: "Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community"
        }
      },
      layers: [
        { id: "satellite", type: "raster", source: "satellite" }
      ]
    };

    try {
      map = new maplibregl.Map({
        container: "preview3dMap",
        center: [-79.5591, 43.5860],
        zoom: 17.1,
        pitch: 65,
        bearing: 250,
        maxPitch: 85,
        maxZoom: 20,
        antialias: true,
        attributionControl: true,
        style
      });
    } catch (error) {
      showError(`The map could not start: ${error?.message || "unknown browser error"}`);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "imperial" }), "bottom-left");

    const safetyTimer = window.setTimeout(() => {
      if (!mapReady) showError("The browser loaded MapLibre but did not finish creating the map. Try a hard refresh and confirm hardware acceleration is enabled.");
    }, 12000);

    map.once("style.load", () => {
      window.clearTimeout(safetyTimer);
      mapReady = true;
      el.preview3dLoading.hidden = true;
      addOverlayLayers();
      syncSelectedHole();
      tryEnableTerrain();
    });

    map.on("click", event => {
      if (!mapReady || !activeTee || !activeGreen) return;
      selectedTarget = [event.lngLat.lng, event.lngLat.lat];
      saveTarget();
      drawMarkers();
      drawLines();
      updatePreviewMetrics();
    });

    map.on("error", event => {
      const message = String(event?.error?.message || "");
      if (message && /webgl|context|shader/i.test(message)) {
        showError(`3D rendering failed: ${message}`);
      }
    });
  }

  function addOverlayLayers() {
    if (!map.getSource("preview-lines")) {
      map.addSource("preview-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addLayer({
        id: "preview-line-shadow",
        type: "line",
        source: "preview-lines",
        paint: { "line-color": "#111111", "line-width": 8, "line-opacity": 0.55 }
      });
      map.addLayer({
        id: "preview-line",
        type: "line",
        source: "preview-lines",
        paint: { "line-color": ["get", "colour"], "line-width": 4, "line-dasharray": [1.5, 1.2] }
      });
    }
  }

  function tryEnableTerrain() {
    try {
      map.addSource("optional-terrain", {
        type: "raster-dem",
        tiles: ["https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 12,
        encoding: "mapbox"
      });
      map.setTerrain({ source: "optional-terrain", exaggeration: 1.8 });
      terrainEnabled = true;
      el.previewMappingStatus.textContent = "3D terrain enabled";
    } catch {
      terrainEnabled = false;
      el.previewMappingStatus.textContent = "3D perspective mode";
    }
  }

  function syncSelectedHole() {
    if (currentMode !== "preview") return;

    const number = Number(el.holeNumber.value || 1);
    const hole = HOLES[number] || HOLES[1];
    activeHole = { ...hole, number };
    el.holePar.value = String(hole.par);

    const teeName = el.teeName.value || "White";
    const yardage = getTeeYardage(hole, teeName);
    activeGreen = [...hole.green];
    activeTee = loadTeeCalibration(number, teeName) || adjustTeeForYardage(hole.tee, hole.green, hole.white, yardage);
    selectedTarget = loadSavedTarget(number, teeName) || defaultTarget(activeTee, activeGreen, hole.par);

    el.previewHoleYardage.textContent = `${yardage} yd`;
    el.previewMappingStatus.textContent = mapReady
      ? `Hole ${number} · ${teeName} tee${terrainEnabled ? " · terrain" : " · perspective"}`
      : "Loading map";

    if (!mapReady) return;
    drawMarkers();
    drawLines();
    updatePreviewMetrics();
    viewFromTee();
  }

  function drawMarkers() {
    teeMarker?.remove();
    greenMarker?.remove();
    targetMarker?.remove();

    teeMarker = new maplibregl.Marker({
      element: markerElement("preview-tee-marker", "T"),
      draggable: true,
      anchor: "center"
    }).setLngLat(activeTee).addTo(map);

    teeMarker.on("drag", () => {
      const p = teeMarker.getLngLat();
      activeTee = [p.lng, p.lat];
      drawLines();
      updatePreviewMetrics();
    });

    teeMarker.on("dragend", () => {
      saveTeeCalibration(activeHole.number, el.teeName.value, activeTee);
      el.previewMappingStatus.textContent = `Hole ${activeHole.number} · tee calibrated`;
    });

    greenMarker = new maplibregl.Marker({
      element: markerElement("preview-green-marker", "G"),
      anchor: "center"
    }).setLngLat(activeGreen).addTo(map);

    if (selectedTarget) {
      targetMarker = new maplibregl.Marker({
        element: markerElement("preview-target-marker", "◎"),
        draggable: true,
        anchor: "center"
      }).setLngLat(selectedTarget).addTo(map);

      targetMarker.on("drag", () => {
        const p = targetMarker.getLngLat();
        selectedTarget = [p.lng, p.lat];
        drawLines();
        updatePreviewMetrics();
      });
      targetMarker.on("dragend", saveTarget);
    }
  }

  function drawLines() {
    if (!mapReady) return;
    const features = selectedTarget
      ? [lineFeature(activeTee, selectedTarget, "#ffd84a"), lineFeature(selectedTarget, activeGreen, "#ffffff")]
      : [lineFeature(activeTee, activeGreen, "#ffffff")];
    map.getSource("preview-lines")?.setData({ type: "FeatureCollection", features });
  }

  function updatePreviewMetrics() {
    const holeDistance = Math.round(distanceYards(activeTee, activeGreen));

    if (!selectedTarget) {
      el.previewTargetDistance.textContent = "—";
      el.previewRemaining.textContent = String(holeDistance);
      el.previewClub.textContent = "Tap a target";
      el.previewClubReason.textContent = "Choose a landing spot";
      el.previewTargetTitle.textContent = "Tap the fairway or green";
      el.previewTargetDetail.textContent = "The simulated ball starts at the selected tee.";
      return;
    }

    const toTarget = Math.round(distanceYards(activeTee, selectedTarget));
    const remaining = Math.round(distanceYards(selectedTarget, activeGreen));
    const club = recommendClub(toTarget);

    el.previewTargetDistance.textContent = String(toTarget);
    el.previewRemaining.textContent = String(remaining);
    el.previewClub.textContent = club.name;
    el.previewClubReason.textContent = `${club.min}–${club.max} yd expected`;
    el.previewTargetTitle.textContent = `${club.name} to a ${toTarget}-yard target`;
    el.previewTargetDetail.textContent = `${remaining} yards would remain to the green centre. Drag the yellow marker to compare another target.`;
  }

  function viewFromTee() {
    if (!mapReady || !activeTee || !activeGreen) return;
    const bearing = bearingDegrees(activeTee, activeGreen);
    const centre = interpolate(activeTee, activeGreen, 0.28);
    map.flyTo({
      center: centre,
      zoom: activeHole.par === 3 ? 18.0 : 17.15,
      pitch: 68,
      bearing,
      duration: 900,
      essential: true
    });
  }

  function viewFromTop() {
    if (!mapReady || !activeTee || !activeGreen) return;
    const bounds = new maplibregl.LngLatBounds(activeTee, activeTee).extend(activeGreen);
    if (selectedTarget) bounds.extend(selectedTarget);
    map.fitBounds(bounds, { padding: 70, pitch: 0, bearing: 0, duration: 800 });
  }

  function clearTarget() {
    selectedTarget = null;
    localStorage.removeItem(targetStorageKey(activeHole?.number, el.teeName.value));
    targetMarker?.remove();
    targetMarker = null;
    drawLines();
    updatePreviewMetrics();
  }

  function showError(message) {
    if (!el.preview3dLoading) return;
    el.preview3dLoading.hidden = false;
    el.preview3dLoading.classList.add("error");
    el.preview3dLoading.innerHTML = `<strong>3D preview unavailable</strong><span>${escapeHtml(message)}</span>`;
  }

  function defaultTarget(tee, green, par) {
    const total = distanceYards(tee, green);
    const desired = par === 3 ? total : Math.min(235, total * 0.68);
    return interpolate(tee, green, Math.min(0.92, desired / total));
  }

  function getTeeYardage(hole, teeName) {
    const tee = String(teeName).toLowerCase();
    if (tee === "blue" || tee === "black") return hole.blue;
    if (tee === "red" || tee === "gold") return hole.red;
    return hole.white;
  }

  function adjustTeeForYardage(whiteTee, green, whiteYards, selectedYards) {
    if (selectedYards === whiteYards) return [...whiteTee];
    const currentMetres = distanceMetres(whiteTee, green);
    const selectedMetres = selectedYards / YARDS_PER_METRE;
    const scale = selectedMetres / currentMetres;
    return [
      green[0] + (whiteTee[0] - green[0]) * scale,
      green[1] + (whiteTee[1] - green[1]) * scale
    ];
  }

  function recommendClub(yards) {
    return CLUBS.reduce((best, club) => {
      const midpoint = (club.min + club.max) / 2;
      const bestMidpoint = (best.min + best.max) / 2;
      return Math.abs(midpoint - yards) < Math.abs(bestMidpoint - yards) ? club : best;
    }, CLUBS[0]);
  }

  function markerElement(className, label) {
    const node = document.createElement("div");
    node.className = className;
    node.textContent = label;
    return node;
  }

  function lineFeature(from, to, colour) {
    return {
      type: "Feature",
      properties: { colour },
      geometry: { type: "LineString", coordinates: [from, to] }
    };
  }

  function interpolate(from, to, fraction) {
    return [
      from[0] + (to[0] - from[0]) * fraction,
      from[1] + (to[1] - from[1]) * fraction
    ];
  }

  function distanceYards(from, to) {
    return distanceMetres(from, to) * YARDS_PER_METRE;
  }

  function distanceMetres(from, to) {
    const radius = 6371000;
    const lat1 = radians(from[1]);
    const lat2 = radians(to[1]);
    const deltaLat = radians(to[1] - from[1]);
    const deltaLng = radians(to[0] - from[0]);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function bearingDegrees(from, to) {
    const lat1 = radians(from[1]);
    const lat2 = radians(to[1]);
    const deltaLng = radians(to[0] - from[0]);
    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    return (degrees(Math.atan2(y, x)) + 360) % 360;
  }

  function radians(value) { return value * Math.PI / 180; }
  function degrees(value) { return value * 180 / Math.PI; }

  function saveTarget() {
    if (!selectedTarget || !activeHole) return;
    localStorage.setItem(targetStorageKey(activeHole.number, el.teeName.value), JSON.stringify(selectedTarget));
  }

  function loadSavedTarget(hole, tee) {
    try {
      const raw = localStorage.getItem(targetStorageKey(hole, tee));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function targetStorageKey(hole, tee) {
    return `${TARGET_KEY}:${hole}:${String(tee).toLowerCase()}`;
  }

  function saveTeeCalibration(hole, tee, point) {
    localStorage.setItem(`fairway-caddie-preview-tee-v2:${hole}:${String(tee).toLowerCase()}`, JSON.stringify(point));
  }

  function loadTeeCalibration(hole, tee) {
    try {
      const raw = localStorage.getItem(`fairway-caddie-preview-tee-v2:${hole}:${String(tee).toLowerCase()}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
