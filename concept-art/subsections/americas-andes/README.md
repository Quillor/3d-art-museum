# The Andes Hallway Concept Spec

**Period:** 200 BCE-1530 CE  
**Gallery read:** Inca/Tiwanaku ashlar corridor  
**Concept sheet:** `Hallway-03-americas-andes.png`  
**Core material language:** andesite ashlar, trapezoid portals, flagstone, woven accent color

## Online Reference Links Used
- [UNESCO: Historic Sanctuary of Machu Picchu](https://whc.unesco.org/en/list/274/)
- [Met: Inca Art](https://www.metmuseum.org/toah/hd/inca/hd_inca.htm)
- [UNESCO: Tiwanaku](https://whc.unesco.org/en/list/567/)

## High-Level Art Direction
A precise dry-laid stone gallery with trapezoid openings, monumental lintels, and quiet textile accents in display zones. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Use irregular ashlar flagstone or large andesite slabs; avoid square modern masonry grids.

Texture priority for Blender materials: andesite ashlar, trapezoid portals, flagstone. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Create polygonal wall blocks with bevelled seams, trapezoid recesses, and modular floor stones that keep the visitor route smooth. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Trapezoid portal
- Ashlar wall bay
- Flagstone floor kit
- Stone lintel
- Textile accent runner

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: cool dry-fit andesite with trapezoid niches, stone floor, pottery, and woven textile color used sparingly.

Texture manifest: existing `assets/textures/inca_andesite.jpg` and `assets/textures/inca_flagstone.jpg` remain base materials; `assets/textures/inca_textile.jpg` now replaces the flat textile mesh color.

Blender hookup notes: keep stone rough and tightly fitted; textiles should read woven and small-scale inside niches rather than covering the room.

Placement rules: textiles belong in niche props/runners only; pottery and uplights should punctuate the cool stone rhythm.

Avoid: warm adobe walls, polished stone, huge textile panels, or pattern colors bleeding into the main stone surfaces.
