# TEXTURE SPEC — Art Museum architectural improvement pass

Detailed spec of every texture the newly-improved rooms would benefit from, so a
single texture pass can be done in one go. **All 23 target rooms were improved
with geometry + procedural (canvas) textures only — none of the textures below
are required to run; each lists the procedural fallback already in place.** This
is the polish list.

## How the rooms are built (context for the texture artist)
Each era wing segment is styled by `S.<key>` in `js/styles.js`, decorated by a
`build<Room>Decor` in `js/corridor.js`, and its distinctive geometry comes from a
Blender kit `assets/models/<room>.glb` (built by `tools/build_<room>_assets.py`).
JS assigns materials by **mesh-name prefix** (e.g. `Relief*`, `Zellij*`, `Fret*`).
Where a texture below targets a named mesh, the artist swaps the material's `map`
in the corresponding `apply<Room>Mats` (or the procedural canvas function).

Conventions to follow (match existing `assets/textures/`):
- Seamless tiles: **1024²** jpg (walls/floors), tiling via `wallUV`/`floorUV`/`uvLen`.
- Bands/friezes: **2048×512** (4:1) jpg, `uvLen` = 4×height.
- Relief / figural / decal panels: **png** if they need alpha (rock-art decals,
  pierced screens); otherwise jpg. Add `_normal` for carved depth on
  `MeshStandardMaterial` surfaces (only the cave/egypt/meso PBR family use it).
- Star/geometric tiles: square, seamless, ~2.3 `uvLen`.
- Priorities: **P0** signature surface that most elevates the room · **P1**
  clearly improves fidelity · **P2** nice-to-have. (No P0s exist — procedural
  fallbacks already carry every signature; these are all P1/P2 upgrades.)

Global loaders: `albedoTex()` (repeat/sRGB/aniso) already exists for band strips;
new files drop into `assets/textures/` and are wired the same way as egypt/kingdoms.

---

## GENERATION WORKFLOW + QUALITY GATE (read before making any texture)

**Why this matters:** image models (ChatGPT / DALL·E, Midjourney, SD, etc.)
degrade badly as a chat fills up — later images in a long session come back flat,
desaturated, low-detail, off-brief, or with drifting colors. Treat every texture
as *provisional until it passes the quality gate below*. Do NOT batch-accept.

### Anti-degradation rule (generate in small batches)
- Generate **1–3 textures per fresh session**, then STOP and run the quality gate.
- The moment output quality drops (softer, flatter, wrong palette, ignoring the
  prompt) → **start a brand-new chat/session** and re-paste the full prompt +
  conventions. Never keep pushing a tired context to "just finish the list."
- Do rooms **one wing at a time**; a wing's textures must harmonize as a set, so
  generate + gate them together, then move on. Regenerate the whole small batch
  if one comes back inconsistent with its siblings.
- Keep a scratch log of accepted/rejected per file so a resumed session knows
  exactly where it left off (context-loss insurance).

### Per-texture LOOP — do not place a file until ALL checks pass
1. **Generate** at the target resolution/aspect with the room's prompt + the
   conventions block (resolution, seamless, orthographic, "no text/watermark").
2. **Inspect at 100% AND tiled 3×3** (walls/floors/bands must be seamless — no
   visible seam, no repeating hero blob). Reject if a seam or obvious repeat shows.
3. **Photorealism check** — must read as a *photographed real material/carving*,
   not a cartoon, flat vector, clip-art, or over-smooth AI blur. Reject flat/
   plasticky/"illustrated" results. Relief/figural panels must show real carved
   depth + directional shadow, not a printed drawing.
4. **Color-harmony check** — hold it against (a) the room's concept sheet in
   `concept-art/subsections/<room>/`, and (b) the room's existing palette:
   sample `S.<key>.wall`/`band`/`light.color` in `styles.js` and keep the new
   texture within that hue/value range. It must also sit in the **wing's** family
   (e.g. Middle-East = warm limestone + lapis/gold; Europe salon = warm gilt).
   Reject anything that clashes (too saturated, wrong temperature, too bright).
5. **Era/motif accuracy** — matches the culture named in the room brief (see AD +
   prompt per entry); no anachronistic or generic filler.
6. **Format/alpha** — png with clean alpha for decals/pierced screens/relief cut-
   outs (no white halo, `alphaTest`-friendly hard edge); jpg (quality ≥90) for
   opaque tiles; matching `_normal` map generated from the same albedo where the
   entry calls for it.
