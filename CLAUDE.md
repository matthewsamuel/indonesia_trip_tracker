# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Indonesië reisproject — context voor Claude Code

Dit is een reisplanningsproject: alle info over Matthews Indonesië-reis (28 aug – 29 sep 2026) wordt hier verzameld in interactieve HTML-pagina's, zodat hij zijn route, status en kosten kan volgen. Geen backend — alles is self-contained HTML/CSS/JS met `localStorage` voor persistentie.

Beide bestanden kunnen direct in de browser worden geopend (`open indonesia-tracker.html`) zonder build-stap. Er is geen package.json, geen server, geen compilatie.

## Belangrijkste instructie

**Stel geen blokkerende verduidelijkingsvragen tenzij het echt nodig is.** Reisdata komt uit meerdere, soms tegenstrijdige bronnen (chatberichten, geüploade docx, een los "boyz"-PDF van de vriendengroep). Conflicten daartussen zijn vaak *geen fout* — het reisgezelschap splitst onderweg op in subgroepen, dus twee bronnen die "hetzelfde" beschrijven kunnen allebei kloppen voor een andere subgroep. Los conflicten zelf op met de beste inschatting, of zet ze als korte notitie in de pagina. Vraag wel door als iets een echte fork in de weg is die de data merkbaar fout zou maken.

## Bestanden

- **`indonesia-tracker.html`** — het hoofditinerarium: chronologisch reisschema, kostendashboard (Chart.js doughnut), en SVG-routekaart.
- **`indonesia-live.html`** — "waar is iedereen"-pagina, bedoeld om op Matthews domein te hosten tijdens de reis.

## Code-architectuur

### indonesia-tracker.html

Alle data zit in het `<script>`-blok bovenaan, vóór de render-functies:

**`PHASES`** — object dat fase-IDs mapt naar `{label, color, soft}`. Fase-IDs: `heen`, `sg`, `sumatra`, `jakarta`, `java`, `flores`, `komodo`, `bali`, `terug`.

**`COSTS`** — object: `id → {label, cat, amount, ...}`. `amount: null` = TBD. `cat` is één van: `"vlucht"`, `"transport"`, `"accommodatie"`, `"activiteit"`. Elke kostenpost heeft een unieke string-ID (bijv. `"c1"`, `"c7b"`).

**`PTS`** — object: naam → `{x, y, label}`. Pre-geprojecteerde coördinaten voor de SVG-routekaart (viewBox 900×400).

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
  map: ["singapore"],  // array van PTS-keys (voor kaartmarkering)
  openNote: true       // optioneel: geeft aan dat dit blok nog open info heeft
}
```

**`localStorage`-keys in tracker:**
- `"booked_<id>"` → boolean (is kostenpost geboekt?)
- `"cost_<id>"` → number (gebruiker-overschreven bedrag)
- `"notes_<id>"` → string (vrije notitie per trip-item)

Render-functies: `renderPhaseNav()`, `renderTimeline()`, `renderMap()`, `recalcAll()` (herberekent totalen + doughnut). `statusOf(item)` geeft `"past"`, `"today"` of `"future"` terug o.b.v. systeemdatum.

### indonesia-live.html

Data zit in `<script id="seed-data" type="application/json">` — een JSON-object: `personKey → {name, color, log[]}`. Elk log-item: `{date, location, note, planned}`.

**Persistentie-flow:**
1. `loadData()` probeert `localStorage.getItem("tripLiveData")`; bij miss of parse-fout valt het terug op de `seed-data`.
2. `saveData()` schrijft de volledige `DATA` naar `localStorage`.
3. `downloadUpdatedSite()` kloont het volledige HTML-document, overschrijft de `seed-data` met de huidige `DATA`, en serialiseert dat tot een downloadbaar bestand. Zo kan Matthew de bijgewerkte pagina her-uploaden naar zijn hosting zonder server/database.

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

Wanneer nieuwe info binnenkomt: werk de `TRIP`/`COSTS`-objecten in `indonesia-tracker.html` en de `seed-data` in `indonesia-live.html` bij **in-place**. Maak geen nieuwe bestanden.

## Openstaande punten

- Exacte sub-groep-toewijzing van Eliott/Jens/Kamiel/Maurice/Willem/Kasper.
- TBD-kosten invullen zodra Matthew boekt.
- Bali-verblijf: exacte locatie (Ubud/Canggu/Uluwatu) nog niet gekozen.
