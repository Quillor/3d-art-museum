# Kingdoms of Africa Hallway Asset Brief

Reference image: `Hallway-27-africa-kingdoms.png`

Build target: a photoreal Sahelian banco gallery with thick earth-plaster walls, compacted clay flooring, toron timber rhythm, recessed artifact niches, and painted geometric trim that feels embedded in the architecture rather than laid on top of it.

## Concept Match Notes

- Period read: Kingdoms of Africa, 500 BCE-1600 CE.
- Mood: warm earthen ceremonial corridor with deep shadow, sculpted mass, and museum-safe uplighting.
- Primary material family: banco mud plaster, compacted clay, timber toron beams, oxidized red and black geometric paint, terracotta and dark metal display objects.
- Architectural read: heavy sculpted walls, rounded edges, thick portal forms, and shallow relief rather than carved stone detail.

## Texture Set

All files live in `textures/`.

### Banco Wall PBR

- `sahel_banco_wall_albedo_2k.png`
- `sahel_banco_wall_normal_2k.png`
- `sahel_banco_wall_height_2k.png`
- `sahel_banco_wall_roughness_2k.png`
- `sahel_banco_wall_ao_2k.png`
- `wall_earthen_plaster_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `sahel_banco_wall_albedo_2k.png`
- Normal: `sahel_banco_wall_normal_2k.png`, strength 0.18-0.32.
- Height: `sahel_banco_wall_height_2k.png`, Bump distance 0.01-0.03 m.
- Roughness: `sahel_banco_wall_roughness_2k.png`, keep the surface dry and matte.
- AO: use lightly so corners and sculpted recesses stay grounded.
- UV scale: 1 tile per 3-4 m on broad walls, slightly tighter on portal cheeks and niche returns.

Notes:

- Keep the banco wall broad and quiet. Let geometry carry mass and thickness.
- Avoid hard masonry reads. Edges should feel hand-shaped and slightly weather-softened.

### Compacted Clay Floor PBR

- `sahel_compacted_clay_floor_albedo_2k.png`
- `sahel_compacted_clay_floor_normal_2k.png`
- `sahel_compacted_clay_floor_height_2k.png`
- `sahel_compacted_clay_floor_roughness_2k.png`
- `sahel_compacted_clay_floor_ao_2k.png`
- `floor_packed_earth_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `sahel_compacted_clay_floor_albedo_2k.png`
- Normal: `sahel_compacted_clay_floor_normal_2k.png`, strength 0.12-0.24.
- Height: `sahel_compacted_clay_floor_height_2k.png`, Bump distance 0.008-0.02 m.
- Roughness: `sahel_compacted_clay_floor_roughness_2k.png`, roughness 0.88-0.97.
- AO: keep subtle so the path stays legible and safe.
- UV scale: 1 tile per 3-5 m.

Notes:

- Floor and wall should stay in the same earth family.
- Keep the center slightly smoother from foot traffic, but not polished.

### Painted Geometric Band PBR

- `sahel_painted_geometric_band_albedo_2k.png`
- `sahel_painted_geometric_band_normal_2k.png`
- `sahel_painted_geometric_band_height_2k.png`
- `sahel_painted_geometric_band_roughness_2k.png`
- `sahel_painted_geometric_band_ao_2k.png`
- `painted_band_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `sahel_painted_geometric_band_albedo_2k.png`
- Normal: `sahel_painted_geometric_band_normal_2k.png`, strength 0.08-0.16.
- Height: `sahel_painted_geometric_band_height_2k.png`, Bump distance 0.004-0.012 m.
- Roughness: `sahel_painted_geometric_band_roughness_2k.png`, high and chalky.
- UV scale: use as a directional trim, not a full wall covering.

Notes:

- Pigment should feel dusty and hand-painted.
- Use bands at shoulder height, over portals, and near plinth lines.

### Preview

- `texture_contact_sheet.png` is the quick visual audit for the section.

## Blender Asset Targets

### `Portal_Sahel_Banco`

- Thick sculpted earth portal with rounded corners and recessed timber-lined opening.
- Add toron beam ends and a painted trim band above the entry.
- Keep the silhouette heavy and monumental rather than carved or delicate.

### `WallBay_Sahel_Earthen`

- Width: 3.0-4.2 m.
- Earthen mass wall with one calm central field and optional recessed artifact niche.
- Use shallow wall variation, not block joints or stone course logic.

### `CeilingBay_Sahel_Toron`

- Exposed timber toron rhythm across the ceiling.
- Thick beams with broad spacing and darkened age tone.

### `FloorBay_Sahel_Clay`

- Flat compacted earth path with slight edge accumulation and very soft wear path.
- Use separate low trim meshes if a painted border is needed.

### Props

- `Prop_Terracotta_Vessel`
- `Prop_Metal_Bowl`
- `Prop_Niche_Display_Base`
- `Prop_Toron_End`
- `Prop_Uplight_HiddenWarm`

## Lighting Direction

- Use warm low uplights to catch banco wall relief and portal thickness.
- Keep ceiling beams darker than the walls.
- Preserve shadow in niches and under toron beams.

## What To Avoid

- Smooth concrete or generic stucco.
- Stone block reads.
- Bright clean paint with no dust or age.
- Thin modern-looking timber members.
