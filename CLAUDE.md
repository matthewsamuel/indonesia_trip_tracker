# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Indonesië reisproject — context voor Claude Code

Dit is een reisplanningsproject: alle info over Matthews Indonesië-reis (28 aug – 29 sep 2026) wordt hier verzameld in interactieve HTML-pagina's, zodat hij zijn route, status en kosten kan volgen. Geen backend — alles is self-contained HTML/CSS/JS met `localStorage` voor persistentie.

Beide bestanden kunnen direct in de browser worden geopend (`open indonesia-tracker.html`) zonder build-stap. Er is geen package.json, geen server, geen compilatie.

## Belangrijkste instructie

**Stel geen blokkerende verduidelijkingsvragen tenzij het echt nodig is.** Reisdata komt uit meerdere, soms tegenstrijdige bronnen (chatberichten, geüploade docx, een los "boyz"-PDF van de vriendengroep). Conflicten daartussen zijn vaak *geen fout* — het reisgezelschap splitst onderweg op in subgroepen, dus twee bronnen die "hetzelfde" beschrijven kunnen allebei kloppen voor een andere subgroep. Los conflicten zelf op met de beste inschatting, of zet ze als korte notitie in de pagina. Vraag wel door als iets een echte fork in de weg is die de data merkbaar fout zou maken.

## Bestanden

- **`data.js`** — enige bron van waarheid: fases, personen, kosten, coördinaten, itinerarium, transport.
- **`tripmap.js` + `tripmap.css`** — het gedeelde interactieve kaartcomponent (zie hieronder).
- **`indonesia-tracker.html`** — home: kostendashboard (Chart.js doughnut), route-stepper en kaart.
- **`indonesia-timeline.html`** — chronologisch reisschema met kaartpaneel.
- **`indonesia-map.html`** — schermvullende reiskaart met tijdlijn en zijbalk.
- **`indonesia-live.html`** — "waar is iedereen"-pagina, bedoeld om op Matthews domein te hosten tijdens de reis.
- **`indonesia-health.html`** — vaccinaties, apotheek, SOS-kaart en risicokaart.
- **`indonesia-transport.html`** — tickets, vervoersoverzicht en routekaart.

## Het kaartcomponent (tripmap.js)

Eén Leaflet-component vervangt de vier vroegere kaart-implementaties (2× Leaflet, 2× SVG).
Er staat **geen itinerarium in tripmap.js** — het dagschema wordt afgeleid uit data.js:
`PERSON_TRIPS` → `TRIP.map` + `TRIP.start/end` → `ROUTE_MODES` → `TRANSPORT_LEGS` → `GEO`.

```js
const kaart = TripMap.create({
  el: "#mijnKaart",
  mode: "full" | "panel" | "mini",
  person: "matthew" | "auto",   // "auto" volgt de personenkiezer
  people: PERSON_ORDER,          // wie een avatar krijgt (standaard: alleen person)
  day: "today" | 0,
  positionResolver,              // optioneel: gemelde locatie wint van het plan
  placeStyle, legendItems,       // optioneel: eigen kleuren/legende
  onDayChange, onPersonChange, onTripSelect,
});
kaart.setDay(12, true); kaart.setPerson("hinke"); kaart.highlightTrips(["t19"]);
```

Belangrijke afleidingsregels:
- Een etappe met meerdere `map`-keys wordt over zijn dagen verdeeld; de verplaatsing
  ligt vooraan en de laatste dag eindigt altijd op de laatste key.
- Lopen er op één dag meerdere etappes, dan winnen de verplaatsende van de meerdaagse
  verblijven — anders vervuilt de villa in Canggu elke dagroute met een extra hop.
- Wegroutes worden bij OSRM opgehaald (`router.project-osrm.org`) en in `localStorage`
  gecached onder `osrm2_<van>_<naar>`. Zonder netwerk blijft de rechte lijn staan.
