# Indus Valley Hallway Concept Spec

> **ARCHIVED MOOD-ONLY NOTE.** This file is not production authority. Its legacy
> concept directions may be inaccurate. Use `../../room-designs.json`,
> `../../ROOM_DESIGN_BIBLES.md`, and `../../PRODUCTION_STANDARD.md`; never promote
> any motif, period claim, texture, or asset listed below without passing those gates.

**Period:** 2600-1900 BCE  
**Gallery read:** Baked-brick urban corridor  
**Concept sheet:** `Hallway-20-asia-indus.png`  
**Core material language:** baked brick, terracotta, lime plaster traces, clay mortar, timber lintels

## Online Reference Links Used
- [UNESCO: Archaeological Ruins at Moenjodaro](https://whc.unesco.org/en/list/138/)
- [British Museum: Indus Valley](https://www.britishmuseum.org/collection/galleries/indus-valley)
- [Harappa archaeology](https://www.harappa.com/)

## High-Level Art Direction
A precise fired-brick passage with drainage-edge detail, terracotta tones, plastered niches, and warm display lighting. The sheet is intended as production concept art for a museum subsection: dark editorial board, large cinematic architectural panels, concise captions, and materials readable enough for asset modeling.

## Floor Texture / Material Notes
Use baked brick or compact brick paving, optionally with drainage channels; avoid generic stone or polished modern tile.

Texture priority for Blender materials: baked brick, terracotta, lime plaster traces. Use roughness, bump, and bevels to make the floor catch light without creating unsafe visitor-path geometry.

## Blender Asset-Generation Guidance
Model brick bond wall bays, floor pavers, edge drain channels, lintel pieces, and plaster/niche inserts. Keep the corridor kit modular and shallow enough to wrap the existing museum path rather than becoming a separate scene. Preserve calm wall zones for artwork, and place ornament as framing, trim, ceiling, floor, or portal detail.

## Suggested Assets To Model
- Brick portal
- Baked brick wall bay
- Brick floor
- Drain edge
- Plastered display niche

## Runtime Integration Notes
This folder is concept-art only. When these designs are promoted into runtime assets, keep file changes outside this folder intentional and map the materials onto existing corridor segments.

## Runtime Material Pass - 2026-07-09
Target visual read: baked-brick urban corridor with brick wall and brick floor belonging to the same fired-clay family.

Texture manifest: `assets/textures/indus_brick.jpg` for walls, `assets/textures/indus_floor.jpg` for the floor, and `assets/textures/indus_seal.png` for seal plaques.

Blender hookup notes: keep clay/brick rough and matte, with timber lintels as the only dark structural accent. Floor drainage channels should look cut into the brick-paved circulation edge.

Placement rules: seal plaques work as small terracotta reliefs between artworks; do not turn the full wall into a decorative pattern.

Avoid: generic dirt floors, clean modern pavers, glossy brick, or seal motifs scaled larger than plausible artifacts.
