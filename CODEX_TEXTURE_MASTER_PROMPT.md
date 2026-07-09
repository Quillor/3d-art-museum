# Codex Master Prompt — replace ALL textures with photoreal material scans

Work in `3d-art-museum/`. Your job: replace every texture in `assets/textures/`
with **photo-real imagery** that matches each room's era/region, harmonizes in
color within each room and wing, and beats the current procedurally-drawn art.
Update the current files in place (keep exact filenames → zero rewiring). Run a
quality loop and only keep files that pass the gate.

---

## 0. Why the current textures fail (read first)
The existing `.jpg/.png` files were **drawn procedurally** (PIL in
`tools/build_*_assets.py`, and the canvas functions in `js/textures.js`). That is
the root cause of every complaint: stone looks digital and doesn't flow at
building scale, dirt looks like a 1990s game, animals/patterns look like clip-art.

**You cannot fix this by drawing better.** Photorealism comes from **real
photographed material scans**, tiled and color-graded — not from generating shapes
or from AI images that come back as flat/plastic "smears." The one texture the
owner likes (the Native-American adobe wall) works because it reads as a *soft,
photographed natural surface*. Make everything read like that.

**Method priority (in order):**
1. **Source a real, seamless, CC0/public-domain photographic scan** of the actual
   material (see §5 sources). This is the default for every stone/plaster/wood/
   brick/marble/earth/textile/floor surface.
2. If no scan fits, take a **real photo of the real artifact/relief** (Wikimedia
   Commons, museum open-access) and crop/clean it — for figural panels, friezes,
   carvings, seals, masks.
3. AI generation is a **last resort**, only for a motif with no photographic
   source, and only if it passes the photoreal gate (§4). A flat/cartoon/plastic
   AI result is worse than the procedural fallback — skip it and log why.

---

## 1. How textures wire in (don't break this contract)
- Files live flat in `assets/textures/<name>.<ext>`. `js/textures.js` swaps the
  procedural fallback → the file the moment it loads, via `fileTex()` and the
  `TEXTURE_FILES` set. **A wrong/missing filename silently falls back** to
  procedural, so keep names byte-identical to the current files.
- **Keep every existing filename and extension.** Overwrite in place. Because
  they're already in `TEXTURE_FILES` and already wired at their surface, replacing
  the pixels needs **no JS/Blender edits**. Only touch `js/textures.js` (the
  `TEXTURE_FILES` set + one `F(...)`/`fileTex` line) if you add a *new* name — and
  keep the procedural call as the fallback argument.
- Do **not** touch `js/styles.js`, `js/corridor.js`, or `tools/build_*` — those
  belong to the geometry/quality loop. Sample `styles.js` read-only for palette.

### Sizes / aspect / format (match current conventions, from TEXTURE_SPEC.md)
- Walls / floors / ceilings: **1024×1024** (or 2048² for hero walls) `.jpg` q≥90,
  **seamless**.
- Frieze / dado **bands**: **2048×512** (4:1) `.jpg`, seamless horizontally.
- Figural / relief / decal **panels**: `.png` with clean alpha (hard, halo-free
  edge, `alphaTest`-friendly), ~1024 on the long edge.
- Preserve each file's **current extension** (`.jpg` stays `.jpg`, `.png` stays
  `.png`) — the loader derives the path from it.
- Keep a matching `<name>_normal.jpg` in sync **only** where one already exists
  (cave / egypt / meso PBR family). Generate the normal from the *same* albedo.

---

## 2. Reuse via base materials + variants (do this — it guarantees harmony)
Most rooms share a physical material. **Source ONE high-quality base scan per
family, then derive per-room variants** by hue-shift / value / saturation /
crop-scale — never by redrawing. Variants of one scan automatically harmonize.

Build these base scans, then grade each listed file from its base:

| Base scan (source once) | Derived files (tint/scale variants) |
|---|---|
| **Warm carved sandstone** | `egypt_stone`, `egypt_sandstone`, `egypt_floor`, `egypt_frieze`, `khmer_sandstone`, `khmer_stone`, `khmer_floor`, `persia_stone`, `oceania_sandstone` |
| **Cool grey ashlar / limestone** | `inca_andesite`, `inca_stone`, `inca_flagstone`, `gothic_stone`, `gothic_floor`, `pietra_serena`, `meso_stone`, `meso_limestone_floor`, `hub_stone`, `hub_floor` |
| **Polished veined marble** | `greek_marble`, `greek_floor`, `greek_coffer`, `mughal_marble`, `renaissance_floor`, `renaissance_ceiling`, baroque/ottoman marble floors |
| **Soft natural earth plaster / adobe** (the "good" look) | `adobe_wall`, `sahel_banco`, `mudbrick`, `neolithic_wall`, `neolithic_reed`, `islamic_plaster`, `renaissance_plaster`, `kingdoms_wall`, `traditions_wall`, `cave_dirt`, `cave_rock` |
| **Fired / mud brick** | `indus_brick`, `indus_floor`, `glazed_brick` (glazed = brick base + blue glaze grade) |
| **Wood / parquet** | `salon_parquet`, `salon2_parquet`, `baroque_parquet`, `traditions_wood`, `japan_floor`, `china_floor` (walnut vs terracotta vs oak tints) |
| **Woven textile / mat / tapa** | `japan_tatami`, `oceania_floor`, `oceanic_tapa`, `inca_textile`, `adobe_basket`, `amsalon_floor` |
| **Damask / brocade** | `salon_damask`, `salon2_sage_damask`, `baroque_damask` (recolor the same weave) |
| **Paper / screen** | `japan_shoji`, `japan_shoji_paper`, `modern_laylight` |

Log which base each variant came from in the ledger so it's reproducible.
Bands (`band_*`, `amsalon_band`, `kingdoms_band`) and figural PNGs
(`mesopotamia_lamassu`, `persia_guard`, `khmer_apsara`, `meso_deity_mask`,
`neolithic_ochre_figures`, `indus_seal`, `japan_scroll`, `islamic_arabesque`,
`islamic_muqarnas`, `renaissance_fresco`, `egypt_deity_*`) are **motif-specific**
— source each from a real photograph of that culture's actual artifact/relief.

---

## 3. Per-room / per-wing color harmony (hard requirement)
Before grading a file, open its wing's rooms in `js/styles.js` and sample
`S.<key>.wall`, `.band`, `.floor`, `.light.color`, and the concept sheet in
`concept-art/subsections/<slug>/`. Grade the texture to sit **inside that hue and
value range** — same temperature, no clashing saturation. Every texture in one
room must share a palette; every room in a wing must share a family:

- **Africa / Egypt** — warm sandstone, ochre, lapis-blue + gold accents.
- **Middle East** (Mesopotamia, Persia, Islamic, Ottoman, Neolithic) — warm
  limestone/plaster, lapis, turquoise, gold.
- **Asia** (Indus, China, Japan, Khmer, Mughal, SE) — warm sandstone + lacquer
  red, jade, natural wood, off-white paper.
- **Americas** (Inca, Meso, Native North, 19c) — grey andesite/limestone, warm
  adobe, natural-dye textile reds/ochres.
- **Oceania** — honey pandanus, tapa browns, weathered rock.
- **Europe** (Classical, Medieval/Gothic, Renaissance, Baroque, salons, Modern) —
  cool marble & pietra serena → warm gilt/walnut/damask in the salons.

Reject anything too saturated, too bright, wrong temperature, or that fights the
room's wall/light color. When unsure, pull saturation and brightness **toward**
the room's existing wall hue.

---

## 4. Quality gate — per file, ALL must pass before you keep it
Run this loop on every single file. A downgrade is worse than the fallback.
1. **Seamless** — tile 3×3 and inspect: no visible seam, no repeating hero blob/
   hotspot. Walls, floors, bands must tile cleanly.
2. **Photoreal** — reads as a *photographed real material or carving*: real grain,
   real lighting, real depth. Reject flat/vector/cartoon/clip-art/plastic-AI-smear.
   Relief & figural panels must show real carved depth + directional shadow, not a
   printed drawing.
3. **Natural structure & scale** — stone courses/joints flow at architectural
   scale and orientation (not tiny random pebbles blown up); mortar lines are
   plausible for a real wall; earth/dirt looks like real ground, not noise dots.
4. **Palette-harmonized** — passes §3 against the room's `S.<key>` hues + wing.
5. **Era/motif-accurate** — matches the named culture and its concept sheet; no
   anachronistic or generic filler; figural panels depict the correct artifact.
6. **Format/aspect/alpha** — correct size & aspect; jpg q≥90 opaque; png alpha
   clean & halo-free; `_normal` regenerated where one already exists.

Automate what you can: write a small script to (a) montage each texture 3×3 to a
`review/` PNG for the seam check, and (b) sample its mean hue/value and compare to
the room's `S.<key>` color, flagging out-of-range files. Eyeball the montages.

**Loop:** generate/source → gate → if any check fails, fix (re-source, re-tile,
re-grade) and re-gate → only then overwrite the file → log PASS. Never batch-accept.

---