- Vluchten zijn grootcirkelbogen; korte hops krijgen extra welving zodat ze leesbaar blijven.

## Code-architectuur

### indonesia-tracker.html

Alle data zit in het `<script>`-blok bovenaan, vóór de render-functies:

**`PHASES`** — object dat fase-IDs mapt naar `{label, color, soft}`. Fase-IDs: `heen`, `sg`, `sumatra`, `jakarta`, `java`, `flores`, `komodo`, `bali`, `terug`.

**`COSTS`** — object: `id → {label, cat, amount, ...}`. `amount: null` = TBD. `cat` is één van: `"vlucht"`, `"transport"`, `"accommodatie"`, `"activiteit"`. Elke kostenpost heeft een unieke string-ID (bijv. `"c1"`, `"c7b"`).

**`GEO`** — object: naam → `{lat, lng, name}`. Echte coördinaten; enige bron voor alle
kaarten. (De vroegere `PTS` met SVG-coördinaten is verwijderd samen met de SVG-kaarten.)

**`ROUTE_MODES`** — object: `"vanKey|naarKey"` → `{mode, via?, label}`. Zegt hoe elk
deeltraject afgelegd wordt: `vlucht`, `trein`, `weg`, `boot`, `ferry` of `hike`.
`TRIP.map` geeft alleen de volgorde van locaties, niet het vervoermiddel, en
`TRANSPORT_LEGS` beschrijft niet elk deeltraject apart (denk aan de tussenstop
Singapore of de losse etappes van de Komodo-boottocht) — vandaar deze tabel.
Zoek hem op via `routeMode(van, naar)`, dat ook de omgekeerde richting probeert.

**`TRIP`** — array van itinerary-items. Elk item:
```js
{
  id: "t1",            // unieke string
  fase: "heen",        // verwijst naar PHASES
  start: "2026-08-28", // ISO-datum
  end:   "2026-08-29",
  title: "...",
  details: ["..."],    // array van strings, weergegeven als bullets
  costs: ["c1"],       // array van COSTS-IDs
  map: ["singapore"],  // geordende GEO-keys: de route van deze etappe
  openNote: true       // optioneel: geeft aan dat dit blok nog open info heeft
}
```

De volgorde van `map` is betekenisvol: `tripmap.js` verdeelt die locaties over de
dagen van de etappe (verplaatsing vooraan, laatste dag eindigt op de laatste key).
Een etappe die verplaatst hoort dus `map: ["van", "naar"]` te hebben, een verblijf
één enkele key.

