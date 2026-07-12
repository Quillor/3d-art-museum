// Room-title sign themes. Historical influence is limited to restrained color,
// border rhythm, and material cues; labels always use highly legible modern
// Latin type. We do not imitate sacred, ancient, or culture-specific scripts.

export const SIGN_LEGIBILITY_POLICY = Object.freeze({
  useModernLatinLetterforms: true,
  minimumContrastRatio: 4.5,
  uppercaseRoomTitleOnly: true,
  neverImitateHistoricalScripts: true,
  alwaysShowCollectionPeriod: true,
  alwaysNameArchitecturalFrame: true,
});

const DEFAULT = Object.freeze({
  bg: "#17130f",
  fg: "#ead7ae",
  sub_fg: "#c3ad86",
  anchor_fg: "#aa9674",
  fontFamily: "Optima, 'Avenir Next', Georgia, serif",
  subFontFamily: "'Avenir Next', Optima, Georgia, sans-serif",
  fontWeight: 650,
  tracking: 4.2,
  borderStyle: "double",
  motif: "none",
  grain: 0.045,
});

const theme = (opts) => Object.freeze({ ...DEFAULT, ...opts });
const frame = (culture, building, date) =>
  `ARCHITECTURAL FRAME · ${culture} · ${building} · ${date}`;