## 5. Reference sources (real photographic material — use these first)
- **Seamless PBR/material scans (CC0):** Poly Haven, ambientCG, cgbookcase,
  ShareTextures, Textures.com free tier — for stone, marble, plaster, adobe,
  brick, wood, parquet, terracotta, fabric, tatami, reed.
- **Real artifacts / reliefs / friezes (public domain):** Wikimedia Commons and
  open-access museum collections (The Met, British Museum, Getty, Rijksmuseum,
  Cleveland, Smithsonian) — for figural panels, seals, masks, friezes, frescoes,
  rock art, textiles. This project already resolves Commons images
  (`tools/resolve_images.py`); reuse that pattern for provenance.
- Match the **specific** culture/site, not a generic look: Egypt→Karnak hypostyle
  sandstone; Inca→Sacsayhuamán polygonal ashlar; Khmer→Angkor sandstone lintels;
  Greek→Pentelic marble + Parthenon frieze; Persia→Persepolis limestone reliefs;
  Mesopotamia→glazed-brick Ishtar Gate / Lamassu; Islamic→zellij + muqarnas;
  Japan→tatami/shoji/lacquer; Native North→coiled basketry & soft adobe.
- Respect licenses: prefer CC0/public-domain; keep a `review/SOURCES.md` with each
  file's source URL + license. No watermarked or all-rights-reserved images.

---

## 6. Workflow, batching, logging (anti-degradation)
- Work **one wing at a time** so a wing's textures harmonize as a set; gate the
  whole small batch together and regenerate any sibling that drifts.
- Do the **base scans first**, then derive that base's variants in the same pass.
- If using any AI generation, generate **1–3 per fresh session**, then stop and
  gate; the moment quality drops (softer/flatter/off-palette), start a clean
  session and re-paste this prompt. Never push a tired context to "finish the list."
- Keep a running ledger (`review/TEXTURE_LEDGER.md`): per file — base used,
  source URL/license, PASS/REJECT, and the reason. A resumed session must be able
  to tell exactly what's done. If a file can't beat its procedural fallback,
  **leave the fallback and log SKIP** — do not ship a downgrade.
- Coordination: only write under `assets/textures/`, `review/`, and (for new names
  only) the `TEXTURE_FILES` set + single wiring line in `js/textures.js`. Commit
  per file or per small batch with the room name in the message. Don't run while a
  `QUALITY_LEDGER.md` row is `IN-PROGRESS`; otherwise use an isolated worktree.

## 7. Definition of done
Every file in `assets/textures/` has been re-gated; each is either replaced with a
photoreal, seamless, palette-harmonized, era-accurate scan that passes §4, or
explicitly logged SKIP (fallback kept) with a reason. `review/TEXTURE_LEDGER.md`
and `review/SOURCES.md` are complete. No filenames changed except documented new
additions. The museum renders with real-material textures that flow at building
scale and harmonize per room and per wing.

---

## APPENDIX A — per-texture manifest (era · what it depicts · reference)
This is the source-of-truth for **what each file is**. Before sourcing a file,
also open its room's concept sheet in `concept-art/subsections/<slug>/Hallway-*.png`
and `S.<key>` in `styles.js` — the manifest names the culture/reference; the
concept sheet + palette settle the exact color and motif. `base` = which §2 base
scan to grade from (`—` = motif-specific, source its own real photo).

### Prehistoric / Cave (slug: prehistoric)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `cave_rock` | wall | Paleolithic cave wall — damp limestone cave surface, uneven calcite | earth/stone |
| `cave_dirt` | floor | packed cave-floor earth, trampled clay + ash, small pebbles (NOT noise dots) | earth |
| `neolithic_ochre_figures.png` | panel | Paleolithic rock art — red-ochre/charcoal animals & hand stencils (Lascaux/Chauvet/Altamira). Real cave-painting photos on transparent bg; this is the "animal" that currently looks like clip-art | — |

