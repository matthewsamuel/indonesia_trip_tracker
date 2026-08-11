/* ================================================================
   tripmap.js — GEDEELD INTERACTIEF KAARTCOMPONENT (Leaflet 1.9.4)

   Vervangt de vier losse kaart-implementaties (2× Leaflet, 2× SVG) door
   één component dat op elke pagina ingebed kan worden.

   Alle data komt uit data.js — er zit geen itinerarium in dit bestand.
   Het dagschema per reiziger wordt afgeleid uit:
     PERSON_TRIPS  →  welke TRIP-items horen bij wie
     TRIP.map      →  geordende GEO-sleutels per etappe
     TRIP.start/end→  over hoeveel dagen die etappe zich uitspreidt
     ROUTE_MODES   →  hoe elk deeltraject afgelegd wordt
     TRANSPORT_LEGS→  vluchtnummers, tijden, operator, kosten
     GEO           →  echte lat/lng

   Gebruik:
     const kaart = TripMap.create({ el: "#mijnKaart", mode: "panel" });
     kaart.setDay(12); kaart.setPerson("hinke"); kaart.highlightTrips(["t8"]);
   ================================================================ */
(function (global) {
"use strict";

if (typeof L === "undefined") {
  console.error("tripmap.js: Leaflet is niet geladen.");
  return;
}
if (typeof TRIP === "undefined" || typeof GEO === "undefined") {
  console.error("tripmap.js: data.js is niet geladen.");
  return;
}

/* ================================================================
   1. DATUM-HELPERS (UTC, zodat zomertijd de dagindex niet verschuift)
   ================================================================ */
const DAY_MS = 86400000;

function utc(ds) { return new Date(ds + "T00:00:00Z"); }
function iso(d) { return d.toISOString().slice(0, 10); }
function shiftDay(ds, n) { const d = utc(ds); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
function daysBetween(a, b) { return Math.round((utc(b) - utc(a)) / DAY_MS); }

const DAY_LIST = (function () {
  const out = [];
  for (let d = TRIP_START_DATE; d <= TRIP_END_DATE; d = shiftDay(d, 1)) out.push(d);
  return out;
})();
const NDAYS = DAY_LIST.length;

const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

function clampDay(i) { return Math.max(0, Math.min(NDAYS - 1, i | 0)); }
function dateOfDay(i) { return DAY_LIST[clampDay(i)]; }
function dayOfDate(ds) { return clampDay(daysBetween(TRIP_START_DATE, ds)); }

/* Dagindex van vandaag; buiten de reisperiode valt hij terug op dag 0 / laatste dag. */
function todayIndex() {
  const now = iso(new Date(Date.now() - new Date().getTimezoneOffset() * 60000));
  if (now < TRIP_START_DATE) return 0;
  if (now > TRIP_END_DATE) return NDAYS - 1;
  return dayOfDate(now);
}
function todayIsInTrip() {
  const now = iso(new Date(Date.now() - new Date().getTimezoneOffset() * 60000));
  return now >= TRIP_START_DATE && now <= TRIP_END_DATE;
}

function fmtDayLabel(ds) {
  const d = utc(ds);
  return WEEKDAYS[d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
}

/* ================================================================
   2. AFLEIDING VAN HET DAGSCHEMA PER REIZIGER

   Een TRIP-item met meerdere map-sleutels wordt over zijn dagen verdeeld.
   De verplaatsing wordt vooraan gelegd (je vertrekt op de eerste dag) en de
   laatste dag loopt altijd door tot de eindbestemming. Zo levert
   t1 (29–30 aug, brussel→singapore→medan):
       29 aug: brussel → singapore
       30 aug: singapore → medan
   en t17 (21–22 sep, labuanbajo→ruteng):
       21 sep: labuanbajo → ruteng, 22 sep: ruteng
   ================================================================ */
function tripKeysOnDay(trip, ds) {
  if (ds < trip.start || ds > trip.end) return null;
  const totaal = daysBetween(trip.start, trip.end) + 1;
  const dag = daysBetween(trip.start, ds);
  const keys = trip.map || [];
  if (keys.length === 0) return [];
  const laatsteIdx = keys.length - 1;
  const van = Math.min(dag, laatsteIdx);
  const tot = dag === totaal - 1 ? laatsteIdx : Math.min(dag + 1, laatsteIdx);
  return keys.slice(van, tot + 1);
}

/* Eén dag samenstellen uit alle etappes die op die dag lopen.
   Etappes die verplaatsen (≥2 locaties) winnen het van meerdaagse verblijven,
   anders zou de villa in Canggu elke dagroute vervuilen met een extra hop. */
function composeDay(personTrips, ds, vorigePositie) {
  const bewegers = [], verblijven = [], actief = [];
  for (const trip of personTrips) {
    const rauw = tripKeysOnDay(trip, ds);
    if (rauw === null) continue;
    actief.push(trip);
    const keys = rauw.filter(k => GEO[k]);
    const uniek = keys.filter((k, i) => i === 0 || k !== keys[i - 1]);
    if (uniek.length >= 2) bewegers.push({ trip, keys: uniek });
    else if (uniek.length === 1) verblijven.push({ trip, keys: uniek });
  }

  let pad = [];
  if (bewegers.length) {
    for (const b of bewegers) {
      for (const k of b.keys) if (pad[pad.length - 1] !== k) pad.push(k);
    }
  } else if (verblijven.length) {
    pad = [verblijven[verblijven.length - 1].keys[0]];
  }

  /* Aansluiten op waar de reiziger gisteren eindigde. */
  if (pad.length && vorigePositie && pad[0] !== vorigePositie) pad.unshift(vorigePositie);

  return { pad, trips: actief };
}

/* Categorieën van de kosten die aan een etappe hangen — bepaalt het icoon. */
function tripCostCats(trip) {
  const cats = new Set();
  for (const cid of trip.costs || []) if (COSTS[cid]) cats.add(COSTS[cid].cat);
  return cats;
}

const itineraryCache = {};

function buildItinerary(personKey) {
  const personTrips = sortTrips(
    (PERSON_TRIPS[personKey] || []).map(id => TRIP.find(t => t.id === id)).filter(Boolean)
  );

  const days = [];
  const places = {};
  const segments = {};
  let positie = null;
  let eersteReisdag = null, laatsteReisdag = null;

  DAY_LIST.forEach((ds, i) => {
    const { pad, trips } = composeDay(personTrips, ds, positie);
    const heeftReis = trips.length > 0;
    if (heeftReis) {
      if (eersteReisdag === null) eersteReisdag = i;
      laatsteReisdag = i;
    }

    const eind = pad.length ? pad[pad.length - 1] : positie;
    const soort = !heeftReis
      ? (eersteReisdag === null ? "voor" : "na")
      : pad.length > 1 ? "reis" : "verblijf";

    const dag = {
      i, date: ds, keys: pad, trips, soort,
      positie: eind || "brussel",
      fase: trips.length ? trips[trips.length - 1].fase : null,
    };
    days.push(dag);
    if (pad.length) positie = eind;

    /* Bezochte plaatsen bijhouden */
    pad.forEach(k => {
      const p = places[k] || (places[k] = {
        key: k, geo: GEO[k], dagen: [], nachten: 0, trips: new Set(),
        fase: null, doorreis: true,
      });
      if (p.dagen[p.dagen.length - 1] !== i) p.dagen.push(i);
      trips.forEach(t => p.trips.add(t.id));
      if (!p.fase && dag.fase) p.fase = dag.fase;
      if (k === eind) { p.nachten++; p.doorreis = false; }
    });

    /* Trajecten tussen opeenvolgende locaties */
    for (let n = 0; n < pad.length - 1; n++) {
      const van = pad[n], naar = pad[n + 1];
      const id = [van, naar].slice().sort().join("|");
      let seg = segments[id];
      if (!seg) {
        const info = routeMode(van, naar);
        seg = segments[id] = {
          id, from: van, to: naar,
          mode: info.mode,
          via: info.via || null,
          label: info.label || "",
          geschat: !!info.guessed,
          km: geoDistanceKm(van, naar),
          dagen: [], datums: [],
          coords: null,
        };
      }
      if (!seg.dagen.includes(i)) { seg.dagen.push(i); seg.datums.push(ds); }
    }
  });

  /* Reizigers die na hun laatste etappe nog "onderweg" lijken, staan thuis. */
  const plaatsen = Object.values(places).map(p => {
    p.trips = [...p.trips];
    p.eersteDag = p.dagen[0];
    p.laatsteDag = p.dagen[p.dagen.length - 1];
    if (p.doorreis) {
      // Voor doorreis: bepaal icoon op basis van het inkomend vervoermiddel
      let icoon = "✈️";
      for (const seg of Object.values(segments)) {
        if (seg.to === p.key) {
          icoon = ROUTE_MODE_STYLE[seg.mode]?.icon || "✈️";
          break;
        }
      }
      p.icoon = icoon;
    } else {
      p.icoon = plaatsIcoon(p, personTrips);
    }
    return p;
  });

  return {
    person: personKey,
    days,
    places: plaatsen,
    segments: Object.values(segments),
    trips: personTrips,
    eersteReisdag: eersteReisdag === null ? 0 : eersteReisdag,
    laatsteReisdag: laatsteReisdag === null ? NDAYS - 1 : laatsteReisdag,
  };
}

function plaatsIcoon(place, personTrips) {
  let acc = false, act = false;
  for (const tid of place.trips) {
    const trip = personTrips.find(t => t.id === tid);
    if (!trip || !trip.map.includes(place.key)) continue;
    const cats = tripCostCats(trip);
    if (cats.has("accommodatie")) acc = true;
    if (cats.has("activiteit")) act = true;
  }
  if (act && place.nachten <= 1) return "🎟️";
  if (acc || place.nachten > 0) return "🏨";
  return "📍";
}

function itinerary(personKey) {
  return itineraryCache[personKey] || (itineraryCache[personKey] = buildItinerary(personKey));
}

/* Transport-legs die exact bij een traject horen (voor vluchtnummer & tijden). */
function segmentLegs(seg, personKey) {
  return TRANSPORT_LEGS.filter(l => {
    if (personKey && !l.persons.includes(personKey)) return false;
    return (l.fromPt === seg.from && l.toPt === seg.to) ||
           (l.fromPt === seg.to && l.toPt === seg.from);
  });
}

/* ================================================================
   3. GEOMETRIE — grootcirkelbogen, zeeroutes en echte wegen (OSRM)
   ================================================================ */
function gcPoints(a, b, n) {
  const R = Math.PI / 180, D = 180 / Math.PI;
  const f1 = a.lat * R, l1 = a.lng * R, f2 = b.lat * R, l2 = b.lng * R;
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin((l2 - l1) / 2) ** 2
  ));
  if (d < 1e-6) return [[a.lat, a.lng], [b.lat, b.lng]];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, sinD = Math.sin(d);
    const A = Math.sin((1 - t) * d) / sinD, B = Math.sin(t * d) / sinD;
    const x = A * Math.cos(f1) * Math.cos(l1) + B * Math.cos(f2) * Math.cos(l2);
    const y = A * Math.cos(f1) * Math.sin(l1) + B * Math.cos(f2) * Math.sin(l2);
    const z = A * Math.sin(f1) + B * Math.sin(f2);
    pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) * D, Math.atan2(y, x) * D]);
  }
  for (let i = 1; i < pts.length; i++) {
    while (pts[i][1] - pts[i - 1][1] > 180) pts[i][1] -= 360;
    while (pts[i][1] - pts[i - 1][1] < -180) pts[i][1] += 360;
  }
  return pts;
}

