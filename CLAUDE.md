# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Indonesië reisproject — context voor Claude Code

Dit is een reisplanningsproject: alle info over Matthews Indonesië-reis (28 aug – 29 sep 2026) wordt hier verzameld in interactieve HTML-pagina's, zodat hij zijn route, status en kosten kan volgen. Geen backend — alles is self-contained HTML/CSS/JS met `localStorage` voor persistentie.

Beide bestanden kunnen direct in de browser worden geopend (`open indonesia-tracker.html`) zonder build-stap. Er is geen package.json, geen server, geen compilatie.

## Belangrijkste instructie

**Stel geen blokkerende verduidelijkingsvragen tenzij het echt nodig is.** Reisdata komt uit meerdere, soms tegenstrijdige bronnen (chatberichten, geüploade docx, een los "boyz"-PDF van de vriendengroep). Conflicten daartussen zijn vaak *geen fout* — het reisgezelschap splitst onderweg op in subgroepen, dus twee bronnen die "hetzelfde" beschrijven kunnen allebei kloppen voor een andere subgroep. Los conflicten zelf op met de beste inschatting, of zet ze als korte notitie in de pagina. Vraag wel door als iets een echte fork in de weg is die de data merkbaar fout zou maken.

## Bestanden

- **`data.js`** — enige bron van waarheid: fases, personen, kosten, coördinaten, itinerarium, transport, plus de dagenlaag (`buildDagen`) die daaruit per reiziger een kalender afleidt.
- **`tripmap.js` + `tripmap.css`** — het gedeelde interactieve kaartcomponent (zie hieronder).
- **`indonesia-tracker.html`** — home: kostendashboard (Chart.js doughnut), route-stepper en kaart.
- **`indonesia-timeline.html`** — chronologisch reisschema met kaartpaneel: één blok per kalenderdag (zie de dagenlaag hieronder).
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

**`FASES`** — object dat fase-IDs mapt naar `{label, color, soft, uitleg, desc}`. Fase-IDs: `heen`, `sumatra`, `jakarta`, `java`, `lombok`, `flores`, `komodo`, `bali`, `terug`. De volgorde van de sleutels is betekenisvol: `compareTrips()` gebruikt hem als tiebreak bij gelijke startdatum.

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

### De dagenlaag (`buildDagen` in data.js)

`buildDagen(persoon)` leidt uit `PERSON_TRIPS` + `TRIP` een lijst van **kalenderdagen**
af — de vorm waarin `indonesia-timeline.html` het schema toont. `TRIP` blijft
ongewijzigd; kaart, stepper en kosten werken gewoon door op etappes.

```js
[{ date:"2026-09-13", nr:16, fase:"bali",
   delen:[{ trip, nieuw:true, dagNr:1, dagenTotaal:3 }, …] }, …]
```

- Elke dag komt precies één keer voor, van de eerste tot de laatste reisdag van
  die persoon. `delen` bevat alle etappes die op die dag lopen.
- `nieuw` is waar op de dag dat een etappe begint. **Daar horen de details,
  foto's en kosten** — anders herhaalt de villa in Canggu zes dagen lang
  dezelfde tekst, en zouden drie invulvelden naar dezelfde `cost_<id>`
  schrijven. Op de vervolgdagen toont de tijdlijn alleen een chip
  ("dag 4 van 7").
