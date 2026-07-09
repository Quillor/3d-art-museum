# Texture Pass Log

Source request: architecture improvement texture polish list.

## Accepted runtime texture copies

These were sourced from existing concept-art texture packages, resized to the
runtime target, placed in `assets/textures/`, and wired into the app:

- `adobe_painted_frieze.jpg`
- `adobe_basket.png`
- `baroque_damask.jpg`
- `baroque_parquet.jpg`
- `glazed_brick.jpg`
- `greek_coffer.jpg`
- `indus_floor.jpg`
- `islamic_floor.jpg`
- `islamic_muqarnas.jpg`
- `inca_andesite.jpg`
- `inca_flagstone.jpg`
- `inca_textile.jpg`
- `indus_brick.jpg`
- `indus_seal.png`
- `islamic_arabesque.png`
- `islamic_zellij.jpg`
- `japan_shoji_paper.jpg`
- `japan_scroll.png`
- `japan_tatami.jpg`
- `khmer_apsara.png`
- `khmer_floor.jpg`
- `khmer_lintel_relief.jpg`
- `khmer_sandstone.jpg`
- `meso_deity_mask.png`
- `meso_greca_carved.jpg`
- `meso_limestone_floor.jpg`
- `mesopotamia_lamassu.png`
- `mesopotamia_procession.png`
- `modern_terrazzo.jpg`
- `modern_laylight.jpg`
- `neolithic_floor.jpg`
- `neolithic_ochre_figures.png`
- `neolithic_reed.jpg`
- `neolithic_wall.jpg`
- `oceania_floor.jpg`
- `oceania_sandstone.jpg`
- `oceanic_tapa.jpg`
- `ottoman_iznik.jpg`
- `persia_floor.jpg`
- `persia_guard.png`
- `persia_wingdisk.jpg`
- `pietra_serena.jpg`
- `renaissance_fresco.png`
- `salon2_parquet.jpg`
- `salon2_sage_damask.jpg`
- `salon_damask.jpg`
- `salon_parquet.jpg`

## Deferred

These spec entries still need a fresh, gated generation or a better source
texture before shipping:

- Missing special surfaces: `greek_frieze.png`, `baroque_marble_floor.jpg`.
- `renaissance_herringbone.jpg` was not shipped because the available
  Renaissance concept source was a marble/geometric tile, not terracotta
  herringbone.
- `ottoman_floor.jpg` and `oceanic_pandanus.jpg` were generated during the
  2026-07-09 pass but rejected before wiring because seam deltas were too high
  for broad repeated surfaces.

## Verification

- `node --check js/textures.js js/styles.js js/corridor.js`
- Local browser smoke test at `http://127.0.0.1:8123/`
- Entered the museum and confirmed the 3D scene renders with no browser
  warnings or errors.
- Seam edge deltas were checked numerically for the accepted runtime copies.
- Batch 2 generated and accepted: `indus_seal.png`, `khmer_apsara.png`,
  `renaissance_fresco.png`.
- Batch 3 generated and accepted: `mesopotamia_lamassu.png`,
  `mesopotamia_procession.png`, `persia_guard.png`.
- Batch 4 generated and accepted: `japan_scroll.png`, `greek_coffer.jpg`,
  `modern_laylight.jpg`. `greek_frieze.png` generation was rejected and remains
  deferred.
- Batch 5 promoted and accepted cohesive section materials for Mesoamerica,
  Andes textile accent, Indus floor, Khmer wall/floor/lintel, Islamic
  floor/muqarnas, Ottoman Iznik panels, Persia floor/wing-disk accent,
  Neolithic wall/floor, ancient Oceania wall/floor, Oceanic tapa band, and
  adobe basket decals.
- Verification 2026-07-09: ES-module syntax check via
  `node --input-type=module --check < js/*.js` for `textures.js`, `styles.js`,
  and `corridor.js`; Puppeteer smoke captures for `neolithic`, `seasia`, and
  `oceancient` rendered with `consoleErrors: 0`; no 4xx resource responses from
  the local preview server.