**`localStorage`-keys in tracker:**
- `"booked_<id>"` → boolean (is kostenpost geboekt?)
- `"cost_<id>"` → number (gebruiker-overschreven bedrag)
- `"notes_<id>"` → string (vrije notitie per trip-item)
- `"selected_person"` → string (gedeeld door alle pagina's)
- `"mapphoto_<persoon>"` → data-URL (avatarfoto, gedeeld met de personenkiezer)
- `"osrm2_<van>_<naar>"` → gecachte wegroute

Render-functies: `renderPhaseNav()`, `renderTimeline()`, `renderMap()`, `recalcAll()` (herberekent totalen + doughnut). `statusOf(item)` geeft `"voltooid"`, `"bezig"`, `"binnenkort"` of `"gepland"` terug o.b.v. systeemdatum.

`renderMap(tripIds)` op de homepagina is een dun laagje over het kaartcomponent: de
route-stepper roept hem aan bij hover en klik, en hij vertaalt dat naar
`kaart.highlightTrips(...)`.

### indonesia-live.html

Data zit in `<script id="seed-data" type="application/json">` — een JSON-object: `personKey → {name, color, log[]}`. Elk log-item: `{date, location, note, planned}`.

**Persistentie-flow:**
1. `loadData()` probeert `localStorage.getItem("tripLiveData")`; bij miss of parse-fout valt het terug op de `seed-data`.
2. `saveData()` schrijft de volledige `DATA` naar `localStorage`.
3. `downloadUpdatedSite()` kloont het volledige HTML-document, overschrijft de `seed-data` met de huidige `DATA`, en serialiseert dat tot een downloadbaar bestand. Zo kan Matthew de bijgewerkte pagina her-uploaden naar zijn hosting zonder server/database.
   Let op: de kloon leegt `#liveMap` eerst — anders belandt de complete door Leaflet
   gegenereerde DOM (tegels, markers) in het gedownloade bestand.

De kaart toont normaal de geplande positie uit `TRIP`, maar zodra iemand in zijn log
een locatie meldt die `geoKeyVoorTekst()` herkent, wint die melding. Zo blijft de kaart
kloppen als de groep onderweg van het plan afwijkt.

**`PERSON_ORDER`** — array die de volgorde van personen bepaalt in tabs en overview-grid:
`["matthew","hinke","arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"]`

**`localStorage`-key:** alleen `"tripLiveData"` (één JSON-blob voor alle personen).

## Reisstructuur (stand van zaken 2026-07-01)

**Route:** Brussel → Bangkok → Singapore (28-29/08) → Medan → Ketambe/Sumatra jungle trek (31/08-07/09) → Jakarta (07-08/09) → Yogyakarta → Malang (09-10/09) → **splitsingspunt** → Surabaya (14/09) → Banyuwangi/Bromo/Ijen (16-17/09) → Labuan Bajo/Flores (18-20/09) → Ruteng (21-22/09) → Labuan Bajo/Komodo (23-25/09) → Bali (26-28/09) → thuis (29/09).

**Reisgezelschap:**
- Matthew + **Arne**: samen BRU→Singapore→Medan (28-31/08).
- In Medan sluiten de overige jongens aan: **6 man totaal** trekken de jungle in (Matthew, Arne, Willem, Kasper, Eliott, Kamiel).
- In Jakarta (08/09) sluiten **Maurice (Momo)**, **Mathias** en **Jens** aan → **9 man** voor Java.
- Volledige naamlijst reisgenoten (naast Matthew): **Hinke** (vriendin), **Arne, Eliott, Jens, Kamiel, Maurice, Mathias, Willem, Kasper**.
- **Splitsingspunt:** na nachttrein naar Malang (10/09) gaan de jongens door naar Tumpak Sewu (11/09) en Bromo (12/09). Matthew doet dit NIET mee — hij wil dat met Hinke doen. Hij wacht in Surabaya.
- **Hinke** landt 14/09 om 8:00 in Surabaya; vanaf dan reizen zij samen (Bromo/Ijen op 16-17/09, dan Flores/Komodo/Bali).

**Kosten:** `amount: null` in COSTS = TBD. Openstaande TBDs: vlucht Medan→Jakarta, Java→Denpasar→Labuan Bajo, Ruteng overnachting, Labuan Bajo overnachting (tweede keer), vlucht Labuan Bajo→Bali, terugvlucht Bali→huis.

## Bewerkingsregel

Wanneer nieuwe info binnenkomt: werk de `TRIP`/`COSTS`-objecten in **`data.js`** en de
`seed-data` in `indonesia-live.html` bij **in-place**. Maak geen nieuwe bestanden.

Komt er een locatie bij, dan hoort daar een `GEO`-entry bij en — als er ook een nieuw
traject ontstaat — een regel in `ROUTE_MODES`. Zonder die regel raadt `routeMode()` de
modus op afstand (>600 km = vlucht), wat meestal klopt maar geen label of tussenstop geeft.

## Openstaande punten

- Exacte sub-groep-toewijzing van Eliott/Jens/Kamiel/Maurice/Willem/Kasper.
- TBD-kosten invullen zodra Matthew boekt.
- Bali-verblijf: exacte locatie (Ubud/Canggu/Uluwatu) nog niet gekozen.