// Every eraKey in js/data/artworks.js is intentionally present here. The third
// line distinguishes a collection's broad label from the specific architecture
// used to frame it, preventing one building tradition from standing in for all
// cultures represented by the artwork selection.
export const SIGN_THEMES = Object.freeze({
  prehistoric: theme({
    bg: "#241a12", fg: "#e5c58f", sub_fg: "#c69a62", anchor_fg: "#ad875d",
    borderStyle: "single", motif: "none", grain: 0.085,
    anchor: frame("UPPER PALEOLITHIC FRANCE", "CHAUVET CAVE", "c. 30,000 BCE"),
  }),
  mesoamerica: theme({
    bg: "#2b2117", fg: "#e4cf9c", sub_fg: "#c77b55", anchor_fg: "#b99d72",
    borderStyle: "single", motif: "none", grain: 0.07,
    anchor: frame("TERMINAL CLASSIC PUUC MAYA", "GOVERNOR’S PALACE, UXMAL", "c. 900 CE"),
  }),
  andes: theme({
    bg: "#262725", fg: "#e5dfcd", sub_fg: "#b45b46", anchor_fg: "#b8b0a0",
    borderStyle: "single", motif: "none", grain: 0.06,
    anchor: frame("INCA", "MACHU PICCHU", "c. 1450 CE"),
  }),
  nativenorth: theme({
    bg: "#37251b", fg: "#f0d5a4", sub_fg: "#c76c49", anchor_fg: "#bea27f",
    borderStyle: "single", motif: "none", grain: 0.055,
    anchor: frame("ANCESTRAL PUEBLO", "CLIFF PALACE, MESA VERDE", "c. 1190–1280"),
  }),
  americas19: theme({
    bg: "#35151a", fg: "#e8c978", sub_fg: "#d9b7a3", anchor_fg: "#bea18d",
    fontFamily: "Baskerville, Georgia, serif", motif: "rosette", grain: 0.055,
    anchor: frame("UNITED STATES", "RENWICK GALLERY", "1859–1874"),
  }),
  americasmodern: theme({
    bg: "#17191c", fg: "#f0e7d5", sub_fg: "#c7a55b", anchor_fg: "#aaa59d",
    fontFamily: "Futura, 'Avenir Next', Helvetica, sans-serif", borderStyle: "single",
    motif: "line", tracking: 5.2, grain: 0.025,
    anchor: frame("AMERICAN PRAIRIE SCHOOL", "UNITY TEMPLE", "1905–1908"),
  }),
  classical: theme({
    bg: "#54201d", fg: "#f2e4c8", sub_fg: "#d6b36d", anchor_fg: "#cfbea0",
    fontFamily: "Palatino, Georgia, serif", motif: "meander", grain: 0.04,
    anchor: frame("HELLENISTIC ATHENS", "STOA OF ATTALOS · RECONSTRUCTION ADAPTATION", "c. 150 BCE"),
  }),
  medieval: theme({
    bg: "#18202a", fg: "#e9ddbd", sub_fg: "#b89b55", anchor_fg: "#aeb6bd",
    fontFamily: "Baskerville, Georgia, serif", borderStyle: "arched", motif: "arch", grain: 0.06,
    anchor: frame("NORMAN GOTHIC", "MERVEILLE CLOISTER, MONT-SAINT-MICHEL", "c. 1228"),
  }),
  renaissance: theme({
    bg: "#30231a", fg: "#eee0bd", sub_fg: "#c8a45c", anchor_fg: "#b9a88e",
    fontFamily: "Palatino, Georgia, serif", motif: "rosette", grain: 0.05,
    anchor: frame("FLORENTINE RENAISSANCE", "UFFIZI CORRIDORS", "1560–1581"),
  }),
  baroque: theme({
    bg: "#43161a", fg: "#f1dfb5", sub_fg: "#d6ad58", anchor_fg: "#c5aa8d",
    fontFamily: "Baskerville, Georgia, serif", borderStyle: "double", motif: "rosette", grain: 0.055,
    anchor: frame("FRENCH BAROQUE", "GALERIE DES GLACES, VERSAILLES", "1678–1684"),
  }),
  romantic: theme({
    bg: "#35151c", fg: "#ead6ad", sub_fg: "#c79e58", anchor_fg: "#bba18a",
    fontFamily: "Baskerville, Georgia, serif", motif: "rosette", grain: 0.06,
    anchor: frame("BRITISH REGENCY", "SIR JOHN SOANE’S PICTURE ROOM", "1824"),
  }),
  impressionism: theme({
    bg: "#243027", fg: "#f1ead9", sub_fg: "#c9ae66", anchor_fg: "#b8c1ad",
    fontFamily: "Baskerville, Georgia, serif", borderStyle: "single", motif: "line", grain: 0.035,
    anchor: frame("FRENCH BEAUX-ARTS", "GARE D’ORSAY", "1900"),
  }),
  euromodern: theme({
    bg: "#202328", fg: "#f3f3ef", sub_fg: "#c5a864", anchor_fg: "#b6bbc0",
    fontFamily: "Futura, 'Avenir Next', Helvetica, sans-serif", borderStyle: "single",
    motif: "line", tracking: 5.4, grain: 0.018,
    anchor: frame("GERMAN BAUHAUS", "BAUHAUS DESSAU", "1925–1926"),
  }),
  neolithic: theme({
    bg: "#38261a", fg: "#ead3a4", sub_fg: "#bd6844", anchor_fg: "#b99a75",
    borderStyle: "stepped", motif: "chevron", grain: 0.08,
    anchor: frame("NEOLITHIC ANATOLIA", "ÇATALHÖYÜK", "c. 7100–5700 BCE"),
  }),
  mesopotamia: theme({
    bg: "#392719", fg: "#f0dfad", sub_fg: "#c49a59", anchor_fg: "#c2ad8b",
    borderStyle: "stepped", motif: "none", grain: 0.055,
    anchor: frame("NEO-ASSYRIAN", "NORTHWEST PALACE, NIMRUD", "883–859 BCE"),
  }),
  persia: theme({
    bg: "#273643", fg: "#eee2c4", sub_fg: "#d2ad58", anchor_fg: "#b6c0c5",
    borderStyle: "double", motif: "rosette", grain: 0.04,
    anchor: frame("ACHAEMENID PERSIA", "APADANA, PERSEPOLIS", "c. 515–465 BCE"),
  }),
  islamic: theme({
    bg: "#17364a", fg: "#f0e5ca", sub_fg: "#63a5ad", anchor_fg: "#b8c6c3",
    fontFamily: "Optima, 'Avenir Next', Georgia, serif", borderStyle: "arched", motif: "none", grain: 0.035,
    anchor: frame("SELJUQ IRAN", "MASJED-E JĀMEʿ, ISFAHAN", "11th–12th C."),
  }),
  ottoman: theme({
    bg: "#482025", fg: "#f2e5cb", sub_fg: "#6f9db3", anchor_fg: "#c5b8a2",
    fontFamily: "Optima, 'Avenir Next', Georgia, serif", borderStyle: "arched", motif: "none", grain: 0.035,
    anchor: frame("OTTOMAN", "TOPKAPI PALACE", "15th–19th C."),
  }),
  memodern: theme({
    bg: "#252321", fg: "#eee2c8", sub_fg: "#bf9455", anchor_fg: "#bcb1a0",
    fontFamily: "Futura, 'Avenir Next', Helvetica, sans-serif", borderStyle: "single",
    motif: "lattice", tracking: 5.0, grain: 0.025,
    anchor: frame("BEIRUT OTTOMAN-REVIVAL", "SURSOCK MUSEUM", "1912"),
  }),
  indus: theme({
    bg: "#3b2218", fg: "#ebd3ad", sub_fg: "#bf7451", anchor_fg: "#bca28b",
    borderStyle: "stepped", motif: "grid", grain: 0.065,
    anchor: frame("INDUS CIVILIZATION", "GREAT BATH, MOHENJO-DARO", "c. 2500 BCE"),
  }),
  china: theme({
    bg: "#351512", fg: "#efcf82", sub_fg: "#62a08d", anchor_fg: "#c0a78a",
    fontFamily: "'Hiragino Mincho ProN', Optima, Georgia, serif", borderStyle: "single",
    motif: "lattice", grain: 0.035,
    anchor: "ARCHITECTURAL FRAME · MING CHINA · FORBIDDEN CITY · 1406–1420 · KOREAN WORKS ARE EXHIBITS",
  }),
  seasia: theme({
    bg: "#30251a", fg: "#e8d2a5", sub_fg: "#bb7e4d", anchor_fg: "#b5a48b",
    borderStyle: "single", motif: "none", grain: 0.075,
    anchor: frame("KHMER", "ANGKOR WAT GALLERIES", "EARLY 12th C."),
  }),
  japan: theme({
    bg: "#181614", fg: "#eee8dc", sub_fg: "#a64236", anchor_fg: "#aaa39a",
    fontFamily: "'Hiragino Mincho ProN', Optima, Georgia, serif", borderStyle: "single",
    motif: "line", tracking: 5.2, grain: 0.025,
    anchor: frame("JAPANESE SHOIN", "NINOMARU PALACE, NIJŌ CASTLE", "1626"),
  }),
  southasia: theme({
    bg: "#4a201b", fg: "#f2e7d1", sub_fg: "#d4ad61", anchor_fg: "#c9b6a0",
    fontFamily: "Optima, Palatino, Georgia, serif", borderStyle: "arched", motif: "arch", grain: 0.035,
    anchor: frame("MUGHAL INDIA", "FATEHPUR SIKRI", "1571–1585"),
  }),
  asiamodern: theme({
    bg: "#232526", fg: "#f0eadf", sub_fg: "#b89155", anchor_fg: "#b4b2ab",
    fontFamily: "Futura, 'Avenir Next', Helvetica, sans-serif", borderStyle: "single",
    motif: "lattice", tracking: 5.0, grain: 0.02,
    anchor: frame("JAPANESE ART DECO", "FORMER PRINCE ASAKA RESIDENCE / TEIEN", "1933"),
  }),
  egypt: theme({
    bg: "#202638", fg: "#e7c56b", sub_fg: "#d3ae62", anchor_fg: "#b9b1a0",
    fontFamily: "Optima, 'Avenir Next', Georgia, serif", borderStyle: "stepped", motif: "sun", grain: 0.055,
    anchor: frame("NEW KINGDOM EGYPT", "GREAT HYPOSTYLE HALL, KARNAK", "c. 1290–1224 BCE"),
  }),
  kingdoms: theme({
    bg: "#382417", fg: "#ead1a0", sub_fg: "#bd6846", anchor_fg: "#b99a77",
    borderStyle: "single", motif: "none", grain: 0.085,
    anchor: frame("SONGHAI", "TOMB OF ASKIA, GAO", "1495"),
  }),
  traditions: theme({
    bg: "#221a14", fg: "#ebd0a0", sub_fg: "#bd784b", anchor_fg: "#b49c80",
    borderStyle: "single", motif: "none", grain: 0.055,
    anchor: frame("ASANTE", "EJISU BESEASE TRADITIONAL BUILDINGS", "19th–20th C."),
  }),
  oceancient: theme({
    bg: "#392319", fg: "#e6c18d", sub_fg: "#b86643", anchor_fg: "#b69978",
    borderStyle: "single", motif: "none", grain: 0.06,
    anchor: frame("ABORIGINAL AUSTRALIA", "UBIRR ROCK SHELTERS, KAKADU", "LAYERED OVER MILLENNIA"),
  }),
  ocevoyage: theme({
    bg: "#183044", fg: "#eee0bd", sub_fg: "#b98d55", anchor_fg: "#aebdc2",
    borderStyle: "single", motif: "none", grain: 0.045,
    anchor: frame("MĀ’OHI", "TAPUTAPUĀTEA MARAE / AHU", "c. 1000–1800"),
  }),
  oceliving: theme({
    bg: "#241918", fg: "#eee4d3", sub_fg: "#b84335", anchor_fg: "#b7aaa0",
    borderStyle: "single", motif: "none", grain: 0.045,
    anchor: frame("MĀORI", "TE WHARE RŪNANGA, WAITANGI", "1940"),
  }),
});

export function getSignTheme(eraKey) {
  return SIGN_THEMES[eraKey] || DEFAULT;
}
