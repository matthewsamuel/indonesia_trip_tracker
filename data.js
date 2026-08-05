/* ================================================================
   GECENTRALISEERDE DATA VOOR INDONESIA TRIP TRACKER (data.js)
   Enkele bron van waarheid (Single Source of Truth) voor alle pagina's:
   - indonesia-tracker.html
   - indonesia-timeline.html
   - indonesia-transport.html
   - indonesia-health.html
   - indonesia-live.html
   - indonesia-map.html
   ================================================================ */

/* ---------------- ALGEMENE HELPERS & CONSTANTEN ---------------- */
const MONTHS = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const TRIP_START_DATE = "2026-08-29";

function fmtShort(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.getDate() + " " + MONTHS[dt.getMonth()];
}

function fmtRange(s, e) {
  if (!s || !e) return "";
  return s === e
    ? fmtShort(s)
    : s.slice(0, 7) === e.slice(0, 7)
    ? new Date(s + "T00:00:00").getDate() + "–" + fmtShort(e)
    : fmtShort(s) + " – " + fmtShort(e);
}

function today() {
  return new Date(new Date().toDateString());
}

function dateOf(s) {
  return new Date(s + "T00:00:00");
}

function statusOf(item) {
  const t = today();
  const s = dateOf(item.start), e = dateOf(item.end);
  if (e < t) return "voltooid";
  if (s <= t && t <= e) return "bezig";
  const days = (s - t) / 86400000;
  if (days <= 10) return "binnenkort";
  return "gepland";
}

const STATUS_LABEL = {
  voltooid: "voltooid",
  bezig: "nu bezig",
  binnenkort: "binnenkort",
  gepland: "gepland"
};

function ls_get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}

function ls_set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

function costValue(id) {
  const stored = ls_get("cost_" + id, undefined);
  if (stored !== undefined && stored !== "") return Number(stored);
  const def = COSTS[id] ? COSTS[id].amount : null;
  return def === null ? null : def;
}

function isBooked(id) {
  return ls_get("booked_" + id, false);
}

/* ---------------- FASEN VAN DE REIS ---------------- */
const FASES = {
  heen:    { label: "Vlucht heen",  color: "#4cc9f0", soft: "rgba(76, 201, 240, 0.1)", uitleg: "Heenreis vanuit Brussel naar Medan, met korte overstap in Singapore.", desc: "Matthew en Arne vliegen op 29 augustus met Singapore Airlines (SQ303) vanuit Brussel naar Singapore, waar ze op 30 augustus om 06:40 landen. Na een korte overstap van 50 minuten in Changi vliegen ze door met SQ990 naar Medan, waar ze om 08:00 aankomen. Geen tussenstop om te chillen — de reis gaat rechtstreeks door richting het avontuur." },
  sg:      { label: "Singapore",    color: "#00b4d8", soft: "rgba(0, 180, 216, 0.1)", uitleg: "Korte overstap in Singapore Changi Airport.", desc: "Overstap op Singapore Changi Airport alvorens door te reizen naar Indonesië." },
  sumatra: { label: "Sumatra",      color: "#4ad66d", soft: "rgba(74, 214, 109, 0.1)", uitleg: "Intense 5-daagse jungle trekking in Ketambe met de hele crew.", desc: "Na een vlucht naar Medan volgt een marathon rit van 7-8 uur de oerwouden in naar Ketambe, diep in het hart van Sumatra. Met 6 man — Matthew, Arne, Kamiel, Eliott, Kasper en Willem — wordt een intensieve 5-daagse all-in jungle trekking gedaan, compleet met orang-oetans, nachtelijke geluiden en jungle overnachtingen. Een van de meest avontuurlijke en onvergetelijke onderdelen van de hele reis." },
  jakarta: { label: "Jakarta",      color: "#f77f00", soft: "rgba(247, 127, 0, 0.1)", uitleg: "Aankomst in de hoofdstad en samenkomst van de complete groep van 9.", desc: "Na de jungle is het tijd voor de bruisende hoofdstad Jakarta, waar Maurice, Mathias en Jens de groep versterken — nu zijn alle 9 reizigers voor het eerst bij elkaar. Eén nacht in de stad: bijkomen, Kota Tua verkennen en de groep samenvoegen. Het is ook het moment om bij te trekken voor de avontuurlijke Java-etappe die volgt." },
  java:    { label: "Java",         color: "#9d4edd", soft: "rgba(157, 78, 221, 0.1)", uitleg: "Reis langs Yogyakarta, Borobudur, Prambanan en Bromo/Ijen vulkanen.", desc: "Java biedt een indrukwekkend programma: Yogyakarta, Borobudur en Prambanan, gevolgd door een nachttrein naar Malang. Matthew wacht in Surabaya op Hinke terwijl de jongens Tumpak Sewu en Mount Bromo verkennen. Zodra Hinke landt op 14 september reizen ze samen verder — Kawah Ijen blauwvuur, daarna Flores." },
  flores:  { label: "Flores",       color: "#f72585", soft: "rgba(247, 37, 133, 0.1)", uitleg: "Verkenning van het bergachtige Flores, Ruteng en spinnenwebvelden.", desc: "Na een vlucht via Bali landen Matthew en Hinke in het betoverende Labuan Bajo aan de westkust van Flores. Een uitstap naar het bergachtige binnenland brengt hen naar Ruteng, bekend om zijn spinnenweb-rijstvelden en mistige berglandschappen. Terug in Labuan Bajo is het rustig wachten op de spectaculaire Komodo-boottocht." },
  komodo:  { label: "Komodo National Park", color: "#00f5d4", soft: "rgba(0, 245, 212, 0.1)", uitleg: "Boottocht naar Padar Island, Pink Beach en Komodovaranen.", desc: "Een volle dag boottour naar het wereldberoemde Komodo Nationaal Park: Padar Island met zijn iconische bergsilhouet, roze koraal op Pink Beach en een confrontatie met de machtige Komodovaranen. Als bonus snorkelen bij Manta Point, waar zijdezachte mantaroggen langzij zwemmen. Een van de absolute hoogtepunten van de hele reis." },
  bali:    { label: "Bali",         color: "#ffb703", soft: "rgba(255, 183, 3, 0.1)", uitleg: "Afsluitende ontspanning met luxe villa, strand en gezellig uit eten.", desc: "Na weken van avontuur is Bali de perfecte afsluiting: een luxe villa, tropische zwembaden en heerlijk eten bij de lokale warongs. Matthew en Hinke genieten van de rust en schoonheid van het eiland na alles wat ze hebben beleefd." },
  terug:   { label: "Vlucht terug", color: "#4cc9f0", soft: "rgba(76, 201, 240, 0.1)", uitleg: "Terugreis naar huis of doorreis naar Vietnam.", desc: "De reis zit erop! Vliegtuig terug naar Brussel of doorvliegen naar Vietnam voor wie daar nog op doorreis gaat. Tijd om terug te kijken op een fantastische reis door Indonesië." },
};

