# Ancient Egypt Hallway Asset Brief

Reference image: `Hallway-26-africa-egypt.png`

Build target: a photoreal hypostyle-inspired museum corridor with yellow-ochre sandstone block walls, worn limestone slab flooring, painted carved frieze bands, lotus and papyrus capitals, large weathered relief hieroglyphics, and amber museum lighting that keeps the space ceremonial without feeling like a game dungeon.

## Concept Match Notes

- Period read: Ancient Egypt, 3100 BCE-300 CE.
- Mood: temple-inspired procession hall with warm uplight, recessed portal depth, and softly glowing carved stone.
- Primary material family: yellow honey sandstone, pale limestone, aged mineral pigment, charred bronze or dark metal braziers, and dusty recessed carvings.
- Relief language: large wall-scale hieroglyphic panels, deity blocks, winged sun motifs, lotus and papyrus crown forms.
- Museum constraint: keep circulation clear and preserve calm wall zones for display integration.

## Texture Set

All files live in `textures/`.

### Sandstone Relief Wall PBR

Use for major wall runs, pylon faces, and broad architectural surfaces. This pass is intentionally more yellow and more hieroglyphic-forward than the earlier wall set.

- `egypt_sandstone_relief_wall_albedo_2k.png`
- `egypt_sandstone_relief_wall_normal_2k.png`
- `egypt_sandstone_relief_wall_height_2k.png`
- `egypt_sandstone_relief_wall_roughness_2k.png`
- `egypt_sandstone_relief_wall_ao_2k.png`
- `wall_masonry_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `egypt_sandstone_relief_wall_albedo_2k.png`
- Normal: `egypt_sandstone_relief_wall_normal_2k.png` through a Normal Map node, strength 0.25-0.45.
- Height: `egypt_sandstone_relief_wall_height_2k.png` into Bump height, distance 0.02-0.05 m.
- Roughness: `egypt_sandstone_relief_wall_roughness_2k.png`, keep it matte and dusty.
- AO: multiply lightly into albedo or use as mix guidance at 0.15-0.3 strength.
- UV scale: 1 tile per 3-4 m on flat walls, 1 tile per 2-3 m on portals and plinth faces.

Notes:

- This is still a seamless structural wall material, but it can now act as a hero-leaning relief wall where the camera needs an Ancient Egypt read immediately.
- The enlarged glyph clusters should feel carved into stained sandstone blocks. Keep additional decals sparse so the wall does not become visual wallpaper.
- Let real geometry carry large reveals, step-backs, and carved frames. Keep the texture work shallow and believable.

### Limestone Slab Floor PBR

Use for the central processional path, threshold slabs, and side aisle paving.

- `egypt_limestone_slab_floor_albedo_2k.png`
- `egypt_limestone_slab_floor_normal_2k.png`
- `egypt_limestone_slab_floor_height_2k.png`
- `egypt_limestone_slab_floor_roughness_2k.png`
- `egypt_limestone_slab_floor_ao_2k.png`
- `floor_worn_stone_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `egypt_limestone_slab_floor_albedo_2k.png`
- Normal: `egypt_limestone_slab_floor_normal_2k.png`, strength 0.18-0.35.
- Height: `egypt_limestone_slab_floor_height_2k.png`, Bump distance 0.01-0.03 m.
- Roughness: `egypt_limestone_slab_floor_roughness_2k.png`, roughness 0.82-0.95.
- AO: use lightly so joints and stone edges catch a little depth without looking dirty.
- UV scale: 1 tile per 3-5 m.

Notes:

- The floor should stay in the same warm stone family as the walls.
- Keep the center path slightly smoother and more worn than the outer edges, but avoid glossy polish.

### Painted Frieze Band PBR

Use for entablature bands, beam wraps, ceiling borders, portal lintels, and low trim strips.

