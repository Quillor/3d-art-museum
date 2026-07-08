# Era Accuracy Guide — art direction & ChatGPT prompts

A room-by-room reference for making every area of the museum historically
convincing. Each section gives: **real-world references** (buildings and
objects to study or name in a prompt), **palette & motifs** to keep accurate,
and **ready prompt material** for ChatGPT Images.

How to use with the texture system: filenames in `assets/textures/` are
listed per section. Regenerate any of them by combining the *master prompt*
from `TEXTURE_PROMPTS.md` with the reference lines here (naming a real
building or artifact in the prompt reliably improves accuracy). The current
render style is cel-shaded — flat, saturated, evenly lit textures work
better than moody photographic ones, so append: *"clean flat color, evenly
lit, subtle painterly detail, no baked-in shadows."*

---

## Prehistoric Cave (entrance)

- **References:** Lascaux Hall of the Bulls and Chauvet Cave (France),
  Altamira ceiling (Spain) — smoke-stained limestone, ochre/charcoal palette.
- **Palette/motifs:** iron-oxide red, yellow ochre, charcoal black, calcite
  white; hand stencils; no straight lines anywhere.
- **Files:** `cave_rock.jpg`, `cave_dirt.jpg`.
- **Prompt line:** "limestone cave wall like Lascaux, smoke-darkened, faint
  ochre pigment staining and calcite veils".

## The Grand Crossing (rotunda)

