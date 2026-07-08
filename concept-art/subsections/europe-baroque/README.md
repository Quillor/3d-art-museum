# Baroque & the Golden Age Asset Spec

**Period:** 1600-1700  
**Gallery read:** decorative Baroque cabinet gallery  
**Core material language:** damask wallpaper, gilt frames, dark parquet

## Art Direction
Build this subsection as a reusable corridor kit, not a standalone scene. The Blender assets should frame the current museum walkway: shallow wall relief, portal surrounds, ceiling/beam modules, columns or pilasters, and prop clusters that stay clear of artwork sightlines.

## Floor Texture Audit
Needs upgrade: use dark parquet, patterned marble thresholds, or polished stone inlays. Pair the corrected floor with damask/flocked wallcovering and gilded ornament so the 1600-1700 gallery reads as a richly decorated Baroque room rather than a plain plaster corridor.

## Seamless Texture Exports
These concept textures are tileable and intended as source/reference maps for Blender materials:
- `textures/floor_dark_parquet_seamless.png`
- `textures/gilt_trim_band_seamless.png`
- `textures/wallpaper_damask_seamless.png`

## Blender Asset Targets
- **Portal:** era-specific entrance frame with a clear low central aperture; keep protrusion shallow enough for corridor placement.
- **Wall module:** 2-4 meter repeatable bay with material relief, trim, and safe blank art zones.
- **Ceiling/floor module:** repeatable bay matching the floor audit above; include trim strips or transitions where useful.
- **Decor props:** small reusable meshes such as lamps, stones, beams, rosettes, brackets, carved panels, or textile runners.

## Blender Generation Notes
1. Model in real scale around a centered doorway; keep the visitor path clear at floor level.
2. Use the seamless PNGs as albedo references. Add procedural bump/roughness in Blender from the same tile, but avoid displacement that breaks the corridor silhouette.
3. Export GLB parts as named objects: `Portal`, `WallBay`, `CeilingBay`, `FloorBay`, and optional `Prop_*` meshes.
4. Keep art-hanging zones visually calm: ornament should frame the paintings, not compete with them.
5. Prefer bevelled real geometry for silhouettes and large relief; use texture detail for fine grain, wallpaper, masonry joints, weave, and plaster noise.

## Notes For Future Runtime Integration
This folder is concept-art only. When promoted into runtime assets, preserve current wing layout and map these materials onto existing corridor segments rather than building a separate scene.
