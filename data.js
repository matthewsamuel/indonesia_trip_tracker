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
const TRIP_END_DATE = "2026-09-30";

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

/* Een kostenpost van € 0 kost Matthew niets (iemand anders betaalt, of het zit
   al in een andere post) en hoort dus nergens in beeld: geen regel in het
   reisschema, geen 💰-badge, geen to-do "nog niet geboekt". Een post zonder
   bedrag (null = TBD) blijft wél zichtbaar — die moet nog ingevuld worden. */
function costIsVisible(id) {
  return COSTS[id] !== undefined && costValue(id) !== 0;
}

/* ---------------- FASEN VAN DE REIS ---------------- */
const FASES = {
  heen:    { label: "Vlucht heen",  color: "#4cc9f0", soft: "rgba(76, 201, 240, 0.1)", uitleg: "Heenreis vanuit Brussel naar Medan, met korte overstap in Singapore.", desc: "Matthew vliegt op 29 augustus met Singapore Airlines (SQ303) vanuit Brussel naar Singapore, samen met Eliott, Willem, Kamiel en Kasper. Ze landen op 30 augustus om 06:40; in Changi splitst de groep — zij vliegen door naar Jakarta, Matthew met SQ990 naar Medan, waar hij om 08:00 aankomt. Arne zit al sinds 10 augustus in Maleisië en komt vanuit Kuala Lumpur naar Medan; de twee treffen elkaar daar rond 14:00." },
  sumatra: { label: "Sumatra",      color: "#4ad66d", soft: "rgba(74, 214, 109, 0.1)", uitleg: "Intense 5-daagse jungle trekking in Ketambe met de hele crew.", desc: "Na een vlucht naar Medan volgt een marathon rit van 7-8 uur de oerwouden in naar Ketambe, diep in het hart van Sumatra. Met 6 man — Matthew, Arne, Kamiel, Eliott, Kasper en Willem — wordt een intensieve 5-daagse all-in jungle trekking gedaan, compleet met orang-oetans, nachtelijke geluiden en jungle overnachtingen. Een van de meest avontuurlijke en onvergetelijke onderdelen van de hele reis." },
  jakarta: { label: "Jakarta",      color: "#f77f00", soft: "rgba(247, 127, 0, 0.1)", uitleg: "Aankomst in de hoofdstad en samenkomst van de complete groep van 9.", desc: "Na de jungle is het tijd voor de bruisende hoofdstad Jakarta, waar Maurice, Mathias en Jens de groep versterken — nu zijn alle 9 reizigers voor het eerst bij elkaar. Eén nacht in de stad: bijkomen, Kota Tua verkennen en de groep samenvoegen. Het is ook het moment om bij te trekken voor de avontuurlijke Java-etappe die volgt." },
  java:    { label: "Java",         color: "#9d4edd", soft: "rgba(157, 78, 221, 0.1)", uitleg: "Reis langs Yogyakarta, Borobudur, Prambanan en Bromo/Ijen vulkanen.", desc: "Java biedt een indrukwekkend programma: Yogyakarta, Borobudur en Prambanan, gevolgd door een 4-daagse georganiseerde tour die de groep vanaf 10 september over de weg naar Tumpak Sewu, Mount Bromo en Kawah Ijen brengt en op 13 september tot aan de villa in Canggu aflevert. Matthew doet alles mee en steekt met hen de ferry over. Op 15 september vliegt hij vanuit Denpasar terug naar Surabaya (IU 703, 16:40) om Hinke op te halen, die er om 18:15 landt. Vanaf dan reizen ze samen verder: uitslapen in Villa Panda in Blimbing, Tumpak Sewu, dan Mount Bromo en de Madakaripura-waterval, daarna Lombok." },
  lombok:  { label: "Lombok",       color: "#06d6a0", soft: "rgba(6, 214, 160, 0.1)", uitleg: "Vier nachten op Lombok, tussen Oost-Java en Flores in.", desc: "Nieuw in het plan: na de vulkanen van Oost-Java vliegen Matthew en Hinke op 18 september vanuit Surabaya naar Lombok voor vier nachten. Waar precies staat nog open — Kuta Lombok in het zuiden voor de surfstranden, Senggigi aan de westkust, of doorsteken naar de Gili-eilanden om te snorkelen en duiken. Op 22 september gaat het verder naar Flores." },
  flores:  { label: "Flores",       color: "#f72585", soft: "rgba(247, 37, 133, 0.1)", uitleg: "Labuan Bajo als uitvalsbasis voor de Komodo-boottocht.", desc: "Op 22 september landen Matthew en Hinke in het betoverende Labuan Bajo aan de westkust van Flores. Twee nachten om de haven en de uitzichtpunten boven de baai te verkennen, dan de boottocht door Komodo National Park, en na terugkeer nog één nacht vóór de vlucht naar Bali. De uitstap naar Ruteng en de spinnenweb-rijstvelden is geschrapt om plaats te maken voor Lombok." },
  komodo:  { label: "Komodo National Park", color: "#00f5d4", soft: "rgba(0, 245, 212, 0.1)", uitleg: "2-daagse boottocht: Rinca, Padar, Pink Beach en Manta Point.", desc: "Twee dagen en één nacht aan boord in het wereldberoemde Komodo Nationaal Park, op 24 en 25 september. Dag 1 vaart langs Kelor naar Rinca, waar de varanen leven, met zonsondergang bij Kalong waar duizenden vleerhonden opstijgen; de nacht wordt aan boord doorgebracht bij Kambing Island. Dag 2 begint bij zonsopgang op Padar Island voor het iconische uitzicht over de drie baaien, daarna Pink Beach, snorkelen met de mantaroggen en de zandbank Taka Makassar, vóór de terugkeer in Labuan Bajo rond 19:00." },
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
      uitleg: "Heenreis Brussel → Hongkong → Surabaya, waar Matthew wacht.",
      desc: "Hinke vliegt op 14 september vanuit Brussel via Hongkong naar Surabaya, waar ze op 15 september om 18:15 landt. Matthew staat klaar op de luchthaven — vanaf hier reizen ze samen verder door Java, Flores, Komodo en Bali." }
  ],
  java: [
    { wie: ["hinke"],
      uitleg: "Samen met Matthew: Villa Panda in Blimbing, Tumpak Sewu, Mount Bromo en Madakaripura.",
      desc: "Hinke landt op 15 september om 18:15 in Surabaya en trekt samen met Matthew door Oost-Java: eerst uitslapen in Villa Panda in Blimbing om de jetlag op te vangen, dan Tumpak Sewu, en als afsluiter vroeg op voor Mount Bromo bij zonsopgang en de Madakaripura-waterval. Die twee tochten heeft Hinke op 24 augustus zelf via GetYourGuide geboekt." },
    { wie: ["arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"],
      uitleg: "Yogyakarta, Borobudur & Prambanan, dan de 4-daagse tour langs Tumpak Sewu, Bromo en Kawah Ijen tot in Bali — met de volledige groep van 9." }
  ],
  lombok: [
    { wie: ["matthew","hinke"],
      uitleg: "Vier nachten Lombok, tussen Oost-Java en Flores in.",
      desc: "Op 18 september vliegen Matthew en Hinke vanuit Surabaya naar Lombok voor vier nachten. De exacte basis is nog niet gekozen: Kuta Lombok in het zuiden, Senggigi aan de westkust of de Gili-eilanden. Op 22 september gaat het door naar Labuan Bajo." },
    { wie: ["arne","jens","kasper","willem"],
      uitleg: "Na de villa in Canggu door naar Lombok en Nusa Penida, vanaf 19 september." }
  ],
  bali: [
    { wie: ["arne","jens","kasper"],
      uitleg: "7-daags programma, daarna door naar Lombok en Nusa Penida tot de vlucht van 25/09.",
      desc: "Na de ferry vanuit Java werken de jongens een vol 7-daags Bali-programma af: surfen in Canggu, kliffen en Kecak in Uluwatu, een dagtrip naar Nusa Penida, tempels en rijstterrassen rond Ubud, wrakduiken bij Amed en als apotheose de zonsopgang op Mount Agung. Zodra Eliott en Kamiel op 19 september vertrekken, trekken Arne, Kasper, Jens en Willem door naar Lombok en Nusa Penida — verblijf nog niet geboekt." },
    { wie: ["eliott","kamiel","maurice","mathias","willem"],
      uitleg: "7-daags programma: Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung.",
      desc: "Na de ferry vanuit Java werken de jongens een vol 7-daags Bali-programma af: surfen in Canggu, kliffen en Kecak in Uluwatu, een dagtrip naar Nusa Penida, tempels en rijstterrassen rond Ubud, wrakduiken bij Amed en als apotheose de zonsopgang op Mount Agung." }
  ],
  terug: [
    { wie: ["matthew","hinke"],
      uitleg: "Terugvlucht 29/09 met Thai Airways via Bangkok, aankomst Brussel 30/09 om 07:15.",
      desc: "Matthew en Hinke vliegen op 29 september om 19:00 met TG440 van Denpasar naar Bangkok en stappen daar na een overstap van bijna twee uur over op TG934, die om 00:05 vertrekt. Ze landen op 30 september om 07:15 in Brussel. De prijs van deze vlucht staat nog niet vast." },
    { wie: ["maurice","mathias","willem"],
      uitleg: "Doorreis Bali → Vietnam (datum TBD)." },
    { wie: ["arne","jens","kasper"],
      uitleg: "Terugvlucht 25/09 met Thai Airways via Bangkok, aankomst Brussel 26/09 om 07:15.",
      desc: "Arne, Kasper en Jens vliegen op 25 september om 16:55 met TG432 van Denpasar naar Bangkok, waar ze na een overstap van vier uur om 00:05 doorvliegen met TG934. Ze landen op 26 september om 07:15 in Brussel. Boeking CBE-11227216, check-incode YCX2VO." },
    { wie: ["eliott","kamiel"],
      uitleg: "Terugvlucht Bali → Brussel nog te boeken (datum TBD)." }
  ]
};

/* Chronologische sortering van trip-items.
   Bij een gelijke startdatum (bv. t4 "Medan → Ketambe" en t29 "Jakarta → Medan",
   beide op 01/09) bepaalt de volgorde van FASES de doorslag. Zonder dit springt
   de fase heen en weer (heen > sumatra > heen > sumatra) voor Eliott, Kamiel,
   Kasper en Willem, wat dubbele fase-koppen en dubbele DOM-id's oplevert. */
const FASE_VOLGORDE = Object.keys(FASES);

function compareTrips(a, b) {
  const d = a.start.localeCompare(b.start);
  if (d !== 0) return d;
  const fa = FASE_VOLGORDE.indexOf(a.fase);
  const fb = FASE_VOLGORDE.indexOf(b.fase);
  if (fa !== fb) return fa - fb;
  return a.end.localeCompare(b.end);
}

function sortTrips(items) {
  return [...items].sort(compareTrips);
}

function faseTekst(faseKey, personKey) {
  for (const row of (FASE_TEKST_PP[faseKey] || [])) {
    if (row.wie.includes(personKey)) return row;
  }
  return null;
}

function getGroupUitleg(faseKey, tripIds, personKey) {
  if (faseKey === "java") {
    if (personKey === "hinke") {
      return "Met Matthew door Oost-Java: villa in Blimbing, Tumpak Sewu en Mount Bromo bij zonsopgang.";
    }

    const hasYogya = tripIds.some(id => id === "t8" || id === "t9");
    const hasOphaalvlucht = tripIds.some(id => id === "t11a");
    const hasVulkaanTochtMetHinke = tripIds.some(id => id === "t11b" || id === "t11c" || id === "t12");
    const hasBoysVulkanen = tripIds.some(id => id === "t10b" || id === "t30" || id === "t30b");

    if (personKey === "matthew") {
      if (hasOphaalvlucht || hasVulkaanTochtMetHinke) {
        return "Matthew haalt Hinke op in Surabaya (15/09) en reist verder door Oost-Java: villa Blimbing, Tumpak Sewu en Mount Bromo.";
      }
      if (hasYogya || hasBoysVulkanen) {
        return "Met de complete groep van 9 door Java: Yogyakarta, Borobudur, Tumpak Sewu, Mount Bromo en Kawah Ijen.";
      }
    } else {
      if (hasYogya) {
        return "Van Jakarta naar Yogyakarta: Prambanan, Malioboro-straat en Borobudur, dan met de tour richting Oost-Java.";
      }
      if (hasBoysVulkanen) {
        return "Met de groep van 9 door Oost-Java: Tumpak Sewu, Mount Bromo bij zonsopgang en 's nachts Kawah Ijen.";
      }
    }
  }

  /* Matthew heeft twee Bali-blokken: de tussenstop in Canggu met de jongens
     (13–15/09) en de afsluitende villa met Hinke (26–28/09). Zonder deze
     uitzondering krijgen beide de generieke "afsluitende ontspanning"-tekst. */
  if (faseKey === "bali" && personKey === "matthew" &&
      tripIds.some(id => id === "t30b" || id === "t11")) {
    return "Met de jongens per ferry naar Bali: twee dagen Canggu, tot hij op 15/09 Hinke ophaalt in Surabaya.";
  }

  const tekstOv = faseTekst(faseKey, personKey);
  return (tekstOv && tekstOv.uitleg) || FASES[faseKey].uitleg || "";
}

/* Minimale fase-basisfotos (fallback) */
const FASE_PHOTOS = {
  heen:    ["images/singapore_famoushotel.webp", "images/singapore_bigtree.webp", "images/singapore_airport_waterval.jpg"],
  sumatra: ["images/ketambe_jungle.jpg", "images/sumatra_oerangoetang.jpg", "images/sumatra_Waterval.jpg"],
  jakarta: ["images/jakartanightskyline.jpg", "images/jakarta.jpg", "images/Javaeiland.jpg"],
  java:    ["images/Yogyakartatempel.jpg", "images/bromo.jpg", "images/mountbromo.webp"],
  flores:  ["images/Labuanbajo.jpg", "images/Flores.jpg", "images/java_eiland.avif"],
  komodo:  ["images/Komodovaraan.jpg", "images/komodo-national-park-1250x488.jpg.webp", "images/tumpak-sewu-waterfalls.jpg"],
  bali:    ["images/airbnbBaliboyz/1733290a-9bdd-4d7a-99cc-a52833969425.jpeg.avif", "images/airbnbBaliboyz/2edfb196-c196-485a-b95c-c3972b363dc2.jpeg.webp", "images/airbnbBaliboyz/7d24e741-442e-42fb-9ffe-3250f7eaf1fc.jpeg.avif"],
  terug:   ["images/bangkok_skyline.jpg", "images/brussels_arrival.jpg", "images/brussels_departure.jpg"],
};

