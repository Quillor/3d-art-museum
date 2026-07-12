# Faith and Living Traditions Hallway Asset Brief

> **ARCHIVED MOOD-ONLY NOTE.** This file is not production authority. Its legacy
> concept directions may be inaccurate. Use `../../room-designs.json`,
> `../../ROOM_DESIGN_BIBLES.md`, and `../../PRODUCTION_STANDARD.md`; never promote
> any motif, period claim, texture, or asset listed below without passing those gates.

Reference image: `Hallway-28-africa-traditions.png`

Build target: a photoreal earthen-and-timber ritual gallery with warm plaster walls, dark carved hardwood portal elements, woven raffia floor panels, reed or raffia ceiling rhythm, and intimate display lighting.

## Concept Match Notes

- Period read: 1200-1950 with a respectful material-focused museum interpretation.
- Mood: intimate, warm, hand-crafted, and grounded in timber, fiber, and plaster.
- Primary material family: amber clay plaster, dark hand-carved hardwood, woven raffia or reed matting, warm bronze or ceramic vessel accents.
- Architectural read: carved timber posts and lintels framing an otherwise restrained plaster space.

## Texture Set

All files live in `textures/`.

### Earthen Plaster Wall PBR

- `traditions_earthen_plaster_wall_albedo_2k.png`
- `traditions_earthen_plaster_wall_normal_2k.png`
- `traditions_earthen_plaster_wall_height_2k.png`
- `traditions_earthen_plaster_wall_roughness_2k.png`
- `traditions_earthen_plaster_wall_ao_2k.png`
- `wall_earthen_plaster_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `traditions_earthen_plaster_wall_albedo_2k.png`
- Normal: `traditions_earthen_plaster_wall_normal_2k.png`, strength 0.16-0.3.
- Height: `traditions_earthen_plaster_wall_height_2k.png`, Bump distance 0.01-0.025 m.
- Roughness: `traditions_earthen_plaster_wall_roughness_2k.png`, matte and chalky.
- UV scale: 1 tile per 3-4 m.

Notes:

- Wall texture should stay soft and calm so carved timber and objects carry the emphasis.
- Avoid aggressive crack patterns or noisy procedural grit.

### Carved Hardwood PBR

- `traditions_carved_hardwood_albedo_2k.png`
- `traditions_carved_hardwood_normal_2k.png`
- `traditions_carved_hardwood_height_2k.png`
- `traditions_carved_hardwood_roughness_2k.png`
- `traditions_carved_hardwood_ao_2k.png`
- `carved_dark_wood_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `traditions_carved_hardwood_albedo_2k.png`
- Normal: `traditions_carved_hardwood_normal_2k.png`, strength 0.3-0.5.
- Height: `traditions_carved_hardwood_height_2k.png`, Bump distance 0.015-0.04 m.
- Roughness: `traditions_carved_hardwood_roughness_2k.png`, slightly satin but still aged.
- UV scale: 1 tile per 1.5-2.5 m depending on carving size.

Notes:

- Use this on portal posts, lintels, trim plaques, and carved display framing.
- Let the carving read from silhouette and shadow, not from exaggerated depth.

### Woven Raffia Mat PBR

- `traditions_woven_raffia_mat_albedo_2k.png`
- `traditions_woven_raffia_mat_normal_2k.png`
- `traditions_woven_raffia_mat_height_2k.png`
- `traditions_woven_raffia_mat_roughness_2k.png`
- `traditions_woven_raffia_mat_ao_2k.png`
- `floor_woven_mat_seamless.png` - compatibility albedo alias.

Blender hookup:

- Base Color: `traditions_woven_raffia_mat_albedo_2k.png`
- Normal: `traditions_woven_raffia_mat_normal_2k.png`, strength 0.12-0.22.
- Height: `traditions_woven_raffia_mat_height_2k.png`, Bump distance 0.004-0.012 m.
- Roughness: `traditions_woven_raffia_mat_roughness_2k.png`, dry fiber finish.
- UV scale: 1 tile per 2-3 m for broad floor panels.

Notes:

- Use as inset mat panels over compacted earth or framed by timber edges.
- Keep the weave natural and slightly softened by use.

### Preview

- `texture_contact_sheet.png` is the quick visual audit for the section.

## Blender Asset Targets

### `Portal_Traditions_CarvedWood`

- Dark carved timber posts and lintel with geometric relief.
- Earthen plaster surround with low woven or painted trim.
- Strong silhouette but modest depth.

### `WallBay_Traditions_Plaster`

- Calm plaster wall with recessed niches or framed carved plaques.
- Keep niche lighting low and warm.

### `FloorBay_Traditions_Mat`

- Woven mat field with timber frame and threshold strip.
- Allow the mat to read as a panel system rather than continuous wall-to-wall carpet.

### `CeilingBay_Traditions_Reed`

- Reed or raffia slat rhythm supported by dark beams.
- Keep the ceiling warm and tactile, not glossy.

### Props

- `Prop_Ceramic_Vessel`
- `Prop_Carved_Stool`
- `Prop_Display_Niche_Base`
- `Prop_Sconce_Warm`
- `Prop_Timber_Threshold`

## Lighting Direction

- Warm concealed uplights at niche bases and wall feet.
- Soft practical sconces near portals.
- Keep timber elements darker and richer than the plaster shell.

## What To Avoid

- Glossy lacquered wood.
- Perfect machine-straight weave.
- Busy plaster noise that competes with carvings.
- Heavy stone or masonry language that breaks the timber-and-earth identity.
