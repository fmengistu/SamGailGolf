(() => {
  "use strict";

  if (!window.L) return;

  const originalMap = L.map;
  L.map = function (...args) {
    const instance = originalMap.apply(L, args);
    window.__fairwayMap = instance;
    return instance;
  };

  const originalPolyline = L.polyline;
  L.polyline = function (latlngs, options = {}) {
    const isShotLine = options.dashArray === "7 8";
    const upgradedOptions = isShotLine
      ? { ...options, color: "#ffe36e", weight: 5, opacity: 0.96, dashArray: "9 8" }
      : options;
    return originalPolyline.call(L, latlngs, upgradedOptions);
  };
})();