/* Trip-specifieke foto's (SLIM met minimaal hergebruik) */
const TRIP_PHOTOS = {
  /* Matthew & Arne: Brussel → Singapore → Medan */
  "t1":   ["images/singapore_famoushotel.webp", "images/singapore_bigtree.webp", "images/singapore_airport_waterval.jpg"],
  "t3":   ["images/medan_landscape.jpg", "images/Javaeiland.jpg"],
  "t4":   ["images/ketambe_jungle.jpg", "images/sumatra_oerangoetang.jpg"],
  "t5":   ["images/airbnbM&H/15-16.avif", "images/airbnbM&H/15-16a.avif", "images/airbnbM&H/15-16b.avif"],  // 3 airbnbM&H = jungle trek
  "t6":   ["images/airbnbM&H/15-16c.avif", "images/airbnbM&H/15-16d.avif"],  // airbnbM&H
  "t6b":  ["images/tumpaksewuwaterval.webp", "images/sumatra_Waterval.jpg", "images/java_bromo_couple.jpg", "images/java_eiland.avif"],  // terug + naar Jakarta
  "t7":   ["images/jakarta.jpg", "images/jakartanightskyline.jpg"],  // Jakarta groep
  "t8":   ["images/Yogyakartatempel.jpg", "images/bromo.jpg"],  // Yogya
  "t9":   ["images/Ijen.jpeg", "images/mountbromo.webp"],  // start Oost-Java-tour
  "t10b": ["images/java_tumpaksewu.jpg", "images/bromoblauwvuur.jpeg"],  // Bromo/Tumpak Sewu alle 9
  "t11":  ["images/airbnbBaliboyz/1733290a-9bdd-4d7a-99cc-a52833969425.jpeg.avif", "images/airbnbBaliboyz/2edfb196-c196-485a-b95c-c3972b363dc2.jpeg.webp"],  // Canggu Matthew
  "t11a": ["images/bali.jpg", "images/bali2.jpg"],  // DPS→SUB
  "t11b": ["images/balivilla.jpg", "images/Yogyakartahandmonument.jpg"],  // Villa Panda, Blimbing

  /* Matthew & Hinke: Java round 2 */
  "t11c": ["images/tumpaksewuwaterval.webp", "images/java_tumpaksewu.jpg"],  // Tumpak Sewu met Hinke
  "t12":  ["images/mountbromo.webp", "images/bromo.jpg"],  // Bromo + Madakaripura met Hinke

  /* Flores & Komodo */
  "t14":  ["images/bali.jpg", "images/java_eiland.avif"],  // Blimbing → Surabaya → Lombok
  "t42":  ["images/bali2.jpg", "images/bali_sunset_return.jpg"],  // Lombok
  "t43":  ["images/Flores.jpg", "images/Labuanbajo.jpg"],  // Lombok → Labuan Bajo
  "t44":  ["images/Labuanbajo.jpg", "images/komodo-national-park-1250x488.jpg.webp"],  // Labuan Bajo vóór de boottocht
  "t45":  ["images/java_eiland.avif", "images/Labuanbajo.jpg"],  // Labuan Bajo, nacht na de boottocht
  "t19":  ["images/flores_boat_tour.jpg", "images/flores_sunset.jpg"],  // Boottour dag 1
  "t19b": ["images/komodo-national-park-1250x488.jpg.webp", "images/Komodovaraan.jpg"],  // Boottour dag 2 (Padar/Komodo)
  "t1b":  ["images/singapore_airport.jpg", "images/medan_landscape.jpg"],  // Arne uit Kuala Lumpur
  "t37b": ["images/bali_sunset_return.jpg", "images/bali4.jpg"],  // Willem → Vietnam
  "t39":  ["images/brussels_departure.jpg", "images/jakarta.jpg"],  // Momo, Mathias & Jens heen
  "t21":  ["images/bangkok_skyline.jpg", "images/bali.jpg"],  // Labuan Bajo→Bali vlucht
  "t22":  ["images/airbnbBaliboyz/7d24e741-442e-42fb-9ffe-3250f7eaf1fc.jpeg.avif", "images/balivilla.jpg"],  // Bali luxe

  /* Jongens: Brussel → Jakarta */
  "t27":  ["images/singapore_airport.jpg", "images/singapore_airport_waterval.jpg"],  // jongens BRU→Jakarta
  "t28":  ["images/jakarta.jpg", "images/Yogyakartahandmonument.jpg"],  // Jakarta jongens
  "t29":  ["images/medan_landscape.jpg", "images/ketambe_jungle.jpg"],  // Jakarta→Medan
  "t30":  ["images/bromoblauwvuur.jpeg", "images/mountbromo.webp"],  // Kawah Ijen nacht alle 9
  "t30b": ["images/bali.jpg", "images/bali2.jpg"],  // Ferry naar Bali
  "t30c": ["images/airbnbM&H/15-16.avif", "images/airbnbM&H/15-16a.avif"],  // villa Canggu (airbnbM&H)

  /* Bali jongens week */
  "t31":  ["images/airbnbM&H/15-16b.avif", "images/airbnbM&H/15-16c.avif"],  // Canggu dag 1-2
  "t32":  ["images/airbnbM&H/15-16d.avif", "images/Yogyakartatempel.jpg"],  // Uluwatu dag
  "t33":  ["images/java_bromo_couple.jpg", "images/Yogyakartahandmonument.jpg"],  // Nusa Penida
  "t34":  ["images/Yogyakartamonument.jpeg", "images/Flores.jpg"],  // Ubud
  "t35":  ["images/java_tumpaksewu.jpg", "images/Ijen.jpeg"],  // Amed
  "t36":  ["images/bromo.jpg", "images/Komodovaraan.jpg"],  // Mount Agung
  "t37":  ["images/brussels_departure.jpg", "images/brussels_arrival.jpg"],  // Bali→Vietnam (Mathias/Willem/Momo)

  /* Terugvluchten */
  "t38":  ["images/bangkok_skyline.jpg", "images/brussels_arrival.jpg"],  // Arne/Kasper/Jens
  "t38b": ["images/brussels_departure.jpg", "images/brussels_arrival.jpg"],  // Eliott/Kamiel
  "t40":  ["images/bali_sunset_return.jpg", "images/balivilla.jpg"],  // Bali laatste dagen jongens
  "t41":  ["images/bali.jpg", "images/bali4.jpg"],  // Hinke aankomst

  /* Matthew & Hinke terugkeer */
  "t23":  ["images/bangkok_skyline.jpg", "images/brussels_arrival.jpg"],  // Matthew & Hinke terug
};

/* ---------------- PERSONEN & GROEPSINFO ---------------- */
const PERSONS = {
  matthew: { name: "Matthew", color: "#0F6B5C", initials: "M"  },
  hinke:   { name: "Hinke",   color: "#C8567D", initials: "H"  },
  arne:    { name: "Arne",    color: "#5B7FB5", initials: "A"  },
  eliott:  { name: "Eliott",  color: "#D97A2B", initials: "E"  },
  jens:    { name: "Jens",    color: "#6B4E9C", initials: "J"  },
  kamiel:  { name: "Kamiel",  color: "#4A8B3B", initials: "K"  },
  maurice: { name: "Maurice", color: "#C8932B", initials: "Mo" },
  mathias: { name: "Mathias", color: "#1C8AA0", initials: "Ma" },
  willem:  { name: "Willem",  color: "#C75D3A", initials: "W"  },
  kasper:  { name: "Kasper",  color: "#8A6D3B", initials: "Ks" }
};

const PERSON_ORDER = ["matthew","hinke","arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"];