- `egypt_painted_frieze_band_albedo_2k.png`
- `egypt_painted_frieze_band_normal_2k.png`
- `egypt_painted_frieze_band_height_2k.png`
- `egypt_painted_frieze_band_roughness_2k.png`
- `egypt_painted_frieze_band_ao_2k.png`
- `carved_band_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `egypt_painted_frieze_band_albedo_2k.png`
- Normal: `egypt_painted_frieze_band_normal_2k.png`, strength 0.15-0.3.
- Height: `egypt_painted_frieze_band_height_2k.png`, Bump distance 0.008-0.02 m.
- Roughness: `egypt_painted_frieze_band_roughness_2k.png`, roughness 0.84-0.96.
- AO: use sparingly so carved linework stays readable.
- UV scale: treat as a directional trim. One full tile should read across a long beam or band segment.

Notes:

- Pigment should feel embedded in the carved stone, not screen-printed on top.
- Use the band as framing, not as wallpaper across entire walls.

### Preview

- `texture_contact_sheet.png` is the quick visual audit for the Egypt texture package.
- `rebuild_yellow_glyph_textures.py` regenerates the warmer yellow wall/frieze/floor package and the contact sheet from the current texture set.

## Blender Asset Targets

Build a reusable corridor kit that can create both the hypostyle hall and the pylon-style entrance portal.

### `Portal_Egypt_Pylon`

- Overall width: 4.5-6.5 m.
- Clear opening: 2.2-3.0 m wide, 3.0-4.2 m tall.
- Shape: monumental rectilinear portal with recessed jambs and a deep reveal.
- Surfaces: sandstone relief wall on the pylon faces, painted frieze band on the lintel and vertical side bands.
- Details: winged sun or broad symbolic frieze above the opening, shallow carved hierarchy instead of deep sculptural projection.

### `Column_Egypt_Lotus`

- Height: 3.6-5.2 m depending on corridor scale.
- Shaft: broad cylindrical column with shallow vertical relief bands and figure panels.
- Capital: lotus or papyrus flare, layered petal geometry, muted painted accents.
- Base: chunky stone plinth with enough mass to feel structural.
- Material split: sandstone body, painted frieze accents, slightly lighter base ring.

### `WallBay_Egypt_Relief`

- Width: 2.8-4.0 m per repeat.
- Surface: yellow sandstone blocks with broad quiet panels interrupted by large framed hieroglyphic relief zones.
- Use the largest hieroglyphic faces near portals, corners, and column-adjacent zones instead of every wall segment.
- Reserve calmer rectangular fields so art placement still feels possible.

### `FloorBay_Egypt_Slabs`

- Width: match corridor path.
- Length: match wall repeat length.
- Surface: large slab pattern with subtle edge wear and a faint processional wear lane.
- Use separate long trim meshes for inset painted border strips rather than baking everything into one floor texture.

### `Beam_Egypt_Painted`

- Use flat beam or lintel modules with directional painted frieze placement.
- Keep beam depth readable in silhouette, but let the frieze remain shallow and disciplined.

### Props

Recommended prop names:

- `Prop_Brazier_Egypt`
- `Prop_StatuePlinth_Egypt`
- `Prop_CanopicJar_Display`
- `Prop_StoneOfferingTable`
- `Prop_Uplight_HiddenWarm`
- `Prop_PortalBand_Trim`
- `Prop_FloorBorder_Trim`

Prop rules:

- Use a small number of heavy ceremonial props rather than many small clutter pieces.
- Keep statues, braziers, and plinths aligned to axes and recesses.
- Place hidden museum uplights low and close to the architecture so the carved surfaces glow upward.

## Lighting Direction

- Color temperature: 2000-2800 K for the visible warm practical mood.
- Use low concealed uplights at column bases, wall feet, and portal reveals.
- Add subtle overhead track lighting only where the concept suggests museum presentation rather than ancient torchlight.
- Keep the stone warm and luminous, but preserve shadow depth inside recesses and behind columns.

## Modeling Workflow

1. Block the corridor with portal, column, wall, and floor modules in real scale.
2. Establish the main wall and floor materials first so the whole space shares one stone family.
3. Add frieze trims and carved bands after the main blockout is reading correctly.
4. Model relief depth conservatively. Let light and material variation do most of the work.
5. Add ceremonial props only after the architectural rhythm is locked.
6. Light the scene with base uplights and portal emphasis, then tune exposure until carvings read without flattening the hall.

## Export Checklist

- `Portal_Egypt_Pylon`
- `Column_Egypt_Lotus_A`
- `Column_Egypt_Lotus_B`
- `WallBay_Egypt_Relief_A`
- `WallBay_Egypt_Relief_B`
- `FloorBay_Egypt_Slabs`
- `Beam_Egypt_Painted`
- `Prop_Brazier_Egypt`
- `Prop_StatuePlinth_Egypt`
- `Prop_PortalBand_Trim`
- `Prop_FloorBorder_Trim`

## What To Avoid

- Gray generic block walls with no warmth or mineral life.
- Small, timid hieroglyph marks that disappear at corridor scale.
- Overly saturated clean blues and reds that feel freshly painted.
- Relief depth that looks like modern stamped concrete.
- Small busy props that clutter the museum path.
- Glossy polished floors that break the ancient stone mood.