### Middle East (slugs: middle-east-neolithic/-mesopotamia/-persia/-islamic/-modern)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `neolithic_wall` | wall | Çatalhöyük Neolithic — smoothed warm mud-plaster wall | earth-plaster |
| `neolithic_reed` | wall/floor | pressed-reed / reed-bundle impression in clay | earth-plaster |
| `mudbrick` | wall | sun-dried mudbrick courses, Mesopotamian | brick |
| `glazed_brick` | wall | Ishtar Gate — deep-blue glazed fired brick, molded relief | brick + blue glaze |
| `band_ishtar` | band 4:1 | Ishtar Gate striding-lion / aurochs glazed relief frieze | — |
| `mesopotamia_lamassu.png` | panel | Assyrian lamassu (winged human-headed bull), Persepolis/Nimrud limestone relief | — |
| `mesopotamia_procession.png` | panel | Assyrian/Babylonian procession relief, carved limestone | — |
| `persia_stone` | wall | Persepolis — pale carved limestone ashlar | sandstone (cool grade) |
| `persia_floor` | floor | Persepolis limestone paving | sandstone |
| `persia_guard.png` | panel | Achaemenid "Immortals" guard relief (Susa glazed-brick or Persepolis stone) | — |
| `persia_wingdisk.png` | panel | Faravahar / Achaemenid winged-disk, carved limestone | — |
| `band_archers` | band 4:1 | Susa glazed-brick archer frieze (Louvre) | — |
| `islamic_plaster` | wall | carved/whitewashed Islamic stucco wall | earth-plaster |
| `islamic_zellij` | wall/floor | Moroccan zellij mosaic tilework, geometric | — (real zellij photo) |
| `islamic_floor` | floor | glazed geometric tile floor | — |
| `islamic_muqarnas` | ceiling | muqarnas honeycomb vaulting, carved/painted stucco | — |
| `islamic_arabesque.png` | panel | pierced arabesque screen / stucco tracery, alpha | — |
| `band_zellige` / `band_iznik` | band 4:1 | zellij star-band / İznik floral tile band | — |
| `ottoman_iznik` | wall | İznik tile wall — cobalt/turquoise/coral floral on white | — |
| `mughal_marble` | wall/floor | Taj/Mughal white marble with pietra-dura inlay | marble |

### Africa (slugs: africa-egypt/-kingdoms/-traditions)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `egypt_sandstone` / `egypt_stone` | wall | Karnak hypostyle — warm sandstone ashlar, sun-bleached | sandstone |
| `egypt_floor` | floor | temple sandstone paving | sandstone |
| `egypt_frieze` | band 4:1 | painted sunk-relief hieroglyph register | — |
| `band_hieroglyphs` | band 4:1 | hieroglyph register, painted relief | — |
| `egypt_deity_l` / `egypt_deity_r.jpg` | panel | tomb-wall deity figures (Horus/Anubis), Egyptian painted relief | — |
| `egypt_jamb` | panel | doorway jamb with vertical hieroglyph column | — |
| `kingdoms_wall` | wall | West African / Great Zimbabwe dressed-stone or earthen wall | earth-plaster/stone |
| `kingdoms_floor` | floor | matching packed-earth or stone floor | earth |
| `kingdoms_band` | band 4:1 | Benin bronze plaque OR Kuba geometric band | — |
| `sahel_banco` | wall | Sahel/Djenné banco (mud) mosque wall, hand-smoothed adobe with torons | earth-plaster |
| `band_mudcloth` | band 4:1 | Malian bogolan (mud-cloth) geometric textile | textile |
| `adobe_painted_frieze` | band 4:1 | painted earthen frieze | — |
| `traditions_wall` | wall | African vernacular — smoothed earth/plaster, warm | earth-plaster |
| `traditions_floor` | floor | packed earth floor | earth |
| `traditions_wood` | wall/prop | carved dark hardwood (masks/posts) | wood |

### Asia (slugs: asia-indus/-china/-japan/-southeast(khmer)/-mughal)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `indus_brick` | wall | Harappa/Mohenjo-daro fired-brick courses, precise | brick |
| `indus_floor` | floor | Indus baked-brick paving | brick |
| `indus_seal.png` | panel | Indus steatite seal (unicorn/bull + script), carved | — |
| `china_lacquer` | wall/prop | Chinese cinnabar-red carved lacquer | wood/lacquer (red) |
| `china_floor` | floor | glazed terracotta or grey stone temple floor | wood/stone |
| `japan_shoji` / `japan_shoji_paper` | wall | shoji screen — washi paper over wood lattice, backlit | paper |
| `japan_tatami` | floor | tatami mat — woven rush with cloth border | textile |
| `japan_floor` | floor | worn hinoki wood plank floor | wood |
| `japan_scroll.png` | panel | ink-wash / kakemono hanging scroll painting, alpha | — |
| `khmer_sandstone` / `khmer_stone` | wall | Angkor — weathered warm-grey sandstone, lichen | sandstone |
| `khmer_floor` | floor | Angkor sandstone paving | sandstone |
| `khmer_lintel_relief` | panel/band | Angkor lintel — Kala face + foliage, deep carving | — |
| `khmer_apsara.png` | panel | Angkor apsara bas-relief, sandstone, alpha | — |

