# Mesoamerica Hallway Asset Brief

> **ARCHIVED MOOD-ONLY NOTE.** This file is not production authority. Its legacy
> concept directions may be inaccurate. Use `../../room-designs.json`,
> `../../ROOM_DESIGN_BIBLES.md`, and `../../PRODUCTION_STANDARD.md`; never promote
> any motif, period claim, texture, or asset listed below without passing those gates.

**Concept sheet:** `Hallway-02-americas-mesoamerica.png`  
**Target visual read:** A warm ceremonial corridor of limestone blockwork, recessed carved friezes, and darker hero reliefs framed inside a stepped temple entry. The stone should feel cut once, worn slowly, and dusted by time rather than layered from multiple mismatched masonry sources.  
**Section references:** `references/wall_block_reference.png`, `references/upper_frieze_reference.png`, `references/relief_panel_reference.png`

## Core Material Language

- One clear limestone ashlar family for both walls and floors.
- Clean block silhouettes with soft erosion, shallow pits, and restrained seam darkening.
- Upper frieze blocks that read as carved stone modules, not painted wallpaper strips.
- Darker ceremonial relief panels at the doorway and focal bays, with warm bronze-brown stone and deep recessed carving.
- A stepped portal framed by heavier jamb stones, a carved lintel frieze, and calm limestone returns around the opening.

## Texture Manifest

### Main seamless surfaces

- `wall_masonry_seamless.png`
  Primary limestone wall tile. Built from the attached wall-block reference and kept to one consistent stone layout.
- `floor_worn_stone_seamless.png`
  Main floor slab tile, matched to the wall stone rather than becoming a separate material family.
- `carved_band_seamless.png`
  Main seamless upper frieze tile matching the square recessed carved style from the attached pattern reference.

### PBR texture sets

- `meso_limestone_wall_albedo_2k.png`
- `meso_limestone_wall_normal_2k.png`
- `meso_limestone_wall_height_2k.png`
- `meso_limestone_wall_ao_2k.png`
- `meso_limestone_wall_roughness_2k.png`

- `meso_limestone_floor_albedo_2k.png`
- `meso_limestone_floor_normal_2k.png`
- `meso_limestone_floor_height_2k.png`
- `meso_limestone_floor_ao_2k.png`
- `meso_limestone_floor_roughness_2k.png`

- `meso_upper_frieze_band_albedo_2k.png`
- `meso_upper_frieze_band_normal_2k.png`
- `meso_upper_frieze_band_height_2k.png`
- `meso_upper_frieze_band_ao_2k.png`
- `meso_upper_frieze_band_roughness_2k.png`

### Entrance archway hero assets

- `meso_entry_relief_panel_albedo_2k.png`
- `meso_entry_relief_panel_normal_2k.png`
- `meso_entry_relief_panel_height_2k.png`
- `meso_entry_relief_panel_ao_2k.png`
- `meso_entry_relief_panel_roughness_2k.png`
  Hero wall relief for the entry bay, using the darker carved panel reference as the doorway focal surface.

- `meso_entry_arch_frieze_albedo_2k.png`
- `meso_entry_arch_frieze_normal_2k.png`
- `meso_entry_arch_frieze_height_2k.png`
- `meso_entry_arch_frieze_ao_2k.png`
- `meso_entry_arch_frieze_roughness_2k.png`
  Horizontal carved frieze for the entrance lintel, soffit surround, and stepped portal face.

- `texture_contact_sheet.png`
  Visual QA sheet for the current package.

## Blender Hookup Notes

### Wall stone

- Use `meso_limestone_wall_*` on corridor side walls, pier sides, and stepped portal masses.
- Tile at roughly **3.0 m to 3.4 m** per repeat.
- Keep displacement subtle. The stone joints should read, but not balloon outward.
- This material is intentionally based on one ashlar layout. Do not mix it with a second masonry texture on the same wall plane.