7. **Only after 1–6 pass:** export to the correct path (below) and verify in-app.

### Export location + in-app verification (get the file in the right place)
- **Save every runtime texture to `3d-art-museum/assets/textures/<slug>.jpg|png`**
  (flat folder, exact slug from this spec — the loaders resolve by name). PBR sets
  that mirror the prehistoric/egypt kit live in a room subfolder
  `assets/textures/<room>/` only if that room's material loads from there; the
  default is the flat folder. Do **not** leave finals in `concept-art/…/textures/`
  (that folder is source/reference only).
- Keep runtime files small: **1024²** (bands 2048×512). If the source is 2K, down-
  size the shipping copy; keep pngs only where alpha is needed.
- Wire it: point the material's `map`/canvas function at the file via `albedoTex()`
  / `fileTex()` (which already fall back to the procedural texture if the file is
  missing — so a bad/rejected file can be deleted to instantly revert).
- **Verify in the running app, don't trust the thumbnail:** reload the edited JS
  module with `await fetch(url,{cache:'reload'})` then reload the page (HEURISTIC
  module cache serves stale code otherwise), teleport into the room (see the
  preview-testing gotcha in memory / `room-architecture-kits`), screenshot, and
  compare side-by-side with the concept sheet. If it reads worse than the
  procedural fallback in situ, reject and regenerate. Re-check color harmony
  *under the room's actual warm/cool lighting*, not just on white.

### Batch exit gate (before moving to the next wing)
- All of the wing's textures placed, seamless, photoreal, and harmonized **as a
  set** in a single in-app walk-through screenshot.
- No console errors/warnings after reload (a missing/misnamed file logs a
  `[models]`/loader warning and silently falls back).
- Walk the wing centerline (still 0-blocked) — textures never change collision,
  but confirm nothing regressed.

---

## AMERICAS wing

### Mesoamerica — `meso.glb` (Portal, Pier, Bench, Beam)
- **meso_deity_mask.png** — P1 — deity-mask relief on the portal lintel
  (`Dark_mask` mesh in applyMesoMats). ~1024×768, non-tiling, jpg (+`_normal` for
  carved depth). AD: Zapotec/Aztec stone deity mask, deep relief, warm bronze-brown
  limestone. Prompt: *"carved Mesoamerican stone deity mask relief, Zapotec temple
  lintel, deep shadowed fretwork, weathered bronze-brown limestone, orthographic,
  seamless edges, museum photo."* Fallback: flat dark stone.
- **meso_greca_carved.jpg** — P2 — step-fret (greca) on `Fret*` pier/jamb/head
  strips. 512×512 seamless (+`_normal`). AD: recessed Mitla step-fret, red-ochre in
  the grooves. Fallback: procedural `grecaBand` (works well).
- Reused (no work): `meso_stone` walls, `stoneFloor`.

### Andes — `inca.glb` (Portal trapezoid, Niche trapezoid)
- **inca_andesite.jpg** — P1 — cool-grey polygonal ashlar for walls + portal +
  niches (`S.inca.wall`, `Stone*`). 1024² seamless (+`_normal` for bevelled
  dry-fit seams). AD: Inca/Tiwanaku dry-fit andesite, tight irregular polygonal
  blocks, cool grey, subtle bevels. Prompt: *"Inca dry-stone andesite ashlar wall,
  tightly fitted irregular polygonal blocks, cool grey, bevelled joints, seamless,
  photoreal."* Fallback: `inca_stone` (reads warm under warm light).
- **inca_textile.png** — P2 — woven Andean runner in the niche (`Textile_runner`).
  512×768, jpg. AD: Wari/Inca tocapu geometric weaving, red/ochre/black. Fallback:
  flat red.
- **inca_flagstone.jpg** — P2 — irregular slab floor (`S.inca.floor`). 1024²
  seamless. Fallback: `stoneFloor` (regular).

### Native North America — `adobe.glb` (Portal, Niche arched, Viga)  ·  also used by Neolithic
- **adobe_painted_frieze.jpg** — P2 — stepped mineral-pigment band (`Paint_band` +
  `S.adobe.band`). 2048×512 seamless. AD: Pueblo stepped/zigzag mineral pigment,
  rust-red / ochre / black on plaster. Fallback: procedural `triangleBand`.
- **adobe_basket.png** — P2 — woven basket disc on walls. 512² round motif. AD:
  coiled fiber basket, geometric bands. Fallback: procedural `weave`.

