(() => {
  "use strict";

  const MODE_KEY = "fairway-caddie-round-mode-v3";
  const YARDS_PER_METRE = 1.0936133;
  const CLUBS = [
    ["Driver",240,260],["3 Wood",220,240],["5 Wood",200,220],["4 Iron",180,200],
    ["5 Iron",175,185],["6 Iron",170,180],["7 Iron",160,175],["8 Iron",150,165],
    ["9 Iron",135,150],["Pitching Wedge",125,135],["Gap Wedge",105,120],["56° Wedge",10,100]
  ];
  const HOLES = {
    1:{p:4,w:338,b:356,r:286,t:[43.58545,-79.55725],g:[43.58602,-79.56106]},
    2:{p:4,w:384,b:419,r:278,t:[43.58620,-79.56116],g:[43.58766,-79.55680]},
    3:{p:3,w:124,b:135,r:113,t:[43.58791,-79.55655],g:[43.58866,-79.55570]},
    4:{p:4,w:350,b:378,r:291,t:[43.58894,-79.55554],g:[43.59030,-79.55942]},
    5:{p:5,w:547,b:594,r:420,t:[43.59041,-79.55969],g:[43.59140,-79.56590]},
    6:{p:4,w:433,b:441,r:390,t:[43.59162,-79.56602],g:[43.59278,-79.56115]},
    7:{p:5,w:460,b:469,r:417,t:[43.59302,-79.56097],g:[43.59418,-79.56666]},
    8:{p:4,w:315,b:344,r:220,t:[43.59391,-79.56715],g:[43.59122,-79.56820]},
    9:{p:3,w:199,b:214,r:137,t:[43.59091,-79.56825],g:[43.58934,-79.56753]},
    10:{p:3,w:134,b:150,r:105,t:[43.58795,-79.56709],g:[43.58698,-79.56620]},
    11:{p:4,w:371,b:414,r:291,t:[43.58648,-79.56579],g:[43.58524,-79.56139]},
    12:{p:4,w:294,b:327,r:258,t:[43.58493,-79.55880],g:[43.58733,-79.55857]},
    13:{p:4,w:387,b:414,r:300,t:[43.58493,-79.55360],g:[43.58710,-79.55020]},
    14:{p:4,w:334,b:338,r:239,t:[43.58735,-79.55012],g:[43.58927,-79.55272]},
    15:{p:4,w:302,b:317,r:289,t:[43.58947,-79.55253],g:[43.59132,-79.55006]},
    16:{p:5,w:467,b:477,r:423,t:[43.59152,-79.55002],g:[43.59420,-79.55358]},
    17:{p:3,w:91,b:95,r:86,t:[43.59209,-79.55507],g:[43.59142,-79.55613]},
    18:{p:4,w:333,b:360,r:303,t:[43.58837,-79.56254],g:[43.58637,-79.55888]}
  };

  let map, teeMarker, greenMarker, targetMarker, targetLine, remainLine;
  let tee, green, target, hole, number = 1;
  const el = {};

  function init() {
    if (!window.L) return fail("Leaflet is unavailable. Reload the page.");
    ["liveModeButton","previewModeButton","liveRoundRegion","previewRoundRegion","holeNumber","holePar","teeName",
      "preview3dLoading","previewTargetDistance","previewRemaining","previewClub","previewClubReason","previewTargetTitle",
      "previewTargetDetail","previewHoleYardage","previewMappingStatus","teeViewButton","topViewButton","clearTargetButton"]
      .forEach(id => el[id] = document.getElementById(id));

    el.liveModeButton.addEventListener("click", () => setMode(false));
    el.previewModeButton.addEventListener("click", () => setMode(true));
    el.holeNumber.addEventListener("change", loadHole);
    el.teeName.addEventListener("change", loadHole);
    el.teeViewButton.addEventListener("click", perspectiveView);
    el.topViewButton.addEventListener("click", topView);
    el.clearTargetButton.addEventListener("click", clearTarget);

    map = L.map("preview3dMap", { zoomControl:true, attributionControl:true, preferCanvas:true });
    const tiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom:19,
      attribution:"Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community"
    });
    tiles.on("load", () => {
      el.preview3dLoading.hidden = true;
      el.previewMappingStatus.textContent = "Compatible satellite perspective";
    });
    tiles.on("tileerror", () => fail("Satellite tiles are being blocked by the browser or network."));
    tiles.addTo(map);
    L.control.scale({ imperial:true, metric:false }).addTo(map);
    map.on("click", e => { target = [e.latlng.lat,e.latlng.lng]; saveTarget(); redraw(); });

    loadHole();
    const desktop = window.matchMedia?.("(pointer: fine)")?.matches;
    setMode(localStorage.getItem(MODE_KEY) !== "live" && desktop !== false);
    window.setTimeout(() => map.invalidateSize(), 200);
  }

  function setMode(preview) {
    localStorage.setItem(MODE_KEY, preview ? "preview" : "live");
    el.liveModeButton.classList.toggle("active", !preview);
    el.previewModeButton.classList.toggle("active", preview);
    el.liveRoundRegion.hidden = preview;
    el.previewRoundRegion.hidden = !preview;
    if (preview) window.setTimeout(() => { map.invalidateSize(); perspectiveView(); }, 100);
  }

  function loadHole() {
    number = Number(el.holeNumber.value || 1);
    hole = HOLES[number] || HOLES[1];
    el.holePar.value = String(hole.p);
    green = [...hole.g];
    const yardage = teeYardage(hole, el.teeName.value);
    tee = adjustedTee(hole.t, hole.g, hole.w, yardage);
    target = readTarget() || defaultTarget(tee, green, hole.p);
    el.previewHoleYardage.textContent = `${yardage} yd`;
    el.previewMappingStatus.textContent = `Hole ${number} · ${el.teeName.value} tee · fallback`;
    redraw();
    if (map) topView();
  }

  function redraw() {
    if (!map || !tee || !green) return;
    [teeMarker,greenMarker,targetMarker,targetLine,remainLine].forEach(layer => layer && map.removeLayer(layer));
    teeMarker = L.marker(tee,{draggable:true,icon:icon("preview-tee-marker","T")}).addTo(map);
    teeMarker.on("drag",e=>{tee=[e.target.getLatLng().lat,e.target.getLatLng().lng]; updateLines(); updateMetrics();});
    greenMarker = L.marker(green,{icon:icon("preview-green-marker","G")}).addTo(map);
    if (target) {
      targetMarker = L.marker(target,{draggable:true,icon:icon("preview-target-marker","◎")}).addTo(map);
      targetMarker.on("drag",e=>{target=[e.target.getLatLng().lat,e.target.getLatLng().lng]; updateLines(); updateMetrics();});
      targetMarker.on("dragend",saveTarget);
    }
    updateLines(); updateMetrics();
  }

  function updateLines() {
    [targetLine,remainLine].forEach(layer=>layer&&map.removeLayer(layer));
    if (target) {
      targetLine=L.polyline([tee,target],{color:"#ffd84a",weight:5,dashArray:"8 7"}).addTo(map);
      remainLine=L.polyline([target,green],{color:"white",weight:4,dashArray:"6 7"}).addTo(map);
    } else remainLine=L.polyline([tee,green],{color:"white",weight:4,dashArray:"6 7"}).addTo(map);
  }

  function updateMetrics() {
    const total=Math.round(yards(tee,green));
    if (!target) {
      el.previewTargetDistance.textContent="—"; el.previewRemaining.textContent=String(total);
      el.previewClub.textContent="Tap a target"; el.previewClubReason.textContent="Choose a landing spot";
      el.previewTargetTitle.textContent="Tap the fairway or green";
      el.previewTargetDetail.textContent="The simulated ball starts at the selected tee."; return;
    }
    const to=Math.round(yards(tee,target)), remain=Math.round(yards(target,green)), club=recommend(to);
    el.previewTargetDistance.textContent=String(to); el.previewRemaining.textContent=String(remain);
    el.previewClub.textContent=club[0]; el.previewClubReason.textContent=`${club[1]}–${club[2]} yd expected`;
    el.previewTargetTitle.textContent=`${club[0]} to a ${to}-yard target`;
    el.previewTargetDetail.textContent=`${remain} yards remain to the green. Drag the yellow marker to compare another target.`;
  }

  function perspectiveView() {
    const mapEl=document.getElementById("preview3dMap");
    mapEl.classList.add("fallback-perspective");
    map.fitBounds(L.latLngBounds([tee,green]),{padding:[75,75],animate:true});
    el.previewMappingStatus.textContent=`Hole ${number} · tilted satellite perspective`;
  }
  function topView() {
    const mapEl=document.getElementById("preview3dMap");
    mapEl.classList.remove("fallback-perspective");
    const points=target?[tee,target,green]:[tee,green];
    map.fitBounds(L.latLngBounds(points),{padding:[55,55],animate:true});
    el.previewMappingStatus.textContent=`Hole ${number} · overhead satellite`;
  }
  function clearTarget(){target=null;localStorage.removeItem(key());redraw();}
  function saveTarget(){if(target)localStorage.setItem(key(),JSON.stringify(target));}
  function readTarget(){try{return JSON.parse(localStorage.getItem(key()))}catch{return null}}
  function key(){return `fairway-preview-fallback:${number}:${String(el.teeName.value).toLowerCase()}`;}
  function teeYardage(h,n){n=String(n).toLowerCase();return n==="blue"||n==="black"?h.b:n==="red"||n==="gold"?h.r:h.w;}
  function adjustedTee(t,g,base,selected){if(base===selected)return [...t];const scale=selected/Math.max(base,1);return [g[0]+(t[0]-g[0])*scale,g[1]+(t[1]-g[1])*scale];}
  function defaultTarget(t,g,p){const full=yards(t,g),desired=p===3?full:Math.min(235,full*.68);return interpolate(t,g,Math.min(.92,desired/full));}
  function recommend(distance){return CLUBS.reduce((best,c)=>Math.abs((c[1]+c[2])/2-distance)<Math.abs((best[1]+best[2])/2-distance)?c:best,CLUBS[0]);}
  function interpolate(a,b,f){return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}
  function yards(a,b){return metres(a,b)*YARDS_PER_METRE;}
  function metres(a,b){const R=6371000,p1=rad(a[0]),p2=rad(b[0]),dp=rad(b[0]-a[0]),dl=rad(b[1]-a[1]);const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
  function rad(v){return v*Math.PI/180;}
  function icon(cls,label){return L.divIcon({className:"",html:`<div class="${cls}">${label}</div>`,iconSize:[32,32],iconAnchor:[16,16]});}
  function fail(message){const box=document.getElementById("preview3dLoading");if(box){box.hidden=false;box.classList.add("error");box.innerHTML=`<strong>Preview unavailable</strong><span>${message}</span>`;}}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();
