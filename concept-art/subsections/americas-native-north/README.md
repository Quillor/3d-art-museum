# Native North America Hallway Concept Spec

> **ARCHIVED MOOD-ONLY NOTE.** This file is not production authority. Its legacy
> concept directions may be inaccurate. Use `../../room-designs.json`,
> `../../ROOM_DESIGN_BIBLES.md`, and `../../PRODUCTION_STANDARD.md`; never promote
> any motif, period claim, texture, or asset listed below without passing those gates.

**Period:** 1100-1900  
**Gallery read:** Adobe and cliff-dwelling passage  
**Concept sheet:** `Hallway-04-americas-native-north.png`  
**Core material language:** adobe plaster, timber vigas, packed earth, mineral pigment, woven fiber

## Online Reference Links Used
- [NPS: Mesa Verde cliff dwellings](https://www.nps.gov/meve/learn/historyculture/cliff_dwellings_home.htm)
- [NPS: Pueblo architecture](https://www.nps.gov/articles/000/pueblo-architecture.htm)
- [National Museum of the American Indian](https://americanindian.si.edu/)

## High-Level Art Direction
A warm plastered passage with rounded adobe forms, vigas, latilla ceiling rhythm, restrained painted bands, and deep artifact niches. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Packed earth or adobe floor is appropriate; use woven mats only as accents or threshold inserts.

Texture priority for Blender materials: adobe plaster, timber vigas, packed earth. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Build rounded wall modules, viga beam arrays, low plaster thresholds, and alcove display recesses with soft bevels. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Adobe portal
- Viga ceiling bay
- Packed-earth floor
- Painted trim band
- Woven mat accent

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: warm adobe corridor with mineral-pigment frieze, woven textiles, basketry, viga/latilla ceiling, and packed-earth circulation.

Texture manifest: existing `assets/textures/adobe_wall.jpg` and `assets/textures/adobe_painted_frieze.jpg` remain base assets; `assets/textures/adobe_basket.png` adds soft-alpha basket discs as small wall details.

Blender hookup notes: basketry should stay matte fiber with soft edges; adobe walls and niches must remain the dominant material.

Placement rules: basket discs can sit above textile hangings or in secondary wall gaps, never over artwork zones.

Avoid: basket motifs as wallpaper, bright clean paint, sharp white alpha halos, or decorative clutter near visitor sightlines.
