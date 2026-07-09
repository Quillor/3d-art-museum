# Southeast Asia Hallway Concept Spec

**Period:** 800-1500  
**Gallery read:** Sandstone temple gallery  
**Concept sheet:** `Hallway-22-asia-southeast.png`  
**Core material language:** sandstone, laterite, worn stone slab floor, carved relief, timber accents, patina

## Online Reference Links Used
- [UNESCO: Angkor](https://whc.unesco.org/en/list/668/)
- [Met: Southeast Asian Art](https://www.metmuseum.org/toah/hd/sout/hd_sout.htm)
- [National Museum of Asian Art: Southeast Asia](https://asia.si.edu/explore-art-culture/collections/southeast-asian-art/)

## High-Level Art Direction
A carved sandstone/laterite gallery with bas-relief bands, corbelled stone depth, large slab flooring, and subtle patina. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Worn stone slabs are appropriate; avoid wood floors unless a specific regional timber structure is being modeled.

Texture priority for Blender materials: sandstone, laterite, worn stone slab floor. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Create bas-relief wall bays, laterite block modules, corbelled ceiling/portal pieces, and slab floor materials. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Temple portal
- Bas-relief wall bay
- Laterite block
- Stone floor slab
- Carved lintel

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: dim Angkor sandstone gallery with related wall blocks, worn slab floor, and relief panels catching grazing light.

Texture manifest: `assets/textures/khmer_sandstone.jpg` for walls, `assets/textures/khmer_floor.jpg` for slab floors, `assets/textures/khmer_apsara.png` for vertical reliefs, and `assets/textures/khmer_lintel_relief.jpg` for lintel/deity fields.

Blender hookup notes: use one sandstone family for slab, pilaster, corbel, and portal pieces; allow only timber beams to depart materially. Keep relief textures low-contrast so they read carved, not printed.

Placement rules: apsara panels alternate between artworks; lintel reliefs belong on doorway/pediment fields; wall blocks should stay calm behind framed art.

Avoid: black unreadable walls, crisp cartoon apsaras, high-gloss stone, or unrelated floor color.
