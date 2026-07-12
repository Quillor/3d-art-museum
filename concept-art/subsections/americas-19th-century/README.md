# The Americas 19th Century Hallway Asset Brief

> **ARCHIVED MOOD-ONLY NOTE.** This file is not production authority. Its legacy
> concept directions may be inaccurate. Use `../../room-designs.json`,
> `../../ROOM_DESIGN_BIBLES.md`, and `../../PRODUCTION_STANDARD.md`; never promote
> any motif, period claim, texture, or asset listed below without passing those gates.

Reference image: `Hallway-05-americas-19th-century.png`

Build target: a photoreal 19th-century salon gallery with deep damask wallpaper, aged gilt trim, dark wood framing, varnished parquet flooring, and warm gaslight-era ambience adapted for museum display.

Texture update note: the July 2026 texture pass rebuilds the wallpaper, parquet, straight walnut, and gilt trim as seamless photoreal PBR materials. Albedo maps stay flat enough for repeatable tiling, but now include material truth such as woven fiber, rubbed varnish, walnut pores, oxidized leaf, dust in seams, and restrained age variation. Add final illumination only in Blender/material lighting.

## Concept Match Notes

- Period read: 1830-1890.
- Mood: intimate salon corridor with rich wall coverings, framed art rhythm, and warm polished wood.
- Primary material family: oxblood or wine damask, gilded ornament, dark walnut or mahogany woodwork, varnished parquet, marble thresholds, and soft plaster ceiling ornament.
- Architectural read: trim-heavy wall bays, picture-rail logic, and decorative but disciplined doorway entablatures.

## Texture Set

All files live in `textures/`.

### Damask Wallpaper PBR

- `salon_damask_wallpaper_albedo_2k.png`
- `salon_damask_wallpaper_normal_2k.png`
- `salon_damask_wallpaper_height_2k.png`
- `salon_damask_wallpaper_roughness_2k.png`
- `salon_damask_wallpaper_ao_2k.png`
- `wallpaper_late_federal_salon_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `salon_damask_wallpaper_albedo_2k.png`
- Normal: `salon_damask_wallpaper_normal_2k.png`, strength 0.08-0.18.
- Height: `salon_damask_wallpaper_height_2k.png`, Bump distance 0.003-0.008 m.
- Roughness: `salon_damask_wallpaper_roughness_2k.png`, low sheen but not glossy vinyl.
- UV scale: 1 tile per 1.8-2.8 m depending on pattern scale.

Notes:

- Wallpaper should feel textile-based and rich, with visible woven fiber and slightly faded pigment rather than a flat printed graphic.
- Keep saturation controlled so artwork and gilt still read clearly.

### Varnished Parquet Floor PBR

- `salon_varnished_parquet_floor_albedo_2k.png`
- `salon_varnished_parquet_floor_normal_2k.png`
- `salon_varnished_parquet_floor_height_2k.png`
- `salon_varnished_parquet_floor_roughness_2k.png`
- `salon_varnished_parquet_floor_ao_2k.png`
- `floor_varnished_parquet_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `salon_varnished_parquet_floor_albedo_2k.png`
- Normal: `salon_varnished_parquet_floor_normal_2k.png`, strength 0.14-0.24.
- Height: `salon_varnished_parquet_floor_height_2k.png`, Bump distance 0.004-0.012 m.
- Roughness: `salon_varnished_parquet_floor_roughness_2k.png`, modest varnish sheen with age variation.
- UV scale: 1 tile per 2.5-4 m.

Notes:

- Keep the finish reflective enough to feel cared for, but not mirror-like.
- The albedo is a flat basket/block parquet tile with individual strip grain, seam dust, and small varnish scuffs; do not multiply in AO or directional shadow on the base color.
- Let the floor sit in a warm brown family that supports the wallpaper and wood portal.

### Straight Walnut Wood PBR

- `salon_straight_walnut_wood_albedo_2k.png`
- `salon_straight_walnut_wood_normal_2k.png`
- `salon_straight_walnut_wood_height_2k.png`
- `salon_straight_walnut_wood_roughness_2k.png`
- `salon_straight_walnut_wood_ao_2k.png`
- `wood_straight_walnut_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `salon_straight_walnut_wood_albedo_2k.png`
- Normal: `salon_straight_walnut_wood_normal_2k.png`, strength 0.08-0.18.
- Height: `salon_straight_walnut_wood_height_2k.png`, Bump distance 0.002-0.006 m.
- Roughness: `salon_straight_walnut_wood_roughness_2k.png`, varnished but aged.
- UV scale: 1 tile per 1.5-3 m for wall rails, door frames, benches, and straight board runs.

Notes:

- Use this wherever straight wood grain is needed instead of the parquet floor pattern.
- The palette matches the current wood family and uses wider walnut boards with irregular pore streaks, rubbed varnish, and no baked highlights or shadow gradients.

### Gilt Trim Band PBR

- `salon_gilt_trim_band_albedo_2k.png`
- `salon_gilt_trim_band_normal_2k.png`
- `salon_gilt_trim_band_height_2k.png`
- `salon_gilt_trim_band_roughness_2k.png`
- `salon_gilt_trim_band_ao_2k.png`
- `gilt_salon_trim_band_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `salon_gilt_trim_band_albedo_2k.png`
- Normal: `salon_gilt_trim_band_normal_2k.png`, strength 0.14-0.26.
- Height: `salon_gilt_trim_band_height_2k.png`, Bump distance 0.005-0.015 m.
- Roughness: `salon_gilt_trim_band_roughness_2k.png`, slightly brighter and lower-roughness than surrounding paint or wood.
- UV scale: use as a directional trim or entablature strip, not a full wall texture.

Notes:

- Gold leaf should feel aged and slightly mellow, with dark shellac in recesses and green-brown oxidation specks instead of chrome-bright metal.
- Use it to frame portals, picture rails, and upper trim zones.

### Preview

- `texture_contact_sheet.png` is the quick visual audit for the section.

## Blender Asset Targets

### `Portal_Salon_Ornate`

- Deep wood surround with gilt entablature, layered mouldings, and restrained ornament.
- Dark wood base with applied gilded detail instead of an all-gold surface.

### `WallBay_Salon_Damask`

- Large wallpaper fields framed by dark wood wainscot and picture-rail trim.
- Calm hanging zones for framed art.

### `FloorBay_Salon_Parquet`

- Herringbone or parquet field with subtle border logic.
- Marble threshold inserts can be separate meshes.

### `Cornice_Salon_Plaster`

- Shallow ornamental plaster ceiling edge with repeatable relief.
- Keep the ceiling brighter and calmer than the walls.

### Props

- `Prop_Gaslight_Sconce`
- `Prop_Bench_Salon`
- `Prop_Bust_Plinth`
- `Prop_Frame_Large_Gilt`
- `Prop_Threshold_Marble`

## Lighting Direction

- Warm gaslight-inspired sconces plus discreet ceiling art lighting.
- Let the wallpaper stay rich without going murky.
- Use small highlights on varnished floor and gilded trim, not harsh speculars everywhere.

## What To Avoid

- Flat modern wallpaper patterns.
- Over-bright gold that looks plated or digital.
- Plastic-looking wood sheen.
- Generic museum white walls that break the salon mood.