### Modern (SHARED americas/europe/asia/mideast) — `modern.glb` (Portal deco, Rail)
- **modern_terrazzo.jpg** — P1 — terrazzo floor with an inlaid dark border
  (`S.modern.floor`). 1024² seamless. AD: pale poured terrazzo, fine aggregate
  fleck, thin brass/dark inlay border strip. Prompt: *"pale terrazzo floor, fine
  marble aggregate on cream, subtle, seamless, top-down, museum."* Fallback:
  `modern_floor` concrete.
- **modern_laylight.jpg** — P2 — frosted-glass gradient for the skylight panel.
  512² soft white gradient. Fallback: flat emissive (works).

---

## ASIA wing

### Indus Valley — `indus.glb` (Portal timber-lintel, Niche, Pier, Plaque, Beam)
- **indus_seal.png** — P1 — Harappan seal motifs on the `Plaque_field`. 512²,
  one motif per tile, jpg. AD: Indus Valley steatite seal — unicorn/bull + script,
  terracotta relief. Prompt: *"Indus Valley Harappan seal relief, unicorn and
  pictographic script, carved terracotta, orthographic, square."* Fallback:
  procedural concentric-square canvas.
- **indus_brick.jpg** — P2 — finer fired-brick (`S.indus.wall`). 1024² seamless
  (+`_normal`). Fallback: shared `mudbrick`.

### Southeast Asia (Khmer) — `khmer.glb` (Portal, Pilaster colonnette, Relief, Beam)
- **khmer_apsara.png** — P1 — carved apsara/deva relief for `Relief_field` and
  portal jamb panels. 512×1024 (+`_normal`). AD: Angkor Wat apsara bas-relief,
  celestial dancer, weathered sandstone, low relief. Prompt: *"Angkor Wat apsara
  bas-relief, standing celestial dancer, carved weathered sandstone, low relief,
  orthographic, seamless top/bottom."* Fallback: procedural apsara silhouette.
- **khmer_lintel_relief.png** — P1 — Angkor lintel/pediment scene (`Deity_lintel`,
  `Deity_pediment`). 2048×512 (lintel) + ~1024² (pediment). AD: Khmer narrative
  lintel, kala mask + foliate scroll. Fallback: procedural relief.

### Japan — `japan.glb` (Portal+ranma, Tokonoma, Lantern, Post, Beam)
- **japan_scroll.png** — P2 — sumi-e hanging scroll (`Scroll_kake`). 384×960. AD:
  ink-wash landscape (mountains, pine), cream silk, red seal. Fallback: procedural
  ink-wash canvas.
- **japan_tatami.jpg** — P2 — woven tatami (`Tatami_platform`, floor zones). 512²
  seamless. Fallback: flat straw green.
- **japan_shoji.jpg** — P2 — warm washi paper w/ grain for backlit clerestory.
  Fallback: flat emissive (works).

---

## EUROPE wing

### Classical Antiquity (Greek) — `greek.glb` (Portal pediment, Aedicula, Sconce)
- **greek_coffer.jpg** — P2 — painted coffer field w/ rosette for the ceiling
  (JS `coffer` material). 512² seamless. AD: polychrome Greek coffer, blue field,
  gilt rosette, meander border. Fallback: flat blue + procedural gilt rosettes.
- **greek_frieze.png** — P2 — polychrome figural frieze (`Poly_frieze`). 2048×512.
  AD: Panathenaic procession, red/ochre/blue on cream. Fallback: flat red.
- Reused: `greek_marble`, `checkerFloor`, procedural `meanderBand` (floor + wall).

### Renaissance — `renaissance.glb` (Portal round-arch, Pilaster, Aedicula)
- **renaissance_fresco.png** — P1 — grotesque/candelabra fresco (`Fresco*` fields
  + wall frieze). 512×1024. AD: Raphael-loggia grotesque, candelabra scroll +
  medallion, muted fresco on cream. Prompt: *"Renaissance grotesque fresco panel,
  symmetric candelabra arabesque, central medallion, faded secco on cream plaster,
  orthographic."* Fallback: procedural grotesque canvas.
- **renaissance_herringbone.jpg** — P2 — terracotta herringbone floor. 1024²
  seamless. Fallback: `woodFloor` (planks).
- **pietra_serena.jpg** — P2 — grey sandstone for pilasters/portal (`Pietra*`).
  1024² seamless. Fallback: flat grey.

