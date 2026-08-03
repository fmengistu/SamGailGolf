(() => {
  "use strict";

  const loading = () => document.getElementById("preview3dLoading");

  function setLoading(title, detail, error = false) {
    const element = loading();
    if (!element) return;
    element.hidden = false;
    element.classList.toggle("error", error);
    element.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
  }

  function loadScript(src, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        script.remove();
        reject(new Error(`Timed out loading ${src}`));
      }, timeoutMs);

      script.src = src;
      script.async = false;
      script.onload = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(new Error(`Failed to load ${src}`));
      };
      document.body.appendChild(script);
    });
  }

  function addStylesheet(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  async function start() {
    setLoading("Starting 3D preview…", "Loading the satellite rendering engine.");

    try {
      addStylesheet("https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css");
      await loadScript("https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js", 9000);

      if (!window.maplibregl || !window.maplibregl.supported()) {
        throw new Error("WebGL rendering is unavailable in this browser.");
      }

      await loadScript("./preview-3d.js?v=12", 6000);
      window.__fairwayPreviewEngine = "maplibre";
    } catch (error) {
      console.warn("MapLibre preview unavailable; loading Leaflet fallback.", error);
      setLoading("Loading compatible preview…", "The advanced 3D engine was blocked, so the app is opening the reliable satellite fallback.");
      try {
        await loadScript("./preview-leaflet.js?v=12", 6000);
        window.__fairwayPreviewEngine = "leaflet";
      } catch (fallbackError) {
        setLoading("Preview could not start", `${fallbackError?.message || "Unknown loading error"}. Reload the page and confirm JavaScript is enabled.`, true);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