/* Loodrechte welving op een reeks punten — geeft korte hops een zichtbare boog
   terwijl lange vluchten hun natuurlijke grootcirkelkromming houden. */
function bow(pts, factor) {
  if (factor <= 0 || pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  const dLat = b[0] - a[0], dLng = b[1] - a[1];
  const len = Math.hypot(dLat, dLng);
  if (!len) return pts;
  const nx = -dLng / len, ny = dLat / len;
  return pts.map((p, i) => {
    const t = i / (pts.length - 1);
    const h = Math.sin(Math.PI * t) * len * factor;
    return [p[0] + ny * h, p[1] + nx * h];
  });
}

function flightPoints(fromKey, toKey, via) {
  const a = GEO[fromKey], b = GEO[toKey];
  if (!a || !b) return [];
  const km = geoDistanceKm(fromKey, toKey);
  const f = Math.max(0, 0.14 * (1 - km / 2500));
  if (via && GEO[via]) {
    return bow(gcPoints(a, GEO[via], 48), f).concat(bow(gcPoints(GEO[via], b, 48), f));
  }
  return bow(gcPoints(a, b, 96), f);
}

function seaPoints(fromKey, toKey) {
  const a = GEO[fromKey], b = GEO[toKey];
  if (!a || !b) return [];
  return bow(gcPoints(a, b, 48), 0.10);
}

function straightPoints(fromKey, toKey) {
  const a = GEO[fromKey], b = GEO[toKey];
  if (!a || !b) return [];
  return [[a.lat, a.lng], [b.lat, b.lng]];
}

/* Echte wegroute via OSRM, met localStorage-cache zodat elke pagina hem
   maar één keer ophaalt. Faalt de call, dan blijft de rechte lijn staan. */
const roadPending = {};
function fetchRoad(fromKey, toKey) {
  const cacheKey = "osrm2_" + fromKey + "_" + toKey;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return Promise.resolve(JSON.parse(cached));
  } catch (e) { /* privémodus: gewoon opnieuw ophalen */ }
  if (roadPending[cacheKey]) return roadPending[cacheKey];

  const a = GEO[fromKey], b = GEO[toKey];
  const url = "https://router.project-osrm.org/route/v1/driving/" +
    a.lng + "," + a.lat + ";" + b.lng + "," + b.lat + "?overview=full&geometries=geojson";

  roadPending[cacheKey] = fetch(url)
    .then(r => r.json())
    .then(data => {
      if (!data.routes || !data.routes.length) throw new Error("geen route");
      const r = data.routes[0];
      const result = {
        coords: r.geometry.coordinates.map(c => [c[1], c[0]]),
        dur: r.duration, dist: r.distance,
      };
      try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) {}
      return result;
    })
    .catch(() => null)
    .finally(() => { delete roadPending[cacheKey]; });

  return roadPending[cacheKey];
}

function fmtDur(sec) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? h + "u" + (m ? String(m).padStart(2, "0") : "") : m + "m";
}

function fmtKm(km) {
  return km >= 100 ? Math.round(km).toLocaleString("nl-BE") + " km"
                   : Math.round(km * 10) / 10 + " km";
}

/* Geometrie wordt één keer per traject berekend en hergebruikt door elke
   kaartinstantie op de pagina. GEOM staat onder een gesorteerde sleutel, dus
   we onthouden apart welke kant vooraan ligt: wie hetzelfde traject omgekeerd
   aflegt (Labuan Bajo → Ruteng én terug) krijgt de punten gespiegeld. */
const GEOM = {};
const GEOM_DIR = {};
const OSRM_DONE = {};
const OSRM_DUR = {};
/* Loopt op zodra OSRM een echte weg binnenbrengt; afgeleide paden weten dan
   dat ze opnieuw opgebouwd moeten worden. */
let GEOM_VERSION = 0;

function legId(van, naar) { return [van, naar].slice().sort().join("|"); }

/* Punten van één deeltraject, altijd in de gevraagde richting. */
function legGeometry(van, naar) {
  const id = legId(van, naar);
  if (!GEOM[id]) {
    const info = routeMode(van, naar);
    const style = ROUTE_MODE_STYLE[info.mode] || ROUTE_MODE_STYLE.weg;
    let pts;
    if (style.arc) pts = flightPoints(van, naar, info.via);
    else if (info.mode === "boot" || info.mode === "ferry") pts = seaPoints(van, naar);
    else pts = straightPoints(van, naar);
    GEOM[id] = pts;
    GEOM_DIR[id] = van;
  }
  const pts = GEOM[id];
  return GEOM_DIR[id] === van ? pts : pts.slice().reverse();
}

function segmentGeometry(seg) {
  return legGeometry(seg.from, seg.to);
}

/* Punt op een pad bij fractie 0–1 van het aantal punten. */
function pointAt(pts, f) {
  if (!pts || !pts.length) return null;
  if (pts.length === 1) return pts[0];
  const idx = f * (pts.length - 1);
  const i = Math.floor(idx), j = Math.min(i + 1, pts.length - 1), t = idx - i;
  return [pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t];
}

/* ---------------- doorlopend pad over meerdere deeltrajecten ----------------
   Voor het afspelen is een reeks punten niet genoeg: het icoontje moet met een
   gelijkmatige snelheid lopen. Daarom houden we per pad de cumulatieve lengte
   bij en interpoleren we op afstand, niet op puntindex. Anders zou een korte
   taxirit met 400 OSRM-punten even lang duren als een vlucht van 11.000 km. */
function stepKm(a, b) {
  const dLat = b[0] - a[0];
  const dLng = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) * Math.PI) / 360);
  return Math.hypot(dLat, dLng) * 111.32;
}

function buildPath(keys) {
  const schoon = (keys || []).filter(k => GEO[k]);
  if (!schoon.length) return null;
  const pts = [[GEO[schoon[0]].lat, GEO[schoon[0]].lng]];
  const stops = [0];          // index in pts waar elke tussenstop ligt
  const stopKeys = [schoon[0]];
  for (let i = 0; i < schoon.length - 1; i++) {
    if (schoon[i] === schoon[i + 1]) continue;
    const deel = legGeometry(schoon[i], schoon[i + 1]);
    for (let n = 1; n < deel.length; n++) pts.push(deel[n]);
    stops.push(pts.length - 1);
    stopKeys.push(schoon[i + 1]);
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + stepKm(pts[i - 1], pts[i]));
  return { pts, cum, stops, stopKeys, len: cum[cum.length - 1] };
}

/* Positie op afstandsfractie 0–1, plus de puntindex zodat het spoor kan
   meegroeien en we weten op welk deeltraject we zitten. */
function pointOnPath(path, f) {
  if (!path || !path.pts.length) return null;
  if (path.pts.length === 1 || path.len <= 0) return { ll: path.pts[0], idx: 0 };
  const doel = Math.max(0, Math.min(1, f)) * path.len;
  const cum = path.cum;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= doel) lo = mid; else hi = mid;
  }
  const spanne = cum[hi] - cum[lo];
  const t = spanne > 0 ? (doel - cum[lo]) / spanne : 0;
  const a = path.pts[lo], b = path.pts[hi];
  return { ll: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], idx: lo };
}

/* Zachte start en landing — een lineaire loop oogt mechanisch. */
function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

/* ================================================================
   4. TEGELLAGEN
   ================================================================ */
function makeTiles() {
  return {
    donker: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap · © CARTO", maxZoom: 19 }),
    straat: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap", maxZoom: 19 }),
    satelliet: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }),
    terrein: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }),
  };
}
const TILE_LABELS = { donker: "Donker", straat: "Straat", satelliet: "Satelliet", terrein: "Terrein" };

/* ================================================================
   5. HTML-BOUWSTENEN
   ================================================================ */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function avatarHtml(key, size) {
  const p = PERSONS[key];
  let foto = null;
  try { foto = localStorage.getItem("mapphoto_" + key); } catch (e) {}
  const inner = foto ? '<img src="' + esc(foto) + '" alt="">' : esc(p.initials);
  return '<span class="tm-av" style="--pc:' + p.color + ';width:' + size + 'px;height:' + size +
         'px;font-size:' + Math.round(size * 0.38) + 'px">' + inner + "</span>";
}

function costLine(cid) {
  const c = COSTS[cid];
  if (!c) return "";
  const v = costValue(cid);
  const bedrag = v === null ? "TBD" : "€ " + v.toFixed(2);
  const geboekt = isBooked(cid) ? '<span class="tm-booked">geboekt</span>' : "";
  return '<li><span>' + esc(c.label) + geboekt + '</span><b class="' +
         (v === null ? "tm-tbd" : "") + '">' + bedrag + "</b></li>";
}

/* ================================================================
   6. HET COMPONENT
   ================================================================ */
