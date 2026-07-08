# Prehistoric Hallway Asset Brief

Reference image: `Hallway-01-prehistoric.png`

Build target: a photoreal cave-gallery corridor kit matching the concept artwork: fractured orange-brown cave rock, sandy calcite/ochre wall panels, packed dirt floor, low archway entrance, warm torch illumination, powdery red ochre hand stencils, wavy wall motifs, animal figures, scattered stones, and shallow museum-safe prop details.

## Concept Match Notes

- Period read: Prehistoric cave gallery, 40,000-2,000 BCE.
- Mood: warm torchlit cave interior with a darker natural entrance threshold.
- Primary silhouette: irregular rock corridor with a low, eroded arch opening and uneven ceiling.
- Surface language: coarse orange-brown rock, sandy mineral wash, dusty calcite, absorbed ochre pigment, packed earth, loose stones, and soot-dark torch sconces.
- Museum constraint: art sightlines stay clear. Use texture and shallow relief around display zones rather than bulky foreground props.

## Texture Set

All files live in `textures/`.

### Reference Rock Wall PBR

Use for corridor walls, ceiling, archway, and large rock surrounds.

- `cave_limestone_wall_albedo_2k.png`
- `cave_limestone_wall_normal_2k.png`
- `cave_limestone_wall_height_2k.png`
- `cave_limestone_wall_roughness_2k.png`
- `cave_limestone_wall_ao_2k.png`
- `wall_earthen_plaster_seamless.png` - compatibility albedo alias for older material slots.

Blender setup:

- Base Color: `cave_limestone_wall_albedo_2k.png`
- Normal: `cave_limestone_wall_normal_2k.png` through a Normal Map node, strength 0.45-0.75.
- Height: `cave_limestone_wall_height_2k.png` into Bump height, strength 0.08-0.16, distance 0.04-0.09 m.
- Roughness: `cave_limestone_wall_roughness_2k.png`, keep roughness high.
- AO: multiply into albedo or use in shader mix at 0.25-0.4 strength.
- UV scale: 1 tile per 2.5-3.5 m on walls; 1 tile per 1.8-2.5 m on the arch for larger visible rock grain.
- Note: this material favors photographic naturalness over mathematically perfect tiling. Hide repeats with rock geometry breaks, decal panels, torch shadows, and stone protrusions.

### Reference Handprint Wall Panel PBR

Use this as the hero hand-painting surface. It is closer to the supplied quality reference than a procedural decal atlas.

- `ochre_handprint_wall_panel_albedo_2k.png`
- `ochre_handprint_wall_panel_normal_2k.png`
- `ochre_handprint_wall_panel_height_2k.png`
- `ochre_handprint_wall_panel_roughness_2k.png`
- `ochre_handprint_wall_panel_ao_2k.png`

Blender setup:

- Use as a large wall panel, alcove backing, or arch-adjacent painted rock patch.
- Base Color: `ochre_handprint_wall_panel_albedo_2k.png`
- Normal: `ochre_handprint_wall_panel_normal_2k.png`, strength 0.2-0.35. Keep this subtle so the hand pigment reads as absorbed paint, not raised stickers.
- Height: `ochre_handprint_wall_panel_height_2k.png`, Bump distance 0.015-0.035 m.
- Roughness: `ochre_handprint_wall_panel_roughness_2k.png`, roughness 0.88-0.98.
- AO: multiply lightly at 0.15-0.25.
- UV scale: treat as an art panel rather than a repeating material. Use one tile across a 3-5 m feature wall or split it into several irregular rock panels.
- Best placement: central cave-wall feature zones, arch exterior face, and deeper corridor walls where the concept shows clustered hands.

### Packed Earth Floor PBR

Use for the walking path and threshold dirt.

- `packed_earth_floor_albedo_2k.png`
- `packed_earth_floor_normal_2k.png`
- `packed_earth_floor_height_2k.png`
- `packed_earth_floor_roughness_2k.png`
- `packed_earth_floor_ao_2k.png`
- `floor_packed_earth_seamless.png` - compatibility albedo alias for older material slots.

Blender setup:

- Base Color: `packed_earth_floor_albedo_2k.png`
- Normal: `packed_earth_floor_normal_2k.png`, strength 0.35-0.55.
- Height: `packed_earth_floor_height_2k.png`, Bump distance 0.025-0.055 m.
- Roughness: `packed_earth_floor_roughness_2k.png`, roughness 0.82-0.95.
- AO: multiply lightly so pebble pockets collect shadow.
- UV scale: 1 tile per 2-3 m. Add separate pebble meshes at wall edges so the floor does not look like a flat printed image.

### Red Ochre Motifs

Use as secondary accent decals on wall and arch surfaces. For the highest quality handprint area, use the handprint wall panel above.

- `red_ochre_hand_stencils_decal_atlas_2k.png` - transparent RGBA accent atlas with soft reference-derived pigment fragments.
- `red_ochre_decal_alpha_2k.png` - alpha/mask channel if a separate mask is needed.
- `painted_band_seamless.png` - horizontal seamless red ochre wavy band on cave plaster.

Blender setup:

- For the atlas, use alpha blend/hashed material with Base Color from the RGBA file and Alpha from the same texture alpha.
- Use Decal Machine, shrinkwrapped planes, or very shallow offset planes above the wall surface.
- Set decal material roughness to 0.9-1.0 and slightly reduce saturation near torches to avoid a new-paint look.
- Place hand stencils at human shoulder/head height, about 1.2-1.8 m from floor, with a few higher marks around the arch.
- Keep decals irregular: rotate and scale each instance by 80-130 percent. Avoid perfect rows.
- `painted_band_seamless.png` works best as a narrow strip near the lower wall, about 0.45-0.85 m above the floor.
- Do not rely on the decal atlas as the main painted wall. Use it to break up repeated wall modules and add small pigment ghosts.