### Floor stone

- Use `meso_limestone_floor_*` for all visitor-path slabs and threshold paving.
- Tile at roughly **3.8 m to 4.4 m** per repeat.
- Match the floor color temperature to the walls. The floor should feel like the same quarry stone under heavier wear.

### Upper carved frieze

- Use `meso_upper_frieze_band_*` for the square carved band running above relief bays and around the higher wall zone.
- This should sit on modeled inset or proud stone strips, not on a flat wall plane with no profile.
- Recommended physical band height: **0.38 m to 0.55 m**.

### Entrance relief panel

- Use `meso_entry_relief_panel_*` only on hero surfaces: doorway side walls, ceremonial focal bay, or a framed entry panel.
- Best used on a dedicated mesh with a recessed stone border, not tiled repeatedly down the corridor.
- Recommended panel size: **1.8 m to 2.4 m tall**, **1.2 m to 2.0 m wide** depending on the bay.

### Entrance arch frieze

- Use `meso_entry_arch_frieze_*` on the lintel band above the doorway, stepped arch returns, or jamb accents.
- Keep it as a framing device around the opening. It should feel specific to the entrance architecture.

## Entrance Archway Asset Targets

- Stepped stone portal frame with heavier jamb stones and a thicker lintel block.
- Recessed doorway surround using `meso_entry_arch_frieze_*` on the horizontal head band and inner frame accents.
- Hero relief panel bay adjacent to or beyond the opening using `meso_entry_relief_panel_*`.
- Low threshold plinth blocks that step outward from the jamb base.
- Optional bench or altar block aligned to the doorway axis, in the same limestone family.

## Suggested Entrance Archway Dimensions

- Portal opening width: **2.2 m to 2.8 m**
- Portal opening height: **3.2 m to 4.0 m**
- Jamb depth: **0.25 m to 0.45 m**
- Lintel / header band height: **0.35 m to 0.65 m**
- Full stepped portal face width: **3.6 m to 5.2 m**

## Placement Rules

- Keep the upper carved frieze continuous across long wall runs, but break it naturally at corners, pilasters, and doorway returns.
- Use the darker relief stone at the entrance and focal bays only. It should feel precious and intentional.
- Let wall stone fields stay quieter around bright display lighting.
- Put the strongest carved storytelling at the doorway axis, then soften the corridor rhythm as visitors move away from the entrance.
- Reserve the cleanest stone for the largest portal faces; push more stains and darkening into lower corners, jamb bases, and bench feet.

## What To Avoid

- No overlapping stone grids or blended multiple-block layouts on the same wall tile.
- No crisp vector patterning for the frieze.
- No red-painted trim that reads like fresh paint sitting on top of stone.
- No glossy polished stone on the main corridor walls.
- No repeating the relief panel as a generic wallpaper texture.

## Rebuild

Use the bundled Python runtime so dependencies are consistent:

```bash
/Users/timrosenberg/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tools/build_mesoamerica_textures.py
```

That script rebuilds the seamless tiles, the entry hero textures, and the contact sheet from the saved section references.

## Runtime Material Pass - 2026-07-09
Target visual read: warm limestone temple corridor with floor slabs, wall masonry, stepped greca reliefs, and deity-mask accents all in the same worn stone family.

Texture manifest: `assets/textures/meso_limestone_floor.jpg` now supports the runtime floor, while existing `meso_stone.jpg`, `meso_deity_mask.png`, and `meso_greca_carved.jpg` carry the wall/portal relief language.

Blender hookup notes: floor and wall should remain matte/satin limestone; red-ochre pigment belongs in recessed greca or band details, not as clean paint on top.

Placement rules: deity masks stay on portal/lintel fields; greca bands frame piers and upper wall zones; keep broad art wall areas calm.

Avoid: polished marble, unrelated grey stone floors, crisp vector fretwork, or all-over ornament behind artworks.
