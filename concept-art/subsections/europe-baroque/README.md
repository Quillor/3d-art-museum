# Europe Baroque Hallway Concept Spec

**Period:** 1600-1750  
**Gallery read:** Ornate palace-gallery interior  
**Concept sheet:** `Hallway-10-europe-baroque.png`  
**Core material language:** damask, gilded plaster, veined marble, herringbone parquet, carved walnut

## Online Reference Links Used
- [Chateau de Versailles: Hall of Mirrors](https://en.chateauversailles.fr/discover/estate/palace/hall-mirrors)
- [Met: Baroque Art](https://www.metmuseum.org/toah/hd/baro/hd_baro.htm)
- [Victoria and Albert Museum: Baroque](https://www.vam.ac.uk/articles/baroque)

## High-Level Art Direction
A theatrical salon corridor with gilded cartouches, damask/flocked wall treatments, marble thresholds, parquet transitions, and plaster ornament. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Use herringbone parquet with marble thresholds or patterned marble transitions; avoid plain concrete or bare generic boards.

Texture priority for Blender materials: damask, gilded plaster, veined marble. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Make ornate but shallow trim modules, damask wall shader references, marble threshold meshes, and gilded portal overlays. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Gilded portal
- Damask wall bay
- Parquet floor
- Marble threshold
- Plaster cartouche

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: red damask salon with gilt trim, walnut wainscot, parquet, and a warmer ceiling/cove accent that belongs to the same palace language.

Texture manifest: existing `assets/textures/baroque_damask.jpg` and `assets/textures/baroque_parquet.jpg` remain wall/floor assets; `assets/textures/baroque_ceiling_fresco.jpg` is available for ceiling/cove accent surfaces.

Blender hookup notes: keep damask and wood dark enough for paintings to read, with gilt used as thin trim and cartouche accents rather than broad fill.

Placement rules: ceiling fresco/gilt detail should stay overhead or in cartouches; avoid placing busy ornament directly behind artworks.

Avoid: flat red plaster, oversized gold fields, synthetic glossy wallpaper, or ceiling motifs that read as a repeated border strip.
