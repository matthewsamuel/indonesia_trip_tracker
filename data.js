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

/* ---------------- FASEN VAN DE REIS ---------------- */
const FASES = {
  heen:    { label: "Vlucht heen",  color: "#4cc9f0", soft: "rgba(76, 201, 240, 0.1)", uitleg: "Heenreis vanuit Brussel naar Medan, met korte overstap in Singapore.", desc: "Matthew en Arne vliegen op 29 augustus met Singapore Airlines (SQ303) vanuit Brussel naar Singapore, waar ze op 30 augustus om 06:40 landen. Na een korte overstap van 50 minuten in Changi vliegen ze door met SQ990 naar Medan, waar ze om 08:00 aankomen. Geen tussenstop om te chillen — de reis gaat rechtstreeks door richting het avontuur." },
  sumatra: { label: "Sumatra",      color: "#4ad66d", soft: "rgba(74, 214, 109, 0.1)", uitleg: "Intense 5-daagse jungle trekking in Ketambe met de hele crew.", desc: "Na een vlucht naar Medan volgt een marathon rit van 7-8 uur de oerwouden in naar Ketambe, diep in het hart van Sumatra. Met 6 man — Matthew, Arne, Kamiel, Eliott, Kasper en Willem — wordt een intensieve 5-daagse all-in jungle trekking gedaan, compleet met orang-oetans, nachtelijke geluiden en jungle overnachtingen. Een van de meest avontuurlijke en onvergetelijke onderdelen van de hele reis." },
  jakarta: { label: "Jakarta",      color: "#f77f00", soft: "rgba(247, 127, 0, 0.1)", uitleg: "Aankomst in de hoofdstad en samenkomst van de complete groep van 9.", desc: "Na de jungle is het tijd voor de bruisende hoofdstad Jakarta, waar Maurice, Mathias en Jens de groep versterken — nu zijn alle 9 reizigers voor het eerst bij elkaar. Eén nacht in de stad: bijkomen, Kota Tua verkennen en de groep samenvoegen. Het is ook het moment om bij te trekken voor de avontuurlijke Java-etappe die volgt." },
  java:    { label: "Java",         color: "#9d4edd", soft: "rgba(157, 78, 221, 0.1)", uitleg: "Reis langs Yogyakarta, Borobudur, Prambanan en Bromo/Ijen vulkanen.", desc: "Java biedt een indrukwekkend programma: Yogyakarta, Borobudur en Prambanan, gevolgd door een nachttrein naar Malang. Matthew doet alles mee met de jongens — Tumpak Sewu, Mount Bromo en Kawah Ijen — en steekt op 13 september samen met hen per ferry over naar Bali. Op 15 september vliegt hij vanuit Denpasar terug naar Surabaya (IU 703, 16:40) om Hinke op te halen, die er om 18:15 landt. Vanaf dan reizen ze samen verder — Bromo en Kawah Ijen blauwvuur voor de tweede keer, daarna Flores." },
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
      uitleg: "Heenreis Brussel → Hongkong → Surabaya, waar Matthew wacht.",
      desc: "Hinke vliegt op 14 september vanuit Brussel via Hongkong naar Surabaya, waar ze op 15 september om 18:15 landt. Matthew staat klaar op de luchthaven — vanaf hier reizen ze samen verder door Java, Flores, Komodo en Bali." }
  ],
  java: [
    { wie: ["hinke"],
      uitleg: "Samen met Matthew: villa in Blimbing, Bromo/Tumpak Sewu en Kawah Ijen.",
      desc: "Hinke landt op 15 september om 18:15 in Surabaya en trekt samen met Matthew door Oost-Java: een rustdag in de villa in Blimbing, dan de jeep-tour naar Bromo en Tumpak Sewu, en als afsluiter de nachtelijke Kawah Ijen-hike met blauwvuur." },
    { wie: ["arne","eliott","jens","kamiel","maurice","mathias","willem","kasper"],
      uitleg: "Yogyakarta, Borobudur & Prambanan, dan Tumpak Sewu, Bromo en Kawah Ijen — met de volledige groep van 9." }
  ],
  bali: [
    { wie: ["arne","jens","kasper"],
      uitleg: "7-daags programma, daarna nog zes losse dagen op Bali tot de vlucht van 25/09.",
      desc: "Na de ferry vanuit Java werken de jongens een vol 7-daags Bali-programma af: surfen in Canggu, kliffen en Kecak in Uluwatu, een dagtrip naar Nusa Penida, tempels en rijstterrassen rond Ubud, wrakduiken bij Amed en als apotheose de zonsopgang op Mount Agung. Arne, Kasper en Jens blijven daarna nog tot 25 september — hun verblijf voor die laatste zes nachten is nog niet geboekt." },
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
      return "Samen met Matthew reist Hinke door Oost-Java: verblijf in de luxe Wonderhouz villa in Blimbing, jeep-tour naar Mount Bromo en de watervallen van Tumpak Sewu, met als afsluiter de nachtelijke beklimming van Kawah Ijen.";
    }
    
    const hasYogya = tripIds.some(id => id === "t8" || id === "t9");
    const hasOphaalvlucht = tripIds.some(id => id === "t11a");
    const hasBromoIjenWithHinke = tripIds.some(id => id === "t11b" || id === "t12" || id === "t13");
    const hasBoysVulkanen = tripIds.some(id => id === "t10b" || id === "t30" || id === "t30b");

    if (personKey === "matthew") {
      if (hasOphaalvlucht || hasBromoIjenWithHinke) {
        return "Matthew vliegt op 15 september terug van Denpasar naar Surabaya om Hinke op te halen. Samen reizen ze door Oost-Java: verblijf in de luxe villa in Blimbing, jeep-tour naar Mount Bromo en de watervallen van Tumpak Sewu, en tot slot de nachtelijke klim van Kawah Ijen.";
      }
      if (hasYogya || hasBoysVulkanen) {
        return "Met de complete groep van 9 door Java: de hindoetempel Prambanan en de Malioboro-straat in Yogyakarta, Borobudur in de vroege ochtend en dan de nachttrein naar Malang. Daarna de watervallen van Tumpak Sewu, Mount Bromo bij zonsopgang en de nachtelijke hike naar het blauwvuur van Kawah Ijen.";
      }
    } else {
      if (hasYogya) {
        return "Vlucht van Jakarta naar Yogyakarta voor cultuur en historie met de complete groep van 9. Bezoek aan de hindoetempel Prambanan, wandelen door Malioboro-straat, bezichtiging van de boeddhistische tempel Borobudur, en tot slot de nachttrein naar Malang.";
      }
      if (hasBoysVulkanen) {
        return "Avontuurlijke expeditie door Oost-Java met de volledige groep van 9: hike naar de gigantische Tumpak Sewu-watervallen, jeep-tour bij zonsopgang naar Mount Bromo, en de nachtelijke tocht naar het zwavelmeer en blauwvuur van Kawah Ijen.";
      }
    }
  }

  /* Matthew heeft twee Bali-blokken: de tussenstop in Canggu met de jongens
     (13–15/09) en de afsluitende villa met Hinke (26–28/09). Zonder deze
     uitzondering krijgen beide de generieke "afsluitende ontspanning"-tekst. */
  if (faseKey === "bali" && personKey === "matthew" &&
      tripIds.some(id => id === "t30b" || id === "t11")) {
    return "Na de Kawah Ijen-hike steekt Matthew samen met de jongens per ferry over naar Bali. Twee dagen Canggu — strand, surf en bijkomen — tot hij op 15 september naar Surabaya vliegt om Hinke op te halen.";
  }

  const tekstOv = faseTekst(faseKey, personKey);
  return (tekstOv && tekstOv.uitleg) || FASES[faseKey].uitleg || "";
}

