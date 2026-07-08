# Impressionism & After Asset Spec

**Period:** 1870-1905  
**Gallery read:** late 19th-century exhibition salon  
**Core material language:** William Morris wallpaper, muted painted walls, parquet

## Art Direction
Build this subsection as a reusable corridor kit, not a standalone scene. The Blender assets should frame the current museum walkway: shallow wall relief, portal surrounds, ceiling/beam modules, columns or pilasters, and prop clusters that stay clear of artwork sightlines.

## Floor Texture Audit
Needs upgrade through 1900: use polished parquet or late 19th-century museum floorboards. Pair it with Victorian or Arts-and-Crafts wallpaper; avoid a plain blue plaster room for this subsection.

## Seamless Texture Exports
These concept textures are tileable and intended as source/reference maps for Blender materials:
- `textures/floor_polished_parquet_seamless.png`
- `textures/wallpaper_arts_and_crafts_seamless.png`
- `textures/wallpaper_victorian_alt_seamless.png`

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
