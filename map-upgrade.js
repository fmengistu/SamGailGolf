(() => {
  "use strict";

  const LAKEVIEW = [43.58805, -79.55620];

  document.addEventListener("DOMContentLoaded", () => {
    const map = window.__fairwayMap;
    const button = document.getElementById("mapStyleButton");
    const courseSelect = document.getElementById("courseSelect");
    const loading = document.getElementById("mapLoading");

    if (!map || !window.L || !button) return;

    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      }
    );

    const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap contributors"
    });

    let active = "satellite";
    let satelliteLoaded = false;
    let satelliteFailures = 0;

    const hideLoading = () => {
      if (loading) loading.hidden = true;
    };

    satellite.on("tileload", () => {
      satelliteLoaded = true;
      hideLoading();
    });

    satellite.on("tileerror", () => {
      satelliteFailures += 1;
      if (!satelliteLoaded && satelliteFailures >= 3 && active === "satellite") {
        map.removeLayer(satellite);
        street.addTo(map);
        active = "street";
        button.textContent = "Satellite";
        hideLoading();
      }
    });

    street.on("tileload", hideLoading);
    satellite.addTo(map);
    map.setView(LAKEVIEW, 17);

    if (!map.__fairwayScaleAdded) {
      L.control.scale({ position: "bottomleft", imperial: true, metric: false, maxWidth: 110 }).addTo(map);
      map.__fairwayScaleAdded = true;
    }

    button.textContent = "Street";
    button.addEventListener("click", () => {
      if (active === "satellite") {
        map.removeLayer(satellite);
        street.addTo(map);
        active = "street";
        button.textContent = "Satellite";
      } else {
        map.removeLayer(street);
        satellite.addTo(map);
        active = "satellite";
        button.textContent = "Street";
      }
    });

    courseSelect?.addEventListener("change", () => {
      if (courseSelect.value === "lakeview") map.setView(LAKEVIEW, 17);
    });
  });
})();