const FASE_PHOTOS = {
  heen:    ["images/singapore_famoushotel.webp", "images/singapore_bigtree.webp", "images/singapore_airport_waterval.jpg"],
  sumatra: ["images/ketambe_jungle.jpg", "images/sumatra_oerangoetang.jpg", "images/sumatra_Waterval.jpg"],
  jakarta: ["images/jakartanightskyline.jpg", "images/jakarta.jpg"],
  java:    ["images/airbnbM&H/15-16.avif", "images/Yogyakartatempel.jpg", "images/mountbromo.webp", "images/Ijen.jpeg", "images/tumpaksewuwaterval.webp", "images/airbnbM&H/15-16a.avif", "images/Yogyakartamonument.jpeg", "images/bromo.jpg", "images/bromoblauwvuur.jpeg", "images/airbnbM&H/15-16b.avif", "images/airbnbM&H/15-16c.avif", "images/airbnbM&H/15-16d.avif", "images/Yogyakartahandmonument.jpg"],
  flores:  ["images/Labuanbajo.jpg", "images/Flores.jpg"],
  komodo:  ["images/Komodovaraan.jpg", "images/komodo-national-park-1250x488.jpg.webp"],
  bali:    ["images/balivilla.jpg", "images/bali.jpg", "images/bali2.jpg", "images/bali4.jpg"],
  terug:   ["images/bali2.jpg", "images/bali4.jpg", "images/balivilla.jpg"],
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
  matthew: ["t1", "t3", "t4", "t5", "t6", "t6b", "t6c", "t7", "t8", "t9", "t10b", "t30", "t30b", "t11", "t11a", "t11b", "t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19", "t20", "t21", "t22", "t23"],
  hinke:   ["t41", "t11", "t11b", "t12", "t13", "t14", "t15", "t16", "t17", "t18", "t19", "t20", "t21", "t22", "t23"],
  arne:    ["t1", "t3", "t4", "t5", "t6", "t6b", "t6c", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t38"],
  eliott:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t6c", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t38b"],
  jens:    ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t38"],
  kamiel:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t6c", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t38b"],
  maurice: ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t37"],
  kasper:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t6c", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t40", "t38"],
  willem:  ["t27", "t28", "t29", "t4", "t5", "t6", "t6b", "t6c", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t37"],
  mathias: ["t39", "t7", "t8", "t9", "t10b", "t30", "t30b", "t30c", "t31", "t32", "t33", "t34", "t35", "t36", "t37"]
};