const FASE_TEKST_PP = {
  heen: [
    { wie: ["eliott","kamiel","kasper","willem"],
      uitleg: "Heenreis Brussel → Singapore → Jakarta, daarna twee dagen acclimatiseren.",
      desc: "Vlucht op 29 augustus met SQ303 naar Singapore, daarna door met SQ956 naar Jakarta (aankomst 30/08 om 09:55, Soekarno T3). Twee nachten Jakarta om te acclimatiseren en de stad te verkennen, vóór de vlucht naar Medan op 01/09." },
    { wie: ["maurice","mathias","jens"],
      uitleg: "Heenreis Brussel → Jakarta om aan te sluiten bij de groep.",
      desc: "Maurice, Mathias en Jens vliegen op 7 september vanuit Brussel naar Jakarta (aankomst 08/09 om ±08:25). Daar sluiten ze aan bij de jongens die net uit de Sumatra-jungle komen — vanaf dan is de groep compleet met 9 man." },
    { wie: ["hinke"],
      uitleg: "Heenreis Brussel → Singapore → Surabaya, waar Matthew wacht.",
      desc: "Hinke vliegt op 13 september vanuit Brussel via Singapore naar Surabaya, waar ze op 14 september om 08:00 landt. Matthew staat klaar op de luchthaven — vanaf hier reizen ze samen verder door Java, Flores, Komodo en Bali." }
  ],
  java: [
    { wie: ["hinke"],
      uitleg: "Samen met Matthew: villa in Blimbing, Bromo/Tumpak Sewu en Kawah Ijen.",
      desc: "Hinke landt op 14 september in Surabaya en trekt samen met Matthew door Oost-Java: een rustdag in de villa in Blimbing, dan de jeep-tour naar Bromo en Tumpak Sewu, en als afsluiter de nachtelijke Kawah Ijen-hike met blauwvuur." },
    { wie: ["arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"],
      uitleg: "Yogyakarta, Borobudur & Prambanan, dan Tumpak Sewu, Bromo en Kawah Ijen (zonder Matthew)." }
  ],
  bali: [
    { wie: ["arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"],
      uitleg: "7-daags programma: Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung.",
      desc: "Na de ferry vanuit Java werken de jongens een vol 7-daags Bali-programma af: surfen in Canggu, kliffen en Kecak in Uluwatu, een dagtrip naar Nusa Penida, tempels en rijstterrassen rond Ubud, wrakduiken bij Amed en als apotheose de zonsopgang op Mount Agung." }
  ],
  terug: [
    { wie: ["maurice","mathias","willem"],
      uitleg: "Doorreis Bali → Vietnam (datum TBD)." },
    { wie: ["arne","eliott","jens","kamiel","kasper"],
      uitleg: "Terugvlucht Bali → Brussel na het Bali-programma (datum TBD)." }
  ]
};

function faseTekst(faseKey, personKey) {
  for (const row of (FASE_TEKST_PP[faseKey] || [])) {
    if (row.wie.includes(personKey)) return row;
  }
  return null;
}

function getGroupUitleg(faseKey, tripIds, personKey) {
  if (faseKey === "java") {
    if (personKey === "hinke") {
      return "Samen met Matthew reist Hinke door Oost-Java: verblijf in de luxe Wonderhouz villa in Blimbing, jeep-tour naar Mount Bromo en de watervallen van Tumpak Sewu, met als afsluiter de nachtelijke beklimming van Kawah Ijen.";
    }
    
    const hasYogya = tripIds.some(id => id === "t8" || id === "t9");
    const hasSurabayaSplit = tripIds.some(id => id === "t10" || id === "t11");
    const hasBromoIjenWithHinke = tripIds.some(id => id === "t11b" || id === "t12" || id === "t13");
    const hasBoysVulkanen = tripIds.some(id => id === "t10b" || id === "t30" || id === "t30b");
    
    if (personKey === "matthew") {
      if (hasBromoIjenWithHinke) {
        return "Samen met Hinke reist Matthew door Oost-Java: verblijf in de luxe villa in Blimbing, jeep-tour naar Mount Bromo en de watervallen van Tumpak Sewu, en tot slot de nachtelijke klim van Kawah Ijen.";
      }
      if (hasSurabayaSplit) {
        return "Splitsing: Matthew splitst zich af van de jongens en wacht in Surabaya enkele dagen rustig af tot Hinke landt op 14 september.";
      }
      if (hasYogya) {
        return "Vlucht van Jakarta naar Yogyakarta voor cultuur en historie met de complete groep van 9. Bezoek aan de hindoetempel Prambanan, wandelen door Malioboro-straat, bezichtiging van de boeddhistische tempel Borobudur, en tot slot de nachttrein naar Malang.";
      }
    } else {
      if (hasYogya) {
        return "Vlucht van Jakarta naar Yogyakarta voor cultuur en historie met de complete groep van 9. Bezoek aan de hindoetempel Prambanan, wandelen door Malioboro-straat, bezichtiging van de boeddhistische tempel Borobudur, en tot slot de nachttrein naar Malang.";
      }
      if (hasBoysVulkanen) {
        return "Avontuurlijke expeditie door Oost-Java zonder Matthew: hike naar de gigantische Tumpak Sewu-watervallen, jeep-tour bij zonsopgang naar Mount Bromo, en de nachtelijke tocht naar het zwavelmeer en blauwvuur van Kawah Ijen.";
      }
    }
  }
  
  const tekstOv = faseTekst(faseKey, personKey);
  return (tekstOv && tekstOv.uitleg) || FASES[faseKey].uitleg || "";
}

const FASE_PHOTOS = {
  heen:    [],
  sg:      [],
  sumatra: ["images/ketambe_jungle.jpg", "images/sumatra_oerangoetang.jpg", "images/sumatra_Waterval.jpg"],
  jakarta: ["images/jakartanightskyline.jpg", "images/jakarta.jpg"],
  java:    ["images/airbnbM&H/15-16.avif", "images/Yogyakartatempel.jpg", "images/mountbromo.webp", "images/Ijen.jpeg", "images/tumpaksewuwaterval.webp", "images/airbnbM&H/15-16a.avif", "images/Yogyakartamonument.jpeg", "images/bromo.jpg", "images/bromoblauwvuur.jpeg", "images/airbnbM&H/15-16b.avif", "images/airbnbM&H/15-16c.avif", "images/airbnbM&H/15-16d.avif", "images/Yogyakartahandmonument.jpg"],
  flores:  ["images/Labuanbajo.jpg", "images/Flores.jpg"],
  komodo:  ["images/Komodovaraan.jpg", "images/komodo-national-park-1250x488.jpg.webp"],
  bali:    ["images/balivilla.jpg", "images/bali.jpg", "images/bali2.jpg", "images/bali4.jpg"],
  terug:   [],
};

/* ---------------- PERSONEN & GROEPSINFO ---------------- */
const PERSONS = {
  matthew: { name: "Matthew", color: "#0F6B5C" },
  hinke:   { name: "Hinke",   color: "#C8567D" },
  arne:    { name: "Arne",    color: "#5B7FB5" },
  eliott:  { name: "Eliott",  color: "#D97A2B" },
  jens:    { name: "Jens",    color: "#6B4E9C" },
  kamiel:  { name: "Kamiel",  color: "#4A8B3B" },
  maurice: { name: "Maurice", color: "#C8932B" },
  mathias: { name: "Mathias", color: "#1C8AA0" },
  willem:  { name: "Willem",  color: "#C75D3A" },
  kasper:  { name: "Kasper",  color: "#8A6D3B" }
};

const PERSON_ORDER = ["matthew","hinke","arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"];

