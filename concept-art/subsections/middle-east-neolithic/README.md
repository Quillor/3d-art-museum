# The First Villages Hallway Concept Spec

**Period:** 9500-5000 BCE  
**Gallery read:** Mudbrick village threshold  
**Concept sheet:** `Hallway-14-middle-east-neolithic.png`  
**Core material language:** mudbrick, lime plaster, packed clay, reed, ochre pigment

## Online Reference Links Used
- [UNESCO: Neolithic Site of Catalhoyuk](https://whc.unesco.org/en/list/1405/)
- [Catalhoyuk Research Project](https://www.catalhoyuk.com/)
- [Met: Neolithic Near East](https://www.metmuseum.org/toah/hd/nehd/hd_nehd.htm)

## High-Level Art Direction
A compact earthen village passage with plastered mudbrick, rounded niches, reed/timber roof texture, and ochre wall marks. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Compacted clay with reed impressions is correct; avoid polished stone and modern tile.

Texture priority for Blender materials: mudbrick, lime plaster, packed clay. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Create mudbrick wall bays, plastered thresholds, low platforms, reed roof modules, and compacted floor material with subtle roughness. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Mudbrick portal
- Plastered wall bay
- Packed clay floor
- Reed ceiling
- Ochre motif band

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: warm lime plaster over mudbrick, dusty packed clay floor, reed ceiling, and absorbed red-ochre marks.

Texture manifest: `assets/textures/neolithic_wall.jpg` for plaster walls, `assets/textures/neolithic_floor.jpg` for packed earth, `assets/textures/neolithic_reed.jpg` for ceiling reed, and `assets/textures/neolithic_ochre_figures.png` for the upper painted band.

Blender hookup notes: keep wall/floor roughness high, tile wall and floor at room scale, and keep the ochre band soft and embedded rather than graphic. Mud benches and niches should share the same plaster family as the wall.

Placement rules: ochre figures and zigzags belong high on plaster or inside niches; leave lower wall zones calm for artworks and circulation.

Avoid: polished stone, blue ceramic accents, crisp decal edges, evenly repeated damage, or floors that read like modern concrete.