const PERSON_GROUP_INFO = {
  matthew: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Matthew + Arne (Brussel → Singapore → Medan, SQ303+SQ990, korte overstap Changi); 30-31/08 overnachting in Medan, wachten op de rest</li>
      <li><b>01/09, Medan:</b> Ontmoeting met Kamiel, Eliott, Kasper & Willem (vlucht vanuit Jakarta) — alle 6 man naar Ketambe</li>
      <li><b>08/09, Jakarta:</b> Maurice, Mathias & Jens sluiten aan — crew compleet met 9 man voor Java</li>
      <li><b>11/09 – 13/09:</b> Volledig mee met de jongens: Tumpak Sewu, Mount Bromo en 's nachts Kawah Ijen</li>
      <li><b>13/09 – 15/09:</b> Samen met de jongens per ferry naar Bali, twee dagen Canggu</li>
      <li><b>15/09, Surabaya:</b> Vlucht Denpasar 16:40 → Surabaya (Super Air Jet IU 703); Hinke landt om 18:15 (Cathay Pacific CX294+CX629), vanaf hier reizen Matthew & Hinke samen</li>
      <li><b>29/09 – 30/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Hinke, TG440+TG934)</li>
    </ul>
  `,
  hinke: `
    <ul class="details" style="font-size:14.5px">
      <li><b>14/09 – 15/09:</b> Vlucht Brussel → Hongkong → Surabaya (Cathay Pacific, CX294 + CX629)</li>
      <li><b>15/09:</b> Hinke landt om 18:15 uur in Surabaya</li>
      <li><b>15/09 – 29/09:</b> Reist samen met Matthew (Surabaya → Bromo/Ijen → Flores → Komodo → Bali)</li>
      <li><b>Reisgezelschap:</b> Exclusief met Matthew. De andere jongens zijn al eerder naar huis of reizen apart</li>
      <li><b>29/09 – 30/09:</b> Terugvlucht Bali → Bangkok → Brussel (samen met Matthew, TG440+TG934)</li>
    </ul>
  `,
  arne: `
    <ul class="details" style="font-size:14.5px">
      <li><b>29/08 – 30/08:</b> Samen met Matthew (Brussel → Singapore → Medan, SQ303+SQ990, korte overstap Changi); 30-31/08 overnachting in Medan, wachten op de rest</li>
      <li><b>01/09 – 07/09:</b> Met de jongens de Sumatra-jungle in (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep compleet met 9 man)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>19–25/09:</b> Nog op Bali tot de terugvlucht — verblijf nog te boeken</li>
      <li><b>25–26/09:</b> Terugvlucht Bali → Bangkok → Brussel (TG432 + TG934, Thai Airways, samen met Kasper & Jens); aankomst BRU 26/09 om 07:15</li>
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
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Kamiel) — nog te boeken, staat niet op de Thai Airways-boeking van 25/09</li>
    </ul>
  `,
  jens: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (SQ303+SQ952, boekingsref. FSXOOZ, samen met Maurice & Mathias)</li>
      <li><b>08/09:</b> Sluit aan in Jakarta bij de jongens crew (samen met Maurice & Mathias)</li>
      <li><b>08/09 – 10/09:</b> Java-etappe met de groep (Jakarta → Yogyakarta → Malang)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>19–25/09:</b> Nog op Bali tot de terugvlucht — verblijf nog te boeken</li>
      <li><b>25–26/09:</b> Terugvlucht Bali → Bangkok → Brussel (TG432 + TG934, Thai Airways, samen met Arne & Kasper); aankomst BRU 26/09 om 07:15</li>
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
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>Na 19/09:</b> Terugvlucht Bali → Brussel (samen met Eliott) — nog te boeken, staat niet op de Thai Airways-boeking van 25/09</li>
    </ul>
  `,
  maurice: `
    <ul class="details" style="font-size:14.5px">
      <li><b>07/09 – 08/09:</b> Vlucht Brussel → Jakarta (SQ303+SQ952, samen met Mathias & Jens)</li>
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
      <li><b>29/08 – 30/08:</b> Vlucht Brussel → Singapore → Jakarta (SQ 303 + SQ 956); aankomst Jakarta Soekarno T3 om 09:55</li>
      <li><b>30/08 – 31/08:</b> Jakarta — acclimatiseren en stad verkennen</li>
      <li><b>01/09:</b> Vlucht Jakarta → Medan; ontmoeting met Matthew & Arne; taxi naar Ketambe</li>
      <li><b>02/09 – 06/09:</b> Jungle trekking Ketambe (alle 6: Matthew, Arne, Willem, Kasper, Eliott, Kamiel)</li>
      <li><b>07/09:</b> Ketambe → Medan → Jakarta</li>
      <li><b>08/09 – 10/09:</b> Maurice, Mathias & Jens sluiten aan in Jakarta (groep van 9 man)</li>
      <li><b>11/09 – 12/09:</b> Tumpak Sewu & Bromo, met Matthew erbij</li>
      <li><b>13/09:</b> Kawah Ijen ('s nachts), taxi → Ketapang, ferry → Bali; aankomst Canggu</li>
      <li><b>13–19/09:</b> Bali 7-daags (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — volledig programma</li>
      <li><b>19–25/09:</b> Nog op Bali tot de terugvlucht — verblijf nog te boeken</li>
      <li><b>25–26/09:</b> Terugvlucht Bali → Bangkok → Brussel (TG432 + TG934, Thai Airways, samen met Arne & Jens); aankomst BRU 26/09 om 07:15</li>
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
  c3:  { label: "Taxi/minibus Medan → Ketambe", cat: "transport", amount: 20 },
  c4:  { label: "Jungle trekking Ketambe (5d/4n Adventure, all-in)", cat: "activiteit", amount: 235 },
  c4b: { label: "Overnachting guesthouse Ketambe (2n, vóór + na trek)", cat: "accommodatie", amount: null },
  c5:  { label: "Taxi/minibus Ketambe → Medan", cat: "transport", amount: 20 },
  c6:  { label: "Vlucht Medan → Jakarta (Lion Air JT383, enkel)", cat: "vlucht", amount: 106 },
  c6b: { label: "Vlucht Jakarta → Medan (Lion Air JT204, enkel)", cat: "vlucht", amount: 106 },
  c7:  { label: "Trein Jakarta → Yogyakarta", cat: "transport", amount: 20 },
  c7b: { label: "Tempels entree (Borobudur + Prambanan)", cat: "activiteit", amount: 40 },
  c8:  { label: "Nachttrein Yogyakarta → Malang", cat: "transport", amount: 15 },
  c10: { label: "Overnachting Banyuwangi (2n)", cat: "accommodatie", amount: 55, url: "https://www.airbnb.com/rooms/1420571119911855020" },
  c11: { label: "Vlucht Java → Denpasar → Labuan Bajo", cat: "vlucht", amount: null },
  c12: { label: "Overnachting Labuan Bajo (3n)", cat: "accommodatie", amount: 55, url: "https://www.airbnb.com/rooms/1202849662764744783" },
  c13: { label: "Overnachting Ruteng (2n)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/50427330" },
  c14: { label: "Overnachting Labuan Bajo, terugkeer (3n)", cat: "accommodatie", amount: null, url: "https://www.airbnb.com/rooms/1202849662764744783" },
  c15: { label: "Vlucht Labuan Bajo → Bali", cat: "vlucht", amount: null },
  c16: { label: "Bali villa (26-29 sep)", cat: "accommodatie", amount: 101 },
  c17: { label: "Terugvlucht Bali → Bangkok → Brussel (Matthew & Hinke, TG440+TG934)", cat: "vlucht", amount: null },
  c19: { label: "Hotel Jakarta (1n)", cat: "accommodatie", amount: 35 },
  c20: { label: "Hotel Yogyakarta (1n)", cat: "accommodatie", amount: 30 },
  c21: { label: "Bromo + Tumpak Sewu (jeep-tour + entree, 16/09 met Hinke)", cat: "activiteit", amount: 25 },
  c22: { label: "Kawah Ijen (entree + gids, 17/09 met Hinke)", cat: "activiteit", amount: 18 },
  c23: { label: "Komodo dagtour (boot, Padar + Pink Beach + Komodo + Manta)", cat: "activiteit", amount: 68 },
  c25: { label: "Villa Blimbing, Wonderhouz Premium (15-16/09, 1n, met Hinke)", cat: "accommodatie", amount: 40, url: "https://www.airbnb.com/rooms/1574650852556499790" },
  c26: { label: "Vlucht BRU → Singapore → Jakarta (SQ303+SQ956)", cat: "vlucht", amount: null },
  c27: { label: "Hotel Jakarta (30-31/08, 2n, acclimatiseren)", cat: "accommodatie", amount: null },
  c28: { label: "Vlucht BRU → Singapore → Jakarta (SQ303+SQ952, ref. FSXOOZ)", cat: "vlucht", amount: 680.77 },
  c29: { label: "Vlucht BRU → Hongkong → Surabaya (Hinke, Cathay Pacific CX294 + CX629)", cat: "vlucht", amount: 554 },
  c30: { label: "Villa Canggu (13-19/09, 6n, gedeeld door 8)", cat: "accommodatie", amount: 226.87, url: "https://fr.airbnb.be/rooms/37920676" },
  c31: { label: "Terugvlucht Bali → Bangkok → Brussel (Arne, Kasper & Jens, TG432+TG934)", cat: "vlucht", amount: 551 },
  c32: { label: "Vlucht Bali → Vietnam (doorreis)", cat: "vlucht", amount: null },
  c33: { label: "Terugvlucht Bali → Brussel (Eliott & Kamiel)", cat: "vlucht", amount: null },
  c34: { label: "Verblijf Bali 19–25/09 (Arne, Kasper & Jens, na de villa in Canggu)", cat: "accommodatie", amount: null },
  c35: { label: "Vlucht Bali → Surabaya (Super Air Jet IU 703, 15/09)", cat: "vlucht", amount: 36 },
  c36: { label: "Verblijf Canggu (13–15/09, 2n, Matthew bij de jongens)", cat: "accommodatie", amount: null },
  /* Matthew doet Tumpak Sewu/Bromo en Kawah Ijen twee keer: eerst met de
     jongens (c37/c38), daarna met Hinke (c21/c22). Aparte id's, want de
     kostenset per persoon is een Set — dezelfde id telt maar één keer mee. */
  c37: { label: "Tumpak Sewu + Bromo (jeep-tour + entree, 11–12/09 met de jongens)", cat: "activiteit", amount: 25 },
  c38: { label: "Kawah Ijen (entree + gids, 13/09 met de jongens)", cat: "activiteit", amount: 18 },
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
  labuanbajo: { lat: -8.4539, lng: 119.8842, name: "🌅 Labuan Bajo" },
  ruteng:     { lat: -8.6271, lng: 120.4718, name: "⛰️ Ruteng" },
  padar:      { lat: -8.6534, lng: 119.5772, name: "⛰️ Padar Island" },
  pink_beach: { lat: -8.6015, lng: 119.5222, name: "🏖️ Pink Beach" },
  komodo:     { lat: -8.5503, lng: 119.4880, name: "🦎 Komodo" },
  manta_point:{ lat: -8.5833, lng: 119.5000, name: "🤿 Manta Point" },
  borobudur:  { lat: -7.6079, lng: 110.2038, name: "🛕 Borobudur" },
  prambanan:  { lat: -7.7520, lng: 110.4914, name: "🛕 Prambanan" },
  tumpak_sewu:{ lat: -8.2307, lng: 112.9167, name: "🌊 Tumpak Sewu" },
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
  "surabaya|labuanbajo": { mode:"vlucht", via:"bali", label:"SUB → DPS → LBJ" },
  "bali|labuanbajo":     { mode:"vlucht", label:"DPS → LBJ" },
  "labuanbajo|bali":     { mode:"vlucht", label:"LBJ → DPS" },
  "bali|brussel":        { mode:"vlucht", via:"bangkok", label:"DPS → BRU · ±18-20u" },
  "bali|bangkok":        { mode:"vlucht", label:"Thai Airways · 4u 10m" },
  "bangkok|brussel":     { mode:"vlucht", label:"TG934 · 12u 10m" },
  "bali|vietnam":        { mode:"vlucht", label:"DPS → Vietnam (TBD)" },

  /* Treinen (KAI) */
  "jakarta|yogya":       { mode:"trein", label:"Argo Bromo Anggrek · ±8u" },
  "jakarta|prambanan":   { mode:"trein", label:"Argo Bromo Anggrek · ±8u" },
  "yogya|malang":        { mode:"trein", label:"Malioboro Express · nachttrein" },
  "borobudur|malang":    { mode:"trein", label:"Malioboro Express · nachttrein" },

  /* Weg (minibus, taxi, jeep) */
  "medan|ketambe":       { mode:"weg", label:"Privé minibus · ±7-8u" },
  "ketambe|medan":       { mode:"weg", label:"Privé taxi · ±7-8u" },
  "prambanan|yogya":     { mode:"weg", label:"Transfer Prambanan → stad" },
  "yogya|borobudur":     { mode:"weg", label:"Dagtrip Borobudur" },
  "malang|surabaya":     { mode:"weg", label:"Taxi · ±2u via tolweg" },
  "surabaya|malang":     { mode:"weg", label:"Taxi · ±2u via tolweg" },
  "malang|tumpak_sewu":  { mode:"weg", label:"Jeep · ±2,5u" },
  "tumpak_sewu|bromo":   { mode:"weg", label:"Jeep-tour" },
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
  "uluwatu|nusa_penida": { mode:"boot", label:"Snelboot vanaf Sanur" },
  "nusa_penida|ubud":    { mode:"boot", label:"Boot terug + transfer Ubud" },
  "labuanbajo|padar":    { mode:"boot", label:"Komodo dagtour" },
  "padar|pink_beach":    { mode:"boot", label:"Komodo dagtour" },
  "pink_beach|komodo":   { mode:"boot", label:"Komodo dagtour" },
  "komodo|manta_point":  { mode:"boot", label:"Komodo dagtour" },
  "manta_point|labuanbajo":{ mode:"boot", label:"Terug naar Labuan Bajo" },
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
  { id:"t1", fase:"heen", start:"2026-08-29", end:"2026-08-30", title:"✈️ Brussel → Singapore → Medan (met Arne)", details:["✈️ Vlucht vertrekt: 29 aug om 11:45 | Aankomst: 30 aug om 08:00", "SQ303: BRU 11:45 (29/08) → SIN 06:40 (30/08), Singapore Airlines.", "Overstap 50 min in Changi.", "SQ990: SIN 07:30 → Medan (KNO) 08:00 (30/08)."], costs:["c1"], map:["brussel","singapore","medan"], duration: "15u 15m" },
  { id:"t3", fase:"sumatra", start:"2026-08-30", end:"2026-09-01", title:"🏨 Medan — aankomst & wachten", details:["Matthew & Arne vliegen op 29-30 aug aan in Medan.", "Overnachting in Medan (30-31 aug), in afwachting van de rest van de groep.", "Op 01/09 rond middaguur ontmoeten zij Kamiel, Eliott, Kasper & Willem (Lion Air JT204 uit Jakarta, aankomst 10:20).", "Diezelfde middag vertrekken allen samen met privé minibus naar Ketambe (±7-8u rit).", "Overnachting in guesthouse Ketambe (eerste nacht vóór trek)."], costs:[], map:["medan"], otherFlight:"c6b" },
  { id:"t4", fase:"sumatra", start:"2026-09-01", end:"2026-09-02", title:"🚐 Medan → Ketambe (middag 1 sep, overnachting)", details:["Alle 6 man: Matthew, Arne, Willem, Kasper, Eliott, Kamiel.", "Middag 1 sep: privé minibus vertrek vanuit Medan Kualanamu (na ontmoeting 4-tal uit Jakarta).", "Rit van ±7-8u door Sumatra oerwoud naar Ketambe.", "Overnachting in guesthouse Ketambe, geregeld door gids Hasby — dit is de eerste nacht vóór de trek."], costs:["c3","c4b"], map:["medan","ketambe"], duration: "7-8u" },
  { id:"t5", fase:"sumatra", start:"2026-09-02", end:"2026-09-06", title:"🥾 Jungle Adventure Trek — 5 dagen diep in Sumatra", details:["Adventure Jungle Trekking (5 dagen, 4 nachten) met gids Hasby Ketambe.", "Volwassen jungle exploratie met dagelijks verplaatsen van kampement diep in Gunung Leuser National Park, op zoek naar wilde orang-oetans, gibbons, macaques en vogelparadijzen.", "All-in: 1 gids + 2 porters, professioneel kampeermateriaal (tent, slaapzak, matras), alle maaltijden/drinken, permits forest entrance.", "Special group rate: IDR 800.000 pp/dag (€47 equivalent) × 6 personen = 19.500.000 IDR totaal.", "Aanbetaling 8% (IDR 1.920.000) overgemaakt 03/07; restbedrag ter plaatse contant of overschrijving.", "Contact: Hasby Ketambe (WhatsApp +62 85373207007, email hasbyketambe@gmail.com)."], costs:["c4"], map:["ketambe"] },
  { id:"t6", fase:"sumatra", start:"2026-09-06", end:"2026-09-07", title:"🏨 Ketambe — rustdag na trek", details:["Overnachting (tweede nacht) in guesthouse Ketambe na afloop van de intensieve 5-daagse trek, geregeld door gids Hasby."], costs:["c4b"], map:["ketambe"] },
  { id:"t6b", fase:"sumatra", start:"2026-09-07", end:"2026-09-07", title:"🚐 Ketambe → Medan (7 sept)", details:["Terugrit naar Medan met privé taxi (±7-8u); aankomst laat in de middag."], costs:["c5"], map:["ketambe","medan"], duration: "~7-8u taxi" },
  { id:"t6c", fase:"jakarta", start:"2026-09-07", end:"2026-09-07", title:"✈️ Medan → Jakarta (vlucht)", details:["Lion Air JT383: Medan (19:00) → Jakarta (21:25) — aankomst laat op de avond na de trek.", "Overnachting in Jakarta, klaar om de volgende dag Maurice, Mathias & Jens te ontmoeten."], costs:["c6"], map:["medan","jakarta"], duration: "~1.5u vlucht" },
  { id:"t7", fase:"jakarta", start:"2026-09-08", end:"2026-09-08", title:"🏙️ Jakarta — Maurice, Mathias & Jens sluiten aan", details:["Maurice, Mathias & Jens komen 's ochtends per vlucht aan in Jakarta (08:25) — de groep is nu compleet met 9 man.", "'s Avonds samen de stad in om de hereniging te vieren."], costs:["c19"], map:["jakarta"], otherFlight:"c28" },
  { id:"t8", fase:"java", start:"2026-09-09", end:"2026-09-09", title:"🚂 Jakarta → Yogyakarta", details:["De jongens nemen de trein (Argo Bromo Anggrek, ±8u) van Jakarta naar Yogyakarta.", "Onderweg tempelbezoek aan de hindoetempel Prambanan.", "Overnachting in Yogyakarta.", "Tip: de tempelentree dekt zowel Prambanan (vandaag) als Borobudur (morgenvroeg, zie volgende dag)."], costs:["c7","c7b","c20"], map:["jakarta","prambanan","yogya"], duration: "~8u trein" },
  { id:"t9", fase:"java", start:"2026-09-10", end:"2026-09-10", title:"🚂 Yogyakarta → nachttrein naar Malang", details:["Vroeg in de ochtend bezoek aan de boeddhistische tempel Borobudur.", "'s Avonds nachttrein (Malioboro Express) van Yogyakarta naar Malang."], costs:["c8"], map:["yogya","borobudur","malang"], duration: "~10u (nacht)" },
  { id:"t10b", fase:"java", start:"2026-09-11", end:"2026-09-12", title:"🌋 Tumpak Sewu & Bromo (alle 9)", details:["11/09: Tumpak Sewu waterval (±2,5u rijden vanuit Malang).", "12/09: om 3u 's nachts op voor Mount Bromo bij zonsopgang.", "Daarna taxi naar Banyuwangi."], costs:["c37"], map:["malang","tumpak_sewu","bromo","banyuwangi"] },
  { id:"t11", fase:"bali", start:"2026-09-13", end:"2026-09-15", title:"🏄 Canggu — twee dagen Bali met de jongens (Matthew)", details:["Matthew blijft na de ferry twee dagen in Canggu bij de jongens: strand, surf en bijkomen na de vulkanen.", "Op 15/09 in de namiddag naar Ngurah Rai (DPS) voor de vlucht naar Surabaya."], costs:["c36"], map:["canggu"] },
  { id:"t11a", fase:"java", start:"2026-09-15", end:"2026-09-15", title:"✈️ Bali → Surabaya (Matthew haalt Hinke op)", details:["✈️ Super Air Jet IU 703: Denpasar (DPS, Ngurah Rai) 16:40 → Surabaya (SUB, Juanda) 16:40 lokale tijd — 1u vliegen, met één uur tijdsverschil (WITA → WIB).", "Airbus A320, Economy · € 36 · 51 kg CO2e.", "Transfer Canggu → luchthaven Denpasar vooraf inplannen (±1u, meer bij avondspits).", "Matthew wacht op Juanda; Hinke landt om 18:15 (Cathay Pacific CX294+CX629).", "Daarna samen door naar de villa in Blimbing (±2u rijden); vanaf hier reizen ze samen verder."], costs:["c35"], map:["canggu","bali","surabaya"], otherFlight:"c29", duration: "1u" },
  { id:"t11b", fase:"java", start:"2026-09-15", end:"2026-09-16", title:"🏡 Villa in Blimbing — rustdag", details:["Wonderhouz Premium Villa, hosted by Irene Iola Auxilia.", "Check-in Tue Sep 15 at 3:00 PM, check-out Wed Sep 16 at 12:00 PM.", "Adres: No 2C Breezia Villa, Allegro Cluster, Blimbing.", "Confirmation code: HMJFAKQ8FH."], costs:["c25"], map:["malang"] },
  { id:"t12", fase:"java", start:"2026-09-16", end:"2026-09-16", title:"🌋 Bromo + Tumpak Sewu", details:["Jeep-tour langs de Tumpak Sewu-watervallen en Mount Bromo bij zonsopgang.", "Daarna taxi naar Banyuwangi (±5u) voor de overnachting."], costs:["c10","c21"], map:["malang","tumpak_sewu","bromo","banyuwangi"], duration: "~2.5u rijden" },
  { id:"t13", fase:"java", start:"2026-09-17", end:"2026-09-17", title:"🔥 Kawah Ijen", details:["Nachtelijke hike naar Kawah Ijen voor het beroemde blauwvuur en zwavelmeer bij zonsopgang.", "Afdaling en overnachting in Banyuwangi."], costs:["c22"], map:["banyuwangi","ijen"] },
  { id:"t14", fase:"flores", start:"2026-09-18", end:"2026-09-18", title:"✈️ Java → Bali → Flores", details:["Vlucht van Banyuwangi via Denpasar (Bali) naar Labuan Bajo op Flores, aankomst in de middag — laatste etappe richting Flores."], costs:["c11"], map:["banyuwangi","bali","labuanbajo"], duration: "~1.5u + ~2.5u" },
  { id:"t15", fase:"flores", start:"2026-09-19", end:"2026-09-19", title:"🌅 Labuan Bajo — aankomen & relax", details:["Aankomst en inchecken in Labuan Bajo — rustig aan doen na de reisdag.", "Verkenning van het centrum en de haven."], costs:["c12"], map:["labuanbajo"] },
  { id:"t16", fase:"flores", start:"2026-09-20", end:"2026-09-20", title:"🍹 Labuan Bajo — chill + omgeving", details:["Vrije dag in en rond Labuan Bajo: strandjes, uitzichtpunten en lokale warongs.", "Rustig voorbereiden op de trip naar het binnenland."], costs:[], map:["labuanbajo"] },
  { id:"t17", fase:"flores", start:"2026-09-21", end:"2026-09-22", title:"⛰️ Ruteng (binnenland)", details:["Privétaxi van ±4u naar Ruteng, het bergachtige binnenland van Flores.", "Bekend om de spinnenweb-rijstvelden en het koelere klimaat."], costs:["c13"], map:["labuanbajo","ruteng"] },
  { id:"t18", fase:"flores", start:"2026-09-23", end:"2026-09-23", title:"🚗 Terug naar Labuan Bajo regio", details:["Taxi terug naar Labuan Bajo (±4u) — klaar voor de Komodo-boottocht."], costs:["c14"], map:["ruteng","labuanbajo"] },
  { id:"t19", fase:"komodo", start:"2026-09-24", end:"2026-09-24", title:"🦎 Komodo National Park — full day boottour", details:["Volle dag boottour: Padar Island, Pink Beach, Komodovaranen op Komodo en snorkelen bij Manta Point."], costs:["c23"], map:["labuanbajo","padar","pink_beach","komodo","manta_point","labuanbajo"] },
  { id:"t20", fase:"komodo", start:"2026-09-25", end:"2026-09-25", title:"🏖️ Relaxdag Labuan Bajo", details:["Rustdag in Labuan Bajo na de boottocht — chillen, zwemmen of shoppen."], costs:[], map:["labuanbajo"] },
  { id:"t21", fase:"bali", start:"2026-09-26", end:"2026-09-26", title:"✈️ Labuan Bajo → Bali", details:["Vlucht van Labuan Bajo naar Bali (Indonesia AirAsia QZ503, ±1u10)."], costs:["c15"], map:["labuanbajo","bali"] },
  { id:"t22", fase:"bali", start:"2026-09-26", end:"2026-09-28", title:"🏖️ Bali — luxe & chill", details:["Laatste dagen in een luxe villa op Bali: zwembad, strand en lekker uit eten.", "Rustig afsluiten van de reis voor Matthew en Hinke."], costs:["c16"], map:["bali"] },
  { id:"t23", fase:"terug", start:"2026-09-29", end:"2026-09-30", title:"✈️ Terugvlucht Bali → Bangkok → Brussel (Matthew & Hinke)", details:["✈️ Vlucht vertrekt: 29 sep om 19:00 | Aankomst: 30 sep om 07:15", "TG440: Denpasar (DPS, Ngurah Rai) 19:00 → Bangkok (BKK, Suvarnabhumi) 22:10 op 29/09, Thai Airways, 4u 10m, Economy.", "Overstap 1u 55m in Bangkok Suvarnabhumi.", "TG934: Bangkok (BKK) 00:05 → Brussel (BRU) 07:15 op 30/09, Thai Airways, 12u 10m, Economy.", "Bagage per persoon: 1 ruimbagagestuk van max. 23 kg, 1 handbagage van max. 7 kg (25×45×56 cm) en 1 persoonlijk item.", "Annuleren en omboeken kan tegen betaling van een fee.", "Prijs nog te bevestigen (TBD)."], costs:["c17"], map:["bali","bangkok","brussel"], openNote: true, duration: "18u 15m" },
  { id:"t27", fase:"heen", start:"2026-08-29", end:"2026-08-30", title:"✈️ Brussel → Singapore → Jakarta (Kamiel, Eliott, Kasper, Willem)", details:["✈️ Vlucht vertrekt: 29 aug om 11:45 | Aankomst: 30 aug om 09:55", "SQ 303: BRU 11:45 (29/08) → SIN 06:40 (30/08).", "Layover 2u25 in Changi (Singapore).", "SQ 956: SIN 09:05 → CGK 09:55 (30/08), aankomst Jakarta Soekarno Intl T3.", "Beide segmenten: Airbus A350-900, Economy."], costs:["c26"], map:["brussel","singapore","jakarta"], duration: "17u 10m" },
  { id:"t28", fase:"heen", start:"2026-08-30", end:"2026-08-31", title:"🏙️ Jakarta — aankomst & acclimatiseren (Kamiel, Eliott, Kasper, Willem)", details:["Aankomst 30/08 om 09:55 op Jakarta Soekarno Intl T3.", "Twee overnachtingen in Jakarta (30 en 31 aug).", "Stad verkennen om te acclimatiseren."], costs:["c27"], map:["jakarta"] },
  { id:"t29", fase:"heen", start:"2026-09-01", end:"2026-09-01", title:"✈️ Jakarta → Medan (Kamiel, Eliott, Kasper, Willem)", details:["Vlucht Jakarta (CGK) → Medan.", "Ontmoeting met Matthew & Arne in Medan.", "Aansluitend met alle 6 man taxi naar Ketambe (±7-8u)."], costs:["c6b"], map:["jakarta","medan"], duration: "~1.5u vlucht + 7-8u taxi" },
  { id:"t30", fase:"java", start:"2026-09-13", end:"2026-09-13", title:"🔥 Kawah Ijen 's nachts (alle 9)", details:["Om 1u 's nachts op voor de Kawah Ijen-hike: blauwvuur en zwavelmeer bij zonsopgang."], costs:["c38"], map:["banyuwangi","ijen"], duration: "~4-5u hike" },
  { id:"t30b", fase:"bali", start:"2026-09-13", end:"2026-09-13", title:"🚢 Ferry naar Bali → Canggu (alle 9)", details:["Na de Kawah Ijen-hike taxi naar Ketapang, dan ferry naar Gilimanuk (Bali), en doorrijden naar Canggu.", "Matthew steekt mee over en blijft tot 15/09 op Bali."], costs:[], map:["banyuwangi","canggu"], duration: "~3-4u totaal" },
  { id:"t30c", fase:"bali", start:"2026-09-13", end:"2026-09-19", title:"🏡 Villa in Canggu — basis voor de Bali-week (8p)", details:["Airbnb geboekt: superbe villa moderne, 4 slaapkamers, 400 m van het strand (4,92★, 49 reviews, 'Coup de cœur voyageurs').", "Check-in 13/09, check-out 19/09 (6 nachten), voor 8 personen: Willem, Eliott, Jens, Arne, Maurice, Kamiel, Kasper & Mathias.", "Tip: prijs 6 nachten × €398,01 = €2.388,06, min. speciale korting €573,12 → totaal €1.814,94.", "Tip: betaling gesplitst: €907,50 nu, €907,44 op 29/08.", "Tip: gratis annulering binnen 24u.", "Tip: dit is de accommodatie voor de jongens tijdens het volledige 7-daagse Bali-programma (Canggu → Uluwatu → Nusa Penida → Ubud → Amed → Sidemen/Agung) — niet inbegrepen in Matthews eigen kostendashboard, want Matthew & Hinke doen op dat moment de Flores/Komodo-route."], costs:["c30"], map:["canggu"] },
  { id:"t31", fase:"bali", start:"2026-09-13", end:"2026-09-14", title:"🏄 Bali dag 1–2 — Canggu", details:["Surfen: Batu Bolong Beach (zachte golven, ideaal voor beginners), Echo Beach (iets pittiger), Old Man's (relaxte sfeer).", "Zonsondergang bij beachclubs: Old Man's, La Brisa of Finns.", "Optioneel stop: Tanah Lot klieftempel in zee."], costs:[], map:["canggu"] },
  { id:"t32", fase:"bali", start:"2026-09-14", end:"2026-09-15", title:"🛕 Bali dag 2–3 — Uluwatu", details:["Uluwatu Temple: klieftempel + Kecak dance bij zonsondergang.", "Surfen op Uluwatu/Padang Padang (gevorderde reef breaks) en Bingin & Impossibles.", "Single Fin: legendarische sunset-bar boven de golven.", "Suluban (Blue Point) strand bereikbaar via een grot.", "Bingin Beach: chille vibe met warungs en cliffside cafés."], costs:[], map:["canggu","uluwatu"] },
  { id:"t33", fase:"bali", start:"2026-09-16", end:"2026-09-16", title:"🏝️ Bali dag 4 — Nusa Penida", details:["Vroege boot vanaf Sanur.", "Kelingking Beach: iconisch T-rex-uitzicht, eventueel afdalen.", "Broken Beach: natuurlijke rotsboog boven turquoise water.", "Angel's Billabong: natuurlijk zwembad in de rotsen.", "Snorkelen met manta rays (beroemde mantapunt).", "Crystal Bay voor extra snorkelen."], costs:[], map:["uluwatu","nusa_penida"] },
  { id:"t34", fase:"bali", start:"2026-09-17", end:"2026-09-17", title:"🌾 Bali dag 5 — Ubud", details:["Tegalalang Rice Terrace: iconische groene terrassen met swings.", "Tirta Empul: heilige waterbrontempel, reinigingsritueel mogelijk.", "Monkey Forest: bosreservaat met apen en oude tempels.", "Campuhan Ridge Walk bij zonsopgang.", "Optioneel: Balinese kookles met marktbezoek of Tegenungan waterval."], costs:[], map:["nusa_penida","ubud"] },
  { id:"t35", fase:"bali", start:"2026-09-18", end:"2026-09-18", title:"🤿 Bali dag 6 — Amed & Tulamben", details:["USAT Liberty Wreck: wereldberoemde wrakduik, ook goed te snorkelen.", "Coral Garden: snorkelspot met kleurrijk rif vlak bij de kust.", "Freediving sessie: Amed staat bekend om intro's en cursussen.", "Jemeluk Bay voor een ontspannen snorkelsessie.", "Uitzicht op Mount Agung vanaf rustige stranden."], costs:[], map:["ubud","amed"] },
  { id:"t36", fase:"bali", start:"2026-09-19", end:"2026-09-19", title:"🌋 Bali dag 7 — Sidemen & Mount Agung", details:["Sidemen rijstterrassen: rustige wandeling, minder toeristisch dan Ubud.", "Besakih Temple: moedertempel van Bali, aan de voet van Agung.", "Mount Agung sunrise hike: middernacht vertrek, 4–6u klimmen, episch uitzicht op Lombok.", "Verplichte lokale gids (max. 3 pp/gids, verplicht since 2025).", "Herstel 's middags, eventueel hot springs."], costs:[], map:["amed","sidemen","agung"] },
  { id:"t37", fase:"terug", start:"2026-09-19", end:"2026-09-20", title:"✈️ Bali → Vietnam (Mathias, Willem, Momo) — TBD", details:["✈️ Vlucht vertrekt: 19 sep (TBD) | Aankomst: 20 sep (TBD)", "Na het volledige 7-daagse programma vliegen Mathias, Willem en Momo door naar Vietnam.", "Exacte vluchtdatum en bestemming nog te bevestigen."], costs:["c32"], map:["agung","bali","vietnam"], openNote: true, duration: "~2-3u vlucht" },
  { id:"t40", fase:"bali", start:"2026-09-19", end:"2026-09-25", title:"🏝️ Bali — laatste dagen voor het vertrek (Arne, Kasper & Jens)", details:["Na de check-out uit de villa in Canggu (19/09) blijven Arne, Kasper en Jens nog zes nachten op Bali.", "Vrij programma op het eiland; ze vertrekken pas op 25 september 's avonds richting huis.", "Let op: Verblijf voor deze zes nachten is nog niet geboekt.", "Eliott en Kamiel horen niet bij deze groep — hun terugreis staat apart."], costs:["c34"], map:["bali"], openNote: true },
  { id:"t38", fase:"terug", start:"2026-09-25", end:"2026-09-26", title:"✈️ Terugvlucht Bali → Bangkok → Brussel (Arne, Kasper & Jens)", details:["✈️ Vlucht vertrekt: 25 sep om 16:55 | Aankomst: 26 sep om 07:15", "TG432: Denpasar (DPS, Terminal I) 16:55 → Bangkok (BKK, Suvarnabhumi) 20:05 op 25/09, Thai Airways, 4u 10m, Economy.", "Overstap 4u in Bangkok Suvarnabhumi.", "TG934: Bangkok (BKK) 00:05 → Brussel (BRU) 07:15 op 26/09, Thai Airways, 12u 10m, Economy.", "Boekingsnummer CheapTickets: CBE-11227216 · check-incode (PNR): YCX2VO.", "E-ticketnummers: Arne 217-5238812870, Jens 217-5238812871, Kasper 217-5238812872.", "Bagage: 1 ruimbagagestuk van max. 23 kg per passagier."], costs:["c31"], map:["bali","bangkok","brussel"], duration: "20u 20m" },
  { id:"t38b", fase:"terug", start:"2026-09-19", end:"2026-09-20", title:"✈️ Terugvlucht Bali → Brussel (Eliott & Kamiel) — TBD", details:["✈️ Vlucht vertrekt: 19 sep (TBD) | Aankomst: 20 sep (TBD)", "Eliott en Kamiel staan niet op de Thai Airways-boeking van 25/09 (Arne, Kasper & Jens).", "Exacte vluchtdatum, -tijd en maatschappij nog te bevestigen."], costs:["c33"], map:["agung","bali","brussel"], openNote: true, duration: "~20u" },
  { id:"t39", fase:"heen", start:"2026-09-07", end:"2026-09-08", title:"✈️ Brussel → Jakarta (Maurice, Mathias, Jens)", details:["✈️ Vlucht vertrekt: 7 sep om 11:45 | Aankomst: 8 sep om 08:25", "SQ303: BRU 11:45 (07/09) → SIN 06:40 (08/09), Singapore Airlines Airbus A350-900.", "Overstap 1u in Changi T2.", "SQ952: SIN 07:40 → CGK 08:25 (08/09), Airbus A350-900, aankomst Soekarno-Hatta T3.", "Boekingsref. voor deze vlucht (Jens): FSXOOZ (ticket 618-2479864879), ticketprijs €680,77 pp.", "Maurice en Mathias nemen dezelfde vlucht."], costs:["c28"], map:["brussel","jakarta"], duration: "15u40" },
  { id:"t41", fase:"heen", start:"2026-09-14", end:"2026-09-15", title:"✈️ Brussel → Hongkong → Surabaya (Hinke)", details:["✈️ Cathay Pacific CX294: BRU 13:05 (14/09) → HKG 06:35 (15/09) · Airbus A350", "✈️ Cathay Pacific CX629: HKG 14:30 (15/09) → SUB 18:15 (15/09) · Airbus A330", "Overstap in Hongkong (Chek Lap Kok) van 06:35 tot 14:30.", "Vlucht Hinke naar Surabaya om daar bij Matthew aan te sluiten."], costs:["c29"], map:["brussel","hongkong","surabaya"], duration: "29u 10m (met overstap)" },
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
    fromPt:"brussel", toPt:"medan",
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
    id:"tl7", type:"trein", icon:"🚂",
    date:"2026-09-10", dateD:"10", dateM:"sep",
    fromIATA:"YOG", toIATA:"MLG",
    fromLabel:"Yogyakarta Tugu", toLabel:"Malang Kotalama",
    title:"Yogyakarta → Malang (nachttrein)",
    sub:"KAI · Malioboro Express · ±7u 's nachts",
    operator:"KAI", flightNum:"Malioboro Express",
    terminal:"Spoor 2, Yogyakarta Tugu",
    times:"21:30 → 04:30+1", cost_id:"c8", ref:"KAI-ML1009",
    fromPt:"yogya", toPt:"malang",
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
    terminal:null, times:"06:00 → 17:00", cost_id:"c37", ref:"BRM-0911",
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
    fromIATA:"MLG", toIATA:"BWX",
    fromLabel:"Malang (Blimbing Villa)", toLabel:"Banyuwangi (via Bromo & Tumpak Sewu)",
    title:"Malang → Bromo & Tumpak Sewu → Banyuwangi (Matthew & Hinke)",
    sub:"Privé jeep tour met chauffeur",
    operator:"Java Adventure Tour", flightNum:null,
    terminal:null, times:"Vroeg → Avond", cost_id:"c21", ref:"MH-BRM16",
    fromPt:"malang", toPt:"banyuwangi",
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
    fromPt:"surabaya", toPt:"labuanbajo",
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
    fromPt:"labuanbajo", toPt:"ruteng",
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
    fromPt:"ruteng", toPt:"labuanbajo",
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
