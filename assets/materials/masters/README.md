# Source-authored PBR material masters

These are reusable **substrate** materials for the museum runtime. They provide
source-authored color, OpenGL tangent-space normal, and roughness channels.
Cultural
motifs, masonry layouts, painted bands, inscriptions, relief panels, and other
macro-patterns remain separate assets and must not be converted into depth by
grayscaling their color.

All ambientCG sources are CC0. The source archives remain in
`review/source_assets/`. Regenerate these tiers with
`tools/build_material_masters.sh`. Exact IDs, official URLs, creation-method
classifications, archive/output SHA-256 checksums, dimensions, and channel
inventories are recorded in `manifest.json`. `Bricks084`, `Rock051`,
`Ground068`, `Bricks098`, `PavingStones142`, and `Ground103` are confirmed
surface photogrammetry; the others are procedural, procedural with bitmap
elements, approximated, or explicitly unverified as listed below.

## Runtime tiers

- `desktop/`: original authored tier, up to 1024 px on the long edge.
- `mobile/`: aspect-preserving 512 px long-edge tier.
- Albedo/color maps use sRGB.
- `normal_gl.jpg` and `roughness.jpg` use linear/no-color-space sampling.
- No runtime displacement or AO is included.

## Master IDs

| Master ID | PBR source | Creation method | Default tile size | Roughness multiplier | Normal scale | Intended use |
|---|---|---|---:|---:|---:|---|
| `stone_limestone_dressed_v1` | ambientCG `Tiles143` | unverified | 2.5 m | 1.0 | 0.18 | Dressed limestone and compatible pale stone; macro joints remain room-specific |
| `stone_sandstone_warm_v1` | ambientCG `Bricks084` | surface photogrammetry | 2.2 m × 1.1 m | 1.0 | 0.24 | Warm sandstone masonry; do not use for Andesite or Khmer macro block layout |
| `rock_natural_grey_v1` | ambientCG `Rock051` | surface photogrammetry | 2.8 m | 1.0 | 0.20 | Natural grey rock response for compatible caves and shelters; room color and macro strata remain separate |
| `earth_rocky_v1` | ambientCG `Ground068` | surface photogrammetry | 2.5 m | 1.0 | 0.22 | Rocky compacted ground and threshold wear |
| `masonry_stone_irregular_v1` | ambientCG `Bricks098` | surface photogrammetry | 2.6 m | 1.0 | 0.20 | Irregular stone masonry where the documented bond is compatible |
| `paving_stone_grey_v1` | ambientCG `PavingStones142` | surface photogrammetry | 2.2 m | 1.0 | 0.18 | Worn grey stone paving; room-specific course scale still comes from UVs |
| `plaster_lime_v1` | ambientCG `Plaster001` | procedural | 2.5 m | 1.0 | 0.12 | Lime, gypsum, and compatible smooth plaster variants |
| `plaster_earthen_asante_v1` | versioned generated color + `Plaster001` response | generated color + procedural response | 3.0 m | 1.0 | 0.14 | Traditions/Asante earthen plaster; generated color is never used to derive depth |
| `earth_compacted_v1` | ambientCG `Ground103` | surface photogrammetry | 2.5 m | 1.0 | 0.24 | Compacted earth and compatible floor substrate |
| `timber_parquet_light_v1` | ambientCG `WoodFloor051` | procedural | 2.4 m | 0.82 | 0.08 | Light waxed parquet/boards; board direction must follow UVs |
| `timber_parquet_dark_v1` | ambientCG `WoodFloor064` | procedural + bitmap elements | 2.4 m | 0.90 | 0.10 | Dark parquet/boards; not a substitute for carved-post grain |
| `stone_marble_white_v1` | ambientCG `Marble021` | procedural | 3.0 m | 0.62 | 0.04 | Polished or honed pale marble; veins must not become height |
| `masonry_fired_brick_v1` | ambientCG `Bricks071` | procedural | 1.8 m | 1.0 | 0.18 | Generic fired-brick substrate; historical brick dimensions still require custom UV/layout |
| `fabric_woven_neutral_v1` | ambientCG `Fabric019` | procedural | 1.2 m | 1.0 | 0.10 | Neutral woven-fiber response beneath room-specific textile color/motifs |
| `ceramic_glazed_blue_v1` | ambientCG `Tiles135B` | procedural | 1.0 m | 0.45 | 0.05 | Glazed ceramic response; zellij/Iznik pattern and grout remain separate |
| `terrazzo_white_v1` | ambientCG `Terrazzo013` | procedural | 2.0 m | 0.72 | 0.04 | Polished terrazzo; chips are color/inlay rather than height |
| `paper_white_v1` | ambientCG `Paper001` | approximated | 1.0 m × 0.586 m | 1.0 | 0.04 | Paper and compatible shoji fiber response |
| `tatami_yellow_v1` | ambientCG `Tatami001` | procedural | 1.82 m × 0.91 m | 1.0 | 0.14 | Tatami surface response; mat geometry and borders use real dimensions |

## Asante albedo provenance

`plaster_earthen_asante_v1/source/albedo_1254.png` preserves the supplied
generated source verbatim without overwriting the older runtime texture. It is
also the portable, checked-in input to the rebuild. Desktop and mobile color
tiers are offset and wrap-blended deterministically by
`tools/make_seamless_texture.py`; the preserved source is never modified. Its
normal and roughness channels come from the independent, source-authored
`Plaster001` PBR response so
pigment and color variation cannot turn into false relief.

## Rejection rules

- Do not derive normal, height, roughness, or AO from cultural albedo.
- Do not reuse one macro block/joint layout across unrelated construction.
- Do not change texture repeat on a shared texture object; use geometry UVs.
- Do not use these displacement sources at runtime. Deep relief belongs in
  modeled geometry or offline Blender displacement.
