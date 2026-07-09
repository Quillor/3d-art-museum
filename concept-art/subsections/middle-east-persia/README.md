# Persia and Classical East Hallway Concept Spec

**Period:** 550 BCE-630 CE  
**Gallery read:** Achaemenid stone hall  
**Concept sheet:** `Hallway-16-middle-east-persia.png`  
**Core material language:** limestone, carved bas-relief, polished slab floor, bronze, traces of ancient color

## Online Reference Links Used
- [UNESCO: Persepolis](https://whc.unesco.org/en/list/114/)
- [Met: Achaemenid Empire](https://www.metmuseum.org/toah/hd/acha/hd_acha.htm)
- [British Museum: Ancient Iran](https://www.britishmuseum.org/collection/galleries/ancient-iran)

## High-Level Art Direction
A pale limestone gallery with processional relief, fluted columns, monumental lintels, and warm grazing light. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Large pale limestone slabs are historically plausible; avoid random block masonry.

Texture priority for Blender materials: limestone, carved bas-relief, polished slab floor. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Create relief wall panels, column modules, slab floor pieces, lintels, and restrained pigment/accent materials. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Achaemenid portal
- Relief wall bay
- Limestone floor slab
- Fluted column
- Bronze accent lamp

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: pale Achaemenid limestone with related slab floor, processional reliefs, blue/gold dado, and restrained gold winged-disk accents.

Texture manifest: `assets/textures/persia_floor.jpg` for slab flooring, `assets/textures/persia_guard.png` for relief panels, and `assets/textures/persia_wingdisk.jpg` for winged-disk gold fields.

Blender hookup notes: keep the limestone family consistent between wall, relief, and floor; reserve polished response for blue/gold glazed bands only.

Placement rules: guards belong in tall panels between artworks; winged disks should remain portal/cornice accents, not repeated wall decals.

Avoid: random masonry floors, cartoon gold symbols, over-sharp relief contrast, or saturated palace colors that overpower limestone.
