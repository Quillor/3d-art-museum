# Texture Pass Log

Source request: architecture improvement texture polish list.

## Accepted runtime texture copies

These were sourced from existing concept-art texture packages, resized to the
runtime target, placed in `assets/textures/`, and wired into the app:

- `adobe_painted_frieze.jpg`
- `baroque_damask.jpg`
- `baroque_parquet.jpg`
- `glazed_brick.jpg`
- `inca_andesite.jpg`
- `inca_flagstone.jpg`
- `indus_brick.jpg`
- `indus_seal.png`
- `islamic_arabesque.png`
- `islamic_zellij.jpg`
- `japan_shoji_paper.jpg`
- `japan_tatami.jpg`
- `khmer_apsara.png`
- `meso_deity_mask.png`
- `meso_greca_carved.jpg`
- `mesopotamia_lamassu.png`
- `mesopotamia_procession.png`
- `modern_terrazzo.jpg`
- `neolithic_ochre_figures.png`
- `neolithic_reed.jpg`
- `persia_guard.png`
- `pietra_serena.jpg`
- `renaissance_fresco.png`
- `salon2_parquet.jpg`
- `salon2_sage_damask.jpg`
- `salon_damask.jpg`
- `salon_parquet.jpg`

## Deferred

These spec entries still need a fresh, gated generation or a better source
texture before shipping:

- Hero figural reliefs: `khmer_lintel_relief.png`, `persia_wingdisk.png`.
- Missing special surfaces: `inca_textile.png`, `adobe_basket.png`,
  `modern_laylight.jpg`, `japan_scroll.png`, `greek_coffer.jpg`,
  `greek_frieze.png`, `baroque_ceiling_fresco.jpg`,
  `baroque_marble_floor.jpg`.
- `renaissance_herringbone.jpg` was not shipped because the available
  Renaissance concept source was a marble/geometric tile, not terracotta
  herringbone.

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