const PERSON_TRIPS = {
  matthew: ["t1", "t3", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t11", "t11a", "t11b", "t11c", "t12", "t14", "t42", "t43", "t44", "t19", "t19b", "t45", "t21", "t22", "t23"],
  hinke:   ["t41", "t11b", "t11c", "t12", "t14", "t42", "t43", "t44", "t19", "t19b", "t45", "t21", "t22", "t23"],
  arne:    ["t1b", "t3", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t38"],
  eliott:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t38b"],
  jens:    ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t38"],
  kamiel:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t38b"],
  maurice: ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t37"],
  kasper:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t38"],
  willem:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t37b"],
  mathias: ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t37"]
};

const PERSON_GROUP_INFO = {
  matthew: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Brussel → Singapore → Medan (tot Singapore samen met Eliott, Willem, Kamiel & Kasper); Arne komt vanuit Kuala Lumpur en ze treffen elkaar rond 14:00 in Medan</li>
      <li><b>01/09, Medan:</b> Ontmoeting met Kamiel, Eliott, Kasper & Willem (vlucht vanuit Jakarta) — alle 6 man naar Ketambe</li>
      <li><b>08/09, Jakarta:</b> Maurice, Mathias & Jens sluiten aan — crew compleet met 9 man voor Java</li>
      <li><b>11/09 – 13/09:</b> Volledig mee met de jongens: Tumpak Sewu, Mount Bromo en 's nachts Kawah Ijen</li>
      <li><b>13/09 – 15/09:</b> Samen met de jongens per ferry naar Bali, twee dagen Canggu</li>
      <li><b>15/09, Surabaya:</b> Vlucht Denpasar 16:40 → Surabaya; Hinke landt om 18:15, samen door naar de villa in Blimbing</li>
      <li><b>16/09 – 17/09:</b> Uitslapen in Villa Panda, Tumpak Sewu, dan Mount Bromo bij zonsopgang en Madakaripura</li>
      <li><b>18/09 – 22/09:</b> Vlucht Surabaya 11:00 → Lombok, vier nachten op Lombok</li>
      <li><b>22/09 – 24/09:</b> Vlucht naar Labuan Bajo, twee nachten aan wal</li>
      <li><b>24/09 – 25/09:</b> 2-daagse Komodo-boottour met 1 nacht aan boord (Kelor, Rinca, Kalong → Padar, Pink Beach, Manta Point, Taka Makassar)</li>
      <li><b>29/09 – 30/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Hinke)</li>
    </ul>
  `,
  hinke: `
    <ul class="details" style="font-size:14.5px">
      <li><b>14/09 – 15/09:</b> Vlucht Brussel → Hongkong → Surabaya</li>
      <li><b>15/09:</b> Hinke landt om 18:15 uur in Surabaya, samen met Matthew naar Villa Panda in Blimbing</li>
      <li><b>15/09 – 29/09:</b> Reist samen met Matthew (Blimbing → Tumpak Sewu → Bromo/Madakaripura → Lombok → Flores → Komodo → Bali)</li>
      <li><b>16/09 – 17/09:</b> Tumpak Sewu en Mount Bromo — de tour die Hinke zelf op 24/08 via GetYourGuide boekte</li>
      <li><b>18/09 – 22/09:</b> Vier nachten op Lombok</li>
      <li><b>24/09 – 25/09:</b> 2-daagse Komodo-boottour met 1 nacht aan boord: Padar bij zonsopgang, Pink Beach, de varanen op Rinca en snorkelen bij Manta Point</li>
      <li><b>Reisgezelschap:</b> Exclusief met Matthew. De andere jongens zijn al eerder naar huis of reizen apart</li>
      <li><b>29/09 – 30/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Matthew)</li>
    </ul>
  `,
  arne: `
    <ul class="details" style="font-size:14.5px">
      <li><b>30/08:</b> Kuala Lumpur → Medan (Arne zit al sinds 10/08 in Maleisië); rond 14:00 treft hij Matthew in Medan, daarna 30-31/08 overnachting daar</li>
      <li><b>01/09 – 07/09:</b> Met de jongens de Sumatra-jungle in (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep compleet met 9 man)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>19–25/09:</b> Door naar Lombok en Nusa Penida tot de terugvlucht — verblijf nog te boeken</li>
      <li><b>25–26/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Kasper & Jens); aankomst BRU 26/09 om 07:15</li>
    </ul>
  `,
  eliott: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta; aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Kamiel) — nog te boeken, staat niet op de boeking van 25/09</li>
    </ul>
  `,
  jens: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (boekingsref. FSXOOZ, samen met Maurice & Mathias)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Maurice & Mathias)</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>19–25/09:</b> Door naar Lombok en Nusa Penida tot de terugvlucht — verblijf nog te boeken</li>
      <li><b>25–26/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Arne & Kasper); aankomst BRU 26/09 om 07:15</li>
    </ul>
  `,
  kamiel: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta; aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Eliott) — nog te boeken, staat niet op de boeking van 25/09</li>
    </ul>
  `,
  maurice: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (samen met Mathias & Jens)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Mathias & Jens)</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Vlucht Bali → Vietnam (samen met Willem & Mathias) — TBD</li>
    </ul>
  `,
  kasper: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta; aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>19–25/09:</b> Door naar Lombok en Nusa Penida tot de terugvlucht — verblijf nog te boeken</li>
      <li><b>25–26/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Arne & Jens); aankomst BRU 26/09 om 07:15</li>
    </ul>
  `,
  willem: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta; aankomst Jakarta Soekarno T3 om 09:55</li>
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
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (samen met Maurice & Jens)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Maurice & Jens)</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Vlucht Bali → Vietnam (samen met Willem & Momo) — TBD</li>
    </ul>
  `
};

/* ---------------- GEDEELDE PERSONENKIEZER ----------------
   Eén implementatie voor tracker, reisschema, transport en gezondheid.
   Elke pagina registreert via initPersonSelector() wat er na een wissel
   opnieuw getekend moet worden. */
const PERSON_SELECTOR = {
  label: "Bekijk weergave van",
  onChange: null,
  mountId: "personSelector"
};

function getSelectedPerson() {
  return ls_get("selected_person", "matthew");
}

function initPersonSelector(opts = {}) {
  if (opts.label) PERSON_SELECTOR.label = opts.label;
  if (opts.onChange) PERSON_SELECTOR.onChange = opts.onChange;
  if (opts.mountId) PERSON_SELECTOR.mountId = opts.mountId;
  renderPersonSelector();
}

function renderPersonSelector() {
  const container = document.getElementById(PERSON_SELECTOR.mountId);
  if (!container) return;

  const active = getSelectedPerson();
  const collapsed = ls_get("person_selector_collapsed", false);

  const cards = PERSON_ORDER.map(key => {
    const p = PERSONS[key];
    const isActive = key === active;
    const photo = localStorage.getItem(`mapphoto_${key}`);
    const avatar = photo
      ? `<img src="${photo}" alt="">`
      : `<span class="avatar-initials" style="color:${p.color}">${p.initials}</span>`;
    return `<button type="button" class="person-card ${isActive ? "active" : ""}"
        role="radio" aria-checked="${isActive}" onclick="selectPerson('${key}')">
        <div class="person-card-avatar" style="border-color:${p.color}">${avatar}</div>
        <span class="person-card-name">${p.name}</span>
      </button>`;
  }).join("");

  container.innerHTML = `
    <button type="button" class="person-selector-header" onclick="togglePersonSelector()"
            aria-expanded="${!collapsed}" aria-controls="personGrid">
      <span class="person-selector-label">${PERSON_SELECTOR.label}:
        <strong class="person-selector-active">${PERSONS[active].name}</strong></span>
      <span class="person-selector-toggle-arrow"${collapsed ? ' data-collapsed="true"' : ""}>▼</span>
    </button>
    <div class="person-grid" id="personGrid" role="radiogroup"
         aria-label="Kies reiziger"${collapsed ? " hidden" : ""}>${cards}</div>`;
}

function togglePersonSelector() {
  ls_set("person_selector_collapsed", !ls_get("person_selector_collapsed", false));
  renderPersonSelector();
}

function selectPerson(key) {
  ls_set("selected_person", key);
  renderPersonSelector();
  if (PERSON_SELECTOR.onChange) PERSON_SELECTOR.onChange(key);
}

/* ---------------- KOSTEN (VOLLEDIG SYNC MET HOME PAGE) ---------------- */
const COSTS = {
  c1:  { label: "Vlucht BRU → Singapore → Medan (Singapore Airlines, SQ303+SQ990)", cat: "vlucht", amount: null },
  c2b: { label: "Vlucht Kuala Lumpur → Medan (Arne, 30/08 — nog te boeken)", cat: "vlucht", amount: 50 },
  c3:  { label: "Taxi/minibus Medan → Ketambe", cat: "transport", amount: 20 },
  /* Voorschot van 8% (±€16) is in juli via Wise betaald; bij aankomst betaalt
     iedereen nog IDR 3.930.000 (±€200) contant aan gids Hasby. Dat restbedrag
     dekt óók de twee overnachtingen in het guesthouse, dus c4b staat op 0. */
  c4:  { label: "Jungle trekking Ketambe (5d/4n Adventure, all-in incl. 2 overnachtingen)", cat: "activiteit", amount: 216 },
  c4b: { label: "Overnachting guesthouse Ketambe (2n) — inbegrepen in de eindafrekening van de trek", cat: "accommodatie", amount: 0 },
  c5:  { label: "Taxi/minibus Ketambe → Medan", cat: "transport", amount: 20 },
  c6:  { label: "Vlucht Medan → Jakarta (Lion Air JT383, enkel)", cat: "vlucht", amount: 106 },
  c6b: { label: "Vlucht Jakarta → Medan (Lion Air JT204, enkel)", cat: "vlucht", amount: 106 },
  c7:  { label: "Trein Jakarta → Yogyakarta", cat: "transport", amount: 20 },
  c7b: { label: "Tempels entree (Borobudur + Prambanan)", cat: "activiteit", amount: 40 },
  c8:  { label: "GetYourGuide-tour Yogyakarta → Bali (4d: Tumpak Sewu, Bromo, Ijen — incl. vervoer + 3 nachten)", cat: "activiteit", amount: 130, url: "https://www.getyourguide.com/jogjakarta-l349/yogyakarta-surabaya-of-malang-tumpak-sewu-bromo-ijen-tour-t451088/" },
  c11: { label: "Vlucht Surabaya → Lombok (Super Air Jet, 18/09, 11:00-13:05 — nog te boeken)", cat: "vlucht", amount: 42 },
  c11b:{ label: "Vlucht Lombok → Labuan Bajo (Wings Abadi, 22/09, 12:25-13:40 — nog te boeken)", cat: "vlucht", amount: 91 },
  c12: { label: "Overnachting Labuan Bajo (22-24/09, 2n, vóór de boottocht)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/1202849662764744783" },
  c14: { label: "Overnachting Labuan Bajo (25-26/09, 1n, na de boottocht)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/1202849662764744783" },
  c15: { label: "Vlucht Labuan Bajo → Bali (Indonesia AirAsia, 26/09, 10:35-11:50)", cat: "vlucht", amount: 63 },
  c16: { label: "Bali villa (26-29 sep)", cat: "accommodatie", amount: 101 },
  c17: { label: "Terugvlucht Bali → Bangkok → Brussel (Matthew & Hinke, TG440+TG934)", cat: "vlucht", amount: null },
  c19: { label: "Hotel Jakarta (1n)", cat: "accommodatie", amount: 35 },
  c20: { label: "Hotel Yogyakarta (1n)", cat: "accommodatie", amount: 30 },
  c21: { label: "Tumpak Sewu + Bromo & Madakaripura (GetYourGuide-tour vanuit Malang, 16-17/09 met Hinke — door Hinke geboekt 24/08)", cat: "activiteit", amount: null, url: "https://www.getyourguide.com/nl-nl/malang-l153180/malang-uitstap-waterval-tumpak-sewu-vulkaan-bromo-t1318580/" },
  /* De 3-daagse GetYourGuide-tour van €320,76 (18-20/09) is vervangen door de
     goedkopere 2-daagse van komodoboattour.com op 24-25/09. Die eerste boeking
     staat op "book now, pay later" en kan gratis geannuleerd worden tot 17/09 —
     dat moet nog gebeuren. Richtprijs 2d1n gedeelde cabine: IDR 2,5-2,85 mln
     (±€145-165) pp; entree Komodo National Park (IDR 400-650k) zit er meestal
     níét bij. Prijs opvragen via WhatsApp +62 898 7750 0505. */
  c23: { label: "Komodo 2-daagse boottour (1 nacht aan boord, komodoboattour.com, 24-25/09 — nog te boeken)", cat: "activiteit", amount: null, url: "https://komodoboattour.com/2-days-1-night/" },
  c25: { label: "Villa Panda, Blimbing (15-18/09, 3n, met Hinke)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/1445685975649761581" },
  c26: { label: "Vlucht BRU → Singapore → Jakarta (SQ303+SQ956)", cat: "vlucht", amount: null },
  c27: { label: "Hotel Jakarta (30-31/08, 2n, acclimatiseren)", cat: "accommodatie", amount: null },
  c28: { label: "Vlucht BRU → Singapore → Jakarta (SQ303+SQ952, ref. FSXOOZ)", cat: "vlucht", amount: 680.77 },
  c29: { label: "Vlucht BRU → Hongkong → Surabaya (Hinke, Cathay Pacific CX294 + CX629)", cat: "vlucht", amount: 554 },
  c30: { label: "Villa Canggu (13-19/09, 6n, gedeeld door 8)", cat: "accommodatie", amount: 226.87, url: "https://fr.airbnb.be/rooms/37920676" },
  c31: { label: "Terugvlucht Bali → Bangkok → Brussel (Arne, Kasper & Jens, TG432+TG934)", cat: "vlucht", amount: 551 },
  c32: { label: "Vlucht Bali → Vietnam (doorreis)", cat: "vlucht", amount: null },
  c33: { label: "Terugvlucht Bali → Brussel (Eliott & Kamiel)", cat: "vlucht", amount: null },
  c34: { label: "Verblijf Lombok & Nusa Penida 19–25/09 (Willem, Arne, Kasper & Jens, na de villa in Canggu)", cat: "accommodatie", amount: null },
  c35: { label: "Vlucht Bali → Surabaya (Super Air Jet IU 703, 15/09)", cat: "vlucht", amount: 36 },
  /* Matthew doet Tumpak Sewu en Bromo twee keer: eerst met de jongens (nu
     onderdeel van de GetYourGuide-tour c8), daarna nog eens met Hinke (c21,
     samen met Madakaripura). Kawah Ijen doet hij maar één keer, met de
     jongens — de tweede ronde met Hinke is geschrapt ten gunste van
     Madakaripura. De losse posten c37 (Tumpak Sewu + Bromo) en c38 (Ijen)
     zijn vervallen: die activiteiten zitten nu in c8 inbegrepen. Aparte
     id's blijven nodig omdat de kostenset per persoon een Set is — dezelfde
     id telt maar één keer mee. */
  c40: { label: "Verblijf Lombok (18-22/09, 4n, met Hinke — nog te zoeken)", cat: "accommodatie", amount: null },
};

/* ---------------- GEOGRAFISCHE COÖRDINATEN ----------------
   Enige bron van waarheid voor alle kaarten (tripmap.js) en voor de
   afstandsberekening. TRIP.map, TRANSPORT_LEGS en ROUTE_MODES gebruiken
   allemaal deze sleutels; afwijkende schrijfwijzen in vrije tekst worden
   in indonesia-live.html via GEO_ALIASSEN opgevangen. */
const GEO = {
  brussel:    { lat: 50.9009, lng: 4.4855, name: "✈️ Brussel" },
  singapore:  { lat: 1.3521, lng: 103.8198, name: "🇸🇬 Singapore" },
  hongkong:   { lat: 22.3080, lng: 113.9185, name: "🇭🇰 Hongkong" },
  bangkok:    { lat: 13.6900, lng: 100.7501, name: "🇹🇭 Bangkok" },
  medan:      { lat: 3.5952, lng: 98.6722, name: "🏙️ Medan" },
  ketambe:    { lat: 3.6763, lng: 97.6497, name: "🌴 Ketambe" },
  jakarta:    { lat: -6.2088, lng: 106.8456, name: "🏙️ Jakarta" },
  yogya:      { lat: -7.7956, lng: 110.3695, name: "🕌 Yogyakarta" },
  malang:     { lat: -7.9797, lng: 112.6304, name: "🏡 Malang" },
  surabaya:   { lat: -7.2575, lng: 112.7521, name: "🏙️ Surabaya" },
  banyuwangi: { lat: -8.2191, lng: 114.3691, name: "⚓ Banyuwangi" },
  bali:       { lat: -8.6705, lng: 115.2126, name: "🏝️ Bali" },
  lombok:     { lat: -8.6500, lng: 116.3242, name: "🏝️ Lombok" },
  kuala_lumpur:{ lat: 2.7456, lng: 101.7072, name: "🇲🇾 Kuala Lumpur" },
  labuanbajo: { lat: -8.4539, lng: 119.8842, name: "🌅 Labuan Bajo" },
  ruteng:     { lat: -8.6271, lng: 120.4718, name: "⛰️ Ruteng" },
  padar:      { lat: -8.6534, lng: 119.5772, name: "⛰️ Padar Island" },
  pink_beach: { lat: -8.6015, lng: 119.5222, name: "🏖️ Pink Beach" },
  komodo:     { lat: -8.5503, lng: 119.4880, name: "🦎 Komodo" },
  manta_point:{ lat: -8.5833, lng: 119.5000, name: "🤿 Manta Point" },
  /* Haltes van de 2-daagse Komodo-boottour (24-25/09). manjarite, komodo,
     siaba, sebayur en kanawa stonden op de geschrapte 3-daagse route en
     worden nu niet meer aangedaan; ze blijven staan omdat de tour nog niet
     geboekt is en een langere variant ze weer in beeld brengt. */
  kelor:      { lat: -8.5314, lng: 119.7325, name: "🏝️ Kelor" },
  manjarite:  { lat: -8.5872, lng: 119.7383, name: "🤿 Manjarite" },
  rinca:      { lat: -8.6528, lng: 119.7150, name: "🦎 Rinca" },
  kalong:     { lat: -8.6382, lng: 119.6969, name: "🦇 Kalong" },
  taka_makassar:{ lat: -8.5497, lng: 119.6394, name: "🏖️ Taka Makassar" },
  siaba:      { lat: -8.5561, lng: 119.6742, name: "🐢 Siaba" },
  sebayur:    { lat: -8.4894, lng: 119.7292, name: "🐠 Sebayur" },
  kanawa:     { lat: -8.5222, lng: 119.7583, name: "🏝️ Kanawa" },
  borobudur:  { lat: -7.6079, lng: 110.2038, name: "🛕 Borobudur" },
  prambanan:  { lat: -7.7520, lng: 110.4914, name: "🛕 Prambanan" },
  tumpak_sewu:{ lat: -8.2307, lng: 112.9167, name: "🌊 Tumpak Sewu" },
  madakaripura:{ lat: -7.7925, lng: 113.0656, name: "💧 Madakaripura" },
  bromo:      { lat: -7.9425, lng: 112.9530, name: "🌋 Mount Bromo" },
  ijen:       { lat: -8.0583, lng: 114.2430, name: "🔥 Kawah Ijen" },
  canggu:     { lat: -8.6478, lng: 115.1385, name: "🏄 Canggu" },
  uluwatu:    { lat: -8.8291, lng: 115.0849, name: "🛕 Uluwatu" },
  nusa_penida:{ lat: -8.7275, lng: 115.5444, name: "🏝️ Nusa Penida" },
  ubud:       { lat: -8.5069, lng: 115.2625, name: "🌾 Ubud" },
  amed:       { lat: -8.3375, lng: 115.6563, name: "🤿 Amed" },
  sidemen:    { lat: -8.4503, lng: 115.4326, name: "🌾 Sidemen" },
  agung:      { lat: -8.3433, lng: 115.5089, name: "🌋 Mount Agung" },
  vietnam:    { lat: 10.8231, lng: 106.6297, name: "🇻🇳 Vietnam (Saigon)" }
};

/* Hemelsbrede afstand in km tussen twee GEO-sleutels */
function geoDistanceKm(keyA, keyB) {
  const a = GEO[keyA], b = GEO[keyB];
  if (!a || !b) return 0;
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ---------------- VERVOERSMODUS PER TRAJECT ----------------
   Eén tabel die per locatiepaar zegt hoe die verplaatsing gebeurt. Nodig omdat
   TRIP.map alleen de volgorde van locaties geeft, niet het vervoermiddel, en
   TRANSPORT_LEGS niet elk deeltraject apart beschrijft (bv. de tussenstop
   Singapore of de losse etappes van de Komodo-boottocht).

   mode: "vlucht" (grootcirkelboog) | "trein" | "weg" | "boot" | "ferry" | "hike"
   via:  optionele tussenstop-GEO-sleutel voor vluchten
   Sleutels zijn "van|naar"; tripmap.js zoekt ook de omgekeerde richting op. */
const ROUTE_MODES = {
  /* Internationale & binnenlandse vluchten */
  "brussel|singapore":   { mode:"vlucht", label:"SQ303 · ±12u" },
  "singapore|medan":     { mode:"vlucht", label:"SQ990 · ±1u" },
  "singapore|jakarta":   { mode:"vlucht", label:"SQ956 / SQ952 · ±1u50" },
  "singapore|surabaya":  { mode:"vlucht", label:"SIN → SUB" },
  "brussel|jakarta":     { mode:"vlucht", via:"singapore", label:"BRU → SIN → CGK · 15u40" },
  "brussel|medan":       { mode:"vlucht", via:"singapore", label:"BRU → SIN → KNO" },
  "brussel|surabaya":    { mode:"vlucht", via:"hongkong", label:"BRU → HKG → SUB · 29u 10m" },
  "brussel|hongkong":    { mode:"vlucht", label:"CX294 · 11u 30m" },
  "hongkong|surabaya":   { mode:"vlucht", label:"CX629 · 4u 45m" },
  "medan|jakarta":       { mode:"vlucht", label:"Lion Air JT383 · ±2u25" },
  "jakarta|medan":       { mode:"vlucht", label:"Lion Air JT204 · ±2u15" },
  "banyuwangi|bali":     { mode:"vlucht", label:"Java → Denpasar" },
  "bali|surabaya":       { mode:"vlucht", label:"Super Air Jet IU 703 · 1u" },
  "surabaya|labuanbajo": { mode:"vlucht", label:"SUB → LBJ · direct · ±1u30" },
  "surabaya|lombok":     { mode:"vlucht", label:"Super Air Jet · SUB → LOP · 1u05" },
  "lombok|labuanbajo":   { mode:"vlucht", label:"Wings Abadi · LOP → LBJ · 1u15" },
  "kuala_lumpur|medan":  { mode:"vlucht", label:"KUL → KNO · ±1u" },
  "bali|labuanbajo":     { mode:"vlucht", label:"DPS → LBJ" },
  "labuanbajo|bali":     { mode:"vlucht", label:"LBJ → DPS" },
  "bali|brussel":        { mode:"vlucht", via:"bangkok", label:"DPS → BRU · ±18-20u" },
  "bali|bangkok":        { mode:"vlucht", label:"Thai Airways · 4u 10m" },
  "bangkok|brussel":     { mode:"vlucht", label:"TG934 · 12u 10m" },
  "bali|vietnam":        { mode:"vlucht", label:"DPS → Vietnam (TBD)" },

  /* Treinen (KAI) */
  "jakarta|yogya":       { mode:"trein", label:"Argo Bromo Anggrek · ±8u" },
  "jakarta|prambanan":   { mode:"trein", label:"Argo Bromo Anggrek · ±8u" },
  /* De nachttrein Yogyakarta → Malang is vervallen: de jongens nemen vanaf
     10/09 de GetYourGuide-tour die hen over de weg naar Oost-Java en verder
     tot in Bali brengt. */

  /* Weg (minibus, taxi, jeep) */
  "medan|ketambe":       { mode:"weg", label:"Privé minibus · ±7-8u" },
  "ketambe|medan":       { mode:"weg", label:"Privé taxi · ±7-8u" },
  "prambanan|yogya":     { mode:"weg", label:"Transfer Prambanan → stad" },
  "yogya|borobudur":     { mode:"weg", label:"Dagtrip Borobudur" },
  "malang|surabaya":     { mode:"weg", label:"Taxi · ±1,5-2u via tolweg" },
  "surabaya|malang":     { mode:"weg", label:"Taxi · ±1,5-2u via tolweg" },
  "malang|tumpak_sewu":  { mode:"weg", label:"Jeep · ±2u" },
  "yogya|tumpak_sewu":   { mode:"weg", label:"Tourbus · lange rit oostwaarts" },
  "borobudur|tumpak_sewu":{ mode:"weg", label:"Tourbus · lange rit oostwaarts" },
  "tumpak_sewu|bromo":   { mode:"weg", label:"Jeep-tour" },
  "malang|bromo":        { mode:"weg", label:"Nachtrit · ±2,5-3u" },
  "bromo|madakaripura":  { mode:"weg", label:"Jeep · ±1,5u" },
  "madakaripura|surabaya":{ mode:"weg", label:"Via tolweg · ±2,5u" },
  "bromo|banyuwangi":    { mode:"weg", label:"Taxi · ±5u" },
  "banyuwangi|ijen":     { mode:"hike", label:"Ijen-hike · ±4-5u" },
  "ijen|banyuwangi":     { mode:"hike", label:"Afdaling Ijen" },
  "labuanbajo|ruteng":   { mode:"weg", label:"Auto · ±4u" },
  "ruteng|labuanbajo":   { mode:"weg", label:"Auto · ±4u" },
  "canggu|uluwatu":      { mode:"weg", label:"Transfer Bukit-schiereiland" },
  "canggu|ubud":         { mode:"weg", label:"Transfer naar Ubud" },
  "canggu|amed":         { mode:"weg", label:"Transfer oostkust" },
  "ubud|amed":           { mode:"weg", label:"Transfer naar Amed" },
  "amed|sidemen":        { mode:"weg", label:"Transfer naar Sidemen" },
  "sidemen|agung":       { mode:"weg", label:"Naar startpunt Agung-hike" },
  "agung|bali":          { mode:"weg", label:"Transfer naar Denpasar" },
  "canggu|bali":         { mode:"weg", label:"Transfer naar Denpasar" },

  /* Ferry & boot */
  "banyuwangi|canggu":   { mode:"ferry", label:"Ferry Ketapang → Gilimanuk" },
  "canggu|nusa_penida":  { mode:"boot", label:"Snelboot vanaf Sanur" },
  "bali|nusa_penida":    { mode:"boot", label:"Snelboot vanaf Sanur · ±45 min" },
  "nusa_penida|lombok":  { mode:"boot", label:"Snelboot Nusa Penida → Lombok" },
  "lombok|bali":         { mode:"boot", label:"Snelboot Lombok → Bali · ±2u" },
  "uluwatu|nusa_penida": { mode:"boot", label:"Snelboot vanaf Sanur" },
  "nusa_penida|ubud":    { mode:"boot", label:"Boot terug + transfer Ubud" },
  "labuanbajo|padar":    { mode:"boot", label:"Komodo boottour" },
  "padar|pink_beach":    { mode:"boot", label:"Komodo boottour · dag 2" },
  "pink_beach|komodo":   { mode:"boot", label:"Komodo boottour · dag 2" },
  "komodo|manta_point":  { mode:"boot", label:"Komodo boottour · dag 2" },
  "manta_point|labuanbajo":{ mode:"boot", label:"Terug naar Labuan Bajo" },

  /* Komodo-boottour — alle haltes liggen op één vaarlijn,
     dus elke hop krijgt zijn eigen regel; zonder deze tabel raadt routeMode()
     op afstand en worden korte hops van 10 km als "weg" getekend. */
  "labuanbajo|kelor":    { mode:"boot", label:"Dag 1 · uitvaren" },
  "kelor|rinca":         { mode:"boot", label:"Dag 1 · naar Rinca" },
  "kelor|manjarite":     { mode:"boot", label:"Dag 1 · naar de snorkelbaai" },
  "manjarite|rinca":     { mode:"boot", label:"Dag 1 · naar Rinca" },
  "rinca|kalong":        { mode:"boot", label:"Dag 1 · zonsondergang & ankerplaats" },
  "kalong|padar":        { mode:"boot", label:"Nachtvaart naar Padar" },
  "pink_beach|manta_point":{ mode:"boot", label:"Dag 2 · naar Manta Point" },
  "manta_point|taka_makassar":{ mode:"boot", label:"Dag 2 · naar Taka Makassar" },
  "taka_makassar|labuanbajo":{ mode:"boot", label:"Dag 2 · terugvaart, aankomst ±19:00" },
  "taka_makassar|siaba": { mode:"boot", label:"Dag 3 · naar Siaba" },
  "siaba|sebayur":       { mode:"boot", label:"Dag 3 · naar Sebayur" },
  "sebayur|kanawa":      { mode:"boot", label:"Dag 3 · naar Kanawa" },
  "kanawa|labuanbajo":   { mode:"boot", label:"Dag 3 · terug voor 14:00" },
};

/* Visuele eigenschappen per vervoersmodus. */
const ROUTE_MODE_STYLE = {
  vlucht: { icon:"✈️", naam:"Vlucht",  color:"#4cc9f0", dash:"7 9",  arc:true  },
  trein:  { icon:"🚂", naam:"Trein",   color:"#9d4edd", dash:null,   arc:false },
  weg:    { icon:"🚐", naam:"Over land", color:"#4ad66d", dash:null, arc:false },
  hike:   { icon:"🥾", naam:"Te voet", color:"#f77f00", dash:"2 6",  arc:false },
  boot:   { icon:"⛵", naam:"Boot",    color:"#00f5d4", dash:"10 6", arc:false },
  ferry:  { icon:"⛴️", naam:"Ferry",   color:"#00b4d8", dash:"10 6", arc:false },
};

/* Zoekt de modus van een traject op, ongeacht de richting. Zonder treffer
   wordt op afstand geschat: >600 km over zee/land betekent in de praktijk
   altijd een vlucht binnen deze reis. */
function routeMode(fromKey, toKey) {
  const direct = ROUTE_MODES[fromKey + "|" + toKey];
  if (direct) return { ...direct, reversed: false };
  const rev = ROUTE_MODES[toKey + "|" + fromKey];
  if (rev) return { ...rev, reversed: true };
  const km = geoDistanceKm(fromKey, toKey);
  return { mode: km > 600 ? "vlucht" : "weg", label: "", reversed: false, guessed: true };
}

/* ---------------- CENTRALE REIS ITINERARY (TRIP) ---------------- */
const TRIP = [
  { id:"t1", fase:"heen", start:"2026-08-29", end:"2026-08-30", title:"✈️ Brussel → Singapore → Medan (Matthew)", details:["✈️ Vlucht vertrekt: 29 aug om 11:45 | Aankomst: 30 aug om 08:00", "SQ303: BRU 11:45 (29/08) → SIN 06:40 (30/08), Singapore Airlines.", "Tot Singapore zit Matthew op dezelfde vlucht als Eliott, Willem, Kamiel en Kasper; in Changi splitst de groep — zij vliegen door naar Jakarta (SQ956), hij naar Medan.", "Overstap 50 min in Changi.", "SQ990: SIN 07:30 → Medan (KNO) 08:00 (30/08).", "Arne vliegt niet mee vanuit Brussel: hij zit sinds 10 augustus in Maleisië en komt op eigen houtje vanuit Kuala Lumpur naar Medan."], costs:["c1"], map:["brussel","singapore","medan"], duration: "15u 15m" },
  { id:"t1b", fase:"heen", start:"2026-08-30", end:"2026-08-30", title:"✈️ Kuala Lumpur → Medan (Arne)", details:["Arne is op 10 augustus al naar Maleisië vertrokken en blijft daar tot de rest toekomt — zijn oorspronkelijke vlucht uit Brussel kon hij niet annuleren.", "Vlucht Kuala Lumpur → Medan, ±1u, rond de €50.", "Matthew en Arne ontmoeten elkaar rond 14:00 in Medan; vanaf dat moment reizen ze samen verder.", "Let op: exacte vlucht en tijd nog te bevestigen."], costs:["c2b"], map:["kuala_lumpur","medan"], duration: "±1u", openNote: true },
  { id:"t3", fase:"sumatra", start:"2026-08-30", end:"2026-09-01", title:"🏨 Medan — aankomst & wachten", details:["Matthew landt op 30 aug om 08:00 in Medan; Arne komt diezelfde dag aan uit Kuala Lumpur en ze treffen elkaar rond 14:00.", "Overnachting in Medan (30-31 aug), in afwachting van de rest van de groep.", "Op 01/09 rond middaguur ontmoeten zij Kamiel, Eliott, Kasper & Willem (Lion Air JT204 uit Jakarta, aankomst 10:20).", "Diezelfde middag vertrekken allen samen met privé minibus naar Ketambe (±7-8u rit).", "Overnachting in guesthouse Ketambe (eerste nacht vóór trek)."], costs:[], map:["medan"], otherFlight:"c6b" },
  { id:"t4", fase:"sumatra", start:"2026-09-01", end:"2026-09-02", title:"🚐 Medan → Ketambe (middag 1 sep, overnachting)", details:["Alle 6 man: Matthew, Arne, Willem, Kasper, Eliott, Kamiel.", "Middag 1 sep: privé minibus vertrek vanuit Medan Kualanamu (na ontmoeting 4-tal uit Jakarta).", "Rit van ±7-8u door Sumatra oerwoud naar Ketambe.", "Overnachting in guesthouse Ketambe, geregeld door gids Hasby — dit is de eerste nacht vóór de trek."], costs:["c3","c4b"], map:["medan","ketambe"], duration: "7-8u" },
  { id:"t5", fase:"sumatra", start:"2026-09-02", end:"2026-09-06", title:"🥾 Jungle Adventure Trek — 5 dagen diep in Sumatra", details:["Adventure Jungle Trekking (5 dagen, 4 nachten) met gids Hasby Ketambe.", "Volwassen jungle exploratie met dagelijks verplaatsen van kampement diep in Gunung Leuser National Park, op zoek naar wilde orang-oetans, gibbons, macaques en vogelparadijzen.", "All-in: 1 gids + 2 porters, professioneel kampeermateriaal (tent, slaapzak, matras), alle maaltijden/drinken, permits forest entrance.", "Special group rate: IDR 800.000 pp/dag (€47 equivalent) × 6 personen = 19.500.000 IDR totaal.", "Aanbetaling 8% (IDR 1.920.000) overgemaakt 03/07; restbedrag ter plaatse contant of overschrijving.", "Contact: Hasby Ketambe (WhatsApp +62 85373207007, email hasbyketambe@gmail.com)."], costs:["c4"], map:["ketambe"] },
  { id:"t6", fase:"sumatra", start:"2026-09-06", end:"2026-09-07", title:"🏨 Ketambe — rustdag na trek", details:["Overnachting (tweede nacht) in guesthouse Ketambe na afloop van de intensieve 5-daagse trek, geregeld door gids Hasby."], costs:["c4b"], map:["ketambe"] },
  { id:"t6b", fase:"sumatra", start:"2026-09-07", end:"2026-09-07", title:"🚐✈️ Ketambe → Medan → Jakarta (7 sept)", details:["Terugrit naar Medan met privé taxi (±7-8u); aankomst laat in de middag.", "Lion Air JT383: Medan (19:00) → Jakarta (21:25) — aankomst laat op de avond na de trek.", "Overnachting in Jakarta, klaar om de volgende dag Maurice, Mathias & Jens te ontmoeten."], costs:["c5","c6"], map:["ketambe","medan","jakarta"], duration: "~7-8u taxi + 1.5u vlucht" },
  { id:"t7", fase:"jakarta", start:"2026-09-08", end:"2026-09-08", title:"🏙️ Jakarta — Maurice, Mathias & Jens sluiten aan", details:["Maurice, Mathias & Jens komen 's ochtends per vlucht aan in Jakarta (08:25) — de groep is nu compleet met 9 man.", "'s Avonds samen de stad in om de hereniging te vieren."], costs:["c19"], map:["jakarta"], otherFlight:"c28" },
  { id:"t8", fase:"java", start:"2026-09-09", end:"2026-09-09", title:"🚂 Jakarta → Yogyakarta", details:["De jongens nemen de trein (Argo Bromo Anggrek, ±8u) van Jakarta naar Yogyakarta.", "Onderweg tempelbezoek aan de hindoetempel Prambanan.", "Overnachting in Yogyakarta.", "Tip: de tempelentree dekt zowel Prambanan (vandaag) als Borobudur (morgenvroeg, zie volgende dag)."], costs:["c7","c7b","c20"], map:["jakarta","prambanan","yogya"], duration: "~8u trein" },
  { id:"t9", fase:"java", start:"2026-09-10", end:"2026-09-10", title:"🚐 Borobudur & start van de Oost-Java-tour (alle 9)", details:["Vroeg in de ochtend bezoek aan de boeddhistische tempel Borobudur.", "Daarna pickup in Yogyakarta voor de 4-daagse GetYourGuide-tour: Tumpak Sewu, Bromo en Ijen, met vervoer én drie overnachtingen inbegrepen, tot aan de villa in Canggu.", "Lange rit oostwaarts door Java; overnachting onderweg in de buurt van Tumpak Sewu.", "±€116-130 pp voor ±750-1.000 km, activiteiten en 3 nachten — Kasper zag $153 als prijs, dus even nakijken bij het boeken.", "De nachttrein Yogyakarta → Malang is hiermee vervallen.", "Let op: tour nog te boeken — Kasper zou voorschieten (±€900 voor de hele groep). Gratis annuleren tot 24u vooraf.", "Let op: check of de ochtend bij Borobudur past bij het pickup-uur van de tour."], costs:["c8"], map:["yogya","borobudur","tumpak_sewu"], duration: "lange rit", openNote: true },
  { id:"t10b", fase:"java", start:"2026-09-11", end:"2026-09-12", title:"🌋 Tumpak Sewu & Bromo (alle 9)", details:["11/09: Tumpak Sewu waterval, dan doorrijden naar de Bromo-regio.", "12/09: om 3u 's nachts op voor Mount Bromo bij zonsopgang.", "Daarna door naar Banyuwangi voor de Ijen-hike.", "Vervoer, gids en overnachtingen zitten in de GetYourGuide-tour (zie 10/09).", "Let op: bij Mount Bromo woedde begin augustus 2026 een natuurbrand die ±550 hectare verwoestte — check de toegankelijkheid vóór vertrek."], costs:[], map:["tumpak_sewu","bromo","banyuwangi"], openNote: true },
  { id:"t11", fase:"bali", start:"2026-09-13", end:"2026-09-15", title:"🏄 Canggu — twee dagen Bali met de jongens (Matthew)", details:["Matthew blijft na de ferry twee dagen in Canggu bij de jongens: strand, surf en bijkomen na de vulkanen.", "Verblijft mee in de villa van de jongens in Canggu.", "Op 15/09 in de namiddag naar Ngurah Rai (DPS) voor de vlucht naar Surabaya."], costs:[], map:["canggu"] },
  { id:"t11a", fase:"java", start:"2026-09-15", end:"2026-09-15", title:"✈️ Bali → Surabaya (Matthew haalt Hinke op)", details:["✈️ Super Air Jet IU 703: Denpasar (DPS, Ngurah Rai) 16:40 → Surabaya (SUB, Juanda) 16:40 lokale tijd — 1u vliegen, met één uur tijdsverschil (WITA → WIB).", "Airbus A320, Economy · € 36 · 51 kg CO2e.", "Transfer Canggu → luchthaven Denpasar vooraf inplannen (±1u, meer bij avondspits).", "Matthew wacht op Juanda; Hinke landt om 18:15 (Cathay Pacific CX294+CX629).", "Daarna samen door naar de villa in Blimbing (±2u rijden); vanaf hier reizen ze samen verder."], costs:["c35"], map:["canggu","bali","surabaya"], otherFlight:"c29", duration: "1u" },
  { id:"t11b", fase:"java", start:"2026-09-15", end:"2026-09-18", title:"🏡 Villa Panda in Blimbing — basis voor Oost-Java", details:["Villa Panda, geboekt voor Matthew & Hinke van 15 tot 18 september (3 nachten).", "Aankomst per privéauto vanuit Surabaya (±1,5-2u via tolweg); check-in ook al is dat pas laat op de avond.", "16/09: bewust geen vroege wekker — uitslapen om de jetlag van de lange vlucht op te vangen, vóór de twee tochten die volgen.", "De derde nacht (17-18/09) is nodig omdat de vlucht naar Lombok pas op 18/09 om 11:00 uit Surabaya vertrekt.", "Vervangt de eerder geboekte Wonderhouz Premium Villa.", "Let op: prijs nog in te vullen."], costs:["c25"], map:["surabaya","malang"], openNote: true },
  { id:"t11c", fase:"java", start:"2026-09-16", end:"2026-09-16", title:"🌊 Tumpak Sewu — met Hinke", details:["Eerste dag van de GetYourGuide-tour vanuit Malang die Hinke op 24 augustus geboekt heeft (Tumpak Sewu + Mount Bromo).", "Panoramauitzicht op de honderden watervalstralen, dan de trekking naar de basis.", "Terug naar Villa Panda in Blimbing voor de nacht.", "Let op: exacte pickup-tijd en betaald bedrag nog in te vullen."], costs:["c21"], map:["malang","tumpak_sewu"], openNote: true },
  { id:"t12", fase:"java", start:"2026-09-17", end:"2026-09-17", title:"🌋 Mount Bromo & Madakaripura — vroege ochtend", details:["00:00 pickup bij de villa in Blimbing.", "03:00 aankomst bij het zonsopgangpunt.", "06:00 terug de jeep in richting krater; 06:30 aankomst kraterparking, dan de trekking naar de kraterrand (±3 km heen-terug).", "08:00 door naar de Madakaripura-waterval; 09:30 aankomst, waterval-trekking door de spleetcanyon.", "Tweede dag van Hinkes GetYourGuide-tour; Kawah Ijen slaan ze over ten gunste van Madakaripura.", "Terug naar Villa Panda in Blimbing — de checkout is pas de volgende ochtend.", "Let op: bij Mount Bromo woedde begin augustus 2026 een natuurbrand van ±550 hectare — check de toegankelijkheid."], costs:[], map:["malang","bromo","madakaripura"], openNote: true },
  { id:"t14", fase:"lombok", start:"2026-09-18", end:"2026-09-18", title:"✈️ Blimbing → Surabaya → Lombok", details:["Ochtend: checkout bij Villa Panda en rit naar Surabaya Juanda (±1,5-2u via de tolweg) — vertrek rond 08:00.", "✈️ Super Air Jet: Surabaya (SUB) 11:00 → Lombok (LOP, Zainuddin Abdul Madjid) 13:05 — directe vlucht, 1u05, €42.", "Er waren ook vluchten om 06:00 en 07:00 voor €40, maar die zijn niet te combineren met een vertrek uit Blimbing.", "Let op: vlucht nog te boeken."], costs:["c11"], map:["malang","surabaya","lombok"], duration: "1u 05m", openNote: true },
  { id:"t42", fase:"lombok", start:"2026-09-18", end:"2026-09-22", title:"🏝️ Lombok — vier nachten", details:["Vier nachten op Lombok met Hinke, tussen Oost-Java en Flores in.", "Mogelijke bases: Kuta Lombok in het zuiden (±25 min van de luchthaven, surfstranden en Mandalika), Senggigi aan de westkust, of doorsteken naar de Gili-eilanden om te snorkelen en duiken.", "Ook de moeite: de uitzichtpunten op Mount Rinjani, de Tiu Kelep-waterval en Selong Belanak.", "Let op: locatie nog niet gekozen en verblijf nog te zoeken — daarom staat Lombok voorlopig als één punt op de kaart."], costs:["c40"], map:["lombok"], openNote: true },
  { id:"t43", fase:"flores", start:"2026-09-22", end:"2026-09-22", title:"✈️ Lombok → Labuan Bajo", details:["✈️ Wings Abadi Airlines: Lombok (LOP) 12:25 → Labuan Bajo (LBJ, Komodo) 13:40 — directe vlucht, 1u15, €91.", "Let op: vlucht nog te boeken."], costs:["c11b"], map:["lombok","labuanbajo"], duration: "1u 15m", openNote: true },
  { id:"t44", fase:"flores", start:"2026-09-22", end:"2026-09-24", title:"🌅 Labuan Bajo — twee nachten vóór de boottocht", details:["Aankomst in de namiddag van 22/09; twee nachten in Labuan Bajo (22-23 en 23-24 september).", "Tijd om de haven te verkennen, te duiken of de uitzichtpunten boven de baai te doen.", "De pickup voor de boottocht is op 24/09 tussen 10:00 en 11:00 bij het hotel.", "Let op: verblijf nog te zoeken.", "Let op: half augustus 2026 werd Labuan Bajo getroffen door een aardbeving en een tsunami — check de situatie ter plaatse vóór je boekt."], costs:["c12"], map:["labuanbajo"], openNote: true },
  { id:"t19", fase:"komodo", start:"2026-09-24", end:"2026-09-24", title:"🛥️ Komodo 2-daagse boottour — dag 1: Kelor, Rinca & Kalong", details:["2-daagse tour met 1 nacht aan boord via komodoboattour.com — de 3-daagse GetYourGuide-tour van €320,76 is hiervoor geschrapt.", "10:00-11:00: pickup bij het hotel of de luchthaven in Labuan Bajo.", "11:00-12:00: voorbereiding in de haven; 12:00 uitvaren met lunch aan boord.", "13:00-15:00: Kelor Island — korte klim voor het uitzicht en zwemmen.", "15:30-16:30: Rinca Island, waar de komodovaranen leven (op deze kortere route wordt Komodo Island zelf níét aangedaan).", "17:30-18:30: zonsondergang bij Kalong Island, waar duizenden vleerhonden opstijgen.", "19:00-20:00: diner bij Kambing Island, daarna de nacht aan boord terwijl de boot naar Padar vaart.", "Let op: tour nog te boeken. Richtprijs gedeelde cabine ±€145-165 pp; entree Komodo National Park (IDR 400-650k) zit er meestal niet bij.", "Let op: de oude GetYourGuide-boeking moet nog geannuleerd worden — dat kan gratis tot 17 september."], costs:["c23"], map:["labuanbajo","kelor","rinca","kalong"], openNote: true },
  { id:"t19b", fase:"komodo", start:"2026-09-25", end:"2026-09-25", title:"🌅 Boottour dag 2: Padar bij zonsopgang, Pink Beach, Manta Point & Taka Makassar", details:["06:00: ontbijt aan boord en klaarmaken voor de klim.", "07:00-09:00: Padar Island — de trektocht naar het iconische uitzicht over de drie baaien.", "10:00-12:00: Pink Beach, zwemmen en snorkelen bij het roze koraalzand.", "12:00-13:00: uitvaren naar Manta Point met lunch aan boord.", "13:00-15:00: snorkelen met de mantaroggen.", "16:00-17:30: Taka Makassar, de halvemaanvormige zandbank midden in zee.", "17:30-19:00: terugvaart naar Labuan Bajo, aankomst rond 19:00.", "Tip: Padar begint in het donker — hoofdlamp en stevige schoenen klaarleggen."], costs:[], map:["padar","pink_beach","manta_point","taka_makassar","labuanbajo"] },
  { id:"t45", fase:"flores", start:"2026-09-25", end:"2026-09-26", title:"🏨 Labuan Bajo — nacht na de boottocht", details:["De boot legt rond 19:00 aan; nog één nacht in Labuan Bajo vóór de vlucht naar Bali.", "Douchen, was doen en eten in het centrum.", "Let op: verblijf nog te zoeken."], costs:["c14"], map:["labuanbajo"], openNote: true },
  { id:"t21", fase:"bali", start:"2026-09-26", end:"2026-09-26", title:"✈️ Labuan Bajo → Bali", details:["✈️ Indonesia AirAsia: Labuan Bajo (LBJ) 10:35 → Denpasar (DPS) 11:50 — directe vlucht, 1u15, €63.", "Let op: vlucht nog te boeken."], costs:["c15"], map:["labuanbajo","bali"] },
  { id:"t22", fase:"bali", start:"2026-09-26", end:"2026-09-28", title:"🏖️ Bali — luxe & chill", details:["Laatste dagen in een luxe villa op Bali: zwembad, strand en lekker uit eten.", "Rustig afsluiten van de reis voor Matthew en Hinke."], costs:["c16"], map:["bali"] },
  { id:"t23", fase:"terug", start:"2026-09-29", end:"2026-09-30", title:"✈️ Terugvlucht Bali → Bangkok → Brussel (Matthew & Hinke)", details:["✈️ Vlucht vertrekt: 29 sep om 19:00 | Aankomst: 30 sep om 07:15", "TG440: Denpasar (DPS, Ngurah Rai) 19:00 → Bangkok (BKK, Suvarnabhumi) 22:10 op 29/09, Thai Airways, 4u 10m, Economy.", "Overstap 1u 55m in Bangkok Suvarnabhumi.", "TG934: Bangkok (BKK) 00:05 → Brussel (BRU) 07:15 op 30/09, Thai Airways, 12u 10m, Economy.", "Bagage per persoon: 1 ruimbagagestuk van max. 23 kg, 1 handbagage van max. 7 kg (25×45×56 cm) en 1 persoonlijk item.", "Annuleren en omboeken kan tegen betaling van een fee.", "Prijs nog te bevestigen (TBD)."], costs:["c17"], map:["bali","bangkok","brussel"], openNote: true, duration: "18u 15m" },
  { id:"t27", fase:"heen", start:"2026-08-29", end:"2026-08-30", title:"✈️ Brussel → Singapore → Jakarta (Kamiel, Eliott, Kasper, Willem)", details:["✈️ Vlucht vertrekt: 29 aug om 11:45 | Aankomst: 30 aug om 09:55", "SQ 303: BRU 11:45 (29/08) → SIN 06:40 (30/08).", "Layover 2u25 in Changi (Singapore).", "SQ 956: SIN 09:05 → CGK 09:55 (30/08), aankomst Jakarta Soekarno Intl T3.", "Beide segmenten: Airbus A350-900, Economy."], costs:["c26"], map:["brussel","singapore","jakarta"], duration: "17u 10m" },
  { id:"t28", fase:"heen", start:"2026-08-30", end:"2026-08-31", title:"🏙️ Jakarta — aankomst & acclimatiseren (Kamiel, Eliott, Kasper, Willem)", details:["Aankomst 30/08 om 09:55 op Jakarta Soekarno Intl T3.", "Twee overnachtingen in Jakarta (30 en 31 aug).", "Stad verkennen om te acclimatiseren."], costs:["c27"], map:["jakarta"] },
  { id:"t29", fase:"heen", start:"2026-09-01", end:"2026-09-01", title:"✈️ Jakarta → Medan (Kamiel, Eliott, Kasper, Willem)", details:["Vlucht Jakarta (CGK) → Medan.", "Ontmoeting met Matthew & Arne in Medan.", "Aansluitend met alle 6 man taxi naar Ketambe (±7-8u)."], costs:["c6b"], map:["jakarta","medan"], duration: "~1.5u vlucht + 7-8u taxi" },
  { id:"t30", fase:"java", start:"2026-09-13", end:"2026-09-13", title:"🔥 Kawah Ijen 's nachts (alle 9)", details:["Om 1u 's nachts op voor de Kawah Ijen-hike: blauwvuur en zwavelmeer bij zonsopgang.", "Laatste dag van de GetYourGuide-tour; entree en gids zijn inbegrepen.", "Matthew doet Ijen alleen deze ronde — met Hinke gaat hij later naar Madakaripura in plaats van opnieuw naar Ijen."], costs:[], map:["banyuwangi","ijen"], duration: "~4-5u hike" },
  { id:"t30b", fase:"bali", start:"2026-09-13", end:"2026-09-13", title:"🚢 Ferry naar Bali → Canggu (alle 9)", details:["Na de Kawah Ijen-hike taxi naar Ketapang, dan ferry naar Gilimanuk (Bali), en doorrijden naar Canggu.", "De ferry en het transport tot aan de villa in Canggu zitten in de GetYourGuide-tour inbegrepen — dat was voor de groep juist het doorslaggevende argument.", "Matthew steekt mee over en blijft tot 15/09 op Bali."], costs:[], map:["banyuwangi","canggu"], duration: "~3-4u totaal" },
  { id:"t30c", fase:"bali", start:"2026-09-13", end:"2026-09-19", title:"🏡 Villa in Canggu — basis voor de Bali-week (8p)", details:["Airbnb geboekt: superbe villa moderne, 4 slaapkamers, 400 m van het strand (4,92★, 49 reviews, 'Coup de cœur voyageurs').", "Check-in 13/09, check-out 19/09 (6 nachten), voor 8 personen: Willem, Eliott, Jens, Arne, Maurice, Kamiel, Kasper & Mathias.", "Tip: prijs 6 nachten × €398,01 = €2.388,06, min. speciale korting €573,12 → totaal €1.814,94.", "Tip: betaling gesplitst: €907,50 nu, €907,44 op 29/08.", "Tip: gratis annulering binnen 24u.", "Tip: dit is de accommodatie voor de jongens tijdens het volledige 7-daagse Bali-programma (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — niet inbegrepen in Matthews eigen kostendashboard, want Matthew & Hinke doen op dat moment de Flores/Komodo-route."], costs:["c30"], map:["canggu"] },
  { id:"t31", fase:"bali", start:"2026-09-13", end:"2026-09-14", title:"🏄 Bali dag 1–2 — Canggu", details:["Surfen: Batu Bolong Beach (zachte golven, ideaal voor beginners), Echo Beach (iets pittiger), Old Man's (relaxte sfeer).", "Zonsondergang bij beachclubs: Old Man's, La Brisa of Finns.", "Optioneel stop: Tanah Lot klieftempel in zee."], costs:[], map:["canggu"] },
  { id:"t32", fase:"bali", start:"2026-09-14", end:"2026-09-15", title:"🛕 Bali dag 2–3 — Uluwatu", details:["Uluwatu Temple: klieftempel + Kecak dance bij zonsondergang.", "Surfen op Uluwatu/Padang Padang (gevorderde reef breaks) en Bingin & Impossibles.", "Single Fin: legendarische sunset-bar boven de golven.", "Suluban (Blue Point) strand bereikbaar via een grot.", "Bingin Beach: chille vibe met warungs en cliffside cafés."], costs:[], map:["canggu","uluwatu"] },
  { id:"t33", fase:"bali", start:"2026-09-16", end:"2026-09-16", title:"🏝️ Bali dag 4 — Nusa Penida", details:["Vroege boot vanaf Sanur.", "Kelingking Beach: iconisch T-rex-uitzicht, eventueel afdalen.", "Broken Beach: natuurlijke rotsboog boven turquoise water.", "Angel's Billabong: natuurlijk zwembad in de rotsen.", "Snorkelen met manta rays (beroemde mantapunt).", "Crystal Bay voor extra snorkelen."], costs:[], map:["uluwatu","nusa_penida"] },
  { id:"t34", fase:"bali", start:"2026-09-17", end:"2026-09-17", title:"🌾 Bali dag 5 — Ubud", details:["Tegalalang Rice Terrace: iconische groene terrassen met swings.", "Tirta Empul: heilige waterbrontempel, reinigingsritueel mogelijk.", "Monkey Forest: bosreservaat met apen en oude tempels.", "Campuhan Ridge Walk bij zonsopgang.", "Optioneel: Balinese kookles met marktbezoek of Tegenungan waterval."], costs:[], map:["nusa_penida","ubud"] },
  { id:"t35", fase:"bali", start:"2026-09-18", end:"2026-09-18", title:"🤿 Bali dag 6 — Amed & Tulamben", details:["USAT Liberty Wreck: wereldberoemde wrakduik, ook goed te snorkelen.", "Coral Garden: snorkelspot met kleurrijk rif vlak bij de kust.", "Freediving sessie: Amed staat bekend om intro's en cursussen.", "Jemeluk Bay voor een ontspannen snorkelsessie.", "Uitzicht op Mount Agung vanaf rustige stranden."], costs:[], map:["ubud","amed"] },
  { id:"t36", fase:"bali", start:"2026-09-19", end:"2026-09-19", title:"🌋 Bali dag 7 — Sidemen & Mount Agung", details:["Sidemen rijstterrassen: rustige wandeling, minder toeristisch dan Ubud.", "Besakih Temple: moedertempel van Bali, aan de voet van Agung.", "Mount Agung sunrise hike: middernacht vertrek, 4–6u klimmen, episch uitzicht op Lombok.", "Verplichte lokale gids (max. 3 pp/gids, verplicht since 2025).", "Herstel 's middags, eventueel hot springs."], costs:[], map:["amed","sidemen","agung"] },
  { id:"t37", fase:"terug", start:"2026-09-19", end:"2026-09-20", title:"✈️ Bali → Vietnam (Maurice & Mathias) — TBD", details:["✈️ Vertrek: 19-20 sep (TBD) | Bestemming: Hanoi", "Meteen na de check-out uit de villa in Canggu vliegen Maurice en Mathias door naar Vietnam.", "Maurice bevestigde zijn vlucht op 24 augustus; Mathias heeft de terugvlucht Hanoi → Brussel van 8 oktober op zijn naam staan.", "Exacte vertrekdatum nog te bevestigen."], costs:["c32"], map:["bali","vietnam"], openNote: true, duration: "~4-5u vlucht" },
  { id:"t37b", fase:"terug", start:"2026-09-25", end:"2026-09-30", title:"✈️ Lombok → Vietnam (Willem) — TBD", details:["✈️ Vertrek: eind september (TBD) | Bestemming: Hanoi", "Willem gaat niet meteen met Maurice en Mathias mee: hij doet eerst Lombok en Nusa Penida.", "Hij mikt op eind september — hij zag Bali → Hanoi voor ±€130 en 30 september als goedkoopste vertrekdag.", "In Vietnam sluit Tjorre aan voor de Ha Giang-loop.", "Exacte vluchtdatum en vertrekpunt nog te bevestigen."], costs:["c32"], map:["lombok","bali","vietnam"], openNote: true, duration: "~4-5u vlucht" },
  { id:"t40", fase:"lombok", start:"2026-09-19", end:"2026-09-25", title:"🏝️ Lombok & Nusa Penida (Arne, Kasper, Jens & Willem)", details:["Na de check-out uit de villa in Canggu (19/09) trekken Arne, Kasper, Jens en Willem door naar Lombok — precies het moment waarop Eliott en Kamiel naar huis vertrekken.", "Onderweg ook Nusa Penida, dat tussen Bali en Lombok ligt: Kelingking Beach, Broken Beach en snorkelen met mantaroggen.", "Willem slaat het duiken op Bali over om het hier te doen.", "Arne, Kasper en Jens vliegen op 25 september 's avonds naar huis; Willem reist door naar Vietnam.", "Let op: verblijf nog niet geboekt — Willem wilde daar bewust mee wachten."], costs:["c34"], map:["bali","nusa_penida","lombok"], openNote: true },
  { id:"t38", fase:"terug", start:"2026-09-25", end:"2026-09-26", title:"✈️ Terugvlucht Bali → Bangkok → Brussel (Arne, Kasper & Jens)", details:["✈️ Vlucht vertrekt: 25 sep om 16:55 | Aankomst: 26 sep om 07:15", "TG432: Denpasar (DPS, Terminal I) 16:55 → Bangkok (BKK, Suvarnabhumi) 20:05 op 25/09, Thai Airways, 4u 10m, Economy.", "Overstap 4u in Bangkok Suvarnabhumi.", "TG934: Bangkok (BKK) 00:05 → Brussel (BRU) 07:15 op 26/09, Thai Airways, 12u 10m, Economy.", "Boekingsnummer CheapTickets: CBE-11227216 · check-incode (PNR): YCX2VO.", "E-ticketnummers: Arne 217-5238812870, Jens 217-5238812871, Kasper 217-5238812872.", "Bagage: 1 ruimbagagestuk van max. 23 kg per passagier."], costs:["c31"], map:["bali","bangkok","brussel"], duration: "20u 20m" },
  { id:"t38b", fase:"terug", start:"2026-09-19", end:"2026-09-21", title:"✈️ Terugvlucht Bali → Brussel (Eliott & Kamiel) — TBD", details:["✈️ Vlucht vertrekt: 19 sep (TBD) | Thuis: 21 sep", "Eliott en Kamiel staan niet op de Thai Airways-boeking van 25/09 (Arne, Kasper & Jens).", "Kamiel gaf aan dat ze op 21 september terug in België zijn; ze vertrekken op 19/09 uit Bali, wanneer de rest naar Lombok doorreist.", "Ze moeten nog een vlucht Bali → Jakarta boeken om op hun internationale vlucht te geraken.", "Exacte vluchtdatum, -tijd en maatschappij nog te bevestigen."], costs:["c33"], map:["agung","bali","brussel"], openNote: true, duration: "~20u" },
  { id:"t39", fase:"heen", start:"2026-09-07", end:"2026-09-08", title:"✈️ Brussel → Jakarta (Maurice, Mathias, Jens)", details:["✈️ Vlucht vertrekt: 7 sep om 11:45 | Aankomst: 8 sep om 08:25", "SQ303: BRU 11:45 (07/09) → SIN 06:40 (08/09), Singapore Airlines Airbus A350-900.", "Overstap 1u in Changi T2.", "SQ952: SIN 07:40 → CGK 08:25 (08/09), Airbus A350-900, aankomst Soekarno-Hatta T3.", "Boekingsref. voor deze vlucht (Jens): FSXOOZ (ticket 618-2479864879), ticketprijs €680,77 pp.", "Maurice en Mathias nemen dezelfde vlucht."], costs:["c28"], map:["brussel","jakarta"], duration: "15u40" },
  { id:"t41", fase:"heen", start:"2026-09-14", end:"2026-09-15", title:"✈️ Brussel → Hongkong → Surabaya (Hinke)", details:["✈️ Cathay Pacific CX294: BRU 13:05 (14/09) → HKG 06:35 (15/09) · Airbus A350", "✈️ Cathay Pacific CX629: HKG 14:30 (15/09) → SUB 18:15 (15/09) · Airbus A330", "Overstap in Hongkong (Chek Lap Kok) van 06:35 tot 14:30.", "Vlucht Hinke naar Surabaya om daar bij Matthew aan te sluiten."], costs:["c29"], map:["brussel","hongkong","surabaya"], duration: "29u 10m (met overstap)" },
];

/* ================================================================
   DAGEN: één blok per kalenderdag (afgeleid uit TRIP)

   De etappes in TRIP lopen soms over meerdere dagen (de villa in Canggu
   van 13 t/m 15 sep) en soms lopen er meerdere door elkaar op één dag
   (13 sep: Ijen-hike, ferry én aankomst Canggu). Het schema toont per
   kalenderdag één blok, dus wordt hier per persoon een dagenlijst
   afgeleid: welke etappes die dag lopen, en onder welk hoofdstuk (fase)
   de dag valt.

   Deze laag wijzigt TRIP niet — kosten, kaart en stepper blijven op de
   etappes werken.
   ================================================================ */

/* Datumrekenen in UTC. `new Date("2026-08-29T00:00:00")` is lokale tijd, en
   dan levert toISOString() in de zomer (CEST) "2026-08-28" op — een hele
   dagenlijst schuift daardoor één dag terug. */
function dagenTussen(a, b) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

function volgendeDag(ds) {
  const d = new Date(Date.parse(ds + "T00:00:00Z") + 86400000);
  return d.toISOString().slice(0, 10);
}

/* Grove inschatting van hoeveel van een dag je in de fase van deze etappe
   doorbrengt. Geen tijden in de data, dus afgeleid uit de vorm van de
   etappe: een verblijf (één map-sleutel) houdt je langer op één plek dan
   een verplaatsing, en de laatste dag van een verblijf duurt tot je
   vertrekt — vandaar dat die zwaarder weegt dan de aankomstdag, waarop je
   pas 's avonds arriveert. */
function dagGewicht(trip, ds) {
  const eendaags = trip.start === trip.end;
  const verplaatst = (trip.map || []).length >= 2;

  if (verplaatst) {
    if (eendaags) return 2;               // dagtocht: halve dag hier, halve dag daar
    if (ds === trip.end) return 2;        // aankomstdag
    return 1;                             // vertrek- of tussendag
  }
  if (eendaags) return 4;                 // volledige dag op één plek
  if (ds === trip.end) return 4;          // je wordt er wakker en vertrekt pas later
  if (ds === trip.start) return 3;        // je komt aan, avond + nacht
  return 5;                               // volle tussendag
}

/* Uitzonderingen waar bovenstaande vuistregel de dag in het verkeerde
   hoofdstuk zet. Sleutel: "<persoon>|<datum>" of enkel "<datum>" voor
   iedereen. Reden er telkens bij, zodat later duidelijk is waarom. */
const DAG_FASE_OVERRIDE = {
  // Hinke zit op 15/09 het grootste deel van de dag in Hongkong en in het
  // vliegtuig; ze landt pas om 18:15 in Surabaya.
  "hinke|2026-09-15": "heen",
  // Arne vliegt op 30/08 uit Kuala Lumpur naar Medan. Zonder deze regel wint
  // het meerdaagse verblijf in Medan (t3) en verliest hij het hoofdstuk
  // "Vlucht heen" volledig — hij heeft immers geen etappe op 29/08.
  "arne|2026-08-30": "heen",
  // Kamiel, Eliott, Kasper & Willem landen op 01/09 al om 10:20 in Medan en
  // rijden de rest van de dag door Sumatra naar Ketambe.
  "eliott|2026-09-01": "sumatra",
  "kamiel|2026-09-01": "sumatra",
  "kasper|2026-09-01": "sumatra",
  "willem|2026-09-01": "sumatra",
  // 17/09 draait volledig om Bromo + Madakaripura en eindigt terug in Blimbing.
  // Per persoon, want de jongens zitten die dag in Ubud — een datum-only
  // sleutel zou hun dag mee naar Java trekken.
  "matthew|2026-09-17": "java",
  "hinke|2026-09-17": "java",
  // 24 en 25/09 tellen als boottochtdagen: op 24/09 vertrekt de boot rond 11:00
  // en op 25/09 zit je tot ±19:00 aan boord — de nacht in Labuan Bajo eromheen
  // weegt in de vuistregel zwaarder dan de dagtocht, maar is niet waar de dag
  // om draait.
  "matthew|2026-09-24": "komodo",
  "hinke|2026-09-24": "komodo",
  "matthew|2026-09-25": "komodo",
  "hinke|2026-09-25": "komodo",
  // Op 18/09 vertrekken Matthew & Hinke 's ochtends uit Blimbing, maar de dag
  // draait om de vlucht naar Lombok en de aankomst daar.
  "matthew|2026-09-18": "lombok",
  "hinke|2026-09-18": "lombok",
  // 22/09: de vlucht uit Lombok vertrekt al om 12:25 en landt om 13:40 in
  // Labuan Bajo, dus het grootste deel van de dag zit op Flores. De vuistregel
  // laat de laatste dag van het Lombok-verblijf zwaarder wegen en zou de dag
  // anders bij Lombok houden.
  "matthew|2026-09-22": "flores",
  "hinke|2026-09-22": "flores",
  // 26/09: vertrek uit Labuan Bajo om 10:35, om 11:50 in Denpasar — de rest
  // van de dag en de twee erna zijn Bali.
  "matthew|2026-09-26": "bali",
  "hinke|2026-09-26": "bali",
};

/* Het hoofdstuk van één dag: de fase waarin de reiziger die dag het meest
   verblijft. Bij een gelijkstand wint de laatste etappe van de dag, want
   dat is de richting waarin de reis beweegt. */
function faseVanDag(trips, ds, personKey) {
  const override = DAG_FASE_OVERRIDE[personKey + "|" + ds] || DAG_FASE_OVERRIDE[ds];
  if (override) return override;
  if (!trips.length) return null;

  let besteFase = null, besteScore = -1;
  trips.forEach(trip => {
    const score = dagGewicht(trip, ds);
    // >= zodat bij gelijke score de laatste etappe (chronologisch) wint
    if (score >= besteScore) { besteScore = score; besteFase = trip.fase; }
  });
  return besteFase;
}

/* Alle dagen van één reiziger, van zijn eerste tot zijn laatste reisdag.
   Elke dag krijgt de etappes die er lopen; `nieuw` markeert de etappes die
   die dag beginnen — daar horen de kosten en foto's, zodat een meerdaags
   verblijf ze niet op elke dag herhaalt. */
function buildDagen(personKey) {
  const trips = sortTrips(
    (PERSON_TRIPS[personKey] || []).map(id => TRIP.find(t => t.id === id)).filter(Boolean)
  );
  if (!trips.length) return [];

  let eerste = trips[0].start, laatste = trips[0].end;
  trips.forEach(t => {
    if (t.start < eerste) eerste = t.start;
    if (t.end > laatste) laatste = t.end;
  });

  const dagen = [];
  let ds = eerste;
  let nr = 1;

  while (ds <= laatste) {
    const lopend = trips.filter(t => t.start <= ds && ds <= t.end);
    const huidig = ds;
    dagen.push({
      date: huidig,
      nr: nr++,
      fase: faseVanDag(lopend, huidig, personKey),
      delen: lopend.map(trip => ({
        trip,
        nieuw: trip.start === huidig,
        dagNr: dagenTussen(trip.start, huidig) + 1,
        dagenTotaal: dagenTussen(trip.start, trip.end) + 1,
      })),
    });
    ds = volgendeDag(ds);
  }

  /* Een lege dag tussen twee etappes hoort bij het hoofdstuk waar hij op
     volgt, anders valt hij buiten elk hoofdstuk. */
  let vorige = null;
  dagen.forEach(d => {
    if (d.fase) vorige = d.fase;
    else d.fase = vorige;
  });

  return dagen;
}

/* ---------------- TRANSPORT LEGS (GESYNCHRONISEERD MET HOME PAGE) ---------------- */
const TRANSPORT_LEGS = [
  {
    id:"tl1", type:"int_vlucht", icon:"✈️",
    date:"2026-08-29", dateD:"29", dateM:"aug",
    fromIATA:"BRU", toIATA:"KNO",
    fromLabel:"Brussel Airport", toLabel:"Medan Kualanamu (via Singapore)",
    title:"Brussel → Singapore → Medan (Matthew)",
    sub:"Singapore Airlines · SQ303 (BRU→SIN) + SQ990 (SIN→KNO)",
    operator:"Singapore Airlines", flightNum:"SQ303 + SQ990",
    terminal:"Pier B → Changi T2",
    times:"11:45 (29/08) → 08:00 (30/08)", cost_id:"c1", ref:"SQ-MA29",
    fromPt:"brussel", toPt:"medan",
    persons:["matthew"]
  },
  {
    id:"tl1b", type:"bin_vlucht", icon:"✈️",
    date:"2026-08-30", dateD:"30", dateM:"aug",
    fromIATA:"KUL", toIATA:"KNO",
    fromLabel:"Kuala Lumpur", toLabel:"Medan Kualanamu",
    title:"Kuala Lumpur → Medan (Arne)",
    sub:"Arne reist vanuit Maleisië · ±1u · nog te boeken",
    operator:"TBD", flightNum:null,
    terminal:null, times:"Aankomst vóór 14:00 (TBD)", cost_id:"c2b", ref:null,
    fromPt:"kuala_lumpur", toPt:"medan",
    persons:["arne"]
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
    times:"11:45 (29/08) → 09:55 (30/08)", cost_id:"c26", ref:"SQ-EKWK29",
    fromPt:"brussel", toPt:"jakarta",
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
    times:"08:05 → 10:20", cost_id:"c6b", ref:"JTJK9A",
    fromPt:"jakarta", toPt:"medan",
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
    fromPt:"medan", toPt:"ketambe",
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
    fromPt:"ketambe", toPt:"medan",
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
    fromPt:"medan", toPt:"jakarta",
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
    fromPt:"jakarta", toPt:"yogya",
    persons:["matthew","arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl7", type:"bus_auto", icon:"🚐",
    date:"2026-09-10", dateD:"10", dateM:"sep",
    fromIATA:"YOG", toIATA:"DPS",
    fromLabel:"Yogyakarta", toLabel:"Canggu, Bali (via Tumpak Sewu, Bromo & Ijen)",
    title:"Yogyakarta → Bali, 4-daagse tour (alle 9)",
    sub:"GetYourGuide · 4 dagen · vervoer + 3 nachten inbegrepen · nog te boeken",
    operator:"GetYourGuide", flightNum:null,
    terminal:null,
    times:"10/09 → 13/09", cost_id:"c8", ref:null,
    fromPt:"yogya", toPt:"canggu",
    persons:["matthew","arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl9", type:"bus_auto", icon:"🚙",
    date:"2026-09-11", dateD:"11", dateM:"sep",
    fromIATA:"MLG", toIATA:"PRO",
    fromLabel:"Malang", toLabel:"Probolinggo / Bromo regio",
    title:"Malang → Tumpak Sewu → Bromo (alle 9)",
    sub:"Jeep & minibus charter · volle dag tour",
    operator:"Bromo Tour Co.", flightNum:null,
    terminal:null, times:"06:00 → 17:00", cost_id:null, ref:"BRM-0911",
    fromPt:"malang", toPt:"banyuwangi",
    persons:["matthew","arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl21", type:"bus_auto", icon:"⛴️",
    date:"2026-09-13", dateD:"13", dateM:"sep",
    fromIATA:"BWX", toIATA:"DPS",
    fromLabel:"Ketapang (Banyuwangi)", toLabel:"Gilimanuk → Canggu",
    title:"Ferry Java → Bali (alle 9)",
    sub:"Taxi naar Ketapang, ferry naar Gilimanuk, dan doorrijden naar Canggu",
    operator:"ASDP Ferry", flightNum:null,
    terminal:"Ketapang Harbour", times:"Na de Ijen-afdaling · ±3-4u totaal", cost_id:null, ref:null,
    fromPt:"banyuwangi", toPt:"canggu",
    persons:["matthew","arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl22", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-15", dateD:"15", dateM:"sep",
    fromIATA:"DPS", toIATA:"SUB",
    fromLabel:"Denpasar Ngurah Rai", toLabel:"Surabaya Juanda",
    title:"Bali → Surabaya (Matthew haalt Hinke op)",
    sub:"Super Air Jet · IU 703 · Airbus A320 · 1u (WITA → WIB)",
    operator:"Super Air Jet", flightNum:"IU703",
    terminal:"Ngurah Rai, binnenlandse terminal",
    times:"16:40 → 16:40 (lokale tijd)", cost_id:"c35", ref:null,
    fromPt:"bali", toPt:"surabaya",
    persons:["matthew"]
  },
  {
    id:"tl10", type:"int_vlucht", icon:"✈️",
    date:"2026-09-14", dateD:"14", dateM:"sep",
    fromIATA:"BRU", toIATA:"SUB",
    fromLabel:"Brussel Airport", toLabel:"Surabaya Juanda",
    title:"Brussel → Surabaya (Hinke)",
    sub:"Cathay Pacific · CX294 (BRU→HKG) + CX629 (HKG→SUB) · aankomst 15/09 om 18:15",
    operator:"Cathay Pacific", flightNum:"CX294 + CX629",
    terminal:"Brussel → Hongkong Chek Lap Kok", times:"13:05 (14/09) → 18:15 (15/09)", cost_id:"c29", ref:null,
    fromPt:"brussel", toPt:"surabaya",
    persons:["hinke"]
  },
  {
    id:"tl11", type:"bus_auto", icon:"🚙",
    date:"2026-09-16", dateD:"16", dateM:"sep",
    fromIATA:"MLG", toIATA:"PRO",
    fromLabel:"Malang (Blimbing Villa)", toLabel:"Tumpak Sewu → terug naar de villa",
    title:"Malang → Tumpak Sewu → Malang, namiddagtocht (Matthew & Hinke)",
    sub:"Privé jeep tour met chauffeur · Java Adventure Tour",
    operator:"Java Adventure Tour", flightNum:null,
    terminal:null, times:"Namiddag (tijd nog te bevestigen)", cost_id:null, ref:"MH-BRM16",
    fromPt:"malang", toPt:"tumpak_sewu",
    persons:["matthew","hinke"]
  },
  {
    id:"tl11b", type:"bus_auto", icon:"🚙",
    date:"2026-09-17", dateD:"17", dateM:"sep",
    fromIATA:"MLG", toIATA:"SUB",
    fromLabel:"Malang (Blimbing Villa)", toLabel:"Surabaya (via Bromo & Madakaripura)",
    title:"Malang → Bromo & Madakaripura → Surabaya, checkout-dag (Matthew & Hinke)",
    sub:"Privé jeep tour met chauffeur · Java Adventure Tour",
    operator:"Java Adventure Tour", flightNum:null,
    terminal:null, times:"00:00 → middag, dan door naar Surabaya", cost_id:"c21", ref:"MH-BRM17",
    fromPt:"malang", toPt:"surabaya",
    persons:["matthew","hinke"]
  },
  {
    id:"tl12", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-18", dateD:"18", dateM:"sep",
    fromIATA:"SUB", toIATA:"LOP",
    fromLabel:"Surabaya Juanda", toLabel:"Lombok Zainuddin Abdul Madjid",
    title:"Surabaya → Lombok, direct (Matthew & Hinke)",
    sub:"Super Air Jet · directe vlucht · 1u05 · nog te boeken",
    operator:"Super Air Jet", flightNum:null,
    terminal:null, times:"11:00 → 13:05", cost_id:"c11", ref:null,
    fromPt:"surabaya", toPt:"lombok",
    persons:["matthew","hinke"]
  },
  {
    id:"tl12c", type:"bin_vlucht", icon:"✈️",
    date:"2026-09-22", dateD:"22", dateM:"sep",
    fromIATA:"LOP", toIATA:"LBJ",
    fromLabel:"Lombok Zainuddin Abdul Madjid", toLabel:"Labuan Bajo Komodo Airport",
    title:"Lombok → Labuan Bajo (Matthew & Hinke)",
    sub:"Wings Abadi Airlines · directe vlucht · 1u15 · nog te boeken",
    operator:"Wings Abadi Airlines", flightNum:null,
    terminal:null, times:"12:25 → 13:40", cost_id:"c11b", ref:null,
    fromPt:"lombok", toPt:"labuanbajo",
    persons:["matthew","hinke"]
  },
  {
    id:"tl12b", type:"boot", icon:"🛥️",
    date:"2026-09-24", dateD:"24", dateM:"sep",
    fromIATA:"LBJ", toIATA:"LBJ",
    fromLabel:"Labuan Bajo (hotelpickup)", toLabel:"Komodo National Park → Labuan Bajo",
    title:"2-daagse Komodo boottour (Matthew & Hinke)",
    sub:"komodoboattour.com · 2 dagen / 1 nacht aan boord · nog te boeken",
    operator:"komodoboattour.com", flightNum:null,
    terminal:null, times:"24/09 10:00 → 25/09 ±19:00", cost_id:"c23", ref:null,
    fromPt:"labuanbajo", toPt:"labuanbajo",
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
    terminal:"Gate 2", times:"10:35 → 11:50", cost_id:"c15", ref:"QZ503B",
    fromPt:"labuanbajo", toPt:"bali",
    persons:["matthew","hinke"]
  },
  {
    id:"tl16", type:"int_vlucht", icon:"✈️",
    date:"2026-09-29", dateD:"29", dateM:"sep",
    fromIATA:"DPS", toIATA:"BRU",
    fromLabel:"Bali Denpasar", toLabel:"Brussel Airport (via Bangkok)",
    title:"Bali → Bangkok → Brussel (Matthew & Hinke)",
    sub:"Thai Airways · TG440 (DPS→BKK) + TG934 (BKK→BRU) · overstap 1u 55m",
    operator:"Thai Airways", flightNum:"TG440 + TG934",
    terminal:"Ngurah Rai → Suvarnabhumi",
    times:"19:00 (29/09) → 07:15 (30/09)", cost_id:"c17", ref:null,
    fromPt:"bali", toPt:"brussel",
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
    fromPt:"banyuwangi", toPt:"canggu",
    persons:["arne","eliott","kamiel","willem","kasper","jens","maurice","mathias"]
  },
  {
    id:"tl18", type:"int_vlucht", icon:"✈️",
    date:"2026-09-25", dateD:"25", dateM:"sep",
    fromIATA:"DPS", toIATA:"BRU",
    fromLabel:"Bali Denpasar", toLabel:"Brussel Airport (via Bangkok)",
    title:"Bali → Bangkok → Brussel (Arne, Kasper & Jens)",
    sub:"Thai Airways · TG432 (DPS→BKK) + TG934 (BKK→BRU) · overstap 4u",
    operator:"Thai Airways", flightNum:"TG432 + TG934",
    terminal:"Ngurah Rai T1 → Suvarnabhumi",
    times:"16:55 (25/09) → 07:15 (26/09)", cost_id:"c31", ref:"YCX2VO",
    fromPt:"bali", toPt:"brussel",
    persons:["arne","jens","kasper"]
  },
  {
    id:"tl23", type:"int_vlucht", icon:"✈️",
    date:"2026-09-19", dateD:"19", dateM:"sep",
    fromIATA:"DPS", toIATA:"BRU",
    fromLabel:"Bali Denpasar", toLabel:"Brussel Airport",
    title:"Bali → Brussel (Eliott & Kamiel) — nog te boeken",
    sub:"Maatschappij en datum nog te bevestigen",
    operator:"Diverse airlines", flightNum:"—",
    terminal:null, times:"TBD", cost_id:"c33", ref:null,
    fromPt:"bali", toPt:"brussel",
    persons:["eliott","kamiel"]
  },
  {
    id:"tl21", type:"int_vlucht", icon:"✈️",
    date:"2026-09-19", dateD:"19", dateM:"sep",
    fromIATA:"DPS", toIATA:"SGN",
    fromLabel:"Bali Denpasar", toLabel:"Vietnam",
    title:"Bali → Vietnam (doorreis Momo, Mathias & Willem)",
    sub:"Diverse airlines · doorreis na 7-daags Bali programma",
    operator:"Diverse airlines", flightNum:"—",
    terminal:null, times:"TBD", cost_id:"c32", ref:null,
    fromPt:"bali", toPt:"vietnam",
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
    times:"11:45 (07/09) → 08:25 (08/09)", cost_id:"c28", ref:"FSXOOZ",
    fromPt:"brussel", toPt:"jakarta",
    persons:["jens","maurice","mathias"]
  }
];

/* ---------------- VLUCHT-SCRAPER DATA (VOOR TRANSPORT PAGINA) ---------------- */
const FLIGHT_DB = {
  SQ303: {flight:"SQ303",airline:"Singapore Airlines",aircraft:"Airbus A350-900",altitude:"38,000 ft",speed:"905 km/h",duration:"12u 55m",route:"BRU (Brussel Airport) → SIN (Singapore Changi)",gate:"Pier B",baggage:"Terminal 3",risk:"Zeer Laag (0.5%)",status:"Scheduled",blipPos:{top:60,left:120}},
  SQ990: {flight:"SQ990",airline:"Singapore Airlines",aircraft:"Boeing 737 MAX 8",altitude:"35,000 ft",speed:"840 km/h",duration:"1u 30m",route:"SIN (Singapore Changi) → KNO (Medan Kualanamu)",gate:"Terminal 2",baggage:"Arrival Hall, Belt 1",risk:"Zeer Laag (0.8%)",status:"Scheduled",blipPos:{top:80,left:160}},
  SQ956: {flight:"SQ956",airline:"Singapore Airlines",aircraft:"Airbus A350-900",altitude:"37,000 ft",speed:"860 km/h",duration:"1u 50m",route:"SIN (Singapore Changi) → CGK (Jakarta Soekarno-Hatta)",gate:"Terminal 3",baggage:"Terminal 3 Arrival Hall",risk:"Zeer Laag (0.6%)",status:"Scheduled",blipPos:{top:120,left:240}},
  SQ952: {flight:"SQ952",airline:"Singapore Airlines",aircraft:"Airbus A350-900",altitude:"37,000 ft",speed:"860 km/h",duration:"1u 45m",route:"SIN (Singapore Changi T2) → CGK (Jakarta Soekarno-Hatta T3)",gate:"Terminal 2",baggage:"Terminal 3 Arrival Hall",risk:"Zeer Laag (0.6%)",status:"Scheduled",blipPos:{top:120,left:240}},
  CX294: {flight:"CX294",airline:"Cathay Pacific",aircraft:"Airbus A350-1000",altitude:"38,000 ft",speed:"890 km/h",duration:"11u 30m",route:"BRU (Brussel Airport) → HKG (Hongkong Chek Lap Kok)",gate:"Pier A",baggage:"HKG Transfer Hall",risk:"Zeer Laag (0.6%)",status:"Scheduled",blipPos:{top:60,left:120}},
  CX629: {flight:"CX629",airline:"Cathay Pacific",aircraft:"Airbus A330-300",altitude:"36,000 ft",speed:"850 km/h",duration:"4u 45m",route:"HKG (Hongkong Chek Lap Kok) → SUB (Surabaya Juanda)",gate:"Terminal 1",baggage:"Terminal 2 Arrival Hall",risk:"Laag (1.0%)",status:"Scheduled",blipPos:{top:150,left:470}},
  TG440: {flight:"TG440",airline:"Thai Airways",aircraft:"Airbus A330-300",altitude:"36,000 ft",speed:"860 km/h",duration:"4u 10m",route:"DPS (Bali Ngurah Rai) → BKK (Bangkok Suvarnabhumi)",gate:"International Terminal",baggage:"Suvarnabhumi Main Terminal",risk:"Laag (1.3%)",status:"Scheduled",blipPos:{top:180,left:640}},
  JT204: {flight:"JT204",airline:"Lion Air",aircraft:"Boeing 737-900ER (PK-LGO)",altitude:"36,000 ft",speed:"820 km/h",duration:"2u 15m",route:"CGK (Jakarta Soekarno-Hatta) → KNO (Medan Kualanamu)",gate:"Terminal 2D, Gate 7",baggage:"Main Arrival Hall, Belt 2",risk:"Gemiddeld (5.8%)",status:"Scheduled",blipPos:{top:130,left:320}},
  JT383: {flight:"JT383",airline:"Lion Air",aircraft:"Boeing 737-900ER (PK-LGP)",altitude:"35,000 ft",speed:"810 km/h",duration:"2u 25m",route:"KNO (Medan Kualanamu) → CGK (Jakarta Soekarno-Hatta)",gate:"Terminal 2D, Gate 3",baggage:"Terminal 2D, Band 4",risk:"Gemiddeld (6.2%)",status:"Scheduled",blipPos:{top:150,left:380}},
  GA402: {flight:"GA402",airline:"Garuda Indonesia",aircraft:"Boeing 737-800 (PK-GFM)",altitude:"34,000 ft",speed:"810 km/h",duration:"1u 45m",route:"SUB (Surabaya Juanda) → LBJ (Labuan Bajo Komodo)",gate:"Terminal 1, Gate 5",baggage:"Arrival Hall, Belt A",risk:"Zeer Laag (0.5%)",status:"Scheduled",blipPos:{top:165,left:550}},
  TG432: {flight:"TG432",airline:"Thai Airways",aircraft:"Airbus A330-300",altitude:"36,000 ft",speed:"860 km/h",duration:"4u 10m",route:"DPS (Bali Ngurah Rai T1) → BKK (Bangkok Suvarnabhumi)",gate:"Terminal I",baggage:"Suvarnabhumi Main Terminal",risk:"Laag (1.4%)",status:"Scheduled",blipPos:{top:150,left:470}},
  TG934: {flight:"TG934",airline:"Thai Airways",aircraft:"Boeing 777-300ER",altitude:"38,000 ft",speed:"890 km/h",duration:"12u 10m",route:"BKK (Bangkok Suvarnabhumi) → BRU (Brussel Airport)",gate:"Suvarnabhumi Main Terminal",baggage:"Baggage Hall, Brussel",risk:"Laag (1.1%)",status:"Scheduled",blipPos:{top:60,left:120}},
  QZ503: {flight:"QZ503",airline:"Indonesia AirAsia",aircraft:"Airbus A320-200 (PK-AXV)",altitude:"24,000 ft",speed:"680 km/h",duration:"1u 10m",route:"LBJ (Labuan Bajo Komodo) → DPS (Bali Denpasar)",gate:"Gate 2 (Platformloopbrug)",baggage:"Domestic Arrivals, Belt 1",risk:"Gemiddeld (14.2%)",status:"Scheduled",blipPos:{top:172,left:630}},
  IU703: {flight:"IU703",airline:"Super Air Jet",aircraft:"Airbus A320",altitude:"33,000 ft",speed:"800 km/h",duration:"1u",route:"DPS (Bali Ngurah Rai) → SUB (Surabaya Juanda)",gate:"Domestic Terminal",baggage:"Terminal 1, Belt 2",risk:"Gemiddeld (5.5%)",status:"Scheduled",blipPos:{top:160,left:500}}
};

/* ---------------- TOETSENBORDBEDIENING ----------------
   Verschillende pagina's gebruiken een <div onclick=...> als knop. Deze
   gedelegeerde listener maakt die met Enter en spatie bedienbaar, zodat de
   pagina's ook zonder muis bruikbaar zijn. Elementen doen mee zodra ze
   role="button" én tabindex hebben. */
document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
  const el = e.target;
  if (!el || typeof el.getAttribute !== "function") return;
  if (el.getAttribute("role") !== "button") return;
  if (el.hasAttribute("disabled")) return;
  e.preventDefault();
  el.click();
});

/* Bevestiging dat data.js succesvol geladen is */
window.DATA_JS_LOADED = true;
