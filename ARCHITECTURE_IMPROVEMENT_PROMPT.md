# Prompt — Improve Architectural Quality of Each Section from Concept Art (Loop)

Work in `3d-art-museum/`. Preview URL: `http://localhost:8471/3d-art-museum/`.

## Mission

Raise the **architectural quality** of each museum section (era subsection) so its
built geometry matches the intent in its concept art. This is a **geometry / form /
composition** pass, not a texture pass — **textures are NOT required** (see rules).
Iterate **room by room**, looping on each room until its architecture is **excellent**,
then move to the next. When all targeted rooms are done, produce a **detailed texture
spec** (final deliverable, below).

## Ground truth to read first (do this before touching anything)

- Concept art: `concept-art/Hallway-*.png` (the 7 wing sheets) and
  `concept-art/subsections/<room>/Hallway-*.png` + `concept-art/subsections/<room>/README.md`
  (per-room art-direction briefs — these are the spec you are building to).
- How rooms are built today:
  - `js/styles.js` — one style object per era (`S.<key>`). Keys like `band`, `columns`,
    `portal`, `light`, and the upgrade markers `decor:"<name>"`, `columns.glb`,
    `portal.glb` (a room with a `decor`/`glb` is already "improved").
  - `js/corridor.js` — `buildSegment`, `buildPortal`, and per-room `build<Room>Decor`
    functions; shared helpers `midSpots`, `interiorMidZ`, `albedoTex`, `buildTrim`,
    `buildCoffers`, `buildWallPilasters`.
  - `js/models.js` — `spawnPart` clones named meshes from a GLB (cached loader).
  - `js/world.js` — wing assembly, `buildNeck` flare, portals, lights.
  - `js/data/*.js` + `ERAS` — maps each era to its `style` key.
  - `tools/build_<room>_assets.py` — headless **Blender** scripts that emit
    `assets/models/<room>.glb` with **named parts** (the JS/Blender contract).
    Run: `/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_<room>_assets.py`
- **Read `memory/art-museum-project.md`** — it records hard-won constraints
  (collision profiles, portal arches, neck flare, cel-shading via `toon()`, door-block
  bugs, tapered-facade backing slabs, name-prefix material mapping, GLB height rules,
  cache-reload gotcha). Do not relearn these the hard way.

## Which rooms to improve ("focus on unimproved rooms")

**Already improved (skip unless clearly deficient vs concept):** prehistoric,
africa-egypt, africa-kingdoms, africa-traditions, americas-19th-century (amsalon),
asia-china, asia-mughal, europe-medieval (gothic).

**Unimproved — these are the target set.** A room is "unimproved" if its `S.<key>` in
`styles.js` has **no `decor:` and no `glb:`** — it renders as a generic procedural
corridor (flat walls + procedural band + doric/pilaster/wood columns). Confirm per room
before starting. As of this writing the unimproved set is:

americas-andes, americas-mesoamerica, americas-modern, americas-native-north,
asia-indus, asia-japan, asia-modern, asia-southeast, europe-baroque, europe-classical,
europe-impressionism, europe-modern, europe-renaissance, europe-romantic,
middle-east-islamic, middle-east-mesopotamia, middle-east-modern, middle-east-neolithic,
middle-east-ottoman, middle-east-persia, oceania-ancient, oceania-living, oceania-voyagers.

Process them in **wing order** (americas → asia → europe → middle-east → oceania) so
each wing reads as a coherent progression.

## The established pattern to follow (match, don't reinvent)

Each improved room adds architecture through the same pipeline — replicate it:

1. **Model** distinctive architectural parts in a `tools/build_<room>_assets.py` Blender
   script → `assets/models/<room>.glb`, with **named meshes** (e.g. `Portal`, `Column`,
   a wall bay, a beam, a niche, a screen). Name-prefix drives JS material assignment.
2. **Wire** the style in `styles.js`: set `decor:"<room>"` and/or `portal.glb` /
   `columns.glb`, tune `band`, `light`, `portal.arch`, ceiling height.
3. **Place** it in `corridor.js` via a `build<Room>Decor(...)` (or reuse `spawnPart` +
   `midSpots`/`interiorMidZ` placement helpers), threading any lights/fires out of
   `buildSegment` the way existing rooms do.

Hard rules learned from prior rooms (violating these breaks the build):
- **Never block the doorway.** Any facade backing slab must be split into left/right
  shoulders + a header above `DOOR_H`, never one full-width slab across the opening
  (see the Kingdoms/Amsalon door-block fixes in memory).
- **Tapered facades need a backing slab** (shoulder-split) or you see through the gap.
- **GLB height contract:** columns/portals are generally authored at exact `ceilH`;
  most room GLBs are **not** height-scaled in JS — size them right in Blender.