### Baroque — `baroque.glb` (Portal+crest, Chandelier, Sconce, Cartouche)
- **baroque_ceiling_fresco.jpg** — P1 — painted vault fresco in the coffer/ceiling
  field. 1024² (or 2:1). AD: illusionistic sky w/ cherubs in a gilt cartouche
  frame, warm. Fallback: `coffered` texture.
- **baroque_marble_floor.jpg** — P2 — polychrome marble w/ inlay medallion. 1024².
  Fallback: flat gilt/red discs.
- Reused: `baroque_wall` (red damask).

### Rococo/Romantic salon — `salon.glb` (Portal+crest, Sconce, Drape, Medallion)
- **salon_damask.jpg** — P2 — deep-red flocked damask (`S.salon.wall`). 1024²
  seamless, small repeat (`wallUV` 3). AD: crimson silk damask, acanthus.
  Fallback: flat red plaster.
- **salon_parquet.jpg** — P2 — herringbone parquet. 1024² seamless. Fallback:
  `woodFloor`.

### Impressionism (salon2) — reuses `salon.glb` portal, cream palette
- **salon2_sage_damask.jpg** — P2 — pale sage subtle damask (`S.salon2.wall`).
  1024² seamless. Fallback: flat sage.
- **salon2_parquet.jpg** — P2 — herringbone parquet. Fallback: `woodFloor`.

---

## MIDDLE EAST wing

### Neolithic — reuses `adobe.glb` (Viga, Niche, Portal), mudbrick palette
- **neolithic_ochre_figures.png** — P2 — symbolic ochre wall motifs (bulls,
  hunters). 1024×512 alpha decals. AD: Çatalhöyük wall painting, ochre bull +
  running figures, faded. Fallback: procedural `triangleBand`.
- **neolithic_reed.jpg** — P2 — reed-matting ceiling. 512² seamless. Fallback:
  `weave`.

### Mesopotamia — `mesopotamia.glb` (Portal crenellated, Relief, Merlon)
- **mesopotamia_lamassu.png** — P1 — winged-bull guardian glazed relief
  (`Relief_lamassu*`). 512×768 (+`_normal`). AD: Ishtar-gate lamassu, molded
  glazed brick, lapis + ochre. Prompt: *"Babylonian lamassu winged-bull guardian,
  glazed molded brick relief, lapis blue and gold ochre, orthographic."* Fallback:
  procedural silhouette.
- **mesopotamia_procession.png** — P1 — Assyrian procession figure (`Relief_field`
  on corridor panels). 512×768. Fallback: procedural.
- **glazed_brick.jpg** — P2 — real lapis+ochre glazed brick (`Glaze`, `Band`).
  1024² seamless. Fallback: procedural `glazedBand`.

### Persia — `persia.glb` (Portal Apadana+bull columns, Relief, Beam)
- **persia_guard.png** — P1 — Achaemenid guard/tribute-bearer limestone relief
  (`Relief_field`, portal `Relief_guard*`). 512×1024 (+`_normal`). AD: Persepolis
  Immortal, robed profile with spear, low relief limestone. Prompt: *"Persepolis
  Achaemenid guard relief, robed profile figure with spear, carved limestone, low
  relief, orthographic, seamless top/bottom."* Fallback: procedural guard.
- **persia_wingdisk.png** — P2 — Faravahar winged disk (`Gold_wingdisk`/`Gold_wing`).
  1024×512, gold. Fallback: gold geometry.

### Islamic Golden Age — `islamic.glb` (Portal pointed-arch, Muqarnas, Mashrabiya, Lantern)
- **islamic_arabesque.png** — P1 — carved stucco arabesque (`Arabesque*` panels,
  portal tympanum/frieze). 512² seamless (+`_normal`). AD: Alhambra carved plaster
  arabesque, interlacing vine + calligraphy, cream. Prompt: *"Alhambra carved
  stucco arabesque panel, deep interlacing vinework and kufic band, cream plaster,
  seamless, orthographic."* Fallback: procedural `starTile` (cream/gold).
- **islamic_zellij.jpg** — P2 — real zellige mosaic (`Zellij*` dado/panels,
  floor medallion). 512² seamless. Fallback: procedural `starTile`.
- **islamic_muqarnas.jpg** — P2 — painted muqarnas cells (`Muqarnas` part). 512².
  Fallback: flat stucco.