- **`faseVanDag()`** kiest het hoofdstuk: de fase waar de reiziger die dag het
  meest is. Zonder tijden in de data schat `dagGewicht()` dat uit de vorm van de
  etappe — een verblijf houdt je langer op één plek dan een verplaatsing, en de
  laatste dag van een verblijf (je vertrekt pas later) weegt zwaarder dan de
  aankomstdag (je arriveert 's avonds). De hoogste score wint; bij gelijkstand
  de laatste etappe van de dag, want dat is de reisrichting.
- Klopt die vuistregel voor een dag niet, zet hem dan in **`DAG_FASE_OVERRIDE`**
  (`"<persoon>|<datum>"` of enkel `"<datum>"`) — met de reden erbij. Zo staat
  Hinkes 15/09 onder "Vlucht heen": ze landt pas om 18:15 en zit die dag vooral
  in het vliegtuig.

Een fase kan twee keer aan bod komen (Matthew doet Java → Bali → Java), dus
`renderTimeline()` bundelt *aaneengesloten* dagen met dezelfde fase tot één
hoofdstukblok en geeft het tweede blok een eigen id (`fase-java-2`). Het
in-/uitklappen blijft per fase gedeeld, dus beide blokken klappen samen.

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

**Route:** Brussel → Singapore → Medan (29-30/08) → Ketambe/Sumatra jungle trek (01/09-07/09) → Jakarta (07-08/09) → Yogyakarta (09-10/09) → **4-daagse GetYourGuide-tour Yogyakarta → Tumpak Sewu → Bromo → Ijen → Bali (10-13/09)** → Canggu (13-15/09) → **vlucht DPS→SUB 15/09 16:40 (IU 703); Hinke landt 18:15** → Villa Panda Blimbing, Tumpak Sewu + Bromo/Madakaripura met Hinke (15-18/09) → **vlucht SUB→LOP 18/09 11:00 (Super Air Jet, €42)** → **Lombok (18-22/09)** → **vlucht LOP→LBJ 22/09 12:25 (Wings Abadi, €91)** → Labuan Bajo (22-24/09) → **2-daagse Komodo-boottour, 1 nacht aan boord (24-25/09)** → Labuan Bajo (25-26/09) → **vlucht LBJ→DPS 26/09 10:35 (AirAsia, €63)** → Bali (26-28/09) → terugvlucht Bali → Bangkok → Brussel (29-30/09, TG440 + TG934).

**Reisgezelschap:**
- **Matthew** vliegt BRU→Singapore samen met Eliott, Willem, Kamiel en Kasper; in Changi splitst de groep — zij naar Jakarta (SQ956), hij naar Medan (SQ990). **Arne** zit sinds 10/08 in Maleisië en komt vanuit Kuala Lumpur naar Medan (±€50); ze treffen elkaar daar rond 14:00 op 30/08.
- In Medan sluiten de overige jongens aan: **6 man totaal** trekken de jungle in (Matthew, Arne, Willem, Kasper, Eliott, Kamiel).
- In Jakarta (08/09) sluiten **Maurice (Momo)**, **Mathias** en **Jens** aan → **9 man** voor Java.
- Volledige naamlijst reisgenoten (naast Matthew): **Hinke** (vriendin), **Arne, Eliott, Jens, Kamiel, Maurice, Mathias, Willem, Kasper**.
- **Splitsingspunt:** de nachttrein Yogyakarta → Malang is vervallen. Vanaf 10/09 neemt de hele groep van 9 een **4-daagse GetYourGuide-tour** (`c8`, ±€116-130 pp) die hen van Yogyakarta over Tumpak Sewu, Bromo en Ijen tot aan de villa in Canggu brengt — vervoer én drie overnachtingen inbegrepen. Matthew doet dat volledig mee (`t9`, `t10b`, `t30`, `t30b`) en blijft tot 15/09 in Canggu (`t11`; hij slaapt op de zetel en betaalt niet mee aan de villa `t30c`). Op 15/09 vliegt hij om 16:40 met Super Air Jet IU 703 naar Surabaya (`t11a`, €36) om Hinke op te halen. Tumpak Sewu en Bromo doet hij op 16-17/09 een tweede keer met Hinke, maar **Ijen slaat hij die ronde over** ten gunste van Madakaripura — vandaar aparte kostenposten per ronde (`c8` met de jongens, `c21` met Hinke); de kostenset per persoon is een `Set`, dus hergebruikte id's zouden maar één keer meetellen.
- **Lombok is nieuw** in het plan: Matthew & Hinke doen daar vier nachten (18-22/09), waardoor **Ruteng geschrapt** is. Waar op Lombok is nog niet beslist, dus `GEO.lombok` staat voorlopig als één generiek punt op de kaart.
- De jongens (Arne, Kasper, Jens & Willem) trekken vanaf 19/09 óók naar **Lombok en Nusa Penida** (`t40`), zodra Eliott en Kamiel naar huis vertrekken.
- **Hinke** vliegt 14/09 met Cathay Pacific (CX294 + CX629) via Hongkong en landt 15/09 om 18:15 in Surabaya; vanaf dan reizen zij samen (Bromo/Ijen op 16-17/09, dan Flores/Komodo/Bali).

**Komodo-boottour (24-25/09):** de 3-daagse GetYourGuide-tour van €320,76 is vervangen door de **2-daagse van komodoboattour.com** (1 nacht aan boord). Staat als twee eendaagse etappes (`t19`, `t19b`), zodat elke dag zijn eigen haltes op de kaart krijgt; de kosten hangen enkel aan `t19`. Dag 1: pickup 10:00-11:00, Kelor → Rinca → Kalong → nacht bij Kambing. Dag 2: Padar bij zonsopgang → Pink Beach → Manta Point → Taka Makassar → terug rond 19:00. Let op: op deze kortere route wordt **Komodo Island zelf niet aangedaan** (de varanen zie je op Rinca). Nog te boeken; richtprijs gedeelde cabine ±€145-165 pp, entree Komodo National Park (IDR 400-650k) meestal niet inbegrepen. Contact: WhatsApp +62 898 7750 0505. **De oude GetYourGuide-boeking moet nog geannuleerd worden — gratis tot 17/09.**

**Kosten:** `amount: null` in COSTS = TBD. Openstaande TBDs voor Matthew: heenvlucht BRU→Medan (c1), Villa Panda Blimbing (c25), GetYourGuide-tour met Hinke (c21), Lombok-verblijf (c40), Labuan Bajo 22-24/09 (c12), Komodo 2-daagse boottour (c23), Labuan Bajo 25-26/09 (c14), terugvlucht TG440+TG934 (c17 — vlucht staat vast, prijs niet).

**Jungle-afrekening:** het voorschot van 8% (±€16 pp) is in juli via Wise betaald; bij aankomst betaalt iedereen nog **IDR 3.930.000 (±€200)** contant aan gids Hasby. Dat restbedrag dekt óók de twee overnachtingen in het guesthouse, dus `c4` staat op €216 en `c4b` op 0.

**Groepskosten** lopen via een Tricount: https://tricount.com/tnlhoSzNdFFRLFcgjp

## Bewerkingsregel

Wanneer nieuwe info binnenkomt: werk de `TRIP`/`COSTS`-objecten in **`data.js`** en de
`seed-data` in `indonesia-live.html` bij **in-place**. Maak geen nieuwe bestanden.

Komt er een locatie bij, dan hoort daar een `GEO`-entry bij en — als er ook een nieuw
traject ontstaat — een regel in `ROUTE_MODES`. Zonder die regel raadt `routeMode()` de
modus op afstand (>600 km = vlucht), wat meestal klopt maar geen label of tussenstop geeft.

## Openstaande punten

- **Lombok**: locatie nog niet gekozen (Kuta Lombok / Senggigi / Gili's) en verblijf nog te zoeken.
- **Komodo 2-daagse**: nog te boeken, prijs opvragen; oude GetYourGuide-boeking annuleren vóór 17/09.
- **GetYourGuide-tour van de jongens** (10-13/09): nog te boeken, Kasper zou voorschieten (±€900). Twee kandidaten bekeken: de 4-daagse GYG-tour (€116-130) en een 3-daagse privétour van SeekSophie vanuit Surabaya.
- Vluchten SUB→LOP, LOP→LBJ en LBJ→DPS staan met prijs en tijd in het plan maar zijn nog **niet geboekt**.
- Accommodatie nog te regelen: Jakarta (junglegroep), Yogyakarta 1 nacht (±€10 met zwembad), Labuan Bajo 22-24 en 25-26/09, Lombok.
- Bagage-opslag in Jakarta voor de junglegroep (±€3-4/dag in lockers).
- **Eliott & Kamiel**: vertrekken 19/09 uit Bali, thuis op 21/09; vlucht Bali→Jakarta en terugvlucht nog te boeken.
- **Vietnam**: Maurice heeft zijn vlucht bevestigd, Mathias heeft de retour Hanoi→Brussel van 8 oktober; Willem mikt op eind september, ná Lombok. Exacte data per persoon nog open.
- TBD-kosten invullen zodra Matthew boekt.

## Natuurrampen (augustus 2026)

Twee gebeurtenissen die het plan kunnen raken. Ze staan als waarschuwing in `indonesia-health.html` en bij de betrokken etappes:

- **Mount Bromo** — begin augustus 2026 verwoestte een natuurbrand ±550 hectare. Raakt zowel de ronde met de jongens (12/09) als die met Hinke (17/09).
- **Labuan Bajo, Flores** — half augustus 2026 een aardbeving gevolgd door een tsunami. Raakt het volledige Flores/Komodo-blok (22-26/09).