const DEFAULTS = {
  mode: "panel",          // "full" | "panel" | "mini"
  person: "auto",         // persoonssleutel of "auto" (volgt de personenkiezer)
  people: null,           // wie krijgt een avatar; standaard alleen de focuspersoon
  day: "today",           // startdag: index of "today"
  tile: "satelliet",     // standaard op elke pagina; via de knoppenbalk om te zetten
  height: null,
  controls: null,         // overschrijft de standaard per modus
  onDayChange: null,
  onPersonChange: null,
  onTripSelect: null,
};

const MODE_CONTROLS = {
  full:  { timeline: true,  tiles: true,  person: true,  sidebar: true,  legend: true,  zoom: true },
  panel: { timeline: true,  tiles: true,  person: false, sidebar: false, legend: true,  zoom: true },
  mini:  { timeline: false, tiles: false, person: false, sidebar: false, legend: false, zoom: false },
};

function create(options) {
  const opt = Object.assign({}, DEFAULTS, options || {});
  const root = typeof opt.el === "string" ? document.querySelector(opt.el) : opt.el;
  if (!root) { console.error("tripmap.js: container niet gevonden", opt.el); return null; }

  const ctl = Object.assign({}, MODE_CONTROLS[opt.mode] || MODE_CONTROLS.panel, opt.controls || {});

  const st = {
    day: opt.day === "today" ? todayIndex() : clampDay(opt.day),
    person: opt.person === "auto"
      ? (typeof getSelectedPerson === "function" ? getSelectedPerson() : "matthew")
      : opt.person,
    people: opt.people ? opt.people.slice() : null,
    tile: opt.tile,
    /* frac = waar we binnen de huidige dag staan (0–1). Het afspelen laat die
       doorlopend groeien in plaats van per dag te verspringen. */
    playing: false, speed: 1, frac: 1, raf: null, lastTs: 0,
    scrubTs: 0, stilCamera: false,
    highlight: null,
    fitted: false,
    /* Op een telefoon start de zijbalk ingeklapt, zodat de kaart het scherm krijgt. */
    sideDicht: global.innerWidth <= 780,
  };

  /* ---------- DOM ---------- */
  root.classList.add("tm-root", "tm-" + opt.mode);
  if (opt.height) root.style.height = opt.height;
  root.innerHTML =
    '<div class="tm-map"></div>' +
    (ctl.tiles || ctl.person ? '<div class="tm-topbar"></div>' : "") +
    (ctl.sidebar ? '<aside class="tm-side"></aside>' : "") +
    (ctl.legend ? '<div class="tm-legend"></div>' : "") +
    (ctl.timeline ? '<div class="tm-timeline"></div>' : "") +
    '<div class="tm-status"></div>';

  const elMap = root.querySelector(".tm-map");
  const elTop = root.querySelector(".tm-topbar");
  const elSide = root.querySelector(".tm-side");
  const elLegend = root.querySelector(".tm-legend");
  const elTime = root.querySelector(".tm-timeline");
  const elStatus = root.querySelector(".tm-status");

  /* ---------- Leaflet ---------- */
  const map = L.map(elMap, {
    center: [-2.5, 114], zoom: 5,
    zoomControl: false,
    attributionControl: opt.mode !== "mini",
    scrollWheelZoom: opt.mode !== "mini",
    tap: true,
  });
  if (ctl.zoom) L.control.zoom({ position: "bottomright" }).addTo(map);

  const tiles = makeTiles();
  tiles[st.tile].addTo(map);
  root.classList.toggle("tm-light-tiles", st.tile === "straat");
  root.classList.toggle("tm-sat-tiles", st.tile === "satelliet" || st.tile === "terrein");

  const layerRoutes = L.layerGroup().addTo(map);
  const layerTrail = L.layerGroup().addTo(map);
  const layerPlaces = L.layerGroup().addTo(map);
  const layerPeople = L.layerGroup().addTo(map);

  /* Het spoor dat het icoontje achter zich laat: een brede zachte gloed met
     een scherpe lijn erop, zodat je in één oogopslag ziet hoe ver de dag al
     gevorderd is en welke kant het uit gaat. */
  const trailGlow = L.polyline([], {
    color: "#00b4d8", weight: 11, opacity: 0.2, lineCap: "round", lineJoin: "round",
    interactive: false, className: "tm-trail-glow",
  }).addTo(layerTrail);
  const trailLine = L.polyline([], {
    color: "#ffffff", weight: 3, opacity: 0.92, lineCap: "round", lineJoin: "round",
    interactive: false, className: "tm-trail-line",
  }).addTo(layerTrail);

  /* ---------- interne registers ---------- */
  let itin = null;
  const segViews = {};    // segment-id → {poly, halo, iconMarker, seg}
  const placeViews = {};  // geo-key → {marker, place}
  const peopleViews = {}; // persoon → marker
  const personState = {}; // persoon → was hij onderweg bij het vorige frame?

  /* ================= tekenen ================= */

  function activePeople() {
    return st.people && st.people.length ? st.people : [st.person];
  }

  /* Alle segmenten van iedereen die getoond wordt, samengevoegd. */
  function collectSegments() {
    const uit = {};
    activePeople().forEach(pk => {
      itinerary(pk).segments.forEach(s => {
        const bestaand = uit[s.id];
        if (!bestaand) { uit[s.id] = Object.assign({}, s, { dagen: s.dagen.slice(), personen: [pk] }); }
        else {
          s.dagen.forEach(d => { if (!bestaand.dagen.includes(d)) bestaand.dagen.push(d); });
          bestaand.personen.push(pk);
        }
      });
    });
    Object.values(uit).forEach(s => s.dagen.sort((a, b) => a - b));
    return Object.values(uit);
  }

  function collectPlaces() {
    const uit = {};
    activePeople().forEach(pk => {
      itinerary(pk).places.forEach(p => {
        const b = uit[p.key];
        if (!b) uit[p.key] = Object.assign({}, p, { dagen: p.dagen.slice(), trips: p.trips.slice() });
        else {
          p.dagen.forEach(d => { if (!b.dagen.includes(d)) b.dagen.push(d); });
          p.trips.forEach(t => { if (!b.trips.includes(t)) b.trips.push(t); });
          b.nachten = Math.max(b.nachten, p.nachten);
        }
      });
    });
    return Object.values(uit).map(p => {
      p.dagen.sort((a, b) => a - b);
      p.eersteDag = p.dagen[0];
      p.laatsteDag = p.dagen[p.dagen.length - 1];
      return p;
    });
  }

  const segGeometry = segmentGeometry;

  function segTooltip(seg) {
    const style = ROUTE_MODE_STYLE[seg.mode] || ROUTE_MODE_STYLE.weg;
    const legs = segmentLegs(seg, activePeople().length === 1 ? st.person : null);
    const leg = legs[0];
    const regels = [];
    regels.push('<b>' + style.icon + " " + esc(GEO[seg.from].name) + " → " + esc(GEO[seg.to].name) + "</b>");
    const meta = [style.naam, fmtKm(seg.km)];
    if (OSRM_DUR[seg.id]) meta.push(fmtDur(OSRM_DUR[seg.id]));
    regels.push('<span class="tm-tt-meta">' + meta.join(" · ") + "</span>");
    if (seg.label) regels.push('<span class="tm-tt-meta">' + esc(seg.label) + "</span>");
    if (leg) {
      if (leg.flightNum) regels.push('<span class="tm-tt-meta">' + esc(leg.operator || "") + " · " + esc(leg.flightNum) + "</span>");
      if (leg.times) regels.push('<span class="tm-tt-meta">🕑 ' + esc(leg.times) + "</span>");
    }
    if (seg.datums.length) {
      regels.push('<span class="tm-tt-date">' + seg.datums.map(fmtDayLabel).join(" · ") + "</span>");
    }
    return '<div class="tm-tt">' + regels.join("") + "</div>";
  }

  function drawSegments() {
    layerRoutes.clearLayers();
    Object.keys(segViews).forEach(k => delete segViews[k]);

    collectSegments().forEach(seg => {
      const style = ROUTE_MODE_STYLE[seg.mode] || ROUTE_MODE_STYLE.weg;
      const pts = segGeometry(seg);
      if (!pts.length) return;

      /* Brede onzichtbare lijn eronder = comfortabel hover-doel. */
      const halo = L.polyline(pts, { color: "#000", opacity: 0, weight: 16 }).addTo(layerRoutes);
      const poly = L.polyline(pts, {
        color: style.color, weight: 2.5, opacity: 0.5, lineCap: "round", lineJoin: "round",
        className: "tm-seg",
      }).addTo(layerRoutes);

      const mid = pointAt(pts, 0.5);
      const iconMarker = L.marker(mid, {
        icon: L.divIcon({
          html: '<span class="tm-seg-icon">' + style.icon + "</span>",
          className: "tm-seg-icon-wrap", iconSize: [22, 22], iconAnchor: [11, 11],
        }),
        interactive: false, keyboard: false,
      }).addTo(layerRoutes);

      halo.bindTooltip(segTooltip(seg), { className: "tm-tooltip", sticky: true });
      halo.on("mouseover", () => poly.setStyle({ weight: poly.options.weight + 2 }));
      halo.on("mouseout", () => styleSegment(segViews[seg.id]));

      segViews[seg.id] = { seg, poly, halo, iconMarker };

      /* Echte wegen nalezen bij OSRM; komt de route binnen, dan schuift de
         lijn naar de werkelijke geometrie. */
      if (["weg", "trein", "hike"].indexOf(seg.mode) !== -1 && !OSRM_DONE[seg.id]) {
        OSRM_DONE[seg.id] = true;
        fetchRoad(seg.from, seg.to).then(res => {
          if (!res || !res.coords || !res.coords.length) return;
          GEOM[seg.id] = res.coords;
          GEOM_DIR[seg.id] = seg.from;
          GEOM_VERSION++;
          OSRM_DUR[seg.id] = res.dur;
          seg.osrmDur = res.dur;
          const view = segViews[seg.id];
          if (!view) return;
          view.poly.setLatLngs(res.coords);
          view.halo.setLatLngs(res.coords);
          view.halo.setTooltipContent(segTooltip(seg));
          view.iconMarker.setLatLng(pointAt(res.coords, 0.5));
        });
      }
    });
  }

  function placeTooltip(place) {
    const fase = place.fase ? FASES[place.fase] : null;
    const dagen = place.eersteDag === place.laatsteDag
      ? "dag " + (place.eersteDag + 1)
      : "dag " + (place.eersteDag + 1) + "–" + (place.laatsteDag + 1);
    return '<div class="tm-tt"><b>' + place.icoon + " " + esc(place.geo.name) + "</b>" +
      '<span class="tm-tt-meta">' + dagen + " · " + fmtDayLabel(dateOfDay(place.eersteDag)) + "</span>" +
      (place.notitie ? '<span class="tm-tt-meta">' + esc(place.notitie) + "</span>" : "") +
      (fase ? '<span class="tm-tt-fase" style="--fc:' + fase.color + '">' + esc(fase.label) + "</span>" : "") +
      "</div>";
  }

  function placePopup(place) {
    const fase = place.fase ? FASES[place.fase] : null;
    const kleur = fase ? fase.color : "var(--tm-teal)";
    const relevante = TRIP.filter(t => place.trips.indexOf(t.id) !== -1 && t.map.indexOf(place.key) !== -1);

    let html = '<div class="tm-pop" style="--fc:' + kleur + '">';
    html += '<div class="tm-pop-head"><span class="tm-pop-icon">' + place.icoon + "</span>" +
            "<div><h4>" + esc(place.geo.name) + "</h4><span>" +
            (place.eersteDag === place.laatsteDag
              ? fmtDayLabel(dateOfDay(place.eersteDag))
              : fmtDayLabel(dateOfDay(place.eersteDag)) + " – " + fmtDayLabel(dateOfDay(place.laatsteDag))) +
            (place.nachten ? " · " + place.nachten + (place.nachten === 1 ? " nacht" : " nachten") : " · doorreis") +
            "</span></div></div>";
    if (fase) html += '<div class="tm-pop-fase">' + esc(fase.label) + "</div>";

    relevante.forEach(trip => {
      html += '<div class="tm-pop-trip"><div class="tm-pop-trip-h">' + esc(trip.title) + "</div>";
      html += '<div class="tm-pop-trip-d">' + esc(fmtRange(trip.start, trip.end)) +
              (trip.duration ? " · " + esc(trip.duration) : "") + "</div>";
      if (trip.details && trip.details.length) {
        html += "<ul class='tm-pop-det'>" +
          trip.details.slice(0, 2).map(d => "<li>" + esc(d) + "</li>").join("") + "</ul>";
      }
      const kosten = (trip.costs || []).map(costLine).filter(Boolean);
      if (kosten.length) html += "<ul class='tm-pop-cost'>" + kosten.join("") + "</ul>";
      html += '<button type="button" class="tm-pop-link" data-trip="' + esc(trip.id) + '">Bekijk in reisschema →</button>';
      html += "</div>";
    });

    const fotos = (place.fase && FASE_PHOTOS[place.fase] ? FASE_PHOTOS[place.fase] : []).slice(0, 3);
    if (fotos.length) {
      html += '<div class="tm-pop-photos">' +
        fotos.map(f => '<img src="' + esc(f) + '" alt="" loading="lazy">').join("") + "</div>";
    }
    return html + "</div>";
  }

  function drawPlaces() {
    layerPlaces.clearLayers();
    Object.keys(placeViews).forEach(k => delete placeViews[k]);

    collectPlaces().forEach(place => {
      const fase = place.fase ? FASES[place.fase] : null;
      /* Een pagina mag de kleur/het icoon van een plaats overschrijven — de
         gezondheidspagina kleurt de route bijvoorbeeld naar malariarisico. */
      const eigen = opt.placeStyle ? (opt.placeStyle(place) || {}) : {};
      const kleur = eigen.color || (fase ? fase.color : "#00b4d8");
      const icoon = eigen.icon || place.icoon;
      place.notitie = eigen.note || null;
      const marker = L.marker([place.geo.lat, place.geo.lng], {
        icon: L.divIcon({
          html: '<span class="tm-place" style="--fc:' + kleur + '">' +
                '<span class="tm-place-ring"></span>' +
                '<span class="tm-place-dot"><i>' + icoon + "</i></span>" +
                '<span class="tm-place-label">' + esc(place.geo.name) + "</span></span>",
          className: "tm-place-wrap", iconSize: [14, 14], iconAnchor: [7, 7],
        }),
        riseOnHover: true,
        zIndexOffset: 200 + place.nachten,
      }).addTo(layerPlaces);

      marker.bindTooltip(placeTooltip(place), { className: "tm-tooltip", direction: "top", offset: [0, -10] });
      marker.bindPopup(placePopup(place), { className: "tm-popup", maxWidth: 300, minWidth: 240, autoPanPadding: [30, 60] });
      marker.on("popupopen", e => {
        e.popup.getElement().querySelectorAll("[data-trip]").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-trip");
            if (opt.onTripSelect) opt.onTripSelect(id);
            else global.location.href = "indonesia-timeline.html#" + id;
          });
        });
      });
      placeViews[place.key] = { place, marker };
    });
  }

  /* ---------- dagpaden per reiziger ----------
     Per dag het volledige pad dat die reiziger aflegt, opgebouwd uit de echte
     deeltraject-geometrie (OSRM-wegen, vluchtbogen, zeeroutes). Dát is wat het
     icoontje afloopt tijdens het afspelen — niet een sprong van punt naar punt.
     De cache vervalt zodra OSRM een echte weg heeft binnengebracht. */
  const dayCache = {};
  let dayCacheStempel = -1;

  function buildPersonDays(pk) {
    const it = itinerary(pk);
    const uit = [];
    let vorige = null;
    it.days.forEach((dag, i) => {
      let keys = dag.keys.length ? dag.keys.slice() : (dag.positie ? [dag.positie] : []);

      /* De live tracker kan een handmatig gemelde locatie doorgeven; die wint
         van het geplande schema. De reiziger loopt dan van waar hij gisteren
         eindigde naar de gemelde plek. */
      if (opt.positionResolver) {
        const gemeld = opt.positionResolver(pk, i, dag);
        if (gemeld && GEO[gemeld]) keys = [gemeld];
      }

      keys = keys.filter(k => GEO[k]);
      if (!keys.length) keys = vorige ? [vorige] : [];
      if (vorige && keys.length && keys[0] !== vorige) keys.unshift(vorige);

      const path = buildPath(keys);
      if (keys.length) vorige = keys[keys.length - 1];
      uit.push({ dag, keys, path, reist: !!path && path.len > 0.5 });
    });
    return uit;
  }

  function personDays(pk) {
    if (dayCacheStempel !== GEOM_VERSION) {
      Object.keys(dayCache).forEach(k => delete dayCache[k]);
      dayCacheStempel = GEOM_VERSION;
    }
    return dayCache[pk] || (dayCache[pk] = buildPersonDays(pk));
  }

  /* ---------- tijdsprofiel van één dag ----------
     Een dag is niet één gelijkmatige beweging. Hij bestaat uit fasen: een korte
     aanloop waarin de camera de etappe inkadert, dan per deeltraject een loop,
     met tussen twee deeltrajecten een halte. Zonder die haltes raasde het
     icoontje in één beweging langs Tumpak Sewu én Bromo én Banyuwangi, en zag
     je niet dat daar drie dingen gebeuren.

     De duur van de haltes en van een rustdag hangt af van hoeveel er die dag
     te doen is: het aantal etappes dat loopt plus het aantal geboekte
     activiteiten. Een dag met drie dingen krijgt dus meer tijd dan een dag
     luieren in Canggu. */
  function dayBusy(dag) {
    let n = (dag.trips || []).length;
    (dag.trips || []).forEach(t => {
      (t.costs || []).forEach(cid => { if (COSTS[cid] && COSTS[cid].cat === "activiteit") n++; });
    });
    return n;
  }

  function dayProfile(rij) {
    if (rij.profile) return rij.profile;
    const fasen = [];
    const soort = rij.dag.soort;
    const drukte = dayBusy(rij.dag);

    if (soort === "voor" || soort === "na") {
      /* De zestien dagen dat Hinke nog thuis zit hoeven niet uitgespeeld. */
      fasen.push({ ms: 260, s0: 1, s1: 1 });
    } else if (!rij.reist) {
      fasen.push({ ms: 520 + 240 * Math.min(4, drukte), s0: 1, s1: 1, halte: rij.keys[rij.keys.length - 1] });
    } else {
      const { cum, stops, stopKeys, len } = rij.path;
      fasen.push({ ms: 240, s0: 0, s1: 0 });
      for (let i = 0; i < stops.length - 1; i++) {
        const van = cum[stops[i]] / len, tot = cum[stops[i + 1]] / len;
        const km = cum[stops[i + 1]] - cum[stops[i]];
        fasen.push({ ms: Math.max(650, Math.min(2600, 520 + km * 0.8)), s0: van, s1: tot });
        const laatste = i === stops.length - 2;
        fasen.push({
          ms: laatste ? 320 : 480 + 240 * Math.min(3, drukte),
          s0: tot, s1: tot, halte: stopKeys[i + 1],
        });
      }
    }
    return (rij.profile = { fasen, totaal: fasen.reduce((s, f) => s + f.ms, 0) });
  }

  /* Waar staat de reiziger op fractie frac van zijn dag? Geeft de
     afstandsfractie langs het dagpad terug, plus de halte waar hij op dat
     moment stilstaat. */
  function walkAt(rij, frac) {
    const prof = dayProfile(rij);
    let t = Math.max(0, Math.min(1, frac)) * prof.totaal;
    for (let i = 0; i < prof.fasen.length; i++) {
      const f = prof.fasen[i];
      if (t > f.ms && i < prof.fasen.length - 1) { t -= f.ms; continue; }
      const u = f.ms > 0 ? Math.min(t / f.ms, 1) : 1;
      return { s: f.s0 + (f.s1 - f.s0) * easeInOutSine(u), halte: f.halte || null };
    }
    return { s: 1, halte: null };
  }

  /* Omgekeerde weg: bij welke dagfractie sta je op afstandsfractie s? Nodig om
     een dag in rust halverwege zijn route te kunnen tonen. */
  function fracForS(rij, doelS) {
    const prof = dayProfile(rij);
    let verstreken = 0;
    for (const f of prof.fasen) {
      if (f.s1 >= doelS - 1e-9 && f.s1 > f.s0) {
        const u = Math.max(0, Math.min(1, (doelS - f.s0) / (f.s1 - f.s0)));
        return (verstreken + f.ms * (Math.acos(1 - 2 * u) / Math.PI)) / prof.totaal;
      }
      verstreken += f.ms;
    }
    return 1;
  }

  function idleFrac(rij) { return rij && rij.reist ? fracForS(rij, 0.5) : 1; }

  /* ---------- positie van een reiziger op een dag ----------
     frac = waar binnen de dag (0–1). Zonder frac krijg je de rustpositie. */
  function personPosition(pk, dayIdx, frac) {
    const rij = personDays(pk)[clampDay(dayIdx)];
    if (!rij) return null;
    const w = walkAt(rij, frac == null ? idleFrac(rij) : frac);
    const p = rij.path ? pointOnPath(rij.path, w.s) : null;
    if (!p) {
      const g = GEO[rij.dag.positie] || GEO.brussel;
      return { ll: [g.lat, g.lng], dag: rij.dag, rij, onderweg: false, f: 1, idx: 0, halte: null };
    }

    let van = null, naar = null;
    if (rij.reist) {
      const stops = rij.path.stops;
      let j = 0;
      while (j < stops.length - 2 && p.idx >= stops[j + 1]) j++;
      van = rij.path.stopKeys[j];
      naar = rij.path.stopKeys[j + 1] || van;
    }
    return {
      ll: p.ll, idx: p.idx, dag: rij.dag, rij, van, naar, f: w.s, halte: w.halte,
      onderweg: rij.reist && !w.halte && w.s > 0.015 && w.s < 0.985,
    };
  }

  /* Kleine vaste spreiding zodat overlappende avatars leesbaar blijven. */
  function jitter(pk) {
    let h = 0;
    for (let i = 0; i < pk.length; i++) h = (h * 31 + pk.charCodeAt(i)) | 0;
    return [((h & 0xff) / 255 - 0.5) * 0.13, (((h >> 8) & 0xff) / 255 - 0.5) * 0.13];
  }

  function personIcon(pk, pos) {
    const p = PERSONS[pk];
    const dag = pos.dag;
    const thuis = dag.soort === "voor" || (dag.soort === "na" && dag.positie === "brussel");
    const cls = ["tm-person"];
    if (thuis) cls.push("tm-person-thuis");
    if (pos.onderweg) cls.push("tm-person-onderweg");
    if (pk === st.person) cls.push("tm-person-focus");
    let foto = null;
    try { foto = localStorage.getItem("mapphoto_" + pk); } catch (e) {}
    const inner = foto ? '<img src="' + esc(foto) + '" alt="">' : esc(p.initials);
    return L.divIcon({
      html: '<span class="' + cls.join(" ") + '" style="--pc:' + p.color + '">' +
            '<span class="tm-person-pulse"></span><span class="tm-person-av">' + inner + "</span></span>",
      className: "tm-person-wrap", iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -20],
    });
  }

  function personPopup(pk) {
    const pos = personPosition(pk, st.day);
    const dag = pos.dag;
    const fase = dag.fase ? FASES[dag.fase] : null;
    let waar;
    if (dag.soort === "voor") waar = "Nog thuis in België";
    else if (dag.soort === "na") waar = dag.positie === "brussel" ? "Terug thuis" : "Reis afgerond";
    else if (pos.onderweg) waar = GEO[pos.van].name + " → " + GEO[pos.naar].name;
    else waar = GEO[dag.positie].name;

    let html = '<div class="tm-pop tm-pop-person" style="--fc:' + (fase ? fase.color : PERSONS[pk].color) + '">';
    html += '<div class="tm-pop-head">' + avatarHtml(pk, 40) +
            "<div><h4>" + esc(PERSONS[pk].name) + "</h4><span>" + esc(waar) + "</span></div></div>";
    html += '<div class="tm-pop-fase">' + fmtDayLabel(dag.date) + " · dag " + (dag.i + 1) + " van " + NDAYS +
            (fase ? " · " + esc(fase.label) : "") + "</div>";
    dag.trips.forEach(trip => {
      html += '<div class="tm-pop-trip"><div class="tm-pop-trip-h">' + esc(trip.title) + "</div>";
      if (trip.details && trip.details.length) {
        html += "<ul class='tm-pop-det'><li>" + esc(trip.details[0]) + "</li></ul>";
      }
      html += '<button type="button" class="tm-pop-link" data-trip="' + esc(trip.id) + '">Bekijk in reisschema →</button></div>';
    });
    return html + "</div>";
  }

  /* Persoonsfoto's worden gedeeld met de personenkiezer op de andere
     pagina's (localStorage-sleutel mapphoto_<persoon>). */
  function wirePhotoUpload(popupEl, pk) {
    const input = popupEl.querySelector(".tm-pop-photo input");
    if (!input) return;
    input.addEventListener("change", e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try { localStorage.setItem("mapphoto_" + pk, ev.target.result); } catch (err) {
          console.warn("tripmap: foto past niet in localStorage", err);
          return;
        }
        map.closePopup();
        drawPeople();
        renderSidebar();
        if (typeof renderPersonSelector === "function") renderPersonSelector();
      };
      reader.readAsDataURL(file);
    });
  }

  function drawPeople() {
    layerPeople.clearLayers();
    Object.keys(peopleViews).forEach(k => delete peopleViews[k]);
    Object.keys(personState).forEach(k => delete personState[k]);
    activePeople().forEach(pk => {
      const pos = personPosition(pk, st.day, st.frac);
      if (!pos) return;
      personState[pk] = pos.onderweg;
      const off = activePeople().length > 1 ? jitter(pk) : [0, 0];
      const m = L.marker([pos.ll[0] + off[0], pos.ll[1] + off[1]], {
        icon: personIcon(pk, pos),
        zIndexOffset: 600 + (pk === st.person ? 200 : 0),
      }).addTo(layerPeople);
      m.bindPopup(personPopup(pk), { className: "tm-popup", maxWidth: 280 });
      m.on("popupopen", e => {
        wirePhotoUpload(e.popup.getElement(), pk);
        e.popup.getElement().querySelectorAll("[data-trip]").forEach(btn => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-trip");
            if (opt.onTripSelect) opt.onTripSelect(id);
            else global.location.href = "indonesia-timeline.html#" + id;
          });
        });
      });
      peopleViews[pk] = m;
    });
  }

  /* ---------- één animatieframe ----------
     Hier gebeurt alleen wat goedkoop is: markers verplaatsen en het spoor
     bijwerken. Een icoon opnieuw opbouwen (setIcon) vervangt DOM en is te duur
     voor 60 fps — dat gebeurt enkel als iemand van stilstand naar onderweg
     schakelt of omgekeerd. */
  function renderFrame() {
    const meerdere = activePeople().length > 1;
    activePeople().forEach(pk => {
      const m = peopleViews[pk];
      if (!m) return;
      const pos = personPosition(pk, st.day, st.frac);
      if (!pos) return;
      const off = meerdere ? jitter(pk) : [0, 0];
      m.setLatLng([pos.ll[0] + off[0], pos.ll[1] + off[1]]);
      if (personState[pk] !== pos.onderweg) {
        personState[pk] = pos.onderweg;
        m.setIcon(personIcon(pk, pos));
      }
      if (pk === st.person) markeerHalte(pos.halte);
    });
    updateTrail();
    updateScrub();
  }

  /* Staat de focuspersoon even stil bij een tussenstop, dan licht die plek op.
     Anders zie je wel dat het icoontje wacht, maar niet waarvoor. */
  let huidigeHalte = null;
  function markeerHalte(key) {
    if (key === huidigeHalte) return;
    [huidigeHalte, key].forEach(k => {
      const v = k && placeViews[k];
      const el = v && v.marker.getElement();
      const span = el && el.querySelector(".tm-place");
      if (span) span.classList.toggle("tm-place-hier", k === key && k !== null);
    });
    huidigeHalte = key;
  }

  /* Het spoor van de focuspersoon: het stuk van de dagroute dat al afgelegd
     is. Zo zie je niet alleen wáár iemand staat, maar ook hoe hij daar kwam en
     hoeveel er nog komt. */
  function updateTrail() {
    const pos = personPosition(st.person, st.day, st.frac);
    if (!pos || !pos.rij.reist || st.highlight) {
      if (trailLine.getLatLngs().length) { trailGlow.setLatLngs([]); trailLine.setLatLngs([]); }
      return;
    }
    /* Een OSRM-weg telt duizenden punten; die elk frame allemaal herprojecteren
       maakt het spoor duurder dan de rest van de kaart samen. Uitdunnen scheelt
       op kaartschaal niets zichtbaars. */
    const alle = pos.rij.path.pts;
    const stap = Math.max(1, Math.ceil((pos.idx + 1) / 220));
    const pts = [];
    for (let i = 0; i <= pos.idx; i += stap) pts.push(alle[i]);
    pts.push(pos.ll);
    const fase = pos.dag.fase ? FASES[pos.dag.fase] : null;
    trailGlow.setStyle({ color: fase ? fase.color : "#00b4d8" });
    trailGlow.setLatLngs(pts);
    trailLine.setLatLngs(pts);
  }

  /* Popups en avatars vertellen iets over de dág, niet over het frame — die
     verversen we alleen bij een dagwissel. */
  function refreshPersonMeta() {
    activePeople().forEach(pk => {
      const m = peopleViews[pk];
      if (m) m.setPopupContent(personPopup(pk));
    });
  }

  /* ================= stijl per dag ================= */
  function segStatus(seg) {
    if (st.highlight) {
      return seg.gemarkeerd ? "actief" : "dof";
    }
    if (seg.dagen.indexOf(st.day) !== -1) return "actief";
    return seg.dagen.every(d => d < st.day) ? "verleden" : "toekomst";
  }

  function styleSegment(view) {
    if (!view) return;
    const style = ROUTE_MODE_STYLE[view.seg.mode] || ROUTE_MODE_STYLE.weg;
    const status = segStatus(view.seg);
    const el = view.poly.getElement();
    let o;
    if (status === "actief") o = { color: style.color, weight: 4, opacity: 0.95, dashArray: style.dash || "9 7" };
    else if (status === "verleden") o = { color: style.color, weight: 2.2, opacity: 0.34, dashArray: style.dash };
    else if (status === "dof") o = { color: "#94a3b8", weight: 1.4, opacity: 0.1, dashArray: "3 7" };
    else o = { color: style.color, weight: 1.6, opacity: 0.16, dashArray: "3 7" };
    view.poly.setStyle(o);
    /* classList in plaats van setAttribute("class", …): dat laatste veegt ook
       de klassen weg die Leaflet zelf op het element zet (leaflet-marker-icon,
       leaflet-zoom-animated), waardoor het icoontje bij een zoomanimatie niet
       meer meeschaalt en verschoven achterblijft. */
    zetStatusKlasse(el, status);
    zetStatusKlasse(view.iconMarker.getElement(), status);
  }

  /* De basisklassen (tm-seg / tm-seg-icon-wrap) staan al op het element via de
     className-optie bij het aanmaken; hier wisselen we alleen de status. */
  const SEG_STATUSSEN = ["actief", "verleden", "toekomst", "dof"];
  function zetStatusKlasse(el, status) {
    if (!el) return;
    SEG_STATUSSEN.forEach(s => el.classList.toggle("tm-seg-" + s, s === status));
  }

  function placeStatus(place) {
    if (st.highlight) return place.gemarkeerd ? "actief" : "dof";
    /* dagen is een lijst losse dagen, geen aaneengesloten bereik: Bali komt
       zowel op dag 15 (de jongens) als op dag 29 (Matthew & Hinke) voor. */
    if (place.dagen.indexOf(st.day) !== -1) return "actief";
    return st.day > place.laatsteDag ? "verleden" : "toekomst";
  }

  function styleAll() {
    Object.values(segViews).forEach(styleSegment);
    /* De klasse van .tm-place wordt hieronder integraal herschreven, dus de
       halte-markering vervalt en wordt door het eerstvolgende frame opnieuw
       gezet. */
    huidigeHalte = null;
    Object.values(placeViews).forEach(v => {
      const el = v.marker.getElement();
      if (!el) return;
      const span = el.querySelector(".tm-place");
      if (span) span.setAttribute("class", "tm-place tm-place-" + placeStatus(v.place));
    });
    updateTrail();
    layoutLabels();
  }

  /* ---------- labels die elkaar niet mogen overlappen ---------- */
  let labelFrame = null;
  function layoutLabels() {
    if (labelFrame) cancelAnimationFrame(labelFrame);
    labelFrame = requestAnimationFrame(() => {
      labelFrame = null;
      const bezet = [];
      const items = Object.values(placeViews)
        .map(v => ({ v, status: placeStatus(v.place) }))
        .sort((a, b) => {
          const rang = s => (s === "actief" ? 0 : s === "verleden" ? 1 : 2);
          const d = rang(a.status) - rang(b.status);
          return d !== 0 ? d : b.v.place.nachten - a.v.place.nachten;
        });

      const grens = elMap.getBoundingClientRect();
      const zoom = map.getZoom();

      /* Alleen de bolletjes van de plaatsen van vandaag zijn obstakels. Zouden
         álle bolletjes meetellen, dan verdringt een cluster doorreispunten
         (Padar, Pink Beach, Manta Point) de naam van Labuan Bajo zelf. */
      const dots = [];
      Object.values(placeViews).forEach(v => {
        if (placeStatus(v.place) !== "actief") return;
        const el = v.marker.getElement();
        const dot = el && el.querySelector(".tm-place-dot");
        if (!dot) return;
        const r = dot.getBoundingClientRect();
        if (r.width) dots.push({ key: v.place.key, l: r.left - 1, t: r.top - 1, r: r.right + 1, b: r.bottom + 1 });
      });

      const raakt = (box, o) => !(box.r < o.l || box.l > o.r || box.b < o.t || box.t > o.b);

      items.forEach(({ v }) => {
        const el = v.marker.getElement();
        if (!el) return;
        const label = el.querySelector(".tm-place-label");
        if (!label) return;
        const eigen = v.place.key;
        label.classList.remove("tm-label-hidden");

        /* Tussenstops waar niemand overnacht (Padar, Prambanan, Manta Point)
           krijgen pas een naam als je er echt op inzoomt. */
        if (v.place.nachten === 0 && zoom < 8 && placeStatus(v.place) !== "actief") {
          label.classList.add("tm-label-hidden");
          return;
        }

        /* Eerst rechts van het bolletje proberen, anders links: zo houden
           dicht op elkaar liggende plaatsen (Bali, Komodo) toch hun naam. */
        let geplaatst = false;
        for (const kant of ["", "tm-label-left"]) {
          label.classList.toggle("tm-label-left", kant === "tm-label-left");
          const r = label.getBoundingClientRect();
          if (!r.width) return;
          const box = { l: r.left - 3, t: r.top - 2, r: r.right + 3, b: r.bottom + 2 };
          if (box.r < grens.left || box.l > grens.right || box.b < grens.top || box.t > grens.bottom) break;
          if (bezet.some(o => raakt(box, o))) continue;
          if (dots.some(o => o.key !== eigen && raakt(box, o))) continue;
          bezet.push(box);
          geplaatst = true;
          break;
        }
        if (!geplaatst) {
          label.classList.remove("tm-label-left");
          label.classList.add("tm-label-hidden");
        }
      });

      /* Traject-emoji's krijgen dezelfde behandeling. Op de Komodo-dagtocht
         liggen vijf boottochtjes vlak naast elkaar; zonder deze pas eindigen
         vijf ⛵'s bovenop elkaar in dezelfde baai. Wie het niet redt, valt weg —
         de lijn eronder vertelt het verhaal ook. */
      Object.values(segViews).forEach(view => {
        const ic = view.iconMarker.getElement();
        if (!ic) return;
        ic.classList.remove("tm-seg-icon-weg");
        if (!ic.classList.contains("tm-seg-actief")) return;
        const r = ic.getBoundingClientRect();
        if (!r.width) return;
        const box = { l: r.left - 2, t: r.top - 2, r: r.right + 2, b: r.bottom + 2 };
        if (box.r < grens.left || box.l > grens.right || box.b < grens.top || box.t > grens.bottom) return;
        if (bezet.some(o => raakt(box, o)) || dots.some(o => raakt(box, o))) {
          ic.classList.add("tm-seg-icon-weg");
          return;
        }
        bezet.push(box);
      });
    });
  }
  map.on("zoomend moveend", layoutLabels);

  /* ================= besturing ================= */
  function renderTopbar() {
    if (!elTop) return;
    let html = "";
    if (ctl.person) {
      html += '<div class="tm-select"><label for="tm-person-' + uid + '">Reiziger</label>' +
        '<select id="tm-person-' + uid + '" class="tm-person-select">' +
        PERSON_ORDER.map(k => '<option value="' + k + '"' + (k === st.person ? " selected" : "") + ">" +
          esc(PERSONS[k].name) + "</option>").join("") +
        "</select></div>";
      html += '<button type="button" class="tm-btn tm-all-people" aria-pressed="' +
        (st.people && st.people.length > 1) + '">👥 Iedereen</button>';
    }
    if (ctl.tiles) {
      html += '<div class="tm-tiles">' + Object.keys(tiles).map(k =>
        '<button type="button" class="tm-tile-btn' + (k === st.tile ? " active" : "") +
        '" data-tile="' + k + '">' + TILE_LABELS[k] + "</button>").join("") + "</div>";
    }
    elTop.innerHTML = html;

    const sel = elTop.querySelector(".tm-person-select");
    if (sel) sel.addEventListener("change", () => api.setPerson(sel.value));
    const alle = elTop.querySelector(".tm-all-people");
    if (alle) alle.addEventListener("click", () => {
      const aan = !(st.people && st.people.length > 1);
      api.setPeople(aan ? PERSON_ORDER.slice() : null);
      alle.setAttribute("aria-pressed", String(aan));
    });
    elTop.querySelectorAll("[data-tile]").forEach(b =>
      b.addEventListener("click", () => api.setTile(b.getAttribute("data-tile"))));
  }

  function renderTimeline() {
    if (!elTime) return;
    elTime.innerHTML =
      '<button type="button" class="tm-play" aria-label="Reis afspelen">▶</button>' +
      '<div class="tm-scrub-wrap">' +
        /* Fijne stap zodat de knop tijdens het afspelen meeglijdt in plaats van
           per dag te verspringen; clampDay kapt hem toch af op een heel dagnr. */
        '<input type="range" class="tm-scrub" min="0" max="' + (NDAYS - 1) + '" step="0.01" value="' + st.day + '" aria-label="Dag kiezen">' +
        '<div class="tm-scrub-ticks"></div>' +
      "</div>" +
      '<div class="tm-daylabel"><b></b><span></span><i></i></div>' +
      '<div class="tm-speeds">' + [1, 2, 4].map(s =>
        '<button type="button" class="tm-speed' + (s === st.speed ? " active" : "") + '" data-speed="' + s + '">' + s + "×</button>").join("") +
      "</div>" +
      (todayIsInTrip() ? '<button type="button" class="tm-today">Vandaag</button>' : "");

    /* Faseblokjes onder de slider: in één oogopslag zie je waar je zit. */
    const it = itinerary(st.person);
    const ticks = it.days.map(d => {
      const c = d.fase ? FASES[d.fase].color : "transparent";
      return '<i style="background:' + c + '"></i>';
    }).join("");
    elTime.querySelector(".tm-scrub-ticks").innerHTML = ticks;

    /* Slepen levert door de fijne stap tientallen events per seconde op; alleen
       een échte dagwissel mag de kaart opnieuw laten tekenen. De camera blijft
       tijdens het slepen stil en kadert pas bij het loslaten. */
    const scrub = elTime.querySelector(".tm-scrub");
    scrub.addEventListener("input", () => {
      pause();
      st.scrubTs = performance.now();
      const dag = clampDay(+scrub.value);
      if (dag === st.day) return;
      st.stilCamera = true;
      api.setDay(dag, false);
      st.stilCamera = false;
    });
    scrub.addEventListener("change", () => { st.scrubTs = 0; planCamera(); });
    elTime.querySelector(".tm-play").addEventListener("click", () => (st.playing ? pause() : play()));
    /* De snelheid wordt elk frame opnieuw uitgelezen, dus tijdens het afspelen
       schakelen kan gewoon door — geen herstart van de dag. */
    elTime.querySelectorAll("[data-speed]").forEach(b => b.addEventListener("click", () => {
      st.speed = +b.getAttribute("data-speed");
      elTime.querySelectorAll("[data-speed]").forEach(o => o.classList.toggle("active", o === b));
    }));
    const vandaag = elTime.querySelector(".tm-today");
    if (vandaag) vandaag.addEventListener("click", () => { pause(); api.setDay(todayIndex(), true); });
    updateTimeline();
  }

  /* Alleen de schuifknop bijwerken — dit draait elk frame. */
  function updateScrub() {
    if (!elTime) return;
    const scrub = elTime.querySelector(".tm-scrub");
    if (scrub && document.activeElement !== scrub && performance.now() - st.scrubTs > 400) {
      scrub.value = st.day + Math.min(Math.max(st.frac, 0), 0.999);
    }
  }

  function updateTimeline() {
    if (!elTime) return;
    updateScrub();
    const lbl = elTime.querySelector(".tm-daylabel");
    if (lbl) {
      const rij = personDays(st.person)[st.day];
      const dag = rij ? rij.dag : null;
      lbl.querySelector("b").textContent = fmtDayLabel(dateOfDay(st.day));
      lbl.querySelector("span").textContent = "dag " + (st.day + 1) + "/" + NDAYS +
        (dag && dag.fase ? " · " + FASES[dag.fase].label : "");
      /* Op een reisdag erbij zetten wáár het naartoe gaat — dat was op de kaart
         alleen zichtbaar door de route zelf te volgen. */
      const leg = lbl.querySelector("i");
      if (leg) {
        const route = rij && rij.reist
          ? rij.path.stopKeys.map(k => GEO[k].name.replace(/^[^\w\d(]+\s*/, "")).join(" → ")
          : "";
        leg.textContent = route;
        leg.classList.toggle("tm-leg-aan", !!route);
      }
    }
    const ticks = elTime.querySelector(".tm-scrub-ticks");
    if (ticks) ticks.querySelectorAll("i").forEach((el, i) => el.classList.toggle("nu", i === st.day));
    const play = elTime.querySelector(".tm-play");
    if (play) {
      play.textContent = st.playing ? "⏸" : "▶";
      play.setAttribute("aria-label", st.playing ? "Pauzeren" : "Reis afspelen");
    }
  }

  function renderSidebar() {
    if (!elSide) return;
    const dag = itinerary(st.person).days[st.day];
    const fase = dag && dag.fase ? FASES[dag.fase] : null;

    let html = '<button type="button" class="tm-side-head" aria-expanded="' + !st.sideDicht + '">' +
      "<span><b>" + fmtDayLabel(dateOfDay(st.day)) + "</b>" +
      "<i>dag " + (st.day + 1) + " van " + NDAYS + (fase ? " · " + esc(fase.label) : "") + "</i></span>" +
      '<em class="tm-side-toggle">▾</em></button>';

    /* Wat doet de focuspersoon vandaag */
    html += '<div class="tm-side-today" style="--fc:' + (fase ? fase.color : "#00b4d8") + '">';
    if (!dag || dag.soort === "voor") html += "<p>Vertrekt nog niet — nog thuis in België.</p>";
    else if (dag.soort === "na") html += "<p>" + (dag.positie === "brussel" ? "Terug thuis." : "Reis afgerond.") + "</p>";
    else {
      html += '<div class="tm-side-route">' + dag.keys.map(k =>
        '<span>' + esc(GEO[k].name) + "</span>").join('<i>→</i>') + "</div>";
      dag.trips.forEach(t => {
        html += '<div class="tm-side-trip" data-trip="' + esc(t.id) + '"><b>' + esc(t.title) + "</b>" +
          (t.details && t.details.length ? "<p>" + esc(t.details[0]) + "</p>" : "") + "</div>";
      });
    }
    html += "</div>";

    /* Iedereen op deze dag */
    html += '<div class="tm-side-people"><h5>Waar is iedereen?</h5>';
    html += PERSON_ORDER.map(pk => {
      const pos = personPosition(pk, st.day);
      const d = pos.dag;
      let waar, cls = "";
      if (d.soort === "voor") { waar = "nog thuis"; cls = "tm-dim"; }
      else if (d.soort === "na") { waar = d.positie === "brussel" ? "terug thuis" : "reis afgerond"; cls = "tm-dim"; }
      else if (pos.onderweg) { waar = GEO[pos.van].name + " → " + GEO[pos.naar].name; cls = "tm-move"; }
      else waar = GEO[d.positie].name;
      return '<button type="button" class="tm-prow' + (pk === st.person ? " actief" : "") + '" data-person="' + pk + '">' +
        avatarHtml(pk, 30) + '<span class="tm-prow-info"><b>' + esc(PERSONS[pk].name) + "</b>" +
        '<i class="' + cls + '">' + esc(waar) + "</i></span></button>";
    }).join("");
    html += "</div>";

    elSide.innerHTML = html;
    elSide.classList.toggle("tm-side-dicht", !!st.sideDicht);
    elSide.querySelector(".tm-side-head").addEventListener("click", () => {
      st.sideDicht = !st.sideDicht;
      elSide.classList.toggle("tm-side-dicht", st.sideDicht);
      elSide.querySelector(".tm-side-head").setAttribute("aria-expanded", String(!st.sideDicht));
    });
    elSide.querySelectorAll("[data-person]").forEach(b =>
      b.addEventListener("click", () => api.focusPerson(b.getAttribute("data-person"))));
    elSide.querySelectorAll("[data-trip]").forEach(b =>
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-trip");
        if (opt.onTripSelect) opt.onTripSelect(id);
        else global.location.href = "indonesia-timeline.html#" + id;
      }));
  }

  function renderLegend() {
    if (!elLegend) return;
    const gebruikt = {};
    collectSegments().forEach(s => { gebruikt[s.mode] = true; });
    /* Een pagina die de kleuren overschrijft, levert ook zijn eigen legende. */
    const rij = opt.legendItems || (function () {
      const fases = [];
      itinerary(st.person).days.forEach(d => { if (d.fase && fases.indexOf(d.fase) === -1) fases.push(d.fase); });
      return fases.map(f => ({ color: FASES[f].color, label: FASES[f].label }));
    })();
    elLegend.innerHTML =
      '<div class="tm-legend-row">' + rij.map(x =>
        '<span class="tm-lg"><i style="background:' + x.color + '"></i>' + esc(x.label) + "</span>").join("") + "</div>" +
      '<div class="tm-legend-row tm-legend-modes">' + Object.keys(gebruikt).map(m => {
        const s = ROUTE_MODE_STYLE[m];
        return '<span class="tm-lg"><b style="color:' + s.color + '">' + s.icon + "</b>" + esc(s.naam) + "</span>";
      }).join("") + "</div>";
  }

  /* ================= afspelen =================
     Het afspelen loopt op een animatieframe-klok in plaats van een timer die
     één dag per tik verzet. Daardoor verspringt het icoontje niet van punt naar
     punt met stilte ertussen, maar loopt het de route van die dag echt af.
     De duur van een dag komt uit zijn tijdsprofiel (zie dayProfile): afstand,
     aantal haltes en hoeveel er die dag te doen is bepalen samen hoe lang hij
     in beeld blijft. */
  function dayDuration(i) {
    const rij = personDays(st.person)[clampDay(i)];
    return rij ? dayProfile(rij).totaal : 600;
  }

  /* Terwijl de kaart zelf beweegt staat de klok stil. Een marker verplaatsen
     tijdens een zoomanimatie rekent met het oude zoomniveau en laat het
     icoontje over het scherm schuiven; bovendien leest de pauze als "kijk,
     dáár gaat hij naartoe" in plaats van als haperen. */
  let camBezig = false, camTimer = null;
  function houdCamera(aan) {
    camBezig = aan;
    clearTimeout(camTimer);
    st.lastTs = 0;
    if (aan) camTimer = setTimeout(() => { camBezig = false; st.lastTs = 0; }, 1800);
  }
  map.on("zoomstart", () => { if (st.playing) houdCamera(true); });
  map.on("zoomend moveend", () => { if (camBezig) houdCamera(false); });

  /* De camera kadert de hele etappe van de dag in vóór het lopen begint, zodat
     je ziet waar iemand naartoe gaat. Alleen wanneer het nodig is: staat de
     route al comfortabel in beeld, dan blijft de kaart staan — anders schokt
     hij bij elke dag heen en weer. */
  function planCamera() {
    if (st.stilCamera) return;
    const rij = personDays(st.person)[st.day];
    if (!rij || !rij.path) return;
    const pts = rij.path.pts;

    if (!rij.reist) {
      const ll = L.latLng(pts[0][0], pts[0][1]);
      if (!map.getBounds().pad(-0.18).contains(ll)) {
        houdCamera(true);
        map.panTo(ll, { animate: true, duration: 0.7 });
      }
      return;
    }

    const doel = L.latLngBounds(pts);
    /* Tweede reden om te herkaderen: de kaart staat zo ver uitgezoomd (na een
       langeafstandsvlucht) dat de etappe een speldenknop is geworden. Zonder
       die test blijft de kaart na Brussel → Singapore op wereldniveau hangen. */
    const nw = map.latLngToContainerPoint(doel.getNorthWest());
    const se = map.latLngToContainerPoint(doel.getSouthEast());
    const teKlein = Math.abs(se.x - nw.x) < elMap.clientWidth * 0.22 &&
                    Math.abs(se.y - nw.y) < elMap.clientHeight * 0.22;
    if (map.getBounds().pad(-0.1).contains(doel) && !teKlein) return;

    houdCamera(true);
    map.flyToBounds(doel, Object.assign(
      { maxZoom: rij.path.len < 80 ? 11 : 9, duration: 0.75 }, paddingFor()));
  }

  function play() {
    if (st.playing) return;
    if (walkRaf) { cancelAnimationFrame(walkRaf); walkRaf = null; }
    /* Aan het eind aangekomen: opnieuw vanaf dag 1. */
    if (st.day >= NDAYS - 1) gotoDay(0);
    if (st.highlight) wisMarkering();
    st.playing = true;
    st.frac = 0;
    st.lastTs = 0;
    root.classList.add("tm-playing");
    styleAll();
    updateTimeline();
    if (!camBezig) planCamera();
    renderFrame();
    st.raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (!st.playing) return;
    st.playing = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = null;
    root.classList.remove("tm-playing");
    updateTimeline();
  }

  function tick(ts) {
    st.raf = null;
    if (!st.playing) return;
    if (!st.lastTs) st.lastTs = ts;
    /* Bij een tabwissel loopt de klok door; zonder plafond springt de reis dan
       tien dagen vooruit in één frame. */
    const dt = Math.min(ts - st.lastTs, 120);
    st.lastTs = ts;

    if (!camBezig) {
      st.frac += (dt * st.speed) / dayDuration(st.day);
      while (st.frac >= 1) {
        if (st.day >= NDAYS - 1) { st.frac = 1; renderFrame(); pause(); return; }
        st.frac -= 1;
        gotoDay(st.day + 1);
        /* Moet de camera herkaderen, dan wacht de reiziger netjes aan het begin
           van zijn etappe tot de kaart stilstaat. */
        if (camBezig) { st.frac = 0; break; }
      }
    }
    renderFrame();
    st.raf = requestAnimationFrame(tick);
  }

  /* Een handmatige dagsprong (pijltjestoets, deeplink, "Vandaag") loopt hetzelfde
     pad af als het afspelen, alleen in één keer. */
  let walkRaf = null;
  function startWalk() {
    if (walkRaf) cancelAnimationFrame(walkRaf);
    const rij = personDays(st.person)[st.day];
    const duur = rij && rij.reist ? 700 : 260;
    const doel = idleFrac(rij);
    const t0 = performance.now();
    (function stap(now) {
      const t = Math.min((now - t0) / duur, 1);
      st.frac = doel * easeInOutSine(t);
      renderFrame();
      walkRaf = t < 1 ? requestAnimationFrame(stap) : null;
    })(t0);
  }

  function wisMarkering() {
    st.highlight = null;
    Object.values(segViews).forEach(v => { v.seg.gemarkeerd = false; });
    Object.values(placeViews).forEach(v => { v.place.gemarkeerd = false; });
  }

  /* Naar een andere dag zonder de afspeelklok aan te raken. */
  function gotoDay(i) {
    const nieuw = clampDay(i);
    const veranderd = nieuw !== st.day;
    st.day = nieuw;
    refreshPersonMeta();
    styleAll();
    updateTimeline();
    renderSidebar();
    planCamera();
    if (veranderd && opt.onDayChange) opt.onDayChange(st.day, dateOfDay(st.day));
  }

  /* ================= kaartuitsnede ================= */
  function boundsOf(keys) {
    const pts = keys.map(k => GEO[k]).filter(Boolean).map(g => [g.lat, g.lng]);
    return pts.length ? L.latLngBounds(pts) : null;
  }

  function fitPerson(animate) {
    const it = itinerary(st.person);
    /* Brussel en Singapore laten de kaart uitzoomen tot halve wereld; de reis
       zelf speelt zich in Indonesië af, dus die vallen buiten de standaardview. */
    const keys = it.places.map(p => p.key).filter(k => ["brussel", "singapore"].indexOf(k) === -1);
    const b = boundsOf(keys.length ? keys : it.places.map(p => p.key));
    if (b) map.fitBounds(b, Object.assign({ animate: !!animate }, paddingFor()));
  }

  /* De zijbalk en de tijdlijn dekken een deel van de kaart af; die ruimte moet
     uit de uitsnede blijven, anders verdwijnt Flores achter het paneel. */
  function paddingFor() {
    const breed = root.clientWidth > 900;
    if (opt.mode === "mini") return { padding: [16, 16] };
    if (opt.mode === "full") {
      return breed
        ? { paddingTopLeft: [50, 175], paddingBottomRight: [330, 105] }
        : { paddingTopLeft: [26, 150], paddingBottomRight: [26, 190] };
    }
    return { paddingTopLeft: [30, 56], paddingBottomRight: [30, 78] };
  }

  /* ================= publieke API ================= */
  const uid = Math.random().toString(36).slice(2, 8);

  const api = {
    map, root,

    setDay(i, animate) {
      /* Een gemelde locatie kan intussen gewijzigd zijn (live-pagina); de
         afgeleide dagpaden moeten dan opnieuw opgebouwd worden. */
      if (opt.positionResolver) Object.keys(dayCache).forEach(k => delete dayCache[k]);
      wisMarkering();
      const nieuw = clampDay(i);
      st.frac = animate ? 0 : idleFrac(personDays(st.person)[nieuw]);
      gotoDay(nieuw);
      if (st.playing) return api;
      if (animate) startWalk(); else renderFrame();
      return api;
    },

    setPerson(key) {
      if (!PERSONS[key] || key === st.person) return api;
      st.person = key;
      if (st.people && st.people.length === 1) st.people = [key];
      redraw(true);
      if (opt.onPersonChange) opt.onPersonChange(key);
      return api;
    },

    setPeople(keys) {
      st.people = keys && keys.length ? keys.slice() : null;
      redraw(false);
      return api;
    },

    setTile(key) {
      if (!tiles[key] || key === st.tile) return api;
      map.removeLayer(tiles[st.tile]);
      tiles[key].addTo(map);
      st.tile = key;
      root.classList.toggle("tm-light-tiles", key === "straat");
      root.classList.toggle("tm-sat-tiles", key === "satelliet" || key === "terrein");
      if (elTop) elTop.querySelectorAll("[data-tile]").forEach(b =>
        b.classList.toggle("active", b.getAttribute("data-tile") === key));
      return api;
    },

    /* Gebruikt door de stepper op de homepagina: licht bepaalde etappes uit
       zonder de dagpositie te verzetten. null = terug naar dagweergave. */
    highlightTrips(ids) {
      if (!ids || !ids.length) {
        st.highlight = null;
        Object.values(segViews).forEach(v => { v.seg.gemarkeerd = false; });
        Object.values(placeViews).forEach(v => { v.place.gemarkeerd = false; });
        styleAll();
        fitPerson(true);
        return api;
      }
      st.highlight = ids.slice();
      const keys = new Set();
      ids.forEach(id => {
        const t = TRIP.find(x => x.id === id);
        if (t) t.map.forEach(k => { if (GEO[k]) keys.add(k); });
      });
      Object.values(placeViews).forEach(v => { v.place.gemarkeerd = keys.has(v.place.key); });
      Object.values(segViews).forEach(v => {
        v.seg.gemarkeerd = keys.has(v.seg.from) && keys.has(v.seg.to);
      });
      styleAll();
      const b = boundsOf([...keys].filter(k => k !== "brussel"));
      if (b) map.fitBounds(b, Object.assign({ animate: true, maxZoom: 9 }, paddingFor()));
      return api;
    },

    focusPerson(key) {
      api.setPerson(key);
      const m = peopleViews[key];
      if (m) { map.setView(m.getLatLng(), Math.max(map.getZoom(), 7), { animate: true }); m.openPopup(); }
      return api;
    },

    focusPlace(key) {
      const v = placeViews[key];
      if (v) { map.setView(v.marker.getLatLng(), Math.max(map.getZoom(), 8), { animate: true }); v.marker.openPopup(); }
      return api;
    },

    fit(animate) { fitPerson(animate); return api; },
    play, pause,
    togglePlay() { st.playing ? pause() : play(); return api; },
    isPlaying() { return st.playing; },
    getDay() { return st.day; },
    getDate() { return dateOfDay(st.day); },
    getPerson() { return st.person; },
    invalidate() { map.invalidateSize(); layoutLabels(); return api; },
    destroy() {
      pause();
      if (walkRaf) cancelAnimationFrame(walkRaf);
      clearTimeout(camTimer);
      map.remove();
      root.innerHTML = "";
      root.classList.remove("tm-root", "tm-" + opt.mode);
    },
  };

  function redraw(refit) {
    drawSegments();
    drawPlaces();
    drawPeople();
    styleAll();
    renderTopbar();
    if (elTime) renderTimeline();
    renderSidebar();
    renderLegend();
    if (refit || !st.fitted) { fitPerson(st.fitted); st.fitted = true; }
  }

  /* De rustpositie hangt van het dagprofiel af, dus die wordt hier gezet en
     niet in de begintoestand van st. */
  st.frac = idleFrac(personDays(st.person)[st.day]);
  redraw(true);

  /* De kaart moet opnieuw meten zodra het paneel van formaat verandert. De
     hoogte van de tijdlijn varieert (op mobiel breekt hij over meerdere
     regels), dus die geven we als CSS-variabele door zodat de zijbalk er
     altijd netjes bovenop eindigt. */
  function meetTijdlijn() {
    root.style.setProperty("--tm-tl-h", (elTime ? elTime.offsetHeight : 0) + "px");
  }
  meetTijdlijn();
  if (global.ResizeObserver) {
    const ro = new ResizeObserver(() => { map.invalidateSize(); meetTijdlijn(); layoutLabels(); });
    ro.observe(root);
    if (elTime) ro.observe(elTime);
  }
  setTimeout(() => { map.invalidateSize(); fitPerson(false); }, 60);

  if (elStatus) elStatus.textContent = "";
  return api;
}

/* ================================================================
   7. EXPORT
   ================================================================ */
global.TripMap = {
  create,
  itinerary,
  days: DAY_LIST,
  ndays: NDAYS,
  dateOfDay, dayOfDate, todayIndex, todayIsInTrip, fmtDayLabel,
  /* Zodat andere pagina's dezelfde afleiding kunnen gebruiken zonder kaart. */
  positionOf(personKey, dayIndex) {
    const it = itinerary(personKey);
    return it.days[clampDay(dayIndex)];
  },
};

})(window);