### Ottoman/Safavid — reuses `islamic.glb`, Iznik palette
- **ottoman_iznik.jpg** — P1 — Iznik floral tile (`Zellij*` dado, `Arabesque*`).
  512² seamless. AD: Iznik ceramic — cobalt + tomato-red tulips/carnations/saz
  leaves on white. Prompt: *"Iznik ceramic tile, cobalt blue and tomato red tulips
  and carnations on white, seamless, top-down, museum."* Fallback: procedural
  `starTile` (white/red/blue).
- **ottoman_dome.jpg** — P2 — painted half-dome arabesque. Fallback: none needed.

---

## OCEANIA wing

### Ancient Oceania (rockshelter) — decor only (no GLB); reuses prehistoric ochre atlas
- **oceania_rockart.png** — P1 — ochre hand stencils + x-ray fauna decals (JS
  `hands`/`animal` materials, alphaTest). 1024² atlas w/ alpha. AD: Arnhem-Land
  rock art, ochre hand stencils + x-ray kangaroo/fish/turtle, red/white on rock.
  Prompt: *"Aboriginal Australian rock art, ochre hand stencils and x-ray style
  kangaroo and fish, red and white pigment on sandstone, transparent background,
  decal atlas."* Fallback: reused prehistoric `ochre_atlas.png` hands + procedural
  animal.
- **oceania_sandstone.jpg** — P2 — layered-strata sandstone (`S.rockshelter.wall`
  + ceiling). 1024² seamless (+`_normal`). Fallback: `cave_rock`.

### Oceania Voyagers/Living (SHARED) — `oceanic.glb` (Portal lashed-beam, Post, Sconce)
- **oceanic_navstar.png** — P2 — navigation star-chart / stick-chart screen
  (`Star*` screens). 512×1024, ocean-blue + gold stars, emissive-friendly. AD:
  Micronesian stick chart / Polynesian star compass, glowing constellations on
  deep blue. Fallback: procedural `navStar` canvas.
- **oceanic_tapa.png** — P2 — carved-post tapa / kōwhaiwhai pattern for `Post`/
  carved timber. 512² seamless. Fallback: flat dark timber.
- **oceanic_pandanus.jpg** — P2 — finer woven pandanus (`Weave`/walls). Fallback:
  `weave`.

---

## NET-NEW FILE CHECKLIST (flat)

> Run each file through the **GENERATION WORKFLOW + QUALITY GATE** above:
> generate in small batches (fresh session when quality dips), gate for
> photorealism + seamlessness + color harmony with the room/wing, then export to
> `3d-art-museum/assets/textures/<slug>` and verify in the running app before
> ticking the box.


**P1 (highest impact — 12 files, mostly relief/figural):**
- [ ] meso_deity_mask.png (+_normal)
- [ ] inca_andesite.jpg (+_normal)
- [ ] modern_terrazzo.jpg
- [ ] indus_seal.png
- [ ] khmer_apsara.png (+_normal), khmer_lintel_relief.png
- [ ] renaissance_fresco.png
- [ ] baroque_ceiling_fresco.jpg
- [ ] mesopotamia_lamassu.png (+_normal), mesopotamia_procession.png
- [ ] persia_guard.png (+_normal)
- [ ] islamic_arabesque.png (+_normal)
- [ ] ottoman_iznik.jpg
- [ ] oceania_rockart.png (alpha atlas)

**P2 (polish):** meso_greca_carved · inca_textile · inca_flagstone ·
adobe_painted_frieze · adobe_basket · modern_laylight · indus_brick ·
khmer_sandstone · japan_scroll · japan_tatami · japan_shoji · greek_coffer ·
greek_frieze · renaissance_herringbone · pietra_serena · baroque_marble_floor ·
baroque_damask · salon_damask · salon_parquet · salon2_sage_damask ·
salon2_parquet · neolithic_ochre_figures · neolithic_reed · glazed_brick ·
persia_wingdisk · islamic_zellij · islamic_muqarnas · ottoman_dome ·
oceania_sandstone · oceanic_navstar · oceanic_tapa · oceanic_pandanus

**Reused as-is (no work):** meso_stone, stoneFloor, mudbrick, khmer_stone,
japan_shoji/floor, greek_marble, checkerFloor, renaissance_ceiling/floor,
baroque_wall, cave_rock, cave_dirt, weave, woodFloor, plus all procedural
generators in `js/textures.js` (grecaBand, triangleBand, starTile, glazedBand,
meanderBand, weave, shoji, coffered) which remain the shipping fallbacks.