### Torch Wood

Use for primitive torch brackets, sconces, and charred stakes.

- `charred_torch_wood_albedo_1k.png`
- `charred_torch_wood_normal_1k.png`
- `charred_torch_wood_height_1k.png`
- `charred_torch_wood_roughness_1k.png`

Blender setup:

- Keep this material dark, matte, and heavily rough.
- Add emissive flame geometry separately; do not bake flame light into the wood material.
- Use a small soot gradient on the wall above each torch with vertex paint or transparent dark decals.

### Preview

- `texture_contact_sheet.png` is a quick visual audit sheet for the generated texture set.

## Blender Asset Targets

Create modular pieces that can assemble into the two concept scenes: interior cave corridor and exterior-to-interior archway.

### `Portal_Prehistoric_Arch`

- Overall width: 4.0-5.5 m.
- Clear opening: 2.0-2.6 m wide, 2.4-3.0 m tall.
- Depth: 0.6-1.2 m with eroded rounded jambs.
- Shape: asymmetrical natural arch, not a clean masonry arch.
- Geometry: use bevels, sculpted displacement, and a few protruding stone lips around the threshold.
- Texture: cave wall PBR; larger UV scale on the arch face.
- Details: red ochre hands and wavy bands around the arch, especially on the exterior face.

### `WallBay_Prehistoric_Cave`

- Width: 3.0-4.0 m per repeat.
- Height: match corridor ceiling, preferably 3.0-3.8 m.
- Surface: uneven rock plane with shallow alcoves, cracks, and mineral stain variation.
- Art-safe zone: reserve a calmer central rectangle for museum content; keep hand stencils and animal figures to sides, upper corners, or lower bands.
- Edge treatment: include small boulder clusters at the floor line but keep them shallow enough to avoid blocking the walking path.

### `CeilingBay_Prehistoric_Rock`

- Length: same module length as wall bay.
- Shape: low, irregular cave ceiling with broad lumpy forms.
- Keep clearance comfortable for the visitor camera. Avoid hanging geometry below 2.4 m.
- Use normal/bump detail for fine roughness and real geometry for large silhouettes.

### `FloorBay_Prehistoric_Dirt`

- Width: match corridor width.
- Length: same module length as wall bay.
- Material: packed earth PBR.
- Geometry: nearly flat central walking lane with scattered pebbles toward edges.
- Add a slight central path smoothing/wear strip using vertex color or a second blended material.

### Props

Recommended reusable prop names:

- `Prop_TorchSconce_Primitive`
- `Prop_GroundUplight_HiddenWarm`
- `Prop_RockCluster_Small`
- `Prop_RockCluster_Threshold`
- `Prop_OchreHandDecal`
- `Prop_OchreAnimalDecal`
- `Prop_OchreWavyBand`
- `Prop_DryGrassExterior`

Prop rules:

- Torches should be narrow and wall-mounted, with blackened wood or stone cups.
- Put warm point/area lights near torches, but keep them museum-safe and indirect.
- Scatter stones most densely along walls and at the arch threshold.
- Exterior grass should only appear near the entrance concept, not throughout the interior corridor.

## Lighting Direction

- Color temperature: 1800-2400 K for torch practicals.
- Add low hidden amber uplights along the floor/wall junction, matching the concept's museum-safe illumination.
- Keep the corridor center walkable and readable, with darker ceiling pockets and glowing wall highlights.
- Avoid cool modern white light except for extremely subtle fill.
- Suggested setup per wall bay: 1 torch practical every 3-5 m plus 1 low hidden bounce light near the floor.

## Modeling Workflow

1. Block the corridor in real scale with the floor at world Z 0.
2. Sculpt or displace the wall and arch modules before placing decals.
3. Apply the wall/floor PBR materials and adjust UV scale until rock grain matches the reference image.
4. Add separate stone clusters along the edges; use instanced pebbles with random scale and rotation.
5. Add red ochre decals as offset planes or shrinkwrapped decals after wall UVs are stable.
6. Add torch sconces and lights, then tune exposure so walls glow but the far corridor remains shadowed.
7. Export modules as GLB/FBX with clean object names and unapplied material slots preserved.

## Export Checklist

- `Portal_Prehistoric_Arch`
- `WallBay_Prehistoric_Cave_A`
- `WallBay_Prehistoric_Cave_B`
- `CeilingBay_Prehistoric_Rock`
- `FloorBay_Prehistoric_Dirt`
- `Prop_TorchSconce_Primitive`
- `Prop_RockCluster_Small`
- `Prop_RockCluster_Threshold`
- `Prop_OchreHandDecal`
- `Prop_OchreAnimalDecal`
- `Prop_OchreWavyBand`

Use origin points at floor center or module snap points. Keep transforms applied and scale at 1.0 before export.

## What To Avoid

- Smooth masonry, tile, polished stone, wood plank floors, or clean plaster.
- Perfectly symmetrical cave openings.
- Bright red graphic paint; ochre should look matte, dusty, and partially absorbed into rock.
- Dense props in the visitor path.
- Overly modern torch fixtures.
- Repeating the same hand stencil at the same scale and rotation.