const PERSON_TRIPS = {
  matthew: ["t1", "t3", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10", "t11", "t11b", "t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19", "t20", "t21", "t22", "t23"],
  hinke:   ["t41", "t11", "t11b", "t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19", "t20", "t21", "t22", "t23"],
  arne:    ["t1", "t3", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t38"],
  eliott:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t38"],
  jens:    ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t38"],
  kamiel:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t38"],
  maurice: ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t37"],
  kasper:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t38"],
  willem:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t37"],
  mathias: ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t31", "t32", "t33", "t34", "t35", "t36", "t37"]
};

const PERSON_GROUP_INFO = {
  matthew: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Matthew + Arne (Brussel → Singapore → Medan, SQ303+SQ990, korte overstap Changi); 30-31/08 overnachting in Medan, wachten op de rest</li>
      <li><b>01/09, Medan:</b> Ontmoeting met Kamiel, Eliott, Kasper & Willem (vlucht vanuit Jakarta) — alle 6 man naar Ketambe</li>
      <li><b>08/09, Jakarta:</b> Maurice, Mathias & Jens sluiten aan — crew compleet met 9 man voor Java</li>
      <li><b>11/09, Malang:</b> Matthew splitst af naar Surabaya; de jongens gaan naar Tumpak Sewu/Bromo</li>
      <li><b>14/09, Surabaya:</b> Hinke landt, vanaf hier reizen Matthew & Hinke samen</li>
      <li><b>29/09:</b> Terugvlucht Bali → Brussel (samen met Hinke)</li>
    </ul>
  `,
  hinke: `
    <ul class="details" style="font-size:14.5px">
      <li><b>13/09 – 14/09:</b> Vlucht Brussel → Singapore → Surabaya (Hinke)</li>
      <li><b>14/09:</b> Hinke landt om 08:00 uur in Surabaya.</li>
      <li><b>14/09 – 29/09:</b> Reist samen met Matthew (Surabaya → Bromo/Ijen → Flores → Komodo → Bali).</li>
      <li><b>Reisgezelschap:</b> Exclusief met Matthew. De andere jongens zijn al eerder naar huis of reizen apart.</li>
      <li><b>29/09:</b> Terugvlucht Bali → Brussel (samen met Matthew)</li>
    </ul>
  `,
  arne: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Samen met Matthew (Brussel → Singapore → Medan, SQ303+SQ990, korte overstap Changi); 30-31/08 overnachting in Medan, wachten op de rest</li>
      <li><b>01/09 – 07/09:</b> Met de jongens de Sumatra-jungle in (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep compleet met 9 man)</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Eliott, Jens, Kamiel & Kasper) — TBD</li>
    </ul>
  `,
  eliott: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta (SQ 303 + SQ 956); aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Arne, Jens, Kamiel & Kasper) — TBD</li>
    </ul>
  `,
  jens: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (SQ303+SQ952, boekingsref. FSXOOZ, samen met Maurice & Mathias)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Maurice & Mathias).</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang).</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo.</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Arne, Eliott, Kamiel & Kasper) — TBD</li>
    </ul>
  `,
  kamiel: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta (SQ 303 + SQ 956); aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Arne, Eliott, Jens & Kasper) — TBD</li>
    </ul>
  `,
  maurice: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (SQ303+SQ952, samen met Mathias & Jens)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Mathias & Jens).</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang).</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo.</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Vlucht Bali → Vietnam (samen met Willem & Mathias) — TBD</li>
    </ul>
  `,
  kasper: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta (SQ 303 + SQ 956); aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Arne, Eliott, Jens & Kamiel) — TBD</li>
    </ul>
  `,
  willem: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta (SQ 303 + SQ 956); aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe (7-8u)</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (5d/4n, all-in ~160 €/pp) — met Matthew, Arne, Kasper, Eliott, Kamiel</li>
      <li><b>07/09:</b> Taxi Ketambe → Medan, vlucht Medan → Jakarta</li>
      <li><b>08/09:</b> Jakarta — Maurice & Mathias komen toe (08:25), groep compleet</li>
      <li><b>09/09:</b> Trein Jakarta → Yogyakarta, Prambanan tempel, Malioboro</li>
      <li><b>10/09:</b> Borobudur vroeg 's ochtends, nachttrein Yogyakarta → Malang</li>
      <li><b>11/09:</b> Tumpak Sewu waterval (2,5u rijden), dan naar Combu Lawang</li>
      <li><b>12/09:</b> 3u 's nachts op voor Mount Bromo, taxi Bromo → Banyuwangi</li>
      <li><b>13/09:</b> 1u 's nachts op voor Kawah Ijen, taxi → Ketapang, ferry → Bali</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Vlucht Bali → Vietnam (samen met Mathias & Momo) — TBD</li>
    </ul>
  `,
  mathias: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (SQ303+SQ952, samen met Maurice & Jens)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Maurice & Jens).</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang).</li>
      <li><b>11/09 – 12/09:</b> Zonder Matthew naar Tumpak Sewu & Bromo.</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Vlucht Bali → Vietnam (samen met Willem & Momo) — TBD</li>
    </ul>
  `
};

/* ---------------- KOSTEN (VOLLEDIG SYNC MET HOME PAGE) ---------------- */
const COSTS = {
  c1:  { label: "Vlucht BRU → Singapore → Medan (Singapore Airlines, SQ303+SQ990)", cat: "vlucht", amount: null },
  c2:  { label: "Vlucht Singapore → Medan (Scoot)", cat: "vlucht", amount: 71 },
  c3:  { label: "Taxi/minibus Medan → Ketambe", cat: "transport", amount: 20 },
  c4:  { label: "Jungle trekking Ketambe (5d/4n, all-in)", cat: "activiteit", amount: 196 },
  c4b: { label: "Overnachting guesthouse Ketambe (2n, vóór + na trek)", cat: "accommodatie", amount: null },
  c5:  { label: "Taxi/minibus Ketambe → Medan", cat: "transport", amount: 20 },
  c6:  { label: "Vlucht Jakarta ↔ Medan (Lion Air)", cat: "vlucht", amount: 212 },
  c7:  { label: "Trein Jakarta → Yogyakarta", cat: "transport", amount: 20 },
  c7b: { label: "Tempels entree (Borobudur + Prambanan)", cat: "activiteit", amount: 40 },
  c8:  { label: "Nachttrein Yogyakarta → Malang", cat: "transport", amount: 15 },
  c9:  { label: "Overnachting Surabaya (1n)", cat: "accommodatie", amount: 40 },
  c10: { label: "Overnachting Banyuwangi (2n)", cat: "accommodatie", amount: 55, url: "https://www.airbnb.com/rooms/1420571119911855020" },
  c11: { label: "Vlucht Java → Denpasar → Labuan Bajo", cat: "vlucht", amount: null },
  c12: { label: "Overnachting Labuan Bajo (3n)", cat: "accommodatie", amount: 55, url: "https://www.airbnb.com/rooms/1202849662764744783" },
  c13: { label: "Overnachting Ruteng (2n)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/50427330" },
  c14: { label: "Overnachting Labuan Bajo, terugkeer (3n)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/1202849662764744783" },
  c15: { label: "Vlucht Labuan Bajo → Bali", cat: "vlucht", amount: null },
  c16: { label: "Bali villa (26-29 sep)", cat: "accommodatie", amount: 101 },
  c17: { label: "Terugvlucht Bali → huis", cat: "vlucht", amount: null },
  c18: { label: "Hotel Singapore (2n)", cat: "accommodatie", amount: 90 },
  c19: { label: "Hotel Jakarta (1n)", cat: "accommodatie", amount: 35 },
  c20: { label: "Hotel Yogyakarta (1n)", cat: "accommodatie", amount: 30 },
  c21: { label: "Bromo + Tumpak Sewu (jeep-tour + entree, met Hinke)", cat: "activiteit", amount: 25 },
  c22: { label: "Kawah Ijen (entree + gids)", cat: "activiteit", amount: 18 },
  c23: { label: "Komodo dagtour (boot, Padar + Pink Beach + Komodo + Manta)", cat: "activiteit", amount: 68 },
  c24: { label: "Hotel Surabaya (11–13/09, 3n, wachten op Hinke)", cat: "accommodatie", amount: 75 },
  c25: { label: "Villa Blimbing, Wonderhouz Premium (15-16/09, 1n, met Hinke)", cat: "accommodatie", amount: 40, url: "https://www.airbnb.com/rooms/1574650852556499790" },
};

/* ---------------- SVG KAART COÖRDINATEN ---------------- */
const PTS = {
  brussel:    { x: 50, y: 120, label: "Brussel", dx: 5, dy: -10, anchor: "middle" },
  bru:        { x: 50, y: 120, label: "BRU",     dx: 5, dy: -10, anchor: "middle" },
  singapore:  { x: 304, y: 112, label: "Singapore", dx: 9, dy: 3, anchor: "start" },
  medan:      { x: 143, y: 61,  label: "Medan", dx: 9, dy: 3, anchor: "start" },
  ketambe:    { x: 112, y: 58,  label: "Ketambe", dx: -9, dy: 3, anchor: "end" },
  jakarta:    { x: 399, y: 285, label: "Jakarta", dx: 9, dy: 3, anchor: "start" },
  yogya:      { x: 508, y: 321, label: "Yogyakarta", dx: -9, dy: 10, anchor: "end" },
  malang:     { x: 579, y: 325, label: "Malang", dx: 9, dy: 14, anchor: "start" },
  surabaya:   { x: 583, y: 309, label: "Surabaya", dx: 9, dy: -6, anchor: "start" },
  banyuwangi: { x: 634, y: 331, label: "Banyuwangi", dx: 9, dy: -6, anchor: "start" },
  bali:       { x: 660, y: 341, label: "Bali (Denpasar)", dx: 9, dy: 6, anchor: "start" },
  labuanbajo: { x: 806, y: 337, label: "Labuan Bajo", dx: -9, dy: -6, anchor: "end" },
  ruteng:     { x: 824, y: 340, label: "Ruteng", dx: 9, dy: 8, anchor: "start" },
  padar:      { x: 775, y: 360, label: "Padar Island", dx: 0, dy: 14, anchor: "middle" },
  pink_beach: { x: 750, y: 345, label: "Pink Beach", dx: -8, dy: 4, anchor: "end" },
  komodo:     { x: 745, y: 325, label: "Komodo", dx: -8, dy: -4, anchor: "end" },
  manta_point:{ x: 775, y: 310, label: "Manta Point", dx: 0, dy: -10, anchor: "middle" },
  prambanan:  { x: 520, y: 315, label: "Prambanan", dx: 0, dy: -8, anchor: "middle" },
  borobudur:  { x: 495, y: 310, label: "Borobudur", dx: 0, dy: -8, anchor: "middle" },
  tumpak_sewu:{ x: 570, y: 335, label: "Tumpak Sewu", dx: 0, dy: 15, anchor: "middle" },
  bromo:      { x: 595, y: 315, label: "Mount Bromo", dx: 0, dy: -8, anchor: "middle" },
  ijen:       { x: 625, y: 325, label: "Kawah Ijen", dx: 0, dy: -8, anchor: "middle" },
  canggu:     { x: 650, y: 335, label: "Canggu", dx: 0, dy: 10, anchor: "middle" },
  uluwatu:    { x: 655, y: 350, label: "Uluwatu", dx: 0, dy: 10, anchor: "middle" },
  nusa_penida:{ x: 675, y: 350, label: "Nusa Penida", dx: 0, dy: 10, anchor: "middle" },
  ubud:       { x: 665, y: 330, label: "Ubud", dx: 0, dy: -8, anchor: "middle" },
  amed:       { x: 680, y: 325, label: "Amed", dx: 0, dy: -8, anchor: "middle" },
  sidemen:    { x: 670, y: 335, label: "Sidemen", dx: 0, dy: 10, anchor: "middle" },
  agung:      { x: 675, y: 320, label: "Mt Agung", dx: 0, dy: -8, anchor: "middle" }
};

/* ---------------- CENTRALE REIS ITINERARY (TRIP) ---------------- */
const TRIP = [
  { id:"t1", fase:"heen", start:"2026-08-29", end:"2026-08-30", title:"✈️ Brussel → Singapore → Medan (met Arne)", details:["✈️ Vertrekt: 29 aug om 11:45 | Aankomst: 30 aug om 08:00", "SQ303: BRU 11:45 (29/08) → SIN 06:40 (30/08), Singapore Airlines. Overstap 50 min in Changi. SQ990: SIN 07:30 → Medan (KNO) 08:00 (30/08)."], costs:["c1"], map:["brussel","singapore","medan"], duration: "11u (4u +3u)" },
  { id:"t3", fase:"sumatra", start:"2026-08-30", end:"2026-08-31", title:"🏨 Medan — aankomst & wachten op de rest", details:["Matthew & Arne overnachten twee nachten in Medan. Op 01/09 ontmoeten zij Kamiel, Eliott, Kasper & Willem die arriveren vanuit Jakarta, waarna ze samen naar Ketambe vertrekken."], costs:[], map:["medan"] },
  { id:"t4", fase:"sumatra", start:"2026-09-01", end:"2026-09-01", title:"🚐 Medan → Ketambe — alle 6 man samen", details:["Alle 6 man: Matthew, Arne, Willem, Kasper, Eliott, Kamiel. Matthew & Arne sliepen de nacht ervoor al in Medan. Kamiel, Eliott, Kasper & Willem arriveren met vlucht vanuit Jakarta. Na aankomst samen taxi naar Ketambe (rit ±7-8u). Overnachting in guesthouse Ketambe, geregeld door gids Hasby."], costs:["c3","c4b"], map:["medan","ketambe"], duration: "7-8u" },
  { id:"t5", fase:"sumatra", start:"2026-09-02", end:"2026-09-06", title:"🥾 Jungle trekking — Ketambe", details:["Adventure Jungle Trekking (5D/4N) bij gids Hasby Ketambe, IDR 800.000 pp/dag all-in (gids, porters, maaltijden, kampeermateriaal, permits). Aanbetaling van 8% (IDR 1.920.000) al overgemaakt op 03/07; restbedrag wordt ter plaatse betaald (cash of overschrijving)."], costs:["c4"], map:["ketambe"] },
  { id:"t6", fase:"sumatra", start:"2026-09-07", end:"2026-09-07", title:"🚐 Ketambe → Medan", details:["Overnachting in guesthouse Ketambe na afloop van de trek, geregeld door gids Hasby."], costs:["c5","c4b"], map:["ketambe","medan"], duration: "~7-8u taxi" },
  { id:"t6b", fase:"jakarta", start:"2026-09-07", end:"2026-09-07", title:"✈️ Medan → Jakarta (vlucht)", details:[], costs:["c6"], map:["medan","jakarta"], duration: "~1.5u vlucht" },
  { id:"t7", fase:"jakarta", start:"2026-09-08", end:"2026-09-08", title:"🏙️ Jakarta — Maurice, Mathias & Jens sluiten aan", details:[], costs:["c19"], map:["jakarta"] },
  { id:"t8", fase:"java", start:"2026-09-09", end:"2026-09-09", title:"🚂 Jakarta → Yogyakarta", details:[], costs:["c7","c7b","c20"], map:["jakarta","prambanan","yogya"], duration: "~1u vlucht" },
  { id:"t9", fase:"java", start:"2026-09-10", end:"2026-09-10", title:"🚂 Yogyakarta → nachttrein naar Malang", details:[], costs:["c8"], map:["yogya","borobudur","malang"], duration: "~10u (nacht)" },
  { id:"t10", fase:"java", start:"2026-09-11", end:"2026-09-13", title:"🚗 Splitsingspunt — Matthew wacht in Surabaya, jongens → Bromo", details:[], costs:["c24"], map:["malang","surabaya"] },
  { id:"t10b", fase:"java", start:"2026-09-11", end:"2026-09-12", title:"🌋 Tumpak Sewu & Bromo (jongens, zonder Matthew)", details:["11/09: Tumpak Sewu waterval (±2,5u rijden vanuit Malang). 12/09: om 3u 's nachts op voor Mount Bromo, daarna taxi naar Banyuwangi."], costs:[], map:["malang","tumpak_sewu","bromo","banyuwangi"] },
  { id:"t11", fase:"java", start:"2026-09-14", end:"2026-09-15", title:"💑 Hinke landt in Surabaya — ze zijn samen", details:[], costs:["c9"], map:["surabaya"] },
  { id:"t11b", fase:"java", start:"2026-09-15", end:"2026-09-16", title:"🏡 Villa in Blimbing — rustdag", details:["Wonderhouz Premium Villa, hosted by Irene Iola Auxilia. Check-in Tue Sep 15 at 3:00 PM, check-out Wed Sep 16 at 12:00 PM. Adres: No 2C Breezia Villa, Allegro Cluster, Blimbing. Confirmation: HMJFAKQ8FH."], costs:["c25"], map:["malang"] },
  { id:"t12", fase:"java", start:"2026-09-16", end:"2026-09-16", title:"🌋 Bromo + Tumpak Sewu", details:[], costs:["c10","c21"], map:["malang","tumpak_sewu","bromo","banyuwangi"], duration: "~2.5u rijden" },
  { id:"t13", fase:"java", start:"2026-09-17", end:"2026-09-17", title:"🔥 Kawah Ijen", details:[], costs:["c22"], map:["banyuwangi","ijen"] },
  { id:"t14", fase:"flores", start:"2026-09-18", end:"2026-09-18", title:"✈️ Java → Bali → Flores", details:[], costs:["c11"], map:["banyuwangi","bali","labuanbajo"], duration: "~1.5u + ~2.5u" },
  { id:"t15", fase:"flores", start:"2026-09-19", end:"2026-09-19", title:"🌅 Labuan Bajo — aankomen & relax", details:[], costs:["c12"], map:["labuanbajo"] },
  { id:"t16", fase:"flores", start:"2026-09-20", end:"2026-09-20", title:"🍹 Labuan Bajo — chill + omgeving", details:[], costs:[], map:["labuanbajo"] },
  { id:"t17", fase:"flores", start:"2026-09-21", end:"2026-09-22", title:"⛰️ Ruteng (binnenland)", details:[], costs:["c13"], map:["labuanbajo","ruteng"] },
  { id:"t18", fase:"flores", start:"2026-09-23", end:"2026-09-23", title:"🚗 Terug naar Labuan Bajo regio", details:[], costs:["c14"], map:["ruteng","labuanbajo"] },
  { id:"t19", fase:"komodo", start:"2026-09-24", end:"2026-09-24", title:"🦎 Komodo National Park — full day boottour", details:[], costs:["c23"], map:["labuanbajo","padar","pink_beach","komodo","manta_point","labuanbajo"] },
  { id:"t20", fase:"komodo", start:"2026-09-25", end:"2026-09-25", title:"🏖️ Relaxdag Labuan Bajo", details:[], costs:[], map:["labuanbajo"] },
  { id:"t21", fase:"bali", start:"2026-09-26", end:"2026-09-26", title:"✈️ Labuan Bajo → Bali", details:[], costs:["c15"], map:["labuanbajo","bali"] },
  { id:"t22", fase:"bali", start:"2026-09-26", end:"2026-09-28", title:"🏖️ Bali — luxe & chill", details:[], costs:["c16"], map:["bali"] },
  { id:"t23", fase:"terug", start:"2026-09-29", end:"2026-09-29", title:"✈️ Terug naar huis", details:["✈️ Vertrekt: 29 sep (TBD) | Aankomst: 29 sep (TBD)"], costs:["c17"], map:["bali","brussel"], duration: "~20u" },
  { id:"t27", fase:"heen", start:"2026-08-29", end:"2026-08-30", title:"✈️ Brussel → Singapore → Jakarta (Kamiel, Eliott, Kasper, Willem)", details:["✈️ Vertrekt: 29 aug om 11:45 | Aankomst: 30 aug om 09:55", "SQ 303: BRU 11:45 (29/08) → SIN 06:40 (30/08). Layover 2u25 in Changi (Singapore). SQ 956: SIN 09:05 → CGK 09:55 (30/08), aankomst Jakarta Soekarno Intl T3. Beide segmenten: Airbus A350-900, Economy."], costs:[], map:["brussel","singapore","jakarta"], duration: "12u (4u +2.5u +7u)" },
  { id:"t28", fase:"heen", start:"2026-08-30", end:"2026-08-31", title:"🏙️ Jakarta — aankomst & acclimatiseren (Kamiel, Eliott, Kasper, Willem)", details:["Aankomst 30/08 om 09:55 op Jakarta Soekarno Intl T3. Twee nachten Jakarta (30 en 31 aug): stad verkennen."], costs:[], map:["jakarta"] },
  { id:"t29", fase:"heen", start:"2026-09-01", end:"2026-09-01", title:"✈️ Jakarta → Medan (Kamiel, Eliott, Kasper, Willem)", details:["Vlucht Jakarta (CGK) → Medan. Ontmoeting met Matthew & Arne in Medan. Aansluitend met alle 6 man taxi naar Ketambe (±7-8u)."], costs:["c6"], map:["jakarta","medan"], duration: "~1.5u vlucht + 7-8u taxi" },
  { id:"t30", fase:"java", start:"2026-09-13", end:"2026-09-13", title:"🔥 Kawah Ijen 's nachts (alle jongens)", details:["Om 1u 's nachts op voor de Kawah Ijen-hike: blauwvuur en zwavelmeer bij zonsopgang."], costs:["c22"], map:["banyuwangi","ijen"], duration: "~4-5u hike" },
  { id:"t30b", fase:"bali", start:"2026-09-13", end:"2026-09-13", title:"🚢 Ferry naar Bali → Canggu (alle jongens)", details:["Na de Kawah Ijen-hike taxi naar Ketapang, dan ferry naar Gilimanuk (Bali), en doorrijden naar Canggu."], costs:[], map:["banyuwangi","canggu"], duration: "~3-4u totaal" },
  { id:"t31", fase:"bali", start:"2026-09-13", end:"2026-09-14", title:"🏄 Bali dag 1–2 — Canggu", details:["Surfen: Batu Bolong Beach (zachte golven, ideaal voor beginners), Echo Beach (iets pittiger), Old Man's (relaxte sfeer). Zonsondergang bij beachclubs: Old Man's, La Brisa of Finns. Optioneel stop: Tanah Lot klieftempel in zee."], costs:[], map:["canggu"] },
  { id:"t32", fase:"bali", start:"2026-09-14", end:"2026-09-15", title:"🛕 Bali dag 2–3 — Uluwatu", details:["Uluwatu Temple: klieftempel + Kecak dance bij zonsondergang. Surfen op Uluwatu/Padang Padang (gevorderde reef breaks) en Bingin & Impossibles. Single Fin: legendarische sunset-bar boven de golven. Suluban (Blue Point) strand bereikbaar via een grot. Bingin Beach: chille vibe met warungs en cliffside cafés."], costs:[], map:["canggu","uluwatu"] },
  { id:"t33", fase:"bali", start:"2026-09-16", end:"2026-09-16", title:"🏝️ Bali dag 4 — Nusa Penida", details:["Vroege boot vanaf Sanur. Kelingking Beach: iconisch T-rex-uitzicht, eventueel afdalen. Broken Beach: natuurlijke rotsboog boven turquoise water. Angel's Billabong: natuurlijk zwembad in de rotsen. Snorkelen met manta rays (beroemde mantapunt). Crystal Bay voor extra snorkelen."], costs:[], map:["uluwatu","nusa_penida"] },
  { id:"t34", fase:"bali", start:"2026-09-17", end:"2026-09-17", title:"🌾 Bali dag 5 — Ubud", details:["Tegalalang Rice Terrace: iconische groene terrassen met swings. Tirta Empul: heilige waterbrontempel, reinigingsritueel mogelijk. Monkey Forest: bosreservaat met apen en oude tempels. Campuhan Ridge Walk bij zonsopgang. Optioneel: Balinese kookles met marktbezoek of Tegenungan waterval."], costs:[], map:["nusa_penida","ubud"] },
  { id:"t35", fase:"bali", start:"2026-09-18", end:"2026-09-18", title:"🤿 Bali dag 6 — Amed & Tulamben", details:["USAT Liberty Wreck: wereldberoemde wrakduik, ook goed te snorkelen. Coral Garden: snorkelspot met kleurrijk rif vlak bij de kust. Freediving sessie: Amed staat bekend om intro's en cursussen. Jemeluk Bay voor een ontspannen snorkelsessie. Uitzicht op Mount Agung vanaf rustige stranden."], costs:[], map:["ubud","amed"] },
  { id:"t36", fase:"bali", start:"2026-09-19", end:"2026-09-19", title:"🌋 Bali dag 7 — Sidemen & Mount Agung", details:["Sidemen rijstterrassen: rustige wandeling, minder toeristisch dan Ubud. Besakih Temple: moedertempel van Bali, aan de voet van Agung. Mount Agung sunrise hike: middernacht vertrek, 4–6u klimmen, episch uitzicht op Lombok. Verplichte lokale gids (max. 3 pp/gids, verplicht since 2025). Herstel 's middags, eventueel hot springs."], costs:[], map:["amed","sidemen","agung"] },
  { id:"t37", fase:"terug", start:"2026-09-19", end:"2026-09-20", title:"✈️ Bali → Vietnam (Mathias, Willem, Momo) — TBD", details:["✈️ Vertrekt: 19 sep (TBD) | Aankomst: 20 sep (TBD)", "Na het volledige 7-daagse programma vliegen Mathias, Willem en Momo door naar Vietnam. Exacte vluchtdatum en bestemming nog te bevestigen."], costs:[], map:["agung","bali"], openNote: true, duration: "~2-3u vlucht" },
  { id:"t38", fase:"terug", start:"2026-09-19", end:"2026-09-20", title:"✈️ Terugvlucht Bali → Brussel (Arne, Eliott, Jens, Kamiel, Kasper) — TBD", details:["✈️ Vertrekt: 19 sep (TBD) | Aankomst: 20 sep (TBD)", "Alle 5 vliegen terug naar Brussel na afloop van het volledige 7-daagse Bali-programma. Exacte datum/tijd TBD."], costs:[], map:["agung","bali","brussel"], openNote: true, duration: "~20u" },
  { id:"t39", fase:"heen", start:"2026-09-07", end:"2026-09-08", title:"✈️ Brussel → Jakarta (Maurice, Mathias, Jens)", details:["✈️ Vertrekt: 7 sep om 11:45 | Aankomst: 8 sep om 08:25", "SQ303: BRU 11:45 (07/09) → SIN 06:40 (08/09), Singapore Airlines Airbus A350-900. Overstap 1u in Changi T2. SQ952: SIN 07:40 → CGK 08:25 (08/09), Airbus A350-900, aankomst Soekarno-Hatta T3.", "Boekingsref. Jens: FSXOOZ (ticket 618-2479864879), ticketprijs €680,77 pp. Maurice en Mathias nemen dezelfde vlucht."], costs:[], map:["brussel","jakarta"], duration: "15u40" },
  { id:"t41", fase:"heen", start:"2026-09-13", end:"2026-09-14", title:"✈️ Brussel → Singapore → Surabaya (Hinke)", details:["✈️ Vertrekt: 13 sep om ~13:00 | Aankomst: 14 sep om 08:00", "Vlucht Hinke naar Surabaya om daar bij Matthew aan te sluiten."], costs:[], map:["brussel","singapore","surabaya"], duration: "~19u" },
];

/* ---------------- TRANSPORT LEGS (GESYNCHRONISEERD MET HOME PAGE) ---------------- */
const TRANSPORT_LEGS = [
  {
    id:"tl1", type:"int_vlucht", icon:"✈️",
    date:"2026-08-29", dateD:"29", dateM:"aug",
    fromIATA:"BRU", toIATA:"KNO",
    fromLabel:"Brussel Airport", toLabel:"Medan Kualanamu (via Singapore)",
    title:"Brussel → Singapore → Medan (Matthew & Arne)",
    sub:"Singapore Airlines · SQ303 (BRU→SIN) + SQ990 (SIN→KNO)",
    operator:"Singapore Airlines", flightNum:"SQ303 + SQ990",
    terminal:"Pier B → Changi T2",
    times:"11:45 (29/08) → 08:00 (30/08)", cost_id:"c1", ref:"SQ-MA29",
    fromPt:"brussel", toPt:"medan", qx:150, qy:45,
    persons:["matthew","arne"]
  },
  {
    id:"tl19", type:"int_vlucht", icon:"✈️",
    date:"2026-08-29", dateD:"29", dateM:"aug",
    fromIATA:"BRU", toIATA:"CGK",
    fromLabel:"Brussel Airport", toLabel:"Jakarta Soekarno-Hatta (via SIN)",
    title:"Brussel → Singapore → Jakarta (Eliott, Kamiel, Willem, Kasper)",
    sub:"Singapore Airlines · SQ303 (BRU→SIN) + SQ956 (SIN→CGK)",
    operator:"Singapore Airlines", flightNum:"SQ303 + SQ956",
    terminal:"Pier B → Changi T3",
    times:"11:45 (29/08) → 09:55 (30/08)", cost_id:null, ref:"SQ-EKWK29",
    fromPt:"brussel", toPt:"jakarta", qx:150, qy:45,
    persons:["eliott","kamiel","willem","kasper"]
  },
  {
    id:"tl20", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-01", dateD:"01", dateM:"sep",
    fromIATA:"CGK", toIATA:"KNO",
    fromLabel:"Jakarta Soekarno-Hatta", toLabel:"Medan Kualanamu",
    title:"Jakarta → Medan",
    sub:"Lion Air · JT204 · ±2u 15m",
    operator:"Lion Air", flightNum:"JT204",
    terminal:"Terminal 2D, Gate 7",
    times:"08:05 → 10:20", cost_id:"c6", ref:"JTJK9A",
    fromPt:"jakarta", toPt:"medan", qx:250, qy:130,
    persons:["eliott","kamiel","willem","kasper"]
  },
  {
    id:"tl3", type:"bus_auto", icon:"🚌",
    date:"2026-09-01", dateD:"01", dateM:"sep",
    fromIATA:"MED", toIATA:"KTB",
    fromLabel:"Medan Kualanamu", toLabel:"Ketambe Guesthouse",
    title:"Medan → Ketambe (privé minibus)",
    sub:"Lokaal vervoer · ±7–8u rit door Sumatra",
    operator:"Privé minibus", flightNum:null,
    terminal:null, times:"07:00 → ±15:00", cost_id:"c3", ref:"MVK-0901",
    fromPt:"medan", toPt:"ketambe", qx:null, qy:null,
    persons:["matthew","arne","eliott","kamiel","willem","kasper"]
  },
  {
    id:"tl4", type:"bus_auto", icon:"🚌",
    date:"2026-09-07", dateD:"07", dateM:"sep",
    fromIATA:"KTB", toIATA:"MED",
    fromLabel:"Ketambe", toLabel:"Medan Kualanamu",
    title:"Ketambe → Medan (taxi retour)",
    sub:"Privé taxi · ±7–8u",
    operator:"Lokale chauffeur", flightNum:null,
    terminal:null, times:"06:00 → ±14:00", cost_id:"c5", ref:"MVK-0907R",
    fromPt:"ketambe", toPt:"medan", qx:null, qy:null,
    persons:["matthew","arne","eliott","kamiel","willem","kasper"]
  },
  {
    id:"tl5", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-07", dateD:"07", dateM:"sep",
    fromIATA:"KNO", toIATA:"CGK",
    fromLabel:"Medan Kualanamu", toLabel:"Jakarta Soekarno-Hatta",
    title:"Medan → Jakarta",
    sub:"Lion Air · JT383 · ±2u 25m",
    operator:"Lion Air", flightNum:"JT383",
    terminal:"Terminal 2D, Gate 3",
    times:"19:00 → 21:25", cost_id:"c6", ref:"JT383R",
    fromPt:"medan", toPt:"jakarta", qx:250, qy:130,
    persons:["matthew","arne","eliott","kamiel","willem","kasper"]
  },
  {
    id:"tl6", type:"trein", icon:"🚂",
    date:"2026-09-09", dateD:"09", dateM:"sep",
    fromIATA:"JKT", toIATA:"YOG",
    fromLabel:"Jakarta Gambir", toLabel:"Yogyakarta Tugu",
    title:"Jakarta → Yogyakarta (Argo Bromo Anggrek)",
    sub:"KAI · Argo Bromo Anggrek · ±8u",
    operator:"KAI (Kereta Api Indonesia)", flightNum:"Argo Bromo Anggrek",
    terminal:"Spoor 5, Gambir Station",
    times:"06:00 → 14:00", cost_id:"c7", ref:"KAI-AG0909",
    fromPt:"jakarta", toPt:"yogya", qx:null, qy:null,
    persons:["matthew","arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl7", type:"trein", icon:"🚂",
    date:"2026-09-10", dateD:"10", dateM:"sep",
    fromIATA:"YOG", toIATA:"MLG",
    fromLabel:"Yogyakarta Tugu", toLabel:"Malang Kotalama",
    title:"Yogyakarta → Malang (nachttrein)",
    sub:"KAI · Malioboro Express · ±7u 's nachts",
    operator:"KAI", flightNum:"Malioboro Express",
    terminal:"Spoor 2, Yogyakarta Tugu",
    times:"21:30 → 04:30+1", cost_id:"c8", ref:"KAI-ML1009",
    fromPt:"yogya", toPt:"malang", qx:null, qy:null,
    persons:["matthew","arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl8", type:"bus_auto", icon:"🚖",
    date:"2026-09-11", dateD:"11", dateM:"sep",
    fromIATA:"MLG", toIATA:"SUB",
    fromLabel:"Malang Station", toLabel:"Surabaya Hotel",
    title:"Malang → Surabaya (Matthew afsplitsing)",
    sub:"Privé taxi · ±2u via tolweg",
    operator:"Blue Bird Taxi", flightNum:null,
    terminal:null, times:"Ochtend", cost_id:null, ref:null,
    fromPt:"malang", toPt:"surabaya", qx:null, qy:null,
    persons:["matthew"]
  },
  {
    id:"tl9", type:"bus_auto", icon:"🚙",
    date:"2026-09-11", dateD:"11", dateM:"sep",
    fromIATA:"MLG", toIATA:"PRO",
    fromLabel:"Malang", toLabel:"Probolinggo / Bromo regio",
    title:"Malang → Tumpak Sewu → Bromo (8 jongens)",
    sub:"Jeep & minibus charter · volle dag tour",
    operator:"Bromo Tour Co.", flightNum:null,
    terminal:null, times:"06:00 → 17:00", cost_id:"c21", ref:"BRM-0911",
    fromPt:"malang", toPt:"banyuwangi", qx:null, qy:null,
    persons:["arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl10", type:"int_vlucht", icon:"✈️",
    date:"2026-09-13", dateD:"13", dateM:"sep",
    fromIATA:"BRU", toIATA:"SUB",
    fromLabel:"Brussel Airport", toLabel:"Surabaya Juanda",
    title:"Brussel → Surabaya (Hinke)",
    sub:"Singapore Airlines · aankomst 14/09 om 08:00",
    operator:"Singapore Airlines", flightNum:"SQ303 + SQ930",
    terminal:"Pier B", times:"13:00 → 08:00+1", cost_id:null, ref:"HNKE-SQ",
    fromPt:"brussel", toPt:"surabaya", qx:150, qy:45,
    persons:["hinke"]
  },
  {
    id:"tl11", type:"bus_auto", icon:"🚙",
    date:"2026-09-16", dateD:"16", dateM:"sep",
    fromIATA:"MLG", toIATA:"BWX",
    fromLabel:"Malang (Blimbing Villa)", toLabel:"Banyuwangi (via Bromo & Tumpak Sewu)",
    title:"Malang → Bromo & Tumpak Sewu → Banyuwangi (Matthew & Hinke)",
    sub:"Privé jeep tour met chauffeur",
    operator:"Java Adventure Tour", flightNum:null,
    terminal:null, times:"Vroeg → Avond", cost_id:"c21", ref:"MH-BRM16",
    fromPt:"malang", toPt:"banyuwangi", qx:null, qy:null,
    persons:["matthew","hinke"]
  },
  {
    id:"tl12", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-18", dateD:"18", dateM:"sep",
    fromIATA:"SUB", toIATA:"LBJ",
    fromLabel:"Surabaya Juanda", toLabel:"Labuan Bajo Komodo Airport",
    title:"Java → Denpasar → Labuan Bajo (Matthew & Hinke)",
    sub:"Garuda Indonesia / Citilink · via Bali",
    operator:"Garuda Indonesia", flightNum:"GA402",
    terminal:"Terminal 1", times:"09:00 → 13:30", cost_id:"c11", ref:"GA-MH18",
    fromPt:"surabaya", toPt:"labuanbajo", qx:690, qy:280,
    persons:["matthew","hinke"]
  },
  {
    id:"tl13", type:"bus_auto", icon:"🚙",
    date:"2026-09-21", dateD:"21", dateM:"sep",
    fromIATA:"LBJ", toIATA:"RTG",
    fromLabel:"Labuan Bajo", toLabel:"Ruteng",
    title:"Labuan Bajo → Ruteng (binnenland Flores)",
    sub:"Privé auto door bergen · ±4u",
    operator:"Flores Driver", flightNum:null,
    terminal:null, times:"Ochtend", cost_id:null, ref:null,
    fromPt:"labuanbajo", toPt:"ruteng", qx:null, qy:null,
    persons:["matthew","hinke"]
  },
  {
    id:"tl14", type:"bus_auto", icon:"🚙",
    date:"2026-09-23", dateD:"23", dateM:"sep",
    fromIATA:"RTG", toIATA:"LBJ",
    fromLabel:"Ruteng", toLabel:"Labuan Bajo",
    title:"Ruteng → Labuan Bajo (terugrit)",
    sub:"Privé auto door bergen · ±4u",
    operator:"Flores Driver", flightNum:null,
    terminal:null, times:"Ochtend", cost_id:null, ref:null,
    fromPt:"ruteng", toPt:"labuanbajo", qx:null, qy:null,
    persons:["matthew","hinke"]
  },
  {
    id:"tl15", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-26", dateD:"26", dateM:"sep",
    fromIATA:"LBJ", toIATA:"DPS",
    fromLabel:"Labuan Bajo Komodo Airport", toLabel:"Bali Denpasar Ngurah Rai",
    title:"Labuan Bajo → Bali",
    sub:"Indonesia AirAsia · QZ503 · ±1u 10m",
    operator:"Indonesia AirAsia", flightNum:"QZ503",
    terminal:"Gate 2", times:"11:15 → 12:25", cost_id:"c15", ref:"QZ503B",
    fromPt:"labuanbajo", toPt:"bali", qx:730, qy:370,
    persons:["matthew","hinke"]
  },
  {
    id:"tl16", type:"int_vlucht", icon:"✈️",
    date:"2026-09-29", dateD:"29", dateM:"sep",
    fromIATA:"DPS", toIATA:"BRU",
    fromLabel:"Bali Denpasar", toLabel:"Brussel Airport",
    title:"Bali → Brussel (terugvlucht Matthew & Hinke)",
    sub:"Singapore Airlines / Qatar Airways",
    operator:"Singapore Airlines", flightNum:"SQ963 + SQ304",
    terminal:"International Terminal", times:"Avond", cost_id:"c17", ref:"SQ-MH29",
    fromPt:"bali", toPt:"brussel", qx:350, qy:55,
    persons:["matthew","hinke"]
  },
  {
    id:"tl17", type:"bus_auto", icon:"⛴️",
    date:"2026-09-13", dateD:"13", dateM:"sep",
    fromIATA:"BWX", toIATA:"DPS",
    fromLabel:"Banyuwangi (Ketapang)", toLabel:"Bali Gilimanuk → Canggu",
    title:"Banyuwangi → Bali (ferry + bus, alle jongens)",
    sub:"Ferry Ketapang→Gilimanuk + taxi/bus naar Canggu",
    operator:"ASDP Ferry + Bus", flightNum:null,
    terminal:null, times:"Middag", cost_id:null, ref:null,
    fromPt:"banyuwangi", toPt:"bali", qx:null, qy:null,
    persons:["arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl18", type:"int_vlucht", icon:"✈️",
    date:"2026-09-19", dateD:"19", dateM:"sep",
    fromIATA:"DPS", toIATA:"BRU",
    fromLabel:"Bali Denpasar", toLabel:"Brussel Airport",
    title:"Bali → Brussel (terugvlucht 5 jongens)",
    sub:"Diverse airlines · na 7-daags Bali programma",
    operator:"Diverse airlines", flightNum:"—",
    terminal:null, times:"TBD", cost_id:null, ref:null,
    fromPt:"bali", toPt:"brussel", qx:350, qy:55,
    persons:["arne","eliott","jens","kamiel","kasper"]
  },
  {
    id:"tl21", type:"int_vlucht", icon:"✈️",
    date:"2026-09-19", dateD:"19", dateM:"sep",
    fromIATA:"DPS", toIATA:"SGN",
    fromLabel:"Bali Denpasar", toLabel:"Vietnam",
    title:"Bali → Vietnam (doorreis Momo, Mathias & Willem)",
    sub:"Diverse airlines · doorreis na 7-daags Bali programma",
    operator:"Diverse airlines", flightNum:"—",
    terminal:null, times:"TBD", cost_id:null, ref:null,
    fromPt:"bali", toPt:"brussel", qx:350, qy:55,
    persons:["maurice","mathias","willem"]
  },
  {
    id:"tl22", type:"int_vlucht", icon:"✈️",
    date:"2026-09-07", dateD:"07", dateM:"sep",
    fromIATA:"BRU", toIATA:"CGK",
    fromLabel:"Brussel Airport", toLabel:"Jakarta Soekarno-Hatta (via SIN)",
    title:"Brussel → Singapore → Jakarta (Maurice, Mathias, Jens)",
    sub:"Singapore Airlines · SQ303 (BRU→SIN) + SQ952 (SIN→CGK)",
    operator:"Singapore Airlines", flightNum:"SQ303 + SQ952",
    terminal:"Pier B → Changi T2",
    times:"11:45 (07/09) → 08:25 (08/09)", cost_id:null, ref:"FSXOOZ",
    fromPt:"brussel", toPt:"jakarta", qx:150, qy:45,
    persons:["jens","maurice","mathias"]
  }
];

/* ---------------- VLUCHT-SCRAPER DATA (VOOR TRANSPORT PAGINA) ---------------- */
const FLIGHT_DB = {
  SQ303: {flight:"SQ303",airline:"Singapore Airlines",aircraft:"Airbus A350-900",altitude:"38,000 ft",speed:"905 km/h",duration:"12u 55m",route:"BRU (Brussel Airport) → SIN (Singapore Changi)",gate:"Pier B",baggage:"Terminal 3",risk:"Zeer Laag (0.5%)",status:"Scheduled",blipPos:{top:60,left:120}},
  SQ990: {flight:"SQ990",airline:"Singapore Airlines",aircraft:"Boeing 737 MAX 8",altitude:"35,000 ft",speed:"840 km/h",duration:"1u 30m",route:"SIN (Singapore Changi) → KNO (Medan Kualanamu)",gate:"Terminal 2",baggage:"Arrival Hall, Belt 1",risk:"Zeer Laag (0.8%)",status:"Scheduled",blipPos:{top:80,left:160}},
  SQ956: {flight:"SQ956",airline:"Singapore Airlines",aircraft:"Airbus A350-900",altitude:"37,000 ft",speed:"860 km/h",duration:"1u 50m",route:"SIN (Singapore Changi) → CGK (Jakarta Soekarno-Hatta)",gate:"Terminal 3",baggage:"Terminal 3 Arrival Hall",risk:"Zeer Laag (0.6%)",status:"Scheduled",blipPos:{top:120,left:240}},
  SQ952: {flight:"SQ952",airline:"Singapore Airlines",aircraft:"Airbus A350-900",altitude:"37,000 ft",speed:"860 km/h",duration:"1u 45m",route:"SIN (Singapore Changi T2) → CGK (Jakarta Soekarno-Hatta T3)",gate:"Terminal 2",baggage:"Terminal 3 Arrival Hall",risk:"Zeer Laag (0.6%)",status:"Scheduled",blipPos:{top:120,left:240}},
  TG935: {flight:"TG935",airline:"Thai Airways",aircraft:"Boeing 777-300ER (HS-TKK)",altitude:"36,000 ft",speed:"905 km/h",duration:"11u 15m",route:"BRU (Brussel Airport) → BKK (Suvarnabhumi Airport)",gate:"Pier B, Gate B20",baggage:"Baggage Hall 3, Band 4",risk:"Laag (2.5%)",status:"Scheduled",blipPos:{top:60,left:120}},
  TG403: {flight:"TG403",airline:"Thai Airways",aircraft:"Airbus A350-900 (HS-THC)",altitude:"38,000 ft",speed:"840 km/h",duration:"2u 25m",route:"BKK (Suvarnabhumi Airport) → SIN (Singapore Changi)",gate:"Concourse D, Gate D5",baggage:"Terminal 1, Belt 18",risk:"Gemiddeld (12.4%)",status:"Scheduled",blipPos:{top:120,left:240}},
  TR220: {flight:"TR220",airline:"Scoot",aircraft:"Airbus A320-neo (9V-TNC)",altitude:"28,000 ft",speed:"710 km/h",duration:"1u 30m",route:"SIN (Singapore Changi) → KNO (Medan Kualanamu)",gate:"Terminal 2, Gate F38",baggage:"Main Hall, Belt 2",risk:"Laag (1.8%)",status:"Scheduled",blipPos:{top:80,left:160}},
  JT204: {flight:"JT204",airline:"Lion Air",aircraft:"Boeing 737-900ER (PK-LGO)",altitude:"36,000 ft",speed:"820 km/h",duration:"2u 15m",route:"CGK (Jakarta Soekarno-Hatta) → KNO (Medan Kualanamu)",gate:"Terminal 2D, Gate 7",baggage:"Main Arrival Hall, Belt 2",risk:"Gemiddeld (5.8%)",status:"Scheduled",blipPos:{top:130,left:320}},
  JT383: {flight:"JT383",airline:"Lion Air",aircraft:"Boeing 737-900ER (PK-LGP)",altitude:"35,000 ft",speed:"810 km/h",duration:"2u 25m",route:"KNO (Medan Kualanamu) → CGK (Jakarta Soekarno-Hatta)",gate:"Terminal 2D, Gate 3",baggage:"Terminal 2D, Band 4",risk:"Gemiddeld (6.2%)",status:"Scheduled",blipPos:{top:150,left:380}},
  GA402: {flight:"GA402",airline:"Garuda Indonesia",aircraft:"Boeing 737-800 (PK-GFM)",altitude:"34,000 ft",speed:"810 km/h",duration:"1u 45m",route:"SUB (Surabaya Juanda) → LBJ (Labuan Bajo Komodo)",gate:"Terminal 1, Gate 5",baggage:"Arrival Hall, Belt A",risk:"Zeer Laag (0.5%)",status:"Scheduled",blipPos:{top:165,left:550}},
  QZ503: {flight:"QZ503",airline:"Indonesia AirAsia",aircraft:"Airbus A320-200 (PK-AXV)",altitude:"24,000 ft",speed:"680 km/h",duration:"1u 10m",route:"LBJ (Labuan Bajo Komodo) → DPS (Bali Denpasar)",gate:"Gate 2 (Platformloopbrug)",baggage:"Domestic Arrivals, Belt 1",risk:"Gemiddeld (14.2%)",status:"Scheduled",blipPos:{top:172,left:630}}
};

/* Bevestiging dat data.js succesvol geladen is */
window.DATA_JS_LOADED = true;