- **Collision is profile-based** — keep the walkable channel clear; unreachable props
  (protrude < `W/2 − BASE_HALF`, or sit inside neck/portal pinch) need no collider.
- **Cel-shaded look:** re-material GLB meshes via `toon()`; emissive stays `MeshBasic`.
- After editing a module another cached module imports, force
  `await fetch(url,{cache:'reload'})` on the edited file(s) before reload.

## THE LOOP (per room — repeat the whole block for each target room)

For each room in the target set:

1. **Study** the concept sheet + README. Write 3–6 bullet "architectural intent" notes:
   the silhouette, the portal/arch type, the column/support rhythm, the ceiling
   treatment, the signature ornament, the floor zoning. This is your acceptance target.
2. **Diff against reality.** Load the room in the preview and note every gap between the
   concept and the current generic corridor.
3. **Build** the improvement following the pipeline above (Blender GLB → styles.js →
   corridor.js decor). Prefer bold, era-defining moves (a real arch type, a distinctive
   support, a ceiling system, a signature screen/niche) over flat trim.
4. **Verify in the preview** (use `preview_*` tools, never ask the user to look):
   - `preview_logs`/`preview_console_logs` clean (no throw; app fully loaded —
     check `typeof window.__museum !== "undefined"`, the HUD chip is not proof).
   - Walk the room: no doorway block, no clipping, no z-fighting, art unobstructed,
     collision channel walkable, portal reads correctly from the neck/hub approach.
   - `preview_screenshot` from the visitor's approach and mid-room.
5. **Self-critique against the concept sheet.** Score the room on the rubric below.
   Be your own harshest critic — compare screenshot to concept side by side.
6. **If not excellent, loop back to step 3** and refine. Do not advance to the next room
   until this one clears the bar. Keep iterating (model tweak → rewire → re-verify).
7. **Record** what you built for the room (parts, style changes, decor fn) in a running
   note, and the textures it *would* want (feeds the final spec).

### Exit criterion — "excellent" (all must hold):
- **Silhouette match:** a viewer could identify the era from geometry alone, matching
  the concept's dominant forms (arch type, supports, ceiling).
- **Concept fidelity:** portal, column rhythm, ceiling, and signature ornament are all
  present and read as in the sheet.
- **Cleanliness:** no doorway block, no clipping/z-fighting, no collision traps, art
  never occluded, no console errors, loads fully.
- **Coherence:** materials match the cel-shaded look; the room fits its wing's
  progression and neighboring rooms.
- **No regressions:** other rooms/hub/cave still build and walk correctly.

## Rules / constraints

- **Textures NOT required.** Do the architecture with geometry + existing procedural
  textures / `flat()` / `toon()` colors. Do **not** block progress waiting on new image
  textures. Where a texture would materially help, note it for the final spec instead of
  generating it now. (Existing `assets/textures/*` and per-room `concept-art/subsections/
  <room>/textures/` may be reused if already present.)
- Keep it **no-build / static** (plain ES modules, importmap). No new runtime deps.
- Stay **mobile-safe**: keep GLBs lean (geometry + minimal materials), reasonable
  draw calls (frustum culling exists; improved wings run ~84 draw calls).
- Don't touch `js/data/imageUrls.js` (generated) or the artwork resolver pipeline.
- Commit-worthy increments per room; don't leave the tree half-broken between rooms.

## FINAL DELIVERABLE (after all target rooms are excellent)

Write **`TEXTURE_SPEC.md`** in `3d-art-museum/` — a detailed, actionable spec of every
texture this codebase now needs, so a texture pass can be done in one go. For **each
room** (and shared/global), list every needed map with:

- **Slug / filename** (follow existing conventions, e.g. `<room>_wall.jpg`,
  `<room>_floor.jpg`, `<room>_band.jpg`, plus any `_normal/_rough/_ao/_height` where the
  material is `MeshStandardMaterial` like the prehistoric/egypt PBR kits).
- **Purpose / where applied** (wall / floor / band / frieze / portal / column / ceiling /
  screen / decal) and the mesh or style field it maps to.
- **Resolution & tiling** (px size, seamless?, `uvLen`/`uvRepeat`, aspect — bands are
  4:1 2048×512, star-tile bands ~2.3 uvLen, etc.).
- **Format** (jpg vs png-for-alpha, e.g. pierced screens/decals need alpha).
- **Art direction** (1–2 lines drawn from the concept sheet) + a ready-to-paste
  **generation prompt** (ChatGPT/image-model), matching the style of existing
  `TEXTURE_PROMPTS.md` / per-room `README.md` briefs.
- **Priority** (P0 signature surface → P2 nice-to-have) and whether a procedural
  fallback already covers it.

Group by wing, note which textures already exist and can be reused, and end with a flat
checklist of net-new files to create.