### Americas (slugs: americas-andes/-mesoamerica/-native-north/-19th-century/-modern)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `inca_andesite` / `inca_stone` | wall | Sacsayhuamán/Cusco polygonal megalithic ashlar, tight joints | grey ashlar |
| `inca_flagstone` | floor | Inca fitted-stone paving | grey ashlar |
| `inca_textile` | panel/band | Andean tocapu weaving — natural-dye reds/ochres/black geometric | textile |
| `meso_stone` | wall | Maya/Aztec limestone temple block | grey ashlar (warm) |
| `meso_limestone_floor` | floor | Mesoamerican limestone plaza paving | grey ashlar |
| `meso_greca_carved` | band 4:1 | Mitla-style stepped-fret (greca) carved stone mosaic | grey ashlar |
| `band_greca` | band 4:1 | stepped-fret greca band | — |
| `meso_deity_mask.png` | panel | Aztec/Maya turquoise-mosaic or jade deity mask, alpha | — |
| `adobe_wall` | wall | Ancestral Puebloan / SW adobe — soft warm mud plaster (**the reference "good" look**) | earth-plaster |
| `adobe_basket.png` | panel | Native coiled basketry weave, natural fiber, alpha | textile |
| `amsalon_wall` / `amsalon_floor` / `amsalon_band` | wall/floor/band | American 19th-c salon — warm papered wall, parquet, picture-rail band | wood / plaster |

### Oceania (slugs: oceania-ancient/-voyagers/-living)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `oceania_sandstone` | wall | weathered Pacific/Aboriginal rock-shelter sandstone | sandstone |
| `oceania_floor` | floor | pandanus plaited mat, honey tone | textile/weave |
| `oceanic_tapa` | wall/panel | Polynesian tapa (barkcloth) — brown geometric stamped motifs | textile |

### Europe (slugs: europe-classical/-medieval/-renaissance/-baroque/-impressionism/-modern)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `greek_marble` | wall | Pentelic white marble, faint warm veining | marble |
| `greek_floor` | floor | marble slab paving | marble |
| `greek_coffer` | ceiling | coffered marble ceiling, recessed panels | marble |
| `band_meander` | band 4:1 | Greek key / meander frieze, marble relief | — |
| `gothic_stone` | wall | Gothic cathedral — cool grey limestone ashlar | grey ashlar |
| `gothic_floor` | floor | worn stone/tile cathedral floor | grey ashlar |
| `window_lancet` | panel | Gothic stained-glass lancet window (backlit), alpha/emissive | — |
| `pietra_serena` | wall/trim | Florentine pietra serena — blue-grey sandstone (Brunelleschi trim) | grey ashlar |
| `renaissance_plaster` | wall | warm intonaco lime-plaster wall | earth-plaster |
| `renaissance_floor` | floor | terracotta cotto tile OR inlaid marble | wood(terracotta)/marble |
| `renaissance_ceiling` | ceiling | coffered/painted Renaissance ceiling | marble/wood |
| `renaissance_fresco.png` | panel | Italian fresco figures (Raphael/Masaccio), alpha | — |
| `baroque_wall` | wall | Baroque — rich painted/marbled wall | plaster/marble |
| `baroque_damask` | wall | crimson/gold Baroque silk damask | damask |
| `baroque_parquet` | floor | Versailles parquet de Versailles, walnut | wood (walnut) |
| `baroque_ceiling_fresco` | ceiling | illusionistic quadratura sky fresco + gilt | — |
| `salon_wall` | wall | 19th-c salon papered/painted wall | plaster |
| `salon_damask` | wall | salon silk damask (warm) | damask |
| `salon_parquet` / `salon2_parquet` | floor | herringbone/point-de-Hongrie parquet, oak/walnut | wood |
| `salon2_sage_damask` | wall | impressionist salon — sage-green damask | damask (sage) |

### Hub / Modern (slugs: -modern, central hub)
| file | kind | era/culture · what it depicts · reference | base |
|---|---|---|---|
| `hub_stone` | wall | neutral museum-hub dressed stone | grey ashlar |
| `hub_floor` | floor | museum terrazzo or stone paving | grey ashlar |
| `modern_wall` | wall | white-cube gallery plaster wall | plaster |
| `modern_floor` | floor | polished concrete or pale oak | wood/stone |
| `modern_terrazzo` | floor | terrazzo — aggregate chips in matrix | — |
| `modern_laylight` | ceiling | frosted-glass laylight / skylight diffuser (emissive) | paper/glass |

> If a filename appears in `assets/textures/` but not above, infer era from its
> prefix (matches a slug/`S.<key>`), confirm against its concept sheet, and add a
> manifest row before sourcing. Log any additions in `review/TEXTURE_LEDGER.md`.