- **References:** the Pantheon's rotunda floor (Rome), the Altes Museum
  rotunda (Berlin), Beaux-Arts museum lobbies (the Met's Great Hall).
- **Palette/motifs:** cream limestone, dark marble checker, gilded
  entablature.
- **Files:** `hub_stone.jpg`, `hub_floor.jpg`.
- **Prompt line:** "neoclassical rotunda ashlar in warm limestone, Pantheon
  floor pattern of cream and charcoal marble".

---

# The Americas

## Mesoamerica (1200 BCE – 1520 CE)

- **References:** Palenque's Temple of the Inscriptions corridors, Tikal
  masonry, the stone mosaics of Mitla (the greca/stepped-fret walls),
  Bonampak murals for color.
- **Palette/motifs:** pale limestone, Maya red and blue accents, stepped-fret
  (xicalcoliuhqui) friezes, corbel-vault silhouettes.
- **Files:** `meso_stone.jpg`, `band_greca.jpg`.
- **Prompt line:** "Maya cut-limestone wall like Palenque with traces of red
  hematite paint; stepped-fret mosaic border like the palace of Mitla".

## The Andes (200 BCE – 1530 CE)

- **References:** Coricancha and the Twelve-Angled Stone in Cusco (perfect
  polygonal ashlar), Machu Picchu terrace walls, Tiwanaku's Gate of the Sun.
- **Palette/motifs:** cool grey andesite, knife-tight joints, trapezoidal
  niches and doorways (the style already uses a trapezoid portal flag).
- **Files:** `inca_stone.jpg`.
- **Prompt line:** "Inca polygonal masonry like the walls of Cusco, grey
  andesite blocks fitted without mortar, subtle bossed faces".

## Native North America (1100–1900)

- **References:** Cliff Palace at Mesa Verde, Pueblo Bonito (Chaco Canyon),
  Taos Pueblo adobe with projecting vigas (roof beams — already modeled).
- **Palette/motifs:** warm tan adobe, sandstone courses, black-on-white
  Ancestral Puebloan pottery geometry for the frieze.
- **Files:** `adobe_wall.jpg`.
- **Prompt line:** "hand-smoothed tan adobe plaster like Taos Pueblo; border
  of black-on-white Ancestral Puebloan pottery zigzags".

## The 19th Century & Modern Era (US/Mexico)

- **References:** the Met's 19th-century period rooms and Salon-style red/
  green walls; MoMA white cube for the modern segment.
- **Files:** `salon_wall.jpg`, `modern_wall.jpg`, `modern_floor.jpg`.

---

# Europe

## Classical Antiquity (450 BCE – 100 CE)

- **References:** the Parthenon naos, Doric columns of Paestum, Greek key
  (meander) borders on Attic vases; Pentelic marble.
- **Palette/motifs:** white/ivory marble, meander band in terracotta-on-cream
  or cream-on-blue, fluted Doric shafts. Greek temples were partly painted —
  a restrained red/blue/gold accent is accurate, not garish.
- **Files:** `greek_marble.jpg`, `greek_floor.jpg`, `band_meander.jpg`.
- **Prompt line:** "Pentelic marble temple wall, faint gold patina; Greek
  key meander border painted in Attic red and cream".

## Medieval Europe (800–1400)

- **References:** Durham Cathedral nave masonry, Sainte-Chapelle glass
  (Paris), Chartres blue; Romanesque rubble core walls.
- **Palette/motifs:** cool grey ashlar, cobalt-and-ruby glass, blackened
  timber. Keep gold for reliquaries, not walls.
- **Files:** `gothic_stone.jpg`, `gothic_floor.jpg`, `window_lancet.jpg`.
- **Prompt line:** "Gothic cathedral ashlar like Durham nave; lancet window
  in the manner of Sainte-Chapelle, cobalt and ruby panes".

## The Renaissance (1400–1600)

- **References:** Palazzo Farnese and Palazzo Medici interiors (Florence/
  Rome), Pazzi Chapel coffering, intarsia studiolo of Urbino.
- **Palette/motifs:** warm cream intonaco plaster, walnut and gilt coffered
  ceilings, pietra serena grey stone trim.
- **Files:** `renaissance_plaster.jpg`, `renaissance_floor.jpg`,
  `renaissance_ceiling.jpg`.
- **Prompt line:** "Florentine palazzo lime plaster; gilded walnut coffered
  ceiling like the Palazzo Vecchio".

## Baroque & the Golden Age (1600–1700)

- **References:** Rijksmuseum Gallery of Honour wall fabric, Dutch interiors
  in Vermeer, Roman palazzo damask rooms (Palazzo Colonna).
- **Palette/motifs:** oxblood/burgundy silk damask, ebonized wood, heavy
  gilt frames (already used).
- **Files:** `baroque_wall.jpg`.
- **Prompt line:** "oxblood silk damask wallcovering with tone-on-tone
  baroque scrollwork, like the Rijksmuseum's picture galleries".

## Rococo to Romanticism & Impressionism (1750–1905)

- **References:** the Louvre's Salon Carré (dense red salon hang), Musée
  d'Orsay's grey-blue gallery walls for the Impressionist rooms.
- **Files:** `salon_wall.jpg` (also reused here; a Paris-green or dove-grey
  variant would differentiate the Impressionist segment).

## The Modern Era (1890–1930)

- **References:** MoMA/Tate white cube, polished concrete, track lighting.
- **Files:** `modern_wall.jpg`, `modern_floor.jpg`.

---

# The Middle East

## The First Villages (9500–5000 BCE)

- **References:** Göbekli Tepe's carved T-pillars, Çatalhöyük's red-ochre
  wall paintings on white lime plaster (bulls, hands, geometric bands).
- **Palette/motifs:** cream lime plaster, ochre red geometry, no metal, no
  wheel — keep everything hand-formed.
- **Prompt line:** "Neolithic lime-plastered wall of Çatalhöyük with red
  ochre geometric band and hand stencils".

## Mesopotamia (3100–539 BCE)

- **References:** the Ishtar Gate and Processional Way (Pergamon Museum),
  ziggurat of Ur brickwork, Assyrian palace reliefs of Nineveh.
- **Palette/motifs:** tan mudbrick, lapis-blue glazed brick, gold rosettes,
  striding lions/bulls/dragons (mušḫuššu).
- **Files:** `mudbrick.jpg`, `band_ishtar.jpg` (a striding-lion variant of
  the band, as on the Processional Way, would be even more accurate).
- **Prompt line:** "glazed lapis brick frieze with golden striding lion,
  Processional Way of Babylon, Pergamon Museum".

## Persia & the Classical East (550 BCE – 630 CE)

- **References:** Persepolis Apadana stair reliefs, the Frieze of Archers
  from Susa (Louvre), double-bull column capitals.
- **Palette/motifs:** golden sandstone, glazed ochre/turquoise/deep-blue
  brick, rosette borders.
- **Files:** `persia_stone.jpg`, `band_archers.jpg`.
- **Prompt line:** "Achaemenid glazed brick frieze of royal archers from
  Susa, ochre and turquoise on deep blue".

## The Islamic Golden Age (650–1500)

- **References:** the Alhambra's zellige dados and muqarnas, the Great
  Mosque of Córdoba arches, Isfahan tile mosaic (the museum shows the
  Madrasa Imami mihrab — match its palette).
- **Palette/motifs:** ivory plaster above, tile dado below (the band),
  cobalt/turquoise/white 8-point star strapwork; calligraphy bands.
- **Files:** `islamic_plaster.jpg`, `band_zellige.jpg`.
- **Prompt line:** "zellige mosaic dado like the Alhambra, eight-pointed
  star strapwork in cobalt, turquoise, honey and ivory".

## Ottoman & Safavid Empires (1500–1900)

- **References:** Rüstem Pasha Mosque's Iznik walls (Istanbul), Topkapı
  Palace tile chambers, Sheikh Lotfollah dome (Isfahan).
- **Palette/motifs:** white ground, cobalt, turquoise and the famous Iznik
  coral red; tulips and carnations.
- **Files:** `band_iznik.jpg`.
- **Prompt line:** "Iznik tile border with tulips and carnations, cobalt
  and coral red on white, Rüstem Pasha Mosque".

---

# Asia

## Indus Valley & Early India (2500 BCE – 500 CE)

- **References:** Mohenjo-daro's baked-brick streets and the Great Bath;
  Sanchi stupa railings; Ajanta cave murals for color accents.
- **Files:** `mudbrick.jpg` (a REDDER fired-brick variant would set this
  apart from Mesopotamia's sun-dried tan: "kiln-fired brick of Mohenjo-daro,
  English-bond courses, reddish-brown").

## China & Korea (1200 BCE – 1600 CE)

- **References:** Forbidden City corridors — cinnabar-red columns and walls,
  green-and-gold dougong bracket bands under dark ceilings; Goryeo celadon
  glaze for accent color.
- **Palette/motifs:** cinnabar red, imperial yellow, malachite green bands,
  dark timber. The band could become a painted dougong/cloud-scroll strip.
- **Files:** `china_lacquer.jpg`, `china_floor.jpg`.
- **Prompt line:** "painted architrave band from the Forbidden City, green
  and gold cloud scrolls on deep blue, between cinnabar red columns".

## Southeast Asia (850–1300)

- **References:** Angkor Wat gallery bas-reliefs (Churning of the Ocean of
  Milk), Bayon corridors, laterite + grey sandstone.
- **Files:** `khmer_stone.jpg`.
- **Prompt line:** "grey sandstone gallery wall of Angkor with faint apsara
  bas-relief traces and moss in the joints".

## Japan (1250–1860)

- **References:** Katsura Imperial Villa shoji and tatami proportions,
  Nijō Castle corridors, hinoki cypress.
- **Palette/motifs:** washi white, hinoki honey, charcoal-dark posts; keep
  ornament minimal — restraint IS the accuracy here.
- **Files:** `japan_shoji.jpg`, `japan_floor.jpg`.

## Mughal & South Asia (700–1800)

- **References:** Taj Mahal pietra dura inlay, Agra Fort's red sandstone +
  white marble pairing, jali screens.
- **Palette/motifs:** white Makrana marble, carnelian/jade floral inlay,
  cusped arches.
- **Files:** `mughal_marble.jpg` (a pietra-dura floral border strip would
  upgrade the band: "white marble inlaid with carnelian and jade flowering
  vines, Taj Mahal pietra dura").

---

# Africa

## Ancient Egypt (3100 BCE – 300 CE)

- **References:** Karnak's hypostyle hall (papyrus columns — already
  modeled), Dendera's painted ceilings, tomb of Nefertari for paint palette.
- **Palette/motifs:** golden limestone, painted sunk relief in ochre, Egyptian
  blue, malachite green, black outlines.
- **Files:** `egypt_stone.jpg`, `band_hieroglyphs.jpg`.
- **Prompt line:** "painted sunk-relief hieroglyphs like the tomb of
  Nefertari, ochre figures with Egyptian blue and green on limestone".

## Kingdoms of Africa (500 BCE – 1600 CE)

- **References:** Great Mosque of Djenné banco walls with toron beams
  (already modeled), Great Zimbabwe's mortarless granite chevron courses,
  Lalibela's carved tuff.
- **Files:** `sahel_banco.jpg`, `band_mudcloth.jpg`.
- **Prompt line:** "hand-plastered banco mud wall of Djenné with rain
  streaks" / "granite chevron pattern coursework like Great Zimbabwe".

## Faith & Living Traditions (1200–1950)

- **References:** Ethiopian church murals (bold flat figures), bogolanfini
  mud cloth (Mali), Kuba raffia geometry (DRC).
- **Files:** `band_mudcloth.jpg` (accurate as bogolan; a Kuba-velvet variant
  with offset knots would suit the last few meters).

---

# Oceania

## Ancient Oceania (28,000 BCE – 1200 CE)

- **References:** Kakadu/Ubirr rock galleries (X-ray style), Gwion Gwion
  figures of the Kimberley — mulberry pigment on orange sandstone.
- **Files:** `cave_rock.jpg` reused; a dedicated "orange Kimberley sandstone
  with dark mineral crusts" texture would separate it from the entrance cave.
- **Prompt line:** "iron-rich orange sandstone rock shelter wall, Kakadu,
  with dark silica skin patches".

## Voyagers of the Pacific (1200–1800)

- **References:** Samoan fale and Māori pātaka construction — plaited
  pandanus panels, sennit-lashed posts; Tongan ngatu (tapa) borders.
- **Palette/motifs:** golden pandanus weave, brown/black tapa geometry,
  coconut-fiber lashing crosses on posts.
- **Prompt (new texture):** "plaited pandanus leaf wall panel, tight golden
  basket weave, Samoan fale interior" and "Tongan ngatu barkcloth border,
  rubbed brown geometric panels on tan".

## Living Traditions (1800–1950)

- **References:** wharenui (Māori meeting house) interiors — red-brown
  carved poupou alternating with woven tukutuku lattice panels, and painted
  kōwhaiwhai rafter scrolls (white/red/black koru spirals).
- **Prompt (new texture):** "kōwhaiwhai rafter pattern, red black and white
  koru scroll band, Māori meeting house" — would make a superb ceiling or
  band strip for the final segment.

---

## Prompt-building cheat sheet

1. Start from the master prompt in `TEXTURE_PROMPTS.md` (seamless, flat,
   evenly lit, square).
2. Insert the reference line from the section above — **naming the real
   building/object** ("like the Alhambra", "Processional Way of Babylon")
   is the single biggest accuracy lever.
3. Add the cel-shade suffix: "clean flat color, evenly lit, subtle painterly
   detail, no baked-in shadows, no photographic noise".
4. For bands: "long horizontal border strip, 4:1, tiles left-to-right".
5. Drop the file into `assets/textures/` under the listed name — the museum
   picks it up automatically; anything missing falls back to the procedural
   version.
