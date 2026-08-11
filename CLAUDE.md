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
- Een etappe die verplaatst hoort `map: ["van","naar"]` te hebben en een verblijf één
  enkele key. Geeft een verblijf-etappe tóch twee keys terwijl een andere etappe
  diezelfde verplaatsing al beschrijft, dan wordt de rit dubbel afgelegd en pendelt
  het icoontje heen en weer (zo ging het ooit mis bij Medan ⇄ Ketambe).

### Afspelen

De afspeelknop draait op een animatieframe-klok (`tick`), niet op een timer die één dag
per tik verzet. Per reiziger wordt eerst het **dagpad** afgeleid — de volledige route van
die dag, aan elkaar geplakt uit de deeltraject-geometrie — en het icoontje loopt dat pad
af op *afstandsfractie*, zodat het overal even snel gaat.

- `st.frac` (0–1) zegt waar we binnen de huidige dag zitten. `idleFrac(rij)` is de
  rustpositie (halverwege het pad) waar een dag op blijft staan zonder afspelen.
- **`dayProfile(rij)`** verdeelt een dag in fasen: aanloop → deeltraject → halte →
  deeltraject → … Op elke tussenstop staat de reiziger even stil en licht die plek op
  (`tm-place-hier`). Zonder die haltes raasde het icoontje in één beweging langs Tumpak
  Sewu én Bromo én Banyuwangi en zag je niet dat daar drie dingen gebeuren.
- De duur van haltes en van een rustdag schaalt met **`dayBusy(dag)`** = aantal lopende
  etappes + aantal kostenposten met `cat: "activiteit"`. Een drukke dag krijgt dus meer
  tijd dan een dag luieren in Canggu. `dayDuration()` is gewoon de som van het profiel.
  Ter oriëntatie: een rustdag ±750 ms, een enkele hop ±1,2 s, Bromo-dag met drie haltes
  ±5,7 s, de Komodo-boottocht met vijf haltes ±8,4 s.
- De aanloopfase is voor de camera: `planCamera()` kadert de hele etappe in vóór het
  lopen begint, maar alleen als die niet al goed in beeld staat.
- Terwijl de kaart zelf beweegt staat de klok stil (`camBezig`). Een marker verplaatsen
  tijdens een zoomanimatie rekent met het oude zoomniveau en laat hem wegglijden.
- Per frame gebeurt alleen wat goedkoop is (`renderFrame`): markers verplaatsen en het
  spoor bijwerken. Popups, avatars en lijnstijlen verversen enkel bij een dagwissel.

### Kaartweergave en drukte op de kaart

- **Satelliet is de standaardtegel** (`DEFAULTS.tile`) op alle pagina's. Luchtbeelden zijn
  druk, dus `.tm-sat-tiles` legt een donkere sluier over *alleen de tegellaag* en geeft
  plaatsnamen een zwaardere schaduw; lijnen en markers blijven onaangetast.
- Een traject toont zijn vervoersemoji **alleen op de dag dat het gereisd wordt**. Hielden
  afgelegde trajecten hun emoji, dan stonden er tegen het eind van de reis dertig busjes
  en bootjes over de kaart — de meeste midden op zee, want daar valt het midden van een
  vlucht- of bootlijn, en bij Bali zeven bovenop elkaar. `layoutLabels()` doet daarna nog
  een ontwar-pas: een emoji die op een plaatsnaam of bolletje valt, verdwijnt.
- **Nooit `setAttribute("class", …)` op een element dat Leaflet beheert.** Dat veegt ook
  `leaflet-marker-icon` en `leaflet-zoom-animated` weg, waardoor het element bij een
  zoomanimatie niet meer meeschaalt en verschoven achterblijft. Gebruik `classList`
  (zie `zetStatusKlasse`), en zet basisklassen via de `className`-optie van Leaflet.

## Code-architectuur

### indonesia-tracker.html

Alle data zit in het `<script>`-blok bovenaan, vóór de render-functies:

**`FASES`** — object dat fase-IDs mapt naar `{label, color, soft, uitleg, desc}`. Fase-IDs: `heen`, `sumatra`, `jakarta`, `java`, `flores`, `komodo`, `bali`, `terug`. De volgorde van de sleutels is betekenisvol: `compareTrips()` gebruikt hem als tiebreak bij gelijke startdatum.

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
  fase: "heen",        // verwijst naar FASES
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
- `"collapsed_fase_<fase>"` / `"collapsed_stepper_<groupKey>"` → boolean (in-/uitgeklapt)
- `"timeline_view_mode"` → `"expanded"` | `"compact"`
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

**Route:** Brussel → Bangkok → Singapore (28-29/08) → Medan → Ketambe/Sumatra jungle trek (31/08-07/09) → Jakarta (07-08/09) → Yogyakarta → Malang (09-10/09) → Tumpak Sewu/Bromo/Ijen met de jongens (11-13/09) → ferry naar Bali, Canggu (13-15/09) → **vlucht DPS→SUB 15/09 16:40 (IU 703); Hinke landt 18:15** → Banyuwangi/Bromo/Ijen opnieuw met Hinke (16-17/09) → Labuan Bajo/Flores (18-20/09) → Ruteng (21-22/09) → Labuan Bajo/Komodo (23-25/09) → Bali (26-28/09) → terugvlucht Bali → Bangkok → Brussel (29-30/09, TG440 + TG934).

**Reisgezelschap:**
- Matthew + **Arne**: samen BRU→Singapore→Medan (28-31/08).
- In Medan sluiten de overige jongens aan: **6 man totaal** trekken de jungle in (Matthew, Arne, Willem, Kasper, Eliott, Kamiel).
- In Jakarta (08/09) sluiten **Maurice (Momo)**, **Mathias** en **Jens** aan → **9 man** voor Java.
- Volledige naamlijst reisgenoten (naast Matthew): **Hinke** (vriendin), **Arne, Eliott, Jens, Kamiel, Maurice, Mathias, Willem, Kasper**.
- **Splitsingspunt:** na de nachttrein naar Malang (10/09) doet Matthew het volledige jongensprogramma mee — Tumpak Sewu (11/09), Bromo (12/09) en Ijen (13/09) — en deelt hij dus gewoon `t10b`, `t30` en `t30b` met hen; er is géén aparte Matthew-etappe meer voor die dagen. Hij steekt op 13/09 met de ferry mee over naar Bali en blijft tot 15/09 in Canggu (`t11`, verblijf nog te regelen: de villa `t30c` is voor 8 personen geboekt). Op 15/09 vliegt hij om 16:40 met Super Air Jet IU 703 van Denpasar naar Surabaya (`t11a`, €36, aankomst 16:40 lokale tijd) om Hinke op te halen. Bromo/Tumpak Sewu en Ijen doet hij op 16-17/09 een tweede keer, dan met Hinke — vandaar aparte kostenposten per ronde (`c37`/`c38` met de jongens, `c21`/`c22` met Hinke); de kostenset per persoon is een `Set`, dus hergebruikte id's zouden maar één keer meetellen.
- **Hinke** vliegt 14/09 met Cathay Pacific (CX294 + CX629) via Hongkong en landt 15/09 om 18:15 in Surabaya; vanaf dan reizen zij samen (Bromo/Ijen op 16-17/09, dan Flores/Komodo/Bali).

**Kosten:** `amount: null` in COSTS = TBD. Openstaande TBDs voor Matthew: heenvlucht BRU→Medan (c1), guesthouse Ketambe (c4b), verblijf Canggu 13-15/09 (c36), Java→Denpasar→Labuan Bajo (c11), Ruteng overnachting (c13), Labuan Bajo overnachting tweede keer (c14), vlucht Labuan Bajo→Bali (c15), terugvlucht TG440+TG934 (c17 — vlucht staat vast, prijs niet).

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
